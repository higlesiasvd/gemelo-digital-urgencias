# Plan de Reestructuración a Arquitectura DDD

## Resumen Ejecutivo

Reestructuración completa del backend a arquitectura DDD (Domain-Driven Design) con:
- CQRS (Command Query Responsibility Segregation)
- Commands, CommandHandlers, Queries, QueryHandlers, DTOs
- Nuevas tablas PostgreSQL para hospitales y lista SERGAS

---

## 1. Nueva Estructura de Directorios

```
src/
├── api/
│   └── v1/
│       ├── __init__.py
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── hospital_router.py
│       │   ├── personal_router.py
│       │   ├── turno_router.py
│       │   ├── disponibilidad_router.py
│       │   ├── refuerzo_router.py
│       │   └── lista_sergas_router.py
│       └── dependencies.py
│
├── application/
│   ├── __init__.py
│   ├── commands/
│   │   ├── __init__.py
│   │   ├── hospital/
│   │   │   ├── create_hospital.py
│   │   │   ├── update_hospital.py
│   │   │   └── delete_hospital.py
│   │   ├── personal/
│   │   │   ├── create_personal.py
│   │   │   ├── update_personal.py
│   │   │   ├── delete_personal.py
│   │   │   ├── asignar_a_hospital.py
│   │   │   └── mover_a_lista_sergas.py
│   │   ├── turno/
│   │   │   ├── create_turno.py
│   │   │   ├── update_turno.py
│   │   │   └── delete_turno.py
│   │   ├── disponibilidad/
│   │   │   ├── registrar_disponibilidad.py
│   │   │   └── actualizar_disponibilidad.py
│   │   ├── refuerzo/
│   │   │   ├── crear_solicitud_refuerzo.py
│   │   │   ├── actualizar_estado_refuerzo.py
│   │   │   └── evaluar_necesidad_refuerzo.py
│   │   └── lista_sergas/
│   │       ├── agregar_personal_lista.py
│   │       ├── asignar_personal_hospital.py
│   │       └── devolver_personal_lista.py
│   │
│   ├── queries/
│   │   ├── __init__.py
│   │   ├── hospital/
│   │   │   ├── get_hospital.py
│   │   │   ├── list_hospitales.py
│   │   │   └── get_resumen_hospital.py
│   │   ├── personal/
│   │   │   ├── get_personal.py
│   │   │   ├── list_personal.py
│   │   │   └── get_disponibles_refuerzo.py
│   │   ├── turno/
│   │   │   ├── get_turno.py
│   │   │   ├── list_turnos.py
│   │   │   └── get_resumen_turnos.py
│   │   ├── disponibilidad/
│   │   │   ├── get_disponibilidad.py
│   │   │   └── list_disponibilidades.py
│   │   ├── refuerzo/
│   │   │   ├── get_solicitud.py
│   │   │   ├── list_solicitudes.py
│   │   │   └── get_pendientes.py
│   │   └── lista_sergas/
│   │       ├── list_personal_disponible.py
│   │       └── get_estadisticas_lista.py
│   │
│   ├── dto/
│   │   ├── __init__.py
│   │   ├── hospital_dto.py
│   │   ├── personal_dto.py
│   │   ├── turno_dto.py
│   │   ├── disponibilidad_dto.py
│   │   ├── refuerzo_dto.py
│   │   └── lista_sergas_dto.py
│   │
│   └── handlers/
│       ├── __init__.py
│       ├── command_handlers.py
│       └── query_handlers.py
│
├── domain/
│   ├── __init__.py
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── hospital.py         # NUEVO
│   │   ├── personal.py         # Existente (limpiar)
│   │   ├── turno.py            # Extraer de personal.py
│   │   ├── disponibilidad.py   # Extraer de personal.py
│   │   ├── solicitud_refuerzo.py
│   │   └── personal_lista_sergas.py  # NUEVO
│   │
│   ├── value_objects/
│   │   ├── __init__.py
│   │   ├── coordenadas.py
│   │   ├── configuracion_puesto.py
│   │   └── configuracion_turno.py
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── hospital_repository.py
│   │   ├── personal_repository.py
│   │   ├── turno_repository.py
│   │   ├── disponibilidad_repository.py
│   │   ├── refuerzo_repository.py
│   │   └── lista_sergas_repository.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── coordinador.py          # Existente (mantener)
│   │   ├── generador_pacientes.py  # Existente (mantener)
│   │   ├── predictor.py            # Existente (mantener)
│   │   └── gestion_lista_sergas.py # NUEVO
│   │
│   └── events/
│       ├── __init__.py
│       ├── personal_events.py
│       └── hospital_events.py
│
├── infrastructure/
│   ├── __init__.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   ├── database.py          # Existente
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── hospital_model.py    # NUEVO
│   │   │   ├── personal_model.py
│   │   │   ├── turno_model.py
│   │   │   ├── disponibilidad_model.py
│   │   │   ├── refuerzo_model.py
│   │   │   ├── lista_sergas_model.py  # NUEVO
│   │   │   └── configuracion_model.py
│   │   └── repositories/
│   │       ├── __init__.py
│   │       ├── sqlalchemy_hospital_repository.py
│   │       ├── sqlalchemy_personal_repository.py
│   │       ├── sqlalchemy_turno_repository.py
│   │       ├── sqlalchemy_disponibilidad_repository.py
│   │       ├── sqlalchemy_refuerzo_repository.py
│   │       └── sqlalchemy_lista_sergas_repository.py
│   │
│   ├── kafka/                   # Existente (mantener)
│   └── external_services/       # Existente (mantener)
│
├── config/
│   ├── __init__.py
│   ├── settings.py              # Existente
│   └── hospital_config.py       # Existente
│
└── main.py
```

