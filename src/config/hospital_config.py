"""
═══════════════════════════════════════════════════════════════════════════════
HOSPITAL CONFIG - Configuración de Hospitales y Sistema de Triaje
═══════════════════════════════════════════════════════════════════════════════
Configuración centralizada de hospitales, niveles de triaje y patologías.
Datos calibrados según estándares españoles de urgencias.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, List


# ═══════════════════════════════════════════════════════════════════════════════
# SISTEMA DE TRIAJE
# ═══════════════════════════════════════════════════════════════════════════════

class NivelTriaje(Enum):
    """Sistema Manchester de triaje - 5 niveles"""
    ROJO = 1      # Resucitación - Inmediato
    NARANJA = 2   # Emergencia - ≤10 min
    AMARILLO = 3  # Urgente - ≤60 min
    VERDE = 4     # Menos urgente - ≤120 min
    AZUL = 5      # No urgente - ≤240 min


@dataclass
class ConfigTriaje:
    """Configuración por nivel de triaje"""
    nombre: str
    color: str
    tiempo_max_espera: int  # minutos
    probabilidad: float     # % de pacientes
    tiempo_atencion_min: int  # minutos
    tiempo_atencion_max: int  # minutos
    prob_observacion: float   # probabilidad de pasar a observación
    prob_ingreso: float       # probabilidad de ingreso hospitalario

    # Distribución de edad típica para este nivel
    edad_media: float = 50
    edad_std: float = 20


# Configuración basada en datos reales del Sistema Nacional de Salud
CONFIG_TRIAJE = {
    NivelTriaje.ROJO: ConfigTriaje(
        nombre="Resucitación", color="rojo",
        tiempo_max_espera=0, probabilidad=0.001,
        tiempo_atencion_min=60, tiempo_atencion_max=120,
        prob_observacion=0.9, prob_ingreso=0.7,
        edad_media=65, edad_std=18  # Casos críticos suelen ser mayores
    ),
    NivelTriaje.NARANJA: ConfigTriaje(
        nombre="Emergencia", color="naranja",
        tiempo_max_espera=10, probabilidad=0.083,
        tiempo_atencion_min=45, tiempo_atencion_max=90,
        prob_observacion=0.6, prob_ingreso=0.4,
        edad_media=60, edad_std=20
    ),
    NivelTriaje.AMARILLO: ConfigTriaje(
        nombre="Urgente", color="amarillo",
        tiempo_max_espera=60, probabilidad=0.179,
        tiempo_atencion_min=30, tiempo_atencion_max=60,
        prob_observacion=0.3, prob_ingreso=0.15,
        edad_media=52, edad_std=22
    ),
    NivelTriaje.VERDE: ConfigTriaje(
        nombre="Menos urgente", color="verde",
        tiempo_max_espera=120, probabilidad=0.627,
        tiempo_atencion_min=15, tiempo_atencion_max=30,
        prob_observacion=0.05, prob_ingreso=0.02,
        edad_media=40, edad_std=25  # Más jóvenes
    ),
    NivelTriaje.AZUL: ConfigTriaje(
        nombre="No urgente", color="azul",
        tiempo_max_espera=240, probabilidad=0.11,
        tiempo_atencion_min=10, tiempo_atencion_max=20,
        prob_observacion=0.01, prob_ingreso=0.005,
        edad_media=35, edad_std=20  # Más jóvenes
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# PATOLOGÍAS POR NIVEL DE TRIAJE
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Patologia:
    """Definición de una patología con sus características"""
    nombre: str
    edad_minima: int = 0
    edad_maxima: int = 100
    edad_preferente_min: int = 0  # Rango de edad más común
    edad_preferente_max: int = 100
    estacionalidad: str = "ninguna"  # ninguna, invierno, verano, primavera, otoño
    factor_clima_frio: float = 1.0   # Multiplicador cuando hace frío
    factor_clima_calor: float = 1.0  # Multiplicador cuando hace calor
    factor_lluvia: float = 1.0       # Multiplicador cuando llueve


# Patologías con datos realistas
PATOLOGIAS = {
    NivelTriaje.ROJO: [
        Patologia("PCR", edad_preferente_min=50, edad_preferente_max=85,
                 factor_clima_frio=1.3),
        Patologia("Politrauma grave", edad_preferente_min=20, edad_preferente_max=60),
        Patologia("Shock séptico", edad_preferente_min=60, edad_preferente_max=90,
                 factor_clima_frio=1.2),
        Patologia("Hemorragia masiva", edad_preferente_min=30, edad_preferente_max=70),
        Patologia("Parada respiratoria", edad_preferente_min=55, edad_preferente_max=85,
                 factor_clima_frio=1.4),
    ],
    NivelTriaje.NARANJA: [
        Patologia("IAM", edad_preferente_min=50, edad_preferente_max=80,
                 estacionalidad="invierno", factor_clima_frio=1.3),
        Patologia("Ictus", edad_preferente_min=60, edad_preferente_max=85,
                 factor_clima_frio=1.2),
        Patologia("Trauma moderado", edad_preferente_min=20, edad_preferente_max=50),
        Patologia("Disnea severa", edad_preferente_min=50, edad_preferente_max=80,
                 estacionalidad="invierno", factor_clima_frio=1.5),
        Patologia("Dolor torácico con signos de alarma", edad_preferente_min=45, edad_preferente_max=75),
        Patologia("Intoxicación grave", edad_preferente_min=20, edad_preferente_max=50),
    ],
    NivelTriaje.AMARILLO: [
        Patologia("Dolor torácico", edad_preferente_min=40, edad_preferente_max=70),
        Patologia("Fractura", edad_preferente_min=30, edad_preferente_max=75),
        Patologia("Fiebre alta", edad_preferente_min=0, edad_preferente_max=10,
                 estacionalidad="invierno", factor_clima_frio=1.4),  # Niños
        Patologia("Dolor abdominal agudo", edad_preferente_min=20, edad_preferente_max=60),
        Patologia("Crisis asmática", edad_preferente_min=10, edad_preferente_max=50,
                 estacionalidad="primavera", factor_clima_frio=1.2),
        Patologia("Cefalea intensa", edad_preferente_min=25, edad_preferente_max=55),
        Patologia("Herida profunda", edad_preferente_min=20, edad_preferente_max=50),
    ],
    NivelTriaje.VERDE: [
        Patologia("Contusión", edad_preferente_min=20, edad_preferente_max=60),
        Patologia("Herida menor", edad_preferente_min=15, edad_preferente_max=55),
        Patologia("Infección urinaria", edad_preferente_min=20, edad_preferente_max=70),
        Patologia("Gastroenteritis", edad_preferente_min=5, edad_preferente_max=50,
                 estacionalidad="verano", factor_clima_calor=1.3),
        Patologia("Lumbalgia", edad_preferente_min=30, edad_preferente_max=65),
        Patologia("Esguince", edad_preferente_min=18, edad_preferente_max=45),
        Patologia("Otitis", edad_preferente_min=1, edad_preferente_max=15,
                 estacionalidad="invierno", factor_clima_frio=1.3),
        Patologia("Faringitis", edad_preferente_min=5, edad_preferente_max=40,
                 estacionalidad="invierno", factor_clima_frio=1.4),
    ],
    NivelTriaje.AZUL: [
        Patologia("Receta médica", edad_preferente_min=30, edad_preferente_max=70),
        Patologia("Certificado", edad_preferente_min=18, edad_preferente_max=70),
        Patologia("Molestias crónicas", edad_preferente_min=50, edad_preferente_max=85),
        Patologia("Revisión de herida", edad_preferente_min=20, edad_preferente_max=70),
        Patologia("Retirada de puntos", edad_preferente_min=18, edad_preferente_max=65),
        Patologia("Consulta administrativa", edad_preferente_min=25, edad_preferente_max=75),
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE HOSPITALES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ConfigHospital:
    """Configuración de un hospital"""
    id: str
    nombre: str
    num_boxes: int
    num_camas_observacion: int
    pacientes_dia_base: int  # Media de pacientes por día
    lat: float  # Latitud para el mapa
    lon: float  # Longitud para el mapa
    tipo: str = "publico"  # publico, privado
    especialidades: List[str] = None  # Especialidades disponibles

    def __post_init__(self):
        if self.especialidades is None:
            self.especialidades = ["medicina_general", "traumatologia", "pediatria"]


# Hospitales de A Coruña con datos reales
HOSPITALES = {
    "chuac": ConfigHospital(
        id="chuac",
        nombre="CHUAC - Complexo Hospitalario Universitario A Coruña",
        num_boxes=40,
        num_camas_observacion=30,
        pacientes_dia_base=420,
        lat=43.3487,
        lon=-8.4066,
        tipo="publico",
        especialidades=["medicina_general", "traumatologia", "pediatria",
                       "cardiologia", "neurologia", "cirugia", "oncologia"]
    ),
    "hm_modelo": ConfigHospital(
        id="hm_modelo",
        nombre="HM Modelo",
        num_boxes=15,
        num_camas_observacion=10,
        pacientes_dia_base=120,
        lat=43.3623,
        lon=-8.4115,
        tipo="privado",
        especialidades=["medicina_general", "traumatologia", "pediatria", "cardiologia"]
    ),
    "san_rafael": ConfigHospital(
        id="san_rafael",
        nombre="Hospital San Rafael",
        num_boxes=12,
        num_camas_observacion=8,
        pacientes_dia_base=80,
        lat=43.3571,
        lon=-8.4189,
        tipo="privado",
        especialidades=["medicina_general", "traumatologia", "pediatria"]
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# PATRONES TEMPORALES
# ═══════════════════════════════════════════════════════════════════════════════

# Patrón horario típico (factor multiplicador sobre media)
PATRON_HORARIO = {
    0: 0.5, 1: 0.4, 2: 0.3, 3: 0.3, 4: 0.3, 5: 0.4,
    6: 0.6, 7: 0.8, 8: 1.0, 9: 1.3, 10: 1.5, 11: 1.6,
    12: 1.5, 13: 1.3, 14: 1.1, 15: 1.2, 16: 1.4, 17: 1.5,
    18: 1.4, 19: 1.3, 20: 1.2, 21: 1.0, 22: 0.8, 23: 0.6
}

# Patrón semanal (lunes=0, domingo=6)
PATRON_SEMANAL = {
    0: 1.1,  # Lunes - acumulado fin de semana
    1: 1.0,  # Martes
    2: 1.0,  # Miércoles
    3: 1.0,  # Jueves
    4: 1.1,  # Viernes
    5: 0.9,  # Sábado
    6: 0.9   # Domingo
}

# Factores estacionales (por mes)
FACTOR_ESTACIONAL = {
    1: 1.3,   # Enero - pico gripe
    2: 1.25,  # Febrero - gripe
    3: 1.1,   # Marzo - alergias empiezan
    4: 1.05,  # Abril - alergias
    5: 1.0,   # Mayo
    6: 0.95,  # Junio
    7: 0.9,   # Julio - vacaciones
    8: 0.85,  # Agosto - vacaciones
    9: 1.0,   # Septiembre - vuelta
    10: 1.1,  # Octubre
    11: 1.15, # Noviembre - inicio gripe
    12: 1.2,  # Diciembre - gripe
}
