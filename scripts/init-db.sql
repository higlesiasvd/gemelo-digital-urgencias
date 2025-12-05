-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS - GEMELO DIGITAL HOSPITALARIO
-- ═══════════════════════════════════════════════════════════════════════════════
-- Este script se ejecuta automáticamente cuando se crea el contenedor PostgreSQL.
-- Incluye datos iniciales de personal de ejemplo para desarrollo.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsquedas fuzzy

-- ═══════════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES: PERSONAL DE URGENCIAS (3 hospitales)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insertar personal de ejemplo después de que SQLAlchemy cree las tablas
-- Este bloque se ejecutará como función para poder reintentar si las tablas no existen

CREATE OR REPLACE FUNCTION insertar_datos_iniciales()
RETURNS void AS $$
BEGIN
    -- Solo insertar si la tabla está vacía
    IF (SELECT COUNT(*) FROM personal) = 0 THEN
        
        -- ═══════════════════════════════════════════════════════════════════
        -- CHUAC - Complexo Hospitalario Universitario A Coruña
        -- ═══════════════════════════════════════════════════════════════════
        
        -- Médicos CHUAC
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, especialidad, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'CHUAC-M001', 'Carlos', 'García López', '12345678A', 'carlos.garcia@sergas.es', '600111001', 'medico', 'Medicina de Urgencias', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-M002', 'María', 'Fernández Vidal', '12345678B', 'maria.fernandez@sergas.es', '600111002', 'medico', 'Medicina de Urgencias', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-M003', 'Antonio', 'Martínez Ruiz', '12345678C', 'antonio.martinez@sergas.es', '600111003', 'medico', 'Medicina Interna', 'chuac', 'urgencias', true, false, 40),
        (uuid_generate_v4(), 'CHUAC-M004', 'Laura', 'Sánchez Pérez', '12345678D', 'laura.sanchez@sergas.es', '600111004', 'medico', 'Traumatología', 'chuac', 'urgencias', true, true, 35),
        (uuid_generate_v4(), 'CHUAC-M005', 'Pedro', 'López Torres', '12345678E', 'pedro.lopez@sergas.es', '600111005', 'medico', 'Cardiología', 'chuac', 'urgencias', true, true, 40);
        
        -- Enfermeros CHUAC
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'CHUAC-E001', 'Ana', 'Rodríguez Silva', '23456789A', 'ana.rodriguez@sergas.es', '600222001', 'enfermero', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-E002', 'Miguel', 'Pérez Gómez', '23456789B', 'miguel.perez@sergas.es', '600222002', 'enfermero', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-E003', 'Elena', 'González Díaz', '23456789C', 'elena.gonzalez@sergas.es', '600222003', 'enfermero', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-E004', 'David', 'Martín Blanco', '23456789D', 'david.martin@sergas.es', '600222004', 'enfermero', 'chuac', 'urgencias', true, false, 35),
        (uuid_generate_v4(), 'CHUAC-E005', 'Patricia', 'Álvarez Rey', '23456789E', 'patricia.alvarez@sergas.es', '600222005', 'enfermero', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-E006', 'Roberto', 'Vázquez Paz', '23456789F', 'roberto.vazquez@sergas.es', '600222006', 'enfermero', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-E007', 'Carmen', 'Castro Ríos', '23456789G', 'carmen.castro@sergas.es', '600222007', 'enfermero', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-E008', 'Javier', 'Núñez Varela', '23456789H', 'javier.nunez@sergas.es', '600222008', 'enfermero', 'chuac', 'urgencias', true, true, 40);
        
        -- Auxiliares CHUAC
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'CHUAC-A001', 'Rosa', 'Iglesias Conde', '34567890A', 'rosa.iglesias@sergas.es', '600333001', 'auxiliar', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-A002', 'Francisco', 'Otero Seoane', '34567890B', 'francisco.otero@sergas.es', '600333002', 'auxiliar', 'chuac', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'CHUAC-A003', 'Lucía', 'Pena Lois', '34567890C', 'lucia.pena@sergas.es', '600333003', 'auxiliar', 'chuac', 'urgencias', true, true, 35),
        (uuid_generate_v4(), 'CHUAC-A004', 'Manuel', 'Ramos Vilar', '34567890D', 'manuel.ramos@sergas.es', '600333004', 'auxiliar', 'chuac', 'urgencias', true, false, 40);
        
        -- ═══════════════════════════════════════════════════════════════════
        -- HM MODELO - Hospital Privado
        -- ═══════════════════════════════════════════════════════════════════
        
        -- Médicos HM Modelo
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, especialidad, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'HMM-M001', 'Alejandro', 'Prieto Campos', '45678901A', 'alejandro.prieto@hmhospitales.com', '600444001', 'medico', 'Medicina de Urgencias', 'hm_modelo', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'HMM-M002', 'Cristina', 'Souto Barca', '45678901B', 'cristina.souto@hmhospitales.com', '600444002', 'medico', 'Medicina General', 'hm_modelo', 'urgencias', true, true, 40);
        
        -- Enfermeros HM Modelo
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'HMM-E001', 'Beatriz', 'Freire Lema', '56789012A', 'beatriz.freire@hmhospitales.com', '600555001', 'enfermero', 'hm_modelo', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'HMM-E002', 'Alberto', 'Caamaño Gil', '56789012B', 'alberto.caamano@hmhospitales.com', '600555002', 'enfermero', 'hm_modelo', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'HMM-E003', 'Silvia', 'Doval Piñeiro', '56789012C', 'silvia.doval@hmhospitales.com', '600555003', 'enfermero', 'hm_modelo', 'urgencias', true, true, 35);
        
        -- Auxiliares HM Modelo
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'HMM-A001', 'Marcos', 'Taboada Ares', '67890123A', 'marcos.taboada@hmhospitales.com', '600666001', 'auxiliar', 'hm_modelo', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'HMM-A002', 'Nerea', 'Bello Costa', '67890123B', 'nerea.bello@hmhospitales.com', '600666002', 'auxiliar', 'hm_modelo', 'urgencias', true, true, 40);
        
        -- ═══════════════════════════════════════════════════════════════════
        -- SAN RAFAEL - Hospital San Rafael
        -- ═══════════════════════════════════════════════════════════════════
        
        -- Médicos San Rafael
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, especialidad, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'SR-M001', 'Gonzalo', 'Romero Feal', '78901234A', 'gonzalo.romero@sanrafael.es', '600777001', 'medico', 'Medicina de Urgencias', 'san_rafael', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'SR-M002', 'Marta', 'Carballo Míguez', '78901234B', 'marta.carballo@sanrafael.es', '600777002', 'medico', 'Medicina General', 'san_rafael', 'urgencias', true, true, 35);
        
        -- Enfermeros San Rafael
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'SR-E001', 'Paula', 'Varela Lens', '89012345A', 'paula.varela@sanrafael.es', '600888001', 'enfermero', 'san_rafael', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'SR-E002', 'Adrián', 'Domínguez Ferro', '89012345B', 'adrian.dominguez@sanrafael.es', '600888002', 'enfermero', 'san_rafael', 'urgencias', true, true, 40),
        (uuid_generate_v4(), 'SR-E003', 'Inés', 'Mosquera Calvo', '89012345C', 'ines.mosquera@sanrafael.es', '600888003', 'enfermero', 'san_rafael', 'urgencias', true, false, 40);
        
        -- Auxiliares San Rafael
        INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, hospital_id, unidad, activo, acepta_refuerzos, horas_semanales_contrato)
        VALUES 
        (uuid_generate_v4(), 'SR-A001', 'Óscar', 'Teijeiro Vidal', '90123456A', 'oscar.teijeiro@sanrafael.es', '600999001', 'auxiliar', 'san_rafael', 'urgencias', true, true, 40);
        
        -- ═══════════════════════════════════════════════════════════════════
        -- CONFIGURACIÓN DE UMBRALES POR HOSPITAL
        -- ═══════════════════════════════════════════════════════════════════
        
        INSERT INTO configuracion_umbrales (id, hospital_id, umbral_saturacion_media, umbral_saturacion_alta, umbral_saturacion_critica, umbral_demanda_normal, umbral_demanda_alta, ratio_paciente_enfermero_objetivo, ratio_paciente_medico_objetivo, medicos_minimo_manana, medicos_minimo_tarde, medicos_minimo_noche, enfermeros_minimo_manana, enfermeros_minimo_tarde, enfermeros_minimo_noche, alertas_activas, refuerzos_automaticos, horas_anticipacion_refuerzo)
        VALUES 
        -- CHUAC - Hospital grande, umbrales más exigentes
        (uuid_generate_v4(), 'chuac', 0.65, 0.80, 0.90, 15.0, 25.0, 4.0, 8.0, 3, 3, 2, 8, 8, 5, true, true, 4),
        -- HM Modelo - Hospital mediano
        (uuid_generate_v4(), 'hm_modelo', 0.70, 0.85, 0.95, 4.0, 8.0, 5.0, 10.0, 1, 1, 1, 3, 3, 2, true, true, 3),
        -- San Rafael - Hospital pequeño
        (uuid_generate_v4(), 'san_rafael', 0.70, 0.85, 0.95, 3.0, 6.0, 5.0, 10.0, 1, 1, 1, 2, 2, 2, true, true, 3);
        
        RAISE NOTICE 'Datos iniciales insertados correctamente';
    ELSE
        RAISE NOTICE 'La tabla personal ya contiene datos, saltando inserción';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Nota: Esta función se llamará desde la aplicación Python después de crear las tablas con SQLAlchemy
