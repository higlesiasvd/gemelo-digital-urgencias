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
-- FIN
-- ============================================================================
