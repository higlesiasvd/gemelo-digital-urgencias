"""
Implementación SQLAlchemy del Repositorio de Disponibilidad
"""

from datetime import date
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from src.domain.entities.disponibilidad import Disponibilidad, EstadoDisponibilidad
from src.domain.repositories.disponibilidad_repository import DisponibilidadRepository
from src.infrastructure.persistence.models.disponibilidad_model import (
    DisponibilidadModel, EstadoDisponibilidadDB
)
from src.infrastructure.persistence.models.personal_model import PersonalModel


class SQLAlchemyDisponibilidadRepository(DisponibilidadRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: DisponibilidadModel) -> Disponibilidad:
        return Disponibilidad(
            id=model.id,
            personal_id=model.personal_id,
            estado=EstadoDisponibilidad(model.estado.value),
            fecha_inicio=model.fecha_inicio,
            fecha_fin=model.fecha_fin,
            motivo=model.motivo,
            documento_justificante=model.documento_justificante,
            aprobado_por=model.aprobado_por,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: Disponibilidad) -> DisponibilidadModel:
        return DisponibilidadModel(
            id=entity.id,
            personal_id=entity.personal_id,
            estado=EstadoDisponibilidadDB(entity.estado.value),
            fecha_inicio=entity.fecha_inicio,
            fecha_fin=entity.fecha_fin,
            motivo=entity.motivo,
            documento_justificante=entity.documento_justificante,
            aprobado_por=entity.aprobado_por,
        )

    def save(self, disponibilidad: Disponibilidad) -> Disponibilidad:
        existing = self.session.query(DisponibilidadModel).filter_by(id=disponibilidad.id).first()
        if existing:
            existing.estado = EstadoDisponibilidadDB(disponibilidad.estado.value)
            existing.fecha_fin = disponibilidad.fecha_fin
            existing.motivo = disponibilidad.motivo
            existing.documento_justificante = disponibilidad.documento_justificante
            existing.aprobado_por = disponibilidad.aprobado_por
        else:
            model = self._to_model(disponibilidad)
            self.session.add(model)

        self.session.commit()
        return disponibilidad

    def find_by_id(self, disponibilidad_id: UUID) -> Optional[Disponibilidad]:
        model = self.session.query(DisponibilidadModel).filter_by(id=disponibilidad_id).first()
        return self._to_entity(model) if model else None

    def find_all(
        self,
        personal_id: Optional[UUID] = None,
        estado: Optional[EstadoDisponibilidad] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        solo_vigentes: bool = False
    ) -> List[Disponibilidad]:
        query = self.session.query(DisponibilidadModel)

        if personal_id:
            query = query.filter_by(personal_id=personal_id)
        if estado:
            query = query.filter_by(estado=EstadoDisponibilidadDB(estado.value))
        if fecha_desde:
            query = query.filter(DisponibilidadModel.fecha_inicio >= fecha_desde)
        if fecha_hasta:
            query = query.filter(
                or_(
                    DisponibilidadModel.fecha_fin <= fecha_hasta,
                    DisponibilidadModel.fecha_fin.is_(None)
                )
            )
        if solo_vigentes:
            hoy = date.today()
            query = query.filter(
                and_(
                    DisponibilidadModel.fecha_inicio <= hoy,
                    or_(
                        DisponibilidadModel.fecha_fin >= hoy,
                        DisponibilidadModel.fecha_fin.is_(None)
                    )
                )
            )

        return [self._to_entity(m) for m in query.all()]

    def find_vigentes_personal(self, personal_id: UUID) -> List[Disponibilidad]:
        hoy = date.today()
        models = self.session.query(DisponibilidadModel).filter(
            and_(
                DisponibilidadModel.personal_id == personal_id,
                DisponibilidadModel.fecha_inicio <= hoy,
                or_(
                    DisponibilidadModel.fecha_fin >= hoy,
                    DisponibilidadModel.fecha_fin.is_(None)
                )
            )
        ).all()
        return [self._to_entity(m) for m in models]

    def find_bajas_vigentes(self, hospital_id: Optional[UUID] = None) -> List[Disponibilidad]:
        hoy = date.today()
        query = self.session.query(DisponibilidadModel).filter(
            and_(
                DisponibilidadModel.estado.in_([
                    EstadoDisponibilidadDB.BAJA_MEDICA,
                    EstadoDisponibilidadDB.BAJA_MATERNAL
                ]),
                DisponibilidadModel.fecha_inicio <= hoy,
                or_(
                    DisponibilidadModel.fecha_fin >= hoy,
                    DisponibilidadModel.fecha_fin.is_(None)
                )
            )
        )

        if hospital_id:
            query = query.join(PersonalModel).filter(PersonalModel.hospital_id == hospital_id)

        return [self._to_entity(m) for m in query.all()]

    def delete(self, disponibilidad_id: UUID) -> bool:
        model = self.session.query(DisponibilidadModel).filter_by(id=disponibilidad_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def count_bajas_por_hospital(self, hospital_id: UUID) -> int:
        hoy = date.today()
        return self.session.query(DisponibilidadModel).join(PersonalModel).filter(
            and_(
                PersonalModel.hospital_id == hospital_id,
                DisponibilidadModel.estado.in_([
                    EstadoDisponibilidadDB.BAJA_MEDICA,
                    EstadoDisponibilidadDB.BAJA_MATERNAL
                ]),
                DisponibilidadModel.fecha_inicio <= hoy,
                or_(
                    DisponibilidadModel.fecha_fin >= hoy,
                    DisponibilidadModel.fecha_fin.is_(None)
                )
            )
        ).count()