-- O se puede ejecutar manualmente: SELECT insertar_datos_iniciales();

-- ═══════════════════════════════════════════════════════════════════════════════
-- VISTAS ÚTILES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vista para resumen de personal por hospital
CREATE OR REPLACE VIEW v_resumen_personal_hospital AS
SELECT 
    hospital_id,
    rol,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE activo = true) as activos,
    COUNT(*) FILTER (WHERE acepta_refuerzos = true) as disponibles_refuerzo
FROM personal
GROUP BY hospital_id, rol
ORDER BY hospital_id, rol;

-- Vista para personal disponible para refuerzos
CREATE OR REPLACE VIEW v_personal_disponible_refuerzo AS
SELECT 
    p.id,
    p.numero_empleado,
    p.nombre || ' ' || p.apellidos as nombre_completo,
    p.rol,
    p.hospital_id,
    p.telefono,
    p.email
FROM personal p
WHERE p.activo = true 
  AND p.acepta_refuerzos = true
  AND NOT EXISTS (
      SELECT 1 FROM disponibilidades d 
      WHERE d.personal_id = p.id 
        AND d.estado != 'disponible'
        AND d.fecha_inicio <= CURRENT_DATE 
        AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE)
  )
ORDER BY p.hospital_id, p.rol;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCIONES DE UTILIDAD
-- ═══════════════════════════════════════════════════════════════════════════════

