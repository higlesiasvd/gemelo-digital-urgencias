#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE MIGRACIONES - Base de Datos de Personal Sanitario
# Gemelo Digital Hospitalario - Hospitales A Coruña
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Configuración
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-urgencias_db}"
DB_USER="${DB_USER:-urgencias}"
DB_PASS="${DB_PASS:-urgencias_pass}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   MIGRACIONES - Gemelo Digital Hospitalario (A Coruña)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar conexión
echo -e "${BLUE}[1/4] Verificando conexión a PostgreSQL...${NC}"
if ! docker exec urgencias-postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; then
    echo -e "${RED}Error: No se puede conectar a PostgreSQL${NC}"
    echo "Asegúrate de que el contenedor urgencias-postgres está corriendo"
    exit 1
fi
echo -e "${GREEN}  ✓ Conexión establecida${NC}"
echo ""

# Limpiar datos existentes
echo -e "${BLUE}[2/4] Limpiando datos existentes...${NC}"
docker exec -i urgencias-postgres psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
DELETE FROM solicitud_personal;
DELETE FROM solicitudes_refuerzo;
DELETE FROM eventos_prediccion;
DELETE FROM disponibilidades;
DELETE FROM turnos;
DELETE FROM personal;
EOF
echo -e "${GREEN}  ✓ Datos limpiados${NC}"
echo ""

# Insertar personal
echo -e "${BLUE}[3/4] Insertando personal sanitario...${NC}"

