"""
Router para Lista SERGAS
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.api.v1.dependencies import (
    get_db,
    get_agregar_personal_lista_handler,
    get_asignar_personal_hospital_handler,
    get_devolver_personal_lista_handler,
    get_list_personal_disponible_handler,
    get_estadisticas_lista_handler,
)
from src.application.dto.lista_sergas_dto import (
    AgregarPersonalListaRequest, AsignarPersonalHospitalRequest,
    DevolverPersonalListaRequest,
    PersonalListaSergasResponse, ListaSergasListResponse,
    EstadisticasListaSergasResponse,
)
from src.application.dto.personal_dto import PersonalResponse
from src.application.commands.lista_sergas import (
    AgregarPersonalListaCommand, AsignarPersonalHospitalCommand,
    DevolverPersonalListaCommand
)
from src.application.queries.lista_sergas import (
    ListPersonalDisponibleQuery, GetEstadisticasListaQuery
)

router = APIRouter(prefix="/lista-sergas", tags=["Lista SERGAS"])


@router.get("", response_model=ListaSergasListResponse)
def listar_personal_disponible(
    rol: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    solo_activos: bool = Query(True),
    disponible_turno: Optional[str] = Query(None),
    hospital_preferido: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista el personal disponible en la lista SERGAS"""
    handler = get_list_personal_disponible_handler(db)
    query = ListPersonalDisponibleQuery(
        rol=rol,
        especialidad=especialidad,
        solo_activos=solo_activos,
        disponible_turno=disponible_turno,
        hospital_preferido=hospital_preferido,
    )
    personal = handler.handle(query)

    return ListaSergasListResponse(
        personal=[PersonalListaSergasResponse(**p.to_dict()) for p in personal],
        total=len(personal)
    )


@router.get("/estadisticas", response_model=EstadisticasListaSergasResponse)
def obtener_estadisticas(
    db: Session = Depends(get_db)
):
    """Obtiene estadísticas de la lista SERGAS"""
    handler = get_estadisticas_lista_handler(db)
    query = GetEstadisticasListaQuery()
    estadisticas = handler.handle(query)

    return EstadisticasListaSergasResponse(**estadisticas)


@router.post("", response_model=PersonalListaSergasResponse, status_code=status.HTTP_201_CREATED)
def agregar_personal_lista(
    request: AgregarPersonalListaRequest,
    db: Session = Depends(get_db)
):
    """Agrega personal a la lista SERGAS"""
    handler = get_agregar_personal_lista_handler(db)
    command = AgregarPersonalListaCommand(
        personal_id=UUID(request.personal_id),
        motivo_entrada=request.motivo_entrada,
        disponible_turno_manana=request.disponible_turno_manana,
        disponible_turno_tarde=request.disponible_turno_tarde,
        disponible_turno_noche=request.disponible_turno_noche,
        hospitales_preferidos=tuple(request.hospitales_preferidos),
        distancia_maxima_km=request.distancia_maxima_km,
    )

    try:
        personal_lista = handler.handle(command)
        return PersonalListaSergasResponse(**personal_lista.to_dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/asignar", response_model=PersonalResponse)
def asignar_personal_hospital(
    request: AsignarPersonalHospitalRequest,
    db: Session = Depends(get_db)
):
    """Asigna personal de la lista SERGAS a un hospital"""
    handler = get_asignar_personal_hospital_handler(db)
    command = AsignarPersonalHospitalCommand(
        personal_id=UUID(request.personal_id),
        hospital_id=UUID(request.hospital_id),
        turno=request.turno,
        fecha_inicio=request.fecha_inicio,
        fecha_fin_prevista=request.fecha_fin_prevista,
        motivo=request.motivo,
    )

    try:
        personal = handler.handle(command)
        return PersonalResponse(**personal.to_dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/devolver", response_model=PersonalListaSergasResponse)
def devolver_personal_lista(
    request: DevolverPersonalListaRequest,
    db: Session = Depends(get_db)
):
    """Devuelve personal de un hospital a la lista SERGAS"""
    handler = get_devolver_personal_lista_handler(db)
    command = DevolverPersonalListaCommand(
        personal_id=UUID(request.personal_id),
        motivo=request.motivo,
    )

    try:
        personal_lista = handler.handle(command)
        return PersonalListaSergasResponse(**personal_lista.to_dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{personal_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_de_lista(
    personal_id: str,
    db: Session = Depends(get_db)
):
    """Elimina un personal de la lista SERGAS (sin asignarlo a hospital)"""
    # Implementar si es necesario
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Funcionalidad no implementada. Use /asignar para asignar a un hospital."
    )
