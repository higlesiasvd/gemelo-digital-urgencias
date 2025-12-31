-- MIGRATION: Add 30 clinical cases for training
DO $$
DECLARE
    lesson_verde_azul UUID;
    lesson_amarillo UUID;
    lesson_naranja UUID;
    lesson_rojo UUID;
BEGIN
    SELECT lesson_id INTO lesson_verde_azul FROM lessons WHERE codigo = 'verde_azul';
    SELECT lesson_id INTO lesson_amarillo FROM lessons WHERE codigo = 'amarillo';
    SELECT lesson_id INTO lesson_naranja FROM lessons WHERE codigo = 'naranja';
    SELECT lesson_id INTO lesson_rojo FROM lessons WHERE codigo = 'rojo';

    -- ROJO (5 casos)
    INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base) VALUES
    (lesson_rojo, 'Parada cardiorrespiratoria', 'Paciente traído por emergencias en PCR.', 68, 'M', 'Encontrado inconsciente', '["Inconsciente", "No respira", "Sin pulso"]', '{"pa": "0/0", "fc": 0, "sato2": 0}', 'Cardiopatía', 'rojo', 'PCR requiere RCP inmediata.', 25),
    (lesson_rojo, 'Obstrucción vía aérea', 'Niño de 3 años con atragantamiento.', 3, 'M', 'Atragantamiento', '["Cianosis", "Estridor severo"]', '{"fc": 160, "sato2": 75}', 'Sano', 'rojo', 'Cuerpo extraño en vía aérea.', 25),
    (lesson_rojo, 'Shock anafiláctico', 'Reacción alérgica severa.', 35, 'F', 'Picadura de abeja', '["Edema facial", "Hipotensión", "Urticaria"]', '{"pa": "70/40", "fc": 130, "sato2": 88}', 'Alergia', 'rojo', 'Requiere adrenalina IM inmediata.', 25),
    (lesson_rojo, 'ACV en evolución', 'Déficit neurológico agudo.', 72, 'M', 'Debilidad lado derecho', '["Hemiplejia", "Afasia", "Confusión"]', '{"pa": "180/100", "fc": 88}', 'HTA, FA', 'rojo', 'Código ICTUS. Ventana fibrinólisis.', 25),
    (lesson_rojo, 'Hemorragia masiva', 'Accidentado con hemorragia.', 28, 'M', 'Accidente de moto', '["Palidez", "Taquicardia", "Confusión"]', '{"pa": "75/50", "fc": 140}', 'Sano', 'rojo', 'Shock hemorrágico clase III-IV.', 25);

    -- NARANJA (5 casos)
    INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base) VALUES
    (lesson_naranja, 'Dolor torácico coronario', 'Dolor opresivo retroesternal.', 62, 'M', 'Dolor pecho 40 min', '["Dolor opresivo", "Irradiación brazo", "Sudoración"]', '{"pa": "150/90", "fc": 95}', 'HTA, DM, fumador', 'naranja', 'ECG en menos de 10 minutos.', 20),
    (lesson_naranja, 'Crisis asmática', 'Dificultad respiratoria severa.', 25, 'F', 'No puedo respirar', '["Sibilancias", "Taquipnea", "Uso accesoria"]', '{"pa": "130/80", "fc": 120, "sato2": 91}', 'Asma', 'naranja', 'SatO2 menor 92% indica gravedad.', 20),
    (lesson_naranja, 'Cetoacidosis diabética', 'DM1 descompensada.', 19, 'M', 'Sed, poliuria, malestar', '["Poliuria", "Taquipnea", "Aliento cetósico"]', '{"pa": "100/60", "fc": 110}', 'DM1', 'naranja', 'Respiración Kussmaul. Urgente.', 20),
    (lesson_naranja, 'Fractura abierta', 'Exposición ósea tibia.', 45, 'M', 'Caída escalera', '["Exposición ósea", "Hemorragia", "Dolor severo"]', '{"pa": "130/85", "fc": 105}', 'Sano', 'naranja', 'Cirugía urgente. Riesgo infección.', 20),
    (lesson_naranja, 'Meningitis', 'Fiebre, cefalea, rigidez nuca.', 22, 'F', 'Cefalea intensa y fiebre', '["Fiebre 39.5", "Rigidez nuca", "Fotofobia"]', '{"pa": "110/70", "fc": 100, "temp": 39.5}', 'Sana', 'naranja', 'Punción lumbar y ATB empírico.', 20);

    -- AMARILLO (10 casos)
    INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base) VALUES
    (lesson_amarillo, 'Apendicitis', 'Dolor FID progresivo.', 28, 'M', 'Dolor barriga', '["Dolor FID", "Náuseas", "Defensa"]', '{"pa": "125/80", "fc": 88, "temp": 38.2}', 'Sano', 'amarillo', 'Irritación peritoneal localizada.', 15),
    (lesson_amarillo, 'Cólico renal', 'Dolor lumbar cólico.', 40, 'M', 'Dolor riñón', '["Dolor irradiado", "Náuseas", "Inquietud"]', '{"pa": "150/95", "fc": 95}', 'Litiasis', 'amarillo', 'Estable. Analgesia y ecografía.', 15),
    (lesson_amarillo, 'Neumonía', 'Fiebre y tos productiva.', 55, 'F', 'Tos y fiebre 3 días', '["Fiebre", "Tos productiva", "Disnea leve"]', '{"pa": "130/80", "fc": 92, "sato2": 94}', 'EPOC', 'amarillo', 'Neumonía en EPOC. RX y ATB.', 15),
    (lesson_amarillo, 'GEA con deshidratación', 'Niño con vómitos.', 4, 'M', 'Vómitos y diarrea', '["Vómitos", "Ojos hundidos", "Pliegue +"]', '{"pa": "90/55", "fc": 130}', 'Sano', 'amarillo', 'Deshidratación moderada 5-10%.', 15),
    (lesson_amarillo, 'Migraña con aura', 'Cefalea hemicraneal.', 30, 'F', 'Cefalea intensa, luces', '["Cefalea", "Aura visual", "Fotofobia"]', '{"pa": "120/75", "fc": 78}', 'Migrañas', 'amarillo', 'Típica sin signos alarma.', 15),
    (lesson_amarillo, 'Celulitis', 'Pierna roja e hinchada.', 62, 'F', 'Pierna roja', '["Eritema", "Edema", "Fiebre"]', '{"pa": "140/85", "temp": 38.5}', 'DM2', 'amarillo', 'Diabética. ATB IV vigilancia.', 15),
    (lesson_amarillo, 'Urgencia HTA', 'TA muy elevada.', 58, 'M', 'Cefalea y mareo', '["Cefalea", "Mareo", "Visión borrosa"]', '{"pa": "210/120", "fc": 85}', 'HTA', 'amarillo', 'Sin daño órgano diana.', 15),
    (lesson_amarillo, 'Epistaxis', 'Sangrado nasal persistente.', 70, 'M', 'Sangrado nariz', '["Sangrado activo 30 min"]', '{"pa": "160/95"}', 'Anticoagulado', 'amarillo', 'Taponamiento y control INR.', 15),
    (lesson_amarillo, 'Retención orina', 'No puede orinar.', 75, 'M', 'No orino 12h', '["Globo vesical", "Dolor suprapúbico"]', '{"pa": "155/90"}', 'HBP', 'amarillo', 'Sondaje vesical urgente.', 15),
    (lesson_amarillo, 'Intoxicación etílica', 'Embriaguez.', 45, 'M', 'Encontrado en calle', '["Disartria", "Ataxia", "Somnoliento"]', '{"pa": "130/80", "sato2": 96}', 'Enolismo', 'amarillo', 'Glasgow 13. Vigilar conciencia.', 15);

    -- VERDE (5 casos)
    INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base) VALUES
    (lesson_verde_azul, 'Catarro', 'Síntomas catarrales.', 35, 'F', 'Mocos y garganta', '["Rinorrea", "Odinofagia", "Tos"]', '{"temp": 37.2}', 'Sana', 'verde', 'Viral autolimitado.', 10),
    (lesson_verde_azul, 'Lumbalgia', 'Dolor espalda mecánico.', 42, 'M', 'Dolor tras esfuerzo', '["Dolor lumbar", "Contractura"]', '{"pa": "130/80"}', 'Previas', 'verde', 'Sin signos alarma.', 10),
    (lesson_verde_azul, 'Conjuntivitis', 'Ojo rojo y picor.', 25, 'F', 'Ojo rojo', '["Hiperemia", "Secreción", "Picor"]', '{}', 'Lentillas', 'verde', 'Viral o alérgica probable.', 10),
    (lesson_verde_azul, 'Esguince leve', 'Torcedura tobillo.', 28, 'M', 'Tobillo fútbol', '["Dolor leve", "Edema mínimo"]', '{}', 'Sano', 'verde', 'Ottawa negativo. RICE.', 10),
    (lesson_verde_azul, 'Herida superficial', 'Corte mano.', 32, 'F', 'Corte cuchillo', '["Herida 2cm", "Sangrado controlado"]', '{}', 'Sana', 'verde', 'Sutura. VAT.', 10);

    -- AZUL (5 casos)
    INSERT INTO clinical_cases (lesson_id, titulo, descripcion, paciente_edad, paciente_sexo, motivo_consulta, sintomas, constantes_vitales, antecedentes, triaje_correcto, explicacion, xp_base) VALUES
    (lesson_verde_azul, 'Certificado', 'Para gimnasio.', 22, 'M', 'Certificado gimnasio', '["Asintomático"]', '{}', 'Sano', 'azul', 'No urgencia. AP.', 10),
    (lesson_verde_azul, 'Recetas', 'Renovar medicación.', 68, 'F', 'Pastillas tensión', '["Asintomática"]', '{"pa": "135/80"}', 'HTA', 'azul', 'Administrativo. AP.', 10),
    (lesson_verde_azul, 'Verruga', 'Plantar crónica.', 15, 'M', 'Cosa en pie', '["Lesión queratósica"]', '{}', 'Sano', 'azul', 'Crónica. AP.', 10),
    (lesson_verde_azul, 'Dolor crónico', 'Artrosis rodilla.', 72, 'F', 'Rodilla siempre', '["Dolor crónico habitual"]', '{}', 'Artrosis', 'azul', 'Sin cambios. AP.', 10),
    (lesson_verde_azul, 'Insomnio', 'Meses sin dormir.', 45, 'F', 'No duermo', '["Insomnio", "Ansiedad"]', '{}', 'Ansiedad', 'azul', 'Crónico. Salud mental.', 10);

    RAISE NOTICE 'Migración completada: 30 casos añadidos';
END $$;
