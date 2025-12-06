"""
Implementación SQLAlchemy del Repositorio de Personal
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from src.domain.entities.personal import Personal, RolPersonal
from src.domain.repositories.personal_repository import PersonalRepository
from src.infrastructure.persistence.models.personal_model import PersonalModel, RolPersonalDB


class SQLAlchemyPersonalRepository(PersonalRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: PersonalModel) -> Personal:
        return Personal(
            id=model.id,
            numero_empleado=model.numero_empleado,
            nombre=model.nombre,
            apellidos=model.apellidos,
            dni=model.dni,
            email=model.email,
            telefono=model.telefono or "",
            rol=RolPersonal(model.rol.value),
            especialidad=model.especialidad,
            hospital_id=model.hospital_id,
            unidad=model.unidad,
            fecha_alta=model.fecha_alta,
            activo=model.activo,
            acepta_refuerzos=model.acepta_refuerzos,
            horas_semanales_contrato=model.horas_semanales_contrato,
            en_lista_sergas=model.en_lista_sergas,
            fecha_entrada_lista_sergas=model.fecha_entrada_lista_sergas,
            hospital_origen_id=model.hospital_origen_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: Personal) -> PersonalModel:
        return PersonalModel(
            id=entity.id,
            numero_empleado=entity.numero_empleado,
            nombre=entity.nombre,
            apellidos=entity.apellidos,
            dni=entity.dni,
            email=entity.email,
            telefono=entity.telefono,
            rol=RolPersonalDB(entity.rol.value),
            especialidad=entity.especialidad,
            hospital_id=entity.hospital_id,
            unidad=entity.unidad,
            fecha_alta=entity.fecha_alta,
            activo=entity.activo,
            acepta_refuerzos=entity.acepta_refuerzos,
            horas_semanales_contrato=entity.horas_semanales_contrato,
            en_lista_sergas=entity.en_lista_sergas,
            fecha_entrada_lista_sergas=entity.fecha_entrada_lista_sergas,
            hospital_origen_id=entity.hospital_origen_id,
        )

    def save(self, personal: Personal) -> Personal:
        existing = self.session.query(PersonalModel).filter_by(id=personal.id).first()
        if existing:
            existing.nombre = personal.nombre
            existing.apellidos = personal.apellidos
            existing.email = personal.email
            existing.telefono = personal.telefono
            existing.rol = RolPersonalDB(personal.rol.value)
            existing.especialidad = personal.especialidad
            existing.hospital_id = personal.hospital_id
            existing.unidad = personal.unidad
            existing.activo = personal.activo
            existing.acepta_refuerzos = personal.acepta_refuerzos
            existing.horas_semanales_contrato = personal.horas_semanales_contrato
            existing.en_lista_sergas = personal.en_lista_sergas
            existing.fecha_entrada_lista_sergas = personal.fecha_entrada_lista_sergas
            existing.hospital_origen_id = personal.hospital_origen_id
        else:
            model = self._to_model(personal)
            self.session.add(model)

        self.session.commit()
        return personal

    def find_by_id(self, personal_id: UUID) -> Optional[Personal]:
        model = self.session.query(PersonalModel).filter_by(id=personal_id).first()
        return self._to_entity(model) if model else None

    def find_by_numero_empleado(self, numero_empleado: str) -> Optional[Personal]:
        model = self.session.query(PersonalModel).filter_by(numero_empleado=numero_empleado).first()
        return self._to_entity(model) if model else None

    def find_by_dni(self, dni: str) -> Optional[Personal]:
        model = self.session.query(PersonalModel).filter_by(dni=dni).first()
        return self._to_entity(model) if model else None

    def find_all(
        self,
        hospital_id: Optional[UUID] = None,
        rol: Optional[RolPersonal] = None,
        solo_activos: bool = True,
        acepta_refuerzos: Optional[bool] = None,
        en_lista_sergas: Optional[bool] = None
    ) -> List[Personal]:
        query = self.session.query(PersonalModel)

        if hospital_id:
            query = query.filter_by(hospital_id=hospital_id)
        if rol:
            query = query.filter_by(rol=RolPersonalDB(rol.value))
        if solo_activos:
            query = query.filter_by(activo=True)
        if acepta_refuerzos is not None:
            query = query.filter_by(acepta_refuerzos=acepta_refuerzos)
        if en_lista_sergas is not None:
            query = query.filter_by(en_lista_sergas=en_lista_sergas)

        return [self._to_entity(m) for m in query.all()]

    def find_disponibles_refuerzo(
        self,
        rol: Optional[RolPersonal] = None,
        excluir_hospital_id: Optional[UUID] = None
    ) -> List[Personal]:
        query = self.session.query(PersonalModel).filter_by(
            activo=True,
            acepta_refuerzos=True
        )

        if rol:
            query = query.filter_by(rol=RolPersonalDB(rol.value))
        if excluir_hospital_id:
            query = query.filter(PersonalModel.hospital_id != excluir_hospital_id)

        return [self._to_entity(m) for m in query.all()]

    def delete(self, personal_id: UUID) -> bool:
        model = self.session.query(PersonalModel).filter_by(id=personal_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def exists(self, personal_id: UUID) -> bool:
        return self.session.query(PersonalModel).filter_by(id=personal_id).count() > 0

    def count_by_hospital(self, hospital_id: UUID, rol: Optional[RolPersonal] = None) -> int:
        query = self.session.query(PersonalModel).filter_by(
            hospital_id=hospital_id,
            activo=True
        )
        if rol:
            query = query.filter_by(rol=RolPersonalDB(rol.value))
        return query.count()
