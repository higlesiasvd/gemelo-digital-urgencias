-- ============================================================================
-- GEMELO DIGITAL HOSPITALARIO - INICIALIZACION DE BASE DE DATOS
-- ============================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: staff
-- Personal del hospital (celadores, enfermeras, médicos base)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staff (
    staff_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('celador', 'enfermeria', 'medico')),
    hospital_id VARCHAR(20) NOT NULL,
    asignacion_actual VARCHAR(50),
    estado VARCHAR(20) DEFAULT 'available' CHECK (estado IN ('available', 'busy', 'off-shift')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_staff_hospital ON staff(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_rol ON staff(rol);
CREATE INDEX IF NOT EXISTS idx_staff_estado ON staff(estado);

-- ============================================================================
-- TABLA: consultas
-- Configuración de consultas por hospital
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultas (
    consulta_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id VARCHAR(20) NOT NULL,
    numero_consulta INT NOT NULL,
    enfermeras_asignadas INT DEFAULT 2,
    medicos_asignados INT DEFAULT 1 CHECK (medicos_asignados >= 1 AND medicos_asignados <= 4),
    activa BOOLEAN DEFAULT true,
    UNIQUE(hospital_id, numero_consulta)
);

-- ============================================================================
-- TABLA: lista_sergas
-- Médicos disponibles para refuerzo (solo CHUAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lista_sergas (
    medico_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    especialidad VARCHAR(50),
    disponible BOOLEAN DEFAULT true,
    asignado_a_hospital VARCHAR(20),
    asignado_a_consulta INT,
    fecha_asignacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda de disponibles
CREATE INDEX IF NOT EXISTS idx_sergas_disponible ON lista_sergas(disponible);

-- ============================================================================
-- DATOS INICIALES: CHUAC
-- ============================================================================

-- Personal base CHUAC
-- 2 ventanillas x 1 celador = 2 celadores
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Carlos García', 'celador', 'chuac', 'ventanilla_1', 'available'),
    ('Miguel López', 'celador', 'chuac', 'ventanilla_2', 'available');

-- 5 boxes x 2 enfermeras = 10 enfermeras triaje
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('María Fernández', 'enfermeria', 'chuac', 'box_1', 'available'),
    ('Laura Martínez', 'enfermeria', 'chuac', 'box_1', 'available'),
    ('Ana Rodríguez', 'enfermeria', 'chuac', 'box_2', 'available'),
    ('Carmen Sánchez', 'enfermeria', 'chuac', 'box_2', 'available'),
    ('Rosa González', 'enfermeria', 'chuac', 'box_3', 'available'),
    ('Elena Pérez', 'enfermeria', 'chuac', 'box_3', 'available'),
    ('Isabel Díaz', 'enfermeria', 'chuac', 'box_4', 'available'),
    ('Lucía Moreno', 'enfermeria', 'chuac', 'box_4', 'available'),
    ('Patricia Ruiz', 'enfermeria', 'chuac', 'box_5', 'available'),
    ('Marta Jiménez', 'enfermeria', 'chuac', 'box_5', 'available');

-- 10 consultas x 2 enfermeras = 20 enfermeras consultas
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Sara Navarro', 'enfermeria', 'chuac', 'consulta_1', 'available'),
    ('Paula Torres', 'enfermeria', 'chuac', 'consulta_1', 'available'),
    ('Claudia Domínguez', 'enfermeria', 'chuac', 'consulta_2', 'available'),
    ('Silvia Vázquez', 'enfermeria', 'chuac', 'consulta_2', 'available'),
    ('Raquel Ramos', 'enfermeria', 'chuac', 'consulta_3', 'available'),
    ('Cristina Blanco', 'enfermeria', 'chuac', 'consulta_3', 'available'),
    ('Nuria Molina', 'enfermeria', 'chuac', 'consulta_4', 'available'),
    ('Eva Ortega', 'enfermeria', 'chuac', 'consulta_4', 'available'),
    ('Inés Delgado', 'enfermeria', 'chuac', 'consulta_5', 'available'),
    ('Alba Castro', 'enfermeria', 'chuac', 'consulta_5', 'available'),
    ('Irene Romero', 'enfermeria', 'chuac', 'consulta_6', 'available'),
    ('Beatriz Herrera', 'enfermeria', 'chuac', 'consulta_6', 'available'),
    ('Andrea Muñoz', 'enfermeria', 'chuac', 'consulta_7', 'available'),
    ('Sandra Álvarez', 'enfermeria', 'chuac', 'consulta_7', 'available'),
    ('Rocío Guerrero', 'enfermeria', 'chuac', 'consulta_8', 'available'),
    ('Diana Fernández', 'enfermeria', 'chuac', 'consulta_8', 'available'),
    ('Mónica Soto', 'enfermeria', 'chuac', 'consulta_9', 'available'),
    ('Teresa Mendoza', 'enfermeria', 'chuac', 'consulta_9', 'available'),
    ('Victoria Cortés', 'enfermeria', 'chuac', 'consulta_10', 'available'),
    ('Adriana Reyes', 'enfermeria', 'chuac', 'consulta_10', 'available');

-- 10 médicos base (1 por consulta)
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Dr. Antonio Martínez', 'medico', 'chuac', 'consulta_1', 'available'),
    ('Dra. Patricia López', 'medico', 'chuac', 'consulta_2', 'available'),
    ('Dr. Francisco García', 'medico', 'chuac', 'consulta_3', 'available'),
    ('Dra. Carmen Rodríguez', 'medico', 'chuac', 'consulta_4', 'available'),
    ('Dr. Manuel Fernández', 'medico', 'chuac', 'consulta_5', 'available'),
    ('Dra. Isabel Sánchez', 'medico', 'chuac', 'consulta_6', 'available'),
    ('Dr. José González', 'medico', 'chuac', 'consulta_7', 'available'),
    ('Dra. Ana Pérez', 'medico', 'chuac', 'consulta_8', 'available'),
    ('Dr. Luis Díaz', 'medico', 'chuac', 'consulta_9', 'available'),
    ('Dra. María Moreno', 'medico', 'chuac', 'consulta_10', 'available');

-- Consultas CHUAC (10)
INSERT INTO consultas (hospital_id, numero_consulta, enfermeras_asignadas, medicos_asignados) VALUES
    ('chuac', 1, 2, 1),
    ('chuac', 2, 2, 1),
    ('chuac', 3, 2, 1),
    ('chuac', 4, 2, 1),
    ('chuac', 5, 2, 1),
    ('chuac', 6, 2, 1),
    ('chuac', 7, 2, 1),
    ('chuac', 8, 2, 1),
    ('chuac', 9, 2, 1),
    ('chuac', 10, 2, 1);

-- ============================================================================
-- DATOS INICIALES: HM Modelo
-- ============================================================================

-- 1 celador
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Pedro Ruiz', 'celador', 'modelo', 'ventanilla_1', 'available');

-- 2 enfermeras triaje
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Julia Santos', 'enfermeria', 'modelo', 'box_1', 'available'),
    ('Carolina Vargas', 'enfermeria', 'modelo', 'box_1', 'available');

-- 8 enfermeras consultas (4 consultas x 2)
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Lorena Gil', 'enfermeria', 'modelo', 'consulta_1', 'available'),
    ('Natalia Herrera', 'enfermeria', 'modelo', 'consulta_1', 'available'),
    ('Verónica Cruz', 'enfermeria', 'modelo', 'consulta_2', 'available'),
    ('Alicia Medina', 'enfermeria', 'modelo', 'consulta_2', 'available'),
    ('Daniela Ortiz', 'enfermeria', 'modelo', 'consulta_3', 'available'),
    ('Valeria Paredes', 'enfermeria', 'modelo', 'consulta_3', 'available'),
    ('Camila Ríos', 'enfermeria', 'modelo', 'consulta_4', 'available'),
    ('Gabriela Silva', 'enfermeria', 'modelo', 'consulta_4', 'available');

-- 4 médicos (1 por consulta)
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Dr. Roberto Aguilar', 'medico', 'modelo', 'consulta_1', 'available'),
    ('Dra. Mónica Espinoza', 'medico', 'modelo', 'consulta_2', 'available'),
    ('Dr. Fernando Castro', 'medico', 'modelo', 'consulta_3', 'available'),
    ('Dra. Lucia Mendez', 'medico', 'modelo', 'consulta_4', 'available');

-- Consultas Modelo (4)
INSERT INTO consultas (hospital_id, numero_consulta, enfermeras_asignadas, medicos_asignados) VALUES
    ('modelo', 1, 2, 1),
    ('modelo', 2, 2, 1),
    ('modelo', 3, 2, 1),
    ('modelo', 4, 2, 1);

-- ============================================================================
-- DATOS INICIALES: San Rafael
-- ============================================================================

-- 1 celador
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Andrés Vega', 'celador', 'san_rafael', 'ventanilla_1', 'available');

-- 2 enfermeras triaje
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Mariana Torres', 'enfermeria', 'san_rafael', 'box_1', 'available'),
    ('Sofía Flores', 'enfermeria', 'san_rafael', 'box_1', 'available');

-- 8 enfermeras consultas
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Alejandra León', 'enfermeria', 'san_rafael', 'consulta_1', 'available'),
    ('Fernanda Rojas', 'enfermeria', 'san_rafael', 'consulta_1', 'available'),
    ('Valentina Herrera', 'enfermeria', 'san_rafael', 'consulta_2', 'available'),
    ('Isabella Núñez', 'enfermeria', 'san_rafael', 'consulta_2', 'available'),
    ('Emma Guzmán', 'enfermeria', 'san_rafael', 'consulta_3', 'available'),
    ('Olivia Vargas', 'enfermeria', 'san_rafael', 'consulta_3', 'available'),
    ('Martina Peña', 'enfermeria', 'san_rafael', 'consulta_4', 'available'),
    ('Victoria Sosa', 'enfermeria', 'san_rafael', 'consulta_4', 'available');

-- 4 médicos
INSERT INTO staff (nombre, rol, hospital_id, asignacion_actual, estado) VALUES
    ('Dr. Raúl Campos', 'medico', 'san_rafael', 'consulta_1', 'available'),
    ('Dra. Elena Quiroz', 'medico', 'san_rafael', 'consulta_2', 'available'),
    ('Dr. Alberto Ponce', 'medico', 'san_rafael', 'consulta_3', 'available'),
    ('Dra. Silvia Ibarra', 'medico', 'san_rafael', 'consulta_4', 'available');

-- Consultas San Rafael (4)
INSERT INTO consultas (hospital_id, numero_consulta, enfermeras_asignadas, medicos_asignados) VALUES
    ('san_rafael', 1, 2, 1),
    ('san_rafael', 2, 2, 1),
    ('san_rafael', 3, 2, 1),
    ('san_rafael', 4, 2, 1);

-- ============================================================================
-- LISTA SERGAS - Médicos disponibles para refuerzo
-- ============================================================================

INSERT INTO lista_sergas (nombre, especialidad, disponible) VALUES
    ('Dr. Pablo Estrada', 'Medicina General', true),
    ('Dra. Luciana Villanueva', 'Urgencias', true),
    ('Dr. Emilio Cabrera', 'Medicina Interna', true),
    ('Dra. Renata Salazar', 'Urgencias', true),
    ('Dr. Gonzalo Mejía', 'Medicina General', true),
    ('Dra. Catalina Fuentes', 'Urgencias', true),
    ('Dr. Ignacio Valdés', 'Medicina Interna', true),
    ('Dra. Jimena Osorio', 'Urgencias', true),
    ('Dr. Sebastián Mora', 'Medicina General', true),
    ('Dra. Agustina Bravo', 'Urgencias', true),
    ('Dr. Tomás Figueroa', 'Medicina Interna', true),
    ('Dra. Regina Lara', 'Urgencias', true),
    ('Dr. Nicolás Contreras', 'Medicina General', true),
    ('Dra. Antonella Pacheco', 'Urgencias', true),
    ('Dr. Mateo Suárez', 'Medicina Interna', true),
    ('Dr. Rodrigo Fernández', 'Cardiología', true),
    ('Dra. Valentina Herrera', 'Traumatología', true),
    ('Dr. Álvaro Mendoza', 'Urgencias', true),
    ('Dra. Camila Reyes', 'Pediatría', true),
    ('Dr. Diego Paredes', 'Medicina Interna', true),
    ('Dra. Isabella Vega', 'Medicina General', true),
    ('Dr. Fernando Castillo', 'Urgencias', true),
    ('Dra. Martina Ruiz', 'Cardiología', true),
    ('Dr. Alejandro Soto', 'Traumatología', true),
    ('Dra. Sofía Navarro', 'Urgencias', true),
    ('Dr. Gabriel Morales', 'Medicina Interna', true),
    ('Dra. Daniela Ortiz', 'Pediatría', true),
    ('Dr. Lucas Guerrero', 'Medicina General', true),
    ('Dra. Paula Campos', 'Urgencias', true),
    ('Dr. Adrián Rojas', 'Cardiología', true);
-- ============================================================================
-- SISTEMA DE USUARIOS Y GAMIFICACIÓN
-- ============================================================================

-- TABLA: users (OAuth + gamificación)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- OAuth campos
    oauth_provider VARCHAR(20) NOT NULL DEFAULT 'google',
    oauth_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- Perfil
    nombre VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100),
    avatar_url VARCHAR(500),
    rol VARCHAR(20) DEFAULT 'estudiante' CHECK (rol IN ('estudiante', 'admin')),
    -- Gamificación
    xp_total INT DEFAULT 0,
    nivel INT DEFAULT 1,
    racha_dias INT DEFAULT 0,
    racha_max INT DEFAULT 0,
    vidas INT DEFAULT 5,
    ultima_actividad DATE,
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    UNIQUE(oauth_provider, oauth_id)
);

-- TABLA: lessons (Lecciones/Niveles del árbol)
CREATE TABLE IF NOT EXISTS lessons (
    lesson_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden INT NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    xp_recompensa INT DEFAULT 50,
    ejercicios_requeridos INT DEFAULT 10,
    lesson_prerequisito UUID REFERENCES lessons(lesson_id),
    curso VARCHAR(50) DEFAULT 'triaje',
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: user_lessons (Progreso del usuario en lecciones)
CREATE TABLE IF NOT EXISTS user_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    ejercicios_completados INT DEFAULT 0,
    estrellas INT DEFAULT 0 CHECK (estrellas >= 0 AND estrellas <= 3),
    completada BOOLEAN DEFAULT false,
    xp_obtenido INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- TABLA: clinical_cases (Casos clínicos para ejercicios)
CREATE TABLE IF NOT EXISTS clinical_cases (
    case_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(lesson_id),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    paciente_edad INT,
    paciente_sexo VARCHAR(10),
    motivo_consulta TEXT NOT NULL,
    sintomas JSONB NOT NULL,
    constantes_vitales JSONB,
    antecedentes TEXT,
    triaje_correcto VARCHAR(20) NOT NULL CHECK (triaje_correcto IN ('rojo', 'naranja', 'amarillo', 'verde', 'azul')),
    explicacion TEXT NOT NULL,
    xp_base INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: exercise_attempts (Intentos de ejercicios)
CREATE TABLE IF NOT EXISTS exercise_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    case_id UUID REFERENCES clinical_cases(case_id),
    lesson_id UUID REFERENCES lessons(lesson_id),
    respuesta_usuario VARCHAR(20) NOT NULL,
    es_correcta BOOLEAN NOT NULL,
    tiempo_ms INT,
    xp_obtenido INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: badges
CREATE TABLE IF NOT EXISTS badges (
    badge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    criterio JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: user_badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(badge_id) ON DELETE CASCADE,
    obtenido_en TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- TABLA: daily_challenges (Reto diario)
CREATE TABLE IF NOT EXISTS daily_challenges (
    challenge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE UNIQUE NOT NULL,
    casos_ids UUID[] NOT NULL,
    xp_bonus INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA: user_daily_progress (Progreso diario del usuario)
CREATE TABLE IF NOT EXISTS user_daily_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    ejercicios_completados INT DEFAULT 0,
    xp_ganado INT DEFAULT 0,
    racha_mantenida BOOLEAN DEFAULT false,
    UNIQUE(user_id, fecha)
);

-- Índices para gamificación
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user ON exercise_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_user ON user_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_lesson ON clinical_cases(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user ON user_daily_progress(user_id, fecha);

-- ============================================================================
-- DATOS INICIALES: Lecciones del árbol de formación
-- ============================================================================

INSERT INTO lessons (orden, codigo, nombre, descripcion, icono, color, xp_recompensa, ejercicios_requeridos) VALUES
(1, 'fundamentos', 'Fundamentos del Triaje', 'Aprende los conceptos básicos del sistema Manchester de triaje', '📘', '#3b82f6', 100, 10),
(2, 'verde_azul', 'Triaje Verde y Azul', 'Casos no urgentes y de baja prioridad que pueden esperar', '🟢', '#22c55e', 150, 10),
(3, 'amarillo', 'Triaje Amarillo', 'Urgencias que pueden esperar hasta 60 minutos', '🟡', '#eab308', 200, 12),
(4, 'naranja', 'Triaje Naranja', 'Urgencias que requieren atención en 10 minutos', '🟠', '#f97316', 250, 12),
(5, 'rojo', 'Triaje Rojo', 'Emergencias vitales que requieren atención inmediata', '🔴', '#ef4444', 300, 15),
(6, 'gestion', 'Gestión de Crisis', 'Manejo de situaciones de alta demanda y recursos limitados', '🏥', '#8b5cf6', 400, 10);

-- Actualizar prerrequisitos de lecciones
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'fundamentos') WHERE codigo = 'verde_azul';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'verde_azul') WHERE codigo = 'amarillo';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'amarillo') WHERE codigo = 'naranja';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'naranja') WHERE codigo = 'rojo';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'rojo') WHERE codigo = 'gestion';

-- ============================================================================
-- DATOS INICIALES: Badges del sistema de gamificación
-- ============================================================================

INSERT INTO badges (codigo, nombre, descripcion, icono, color, criterio) VALUES
('primer_triaje', 'Primer Triaje', 'Completa tu primera evaluación de triaje', '🩺', '#3b82f6', '{"tipo": "ejercicios", "cantidad": 1}'),
('racha_3', 'Constancia', '3 días seguidos practicando', '🔥', '#f97316', '{"tipo": "racha", "dias": 3}'),
('racha_7', 'Dedicación', '7 días seguidos practicando', '🔥', '#ef4444', '{"tipo": "racha", "dias": 7}'),
('racha_30', 'Maestría', '30 días seguidos practicando', '🔥', '#fbbf24', '{"tipo": "racha", "dias": 30}'),
('perfecta_leccion', 'Lección Perfecta', 'Completa una lección sin ningún error', '⭐', '#fbbf24', '{"tipo": "leccion_perfecta"}'),
('nivel_verde', 'Verde Experto', 'Completa el nivel de Triaje Verde y Azul', '🟢', '#22c55e', '{"tipo": "leccion_completada", "leccion": "verde_azul"}'),
('nivel_amarillo', 'Amarillo Experto', 'Completa el nivel de Triaje Amarillo', '🟡', '#eab308', '{"tipo": "leccion_completada", "leccion": "amarillo"}'),
('nivel_naranja', 'Naranja Experto', 'Completa el nivel de Triaje Naranja', '🟠', '#f97316', '{"tipo": "leccion_completada", "leccion": "naranja"}'),
('nivel_rojo', 'Experto en Críticos', 'Completa el nivel de Triaje Rojo', '🔴', '#ef4444', '{"tipo": "leccion_completada", "leccion": "rojo"}'),
('maestro_triaje', 'Maestro del Triaje', 'Completa todos los niveles de triaje', '🏆', '#8b5cf6', '{"tipo": "todos_niveles"}'),
('xp_500', 'Aprendiz', 'Acumula 500 XP', '💎', '#06b6d4', '{"tipo": "xp", "cantidad": 500}'),
('xp_1000', 'Experto', 'Acumula 1000 XP', '💎', '#0891b2', '{"tipo": "xp", "cantidad": 1000}'),
('xp_5000', 'Leyenda', 'Acumula 5000 XP', '💎', '#0e7490', '{"tipo": "xp", "cantidad": 5000}'),
('velocista', 'Velocista', 'Responde correctamente en menos de 10 segundos', '⚡', '#eab308', '{"tipo": "tiempo", "segundos": 10}'),
('sin_errores_10', 'Racha Perfecta', '10 respuestas correctas seguidas', '🎯', '#10b981', '{"tipo": "racha_correctas", "cantidad": 10}');

-- ============================================================================
-- DATOS INICIALES: Casos clínicos para Nivel 1 - Fundamentos
-- ============================================================================

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Dolor torácico severo',
    'Paciente que acude por dolor torácico opresivo de inicio súbito',
    67, 'Mujer',
    'Dolor en el pecho que me aprieta desde hace 30 minutos',
    '["Dolor torácico opresivo irradiado a brazo izquierdo", "Sudoración profusa", "Náuseas", "Disnea"]'::jsonb,
    '{"pa": "90/60", "fc": 110, "sato2": 94, "temp": 36.8}'::jsonb,
    'HTA, DM tipo 2, fumadora',
    'rojo',
    'Cuadro clínico compatible con síndrome coronario agudo (SCA). El dolor torácico opresivo irradiado a brazo izquierdo, con cortejo vegetativo (sudoración, náuseas) y compromiso hemodinámico (hipotensión, taquicardia) requiere atención INMEDIATA. Triaje ROJO - riesgo vital.',
    15
FROM lessons WHERE codigo = 'fundamentos';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Resfriado común',
    'Paciente con síntomas catarrales de varios días de evolución',
    28, 'Varón',
    'Llevo 3 días con mocos y dolor de garganta',
    '["Rinorrea", "Odinofagia leve", "Tos seca ocasional", "Malestar general leve"]'::jsonb,
    '{"pa": "120/80", "fc": 72, "sato2": 99, "temp": 37.2}'::jsonb,
    'Sin antecedentes de interés',
    'azul',
    'Cuadro catarral sin signos de gravedad. Constantes normales, afebril, sin disnea ni otros signos de alarma. Puede esperar y ser atendido en consulta no urgente. Triaje AZUL - no urgente.',
    10
FROM lessons WHERE codigo = 'fundamentos';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Cefalea intensa',
    'Paciente con cefalea severa de inicio brusco',
    45, 'Varón',
    'Me ha dado el peor dolor de cabeza de mi vida, de repente',
    '["Cefalea súbita muy intensa (10/10)", "Rigidez de nuca", "Fotofobia", "Náuseas"]'::jsonb,
    '{"pa": "160/95", "fc": 88, "sato2": 98, "temp": 37.0}'::jsonb,
    'HTA mal controlada',
    'rojo',
    'Cefalea thunderclap (inicio súbito, máxima intensidad) con rigidez de nuca. Alta sospecha de hemorragia subaracnoidea (HSA). Requiere atención INMEDIATA y TAC craneal urgente. Triaje ROJO.',
    15
FROM lessons WHERE codigo = 'fundamentos';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Esguince de tobillo',
    'Paciente joven tras torcedura de tobillo jugando fútbol',
    22, 'Varón',
    'Me he torcido el tobillo hace 2 horas jugando al fútbol',
    '["Dolor en tobillo derecho", "Inflamación moderada", "Puede apoyar con molestias", "Sin deformidad visible"]'::jsonb,
    '{"pa": "125/75", "fc": 78, "sato2": 99, "temp": 36.5}'::jsonb,
    'Sin antecedentes',
    'verde',
    'Traumatismo de tobillo sin criterios de gravedad. Puede apoyar, sin deformidad, constantes normales. Puede esperar a ser atendido. Triaje VERDE - urgencia menor.',
    10
FROM lessons WHERE codigo = 'fundamentos';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Crisis asmática',
    'Paciente asmático con dificultad respiratoria progresiva',
    35, 'Mujer',
    'No puedo respirar bien, el inhalador no me hace efecto',
    '["Disnea moderada-severa", "Sibilancias audibles", "Uso de musculatura accesoria", "Dificultad para hablar frases completas"]'::jsonb,
    '{"pa": "130/85", "fc": 105, "sato2": 91, "temp": 36.6}'::jsonb,
    'Asma bronquial desde la infancia, varios ingresos previos',
    'naranja',
    'Crisis asmática moderada-severa. Saturación baja (91%), uso de musculatura accesoria, dificultad para hablar. Requiere atención en menos de 10 minutos para iniciar broncodilatadores y valorar respuesta. Triaje NARANJA.',
    12
FROM lessons WHERE codigo = 'fundamentos';

-- ============================================================================
-- DATOS INICIALES: Casos clínicos para Nivel 2 - Verde y Azul
-- ============================================================================

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Dolor lumbar crónico',
    'Paciente con dolor de espalda de larga evolución',
    55, 'Varón',
    'Me duele la espalda baja desde hace meses, hoy está peor',
    '["Lumbalgia mecánica", "Sin irradiación a piernas", "Movilidad conservada", "Sin pérdida de fuerza"]'::jsonb,
    '{"pa": "135/85", "fc": 76, "sato2": 98, "temp": 36.4}'::jsonb,
    'Lumbalgia crónica, obesidad',
    'verde',
    'Lumbalgia mecánica sin signos de alarma (no hay irradiación, no pérdida de fuerza, no síndrome de cola de caballo). Puede esperar. Triaje VERDE.',
    10
FROM lessons WHERE codigo = 'verde_azul';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Conjuntivitis',
    'Paciente con ojo rojo de 2 días de evolución',
    30, 'Mujer',
    'Tengo el ojo rojo y me pica mucho desde ayer',
    '["Ojo rojo bilateral", "Picor intenso", "Secreción acuosa", "Sin dolor", "Sin alteración visual"]'::jsonb,
    '{"pa": "118/72", "fc": 68, "sato2": 99, "temp": 36.3}'::jsonb,
    'Alergia primaveral',
    'azul',
    'Conjuntivitis probablemente alérgica. Sin signos de gravedad (dolor intenso, alteración visual, fotofobia intensa). Puede ser atendida en consulta no urgente. Triaje AZUL.',
    10
FROM lessons WHERE codigo = 'verde_azul';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Gastroenteritis leve',
    'Paciente con diarrea y vómitos de 24 horas',
    40, 'Varón',
    'Llevo desde ayer con diarrea y he vomitado 2 veces',
    '["Diarrea acuosa (4-5 deposiciones)", "2 vómitos", "Dolor abdominal tipo cólico", "Tolera líquidos", "Sin fiebre alta"]'::jsonb,
    '{"pa": "115/70", "fc": 82, "sato2": 99, "temp": 37.4}'::jsonb,
    'Sin antecedentes',
    'verde',
    'Gastroenteritis aguda leve. Tolera líquidos, sin signos de deshidratación severa, afebril o febrícula. Puede esperar. Triaje VERDE.',
    10
FROM lessons WHERE codigo = 'verde_azul';

-- ============================================================================
-- DATOS INICIALES: Casos clínicos para Nivel 3 - Amarillo
-- ============================================================================

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Dolor abdominal moderado',
    'Paciente con dolor en fosa ilíaca derecha',
    25, 'Mujer',
    'Me duele mucho aquí abajo a la derecha desde anoche',
    '["Dolor en FID", "Náuseas sin vómitos", "Anorexia", "Febrícula"]'::jsonb,
    '{"pa": "120/75", "fc": 88, "sato2": 99, "temp": 37.8}'::jsonb,
    'Última regla hace 2 semanas, normal',
    'amarillo',
    'Dolor en fosa ilíaca derecha con febrícula y anorexia. Hay que descartar apendicitis aguda. No hay signos de shock ni peritonitis generalizada. Requiere evaluación en 60 minutos. Triaje AMARILLO.',
    12
FROM lessons WHERE codigo = 'amarillo';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Fiebre alta',
    'Paciente con fiebre elevada sin foco claro',
    60, 'Varón',
    'Tengo fiebre de 39°C desde hace 2 días',
    '["Fiebre persistente 39°C", "Malestar general", "Mialgias", "Sin tos ni disnea", "Sin focalidad urinaria"]'::jsonb,
    '{"pa": "125/80", "fc": 95, "sato2": 97, "temp": 39.2}'::jsonb,
    'DM tipo 2, HTA',
    'amarillo',
    'Fiebre elevada en paciente con comorbilidades (diabético). Sin foco claro y sin signos de sepsis grave. Requiere evaluación para descartar infección y estudio. Triaje AMARILLO - 60 minutos.',
    12
FROM lessons WHERE codigo = 'amarillo';

-- ============================================================================
-- DATOS INICIALES: Casos clínicos para Nivel 4 - Naranja
-- ============================================================================

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Dolor torácico atípico',
    'Paciente con dolor torácico y antecedentes cardíacos',
    58, 'Varón',
    'Me duele el pecho desde hace 1 hora, como una presión',
    '["Dolor torácico opresivo central", "Sin irradiación clara", "Sin sudoración", "Leve disnea"]'::jsonb,
    '{"pa": "145/90", "fc": 85, "sato2": 96, "temp": 36.6}'::jsonb,
    'Infarto previo hace 3 años, stent coronario, HTA, dislipemia',
    'naranja',
    'Dolor torácico en paciente con cardiopatía isquémica previa. Aunque no es un cuadro típico de SCA, los antecedentes obligan a descartar nuevo evento coronario urgentemente. Triaje NARANJA - 10 minutos para ECG.',
    12
FROM lessons WHERE codigo = 'naranja';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Reacción alérgica',
    'Paciente con urticaria generalizada tras comer marisco',
    35, 'Mujer',
    'Me han salido ronchas por todo el cuerpo y me pica mucho',
    '["Urticaria generalizada", "Prurito intenso", "Sin disnea", "Sin edema facial ni lingual", "Sin disfagia"]'::jsonb,
    '{"pa": "110/70", "fc": 92, "sato2": 99, "temp": 36.5}'::jsonb,
    'Alergia conocida a mariscos (primera reacción sistémica)',
    'naranja',
    'Reacción alérgica sistémica. Aunque no hay signos de anafilaxia (sin compromiso respiratorio ni shock), la urticaria generalizada puede progresar. Requiere valoración en 10 minutos e inicio de antihistamínicos/corticoides. Triaje NARANJA.',
    12
FROM lessons WHERE codigo = 'naranja';

-- ============================================================================
-- DATOS INICIALES: Casos clínicos para Nivel 5 - Rojo
-- ============================================================================

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Shock anafiláctico',
    'Paciente con reacción alérgica severa tras picadura de abeja',
    42, 'Varón',
    'Me ha picado una abeja y no puedo respirar',
    '["Disnea severa", "Estridor laríngeo", "Urticaria generalizada", "Edema facial y lingual", "Mareo intenso"]'::jsonb,
    '{"pa": "80/50", "fc": 125, "sato2": 88, "temp": 36.8}'::jsonb,
    'Alergia a himenópteros conocida',
    'rojo',
    'ANAFILAXIA con compromiso respiratorio (estridor, disnea severa, desaturación) y hemodinámico (hipotensión, taquicardia). Riesgo vital inminente. Requiere adrenalina IM INMEDIATA. Triaje ROJO.',
    15
FROM lessons WHERE codigo = 'rojo';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'ACV - Ictus',
    'Paciente con déficit neurológico brusco',
    72, 'Mujer',
    'La familia: "De repente ha dejado de hablar y no mueve el brazo"',
    '["Afasia de expresión", "Hemiparesia derecha", "Desviación de comisura bucal", "Inicio hace 45 minutos"]'::jsonb,
    '{"pa": "180/100", "fc": 88, "sato2": 96, "temp": 36.5}'::jsonb,
    'FA en anticoagulación, HTA',
    'rojo',
    'Ictus isquémico en ventana terapéutica (<4.5h). Los déficits neurológicos focales de inicio brusco requieren activación inmediata del CÓDIGO ICTUS. Cada minuto cuenta. Triaje ROJO.',
    15
FROM lessons WHERE codigo = 'rojo';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT 
    lesson_id,
    'Parada cardiorrespiratoria',
    'Paciente encontrado inconsciente',
    65, 'Varón',
    'Traído por SVB: encontrado en la calle inconsciente',
    '["Inconsciente", "No respira", "Sin pulso palpable", "RCP en curso por SVB"]'::jsonb,
    '{"pa": "0/0", "fc": 0, "sato2": 0, "temp": null}'::jsonb,
    'Desconocidos (paciente no identificado)',
    'rojo',
    'PARADA CARDIORRESPIRATORIA. Máxima prioridad. Continuar RCP, desfibrilador, acceso IV, adrenalina según protocolo. Box de reanimación inmediato. Triaje ROJO - INMEDIATO.',
    15
FROM lessons WHERE codigo = 'rojo';

-- ============================================================================
-- CURSO 2: RCP Y SOPORTE VITAL (ACLS/BLS/PALS)
-- ============================================================================

INSERT INTO lessons (orden, codigo, nombre, descripcion, icono, color, xp_recompensa, ejercicios_requeridos, curso) VALUES
(7, 'rcp_fundamentos', 'Fundamentos de RCP', 'Soporte vital básico: cadena de supervivencia, compresiones, ventilación', '❤️', '#ef4444', 120, 8, 'rcp'),
(8, 'rcp_adulto', 'RCP en Adultos (BLS)', 'Algoritmo de soporte vital básico en adultos', '🫀', '#dc2626', 150, 10, 'rcp'),
(9, 'rcp_acls', 'ACLS - Soporte Vital Avanzado', 'Ritmos desfibrilables, drogas, vía aérea avanzada', '⚡', '#b91c1c', 200, 12, 'rcp'),
(10, 'rcp_pals', 'RCP Pediátrica (PALS)', 'Particularidades del soporte vital en niños', '👶', '#f87171', 180, 10, 'rcp');

-- Prerrequisitos curso RCP
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'rcp_fundamentos') WHERE codigo = 'rcp_adulto';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'rcp_adulto') WHERE codigo = 'rcp_acls';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'rcp_acls') WHERE codigo = 'rcp_pals';