-- Función para obtener el turno actual según la hora
CREATE OR REPLACE FUNCTION obtener_turno_actual()
RETURNS text AS $$
DECLARE
    hora_actual integer;
BEGIN
    hora_actual := EXTRACT(HOUR FROM CURRENT_TIME);
    IF hora_actual >= 7 AND hora_actual < 15 THEN
        RETURN 'manana';
    ELSIF hora_actual >= 15 AND hora_actual < 23 THEN
        RETURN 'tarde';
    ELSE
        RETURN 'noche';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para contar personal trabajando en un hospital/turno
CREATE OR REPLACE FUNCTION contar_personal_turno(
    p_hospital_id text,
    p_fecha date DEFAULT CURRENT_DATE,
    p_turno text DEFAULT NULL
)
RETURNS TABLE(rol text, cantidad bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.rol::text,
        COUNT(*)
    FROM turnos t
    JOIN personal p ON t.personal_id = p.id
    WHERE t.hospital_id = p_hospital_id
      AND t.fecha = p_fecha
      AND t.confirmado = true
      AND (p_turno IS NULL OR t.tipo_turno::text = p_turno)
    GROUP BY t.rol;
END;
$$ LANGUAGE plpgsql;

COMMENT ON DATABASE urgencias_db IS 'Base de datos del Gemelo Digital Hospitalario - Sistema de Urgencias';
