"""
============================================================================
RUTAS DE PERSONAL
============================================================================
Endpoints para gestión de personal y escalado de consultas.

Endpoints:
- POST /staff/assign - Asignar médico de lista SERGAS a consulta
- POST /staff/unassign - Desasignar médico de consulta
- POST /chuac/consultas/{id}/scale - Escalar consulta (1-4 médicos)
- GET /staff - Listar personal
- GET /staff/lista-sergas - Listar médicos SERGAS disponibles
============================================================================
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.schemas import (
    HospitalId, DoctorAssigned, DoctorUnassigned, CapacityChange
)
from common.kafka_client import KafkaClient
from common.models import Staff, Consulta, ListaSergas, get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/staff", tags=["Personal"])

# Cliente Kafka global
kafka = KafkaClient(client_id="api")


# ============================================================================
# MODELOS DE REQUEST/RESPONSE
# ============================================================================

class AssignDoctorRequest(BaseModel):
    medico_id: UUID
    hospital_id: str = Field(default="chuac", description="Solo CHUAC permite asignación")
    consulta_id: int = Field(ge=1, le=10)


class AssignDoctorResponse(BaseModel):
    success: bool
    medico: dict
    consulta: dict
    kafka_event_id: str
    message: str


class UnassignDoctorRequest(BaseModel):
    medico_id: UUID
    motivo: Optional[str] = None


class UnassignDoctorResponse(BaseModel):
    success: bool
    medico: dict
    kafka_event_id: str
    message: str


class ScaleConsultaRequest(BaseModel):
    target_medicos: int = Field(ge=1, le=4)


class ScaleConsultaResponse(BaseModel):
    consulta_id: int
    medicos_previos: int
    medicos_nuevos: int
    velocidad_factor: float
    message: str


class StaffMember(BaseModel):
    staff_id: str
    nombre: str
    rol: str
    hospital_id: str
    asignacion_actual: Optional[str]
    estado: str


class ListaSergasMedico(BaseModel):
    medico_id: str
    nombre: str
    especialidad: Optional[str]
    disponible: bool
    asignado_a_hospital: Optional[str]
    asignado_a_consulta: Optional[int]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/assign", response_model=AssignDoctorResponse)
async def assign_doctor(request: AssignDoctorRequest, db: Session = Depends(get_db)):
    """
    Asigna un médico de la lista SERGAS a una consulta del CHUAC.

    - Solo válido para CHUAC
    - El médico debe estar disponible en lista_sergas
    - La consulta debe tener menos de 4 médicos
    """
    if request.hospital_id != "chuac":
        raise HTTPException(
            status_code=400,
            detail="Solo el CHUAC permite asignación de médicos adicionales"
        )

    # Buscar médico en lista SERGAS
    medico = db.query(ListaSergas).filter(
        ListaSergas.medico_id == request.medico_id,
        ListaSergas.disponible == True
    ).first()

    if not medico:
        raise HTTPException(
            status_code=404,
            detail="Médico no encontrado o no disponible en lista SERGAS"
        )

    # Buscar consulta
    consulta = db.query(Consulta).filter(
        Consulta.hospital_id == "chuac",
        Consulta.numero_consulta == request.consulta_id
    ).first()

    if not consulta:
        raise HTTPException(
            status_code=404,
            detail=f"Consulta {request.consulta_id} no encontrada"
        )

    if consulta.medicos_asignados >= 4:
        raise HTTPException(
            status_code=400,
            detail="La consulta ya tiene el máximo de 4 médicos"
        )

    # Actualizar base de datos (transacción)
    try:
        medico.disponible = False
        medico.asignado_a_hospital = "chuac"
        medico.asignado_a_consulta = request.consulta_id
        medico.fecha_asignacion = datetime.now()

        consulta.medicos_asignados += 1

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {e}")

    # Emitir evento Kafka
    event = DoctorAssigned(
        medico_id=str(medico.medico_id),
        medico_nombre=medico.nombre,
        hospital_id="chuac",
        consulta_id=request.consulta_id,
        medicos_totales_consulta=consulta.medicos_asignados,
        velocidad_factor=float(consulta.medicos_asignados)
    )
    kafka.produce("doctor-assigned", event)
    kafka.flush()

    return AssignDoctorResponse(
        success=True,
        medico=medico.to_dict(),
        consulta=consulta.to_dict(),
        kafka_event_id=event.medico_id,
        message=f"Médico {medico.nombre} asignado a consulta {request.consulta_id}"
    )


@router.post("/unassign", response_model=UnassignDoctorResponse)
async def unassign_doctor(request: UnassignDoctorRequest, db: Session = Depends(get_db)):
    """
    Desasigna un médico de una consulta y lo devuelve a la lista SERGAS.
    """
    # Buscar médico
    medico = db.query(ListaSergas).filter(
        ListaSergas.medico_id == request.medico_id,
        ListaSergas.disponible == False
    ).first()

    if not medico:
        raise HTTPException(
            status_code=404,
            detail="Médico no encontrado o ya está disponible"
        )

    consulta_id = medico.asignado_a_consulta
    hospital_id = medico.asignado_a_hospital

    # Buscar consulta
    consulta = db.query(Consulta).filter(
        Consulta.hospital_id == hospital_id,
        Consulta.numero_consulta == consulta_id
    ).first()

    # Actualizar base de datos
    try:
        medico.disponible = True
        medico.asignado_a_hospital = None
        medico.asignado_a_consulta = None
        medico.fecha_asignacion = None

        if consulta and consulta.medicos_asignados > 1:
            consulta.medicos_asignados -= 1

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {e}")

    # Emitir evento Kafka
    event = DoctorUnassigned(
        medico_id=str(medico.medico_id),
        medico_nombre=medico.nombre,
        hospital_id="chuac",
        consulta_id=consulta_id or 0,
        medicos_restantes_consulta=consulta.medicos_asignados if consulta else 1,
        velocidad_factor=float(consulta.medicos_asignados) if consulta else 1.0,
        motivo=request.motivo
    )
    kafka.produce("doctor-unassigned", event)
    kafka.flush()

    return UnassignDoctorResponse(
        success=True,
        medico=medico.to_dict(),
        kafka_event_id=event.medico_id,
        message=f"Médico {medico.nombre} devuelto a lista SERGAS"
    )


@router.post("/chuac/consultas/{consulta_id}/scale", response_model=ScaleConsultaResponse)
async def scale_consulta(
    consulta_id: int,
    to: int,
    db: Session = Depends(get_db)
):
    """
    Escala una consulta del CHUAC al número de médicos especificado.

    - Solo válido para CHUAC
    - Rango permitido: 1-4 médicos
    - Requiere disponibilidad en lista_sergas para escalar hacia arriba
    """
    if to < 1 or to > 4:
        raise HTTPException(
            status_code=400,
            detail="Número de médicos debe estar entre 1 y 4"
        )

    # Buscar consulta
    consulta = db.query(Consulta).filter(
        Consulta.hospital_id == "chuac",
        Consulta.numero_consulta == consulta_id
    ).first()

    if not consulta:
        raise HTTPException(
            status_code=404,
            detail=f"Consulta {consulta_id} no encontrada"
        )

    medicos_previos = consulta.medicos_asignados
    diferencia = to - medicos_previos

    if diferencia == 0:
        return ScaleConsultaResponse(
            consulta_id=consulta_id,
            medicos_previos=medicos_previos,
            medicos_nuevos=to,
            velocidad_factor=float(to),
            message="Sin cambios"
        )

    if diferencia > 0:
        # Verificar disponibilidad en lista SERGAS
        disponibles = db.query(ListaSergas).filter(
            ListaSergas.disponible == True
        ).limit(diferencia).all()

        if len(disponibles) < diferencia:
            raise HTTPException(
                status_code=400,
                detail=f"No hay suficientes médicos disponibles. "
                       f"Disponibles: {len(disponibles)}, necesarios: {diferencia}"
            )

        # Asignar médicos
        for medico in disponibles:
            medico.disponible = False
            medico.asignado_a_hospital = "chuac"
            medico.asignado_a_consulta = consulta_id
            medico.fecha_asignacion = datetime.now()

            kafka.produce("doctor-assigned", DoctorAssigned(
                medico_id=str(medico.medico_id),
                medico_nombre=medico.nombre,
                hospital_id="chuac",
                consulta_id=consulta_id,
                medicos_totales_consulta=consulta.medicos_asignados + 1,
                velocidad_factor=float(consulta.medicos_asignados + 1)
            ))
            consulta.medicos_asignados += 1

    else:
        # Liberar médicos
        asignados = db.query(ListaSergas).filter(
            ListaSergas.asignado_a_consulta == consulta_id,
            ListaSergas.disponible == False
        ).limit(abs(diferencia)).all()

        for medico in asignados:
            medico.disponible = True
            medico.asignado_a_hospital = None
            medico.asignado_a_consulta = None
            medico.fecha_asignacion = None
            consulta.medicos_asignados -= 1

            kafka.produce("doctor-unassigned", DoctorUnassigned(
                medico_id=str(medico.medico_id),
                medico_nombre=medico.nombre,
                hospital_id="chuac",
                consulta_id=consulta_id,
                medicos_restantes_consulta=consulta.medicos_asignados,
                velocidad_factor=float(max(1, consulta.medicos_asignados)),
                motivo="escalado"
            ))

    # Guardar cambios
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en base de datos: {e}")

    # Emitir cambio de capacidad
    kafka.produce("capacity-change", CapacityChange(
        hospital_id=HospitalId.CHUAC,
        consulta_id=consulta_id,
        medicos_previos=medicos_previos,
        medicos_nuevos=to,
        velocidad_previa=float(medicos_previos),
        velocidad_nueva=float(to),
        motivo="escalado_api"
    ))
    kafka.flush()

    return ScaleConsultaResponse(
        consulta_id=consulta_id,
        medicos_previos=medicos_previos,
        medicos_nuevos=to,
        velocidad_factor=float(to),
        message=f"Consulta {consulta_id} escalada de {medicos_previos} a {to} médicos"
    )


@router.get("", response_model=List[StaffMember])
async def list_staff(
    hospital_id: Optional[str] = None,
    rol: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista el personal del hospital"""
    query = db.query(Staff)

    if hospital_id:
        query = query.filter(Staff.hospital_id == hospital_id)
    if rol:
        query = query.filter(Staff.rol == rol)

    staff = query.all()
    return [StaffMember(**s.to_dict()) for s in staff]


