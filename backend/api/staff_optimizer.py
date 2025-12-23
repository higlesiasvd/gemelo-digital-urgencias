"""
============================================================================
OPTIMIZADOR DE DISTRIBUCIÓN DE PERSONAL SERGAS
============================================================================
Algoritmo de programación lineal (PuLP) para la distribución óptima
de médicos SERGAS en las consultas del CHUAC.

Objetivo: Minimizar tiempo total de espera ponderado por carga de consultas.

Restricciones:
- Cada médico SERGAS → máximo 1 consulta
- Cada consulta → máximo 3 médicos SERGAS adicionales
- Total médicos/consulta ≤ 4 (1 base + 3 SERGAS máx)
============================================================================
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import logging

try:
    from pulp import (
        LpProblem, LpMinimize, LpVariable, LpBinary, LpStatus,
        lpSum, value, PULP_CBC_CMD
    )
    PULP_AVAILABLE = True
except ImportError:
    PULP_AVAILABLE = False

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Tiempos de consulta por nivel de triaje (minutos)
TIEMPOS_CONSULTA = {
    "rojo": 30.0,
    "naranja": 25.0,
    "amarillo": 15.0,
    "verde": 10.0,
    "azul": 5.0
}

# Tiempo promedio ponderado de consulta (basado en distribución típica)
TIEMPO_MEDIO_CONSULTA = 15.0  # minutos

# Configuración CHUAC
NUM_CONSULTAS = 10
MAX_MEDICOS_CONSULTA = 4
MAX_MEDICOS_SERGAS_POR_CONSULTA = 3


# ============================================================================
# MODELOS DE DATOS
# ============================================================================

@dataclass
class ConsultaEstado:
    """Estado actual de una consulta"""
    numero: int
    medicos_base: int  # Siempre 1
    medicos_sergas: int  # 0-3 adicionales
    cola_actual: int  # Pacientes esperando
    tiempo_medio_espera: float  # Minutos


@dataclass
class MedicoSergas:
    """Médico disponible en lista SERGAS"""
    medico_id: str
    nombre: str
    especialidad: Optional[str]
    asignado_a_consulta: Optional[int]


@dataclass
class Recomendacion:
    """Recomendación de asignación"""
    medico_id: str
    medico_nombre: str
    consulta_destino: int
    prioridad: int  # 1=alta, 2=media, 3=baja
    impacto_estimado: str
    accion: str  # "asignar" o "reasignar"


@dataclass
class ResultadoOptimizacion:
    """Resultado del algoritmo de optimización"""
    exito: bool
    recomendaciones: List[Recomendacion]
    estado_actual: Dict
    metricas_actuales: Dict
    metricas_proyectadas: Dict
    mejora_estimada: float  # Porcentaje
    mensaje: str


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def calcular_tiempo_espera(cola: int, num_medicos: int) -> float:
    """
    Calcula tiempo de espera estimado dada la cola y médicos.
    
    Formula: T_espera = (cola * tiempo_consulta) / num_medicos
    """
    if num_medicos <= 0:
        return float('inf')
    
    # Tiempo de procesamiento por paciente
    tiempo_por_paciente = TIEMPO_MEDIO_CONSULTA / num_medicos
    
    # Tiempo total de espera para cola
    return cola * tiempo_por_paciente


def calcular_carga_consulta(cola: int, num_medicos: int) -> float:
    """
    Calcula la carga relativa de una consulta (0-1+).
    
    Valores > 1 indican sobrecarga.
    """
    if num_medicos <= 0:
        return float('inf')
    
    # Capacidad de procesamiento por hora (4 pacientes/hora/médico aprox)
    capacidad = num_medicos * 4
    
    # Carga = cola / capacidad
    return cola / capacidad if capacidad > 0 else 1.0


def prioridad_desde_impacto(reduccion_minutos: float) -> int:
    """Determina prioridad basada en reducción de tiempo"""
    if reduccion_minutos >= 10:
        return 1  # Alta
    elif reduccion_minutos >= 5:
        return 2  # Media
    else:
        return 3  # Baja


# ============================================================================
# ALGORITMO DE OPTIMIZACIÓN
# ============================================================================

def optimizar_distribucion(
    consultas: List[ConsultaEstado],
    medicos_disponibles: List[MedicoSergas]
) -> ResultadoOptimizacion:
    """
    Ejecuta el algoritmo de optimización para distribuir médicos SERGAS.
    
    Args:
        consultas: Estado actual de las 10 consultas CHUAC
        medicos_disponibles: Médicos SERGAS disponibles para asignar
    
    Returns:
        ResultadoOptimizacion con recomendaciones
    """
    
    if not PULP_AVAILABLE:
        return ResultadoOptimizacion(
            exito=False,
            recomendaciones=[],
            estado_actual={},
            metricas_actuales={},
            metricas_proyectadas={},
            mejora_estimada=0.0,
            mensaje="PuLP no está instalado. Ejecute: pip install pulp"
        )
    
    # Filtrar médicos no asignados
    medicos_libres = [m for m in medicos_disponibles if m.asignado_a_consulta is None]
    
    if not medicos_libres:
        return ResultadoOptimizacion(
            exito=True,
            recomendaciones=[],
            estado_actual=_construir_estado_actual(consultas),
            metricas_actuales=_calcular_metricas(consultas),
            metricas_proyectadas=_calcular_metricas(consultas),
            mejora_estimada=0.0,
            mensaje="No hay médicos SERGAS disponibles para asignar"
        )
    
    # Calcular necesidad de cada consulta
    consultas_con_necesidad = [c for c in consultas if c.cola_actual > 0]
    
    if not consultas_con_necesidad:
        return ResultadoOptimizacion(
            exito=True,
            recomendaciones=[],
            estado_actual=_construir_estado_actual(consultas),
            metricas_actuales=_calcular_metricas(consultas),
            metricas_proyectadas=_calcular_metricas(consultas),
            mejora_estimada=0.0,
            mensaje="No hay colas en ninguna consulta. Distribución óptima."
        )
    
    # =========================================================================
    # MODELO DE PROGRAMACIÓN LINEAL
    # =========================================================================
    
    prob = LpProblem("Distribucion_Personal_SERGAS", LpMinimize)
    
    # Índices
    M = range(len(medicos_libres))  # Médicos
    C = range(len(consultas))       # Consultas
    
    # Variables de decisión: x[m,c] = 1 si médico m asignado a consulta c
    x = {}
    for m in M:
        for c in C:
            x[m, c] = LpVariable(f"x_{m}_{c}", cat=LpBinary)
    
    # -------------------------------------------------------------------------
    # FUNCIÓN OBJETIVO: Minimizar tiempo de espera total ponderado
    # -------------------------------------------------------------------------
    # Aproximación lineal: minimizar (cola * peso) donde peso favorece
    # asignar a consultas con más carga
    
    # Calcular pesos (carga relativa de cada consulta)
    pesos = []
    for c, consulta in enumerate(consultas):
        total_medicos_actual = consulta.medicos_base + consulta.medicos_sergas
        carga = calcular_carga_consulta(consulta.cola_actual, total_medicos_actual)
        pesos.append(carga * consulta.cola_actual)
    
    # Objetivo: maximizar reducción de carga (minimizar -beneficio)
    # Beneficio de asignar médico a consulta = cola / (medicos_actuales + 1)
    prob += lpSum([
        -consultas[c].cola_actual / max(1, consultas[c].medicos_base + consultas[c].medicos_sergas + 1)
        * x[m, c]
        for m in M
        for c in C
    ])
    
    # -------------------------------------------------------------------------
    # RESTRICCIONES
    # -------------------------------------------------------------------------
    
    # R1: Cada médico puede asignarse a máximo 1 consulta
    for m in M:
        prob += lpSum([x[m, c] for c in C]) <= 1
    
    # R2: Cada consulta puede recibir máximo 3 médicos SERGAS adicionales
    for c in C:
        consulta = consultas[c]
        capacidad_restante = MAX_MEDICOS_SERGAS_POR_CONSULTA - consulta.medicos_sergas
        capacidad_restante = max(0, capacidad_restante)  # No negativo
        
        # También respetar límite total de 4
        limite_total = MAX_MEDICOS_CONSULTA - consulta.medicos_base - consulta.medicos_sergas
        limite = min(capacidad_restante, limite_total)
        
        prob += lpSum([x[m, c] for m in M]) <= limite
    
    # -------------------------------------------------------------------------
    # RESOLVER
    # -------------------------------------------------------------------------
    
    solver = PULP_CBC_CMD(msg=0)  # Silencioso
    prob.solve(solver)
    
    if LpStatus[prob.status] != "Optimal":
        return ResultadoOptimizacion(
            exito=False,
            recomendaciones=[],
            estado_actual=_construir_estado_actual(consultas),
            metricas_actuales=_calcular_metricas(consultas),
            metricas_proyectadas=_calcular_metricas(consultas),
            mejora_estimada=0.0,
            mensaje=f"No se encontró solución óptima: {LpStatus[prob.status]}"
        )
    
    # -------------------------------------------------------------------------
    # EXTRAER RECOMENDACIONES
    # -------------------------------------------------------------------------
    
    recomendaciones = []
    consultas_proyectadas = [
        ConsultaEstado(
            numero=c.numero,
            medicos_base=c.medicos_base,
            medicos_sergas=c.medicos_sergas,
            cola_actual=c.cola_actual,
            tiempo_medio_espera=c.tiempo_medio_espera
        )
        for c in consultas
    ]
    
    for m in M:
        for c in C:
            if value(x[m, c]) == 1:
                medico = medicos_libres[m]
                consulta = consultas[c]
                
                # Calcular impacto
                medicos_antes = consulta.medicos_base + consulta.medicos_sergas
                medicos_despues = medicos_antes + 1
                
                tiempo_antes = calcular_tiempo_espera(consulta.cola_actual, medicos_antes)
                tiempo_despues = calcular_tiempo_espera(consulta.cola_actual, medicos_despues)
                reduccion = tiempo_antes - tiempo_despues
                
                recomendaciones.append(Recomendacion(
                    medico_id=medico.medico_id,
                    medico_nombre=medico.nombre,
                    consulta_destino=consulta.numero,
                    prioridad=prioridad_desde_impacto(reduccion),
                    impacto_estimado=f"Reduce espera en ~{reduccion:.0f} min",
                    accion="asignar"
                ))
                
                # Actualizar proyección
                consultas_proyectadas[c].medicos_sergas += 1
    
    # Ordenar por prioridad
    recomendaciones.sort(key=lambda r: (r.prioridad, -r.consulta_destino))
    
    # Calcular métricas
    metricas_actuales = _calcular_metricas(consultas)
    metricas_proyectadas = _calcular_metricas(consultas_proyectadas)
    
    # Mejora estimada
    if metricas_actuales["tiempo_espera_total"] > 0:
        mejora = (
            (metricas_actuales["tiempo_espera_total"] - metricas_proyectadas["tiempo_espera_total"])
            / metricas_actuales["tiempo_espera_total"]
        ) * 100
    else:
        mejora = 0.0
    
    return ResultadoOptimizacion(
        exito=True,
        recomendaciones=recomendaciones,
        estado_actual=_construir_estado_actual(consultas),
        metricas_actuales=metricas_actuales,
        metricas_proyectadas=metricas_proyectadas,
        mejora_estimada=round(mejora, 1),
        mensaje=f"Optimización completada. {len(recomendaciones)} asignaciones recomendadas."
    )


# ============================================================================
# FUNCIONES AUXILIARES INTERNAS
# ============================================================================

def _construir_estado_actual(consultas: List[ConsultaEstado]) -> Dict:
    """Construye diccionario con estado actual de consultas"""
    return {
        "consultas": [
            {
                "numero": c.numero,
                "medicos_total": c.medicos_base + c.medicos_sergas,
                "medicos_base": c.medicos_base,
                "medicos_sergas": c.medicos_sergas,
                "cola": c.cola_actual,
                "tiempo_espera_estimado": round(
                    calcular_tiempo_espera(c.cola_actual, c.medicos_base + c.medicos_sergas), 1
                )
            }
            for c in consultas
        ],
        "total_medicos_sergas_asignados": sum(c.medicos_sergas for c in consultas),
        "total_cola": sum(c.cola_actual for c in consultas)
    }


def _calcular_metricas(consultas: List[ConsultaEstado]) -> Dict:
    """Calcula métricas agregadas"""
    tiempos_espera = []
    for c in consultas:
        total_medicos = c.medicos_base + c.medicos_sergas
        tiempo = calcular_tiempo_espera(c.cola_actual, total_medicos)
        tiempos_espera.append(tiempo)
    
    return {
        "tiempo_espera_total": round(sum(tiempos_espera), 1),
        "tiempo_espera_promedio": round(sum(tiempos_espera) / len(tiempos_espera), 1) if tiempos_espera else 0,
        "tiempo_espera_max": round(max(tiempos_espera), 1) if tiempos_espera else 0,
        "consultas_con_cola": sum(1 for c in consultas if c.cola_actual > 0),
        "cola_total": sum(c.cola_actual for c in consultas)
    }


# ============================================================================
# FUNCIÓN DE INTERFAZ (para uso desde endpoints)
# ============================================================================

def generar_recomendaciones_desde_db(
    consultas_db: List,
    medicos_sergas_db: List,
    colas_actuales: Optional[Dict[int, int]] = None
) -> ResultadoOptimizacion:
    """
    Wrapper para usar con datos de la base de datos.
    
    Args:
        consultas_db: Lista de objetos Consulta de SQLAlchemy
        medicos_sergas_db: Lista de objetos ListaSergas de SQLAlchemy
        colas_actuales: Dict opcional {numero_consulta: pacientes_en_cola}
                       Si no se proporciona, se asumen colas simuladas
    
    Returns:
        ResultadoOptimizacion
    """
    
    # Convertir consultas
    consultas = []
    for c in consultas_db:
        numero = c.numero_consulta
        cola = colas_actuales.get(numero, 0) if colas_actuales else 0
        
        # Contar médicos SERGAS ya asignados a esta consulta
        medicos_sergas_asignados = c.medicos_asignados - 1  # -1 por médico base
        medicos_sergas_asignados = max(0, medicos_sergas_asignados)
        
        consultas.append(ConsultaEstado(
            numero=numero,
            medicos_base=1,
            medicos_sergas=medicos_sergas_asignados,
            cola_actual=cola,
            tiempo_medio_espera=calcular_tiempo_espera(
                cola, 1 + medicos_sergas_asignados
            )
        ))
    
    # Convertir médicos SERGAS
    medicos = []
    for m in medicos_sergas_db:
        medicos.append(MedicoSergas(
            medico_id=str(m.medico_id),
            nombre=m.nombre,
            especialidad=m.especialidad,
            asignado_a_consulta=m.asignado_a_consulta
        ))
    
    return optimizar_distribucion(consultas, medicos)