---

## 2. Diseño de Tablas PostgreSQL

### 2.1 Tabla: `hospitales`

Una única tabla para los 3 hospitales (CHUAC, HM Modelo, San Rafael) con estructura idéntica.

```sql
CREATE TABLE hospitales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,  -- 'chuac', 'hm_modelo', 'san_rafael'
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

    -- Metadatos
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_hospitales_codigo ON hospitales(codigo);
CREATE INDEX idx_hospitales_activo ON hospitales(activo);
```

### 2.2 Tabla: `configuracion_personal_hospital`

Configuración de personal mínimo/máximo por puesto y turno para cada hospital.

```sql
CREATE TYPE tipo_puesto AS ENUM (
    'ventanilla_recepcion',
    'box_triaje',
    'consulta',
    'camilla_observacion',
    'sala_espera'
);

CREATE TABLE configuracion_personal_hospital (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitales(id) ON DELETE CASCADE,

    puesto tipo_puesto NOT NULL,
    rol VARCHAR(50) NOT NULL,  -- medico, enfermero, auxiliar, etc.

    -- Configuración por turno
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

-- Índices
CREATE INDEX idx_config_personal_hospital ON configuracion_personal_hospital(hospital_id);
CREATE INDEX idx_config_personal_puesto ON configuracion_personal_hospital(puesto);
```

### 2.3 Tabla: `personal` (MODIFICADA)

Se modifica para soportar el flujo hospital <-> lista_sergas.

```sql
-- Añadir columna para indicar si está en lista SERGAS
ALTER TABLE personal ADD COLUMN en_lista_sergas BOOLEAN DEFAULT FALSE;
ALTER TABLE personal ADD COLUMN fecha_entrada_lista_sergas TIMESTAMP;
ALTER TABLE personal ADD COLUMN hospital_origen_id UUID REFERENCES hospitales(id);
```

### 2.4 Tabla: `lista_sergas`

Pool de personal disponible para reforzar cualquier hospital.

```sql
CREATE TABLE lista_sergas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personal_id UUID NOT NULL REFERENCES personal(id) ON DELETE CASCADE,

    -- Info del personal (desnormalizado para consultas rápidas)
    nombre_completo VARCHAR(250) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    especialidad VARCHAR(100),
    telefono VARCHAR(20),

    -- Disponibilidad para refuerzos
    disponible_turno_manana BOOLEAN DEFAULT TRUE,
    disponible_turno_tarde BOOLEAN DEFAULT TRUE,
    disponible_turno_noche BOOLEAN DEFAULT TRUE,

    -- Preferencias
    hospitales_preferidos TEXT[],  -- Array de códigos de hospital
    distancia_maxima_km INTEGER,

    -- Estado
    activo BOOLEAN DEFAULT TRUE,
    fecha_entrada TIMESTAMP DEFAULT NOW(),
    motivo_entrada VARCHAR(100),  -- 'baja_hospital', 'fin_contrato', 'voluntario'

    -- Última asignación
    ultima_asignacion_hospital_id UUID REFERENCES hospitales(id),
    ultima_asignacion_fecha TIMESTAMP,

    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(personal_id)
);

-- Índices
CREATE INDEX idx_lista_sergas_activo ON lista_sergas(activo);
CREATE INDEX idx_lista_sergas_rol ON lista_sergas(rol);
CREATE INDEX idx_lista_sergas_disponibilidad ON lista_sergas(
    disponible_turno_manana,
    disponible_turno_tarde,
    disponible_turno_noche
);
```

