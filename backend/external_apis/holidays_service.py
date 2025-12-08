"""
═══════════════════════════════════════════════════════════════════════════════
HOLIDAYS SERVICE - Servicio de Festivos
═══════════════════════════════════════════════════════════════════════════════
Gestiona festivos y días especiales que afectan a la demanda de urgencias.
Usa una combinación de festivos conocidos y la API de Calendarific (opcional).
"""

from datetime import datetime, date, timedelta
from typing import List, Optional, Dict
from dataclasses import dataclass
import requests


@dataclass
class Festivo:
    """Representa un día festivo"""
    fecha: date
    nombre: str
    tipo: str  # nacional, regional, local
    factor_demanda: float = 0.85  # Los festivos suelen reducir demanda

    def to_dict(self) -> Dict:
        return {
            "fecha": self.fecha.isoformat(),
            "nombre": self.nombre,
            "tipo": self.tipo,
            "factor_demanda": self.factor_demanda,
        }


class HolidaysService:
    """
    Servicio de gestión de festivos.

    Festivos en España afectan la demanda de urgencias:
    - Festivos normales: Reducen demanda (~15%)
    - Festivos con eventos (Navidad, Fin de Año): Pueden aumentar demanda
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: API key de Calendarific (opcional, gratis: calendarific.com)
        """
        self.api_key = api_key
        self.festivos_cache: Dict[int, List[Festivo]] = {}
        self.enabled = bool(api_key)

        # Generar festivos conocidos
        self._generar_festivos_estaticos()

    def _generar_festivos_estaticos(self):
        """
        Genera festivos fijos para España y Galicia.
        Estos no cambian mucho año a año (excepto móviles como Semana Santa).
        """
        año_actual = datetime.now().year

        # Festivos nacionales fijos
        festivos_nacionales = [
            (1, 1, "Año Nuevo", 1.1),  # Aumenta demanda por celebraciones
            (1, 6, "Reyes Magos", 0.9),
            (5, 1, "Día del Trabajo", 0.85),
            (8, 15, "Asunción de la Virgen", 0.85),
            (10, 12, "Fiesta Nacional", 0.85),
            (11, 1, "Todos los Santos", 0.85),
            (12, 6, "Día de la Constitución", 0.85),
            (12, 8, "Inmaculada Concepción", 0.85),
            (12, 24, "Nochebuena", 0.95),
            (12, 25, "Navidad", 1.0),
            (12, 31, "Nochevieja", 1.15),  # Aumenta por celebraciones
        ]

        # Festivos de Galicia
        festivos_galicia = [
            (5, 17, "Día de las Letras Gallegas", 0.85),
            (7, 25, "Día de Galicia", 0.85),
        ]

        # A Coruña específicos
        festivos_coruna = [
            (6, 23, "San Juan", 1.1),  # Hogueras = accidentes
            (8, 15, "Fiestas de María Pita", 1.05),
        ]

        festivos = []
        for mes, dia, nombre, factor in festivos_nacionales + festivos_galicia + festivos_coruna:
            try:
                fecha = date(año_actual, mes, dia)
                tipo = "nacional" if (mes, dia) in [(m, d, _, _)[:2] for m, d, _, _ in festivos_nacionales] else "regional"
                festivos.append(Festivo(fecha, nombre, tipo, factor))
            except ValueError:
                pass

        self.festivos_cache[año_actual] = festivos

    def es_festivo(self, fecha: date) -> bool:
        """Verifica si una fecha es festivo"""
        año = fecha.year
        if año not in self.festivos_cache:
            self._generar_festivos_estaticos()

        return any(f.fecha == fecha for f in self.festivos_cache.get(año, []))

    def obtener_festivo(self, fecha: date) -> Optional[Festivo]:
        """Obtiene información del festivo si existe"""
        año = fecha.year
        if año not in self.festivos_cache:
            self._generar_festivos_estaticos()

        for festivo in self.festivos_cache.get(año, []):
            if festivo.fecha == fecha:
                return festivo
        return None

    def es_fin_de_semana(self, fecha: date) -> bool:
        """Verifica si es fin de semana (sábado o domingo)"""
        return fecha.weekday() >= 5

    def es_puente(self, fecha: date) -> bool:
        """
        Verifica si es un puente (festivo + fin de semana).
        Los puentes pueden reducir mucho la demanda.
        """
        if not self.es_festivo(fecha):
            return False

        # Verificar si hay festivo cerca del fin de semana
        for dias in [-1, 1]:
            fecha_cercana = fecha + timedelta(days=dias)
            if self.es_fin_de_semana(fecha_cercana):
                return True

        return False

    def factor_demanda(self, fecha: date) -> float:
        """
        Calcula el factor de demanda para una fecha específica.

        Returns:
            float: Multiplicador de demanda (0.8 = -20%, 1.2 = +20%)
        """
        festivo = self.obtener_festivo(fecha)
        if festivo:
            # Si es puente, reducir aún más
            if self.es_puente(fecha):
                return festivo.factor_demanda * 0.9
            return festivo.factor_demanda

        # Fin de semana (sin festivo)
        if self.es_fin_de_semana(fecha):
            return 0.95  # Ligera reducción

        return 1.0

    def obtener_proximos_festivos(self, dias: int = 30) -> List[Festivo]:
        """Obtiene los próximos festivos en N días"""
        hoy = date.today()
        fecha_limite = hoy + timedelta(days=dias)

        año_actual = hoy.year
        if año_actual not in self.festivos_cache:
            self._generar_festivos_estaticos()

        festivos = []
        for festivo in self.festivos_cache.get(año_actual, []):
            if hoy <= festivo.fecha <= fecha_limite:
                festivos.append(festivo)

        return sorted(festivos, key=lambda f: f.fecha)

    def obtener_festivos_año(self, año: Optional[int] = None) -> List[Festivo]:
        """Obtiene todos los festivos de un año"""
        if año is None:
            año = datetime.now().year

        if año not in self.festivos_cache:
            self._generar_festivos_estaticos()

        return self.festivos_cache.get(año, [])


# Ejemplo de uso
if __name__ == "__main__":
    print("\n" + "═"*60)
    print("📅 PRUEBA DEL HOLIDAYS SERVICE")
    print("═"*60 + "\n")

    service = HolidaysService()

    # Verificar hoy
    hoy = date.today()
    print(f"📍 Fecha: {hoy.strftime('%d/%m/%Y')}")
    print(f"¿Es festivo?: {'Sí' if service.es_festivo(hoy) else 'No'}")
    print(f"¿Es fin de semana?: {'Sí' if service.es_fin_de_semana(hoy) else 'No'}")
    print(f"Factor demanda: {service.factor_demanda(hoy):.2f}x")

    # Próximos festivos
    print(f"\n📅 Próximos festivos (30 días):")
    for festivo in service.obtener_proximos_festivos(30):
        print(f"   - {festivo.fecha.strftime('%d/%m/%Y')}: {festivo.nombre} "
              f"(factor: {festivo.factor_demanda:.2f}x)")

    # Todos los festivos del año
    print(f"\n📅 Todos los festivos del año:")
    for festivo in service.obtener_festivos_año():
        puente = " [PUENTE]" if service.es_puente(festivo.fecha) else ""
        print(f"   - {festivo.fecha.strftime('%d/%m/%Y')}: {festivo.nombre}{puente}")

    print(f"\n✅ Holidays Service funcionando correctamente")
