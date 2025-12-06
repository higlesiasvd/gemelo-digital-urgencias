-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Crear tablas para arquitectura DDD
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: hospitales
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hospitales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,

    -- Ubicación
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    direccion TEXT,

    -- Infraestructura física
    num_ventanillas_recepcion INTEGER NOT NULL DEFAULT 0,
    aforo_sala_espera INTEGER NOT NULL DEFAULT 0,
    numero_boxes_triaje INTEGER NOT NULL DEFAULT 0,
    numero_consultas INTEGER NOT NULL DEFAULT 0,
    num_camillas_observacion INTEGER NOT NULL DEFAULT 0,

    -- Estado
    activo BOOLEAN DEFAULT TRUE,

    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospitales_codigo ON hospitales(codigo);
CREATE INDEX IF NOT EXISTS idx_hospitales_activo ON hospitales(activo);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TIPO ENUM: tipo_puesto
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE tipo_puesto AS ENUM (
        'ventanilla_recepcion',
        'box_triaje',
        'consulta',
        'camilla_observacion',
        'sala_espera'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: configuracion_personal_hospital
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS configuracion_personal_hospital (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitales(id) ON DELETE CASCADE,

    puesto tipo_puesto NOT NULL,
    rol VARCHAR(50) NOT NULL,

    -- Configuración por turno (mínimo y máximo)
    turno_manana_min INTEGER NOT NULL DEFAULT 0,
    turno_manana_max INTEGER NOT NULL DEFAULT 0,
    turno_tarde_min INTEGER NOT NULL DEFAULT 0,
    turno_tarde_max INTEGER NOT NULL DEFAULT 0,
    turno_noche_min INTEGER NOT NULL DEFAULT 0,
    turno_noche_max INTEGER NOT NULL DEFAULT 0,

    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(hospital_id, puesto, rol)
);

CREATE INDEX IF NOT EXISTS idx_config_personal_hospital ON configuracion_personal_hospital(hospital_id);
CREATE INDEX IF NOT EXISTS idx_config_personal_puesto ON configuracion_personal_hospital(puesto);


-- ═══════════════════════════════════════════════════════════════════════════════
-- MODIFICAR TABLA: personal (añadir campos para Lista SERGAS)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE personal ADD COLUMN IF NOT EXISTS en_lista_sergas BOOLEAN DEFAULT FALSE;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS fecha_entrada_lista_sergas TIMESTAMP;
ALTER TABLE personal ADD COLUMN IF NOT EXISTS hospital_origen_id UUID REFERENCES hospitales(id);

CREATE INDEX IF NOT EXISTS idx_personal_lista_sergas ON personal(en_lista_sergas);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TIPO ENUM: motivo_entrada_lista
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE motivo_entrada_lista AS ENUM (
        'baja_hospital',
        'fin_contrato',
        'voluntario',
        'reduccion_plantilla',
        'nuevo_ingreso'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: lista_sergas
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lista_sergas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personal_id UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,

    -- Info desnormalizada
    nombre_completo VARCHAR(250) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),

    -- Disponibilidad por turno
    disponible_turno_manana BOOLEAN DEFAULT TRUE,
    disponible_turno_tarde BOOLEAN DEFAULT TRUE,
    disponible_turno_noche BOOLEAN DEFAULT TRUE,

    -- Preferencias
    hospitales_preferidos TEXT[],
    distancia_maxima_km INTEGER,

    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    fecha_entrada TIMESTAMP DEFAULT NOW(),
    motivo_entrada motivo_entrada_lista,

    -- Última asignación
    ultima_asignacion_hospital_id UUID REFERENCES hospitales(id),
    ultima_asignacion_fecha TIMESTAMP,

    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(personal_id)
);

