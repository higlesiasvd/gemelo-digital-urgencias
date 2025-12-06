"""
Implementación SQLAlchemy del Repositorio de Lista SERGAS
"""

from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.domain.entities.personal_lista_sergas import PersonalListaSergas, MotivoEntradaLista
from src.domain.repositories.lista_sergas_repository import ListaSergasRepository
from src.infrastructure.persistence.models.lista_sergas_model import (
    ListaSergasModel, AsignacionTemporalModel,
    MotivoEntradaListaDB, EstadoAsignacionDB
)


class SQLAlchemyListaSergasRepository(ListaSergasRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_entity(self, model: ListaSergasModel) -> PersonalListaSergas:
        return PersonalListaSergas(
            id=model.id,
            personal_id=model.personal_id,
            nombre_completo=model.nombre_completo,
            rol=model.rol,
            especialidad=model.especialidad,
            telefono=model.telefono,
            disponible_turno_manana=model.disponible_turno_manana,
            disponible_turno_tarde=model.disponible_turno_tarde,
            disponible_turno_noche=model.disponible_turno_noche,
            hospitales_preferidos=model.hospitales_preferidos or [],
            distancia_maxima_km=model.distancia_maxima_km,
            activo=model.activo,
            fecha_entrada=model.fecha_entrada,
            motivo_entrada=MotivoEntradaLista(model.motivo_entrada.value) if model.motivo_entrada else None,
            ultima_asignacion_hospital_id=model.ultima_asignacion_hospital_id,
            ultima_asignacion_fecha=model.ultima_asignacion_fecha,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: PersonalListaSergas) -> ListaSergasModel:
        return ListaSergasModel(
            id=entity.id,
            personal_id=entity.personal_id,
            nombre_completo=entity.nombre_completo,
            rol=entity.rol,
            especialidad=entity.especialidad,
            telefono=entity.telefono,
            disponible_turno_manana=entity.disponible_turno_manana,
            disponible_turno_tarde=entity.disponible_turno_tarde,
            disponible_turno_noche=entity.disponible_turno_noche,
            hospitales_preferidos=entity.hospitales_preferidos,
            distancia_maxima_km=entity.distancia_maxima_km,
            activo=entity.activo,
            fecha_entrada=entity.fecha_entrada,
            motivo_entrada=MotivoEntradaListaDB(entity.motivo_entrada.value) if entity.motivo_entrada else None,
            ultima_asignacion_hospital_id=entity.ultima_asignacion_hospital_id,
            ultima_asignacion_fecha=entity.ultima_asignacion_fecha,
        )

    def save(self, personal_lista: PersonalListaSergas) -> PersonalListaSergas:
        existing = self.session.query(ListaSergasModel).filter_by(id=personal_lista.id).first()
        if existing:
            existing.nombre_completo = personal_lista.nombre_completo
            existing.rol = personal_lista.rol
            existing.especialidad = personal_lista.especialidad
            existing.telefono = personal_lista.telefono
            existing.disponible_turno_manana = personal_lista.disponible_turno_manana
            existing.disponible_turno_tarde = personal_lista.disponible_turno_tarde
            existing.disponible_turno_noche = personal_lista.disponible_turno_noche
            existing.hospitales_preferidos = personal_lista.hospitales_preferidos
            existing.distancia_maxima_km = personal_lista.distancia_maxima_km
            existing.activo = personal_lista.activo
            existing.ultima_asignacion_hospital_id = personal_lista.ultima_asignacion_hospital_id
            existing.ultima_asignacion_fecha = personal_lista.ultima_asignacion_fecha
        else:
            model = self._to_model(personal_lista)
            self.session.add(model)

        self.session.commit()
        return personal_lista

    def find_by_id(self, lista_id: UUID) -> Optional[PersonalListaSergas]:
        model = self.session.query(ListaSergasModel).filter_by(id=lista_id).first()
        return self._to_entity(model) if model else None

    def find_by_personal_id(self, personal_id: UUID) -> Optional[PersonalListaSergas]:
        model = self.session.query(ListaSergasModel).filter_by(personal_id=personal_id).first()
        return self._to_entity(model) if model else None

    def find_all(
        self,
        rol: Optional[str] = None,
        especialidad: Optional[str] = None,
        solo_activos: bool = True,
        disponible_turno: Optional[str] = None
    ) -> List[PersonalListaSergas]:
        query = self.session.query(ListaSergasModel)

        if rol:
            query = query.filter_by(rol=rol)
        if especialidad:
            query = query.filter_by(especialidad=especialidad)
        if solo_activos:
            query = query.filter_by(activo=True)
        if disponible_turno:
            if disponible_turno == "manana":
                query = query.filter_by(disponible_turno_manana=True)
            elif disponible_turno == "tarde":
                query = query.filter_by(disponible_turno_tarde=True)
            elif disponible_turno == "noche":
                query = query.filter_by(disponible_turno_noche=True)

        return [self._to_entity(m) for m in query.all()]

    def find_disponibles_para_turno(
        self,
        turno: str,
        rol: Optional[str] = None,
        hospital_preferido: Optional[str] = None
    ) -> List[PersonalListaSergas]:
        query = self.session.query(ListaSergasModel).filter_by(activo=True)

        if turno == "manana":
            query = query.filter_by(disponible_turno_manana=True)
        elif turno == "tarde":
            query = query.filter_by(disponible_turno_tarde=True)
        elif turno == "noche":
            query = query.filter_by(disponible_turno_noche=True)

        if rol:
            query = query.filter_by(rol=rol)

        results = [self._to_entity(m) for m in query.all()]

        # Filtrar por hospital preferido si se especifica
        if hospital_preferido:
            results = [r for r in results if r.prefiere_hospital(hospital_preferido)]

        return results

    def delete(self, lista_id: UUID) -> bool:
        model = self.session.query(ListaSergasModel).filter_by(id=lista_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def delete_by_personal_id(self, personal_id: UUID) -> bool:
        model = self.session.query(ListaSergasModel).filter_by(personal_id=personal_id).first()
        if model:
            self.session.delete(model)
            self.session.commit()
            return True
        return False

    def count_activos(self, rol: Optional[str] = None) -> int:
        query = self.session.query(ListaSergasModel).filter_by(activo=True)
        if rol:
            query = query.filter_by(rol=rol)
        return query.count()

    def count_por_rol(self) -> Dict[str, int]:
        results = self.session.query(
            ListaSergasModel.rol,
            func.count(ListaSergasModel.id)
        ).filter_by(activo=True).group_by(ListaSergasModel.rol).all()

        return {rol: count for rol, count in results}

    # Asignaciones temporales
    def registrar_asignacion(
        self,
        personal_id: UUID,
        origen_tipo: str,
        origen_id: Optional[UUID],
        destino_tipo: str,
        destino_id: Optional[UUID],
        turno: Optional[str] = None,
        motivo: Optional[str] = None,
        creado_por: Optional[str] = None
    ) -> UUID:
        asignacion = AsignacionTemporalModel(
            id=uuid4(),
            personal_id=personal_id,
            origen_tipo=origen_tipo,
            origen_id=origen_id,
            destino_tipo=destino_tipo,
            destino_id=destino_id,
            turno=turno,
            motivo=motivo,
            creado_por=creado_por,
            estado=EstadoAsignacionDB.ACTIVA,
        )
        self.session.add(asignacion)
        self.session.commit()
        return asignacion.id

    def find_asignaciones_activas(
        self,
        personal_id: Optional[UUID] = None,
        hospital_id: Optional[UUID] = None
    ) -> List[Dict]:
        query = self.session.query(AsignacionTemporalModel).filter_by(
            estado=EstadoAsignacionDB.ACTIVA
        )

        if personal_id:
            query = query.filter_by(personal_id=personal_id)
        if hospital_id:
            query = query.filter_by(destino_id=hospital_id)

        return [
            {
                "id": str(a.id),
                "personal_id": str(a.personal_id),
                "origen_tipo": a.origen_tipo,
                "origen_id": str(a.origen_id) if a.origen_id else None,
                "destino_tipo": a.destino_tipo,
                "destino_id": str(a.destino_id) if a.destino_id else None,
                "fecha_asignacion": a.fecha_asignacion.isoformat(),
                "turno": a.turno,
                "motivo": a.motivo,
            }
            for a in query.all()
        ]

    def completar_asignacion(
        self,
        asignacion_id: UUID,
        fecha_fin_real: Optional[datetime] = None
    ) -> bool:
        asignacion = self.session.query(AsignacionTemporalModel).filter_by(id=asignacion_id).first()
        if asignacion:
            asignacion.estado = EstadoAsignacionDB.COMPLETADA
            asignacion.fecha_fin_real = fecha_fin_real or datetime.now()
            self.session.commit()
            return True
        return False
