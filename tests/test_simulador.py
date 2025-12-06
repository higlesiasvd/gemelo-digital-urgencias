"""
Tests para el Simulador de Urgencias v2.0
"""

import pytest
import sys
from pathlib import Path

# Añadir directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.domain.services.simulador import (
    SimuladorUrgencias,
    HospitalUrgencias,
    CoordinadorDerivaciones,
    GeneradorIncidentes,
    Paciente,
    NivelTriaje,
    EstadoPaciente,
    ConfigHospital,
    HOSPITALES,
    CONFIG_TRIAJE,
)
import simpy


class TestNivelTriaje:
    """Tests para niveles de triaje"""
    
    def test_niveles_ordenados(self):
        """Los niveles deben estar ordenados por urgencia"""
        assert NivelTriaje.ROJO < NivelTriaje.NARANJA
        assert NivelTriaje.NARANJA < NivelTriaje.AMARILLO
        assert NivelTriaje.AMARILLO < NivelTriaje.VERDE
        assert NivelTriaje.VERDE < NivelTriaje.AZUL
    
    def test_todos_niveles_tienen_config(self):
        """Todos los niveles deben tener configuración"""
        for nivel in NivelTriaje:
            assert nivel in CONFIG_TRIAJE
            config = CONFIG_TRIAJE[nivel]
            assert "nombre" in config
            assert "color" in config
            assert "tiempo_consulta" in config
            assert "probabilidad" in config
    
    def test_probabilidades_suman_uno(self):
        """Las probabilidades deben sumar aproximadamente 1"""
        total = sum(CONFIG_TRIAJE[n]["probabilidad"] for n in NivelTriaje)
        assert 0.99 <= total <= 1.01


class TestPaciente:
    """Tests para la clase Paciente"""
    
    def test_crear_paciente(self):
        """Crear un paciente con datos básicos"""
        paciente = Paciente(
            id=1,
            hospital_id="chuac",
            nivel_triaje=NivelTriaje.AMARILLO,
            patologia="Dolor torácico",
            t_llegada=0,
        )
        assert paciente.id == 1
        assert paciente.hospital_id == "chuac"
        assert paciente.nivel_triaje == NivelTriaje.AMARILLO
        assert paciente.estado == EstadoPaciente.EN_RECEPCION
    
    def test_tiempo_espera(self):
        """Calcular tiempo de espera correctamente"""
        paciente = Paciente(
            id=1,
            hospital_id="chuac",
            nivel_triaje=NivelTriaje.VERDE,
            patologia="Contusión",
            t_llegada=0,
        )
        paciente.t_inicio_consulta = 45
        assert paciente.tiempo_espera_total == 45
    
    def test_to_dict(self):
        """Serialización a diccionario"""
        paciente = Paciente(
            id=1,
            hospital_id="chuac",
            nivel_triaje=NivelTriaje.ROJO,
            patologia="PCR",
            t_llegada=10,
        )
        data = paciente.to_dict()
        assert data["id"] == 1
        assert data["hospital_id"] == "chuac"
        assert data["nivel_triaje"] == 1
        assert data["triaje_color"] == "#dc2626"


class TestConfigHospital:
    """Tests para configuración de hospitales"""
    
    def test_hospitales_definidos(self):
        """Todos los hospitales deben estar definidos"""
        assert "chuac" in HOSPITALES
        assert "modelo" in HOSPITALES
        assert "san_rafael" in HOSPITALES
    
    def test_chuac_es_referencia(self):
        """CHUAC debe ser hospital de referencia"""
        assert HOSPITALES["chuac"].es_referencia is True
        assert HOSPITALES["modelo"].es_referencia is False
        assert HOSPITALES["san_rafael"].es_referencia is False
    
    def test_chuac_mayor_capacidad(self):
        """CHUAC debe tener mayor capacidad"""
        chuac = HOSPITALES["chuac"]
        modelo = HOSPITALES["modelo"]
        san_rafael = HOSPITALES["san_rafael"]
        
        assert chuac.boxes_consulta > modelo.boxes_consulta
        assert chuac.boxes_consulta > san_rafael.boxes_consulta
        assert chuac.pacientes_dia_base > modelo.pacientes_dia_base


