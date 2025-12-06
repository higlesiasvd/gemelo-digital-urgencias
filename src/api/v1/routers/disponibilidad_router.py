"""
Router para Disponibilidad
"""

from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.api.v1.dependencies import (
    get_db,
    get_registrar_disponibilidad_handler,
    get_actualizar_disponibilidad_handler,
    get_disponibilidad_query_handler,
    get_list_disponibilidades_handler,
)
from src.application.dto.disponibilidad_dto import (
    RegistrarDisponibilidadRequest, ActualizarDisponibilidadRequest,
    DisponibilidadResponse, DisponibilidadListResponse,
)
from src.application.commands.disponibilidad import (
    RegistrarDisponibilidadCommand, ActualizarDisponibilidadCommand
)
from src.application.queries.disponibilidad import (
    GetDisponibilidadQuery, ListDisponibilidadesQuery
)

router = APIRouter(prefix="/disponibilidad", tags=["Disponibilidad"])


@router.get("", response_model=DisponibilidadListResponse)
def listar_disponibilidades(
    personal_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    solo_vigentes: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Lista disponibilidades con filtros opcionales"""
    handler = get_list_disponibilidades_handler(db)
    query = ListDisponibilidadesQuery(
        personal_id=UUID(personal_id) if personal_id else None,
        estado=estado,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        solo_vigentes=solo_vigentes,
    )
    disponibilidades = handler.handle(query)

    return DisponibilidadListResponse(
        disponibilidades=[DisponibilidadResponse(**d.to_dict()) for d in disponibilidades],
        total=len(disponibilidades)
    )


@router.get("/{disponibilidad_id}", response_model=DisponibilidadResponse)
def obtener_disponibilidad(
    disponibilidad_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene una disponibilidad por ID"""
    handler = get_disponibilidad_query_handler(db)
    query = GetDisponibilidadQuery(disponibilidad_id=UUID(disponibilidad_id))

    disponibilidad = handler.handle(query)
    if not disponibilidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disponibilidad no encontrada: {disponibilidad_id}"
        )

    return DisponibilidadResponse(**disponibilidad.to_dict())


@router.post("", response_model=DisponibilidadResponse, status_code=status.HTTP_201_CREATED)
def registrar_disponibilidad(
    request: RegistrarDisponibilidadRequest,
    db: Session = Depends(get_db)
):
    """Registra una nueva disponibilidad/indisponibilidad"""
    handler = get_registrar_disponibilidad_handler(db)
    command = RegistrarDisponibilidadCommand(
        personal_id=UUID(request.personal_id),
        estado=request.estado,
        fecha_inicio=request.fecha_inicio,
        fecha_fin=request.fecha_fin,
        motivo=request.motivo,
        documento_justificante=request.documento_justificante,
        aprobado_por=request.aprobado_por,
    )

    try:
        disponibilidad = handler.handle(command)
        return DisponibilidadResponse(**disponibilidad.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{disponibilidad_id}", response_model=DisponibilidadResponse)
def actualizar_disponibilidad(
    disponibilidad_id: str,
    request: ActualizarDisponibilidadRequest,
    db: Session = Depends(get_db)
):
    """Actualiza una disponibilidad"""
    handler = get_actualizar_disponibilidad_handler(db)
    command = ActualizarDisponibilidadCommand(
        disponibilidad_id=UUID(disponibilidad_id),
        estado=request.estado,
        fecha_fin=request.fecha_fin,
        motivo=request.motivo,
        documento_justificante=request.documento_justificante,
        aprobado_por=request.aprobado_por,
    )

    disponibilidad = handler.handle(command)
    if not disponibilidad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disponibilidad no encontrada: {disponibilidad_id}"
        )

    return DisponibilidadResponse(**disponibilidad.to_dict())
