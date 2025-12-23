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
- GET /staff/optimize - Calcular distribución óptima de personal SERGAS
============================================================================
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
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

from .staff_optimizer import generar_recomendaciones_desde_db, PULP_AVAILABLE

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/staff", tags=["Personal"])

# Cliente Kafka global
kafka = KafkaClient(client_id="api")


# ============================================================================
# MODELOS DE REQUEST/RESPONSE
# ============================================================================

class AssignDoctorRequest(BaseModel):
    medico_id: UUID
    hospital_id: str = Field(default="chuac", description="Hospital destino: chuac, modelo, san_rafael")
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
    Asigna un médico de la lista SERGAS a una consulta de cualquier hospital.

    - Hospitales válidos: chuac, modelo, san_rafael
    - El médico debe estar disponible en lista_sergas
    - La consulta debe tener menos de 4 médicos
    """
    # Validar hospital
    valid_hospitals = ["chuac", "modelo", "san_rafael"]
    if request.hospital_id not in valid_hospitals:
        raise HTTPException(
            status_code=400,
            detail=f"Hospital no válido. Opciones: {valid_hospitals}"
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

    # Buscar consulta en el hospital especificado
    consulta = db.query(Consulta).filter(
        Consulta.hospital_id == request.hospital_id,
        Consulta.numero_consulta == request.consulta_id
    ).first()

    if not consulta:
        raise HTTPException(
            status_code=404,
            detail=f"Consulta {request.consulta_id} no encontrada en {request.hospital_id}"
        )

    if consulta.medicos_asignados >= 4:
        raise HTTPException(
            status_code=400,
            detail="La consulta ya tiene el máximo de 4 médicos"
        )

    # Actualizar base de datos (transacción)
    try:
        medico.disponible = False
        medico.asignado_a_hospital = request.hospital_id
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
        hospital_id=request.hospital_id,
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


# ============================================================================
# OPTIMIZACIÓN DE DISTRIBUCIÓN DE PERSONAL
# ============================================================================

class StaffRecommendation(BaseModel):
    """Recomendación de asignación de médico SERGAS"""
    medico_id: str
    medico_nombre: str
    hospital_destino: str  # chuac, modelo, san_rafael
    consulta_destino: int
    prioridad: int  # 1=alta, 2=media, 3=baja
    impacto_estimado: str
    accion: str  # "asignar" o "reasignar"


class OptimizationMetrics(BaseModel):
    """Métricas de tiempo de espera"""
    tiempo_espera_total: float
    tiempo_espera_promedio: float
    tiempo_espera_max: float
    consultas_con_cola: int
    cola_total: int


class OptimizationResponse(BaseModel):
    """Respuesta del endpoint de optimización"""
    exito: bool
    mensaje: str
    estado_actual: Dict
    recomendaciones: List[StaffRecommendation]
    metricas_actuales: OptimizationMetrics
    metricas_proyectadas: OptimizationMetrics
    mejora_estimada: float  # Porcentaje
    medicos_disponibles: int
    medicos_a_asignar: int
    cambios_aplicados: bool


@router.get("/optimize", response_model=OptimizationResponse)
async def optimize_staff_distribution(
    apply: bool = False,
    db: Session = Depends(get_db)
):
    """
    Calcula la distribución óptima de médicos SERGAS en TODOS los hospitales.
    
    Optimiza la asignación considerando:
    - Predicciones ML de demanda por hospital (Prophet)
    - Colas actuales y capacidad de procesamiento
    - Prioriza hospitales con mayor necesidad
    
    Args:
        apply: Si es True, aplica automáticamente las recomendaciones
    
    Returns:
        Recomendaciones de asignación con hospital + consulta óptimos
    """
    
    if not PULP_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Optimizador no disponible. Instale PuLP: pip install pulp"
        )
    
    import random
    import httpx
    from datetime import datetime
    
    now = datetime.now()
    hora_actual = now.hour
    dia_semana = now.weekday()
    
    # =========================================================================
    # CONFIGURACIÓN DE HOSPITALES
    # =========================================================================
    HOSPITALES = {
        "chuac": {"nombre": "CHUAC", "base_rate": 20, "peso": 1.0},
        "modelo": {"nombre": "H. Modelo", "base_rate": 8, "peso": 0.8},
        "san_rafael": {"nombre": "San Rafael", "base_rate": 6, "peso": 0.6},
    }
    
    # =========================================================================
    # OBTENER DATOS DE TODOS LOS HOSPITALES
    # =========================================================================
    todas_consultas = {}
    colas_por_hospital = {}
    
    for hospital_id in HOSPITALES.keys():
        consultas = db.query(Consulta).filter(
            Consulta.hospital_id == hospital_id
        ).order_by(Consulta.numero_consulta).all()
        todas_consultas[hospital_id] = consultas
    
    # Obtener médicos SERGAS disponibles
    medicos_sergas = db.query(ListaSergas).filter(ListaSergas.disponible == True).all()
    
    # =========================================================================
    # PREDICCIONES ML POR HOSPITAL (PROPHET)
    # =========================================================================
    predicciones_ml = {}
    
    for hospital_id in HOSPITALES.keys():
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.post(
                    "http://urgencias-prophet:8001/predict",
                    json={"hospital_id": hospital_id, "hours_ahead": 4}
                )
                if response.status_code == 200:
                    predicciones_ml[hospital_id] = response.json()
        except Exception:
            pass  # Usará fallback
    
    if predicciones_ml:
        logger.info(f"✅ Predicciones ML obtenidas para {len(predicciones_ml)} hospitales")
    
    # =========================================================================
    # CALCULAR COLAS Y NECESIDAD POR HOSPITAL
    # =========================================================================
    necesidad_hospital = {}  # hospital_id -> puntuación de necesidad
    capacidad_base = 2.5  # pacientes/hora por médico
    
    # Factor temporal (heurístico)
    factor_hora = {
        0: 0.25, 1: 0.15, 2: 0.10, 3: 0.10, 4: 0.10, 5: 0.15,
        6: 0.30, 7: 0.50, 8: 0.80, 9: 1.00, 10: 1.20, 11: 1.30,
        12: 1.20, 13: 1.00, 14: 0.90, 15: 0.85, 16: 0.90, 17: 1.00,
        18: 1.15, 19: 1.25, 20: 1.15, 21: 0.95, 22: 0.70, 23: 0.45
    }.get(hora_actual, 1.0)
    
    factor_dia = {0: 1.15, 1: 1.05, 2: 1.00, 3: 1.00, 4: 1.10, 5: 0.85, 6: 0.75}.get(dia_semana, 1.0)
    
    for hospital_id, config in HOSPITALES.items():
        consultas = todas_consultas.get(hospital_id, [])
        if not consultas:
            continue
        
        # Obtener llegadas (ML o fallback)
        if hospital_id in predicciones_ml:
            pred = predicciones_ml[hospital_id]["predicciones"][0]
            llegadas = pred["llegadas_esperadas"]
        else:
            llegadas = config["base_rate"] * factor_hora * factor_dia
        
        # Calcular cola total y capacidad
        colas = {}
        cola_total = 0
        capacidad_total = 0
        
        for c in consultas:
            cap_consulta = capacidad_base * c.medicos_asignados
            capacidad_total += cap_consulta
            
            # Estimar cola por consulta
            proporcion = 1.0 / len(consultas)
            llegadas_c = llegadas * proporcion * random.uniform(0.8, 1.2)
            cola = max(0, int((llegadas_c - cap_consulta) * random.uniform(0.5, 1.5)))
            colas[c.numero_consulta] = cola
            cola_total += cola
        
        colas_por_hospital[hospital_id] = colas
        
        # Puntuación de necesidad: cola / capacidad * peso
        if capacidad_total > 0:
            necesidad = (cola_total / capacidad_total) * config["peso"] * llegadas
        else:
            necesidad = 0
        necesidad_hospital[hospital_id] = necesidad
    
    # =========================================================================
    # GENERAR RECOMENDACIONES ORDENADAS POR NECESIDAD
    # =========================================================================
    # Ordenar hospitales por necesidad (mayor primero)
    hospitales_ordenados = sorted(necesidad_hospital.items(), key=lambda x: x[1], reverse=True)
    
    recomendaciones = []
    medicos_usados = set()
    
    for hospital_id, necesidad in hospitales_ordenados:
        if necesidad <= 0:
            continue
            
        consultas = todas_consultas.get(hospital_id, [])
        colas = colas_por_hospital.get(hospital_id, {})
        
        # Ordenar consultas por cola (mayor primero)
        consultas_ordenadas = sorted(consultas, key=lambda c: colas.get(c.numero_consulta, 0), reverse=True)
        
        for consulta in consultas_ordenadas:
            # Solo si hay cola y capacidad disponible
            cola_consulta = colas.get(consulta.numero_consulta, 0)
            if cola_consulta <= 0 or consulta.medicos_asignados >= 4:
                continue
            
            # Buscar médico disponible
            for medico in medicos_sergas:
                if str(medico.medico_id) in medicos_usados:
                    continue
                
                medicos_usados.add(str(medico.medico_id))
                
                # Prioridad basada en necesidad del hospital
                if necesidad > 5:
                    prioridad = 1  # Alta
                elif necesidad > 2:
                    prioridad = 2  # Media
                else:
                    prioridad = 3  # Baja
                
                recomendaciones.append({
                    "medico_id": str(medico.medico_id),
                    "medico_nombre": medico.nombre,
                    "hospital_destino": hospital_id,
                    "consulta_destino": consulta.numero_consulta,
                    "prioridad": prioridad,
                    "impacto_estimado": f"Reduce cola ~{cola_consulta*3} min",
                    "accion": "asignar"
                })
                break  # Un médico por consulta por pasada
    
    # =========================================================================
    # CALCULAR MÉTRICAS
    # =========================================================================
    cola_total_actual = sum(sum(c.values()) for c in colas_por_hospital.values())
    tiempo_consulta = 10  # minutos promedio
    
    metricas_actuales = {
        "tiempo_espera_total": cola_total_actual * tiempo_consulta,
        "tiempo_espera_promedio": (cola_total_actual * tiempo_consulta) / max(1, len(recomendaciones) + 1),
        "tiempo_espera_max": max([max(c.values()) for c in colas_por_hospital.values() if c], default=0) * tiempo_consulta,
        "consultas_con_cola": sum(1 for colas in colas_por_hospital.values() for c in colas.values() if c > 0),
        "cola_total": cola_total_actual
    }
    
    # Métricas proyectadas (después de asignar)
    reduccion = len(recomendaciones) * 2  # Cada médico reduce ~2 pacientes de cola
    metricas_proyectadas = {
        "tiempo_espera_total": max(0, metricas_actuales["tiempo_espera_total"] - reduccion * tiempo_consulta),
        "tiempo_espera_promedio": max(0, metricas_actuales["tiempo_espera_promedio"] - reduccion),
        "tiempo_espera_max": max(0, metricas_actuales["tiempo_espera_max"] - 10),
        "consultas_con_cola": max(0, metricas_actuales["consultas_con_cola"] - len(recomendaciones)),
        "cola_total": max(0, cola_total_actual - reduccion)
    }
    
    mejora = ((metricas_actuales["tiempo_espera_total"] - metricas_proyectadas["tiempo_espera_total"]) 
              / max(1, metricas_actuales["tiempo_espera_total"])) * 100 if metricas_actuales["tiempo_espera_total"] > 0 else 0
    
    # Estado actual por hospital
    estado_actual = {
        "hospitales": {
            h_id: {
                "nombre": cfg["nombre"],
                "consultas": len(todas_consultas.get(h_id, [])),
                "cola_total": sum(colas_por_hospital.get(h_id, {}).values()),
                "necesidad": round(necesidad_hospital.get(h_id, 0), 2)
            }
            for h_id, cfg in HOSPITALES.items()
        },
        "medicos_sergas_disponibles": len(medicos_sergas)
    }
    
    # Construir resultado
    resultado = type('Resultado', (), {
        'exito': True,
        'recomendaciones': [type('Rec', (), r)() for r in recomendaciones],
        'estado_actual': estado_actual,
        'metricas_actuales': metricas_actuales,
        'metricas_proyectadas': metricas_proyectadas,
        'mejora_estimada': round(mejora, 1),
        'mensaje': f"Optimización completada. {len(recomendaciones)} asignaciones recomendadas para {len([h for h, n in necesidad_hospital.items() if n > 0])} hospitales."
    })()
    
    medicos_disponibles = len(medicos_sergas)
    medicos_a_asignar = len(recomendaciones)
    
    # Si apply=True, ejecutar las asignaciones
    cambios_aplicados = False
    if apply and resultado.exito and resultado.recomendaciones:
        try:
            for rec in resultado.recomendaciones:
                # Buscar médico
                medico = db.query(ListaSergas).filter(
                    ListaSergas.medico_id == rec.medico_id,
                    ListaSergas.disponible == True
                ).first()
                
                if not medico:
                    continue
                
                # Buscar consulta en el hospital destino
                consulta = db.query(Consulta).filter(
                    Consulta.hospital_id == rec.hospital_destino,
                    Consulta.numero_consulta == rec.consulta_destino
                ).first()
                
                if not consulta or consulta.medicos_asignados >= 4:
                    continue
                
                # Asignar
                medico.disponible = False
                medico.asignado_a_hospital = rec.hospital_destino
                medico.asignado_a_consulta = rec.consulta_destino
                medico.fecha_asignacion = datetime.now()
                consulta.medicos_asignados += 1
                
                # Emitir evento Kafka
                event = DoctorAssigned(
                    medico_id=str(medico.medico_id),
                    medico_nombre=medico.nombre,
                    hospital_id=rec.hospital_destino,
                    consulta_id=rec.consulta_destino,
                    medicos_totales_consulta=consulta.medicos_asignados,
                    velocidad_factor=float(consulta.medicos_asignados)
                )
                kafka.produce("doctor-assigned", event)
            
            db.commit()
            kafka.flush()
            cambios_aplicados = True
            logger.info(f"Optimización aplicada: {medicos_a_asignar} médicos asignados")
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error aplicando optimización: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error aplicando cambios: {e}"
            )
    
    # Construir respuesta
    recomendaciones_response = [
        StaffRecommendation(
            medico_id=r.medico_id,
            medico_nombre=r.medico_nombre,
            hospital_destino=r.hospital_destino,
            consulta_destino=r.consulta_destino,
            prioridad=r.prioridad,
            impacto_estimado=r.impacto_estimado,
            accion=r.accion
        )
        for r in resultado.recomendaciones
    ]
    
    return OptimizationResponse(
        exito=resultado.exito,
        mensaje=resultado.mensaje + (" Cambios aplicados." if cambios_aplicados else ""),
        estado_actual=resultado.estado_actual,
        recomendaciones=recomendaciones_response,
        metricas_actuales=OptimizationMetrics(**resultado.metricas_actuales),
        metricas_proyectadas=OptimizationMetrics(**resultado.metricas_proyectadas),
        mejora_estimada=resultado.mejora_estimada,
        medicos_disponibles=medicos_disponibles,
        medicos_a_asignar=medicos_a_asignar,
        cambios_aplicados=cambios_aplicados
    )
