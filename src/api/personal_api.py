"""
═══════════════════════════════════════════════════════════════════════════════
API REST - GESTIÓN DE PERSONAL Y REFUERZOS
═══════════════════════════════════════════════════════════════════════════════
Endpoints REST para la gestión del personal sanitario, turnos y refuerzos.
Integrada con FastAPI para alto rendimiento.
═══════════════════════════════════════════════════════════════════════════════
"""

from datetime import datetime, date, time
from typing import List, Optional, Dict, Any
from uuid import UUID
from enum import Enum

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.infrastructure.persistence.database import get_db, init_database
from src.infrastructure.persistence.models import (
    PersonalModel, TurnoModel, DisponibilidadModel, SolicitudRefuerzoModel
)
from src.domain.services.gestion_personal import (
    GestionPersonalService, PersonalRepository, TurnoRepository,
    SolicitudRefuerzoRepository, obtener_turno_actual
)
from src.domain.entities.personal import (
    RolPersonal, TipoTurno, EstadoDisponibilidad, EstadoSolicitudRefuerzo,
    PrioridadRefuerzo, MotivoRefuerzo
)
from src.infrastructure.kafka import (
    get_kafka_producer, KafkaTopic,
    MensajeSolicitudRefuerzo, MensajeDisponibilidad
)


# ═══════════════════════════════════════════════════════════════════════════════
# APLICACIÓN FASTAPI
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="API Gestión Personal Hospitalario",
    description="API para gestión de personal sanitario, turnos y refuerzos del Gemelo Digital",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
# MODELOS PYDANTIC (Request/Response)
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalBase(BaseModel):
    numero_empleado: str
    nombre: str
    apellidos: str
    dni: str
    email: str
    telefono: Optional[str] = None
    rol: str
    especialidad: Optional[str] = None
    hospital_id: str
    unidad: str = "urgencias"
    acepta_refuerzos: bool = True
    horas_semanales_contrato: int = 40


class PersonalCreate(PersonalBase):
    pass


class PersonalResponse(PersonalBase):
    id: UUID
    activo: bool
    fecha_alta: date
    created_at: datetime
    
    class Config:
        from_attributes = True


class TurnoBase(BaseModel):
    personal_id: UUID
    hospital_id: str
    fecha: date
    tipo_turno: str
    hora_inicio: time
    hora_fin: time
    es_refuerzo: bool = False
    notas: Optional[str] = None


class TurnoCreate(TurnoBase):
    pass


class TurnoResponse(TurnoBase):
    id: UUID
    confirmado: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DisponibilidadBase(BaseModel):
    personal_id: UUID
    estado: str
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = None


class DisponibilidadCreate(DisponibilidadBase):
    pass