### 2.5 Tabla: `asignaciones_temporales`

Historial de movimientos entre lista_sergas y hospitales.

```sql
CREATE TABLE asignaciones_temporales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personal_id UUID NOT NULL REFERENCES personal(id),

    -- Movimiento
    origen_tipo VARCHAR(20) NOT NULL,  -- 'lista_sergas' o 'hospital'
    origen_id UUID,  -- hospital_id si viene de hospital
    destino_tipo VARCHAR(20) NOT NULL,  -- 'lista_sergas' o 'hospital'
    destino_id UUID,  -- hospital_id si va a hospital

    -- Detalles
    fecha_asignacion TIMESTAMP DEFAULT NOW(),
    fecha_fin_prevista TIMESTAMP,
    fecha_fin_real TIMESTAMP,
    turno VARCHAR(20),
    motivo TEXT,

    -- Estado
    estado VARCHAR(20) DEFAULT 'activa',  -- activa, completada, cancelada

    -- Metadatos
    creado_por VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_asignaciones_personal ON asignaciones_temporales(personal_id);
CREATE INDEX idx_asignaciones_estado ON asignaciones_temporales(estado);
CREATE INDEX idx_asignaciones_fecha ON asignaciones_temporales(fecha_asignacion);
```

---

## 3. Patrón CQRS - Ejemplo de Implementación

### 3.1 Command

```python
# src/application/commands/hospital/create_hospital.py
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

@dataclass(frozen=True)
class CreateHospitalCommand:
    codigo: str
    nombre: str
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    num_ventanillas_recepcion: int = 0
    aforo_sala_espera: int = 0
    numero_boxes_triaje: int = 0
    numero_consultas: int = 0
    num_camillas_observacion: int = 0
```

### 3.2 Command Handler

```python
# src/application/handlers/hospital_command_handlers.py
from uuid import UUID
from domain.entities.hospital import Hospital
from domain.repositories.hospital_repository import HospitalRepository
from application.commands.hospital.create_hospital import CreateHospitalCommand
from application.dto.hospital_dto import HospitalResponseDTO

class CreateHospitalHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, command: CreateHospitalCommand) -> HospitalResponseDTO:
        hospital = Hospital(
            codigo=command.codigo,
            nombre=command.nombre,
            latitud=command.latitud,
            longitud=command.longitud,
            direccion=command.direccion,
            num_ventanillas_recepcion=command.num_ventanillas_recepcion,
            aforo_sala_espera=command.aforo_sala_espera,
            numero_boxes_triaje=command.numero_boxes_triaje,
            numero_consultas=command.numero_consultas,
            num_camillas_observacion=command.num_camillas_observacion,
        )
        saved = self.repository.save(hospital)
        return HospitalResponseDTO.from_entity(saved)
```

### 3.3 Query

```python
# src/application/queries/hospital/get_hospital.py
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

@dataclass(frozen=True)
class GetHospitalQuery:
    hospital_id: Optional[UUID] = None
    codigo: Optional[str] = None
```

### 3.4 Query Handler

```python
# src/application/handlers/hospital_query_handlers.py
from typing import Optional
from domain.repositories.hospital_repository import HospitalRepository
from application.queries.hospital.get_hospital import GetHospitalQuery
from application.dto.hospital_dto import HospitalResponseDTO

class GetHospitalHandler:
    def __init__(self, repository: HospitalRepository):
        self.repository = repository

    def handle(self, query: GetHospitalQuery) -> Optional[HospitalResponseDTO]:
        if query.hospital_id:
            hospital = self.repository.find_by_id(query.hospital_id)
        elif query.codigo:
            hospital = self.repository.find_by_codigo(query.codigo)
        else:
            return None

        return HospitalResponseDTO.from_entity(hospital) if hospital else None
```

### 3.5 DTO