class TestHospitalUrgencias:
    """Tests para el hospital de urgencias"""
    
    def test_crear_hospital(self):
        """Crear hospital con configuración"""
        env = simpy.Environment()
        hospital = HospitalUrgencias(
            env=env,
            config=HOSPITALES["chuac"],
        )
        assert hospital.config.id == "chuac"
        assert hospital.boxes.capacity == 25
    
    def test_generar_nivel_triaje(self):
        """Generar niveles de triaje aleatoriamente"""
        env = simpy.Environment()
        hospital = HospitalUrgencias(env=env, config=HOSPITALES["chuac"])
        
        niveles = [hospital.generar_nivel_triaje() for _ in range(100)]
        
        # Debe haber variedad
        assert len(set(niveles)) > 1
        # Verde debe ser el más común (58% probabilidad)
        assert niveles.count(NivelTriaje.VERDE) > niveles.count(NivelTriaje.ROJO)
    
    def test_calcular_saturacion_inicial(self):
        """Saturación inicial debe ser 0"""
        env = simpy.Environment()
        hospital = HospitalUrgencias(env=env, config=HOSPITALES["chuac"])
        assert hospital.calcular_saturacion() == 0


class TestCoordinadorDerivaciones:
    """Tests para el coordinador de derivaciones"""
    
    def test_evaluar_derivacion_caso_grave_no_referencia(self):
        """Casos graves en hospital no de referencia deben derivarse"""
        env = simpy.Environment()
        hospitales = {
            "chuac": HospitalUrgencias(env=env, config=HOSPITALES["chuac"]),
            "modelo": HospitalUrgencias(env=env, config=HOSPITALES["modelo"]),
        }
        coordinador = CoordinadorDerivaciones(hospitales)
        
        # Paciente grave en Modelo
        paciente = Paciente(
            id=1,
            hospital_id="modelo",
            nivel_triaje=NivelTriaje.ROJO,  # Requiere referencia
            patologia="PCR",
            t_llegada=0,
        )
        
        destino = coordinador.evaluar_derivacion(paciente, "modelo")
        assert destino == "chuac"
        assert paciente.derivado_a == "chuac"
    
    def test_no_derivar_caso_leve_no_referencia(self):
        """Casos leves no deben derivarse automáticamente"""
        env = simpy.Environment()
        hospitales = {
            "chuac": HospitalUrgencias(env=env, config=HOSPITALES["chuac"]),
            "modelo": HospitalUrgencias(env=env, config=HOSPITALES["modelo"]),
        }
        coordinador = CoordinadorDerivaciones(hospitales)
        
        paciente = Paciente(
            id=1,
            hospital_id="modelo",
            nivel_triaje=NivelTriaje.VERDE,
            patologia="Esguince",
            t_llegada=0,
        )
        
        destino = coordinador.evaluar_derivacion(paciente, "modelo")
        assert destino is None
    
    def test_obtener_estado_sistema(self):
        """Obtener estado del sistema"""
        env = simpy.Environment()
        hospitales = {
            "chuac": HospitalUrgencias(env=env, config=HOSPITALES["chuac"]),
            "modelo": HospitalUrgencias(env=env, config=HOSPITALES["modelo"]),
        }
        coordinador = CoordinadorDerivaciones(hospitales)
        
        estado = coordinador.obtener_estado_sistema()
        assert "hospitales" in estado
        assert "chuac" in estado["hospitales"]
        assert "total_derivaciones" in estado


