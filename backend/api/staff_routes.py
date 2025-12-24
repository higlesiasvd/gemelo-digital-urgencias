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
        hospital_id=hospital_id or "chuac",  # Usar el hospital real donde estaba asignado
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
    # OBTENER DATOS REALES DEL SIMULADOR (INFLUXDB 2.x)
    # =========================================================================
    datos_reales = {}
    influx_token = "mi-token-secreto-urgencias-dt"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            for hospital_id in HOSPITALES.keys():
                # InfluxDB 2.x usa Flux query language
                flux_query = f'''
                from(bucket: "urgencias")
                  |> range(start: -5m)
                  |> filter(fn: (r) => r._measurement == "stats_{hospital_id}")
                  |> last()
                '''
                response = await client.post(
                    "http://urgencias-influxdb:8086/api/v2/query",
                    headers={
                        "Authorization": f"Token {influx_token}",
                        "Content-Type": "application/vnd.flux",
                        "Accept": "application/csv"  # Pedir CSV para parseo más sencillo
                    },
                    params={"org": "urgencias"},
                    content=flux_query
                )
                if response.status_code == 200:
                    # Parsear respuesta CSV de InfluxDB
                    # Formato: ,result,table,_start,_stop,_time,_value,_field,_measurement
                    lines = response.text.strip().split('\n')
                    data_row = {"cola_consulta": 0, "saturacion": 0}
                    
                    for line in lines:
                        if not line or line.startswith('#') or line.startswith(',result'):
                            continue
                        parts = line.split(',')
                        # CSV de InfluxDB: posición 5 = _value, posición 6 = _field
                        if len(parts) >= 8:
                            try:
                                value_str = parts[6]  # _value
                                field_name = parts[7]  # _field
                                
                                if field_name == 'cola_consulta':
                                    data_row['cola_consulta'] = int(float(value_str))
                                elif field_name == 'saturacion_global':
                                    data_row['saturacion'] = float(value_str)
                                elif field_name == 'cola_total':
                                    data_row['cola_consulta'] = max(data_row['cola_consulta'], int(float(value_str)))
                            except Exception as e:
                                pass
                    
                    # Guardar si hay datos relevantes (incluso saturación baja es relevante)
                    if data_row['cola_consulta'] > 0 or data_row['saturacion'] > 0:
                        datos_reales[hospital_id] = {
                            "cola_consulta": data_row.get('cola_consulta', 0),
                            "cola_triaje": 0,
                            "saturacion": data_row.get('saturacion', 0)
                        }
                        logger.info(f"📊 Datos reales {hospital_id}: cola={data_row['cola_consulta']}, sat={data_row['saturacion']:.2f}")
                else:
                    logger.warning(f"⚠️ InfluxDB {hospital_id}: status={response.status_code}")
    except Exception as e:
        logger.warning(f"⚠️ No se pudo conectar con InfluxDB: {e}")
    
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
        
        # USAR DATOS REALES DE INFLUXDB SI ESTÁN DISPONIBLES
        colas = {}
        cola_total = 0
        capacidad_total = 0
        
        if hospital_id in datos_reales:
            # Datos reales del simulador
            cola_real = datos_reales[hospital_id]["cola_consulta"]
            saturacion_real = datos_reales[hospital_id]["saturacion"]
            
            # Distribuir la cola total entre consultas proporcionalmente
            for c in consultas:
                cap_consulta = capacidad_base * c.medicos_asignados
                capacidad_total += cap_consulta
                # Distribuir cola según capacidad inversa (menos capacidad = más cola)
                if c.medicos_asignados < 2:
                    cola = int(cola_real * 0.4 / len([x for x in consultas if x.medicos_asignados < 2] or [1]))
                else:
                    cola = int(cola_real * 0.6 / len([x for x in consultas if x.medicos_asignados >= 2] or [1]))
                colas[c.numero_consulta] = max(0, cola)
                cola_total += cola
            
            # Necesidad basada en saturación real
            necesidad = saturacion_real * config["peso"] * 10  # Escalar para comparabilidad
        else:
            # Fallback: estimar colas
            for c in consultas:
                cap_consulta = capacidad_base * c.medicos_asignados
                capacidad_total += cap_consulta
                proporcion = 1.0 / len(consultas)
                llegadas_c = llegadas * proporcion * random.uniform(0.8, 1.2)
                cola = max(0, int((llegadas_c - cap_consulta) * random.uniform(0.5, 1.5)))
                colas[c.numero_consulta] = cola
                cola_total += cola
            
            # Puntuación de necesidad estimada
            if capacidad_total > 0:
                necesidad = (cola_total / capacidad_total) * config["peso"] * llegadas
            else:
                necesidad = 0
        
        colas_por_hospital[hospital_id] = colas
        necesidad_hospital[hospital_id] = necesidad
    
    # =========================================================================
    # GENERAR RECOMENDACIONES ORDENADAS POR NECESIDAD
    # =========================================================================
    # Ordenar hospitales por necesidad (mayor primero)
    hospitales_ordenados = sorted(necesidad_hospital.items(), key=lambda x: x[1], reverse=True)
    
    recomendaciones = []
    medicos_usados = set()
    
    for hospital_id, necesidad in hospitales_ordenados:
        # NUEVO: Usar predicción ML para determinar médicos necesarios
        consultas = todas_consultas.get(hospital_id, [])
        colas = colas_por_hospital.get(hospital_id, {})
        
        # Calcular médicos ideales según predicción ML + datos reales
        # Mínimo: 1 médico por consulta activa (medicos_base del hospital)
        num_consultas = len(consultas)
        
        # Base: predicciones ML
        if hospital_id in predicciones_ml:
            llegadas_pred = predicciones_ml[hospital_id]["predicciones"][0]["llegadas_esperadas"]
            # Capacidad: 2.5 pac/hora por médico. Necesitamos cubrir llegadas + 20% margen
            medicos_por_demanda = int((llegadas_pred * 1.2 / capacidad_base) + 0.5)
        else:
            medicos_por_demanda = num_consultas
        
        # IMPORTANTE: Ajustar según datos REALES de InfluxDB (cola y saturación)
        cola_real = 0
        saturacion_real = 0
        if hospital_id in datos_reales:
            cola_real = datos_reales[hospital_id].get("cola_consulta", 0)
            saturacion_real = datos_reales[hospital_id].get("saturacion", 0)
            
            # Si hay cola significativa, necesitamos más médicos
            # Regla: +1 médico por cada 5 pacientes en cola (más sensible)
            medicos_extra_por_cola = cola_real // 5
            
            # Si saturación > 40%, añadir médicos extra de manera preventiva
            # Escala: 40-50% = +1, 50-60% = +2, 60-70% = +3, 70%+ = +4 o más
            if saturacion_real > 0.4:
                medicos_extra_por_saturacion = int((saturacion_real - 0.4) * 15)  # 0-9 extra (más sensible)
            else:
                medicos_extra_por_saturacion = 0
            
            medicos_por_demanda += medicos_extra_por_cola + medicos_extra_por_saturacion
        
        # Garantizar mínimo de 1 médico por consulta
        medicos_ideales = max(num_consultas, medicos_por_demanda)
        
        # Médicos actuales en este hospital
        medicos_actuales = sum(c.medicos_asignados for c in consultas)
        deficit = max(0, medicos_ideales - medicos_actuales)
        
        # Si hay déficit de personal o cola real, recomendar asignaciones
        cola_total_hospital = max(cola_real, sum(colas.get(c.numero_consulta, 0) for c in consultas))
        
        logger.info(f"🔍 {hospital_id}: llegadas_pred={predicciones_ml.get(hospital_id, {}).get('predicciones', [{}])[0].get('llegadas_esperadas', 0):.1f}, "
                   f"cola_real={cola_real}, sat_real={saturacion_real:.2f}, medicos_ideales={medicos_ideales}, actuales={medicos_actuales}, deficit={deficit}")
        
        if deficit > 0 or cola_total_hospital > 0:
            # Ordenar consultas: primero las con menos médicos
            consultas_ordenadas = sorted(consultas, key=lambda c: c.medicos_asignados)
            
            for consulta in consultas_ordenadas:
                if consulta.medicos_asignados >= 4:
                    continue  # Consulta llena
                
                cola_consulta = colas.get(consulta.numero_consulta, 0)
                
                # Buscar médico disponible
                for medico in medicos_sergas:
                    if str(medico.medico_id) in medicos_usados:
                        continue
                    
                    medicos_usados.add(str(medico.medico_id))
                    
                    # Prioridad basada en déficit y cola
                    if deficit > 3 or cola_consulta > 5:
                        prioridad = 1  # Alta
                    elif deficit > 1 or cola_consulta > 2:
                        prioridad = 2  # Media
                    else:
                        prioridad = 3  # Baja
                    
                    recomendaciones.append({
                        "medico_id": str(medico.medico_id),
                        "medico_nombre": medico.nombre,
                        "hospital_destino": hospital_id,
                        "consulta_destino": consulta.numero_consulta,
                        "prioridad": prioridad,
                        "impacto_estimado": f"Reduce cola ~{max(cola_consulta, deficit) * 3} min",
                        "accion": "asignar"
                    })
                    break  # Un médico por consulta por pasada
    
    # =========================================================================
    # CALCULAR MÉTRICAS USANDO DATOS REALES DE INFLUXDB
    # =========================================================================
    # Cola total: usar datos reales si disponibles, sino estimados
    cola_real_total = sum(d.get("cola_consulta", 0) for d in datos_reales.values())
    cola_estimada_total = sum(sum(c.values()) for c in colas_por_hospital.values())
    cola_total_actual = max(cola_real_total, cola_estimada_total)
    
    # Saturación promedio real (para calcular tiempo de espera estimado)
    saturacion_promedio = sum(d.get("saturacion", 0) for d in datos_reales.values()) / max(1, len(datos_reales)) if datos_reales else 0
    
    tiempo_consulta = 10  # minutos promedio por paciente
    
    # Tiempo de espera basado en saturación real (más realista)
    # Saturación 0% = 0 min espera, 50% = 15 min, 100% = 45 min
    tiempo_espera_base = int(saturacion_promedio * 45) if datos_reales else cola_total_actual * tiempo_consulta
    tiempo_espera_max_por_sat = max(
        int(d.get("saturacion", 0) * 60) for d in datos_reales.values()
    ) if datos_reales else max([max(c.values()) for c in colas_por_hospital.values() if c], default=0) * tiempo_consulta
    
    metricas_actuales = {
        "tiempo_espera_total": tiempo_espera_base + cola_total_actual * tiempo_consulta,
        "tiempo_espera_promedio": max(tiempo_espera_base, int(saturacion_promedio * 30)),
        "tiempo_espera_max": max(tiempo_espera_max_por_sat, cola_total_actual * tiempo_consulta // 2),
        "consultas_con_cola": sum(1 for d in datos_reales.values() if d.get("saturacion", 0) > 0.5) or sum(1 for colas in colas_por_hospital.values() for c in colas.values() if c > 0),
        "cola_total": cola_total_actual
    }
    
    # Métricas proyectadas (después de asignar médicos)
    # Reducción proporcional: cada médico reduce ~5-10% del tiempo de espera
    factor_reduccion = min(0.8, len(recomendaciones) * 0.08)  # Máximo 80% de reducción
    reduccion_cola = len(recomendaciones) * 2  # 2 pacientes por médico
    
    metricas_proyectadas = {
        "tiempo_espera_total": int(metricas_actuales["tiempo_espera_total"] * (1 - factor_reduccion)),
        "tiempo_espera_promedio": int(metricas_actuales["tiempo_espera_promedio"] * (1 - factor_reduccion)),
        "tiempo_espera_max": int(metricas_actuales["tiempo_espera_max"] * (1 - factor_reduccion * 0.7)),
        "consultas_con_cola": max(0, metricas_actuales["consultas_con_cola"] - len(recomendaciones)),
        "cola_total": max(0, cola_total_actual - reduccion_cola)
    }
    
    # Calcular mejora estimada (limitada a 80%)
    if metricas_actuales["tiempo_espera_total"] > 0:
        mejora = min(80, factor_reduccion * 100)
    elif saturacion_promedio > 0.4 and len(recomendaciones) > 0:
        # Si hay saturación alta pero no hay cola visible, estimar mejora basada en saturación
        mejora = min(abs(len(recomendaciones)) * 8, 50)  # 8% por médico, max 50%
    else:
        mejora = 0
    
    # Estado actual por hospital con información de predicciones ML y datos reales
    def calcular_medicos_recomendados(h_id, cfg):
        num_consultas = len(todas_consultas.get(h_id, []))
        llegadas = predicciones_ml.get(h_id, {}).get("predicciones", [{}])[0].get("llegadas_esperadas", cfg["base_rate"])
        medicos_por_demanda = int((llegadas * 1.2 / capacidad_base) + 0.5)
        
        # Ajustar según datos reales de InfluxDB
        if h_id in datos_reales:
            cola_real = datos_reales[h_id].get("cola_consulta", 0)
            saturacion_real = datos_reales[h_id].get("saturacion", 0)
            medicos_extra_por_cola = cola_real // 5
            medicos_extra_por_saturacion = int((saturacion_real - 0.4) * 15) if saturacion_real > 0.4 else 0
            medicos_por_demanda += medicos_extra_por_cola + medicos_extra_por_saturacion
        
        return max(num_consultas, medicos_por_demanda)
    
    estado_actual = {
        "hospitales": {
            h_id: {
                "nombre": cfg["nombre"],
                "consultas": len(todas_consultas.get(h_id, [])),
                "medicos_actuales": sum(c.medicos_asignados for c in todas_consultas.get(h_id, [])),
                "medicos_recomendados": calcular_medicos_recomendados(h_id, cfg),
                "llegadas_predichas": round(predicciones_ml.get(h_id, {}).get("predicciones", [{}])[0].get("llegadas_esperadas", 0), 1),
                # Usar cola real de InfluxDB si está disponible, sino estimada
                "cola_total": datos_reales.get(h_id, {}).get("cola_consulta", 0) or sum(colas_por_hospital.get(h_id, {}).values()),
                "saturacion": round(datos_reales.get(h_id, {}).get("saturacion", 0), 2),
                "estado": "óptimo" if sum(c.medicos_asignados for c in todas_consultas.get(h_id, [])) >= calcular_medicos_recomendados(h_id, cfg) else "déficit"
            }
            for h_id, cfg in HOSPITALES.items()
        },
        "medicos_sergas_disponibles": len(medicos_sergas),
        "predicciones_ml_activas": len(predicciones_ml) > 0,
        "datos_reales_disponibles": len(datos_reales) > 0
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


# ============================================================================
# OPTIMIZACIÓN SEMANAL BASADA EN PREDICCIONES ML
# ============================================================================

class WeeklyRecommendation(BaseModel):
    """Recomendación de personal por día de la semana"""
    dia: str  # Lunes, Martes, etc.
    dia_numero: int  # 0-6
    hospital_id: str
    hospital_nombre: str
    medicos_recomendados: int
    llegadas_previstas: float
    pico_hora: int
    nivel_demanda: str  # "bajo", "medio", "alto", "crítico"


class WeeklyOptimizationResponse(BaseModel):
    """Respuesta del endpoint de optimización semanal"""
    exito: bool
    semana_inicio: str
    recomendaciones: List[WeeklyRecommendation]
    resumen: Dict
    mensaje: str


@router.get("/optimize/weekly", response_model=WeeklyOptimizationResponse)
async def optimize_weekly(db: Session = Depends(get_db)):
    """
    Genera recomendaciones de personal para la semana basadas en predicciones ML.
    
    Usa Prophet para predecir demanda por día y calcula personal necesario.
    """
    import httpx
    from datetime import datetime, timedelta
    
    now = datetime.now()
    # Inicio de la semana (lunes)
    dias_hasta_lunes = now.weekday()
    inicio_semana = (now - timedelta(days=dias_hasta_lunes)).replace(hour=0, minute=0, second=0)
    
    HOSPITALES = {
        "chuac": {"nombre": "CHUAC", "consultas": 10, "base_medicos": 10},
        "modelo": {"nombre": "H. Modelo", "consultas": 4, "base_medicos": 4},
        "san_rafael": {"nombre": "San Rafael", "consultas": 4, "base_medicos": 4},
    }
    
    DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    
    recomendaciones = []
    totales_por_hospital = {h: 0 for h in HOSPITALES}
    
    for dia_num, dia_nombre in enumerate(DIAS_SEMANA):
        for hospital_id, config in HOSPITALES.items():
            # Obtener predicción ML para ese día
            llegadas = config["base_medicos"] * 2  # Fallback
            pico_hora = 11
            
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    response = await client.post(
                        "http://urgencias-prophet:8001/predict",
                        json={"hospital_id": hospital_id, "hours_ahead": 24}
                    )
                    if response.status_code == 200:
                        pred = response.json()
                        # Ajustar por día de la semana
                        factor_dia = {0: 1.15, 1: 1.05, 2: 1.0, 3: 1.0, 4: 1.1, 5: 0.85, 6: 0.75}[dia_num]
                        llegadas = pred["resumen"]["total_esperado"] * factor_dia / 24
                        pico_hora = pred["resumen"]["hora_pico"]
            except Exception:
                pass
            
            # Calcular médicos necesarios
            # Capacidad: 2.5 pacientes/hora por médico
            # Cobertura deseada: manejar pico + 20% margen
            capacidad_por_medico = 2.5
            medicos_necesarios = max(
                config["base_medicos"],
                int(llegadas * 1.2 / capacidad_por_medico) + 1
            )
            
            # Limitar al máximo posible
            medicos_recomendados = min(medicos_necesarios, config["consultas"] * 4)
            
            # Determinar nivel de demanda
            if medicos_recomendados <= config["base_medicos"]:
                nivel = "bajo"
            elif medicos_recomendados <= config["base_medicos"] * 1.5:
                nivel = "medio"
            elif medicos_recomendados <= config["base_medicos"] * 2:
                nivel = "alto"
            else:
                nivel = "crítico"
            
            totales_por_hospital[hospital_id] += medicos_recomendados
            
            recomendaciones.append(WeeklyRecommendation(
                dia=dia_nombre,
                dia_numero=dia_num,
                hospital_id=hospital_id,
                hospital_nombre=config["nombre"],
                medicos_recomendados=medicos_recomendados,
                llegadas_previstas=round(llegadas, 1),
                pico_hora=pico_hora,
                nivel_demanda=nivel
            ))
    
    # Resumen
    resumen = {
        "por_hospital": {
            h_id: {
                "nombre": cfg["nombre"],
                "promedio_diario": round(totales_por_hospital[h_id] / 7, 1),
                "maximo_dia": max(r.medicos_recomendados for r in recomendaciones if r.hospital_id == h_id),
                "minimo_dia": min(r.medicos_recomendados for r in recomendaciones if r.hospital_id == h_id),
            }
            for h_id, cfg in HOSPITALES.items()
        },
        "total_semanal": sum(totales_por_hospital.values()),
        "dias_criticos": [r.dia for r in recomendaciones if r.nivel_demanda == "crítico"],
    }
    
    return WeeklyOptimizationResponse(
        exito=True,
        semana_inicio=inicio_semana.strftime("%Y-%m-%d"),
        recomendaciones=recomendaciones,
        resumen=resumen,
        mensaje=f"Planificación semanal generada para {len(HOSPITALES)} hospitales."
    )