CREATE INDEX IF NOT EXISTS idx_lista_sergas_activo ON lista_sergas(activo);
CREATE INDEX IF NOT EXISTS idx_lista_sergas_rol ON lista_sergas(rol);
CREATE INDEX IF NOT EXISTS idx_lista_sergas_disponibilidad ON lista_sergas(
    disponible_turno_manana,
    disponible_turno_tarde,
    disponible_turno_noche
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TIPO ENUM: estado_asignacion
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE estado_asignacion AS ENUM (
        'activa',
        'completada',
        'cancelada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLA: asignaciones_temporales
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS asignaciones_temporales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personal_id UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,

    -- Movimiento
    origen_tipo VARCHAR(20) NOT NULL,
    origen_id UUID,
    destino_tipo VARCHAR(20) NOT NULL,
    destino_id UUID,

    -- Detalles
    fecha_asignacion TIMESTAMP DEFAULT NOW(),
    fecha_fin_prevista TIMESTAMP,
    fecha_fin_real TIMESTAMP,
    turno VARCHAR(20),
    motivo TEXT,

    -- Estado
    estado estado_asignacion DEFAULT 'activa',

    -- Metadatos
    creado_por VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asignaciones_personal ON asignaciones_temporales(personal_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_estado ON asignaciones_temporales(estado);
CREATE INDEX IF NOT EXISTS idx_asignaciones_fecha ON asignaciones_temporales(fecha_asignacion);


-- ═══════════════════════════════════════════════════════════════════════════════
-- DATOS INICIALES: Hospitales
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO hospitales (codigo, nombre, latitud, longitud, direccion,
    num_ventanillas_recepcion, aforo_sala_espera, numero_boxes_triaje,
    numero_consultas, num_camillas_observacion)
VALUES
    ('chuac', 'Complexo Hospitalario Universitario A Coruña',
        43.3549, -8.4115, 'As Xubias, 84, 15006 A Coruña',
        4, 80, 6, 12, 20),

    ('hm_modelo', 'Hospital HM Modelo',
        43.3712, -8.3959, 'Virrey Osorio, 30, 15011 A Coruña',
        2, 40, 3, 6, 10),

    ('san_rafael', 'Hospital San Rafael',
        43.3689, -8.4023, 'C. de Fernando Macías, 11, 15004 A Coruña',
        2, 35, 3, 5, 8)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    direccion = EXCLUDED.direccion,
    num_ventanillas_recepcion = EXCLUDED.num_ventanillas_recepcion,
    aforo_sala_espera = EXCLUDED.aforo_sala_espera,
    numero_boxes_triaje = EXCLUDED.numero_boxes_triaje,
    numero_consultas = EXCLUDED.numero_consultas,
    num_camillas_observacion = EXCLUDED.num_camillas_observacion,
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DE PERSONAL POR HOSPITAL
-- ═══════════════════════════════════════════════════════════════════════════════

-- CHUAC - Configuración de personal
INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'ventanilla_recepcion', 'administrativo', 2, 4, 2, 4, 1, 2
FROM hospitales h WHERE h.codigo = 'chuac'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'box_triaje', 'enfermero', 3, 6, 3, 6, 2, 4
FROM hospitales h WHERE h.codigo = 'chuac'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'consulta', 'medico', 4, 8, 4, 8, 2, 4
FROM hospitales h WHERE h.codigo = 'chuac'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'camilla_observacion', 'enfermero', 4, 8, 4, 8, 3, 6
FROM hospitales h WHERE h.codigo = 'chuac'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

-- HM Modelo - Configuración de personal
INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'ventanilla_recepcion', 'administrativo', 1, 2, 1, 2, 1, 1
FROM hospitales h WHERE h.codigo = 'hm_modelo'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'box_triaje', 'enfermero', 2, 3, 2, 3, 1, 2
FROM hospitales h WHERE h.codigo = 'hm_modelo'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'consulta', 'medico', 2, 4, 2, 4, 1, 2
FROM hospitales h WHERE h.codigo = 'hm_modelo'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

-- San Rafael - Configuración de personal
INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'ventanilla_recepcion', 'administrativo', 1, 2, 1, 2, 1, 1
FROM hospitales h WHERE h.codigo = 'san_rafael'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'box_triaje', 'enfermero', 2, 3, 2, 3, 1, 2
FROM hospitales h WHERE h.codigo = 'san_rafael'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;

INSERT INTO configuracion_personal_hospital (hospital_id, puesto, rol,
    turno_manana_min, turno_manana_max, turno_tarde_min, turno_tarde_max,
    turno_noche_min, turno_noche_max)
SELECT h.id, 'consulta', 'medico', 2, 4, 2, 4, 1, 2
FROM hospitales h WHERE h.codigo = 'san_rafael'
ON CONFLICT (hospital_id, puesto, rol) DO UPDATE SET
    turno_manana_min = EXCLUDED.turno_manana_min,
    turno_manana_max = EXCLUDED.turno_manana_max,
    turno_tarde_min = EXCLUDED.turno_tarde_min,
    turno_tarde_max = EXCLUDED.turno_tarde_max,
    turno_noche_min = EXCLUDED.turno_noche_min,
    turno_noche_max = EXCLUDED.turno_noche_max;


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Migración completada: tablas DDD creadas con datos iniciales' as resultado;