-- Casos clínicos: RCP Fundamentos
INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Parada presenciada en centro comercial', 'Varón que colapsa súbitamente mientras caminaba', 58, 'Varón',
    'Caída súbita, testigos llaman al 112',
    '["Inconsciente", "No responde a estímulos", "No respira", "Cianosis perioral"]'::jsonb,
    '{"pa": "0/0", "fc": 0, "sato2": 0, "temp": null}'::jsonb,
    'Desconocidos', 'rojo',
    'PARADA CARDIORRESPIRATORIA presenciada. Activar cadena de supervivencia: 1) Reconocer PCR, 2) Llamar 112, 3) Iniciar RCP 30:2, 4) Usar DEA cuando llegue. Compresiones de calidad: 100-120/min, 5-6cm profundidad.',
    15
FROM lessons WHERE codigo = 'rcp_fundamentos';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Atragantamiento severo', 'Persona atragantada en restaurante, no puede hablar ni toser', 45, 'Mujer',
    'Se atraganta con comida, hace señal universal de asfixia',
    '["No puede hablar", "No puede toser", "Cianosis progresiva", "Señal de manos al cuello"]'::jsonb,
    '{"pa": "100/60", "fc": 120, "sato2": 70, "temp": 36.5}'::jsonb,
    'Sin antecedentes relevantes', 'rojo',
    'OBSTRUCCIÓN COMPLETA de vía aérea (OVACE). Algoritmo: 5 golpes interescapulares + 5 compresiones abdominales (Heimlich). Si inconsciente: RCP. Prioridad absoluta - riesgo de muerte en minutos.',
    15