```python
# src/application/dto/hospital_dto.py
from dataclasses import dataclass
from typing import Optional, List
from uuid import UUID
from domain.entities.hospital import Hospital

@dataclass
class HospitalResponseDTO:
    id: str
    codigo: str
    nombre: str
    latitud: float
    longitud: float
    direccion: Optional[str]
    num_ventanillas_recepcion: int
    aforo_sala_espera: int
    numero_boxes_triaje: int
    numero_consultas: int
    num_camillas_observacion: int
    activo: bool

    @classmethod
    def from_entity(cls, hospital: Hospital) -> 'HospitalResponseDTO':
        return cls(
            id=str(hospital.id),
            codigo=hospital.codigo,
            nombre=hospital.nombre,
            latitud=hospital.latitud,
            longitud=hospital.longitud,
            direccion=hospital.direccion,
            num_ventanillas_recepcion=hospital.num_ventanillas_recepcion,
            aforo_sala_espera=hospital.aforo_sala_espera,
            numero_boxes_triaje=hospital.numero_boxes_triaje,
            numero_consultas=hospital.numero_consultas,
            num_camillas_observacion=hospital.num_camillas_observacion,
            activo=hospital.activo,
        )

@dataclass
class CreateHospitalRequestDTO:
    codigo: str
    nombre: str
    latitud: float
    longitud: float
    direccion: Optional[str] = None
    num_ventanillas_recepcion: int = 0
    aforo_sala_espera: int = 0
    numero_boxes_triaje: int = 0
    numero_consultas: int = 0
    num_camillas_observacion: int = 0
```

---

## 4. Lógica de Movimiento Personal ↔ Lista SERGAS

### 4.1 Asignar Personal de Lista SERGAS a Hospital

```python
# src/application/commands/lista_sergas/asignar_personal_hospital.py
@dataclass(frozen=True)
class AsignarPersonalHospitalCommand:
    personal_id: UUID
    hospital_id: UUID
    turno: str
    fecha_inicio: date
    fecha_fin_prevista: Optional[date] = None
    motivo: Optional[str] = None
```

**Handler:**
1. Buscar personal en lista_sergas
2. Verificar que está activo y disponible para el turno
3. Eliminar de lista_sergas
4. Actualizar personal.hospital_id al hospital destino
5. Actualizar personal.en_lista_sergas = False
6. Crear registro en asignaciones_temporales
7. Emitir evento PersonalAsignadoAHospital

### 4.2 Devolver Personal de Hospital a Lista SERGAS

```python
# src/application/commands/lista_sergas/devolver_personal_lista.py
@dataclass(frozen=True)
class DevolverPersonalListaCommand:
    personal_id: UUID
    motivo: str  # 'fin_refuerzo', 'baja_hospital', 'voluntario'
```

**Handler:**
1. Buscar personal en hospital
2. Guardar hospital_origen_id
3. Actualizar personal.en_lista_sergas = True
4. Actualizar personal.fecha_entrada_lista_sergas
5. Crear registro en lista_sergas
6. Actualizar asignacion_temporal si existe
7. Emitir evento PersonalDevueltoALista

---

## 5. Datos Iniciales de Hospitales

```sql
INSERT INTO hospitales (codigo, nombre, latitud, longitud, direccion,
    num_ventanillas_recepcion, aforo_sala_espera, numero_boxes_triaje,
    numero_consultas, num_camillas_observacion) VALUES

('chuac', 'Complexo Hospitalario Universitario A Coruña',
    43.3549, -8.4115, 'As Xubias, 84, 15006 A Coruña',
    4, 80, 6, 12, 20),

('hm_modelo', 'Hospital HM Modelo',
    43.3712, -8.3959, 'Virrey Osorio, 30, 15011 A Coruña',
    2, 40, 3, 6, 10),

('san_rafael', 'Hospital San Rafael',
    43.3689, -8.4023, 'C. de Fernando Macías, 11, 15004 A Coruña',
    2, 35, 3, 5, 8);
```

---

## 6. Archivos a Eliminar

Los siguientes archivos se eliminarán por estar obsoletos o fusionados:

1. `src/api/personal_api.py` → Se divide en routers específicos
2. `src/domain/services/gestion_personal.py` → Se divide en commands/queries
3. `src/domain/services/coordinador_refuerzos.py` → Se fusiona con lista_sergas

---

## 7. Fases de Implementación

### Fase 1: Estructura Base
- Crear nueva estructura de directorios
- Crear archivos `__init__.py`
- Configurar imports

### Fase 2: Modelos de Base de Datos
- Crear modelo Hospital
- Crear modelo ConfiguracionPersonalHospital
- Crear modelo ListaSergas
- Crear modelo AsignacionesTemporal
- Modificar modelo Personal

### Fase 3: Entidades de Dominio
- Crear entidad Hospital
- Crear entidad PersonalListaSergas
- Crear value objects (Coordenadas, ConfiguracionPuesto)

### Fase 4: Repositorios
- Interfaces en domain/repositories/
- Implementaciones SQLAlchemy en infrastructure/

### Fase 5: Commands y Handlers
- CRUD Hospital
- CRUD Personal
- CRUD Lista SERGAS
- Lógica de movimiento

### Fase 6: Queries y Handlers
- Consultas de hospitales
- Consultas de personal
- Consultas de lista SERGAS

