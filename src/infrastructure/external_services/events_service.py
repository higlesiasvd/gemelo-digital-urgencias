"""
═══════════════════════════════════════════════════════════════════════════════
EVENTS SERVICE - Servicio de Eventos Especiales
═══════════════════════════════════════════════════════════════════════════════
Gestiona eventos especiales que pueden aumentar la demanda de urgencias:
- Partidos de fútbol (Deportivo, Celta)
- Conciertos grandes (Coliseum, Riazor)
- Eventos masivos (San Juan, María Pita)
"""

from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict
from dataclasses import dataclass
import random


@dataclass
class Evento:
    """Representa un evento que puede afectar las urgencias"""
    nombre: str
    fecha: date
    hora_inicio: Optional[time]
    hora_fin: Optional[time]
    tipo: str  # deportivo, musical, cultural, festivo
    asistentes_esperados: int
    ubicacion: str
    factor_demanda: float = 1.0  # Multiplicador de demanda
    factor_trauma: float = 1.0  # Multiplicador específico de traumatismos
    factor_alcohol: float = 1.0  # Multiplicador de intoxicaciones

    def __post_init__(self):
        """Calcula factores automáticamente según el tipo de evento"""
        if self.factor_demanda == 1.0:  # Si no se especificó
            self._calcular_factores()

    def _calcular_factores(self):
        """Calcula factores de demanda según el tipo y tamaño del evento"""
        base_factor = 1.0 + (self.asistentes_esperados / 50000) * 0.5

        if self.tipo == "deportivo":
            self.factor_demanda = min(base_factor * 1.2, 1.5)
            self.factor_trauma = 1.3
            self.factor_alcohol = 1.4
        elif self.tipo == "musical":
            self.factor_demanda = min(base_factor * 1.15, 1.4)
            self.factor_trauma = 1.1
            self.factor_alcohol = 1.5
        elif self.tipo == "festivo":
            self.factor_demanda = min(base_factor * 1.3, 1.6)
            self.factor_trauma = 1.4  # Hogueras, pirotecnia
            self.factor_alcohol = 1.6
        else:  # cultural
            self.factor_demanda = min(base_factor, 1.2)
            self.factor_trauma = 1.0
            self.factor_alcohol = 1.1

    def esta_activo(self, fecha_hora: datetime) -> bool:
        """Verifica si el evento está activo en un momento dado"""
        if fecha_hora.date() != self.fecha:
            return False

        if self.hora_inicio and self.hora_fin:
            return self.hora_inicio <= fecha_hora.time() <= self.hora_fin

        return True  # Eventos sin hora específica duran todo el día

    def to_dict(self) -> Dict:
        return {
            "nombre": self.nombre,
            "fecha": self.fecha.isoformat(),
            "hora_inicio": self.hora_inicio.isoformat() if self.hora_inicio else None,
            "hora_fin": self.hora_fin.isoformat() if self.hora_fin else None,
            "tipo": self.tipo,
            "asistentes_esperados": self.asistentes_esperados,
            "ubicacion": self.ubicacion,
            "factor_demanda": round(self.factor_demanda, 2),
            "factor_trauma": round(self.factor_trauma, 2),
            "factor_alcohol": round(self.factor_alcohol, 2),
        }