FROM lessons WHERE codigo = 'rcp_fundamentos';

-- Casos clínicos: ACLS
INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Fibrilación ventricular', 'PCR con monitor que muestra FV', 62, 'Varón',
    'PCR en box de urgencias durante observación',
    '["Inconsciente", "Sin pulso", "FV en monitor", "RCP iniciada"]'::jsonb,
    '{"pa": "0/0", "fc": 0, "sato2": 0, "temp": null}'::jsonb,
    'Cardiopatía isquémica, IAM previo', 'rojo',
    'FV = RITMO DESFIBRILABLE. Protocolo ACLS: 1) Descarga 200J bifásico, 2) RCP 2 min, 3) Adrenalina 1mg IV cada 3-5min, 4) Amiodarona 300mg tras 3ª descarga. Continuar hasta RCE o criterios de cese.',
    18
FROM lessons WHERE codigo = 'rcp_acls';

-- ============================================================================
-- CURSO 3: URGENCIAS PEDIÁTRICAS
-- ============================================================================

INSERT INTO lessons (orden, codigo, nombre, descripcion, icono, color, xp_recompensa, ejercicios_requeridos, curso) VALUES
(11, 'ped_evaluacion', 'Triángulo de Evaluación Pediátrica', 'Apariencia, Respiración, Circulación - evaluación rápida', '👶', '#ec4899', 130, 8, 'pediatria'),
(12, 'ped_respiratorio', 'Urgencias Respiratorias Pediátricas', 'Bronquiolitis, crup, asma, neumonía en niños', '🫁', '#f472b6', 160, 10, 'pediatria'),
(13, 'ped_fiebre', 'Fiebre y Sepsis Pediátrica', 'Manejo de fiebre sin foco, signos de sepsis', '🌡️', '#db2777', 180, 10, 'pediatria');

UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'ped_evaluacion') WHERE codigo = 'ped_respiratorio';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'ped_respiratorio') WHERE codigo = 'ped_fiebre';

-- Casos clínicos: Pediatría
INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Lactante con dificultad respiratoria', 'Bebé de 4 meses con tos y dificultad para respirar', 0, 'Varón',
    'Mi bebé respira muy rápido y no quiere comer',
    '["Taquipnea (FR 65)", "Tiraje subcostal e intercostal", "Aleteo nasal", "Rechazo de tomas", "Sibilancias espiratorias"]'::jsonb,
    '{"pa": "75/45", "fc": 160, "sato2": 90, "temp": 37.8}'::jsonb,
    'Prematuro 34 semanas, hermano con catarro', 'naranja',
    'BRONQUIOLITIS con signos de dificultad respiratoria moderada. TEP: Trabajo respiratorio aumentado. Requiere oxigenoterapia, monitorización, valorar suero y nebulización. Triaje NARANJA.',
    14
FROM lessons WHERE codigo = 'ped_respiratorio';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Niño con estridor inspiratorio', 'Niño de 2 años con tos perruna y ruido al respirar', 2, 'Varón',
    'Tiene tos muy rara como de perro y hace ruido al respirar',
    '["Estridor inspiratorio", "Tos perruna", "Disfonía leve", "No babeo ni disfagia", "Consciente y reactivo"]'::jsonb,
    '{"pa": "90/55", "fc": 130, "sato2": 96, "temp": 38.2}'::jsonb,
    'Catarro UVA hace 2 días', 'amarillo',
    'LARINGOTRAQUEÍTIS (CRUP) leve-moderado. Score de Westley. Dexametasona 0.6mg/kg VO/IM. Si estridor en reposo: adrenalina nebulizada + observación 3-4h. Triaje AMARILLO.',
    12
