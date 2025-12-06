"""
Implementación SQLAlchemy del Repositorio de Hospitales
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from src.domain.entities.hospital import Hospital, ConfiguracionPersonalHospital
from src.domain.repositories.hospital_repository import HospitalRepository
from src.infrastructure.persistence.models.hospital_model import (
    HospitalModel, ConfiguracionPersonalHospitalModel
)


class SQLAlchemyHospitalRepository(HospitalRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: HospitalModel) -> Hospital:
        return Hospital(
            id=model.id,
            codigo=model.codigo,
            nombre=model.nombre,
            latitud=float(model.latitud),
            longitud=float(model.longitud),
            direccion=model.direccion,
            num_ventanillas_recepcion=model.num_ventanillas_recepcion,
            aforo_sala_espera=model.aforo_sala_espera,
            numero_boxes_triaje=model.numero_boxes_triaje,
            numero_consultas=model.numero_consultas,
            num_camillas_observacion=model.num_camillas_observacion,
            activo=model.activo,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: Hospital) -> HospitalModel:
        return HospitalModel(
            id=entity.id,
            codigo=entity.codigo,
            nombre=entity.nombre,
            latitud=entity.latitud,
            longitud=entity.longitud,
            direccion=entity.direccion,
            num_ventanillas_recepcion=entity.num_ventanillas_recepcion,
            aforo_sala_espera=entity.aforo_sala_espera,
            numero_boxes_triaje=entity.numero_boxes_triaje,
            numero_consultas=entity.numero_consultas,
            num_camillas_observacion=entity.num_camillas_observacion,
            activo=entity.activo,
        )

    def save(self, hospital: Hospital) -> Hospital:
        existing = self.session.query(HospitalModel).filter_by(id=hospital.id).first()
        if existing:
            existing.codigo = hospital.codigo
            existing.nombre = hospital.nombre
            existing.latitud = hospital.latitud
            existing.longitud = hospital.longitud
            existing.direccion = hospital.direccion
            existing.num_ventanillas_recepcion = hospital.num_ventanillas_recepcion
            existing.aforo_sala_espera = hospital.aforo_sala_espera
            existing.numero_boxes_triaje = hospital.numero_boxes_triaje
            existing.numero_consultas = hospital.numero_consultas
            existing.num_camillas_observacion = hospital.num_camillas_observacion
            existing.activo = hospital.activo
        else:
            model = self._to_model(hospital)
            self.session.add(model)

        self.session.commit()
        return hospital

    def find_by_id(self, hospital_id: UUID) -> Optional[Hospital]:
        model = self.session.query(HospitalModel).filter_by(id=hospital_id).first()
        return self._to_entity(model) if model else None

    def find_by_codigo(self, codigo: str) -> Optional[Hospital]:
        model = self.session.query(HospitalModel).filter_by(codigo=codigo).first()
        return self._to_entity(model) if model else None

    def find_all(self, solo_activos: bool = True) -> List[Hospital]:
        query = self.session.query(HospitalModel)
        if solo_activos:
            query = query.filter_by(activo=True)
        return [self._to_entity(m) for m in query.all()]

    def delete(self, hospital_id: UUID) -> bool:
        model = self.session.query(HospitalModel).filter_by(id=hospital_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def exists(self, hospital_id: UUID) -> bool:
        return self.session.query(HospitalModel).filter_by(id=hospital_id).count() > 0

    # Configuración de personal
    def _config_to_entity(self, model: ConfiguracionPersonalHospitalModel) -> ConfiguracionPersonalHospital:
        return ConfiguracionPersonalHospital(
            id=model.id,
            hospital_id=model.hospital_id,
            puesto=model.puesto.value,
            rol=model.rol,
            turno_manana_min=model.turno_manana_min,
            turno_manana_max=model.turno_manana_max,
            turno_tarde_min=model.turno_tarde_min,
            turno_tarde_max=model.turno_tarde_max,
            turno_noche_min=model.turno_noche_min,
            turno_noche_max=model.turno_noche_max,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def save_configuracion(self, config: ConfiguracionPersonalHospital) -> ConfiguracionPersonalHospital:
        from infrastructure.persistence.models.hospital_model import TipoPuestoDB

        existing = self.session.query(ConfiguracionPersonalHospitalModel).filter_by(id=config.id).first()
        if existing:
            existing.puesto = TipoPuestoDB(config.puesto)
            existing.rol = config.rol
            existing.turno_manana_min = config.turno_manana_min
            existing.turno_manana_max = config.turno_manana_max
            existing.turno_tarde_min = config.turno_tarde_min
            existing.turno_tarde_max = config.turno_tarde_max
            existing.turno_noche_min = config.turno_noche_min
            existing.turno_noche_max = config.turno_noche_max
        else:
            model = ConfiguracionPersonalHospitalModel(
                id=config.id,
                hospital_id=config.hospital_id,
                puesto=TipoPuestoDB(config.puesto),
                rol=config.rol,
                turno_manana_min=config.turno_manana_min,
                turno_manana_max=config.turno_manana_max,
                turno_tarde_min=config.turno_tarde_min,
                turno_tarde_max=config.turno_tarde_max,
                turno_noche_min=config.turno_noche_min,
                turno_noche_max=config.turno_noche_max,
            )
            self.session.add(model)

        self.session.commit()
        return config

    def find_configuraciones(self, hospital_id: UUID) -> List[ConfiguracionPersonalHospital]:
        models = self.session.query(ConfiguracionPersonalHospitalModel).filter_by(hospital_id=hospital_id).all()
        return [self._config_to_entity(m) for m in models]

    def find_configuracion(
        self,
        hospital_id: UUID,
        puesto: str,
        rol: str
    ) -> Optional[ConfiguracionPersonalHospital]:
        from infrastructure.persistence.models.hospital_model import TipoPuestoDB

        model = self.session.query(ConfiguracionPersonalHospitalModel).filter_by(
            hospital_id=hospital_id,
            puesto=TipoPuestoDB(puesto),
            rol=rol
        ).first()
        return self._config_to_entity(model) if model else None

    def delete_configuracion(self, config_id: UUID) -> bool:
        model = self.session.query(ConfiguracionPersonalHospitalModel).filter_by(id=config_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False