docker exec -i urgencias-postgres psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONAL - CHUAC (Complexo Hospitalario Universitario A Coruña)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, especialidad, hospital_id, unidad, fecha_alta, activo, acepta_refuerzos, horas_semanales_contrato, created_at, updated_at)
VALUES
-- Médicos CHUAC
(gen_random_uuid(), 'CHUAC-M001', 'María', 'García López', '12345678A', 'maria.garcia@sergas.es', '600111001', 'MEDICO', 'Urgencias', 'chuac', 'Urgencias Generales', '2018-03-15', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-M002', 'Carlos', 'Fernández Rodríguez', '12345678B', 'carlos.fernandez@sergas.es', '600111002', 'MEDICO', 'Urgencias', 'chuac', 'Urgencias Generales', '2019-06-01', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-M003', 'Ana', 'Martínez Sánchez', '12345678C', 'ana.martinez@sergas.es', '600111003', 'MEDICO', 'Cardiología', 'chuac', 'UCI Cardiológica', '2017-09-20', true, false, 40, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-M004', 'Pedro', 'López Pérez', '12345678D', 'pedro.lopez@sergas.es', '600111004', 'MEDICO', 'Traumatología', 'chuac', 'Urgencias Trauma', '2020-01-10', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-M005', 'Elena', 'Rodríguez Gómez', '12345678E', 'elena.rodriguez@sergas.es', '600111005', 'MEDICO', 'Pediatría', 'chuac', 'Urgencias Pediátricas', '2016-05-22', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-M006', 'Javier', 'Sánchez Díaz', '12345678F', 'javier.sanchez@sergas.es', '600111006', 'MEDICO', 'Medicina Interna', 'chuac', 'Urgencias Generales', '2021-02-14', true, true, 40, NOW(), NOW()),
-- Enfermeros CHUAC
(gen_random_uuid(), 'CHUAC-E001', 'Laura', 'González Vázquez', '23456789A', 'laura.gonzalez@sergas.es', '600222001', 'ENFERMERO', 'Urgencias', 'chuac', 'Urgencias Generales', '2019-04-01', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E002', 'Miguel', 'Díaz Castro', '23456789B', 'miguel.diaz@sergas.es', '600222002', 'ENFERMERO', 'Urgencias', 'chuac', 'Urgencias Generales', '2018-11-15', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E003', 'Carmen', 'Pérez Blanco', '23456789C', 'carmen.perez@sergas.es', '600222003', 'ENFERMERO', 'UCI', 'chuac', 'UCI General', '2017-07-20', true, false, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E004', 'David', 'Vázquez Fernández', '23456789D', 'david.vazquez@sergas.es', '600222004', 'ENFERMERO', 'Urgencias', 'chuac', 'Urgencias Trauma', '2020-03-01', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E005', 'Lucía', 'Castro Iglesias', '23456789E', 'lucia.castro@sergas.es', '600222005', 'ENFERMERO', 'Pediatría', 'chuac', 'Urgencias Pediátricas', '2019-08-10', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E006', 'Pablo', 'Iglesias Otero', '23456789F', 'pablo.iglesias@sergas.es', '600222006', 'ENFERMERO', 'Urgencias', 'chuac', 'Urgencias Generales', '2021-01-05', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E007', 'Marta', 'Otero Rial', '23456789G', 'marta.otero@sergas.es', '600222007', 'ENFERMERO', 'Urgencias', 'chuac', 'Urgencias Generales', '2018-05-20', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-E008', 'Andrés', 'Rial López', '23456789H', 'andres.rial@sergas.es', '600222008', 'ENFERMERO', 'Cardiología', 'chuac', 'UCI Cardiológica', '2016-12-01', true, false, 37, NOW(), NOW()),
-- Auxiliares CHUAC
(gen_random_uuid(), 'CHUAC-A001', 'Rosa', 'Blanco Paz', '34567890A', 'rosa.blanco@sergas.es', '600333001', 'AUXILIAR', NULL, 'chuac', 'Urgencias Generales', '2017-02-28', true, true, 35, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-A002', 'Manuel', 'Paz Souto', '34567890B', 'manuel.paz@sergas.es', '600333002', 'AUXILIAR', NULL, 'chuac', 'Urgencias Generales', '2019-09-15', true, true, 35, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-A003', 'Teresa', 'Souto Varela', '34567890C', 'teresa.souto@sergas.es', '600333003', 'AUXILIAR', NULL, 'chuac', 'UCI General', '2018-06-10', true, false, 35, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-A004', 'Francisco', 'Varela Ramos', '34567890D', 'francisco.varela@sergas.es', '600333004', 'AUXILIAR', NULL, 'chuac', 'Urgencias Pediátricas', '2020-04-20', true, true, 35, NOW(), NOW()),
-- Celadores CHUAC
(gen_random_uuid(), 'CHUAC-C001', 'Antonio', 'Ramos Doval', '45678901A', 'antonio.ramos@sergas.es', '600444001', 'CELADOR', NULL, 'chuac', 'Urgencias', '2015-10-01', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'CHUAC-C002', 'Pilar', 'Doval Suárez', '45678901B', 'pilar.doval@sergas.es', '600444002', 'CELADOR', NULL, 'chuac', 'Urgencias', '2018-03-15', true, true, 40, NOW(), NOW());

-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONAL - HM MODELO (Hospital HM Modelo - A Coruña)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, especialidad, hospital_id, unidad, fecha_alta, activo, acepta_refuerzos, horas_semanales_contrato, created_at, updated_at)
VALUES
-- Médicos Modelo
(gen_random_uuid(), 'MOD-M001', 'Álvaro', 'Suárez Neira', '56789012A', 'alvaro.suarez@hmhospitales.com', '600555001', 'MEDICO', 'Urgencias', 'modelo', 'Urgencias Generales', '2017-04-10', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'MOD-M002', 'Beatriz', 'Neira Casal', '56789012B', 'beatriz.neira@hmhospitales.com', '600555002', 'MEDICO', 'Urgencias', 'modelo', 'Urgencias Generales', '2019-08-01', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'MOD-M003', 'Roberto', 'Casal Freire', '56789012C', 'roberto.casal@hmhospitales.com', '600555003', 'MEDICO', 'Cardiología', 'modelo', 'Cardiología', '2018-01-15', true, false, 40, NOW(), NOW()),
(gen_random_uuid(), 'MOD-M004', 'Cristina', 'Freire Pena', '56789012D', 'cristina.freire@hmhospitales.com', '600555004', 'MEDICO', 'Traumatología', 'modelo', 'Traumatología', '2020-06-20', true, true, 40, NOW(), NOW()),
-- Enfermeros Modelo
(gen_random_uuid(), 'MOD-E001', 'Óscar', 'Pena Lema', '67890123A', 'oscar.pena@hmhospitales.com', '600666001', 'ENFERMERO', 'Urgencias', 'modelo', 'Urgencias Generales', '2018-02-28', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'MOD-E002', 'Silvia', 'Lema Caamaño', '67890123B', 'silvia.lema@hmhospitales.com', '600666002', 'ENFERMERO', 'Urgencias', 'modelo', 'Urgencias Generales', '2019-05-10', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'MOD-E003', 'Rubén', 'Caamaño Soto', '67890123C', 'ruben.caamano@hmhospitales.com', '600666003', 'ENFERMERO', 'UCI', 'modelo', 'UCI', '2016-09-01', true, false, 37, NOW(), NOW()),
(gen_random_uuid(), 'MOD-E004', 'Nuria', 'Soto Barreiro', '67890123D', 'nuria.soto@hmhospitales.com', '600666004', 'ENFERMERO', 'Urgencias', 'modelo', 'Urgencias Generales', '2020-11-15', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'MOD-E005', 'Iván', 'Barreiro Mouriño', '67890123E', 'ivan.barreiro@hmhospitales.com', '600666005', 'ENFERMERO', 'Cardiología', 'modelo', 'Cardiología', '2017-07-20', true, true, 37, NOW(), NOW()),
-- Auxiliares Modelo
(gen_random_uuid(), 'MOD-A001', 'Susana', 'Mouriño Piñeiro', '78901234A', 'susana.mourino@hmhospitales.com', '600777001', 'AUXILIAR', NULL, 'modelo', 'Urgencias Generales', '2018-10-05', true, true, 35, NOW(), NOW()),
(gen_random_uuid(), 'MOD-A002', 'Héctor', 'Piñeiro Vilar', '78901234B', 'hector.pineiro@hmhospitales.com', '600777002', 'AUXILIAR', NULL, 'modelo', 'Planta', '2019-03-20', true, true, 35, NOW(), NOW()),
-- Celadores Modelo
(gen_random_uuid(), 'MOD-C001', 'Lorena', 'Vilar Romero', '89012345A', 'lorena.vilar@hmhospitales.com', '600888001', 'CELADOR', NULL, 'modelo', 'Urgencias', '2016-11-10', true, true, 40, NOW(), NOW());

-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONAL - HOSPITAL SAN RAFAEL (A Coruña)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO personal (id, numero_empleado, nombre, apellidos, dni, email, telefono, rol, especialidad, hospital_id, unidad, fecha_alta, activo, acepta_refuerzos, horas_semanales_contrato, created_at, updated_at)
VALUES
-- Médicos San Rafael
(gen_random_uuid(), 'SRF-M001', 'Daniel', 'Romero Carballo', '90123456A', 'daniel.romero@sanrafael.es', '600999001', 'MEDICO', 'Urgencias', 'san_rafael', 'Urgencias', '2018-05-15', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'SRF-M002', 'Patricia', 'Carballo Seoane', '90123456B', 'patricia.carballo@sanrafael.es', '600999002', 'MEDICO', 'Medicina Interna', 'san_rafael', 'Medicina Interna', '2019-10-01', true, true, 40, NOW(), NOW()),
(gen_random_uuid(), 'SRF-M003', 'Marcos', 'Seoane Lago', '90123456C', 'marcos.seoane@sanrafael.es', '600999003', 'MEDICO', 'Geriatría', 'san_rafael', 'Geriatría', '2017-02-20', true, false, 40, NOW(), NOW()),
-- Enfermeros San Rafael
(gen_random_uuid(), 'SRF-E001', 'Raquel', 'Lago Figueiras', '01234567A', 'raquel.lago@sanrafael.es', '601000001', 'ENFERMERO', 'Urgencias', 'san_rafael', 'Urgencias', '2018-08-10', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'SRF-E002', 'Sergio', 'Figueiras Conde', '01234567B', 'sergio.figueiras@sanrafael.es', '601000002', 'ENFERMERO', 'Geriatría', 'san_rafael', 'Geriatría', '2019-12-01', true, true, 37, NOW(), NOW()),
(gen_random_uuid(), 'SRF-E003', 'Alicia', 'Conde Rey', '01234567C', 'alicia.conde@sanrafael.es', '601000003', 'ENFERMERO', 'Medicina Interna', 'san_rafael', 'Medicina Interna', '2016-04-15', true, false, 37, NOW(), NOW()),
(gen_random_uuid(), 'SRF-E004', 'Diego', 'Rey Insua', '01234567D', 'diego.rey@sanrafael.es', '601000004', 'ENFERMERO', 'Urgencias', 'san_rafael', 'Urgencias', '2020-07-20', true, true, 37, NOW(), NOW()),
-- Auxiliares San Rafael
(gen_random_uuid(), 'SRF-A001', 'Sandra', 'Insua Porto', '11234567A', 'sandra.insua@sanrafael.es', '601111001', 'AUXILIAR', NULL, 'san_rafael', 'Urgencias', '2017-09-05', true, true, 35, NOW(), NOW()),
(gen_random_uuid(), 'SRF-A002', 'Adrián', 'Porto Vidal', '11234567B', 'adrian.porto@sanrafael.es', '601111002', 'AUXILIAR', NULL, 'san_rafael', 'Planta', '2019-01-15', true, true, 35, NOW(), NOW()),
-- Celadores San Rafael
(gen_random_uuid(), 'SRF-C001', 'Eva', 'Vidal Gómez', '21234567A', 'eva.vidal@sanrafael.es', '601222001', 'CELADOR', NULL, 'san_rafael', 'Urgencias', '2018-11-20', true, true, 40, NOW(), NOW());
EOF

echo -e "${GREEN}  ✓ Personal insertado (42 empleados en 3 hospitales)${NC}"
echo ""

# Insertar turnos para hoy
echo -e "${BLUE}[4/4] Generando turnos para hoy...${NC}"

docker exec -i urgencias-postgres psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Turnos de mañana (08:00 - 15:00)
INSERT INTO turnos (id, personal_id, hospital_id, fecha, tipo_turno, hora_inicio, hora_fin, es_refuerzo, confirmado, created_at, updated_at)
SELECT gen_random_uuid(), p.id, p.hospital_id, CURRENT_DATE, 'MANANA', '08:00:00'::time, '15:00:00'::time, false, true, NOW(), NOW()
FROM personal p WHERE p.numero_empleado IN (
  'CHUAC-M001', 'CHUAC-M002', 'CHUAC-E001', 'CHUAC-E002', 'CHUAC-A001', 'CHUAC-C001',
  'MOD-M001', 'MOD-E001', 'MOD-A001',
  'SRF-M001', 'SRF-E001', 'SRF-A001'
);

-- Turnos de tarde (15:00 - 22:00)
INSERT INTO turnos (id, personal_id, hospital_id, fecha, tipo_turno, hora_inicio, hora_fin, es_refuerzo, confirmado, created_at, updated_at)
SELECT gen_random_uuid(), p.id, p.hospital_id, CURRENT_DATE, 'TARDE', '15:00:00'::time, '22:00:00'::time, false, true, NOW(), NOW()
FROM personal p WHERE p.numero_empleado IN (
  'CHUAC-M003', 'CHUAC-M004', 'CHUAC-E003', 'CHUAC-E004', 'CHUAC-A002', 'CHUAC-C002',
  'MOD-M002', 'MOD-E002', 'MOD-A002',
  'SRF-M002', 'SRF-E002', 'SRF-A002'
);

-- Turnos de noche (22:00 - 08:00)
INSERT INTO turnos (id, personal_id, hospital_id, fecha, tipo_turno, hora_inicio, hora_fin, es_refuerzo, confirmado, created_at, updated_at)
SELECT gen_random_uuid(), p.id, p.hospital_id, CURRENT_DATE, 'NOCHE', '22:00:00'::time, '08:00:00'::time, false, true, NOW(), NOW()
FROM personal p WHERE p.numero_empleado IN (
  'CHUAC-M005', 'CHUAC-E005', 'CHUAC-E006', 'CHUAC-A003',
  'MOD-M003', 'MOD-E003',
  'SRF-M003', 'SRF-E003'
);

-- Turnos para mañana (próximo día)
INSERT INTO turnos (id, personal_id, hospital_id, fecha, tipo_turno, hora_inicio, hora_fin, es_refuerzo, confirmado, created_at, updated_at)
SELECT gen_random_uuid(), p.id, p.hospital_id, CURRENT_DATE + 1, 'MANANA', '08:00:00'::time, '15:00:00'::time, false, true, NOW(), NOW()
FROM personal p WHERE p.numero_empleado IN (
  'CHUAC-M003', 'CHUAC-M006', 'CHUAC-E007', 'CHUAC-E008', 'CHUAC-A004',
  'MOD-M004', 'MOD-E004', 'MOD-E005',
  'SRF-E004'
);
EOF

echo -e "${GREEN}  ✓ Turnos generados${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ MIGRACIÓN COMPLETADA${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Resumen de datos insertados:${NC}"

docker exec -i urgencias-postgres psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
  hospital_id AS "Hospital",
  COUNT(*) FILTER (WHERE rol = 'MEDICO') AS "Médicos",
  COUNT(*) FILTER (WHERE rol = 'ENFERMERO') AS "Enfermeros",
  COUNT(*) FILTER (WHERE rol = 'AUXILIAR') AS "Auxiliares",
  COUNT(*) FILTER (WHERE rol = 'CELADOR') AS "Celadores",
  COUNT(*) AS "Total"
FROM personal
GROUP BY hospital_id
ORDER BY 
  CASE hospital_id 
    WHEN 'chuac' THEN 1 
    WHEN 'modelo' THEN 2 
    WHEN 'san_rafael' THEN 3 
  END;
EOF

echo ""
echo -e "${YELLOW}Turnos de hoy por hospital:${NC}"
docker exec -i urgencias-postgres psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
  t.hospital_id AS "Hospital",
  COUNT(*) FILTER (WHERE t.tipo_turno = 'MANANA') AS "Mañana",
  COUNT(*) FILTER (WHERE t.tipo_turno = 'TARDE') AS "Tarde",
  COUNT(*) FILTER (WHERE t.tipo_turno = 'NOCHE') AS "Noche",
  COUNT(*) AS "Total"
FROM turnos t
WHERE t.fecha = CURRENT_DATE
GROUP BY t.hospital_id
ORDER BY 
  CASE t.hospital_id 
    WHEN 'chuac' THEN 1 
    WHEN 'modelo' THEN 2 
    WHEN 'san_rafael' THEN 3 
  END;
EOF

echo ""
echo -e "${GREEN}¡Listo! Puedes acceder al frontend en http://localhost:3003${NC}"