FROM lessons WHERE codigo = 'ped_respiratorio';

-- ============================================================================
-- CURSO 4: FARMACOLOGÍA DE URGENCIAS
-- ============================================================================

INSERT INTO lessons (orden, codigo, nombre, descripcion, icono, color, xp_recompensa, ejercicios_requeridos, curso) VALUES
(14, 'farma_rcp', 'Fármacos de RCP', 'Adrenalina, amiodarona, atropina, bicarbonato', '💉', '#14b8a6', 140, 8, 'farmacologia'),
(15, 'farma_sedacion', 'Sedoanalgesia en Urgencias', 'Opioides, benzodiacepinas, ketamina, propofol', '💊', '#0d9488', 160, 10, 'farmacologia'),
(16, 'farma_vasoactivos', 'Drogas Vasoactivas', 'Noradrenalina, dopamina, dobutamina - indicaciones y dosis', '🩸', '#0f766e', 180, 10, 'farmacologia');

UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'farma_rcp') WHERE codigo = 'farma_sedacion';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'farma_sedacion') WHERE codigo = 'farma_vasoactivos';

-- Casos clínicos: Farmacología
INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Shock séptico refractario', 'Paciente en shock séptico sin respuesta a fluidos', 72, 'Mujer',
    'Hipotensión persistente tras 2L de cristaloides',
    '["Hipotensión refractaria", "Oliguria", "Lactato 6mmol/L", "Foco urinario", "Fiebre 39°C"]'::jsonb,
    '{"pa": "70/40", "fc": 115, "sato2": 94, "temp": 39.2}'::jsonb,
    'DM2, ITUs de repetición', 'rojo',
    'SHOCK SÉPTICO con necesidad de NORADRENALINA. Dosis: 0.05-0.5 mcg/kg/min en bomba. Objetivo PAM ≥65mmHg. Si disfunción cardíaca asociada: añadir dobutamina. Acceso venoso central preferible.',
    16