class TestGeneradorIncidentes:
    """Tests para el generador de incidentes"""
    
    def test_generar_incidente(self):
        """Generar un incidente"""
        env = simpy.Environment()
        hospitales = {
            "chuac": HospitalUrgencias(env=env, config=HOSPITALES["chuac"]),
            "modelo": HospitalUrgencias(env=env, config=HOSPITALES["modelo"]),
        }
        coordinador = CoordinadorDerivaciones(hospitales)
        generador = GeneradorIncidentes(hospitales, coordinador)
        
        incidente = generador.generar_incidente(env, "modelo")
        
        assert incidente.hospital_id == "modelo"
        assert incidente.pacientes_generados > 0
        assert len(generador.incidentes) == 1


class TestSimuladorUrgencias:
    """Tests para el simulador principal"""
    
    def test_crear_simulador(self):
        """Crear simulador con todos los hospitales"""
        sim = SimuladorUrgencias(
            hospitales_ids=["chuac", "modelo", "san_rafael"],
            con_incidentes=False,
        )
        assert len(sim.hospitales) == 3
        assert sim.coordinador is not None
    
    def test_simulacion_corta(self):
        """Ejecutar simulación corta"""
        sim = SimuladorUrgencias(
            hospitales_ids=["chuac", "modelo"],
            con_incidentes=False,
        )
        sim.ejecutar(duracion_horas=0.5)  # 30 minutos
        
        # Debe haber pacientes
        total = sum(
            len(h.historial) + len(h.pacientes_activos) 
            for h in sim.hospitales.values()
        )
        assert total > 0
    
    def test_simulacion_con_incidentes(self):
        """Ejecutar simulación con incidentes"""
        sim = SimuladorUrgencias(
            hospitales_ids=["chuac", "modelo"],
            con_incidentes=True,
            intervalo_incidentes=15,  # Incidente cada 15 min
        )
        sim.ejecutar(duracion_horas=1)
        
        # Debe haber al menos un incidente
        assert len(sim.generador_incidentes.incidentes) >= 1


class TestFlujoCompleto:
    """Tests de integración del flujo completo"""
    
    def test_flujo_paciente_completo(self):
        """Probar flujo completo de un paciente"""
        env = simpy.Environment()
        hospital = HospitalUrgencias(env=env, config=HOSPITALES["chuac"])
        
        # Crear paciente
        paciente = Paciente(
            id=1,
            hospital_id="chuac",
            nivel_triaje=NivelTriaje.VERDE,
            patologia="Contusión",
            t_llegada=0,
        )
        hospital.pacientes_activos[1] = paciente
        
        # Procesar
        env.process(hospital.proceso_paciente(paciente))
        env.run(until=500)  # Tiempo suficiente para completar
        
        # Verificar que el paciente pasó por todas las fases
        assert paciente.t_fin_recepcion > 0
        assert paciente.t_fin_triaje > 0
        assert paciente.t_fin_consulta > 0
        assert paciente.estado in [EstadoPaciente.ALTA, EstadoPaciente.EN_OBSERVACION]
    
    def test_derivacion_en_triaje(self):
        """Probar que derivaciones ocurren después del triaje"""
        env = simpy.Environment()
        hospitales = {
            h_id: HospitalUrgencias(env=env, config=HOSPITALES[h_id])
            for h_id in ["chuac", "modelo"]
        }
        coordinador = CoordinadorDerivaciones(hospitales)
        for h in hospitales.values():
            h.coordinador = coordinador
        
        # Paciente grave en Modelo
        paciente = Paciente(
            id=1,
            hospital_id="modelo",
            nivel_triaje=NivelTriaje.ROJO,
            patologia="PCR",
            t_llegada=0,
        )
        hospitales["modelo"].pacientes_activos[1] = paciente
        
        # Procesar
        env.process(hospitales["modelo"].proceso_paciente(paciente))
        env.run(until=100)
        
        # El paciente debe haber sido derivado
        assert paciente.derivado_a == "chuac"
        assert len(coordinador.derivaciones) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