class DisponibilidadResponse(DisponibilidadBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class SolicitudRefuerzoCreate(BaseModel):
    hospital_id: str
    fecha_necesidad: date
    turno_necesario: str
    rol_requerido: str
    cantidad_personal: int = 1
    prioridad: str = "media"
    motivo: str = "alta_demanda_predicha"
    notas: Optional[str] = None


class SolicitudRefuerzoResponse(BaseModel):
    id: UUID
    hospital_id: str
    fecha_necesidad: date
    turno_necesario: str
    rol_requerido: str
    cantidad_personal: int
    prioridad: str
    motivo: str
    estado: str
    demanda_predicha: Optional[float]
    saturacion_predicha: Optional[float]
    generado_automaticamente: bool
    created_at: datetime
    personal_asignado: List[UUID] = []
    
    class Config:
        from_attributes = True


class ResumenPersonalResponse(BaseModel):
    hospital_id: str
    fecha: date
    turno: str
    medicos: Dict[str, int]
    enfermeros: Dict[str, int]
    auxiliares: Dict[str, int]
    totales: Dict[str, int]
    refuerzos: Dict[str, int]
    ratios: Dict[str, float]


class EvaluarRefuerzoRequest(BaseModel):
    hospital_id: str
    demanda_predicha: float
    saturacion_predicha: float
    confianza: float = 0.8


class EvaluarRefuerzoResponse(BaseModel):
    necesita_refuerzo: bool
    solicitud_creada: bool
    solicitud_id: Optional[UUID] = None
    prioridad: Optional[str] = None
    mensaje: str


# ═══════════════════════════════════════════════════════════════════════════════
# EVENTOS DE STARTUP
# ═══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    """Inicializa la base de datos y Kafka al arrancar"""
    try:
        init_database()
        print("✅ Base de datos PostgreSQL inicializada")
    except Exception as e:
        print(f"⚠️ Error inicializando PostgreSQL: {e}")
    
    try:
        get_kafka_producer()
        print("✅ Productor Kafka conectado")
    except Exception as e:
        print(f"⚠️ Error conectando Kafka: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - PERSONAL
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/personal", response_model=List[PersonalResponse], tags=["Personal"])
def listar_personal(
    hospital_id: Optional[str] = None,
    rol: Optional[str] = None,
    solo_activos: bool = True,
    acepta_refuerzos: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Lista el personal con filtros opcionales"""
    query = db.query(PersonalModel)
    
    if hospital_id:
        query = query.filter(PersonalModel.hospital_id == hospital_id)
    if rol:
        query = query.filter(PersonalModel.rol == rol)
    if solo_activos:
        query = query.filter(PersonalModel.activo == True)
    if acepta_refuerzos is not None:
        query = query.filter(PersonalModel.acepta_refuerzos == acepta_refuerzos)
    
    return query.all()


@app.get("/api/personal/{personal_id}", response_model=PersonalResponse, tags=["Personal"])
def obtener_personal(personal_id: UUID, db: Session = Depends(get_db)):
    """Obtiene un miembro del personal por ID"""
    personal = db.query(PersonalModel).filter(PersonalModel.id == personal_id).first()
    if not personal:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    return personal


@app.post("/api/personal", response_model=PersonalResponse, tags=["Personal"])
def crear_personal(personal: PersonalCreate, db: Session = Depends(get_db)):
    """Crea un nuevo miembro del personal"""
    db_personal = PersonalModel(
        numero_empleado=personal.numero_empleado,
        nombre=personal.nombre,
        apellidos=personal.apellidos,
        dni=personal.dni,
        email=personal.email,
        telefono=personal.telefono,
        rol=personal.rol,
        especialidad=personal.especialidad,
        hospital_id=personal.hospital_id,
        unidad=personal.unidad,
        acepta_refuerzos=personal.acepta_refuerzos,
        horas_semanales_contrato=personal.horas_semanales_contrato,
        activo=True,
        fecha_alta=date.today(),
    )
    db.add(db_personal)
    db.commit()
    db.refresh(db_personal)
    return db_personal


@app.patch("/api/personal/{personal_id}", response_model=PersonalResponse, tags=["Personal"])
def actualizar_personal(
    personal_id: UUID,
    updates: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Actualiza parcialmente un miembro del personal"""
    personal = db.query(PersonalModel).filter(PersonalModel.id == personal_id).first()
    if not personal:
        raise HTTPException(status_code=404, detail="Personal no encontrado")
    
    for key, value in updates.items():
        if hasattr(personal, key):
            setattr(personal, key, value)
    
    personal.updated_at = datetime.now()
    db.commit()
    db.refresh(personal)
    return personal


@app.get("/api/personal/disponibles-refuerzo", response_model=List[PersonalResponse], tags=["Personal"])
def obtener_disponibles_refuerzo(
    hospital_id: Optional[str] = None,
    rol: Optional[str] = None,
    fecha: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Obtiene personal disponible para refuerzos"""
    repo = PersonalRepository(db)
    rol_enum = RolPersonal(rol) if rol else None
    return repo.obtener_disponibles_refuerzo(hospital_id, rol_enum, fecha or date.today())


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - TURNOS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/turnos", response_model=List[TurnoResponse], tags=["Turnos"])
def listar_turnos(
    hospital_id: str,
    fecha: Optional[date] = None,
    tipo_turno: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista los turnos de un hospital"""
    query = db.query(TurnoModel).filter(TurnoModel.hospital_id == hospital_id)
    
    if fecha:
        query = query.filter(TurnoModel.fecha == fecha)
    if tipo_turno:
        query = query.filter(TurnoModel.tipo_turno == tipo_turno)
    
    return query.all()


@app.post("/api/turnos", response_model=TurnoResponse, tags=["Turnos"])
def crear_turno(turno: TurnoCreate, db: Session = Depends(get_db)):
    """Crea un nuevo turno"""
    db_turno = TurnoModel(
        personal_id=turno.personal_id,
        hospital_id=turno.hospital_id,
        fecha=turno.fecha,
        tipo_turno=turno.tipo_turno,
        hora_inicio=turno.hora_inicio,
        hora_fin=turno.hora_fin,
        es_refuerzo=turno.es_refuerzo,
        notas=turno.notas,
        confirmado=True,
    )
    db.add(db_turno)
    db.commit()
    db.refresh(db_turno)
    return db_turno


@app.get("/api/turnos/resumen/{hospital_id}", response_model=Dict[str, int], tags=["Turnos"])
def resumen_turnos(
    hospital_id: str,
    fecha: Optional[date] = None,
    tipo_turno: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtiene resumen de personal por turno"""
    repo = TurnoRepository(db)
    turno_enum = TipoTurno(tipo_turno) if tipo_turno else obtener_turno_actual()
    return repo.contar_personal_turno(hospital_id, fecha or date.today(), turno_enum)


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - DISPONIBILIDAD
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/disponibilidad", response_model=List[DisponibilidadResponse], tags=["Disponibilidad"])
def listar_disponibilidad(
    personal_id: Optional[UUID] = None,
    estado: Optional[str] = None,
    vigentes: bool = True,
    db: Session = Depends(get_db)
):
    """Lista registros de disponibilidad/indisponibilidad"""
    query = db.query(DisponibilidadModel)
    
    if personal_id:
        query = query.filter(DisponibilidadModel.personal_id == personal_id)
    if estado:
        query = query.filter(DisponibilidadModel.estado == estado)
    if vigentes:
        hoy = date.today()
        query = query.filter(
            DisponibilidadModel.fecha_inicio <= hoy,
            (DisponibilidadModel.fecha_fin.is_(None)) | (DisponibilidadModel.fecha_fin >= hoy)
        )
    
    return query.all()


@app.post("/api/disponibilidad", response_model=DisponibilidadResponse, tags=["Disponibilidad"])
def crear_disponibilidad(
    disponibilidad: DisponibilidadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Crea un registro de disponibilidad (baja, vacaciones, etc.)"""
    db_disp = DisponibilidadModel(
        personal_id=disponibilidad.personal_id,
        estado=disponibilidad.estado,
        fecha_inicio=disponibilidad.fecha_inicio,
        fecha_fin=disponibilidad.fecha_fin,
        motivo=disponibilidad.motivo,
    )
    db.add(db_disp)
    db.commit()
    db.refresh(db_disp)
    
    # Publicar evento a Kafka en background
    def publicar_cambio():
        producer = get_kafka_producer()
        personal = db.query(PersonalModel).filter(
            PersonalModel.id == disponibilidad.personal_id
        ).first()
        
        if personal:
            mensaje = MensajeDisponibilidad(
                personal_id=str(disponibilidad.personal_id),
                hospital_id=personal.hospital_id,
                timestamp=datetime.now().isoformat(),
                estado_anterior="disponible",
                estado_nuevo=disponibilidad.estado,
                fecha_inicio=disponibilidad.fecha_inicio.isoformat(),
                fecha_fin=disponibilidad.fecha_fin.isoformat() if disponibilidad.fecha_fin else None,
                motivo=disponibilidad.motivo,
            )
            producer.publicar_cambio_disponibilidad(mensaje)
    
    background_tasks.add_task(publicar_cambio)
    
    return db_disp


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - SOLICITUDES DE REFUERZO
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/refuerzos", response_model=List[SolicitudRefuerzoResponse], tags=["Refuerzos"])
def listar_solicitudes_refuerzo(
    hospital_id: Optional[str] = None,
    estado: Optional[str] = None,
    prioridad: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lista solicitudes de refuerzo"""
    query = db.query(SolicitudRefuerzoModel)
    
    if hospital_id:
        query = query.filter(SolicitudRefuerzoModel.hospital_id == hospital_id)
    if estado:
        query = query.filter(SolicitudRefuerzoModel.estado == estado)
    if prioridad:
        query = query.filter(SolicitudRefuerzoModel.prioridad == prioridad)
    
    return query.order_by(SolicitudRefuerzoModel.created_at.desc()).all()


@app.get("/api/refuerzos/pendientes", response_model=List[SolicitudRefuerzoResponse], tags=["Refuerzos"])
def obtener_solicitudes_pendientes(
    hospital_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtiene solicitudes de refuerzo pendientes"""
    repo = SolicitudRefuerzoRepository(db)
    return repo.obtener_pendientes(hospital_id)


@app.post("/api/refuerzos", response_model=SolicitudRefuerzoResponse, tags=["Refuerzos"])
def crear_solicitud_refuerzo(
    solicitud: SolicitudRefuerzoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Crea una solicitud de refuerzo manual"""
    db_solicitud = SolicitudRefuerzoModel(
        hospital_id=solicitud.hospital_id,
        fecha_necesidad=solicitud.fecha_necesidad,
        turno_necesario=solicitud.turno_necesario,
        rol_requerido=solicitud.rol_requerido,
        cantidad_personal=solicitud.cantidad_personal,
        prioridad=solicitud.prioridad,
        motivo=solicitud.motivo,
        estado="pendiente",
        generado_automaticamente=False,
        notas=solicitud.notas,
    )
    db.add(db_solicitud)
    db.commit()
    db.refresh(db_solicitud)
    
    # Publicar a Kafka
    def publicar_solicitud():
        producer = get_kafka_producer()
        mensaje = MensajeSolicitudRefuerzo(
            solicitud_id=str(db_solicitud.id),
            hospital_id=solicitud.hospital_id,
            timestamp=datetime.now().isoformat(),
            fecha_necesidad=solicitud.fecha_necesidad.isoformat(),
            turno=solicitud.turno_necesario,
            rol_requerido=solicitud.rol_requerido,
            cantidad=solicitud.cantidad_personal,
            prioridad=solicitud.prioridad,
            motivo=solicitud.motivo,
            demanda_predicha=None,
            saturacion_predicha=None,
            estado="pendiente",
            personal_asignado=[],
        )
        producer.publicar_solicitud_refuerzo(mensaje)
    
    background_tasks.add_task(publicar_solicitud)
    
    return db_solicitud


@app.patch("/api/refuerzos/{solicitud_id}/estado", response_model=SolicitudRefuerzoResponse, tags=["Refuerzos"])
def actualizar_estado_solicitud(
    solicitud_id: UUID,
    nuevo_estado: str,
    db: Session = Depends(get_db)
):
    """Actualiza el estado de una solicitud de refuerzo"""
    repo = SolicitudRefuerzoRepository(db)
    
    try:
        estado_enum = EstadoSolicitudRefuerzo(nuevo_estado)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {nuevo_estado}")
    
    solicitud = repo.actualizar_estado(solicitud_id, estado_enum)
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    return solicitud


@app.post("/api/refuerzos/evaluar", response_model=EvaluarRefuerzoResponse, tags=["Refuerzos"])
def evaluar_necesidad_refuerzo(
    request: EvaluarRefuerzoRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Evalúa si se necesita refuerzo basándose en predicciones.
    Este endpoint es llamado por el sistema de predicción.
    """
    servicio = GestionPersonalService(db)
    
    solicitud = servicio.evaluar_necesidad_refuerzo(
        hospital_id=request.hospital_id,
        demanda_predicha=request.demanda_predicha,
        saturacion_predicha=request.saturacion_predicha,
        confianza=request.confianza,
    )
    
    if solicitud is None:
        return EvaluarRefuerzoResponse(
            necesita_refuerzo=False,
            solicitud_creada=False,
            mensaje="No se necesita refuerzo con los niveles actuales"
        )
    
    # Crear la solicitud en BD
    modelo = servicio.crear_solicitud_refuerzo(solicitud)
    
    # Publicar a Kafka
    def publicar_solicitud():
        producer = get_kafka_producer()
        mensaje = MensajeSolicitudRefuerzo(
            solicitud_id=str(modelo.id),
            hospital_id=solicitud.hospital_id,
            timestamp=datetime.now().isoformat(),
            fecha_necesidad=solicitud.fecha_necesidad.isoformat(),
            turno=solicitud.turno_necesario.value,
            rol_requerido=solicitud.rol_requerido.value,
            cantidad=solicitud.cantidad_personal,
            prioridad=solicitud.prioridad.value,
            motivo=solicitud.motivo.value,
            demanda_predicha=solicitud.demanda_predicha,
            saturacion_predicha=solicitud.saturacion_predicha,
            estado="pendiente",
            personal_asignado=[],
        )
        producer.publicar_solicitud_refuerzo(mensaje)
    
    background_tasks.add_task(publicar_solicitud)
    
    return EvaluarRefuerzoResponse(
        necesita_refuerzo=True,
        solicitud_creada=True,
        solicitud_id=solicitud.id,
        prioridad=solicitud.prioridad.value,
        mensaje=f"Solicitud de refuerzo creada con prioridad {solicitud.prioridad.value}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS - RESUMEN Y ESTADÍSTICAS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/hospitales/{hospital_id}/resumen-personal", response_model=ResumenPersonalResponse, tags=["Resumen"])
def obtener_resumen_personal(
    hospital_id: str,
    fecha: Optional[date] = None,
    turno: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtiene un resumen del estado del personal de un hospital"""
    servicio = GestionPersonalService(db)
    turno_enum = TipoTurno(turno) if turno else None
    
    resumen = servicio.obtener_resumen_hospital(hospital_id, fecha, turno_enum)
    return resumen.to_dict()


@app.get("/api/estadisticas/bajas", tags=["Estadísticas"])
def obtener_estadisticas_bajas(
    hospital_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtiene estadísticas de bajas por hospital"""
    from sqlalchemy import func
    
    query = db.query(
        DisponibilidadModel.estado,
        func.count(DisponibilidadModel.id)
    ).filter(
        DisponibilidadModel.fecha_inicio <= date.today(),
        (DisponibilidadModel.fecha_fin.is_(None)) | (DisponibilidadModel.fecha_fin >= date.today())
    )
    
    if hospital_id:
        query = query.join(PersonalModel).filter(PersonalModel.hospital_id == hospital_id)
    
    result = query.group_by(DisponibilidadModel.estado).all()
    
    return {estado: count for estado, count in result}


# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["Sistema"])
def health_check():
    """Endpoint de health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "personal-api"
    }


@app.get("/api/status", tags=["Sistema"])
def status(db: Session = Depends(get_db)):
    """Estado del sistema y conexiones"""
    from src.infrastructure.persistence.database import check_database_connection
    
    kafka_producer = get_kafka_producer()
    
    return {
        "postgres": check_database_connection(),
        "kafka": kafka_producer.is_connected,
        "timestamp": datetime.now().isoformat(),
    }