FROM lessons WHERE codigo = 'farma_vasoactivos';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Sedación para cardioversión', 'Paciente requiere cardioversión eléctrica sincronizada', 55, 'Varón',
    'FA rápida inestable, se decide cardioversión',
    '["FA 170lpm", "Mareo", "Hipotensión leve", "Consciente orientado"]'::jsonb,
    '{"pa": "95/60", "fc": 168, "sato2": 97, "temp": 36.6}'::jsonb,
    'FA paroxística conocida', 'naranja',
    'Sedación breve para CVE: PROPOFOL 1mg/kg IV o MIDAZOLAM 0.05-0.1mg/kg + FENTANILO 1mcg/kg. Monitorización continua, material de VAD preparado. Siempre con médico y enfermera presentes.',
    14
FROM lessons WHERE codigo = 'farma_sedacion';

-- ============================================================================
-- CURSO 5: TRAUMA Y POLITRAUMATISMO
-- ============================================================================

INSERT INTO lessons (orden, codigo, nombre, descripcion, icono, color, xp_recompensa, ejercicios_requeridos, curso) VALUES
(17, 'trauma_abcde', 'Valoración Primaria ABCDE', 'Vía aérea, respiración, circulación, neurológico, exposición', '🚑', '#f97316', 150, 10, 'trauma'),
(18, 'trauma_tce', 'Traumatismo Craneoencefálico', 'Escala Glasgow, signos de alarma, manejo inicial', '🧠', '#ea580c', 170, 10, 'trauma'),
(19, 'trauma_torax', 'Trauma Torácico', 'Neumotórax, hemotórax, contusión pulmonar', '🫁', '#c2410c', 180, 12, 'trauma'),
(20, 'trauma_abdominal', 'Trauma Abdominal', 'Lesiones de órganos sólidos y víscera hueca', '💢', '#9a3412', 180, 10, 'trauma');

UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'trauma_abcde') WHERE codigo = 'trauma_tce';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'trauma_tce') WHERE codigo = 'trauma_torax';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'trauma_torax') WHERE codigo = 'trauma_abdominal';

-- Casos clínicos: Trauma
INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Accidente de moto alta velocidad', 'Motorista 80km/h impacta contra vehículo', 28, 'Varón',
    'Accidente de moto, casco puesto, eyectado',
    '["Pérdida de consciencia inicial", "Dolor torácico derecho", "Dolor abdominal", "Herida en pierna derecha"]'::jsonb,
    '{"pa": "100/65", "fc": 110, "sato2": 94, "temp": 36.2}'::jsonb,
    'Sin antecedentes conocidos', 'rojo',
    'POLITRAUMATIZADO. Criterios de trauma grave (alta energía, eyectado). ABCDE: Inmovilización cervical, 2 vías gruesas, analítica+pruebas cruzadas, eFAST, TAC body. Activar código trauma.',
    18
FROM lessons WHERE codigo = 'trauma_abcde';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Caída de altura con TCE', 'Obrero cae de andamio 4 metros', 45, 'Varón',
    'Caída de 4 metros, golpe en cabeza',
    '["GCS 12 (O3V4M5)", "Herida scalp sangrante", "Vómitos", "Amnesia del accidente", "Pupilas isocóricas reactivas"]'::jsonb,
    '{"pa": "150/90", "fc": 65, "sato2": 98, "temp": 36.5}'::jsonb,
    'Sin antecedentes', 'naranja',
    'TCE MODERADO (GCS 9-13). Criterios de TAC urgente: pérdida consciencia, amnesia, vómitos. Vigilar: respuesta pupilar, deterioro GCS, signos de herniación. Cabecero 30°, normocapnia, evitar hipotensión.',
    15