@router.get("/lista-sergas", response_model=List[ListaSergasMedico])
async def list_lista_sergas(
    disponible: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Lista médicos de la lista SERGAS"""
    query = db.query(ListaSergas)

    if disponible is not None:
        query = query.filter(ListaSergas.disponible == disponible)

    medicos = query.all()
    return [ListaSergasMedico(**m.to_dict()) for m in medicos]


class ConsultaInfo(BaseModel):
    numero_consulta: int
    medicos_asignados: int
    velocidad_factor: float
    medicos_sergas: List[str]  # Lista de nombres de médicos SERGAS asignados


@router.get("/chuac/consultas", response_model=List[ConsultaInfo])
async def list_chuac_consultas(db: Session = Depends(get_db)):
    """
    Lista las consultas del CHUAC con información de velocidad.
    
    Velocidad factor = número de médicos (1-4).
    Más médicos = consultas más rápidas.
    """
    consultas = db.query(Consulta).filter(
        Consulta.hospital_id == "chuac"
    ).order_by(Consulta.numero_consulta).all()
    
    result = []
    for c in consultas:
        # Buscar médicos SERGAS asignados a esta consulta
        medicos_sergas = db.query(ListaSergas).filter(
            ListaSergas.asignado_a_consulta == c.numero_consulta,
            ListaSergas.asignado_a_hospital == "chuac",
            ListaSergas.disponible == False
        ).all()
        
        result.append(ConsultaInfo(
            numero_consulta=c.numero_consulta,
            medicos_asignados=c.medicos_asignados,
            velocidad_factor=float(c.medicos_asignados),
            medicos_sergas=[m.nombre for m in medicos_sergas]
        ))
    
    return result

