"""
Implementación SQLAlchemy del Repositorio de Refuerzos
"""

from datetime import date
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from src.domain.entities.personal import RolPersonal
from src.domain.entities.turno import TipoTurno
from src.domain.entities.solicitud_refuerzo import (
    SolicitudRefuerzo, EstadoSolicitudRefuerzo, PrioridadRefuerzo, MotivoRefuerzo
)
from src.domain.repositories.refuerzo_repository import RefuerzoRepository
from src.infrastructure.persistence.models.refuerzo_model import (
    SolicitudRefuerzoModel, EstadoSolicitudRefuerzoDB,
    PrioridadRefuerzoDB, MotivoRefuerzoDB
)
from src.infrastructure.persistence.models.personal_model import RolPersonalDB
from src.infrastructure.persistence.models.turno_model import TipoTurnoDB


class SQLAlchemyRefuerzoRepository(RefuerzoRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: SolicitudRefuerzoModel) -> SolicitudRefuerzo:
        return SolicitudRefuerzo(
            id=model.id,
            hospital_id=model.hospital_id,
            fecha_necesidad=model.fecha_necesidad,
            turno_necesario=TipoTurno(model.turno_necesario.value),
            rol_requerido=RolPersonal(model.rol_requerido.value),
            cantidad_personal=model.cantidad_personal,
            prioridad=PrioridadRefuerzo(model.prioridad.value),
            motivo=MotivoRefuerzo(model.motivo.value),
            estado=EstadoSolicitudRefuerzo(model.estado.value),
            demanda_predicha=model.demanda_predicha,
            saturacion_predicha=model.saturacion_predicha,
            confianza_prediccion=model.confianza_prediccion,
            personal_asignado_ids=[],  # Se obtiene por separado si es necesario
            generado_automaticamente=model.generado_automaticamente,
            solicitado_por=model.solicitado_por,
            notas=model.notas,
            created_at=model.created_at,
            updated_at=model.updated_at,
            respondido_at=model.respondido_at,
        )

    def _to_model(self, entity: SolicitudRefuerzo) -> SolicitudRefuerzoModel:
        return SolicitudRefuerzoModel(
            id=entity.id,
            hospital_id=entity.hospital_id,
            fecha_necesidad=entity.fecha_necesidad,
            turno_necesario=TipoTurnoDB(entity.turno_necesario.value),
            rol_requerido=RolPersonalDB(entity.rol_requerido.value),
            cantidad_personal=entity.cantidad_personal,
            prioridad=PrioridadRefuerzoDB(entity.prioridad.value),
            motivo=MotivoRefuerzoDB(entity.motivo.value),
            estado=EstadoSolicitudRefuerzoDB(entity.estado.value),
            demanda_predicha=entity.demanda_predicha,
            saturacion_predicha=entity.saturacion_predicha,
            confianza_prediccion=entity.confianza_prediccion,
            generado_automaticamente=entity.generado_automaticamente,
            solicitado_por=entity.solicitado_por,
            notas=entity.notas,
            respondido_at=entity.respondido_at,
        )

    def save(self, solicitud: SolicitudRefuerzo) -> SolicitudRefuerzo:
        existing = self.session.query(SolicitudRefuerzoModel).filter_by(id=solicitud.id).first()
        if existing:
            existing.estado = EstadoSolicitudRefuerzoDB(solicitud.estado.value)
            existing.notas = solicitud.notas
            existing.respondido_at = solicitud.respondido_at
        else:
            model = self._to_model(solicitud)
            self.session.add(model)

        self.session.commit()
        return solicitud

    def find_by_id(self, solicitud_id: UUID) -> Optional[SolicitudRefuerzo]:
        model = self.session.query(SolicitudRefuerzoModel).filter_by(id=solicitud_id).first()
        return self._to_entity(model) if model else None

    def find_all(
        self,
        hospital_id: Optional[UUID] = None,
        estado: Optional[EstadoSolicitudRefuerzo] = None,
        prioridad: Optional[PrioridadRefuerzo] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        generado_automaticamente: Optional[bool] = None
    ) -> List[SolicitudRefuerzo]:
        query = self.session.query(SolicitudRefuerzoModel)

        if hospital_id:
            query = query.filter_by(hospital_id=hospital_id)
        if estado:
            query = query.filter_by(estado=EstadoSolicitudRefuerzoDB(estado.value))
        if prioridad:
            query = query.filter_by(prioridad=PrioridadRefuerzoDB(prioridad.value))
        if fecha_desde:
            query = query.filter(SolicitudRefuerzoModel.fecha_necesidad >= fecha_desde)
        if fecha_hasta:
            query = query.filter(SolicitudRefuerzoModel.fecha_necesidad <= fecha_hasta)
        if generado_automaticamente is not None:
            query = query.filter_by(generado_automaticamente=generado_automaticamente)

        return [self._to_entity(m) for m in query.all()]

    def find_pendientes(self, hospital_id: Optional[UUID] = None) -> List[SolicitudRefuerzo]:
        query = self.session.query(SolicitudRefuerzoModel).filter_by(
            estado=EstadoSolicitudRefuerzoDB.PENDIENTE
        )
        if hospital_id:
            query = query.filter_by(hospital_id=hospital_id)
        return [self._to_entity(m) for m in query.all()]

    def find_urgentes(self) -> List[SolicitudRefuerzo]:
        models = self.session.query(SolicitudRefuerzoModel).filter(
            SolicitudRefuerzoModel.prioridad.in_([
                PrioridadRefuerzoDB.ALTA,
                PrioridadRefuerzoDB.CRITICA
            ]),
            SolicitudRefuerzoModel.estado == EstadoSolicitudRefuerzoDB.PENDIENTE
        ).all()
        return [self._to_entity(m) for m in models]

    def delete(self, solicitud_id: UUID) -> bool:
        model = self.session.query(SolicitudRefuerzoModel).filter_by(id=solicitud_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def count_pendientes_por_hospital(self, hospital_id: UUID) -> int:
        return self.session.query(SolicitudRefuerzoModel).filter_by(
            hospital_id=hospital_id,
            estado=EstadoSolicitudRefuerzoDB.PENDIENTE
        ).count()

    def asignar_personal(self, solicitud_id: UUID, personal_id: UUID) -> bool:
        from infrastructure.persistence.models.personal_model import PersonalModel

        solicitud = self.session.query(SolicitudRefuerzoModel).filter_by(id=solicitud_id).first()
        personal = self.session.query(PersonalModel).filter_by(id=personal_id).first()

        if solicitud and personal:
            solicitud.personal_asignado.append(personal)
            self.session.commit()
            return True
        return False
