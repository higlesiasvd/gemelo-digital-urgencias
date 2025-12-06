"""
Router para Turnos
"""

from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.api.v1.dependencies import (
    get_db,
    get_create_turno_handler,
    get_update_turno_handler,
    get_delete_turno_handler,
    get_turno_query_handler,
    get_list_turnos_handler,
    get_resumen_turnos_handler,
)
from src.application.dto.turno_dto import (
    CreateTurnoRequest, UpdateTurnoRequest,
    TurnoResponse, TurnoListResponse, ResumenTurnosResponse,
)
from src.application.commands.turno import (
    CreateTurnoCommand, UpdateTurnoCommand, DeleteTurnoCommand
)
from src.application.queries.turno import (
    GetTurnoQuery, ListTurnosQuery, GetResumenTurnosQuery
)

router = APIRouter(prefix="/turnos", tags=["Turnos"])


@router.get("", response_model=TurnoListResponse)
def listar_turnos(
    hospital_id: Optional[str] = Query(None),
    personal_id: Optional[str] = Query(None),
    fecha: Optional[date] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    tipo_turno: Optional[str] = Query(None),
    es_refuerzo: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista turnos con filtros opcionales"""
    handler = get_list_turnos_handler(db)
    query = ListTurnosQuery(
        hospital_id=UUID(hospital_id) if hospital_id else None,
        personal_id=UUID(personal_id) if personal_id else None,
        fecha=fecha,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        tipo_turno=tipo_turno,
        es_refuerzo=es_refuerzo,
    )
    turnos = handler.handle(query)

    return TurnoListResponse(
        turnos=[TurnoResponse(**t.to_dict()) for t in turnos],
        total=len(turnos)
    )


@router.get("/resumen/{hospital_id}", response_model=ResumenTurnosResponse)
def obtener_resumen_turnos(
    hospital_id: str,
    fecha: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Obtiene el resumen de turnos de un hospital"""
    handler = get_resumen_turnos_handler(db)
    query = GetResumenTurnosQuery(
        hospital_id=UUID(hospital_id),
        fecha=fecha,
    )
    resumen = handler.handle(query)
    return ResumenTurnosResponse(**resumen)


@router.get("/{turno_id}", response_model=TurnoResponse)
def obtener_turno(
    turno_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene un turno por ID"""
    handler = get_turno_query_handler(db)
    query = GetTurnoQuery(turno_id=UUID(turno_id))

    turno = handler.handle(query)
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno no encontrado: {turno_id}"
        )

    return TurnoResponse(**turno.to_dict())


@router.post("", response_model=TurnoResponse, status_code=status.HTTP_201_CREATED)
def crear_turno(
    request: CreateTurnoRequest,
    db: Session = Depends(get_db)
):
    """Crea un nuevo turno"""
    handler = get_create_turno_handler(db)
    command = CreateTurnoCommand(
        personal_id=UUID(request.personal_id),
        hospital_id=UUID(request.hospital_id),
        fecha=request.fecha,
        tipo_turno=request.tipo_turno,
        hora_inicio=request.hora_inicio,
        hora_fin=request.hora_fin,
        es_refuerzo=request.es_refuerzo,
        confirmado=request.confirmado,
        notas=request.notas,
    )

    try:
        turno = handler.handle(command)
        return TurnoResponse(**turno.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{turno_id}", response_model=TurnoResponse)
def actualizar_turno(
    turno_id: str,
    request: UpdateTurnoRequest,
    db: Session = Depends(get_db)
):
    """Actualiza un turno"""
    handler = get_update_turno_handler(db)
    command = UpdateTurnoCommand(
        turno_id=UUID(turno_id),
        tipo_turno=request.tipo_turno,
        hora_inicio=request.hora_inicio,
        hora_fin=request.hora_fin,
        es_refuerzo=request.es_refuerzo,
        confirmado=request.confirmado,
        notas=request.notas,
    )

    turno = handler.handle(command)
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno no encontrado: {turno_id}"
        )

    return TurnoResponse(**turno.to_dict())


@router.delete("/{turno_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_turno(
    turno_id: str,
    db: Session = Depends(get_db)
):
    """Elimina un turno"""
    handler = get_delete_turno_handler(db)
    command = DeleteTurnoCommand(turno_id=UUID(turno_id))

    if not handler.handle(command):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno no encontrado: {turno_id}"
        )