FROM lessons WHERE codigo = 'trauma_tce';

-- ============================================================================
-- CURSO 6: ECG EN URGENCIAS
-- ============================================================================

INSERT INTO lessons (orden, codigo, nombre, descripcion, icono, color, xp_recompensa, ejercicios_requeridos, curso) VALUES
(21, 'ecg_basico', 'Interpretación ECG Básica', 'Ritmo, frecuencia, eje, intervalos', '📈', '#06b6d4', 130, 8, 'ecg'),
(22, 'ecg_arritmias', 'Arritmias Frecuentes', 'FA, flutter, TSV, bradicardias, bloqueos', '💓', '#0891b2', 160, 10, 'ecg'),
(23, 'ecg_isquemia', 'ECG en Síndrome Coronario', 'SCACEST, SCASEST, patrones de IAM', '❤️‍🔥', '#0e7490', 180, 12, 'ecg');

UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'ecg_basico') WHERE codigo = 'ecg_arritmias';
UPDATE lessons SET lesson_prerequisito = (SELECT lesson_id FROM lessons WHERE codigo = 'ecg_arritmias') WHERE codigo = 'ecg_isquemia';

-- Casos clínicos: ECG
INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'Palpitaciones con FA rápida', 'Paciente con palpitaciones irregulares de inicio súbito', 68, 'Mujer',
    'Noto el corazón muy rápido e irregular desde hace 3 horas',
    '["Palpitaciones irregulares", "Disnea de esfuerzo", "Mareo leve", "Sin dolor torácico"]'::jsonb,
    '{"pa": "125/80", "fc": 142, "sato2": 97, "temp": 36.5}'::jsonb,
    'HTA, hipertiroidismo', 'amarillo',
    'FA de reciente comienzo con respuesta ventricular rápida. ECG: ritmo irregular, sin ondas P, intervalos RR variables. Control de frecuencia con betabloqueantes o diltiazem. Valorar anticoagulación (CHA2DS2-VASc).',
    14
FROM lessons WHERE codigo = 'ecg_arritmias';

INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base)
SELECT lesson_id, 'IAMCEST anterior', 'Paciente con dolor torácico y elevación ST en precordiales', 55, 'Varón',
    'Dolor fuerte en el pecho que me baja al brazo',
    '["Dolor torácico opresivo 9/10", "Irradiación a brazo izquierdo", "Sudoración profusa", "Náuseas"]'::jsonb,
    '{"pa": "110/70", "fc": 85, "sato2": 96, "temp": 36.5}'::jsonb,
    'Fumador, dislipemia', 'rojo',
    'IAMCEST ANTERIOR. ECG: elevación ST >2mm en V1-V4 (cara anterior). Tiempo es miocardio. Activar Código Infarto, AAS 300mg, clopidogrel 600mg, heparina, nitroglicerina si persiste dolor. ICP primaria <90 min.',
    18
FROM lessons WHERE codigo = 'ecg_isquemia';

-- ============================================================================
-- FIN
-- ============================================================================