### Fase 7: DTOs
- Request DTOs
- Response DTOs
- Mappers

### Fase 8: Routers FastAPI
- Hospital router
- Personal router
- Lista SERGAS router
- Conectar con handlers

### Fase 9: Migración y Limpieza
- Migrar datos existentes
- Eliminar archivos obsoletos
- Actualizar tests

---

## 8. Endpoints Resultantes

### Hospital
- `GET /api/v1/hospitales` - Listar hospitales
- `GET /api/v1/hospitales/{id}` - Obtener hospital
- `POST /api/v1/hospitales` - Crear hospital
- `PUT /api/v1/hospitales/{id}` - Actualizar hospital
- `DELETE /api/v1/hospitales/{id}` - Eliminar hospital
- `GET /api/v1/hospitales/{id}/configuracion-personal` - Config personal
- `PUT /api/v1/hospitales/{id}/configuracion-personal` - Actualizar config

### Personal
- `GET /api/v1/personal` - Listar personal
- `GET /api/v1/personal/{id}` - Obtener personal
- `POST /api/v1/personal` - Crear personal
- `PUT /api/v1/personal/{id}` - Actualizar personal
- `DELETE /api/v1/personal/{id}` - Eliminar personal
- `GET /api/v1/personal/disponibles-refuerzo` - Disponibles

### Lista SERGAS
- `GET /api/v1/lista-sergas` - Listar personal disponible
- `POST /api/v1/lista-sergas` - Agregar personal a lista
- `DELETE /api/v1/lista-sergas/{personal_id}` - Remover de lista
- `POST /api/v1/lista-sergas/asignar` - Asignar a hospital
- `POST /api/v1/lista-sergas/devolver` - Devolver a lista
- `GET /api/v1/lista-sergas/estadisticas` - Estadísticas

### Turnos
- `GET /api/v1/turnos` - Listar turnos
- `POST /api/v1/turnos` - Crear turno
- `GET /api/v1/turnos/resumen/{hospital_id}` - Resumen

### Disponibilidad
- `GET /api/v1/disponibilidad` - Listar
- `POST /api/v1/disponibilidad` - Registrar

### Refuerzos
- `GET /api/v1/refuerzos` - Listar solicitudes
- `POST /api/v1/refuerzos` - Crear solicitud
- `PATCH /api/v1/refuerzos/{id}/estado` - Actualizar estado
- `POST /api/v1/refuerzos/evaluar` - Evaluar necesidad

---

## Estado de Implementación (Actualizado)

### ✅ Completado

1. **Estructura de Carpetas DDD**
   - `src/domain/entities/` - Entidades del dominio
   - `src/domain/repositories/` - Interfaces de repositorios
   - `src/domain/services/` - Servicios de dominio
   - `src/application/commands/` - Comandos CQRS
   - `src/application/queries/` - Consultas CQRS
   - `src/application/handlers/` - Manejadores de comandos y consultas
   - `src/infrastructure/persistence/` - Implementaciones de repositorios
   - `src/api/v1/routers/` - Routers FastAPI

2. **Modelos SQLAlchemy** (`src/infrastructure/persistence/models/`)
   - `hospital_model.py` - Hospital y configuración
   - `personal_model.py` - Personal sanitario
   - `turno_model.py` - Turnos de trabajo
   - `disponibilidad_model.py` - Disponibilidad
   - `refuerzo_model.py` - Solicitudes de refuerzo
   - `lista_sergas_model.py` - Lista SERGAS y asignaciones

3. **API REST v1** (Puerto 8000)
   - Todos los endpoints CRUD funcionando
   - Arquitectura DDD + CQRS v2.0.0
   - Documentación OpenAPI automática

4. **Base de Datos PostgreSQL**
   - Migraciones en `migrations/`
   - Hospitales: CHUAC, Modelo HM, San Rafael

5. **Limpieza del Código**
   - Archivos viejos eliminados (`personal_api.py`, `models.py`)
   - Imports actualizados a prefijo `src.`
   - Tests actualizados

### 📊 Tests
- **47 tests pasando**
- 6 tests con problemas de enums (lógica original, no de DDD)

### 🔧 Endpoints Disponibles

| Endpoint | Estado |
|----------|--------|
| `/api/v1/hospitales` | ✅ |
| `/api/v1/personal` | ✅ |
| `/api/v1/turnos` | ✅ |
| `/api/v1/disponibilidad` | ✅ |
| `/api/v1/refuerzos` | ✅ |
| `/api/v1/lista-sergas` | ✅ |