class EventsService:
    """
    Servicio de gestión de eventos especiales en A Coruña.
    """

    def __init__(self):
        self.eventos_cache: Dict[int, List[Evento]] = {}
        self._generar_eventos_conocidos()

    def _generar_eventos_conocidos(self):
        """
        Genera eventos conocidos/recurrentes de A Coruña.
        """
        año = datetime.now().year

        eventos = [
            # Eventos deportivos recurrentes (cada 2 semanas aprox)
            # San Juan (la noche más importante de A Coruña)
            Evento(
                nombre="Noche de San Juan",
                fecha=date(año, 6, 23),
                hora_inicio=time(20, 0),
                hora_fin=time(6, 0),  # Toda la noche
                tipo="festivo",
                asistentes_esperados=100000,
                ubicacion="Playas de A Coruña",
                factor_demanda=1.8,  # Muchos accidentes por hogueras
                factor_trauma=1.6,
                factor_alcohol=1.8,
            ),
            # Fiestas de María Pita (agosto)
            Evento(
                nombre="Fiestas de María Pita",
                fecha=date(año, 8, 15),
                hora_inicio=None,
                hora_fin=None,
                tipo="festivo",
                asistentes_esperados=50000,
                ubicacion="Centro de A Coruña",
            ),
            # Maratón de A Coruña (típicamente en mayo)
            Evento(
                nombre="Maratón de A Coruña",
                fecha=date(año, 5, 15),  # Fecha aproximada
                hora_inicio=time(9, 0),
                hora_fin=time(14, 0),
                tipo="deportivo",
                asistentes_esperados=5000,
                ubicacion="Ciudad de A Coruña",
                factor_demanda=1.2,
            ),
        ]

        # Añadir partidos de fútbol aleatorios (simplificado)
        self._generar_partidos_futbol(año, eventos)

        # Añadir conciertos ocasionales
        self._generar_conciertos(año, eventos)

        self.eventos_cache[año] = eventos

    def _generar_partidos_futbol(self, año: int, eventos: List[Evento]):
        """Genera partidos de fútbol del Deportivo de La Coruña"""
        # Temporada de septiembre a mayo, cada 2 semanas
        inicio_temporada = date(año, 9, 1)
        fin_temporada = date(año + 1, 5, 31)

        fecha_partido = inicio_temporada
        while fecha_partido < fin_temporada:
            # Alternar entre casa y visitante
            if random.random() < 0.5:  # 50% en casa
                eventos.append(Evento(
                    nombre="Partido Deportivo de La Coruña",
                    fecha=fecha_partido,
                    hora_inicio=time(18, 0),
                    hora_fin=time(21, 0),
                    tipo="deportivo",
                    asistentes_esperados=random.randint(10000, 25000),
                    ubicacion="Estadio Riazor",
                ))

            fecha_partido += timedelta(days=14)  # Cada 2 semanas

    def _generar_conciertos(self, año: int, eventos: List[Evento]):
        """Genera conciertos ocasionales"""
        # 4-6 conciertos grandes al año
        num_conciertos = random.randint(4, 6)

        for _ in range(num_conciertos):
            mes = random.randint(4, 10)  # Primavera-otoño
            dia = random.randint(1, 28)

            try:
                eventos.append(Evento(
                    nombre="Concierto en Coliseum",
                    fecha=date(año, mes, dia),
                    hora_inicio=time(21, 0),
                    hora_fin=time(23, 30),
                    tipo="musical",
                    asistentes_esperados=random.randint(3000, 8000),
                    ubicacion="Coliseum A Coruña",
                ))
            except ValueError:
                pass  # Fecha inválida, ignorar

    def obtener_eventos_activos(self, fecha_hora: datetime) -> List[Evento]:
        """Obtiene eventos activos en un momento dado"""
        año = fecha_hora.year
        if año not in self.eventos_cache:
            self._generar_eventos_conocidos()

        return [
            evento for evento in self.eventos_cache.get(año, [])
            if evento.esta_activo(fecha_hora)
        ]

    def obtener_eventos_fecha(self, fecha: date) -> List[Evento]:
        """Obtiene todos los eventos de una fecha específica"""
        año = fecha.year
        if año not in self.eventos_cache:
            self._generar_eventos_conocidos()

        return [
            evento for evento in self.eventos_cache.get(año, [])
            if evento.fecha == fecha
        ]

    def factor_demanda_total(self, fecha_hora: datetime) -> float:
        """
        Calcula el factor total de demanda considerando todos los eventos activos.
        Múltiples eventos se multiplican entre sí (efecto acumulativo).
        """
        eventos_activos = self.obtener_eventos_activos(fecha_hora)

        if not eventos_activos:
            return 1.0

        factor = 1.0
        for evento in eventos_activos:
            factor *= evento.factor_demanda

        # Limitar factor máximo a 2.0 (no más del doble)
        return min(factor, 2.0)

    def obtener_proximos_eventos(self, dias: int = 30) -> List[Evento]:
        """Obtiene eventos en los próximos N días"""
        hoy = date.today()
        fecha_limite = hoy + timedelta(days=dias)

        año = hoy.year
        if año not in self.eventos_cache:
            self._generar_eventos_conocidos()

        eventos = []
        for evento in self.eventos_cache.get(año, []):
            if hoy <= evento.fecha <= fecha_limite:
                eventos.append(evento)

        return sorted(eventos, key=lambda e: e.fecha)


# Ejemplo de uso
if __name__ == "__main__":
    print("\n" + "═"*60)
    print("🎉 PRUEBA DEL EVENTS SERVICE")
    print("═"*60 + "\n")

    service = EventsService()

    # Eventos de hoy
    ahora = datetime.now()
    eventos_activos = service.obtener_eventos_activos(ahora)

    print(f"📍 Fecha/Hora: {ahora.strftime('%d/%m/%Y %H:%M')}")
    print(f"🎪 Eventos activos: {len(eventos_activos)}")

    if eventos_activos:
        for evento in eventos_activos:
            print(f"\n   {evento.nombre}")
            print(f"   - Ubicación: {evento.ubicacion}")
            print(f"   - Asistentes esperados: {evento.asistentes_esperados:,}")
            print(f"   - Factor demanda: {evento.factor_demanda:.2f}x")

    factor_total = service.factor_demanda_total(ahora)
    print(f"\n📊 Factor de demanda total: {factor_total:.2f}x")

    # Próximos eventos
    print(f"\n🎉 Próximos eventos (30 días):")
    for evento in service.obtener_proximos_eventos(30):
        print(f"   - {evento.fecha.strftime('%d/%m')}: {evento.nombre} "
              f"({evento.asistentes_esperados:,} asistentes)")

    print(f"\n✅ Events Service funcionando correctamente")
