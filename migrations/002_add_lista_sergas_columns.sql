-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 002: Añadir campos DDD a tabla personal existente
-- Ejecutar si la tabla personal ya existe
-- ═══════════════════════════════════════════════════════════════════════════════

-- Añadir columnas para gestión de Lista SERGAS
ALTER TABLE personal 
  ADD COLUMN IF NOT EXISTS en_lista_sergas BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_entrada_lista_sergas DATE,
  ADD COLUMN IF NOT EXISTS hospital_origen_id VARCHAR(50);

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_personal_en_lista ON personal(en_lista_sergas);
CREATE INDEX IF NOT EXISTS idx_personal_hospital_origen ON personal(hospital_origen_id);

-- Comentarios
COMMENT ON COLUMN personal.en_lista_sergas IS 'Indica si el personal está en la lista SERGAS de disponibles';
COMMENT ON COLUMN personal.fecha_entrada_lista_sergas IS 'Fecha de entrada en la lista SERGAS';
COMMENT ON COLUMN personal.hospital_origen_id IS 'Hospital de origen cuando está en lista SERGAS';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Insertar hospitales si no existen (usando códigos como identificadores string)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO hospitales (id, codigo, nombre, latitud, longitud, direccion, 
                        num_ventanillas_recepcion, aforo_sala_espera, 
                        numero_boxes_triaje, numero_consultas, 
                        num_camillas_observacion, activo, created_at, updated_at)
SELECT gen_random_uuid(), 'chuac', 'Complexo Hospitalario Universitario A Coruña', 
       43.3712, -8.4188, 'As Xubias, 84, 15006 A Coruña', 
       4, 80, 6, 15, 30, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM hospitales WHERE codigo = 'chuac');

INSERT INTO hospitales (id, codigo, nombre, latitud, longitud, direccion, 
                        num_ventanillas_recepcion, aforo_sala_espera, 
                        numero_boxes_triaje, numero_consultas, 
                        num_camillas_observacion, activo, created_at, updated_at)
SELECT gen_random_uuid(), 'modelo', 'Hospital Modelo HM', 
       43.3651, -8.4016, 'Rúa Simón Bolívar, 15006 A Coruña', 
       2, 40, 3, 8, 15, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM hospitales WHERE codigo = 'modelo');

INSERT INTO hospitales (id, codigo, nombre, latitud, longitud, direccion, 
                        num_ventanillas_recepcion, aforo_sala_espera, 
                        numero_boxes_triaje, numero_consultas, 
                        num_camillas_observacion, activo, created_at, updated_at)
SELECT gen_random_uuid(), 'san_rafael', 'Hospital San Rafael', 
       43.3583, -8.4123, 'Rúa San Rafael, 15006 A Coruña', 
       2, 35, 2, 6, 10, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM hospitales WHERE codigo = 'san_rafael');
