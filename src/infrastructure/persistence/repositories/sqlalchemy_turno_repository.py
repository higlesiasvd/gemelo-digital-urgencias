"""
Implementación SQLAlchemy del Repositorio de Turnos
"""

from datetime import date
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from src.domain.entities.turno import Turno, TipoTurno
from src.domain.repositories.turno_repository import TurnoRepository
from src.infrastructure.persistence.models.turno_model import TurnoModel, TipoTurnoDB


class SQLAlchemyTurnoRepository(TurnoRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: TurnoModel) -> Turno:
        return Turno(
            id=model.id,
            personal_id=model.personal_id,
            hospital_id=model.hospital_id,
            fecha=model.fecha,
            tipo_turno=TipoTurno(model.tipo_turno.value),
            hora_inicio=model.hora_inicio,
            hora_fin=model.hora_fin,
            es_refuerzo=model.es_refuerzo,
            confirmado=model.confirmado,
            notas=model.notas,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: Turno) -> TurnoModel:
        return TurnoModel(
            id=entity.id,
            personal_id=entity.personal_id,
            hospital_id=entity.hospital_id,
            fecha=entity.fecha,
            tipo_turno=TipoTurnoDB(entity.tipo_turno.value),
            hora_inicio=entity.hora_inicio,
            hora_fin=entity.hora_fin,
            es_refuerzo=entity.es_refuerzo,
            confirmado=entity.confirmado,
            notas=entity.notas,
        )

    def save(self, turno: Turno) -> Turno:
        existing = self.session.query(TurnoModel).filter_by(id=turno.id).first()
        if existing:
            existing.tipo_turno = TipoTurnoDB(turno.tipo_turno.value)
            existing.hora_inicio = turno.hora_inicio
            existing.hora_fin = turno.hora_fin
            existing.es_refuerzo = turno.es_refuerzo
            existing.confirmado = turno.confirmado
            existing.notas = turno.notas
        else:
            model = self._to_model(turno)
            self.session.add(model)

        self.session.commit()
        return turno

    def find_by_id(self, turno_id: UUID) -> Optional[Turno]:
        model = self.session.query(TurnoModel).filter_by(id=turno_id).first()
        return self._to_entity(model) if model else None

    def find_all(
        self,
        hospital_id: Optional[UUID] = None,
        personal_id: Optional[UUID] = None,
        fecha: Optional[date] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        tipo_turno: Optional[TipoTurno] = None,
        es_refuerzo: Optional[bool] = None
    ) -> List[Turno]:
        query = self.session.query(TurnoModel)

        if hospital_id:
            query = query.filter_by(hospital_id=hospital_id)
        if personal_id:
            query = query.filter_by(personal_id=personal_id)
        if fecha:
            query = query.filter_by(fecha=fecha)
        if fecha_desde:
            query = query.filter(TurnoModel.fecha >= fecha_desde)
        if fecha_hasta:
            query = query.filter(TurnoModel.fecha <= fecha_hasta)
        if tipo_turno:
            query = query.filter_by(tipo_turno=TipoTurnoDB(tipo_turno.value))
        if es_refuerzo is not None:
            query = query.filter_by(es_refuerzo=es_refuerzo)

        return [self._to_entity(m) for m in query.all()]

    def find_by_personal_fecha(self, personal_id: UUID, fecha: date) -> List[Turno]:
        models = self.session.query(TurnoModel).filter_by(
            personal_id=personal_id,
            fecha=fecha
        ).all()
        return [self._to_entity(m) for m in models]

    def find_by_hospital_fecha(
        self,
        hospital_id: UUID,
        fecha: date,
        tipo_turno: Optional[TipoTurno] = None
    ) -> List[Turno]:
        query = self.session.query(TurnoModel).filter_by(
            hospital_id=hospital_id,
            fecha=fecha
        )
        if tipo_turno:
            query = query.filter_by(tipo_turno=TipoTurnoDB(tipo_turno.value))
        return [self._to_entity(m) for m in query.all()]

    def delete(self, turno_id: UUID) -> bool:
        model = self.session.query(TurnoModel).filter_by(id=turno_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def count_by_hospital_fecha_turno(
        self,
        hospital_id: UUID,
        fecha: date,
        tipo_turno: TipoTurno,
        rol: Optional[str] = None
    ) -> int:
        query = self.session.query(TurnoModel).filter_by(
            hospital_id=hospital_id,
            fecha=fecha,
            tipo_turno=TipoTurnoDB(tipo_turno.value)
        )
        return query.count()
