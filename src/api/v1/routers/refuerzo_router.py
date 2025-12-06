"""
Router para Solicitudes de Refuerzo
"""

from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.api.v1.dependencies import (
    get_db,
    get_crear_solicitud_refuerzo_handler,
    get_actualizar_estado_refuerzo_handler,
    get_solicitud_query_handler,
    get_list_solicitudes_handler,
    get_pendientes_handler,
)
from src.application.dto.refuerzo_dto import (
    CrearSolicitudRefuerzoRequest, ActualizarEstadoRefuerzoRequest,
    SolicitudRefuerzoResponse, SolicitudRefuerzoListResponse,
)
from src.application.commands.refuerzo import (
    CrearSolicitudRefuerzoCommand, ActualizarEstadoRefuerzoCommand
)
from src.application.queries.refuerzo import (
    GetSolicitudQuery, ListSolicitudesQuery, GetPendientesQuery
)

router = APIRouter(prefix="/refuerzos", tags=["Refuerzos"])


@router.get("", response_model=SolicitudRefuerzoListResponse)
def listar_solicitudes(
    hospital_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    prioridad: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    generado_automaticamente: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista solicitudes de refuerzo con filtros opcionales"""
    handler = get_list_solicitudes_handler(db)
    query = ListSolicitudesQuery(
        hospital_id=UUID(hospital_id) if hospital_id else None,
        estado=estado,
        prioridad=prioridad,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        generado_automaticamente=generado_automaticamente,
    )
    solicitudes = handler.handle(query)

    return SolicitudRefuerzoListResponse(
        solicitudes=[SolicitudRefuerzoResponse(**s.to_dict()) for s in solicitudes],
        total=len(solicitudes)
    )


@router.get("/pendientes", response_model=SolicitudRefuerzoListResponse)
def obtener_pendientes(
    hospital_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Obtiene las solicitudes pendientes"""
    handler = get_pendientes_handler(db)
    query = GetPendientesQuery(
        hospital_id=UUID(hospital_id) if hospital_id else None
    )
    solicitudes = handler.handle(query)

    return SolicitudRefuerzoListResponse(
        solicitudes=[SolicitudRefuerzoResponse(**s.to_dict()) for s in solicitudes],
        total=len(solicitudes)
    )


@router.get("/{solicitud_id}", response_model=SolicitudRefuerzoResponse)
def obtener_solicitud(
    solicitud_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene una solicitud de refuerzo por ID"""
    handler = get_solicitud_query_handler(db)
    query = GetSolicitudQuery(solicitud_id=UUID(solicitud_id))

    solicitud = handler.handle(query)
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud no encontrada: {solicitud_id}"
        )

    return SolicitudRefuerzoResponse(**solicitud.to_dict())


@router.post("", response_model=SolicitudRefuerzoResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud_refuerzo(
    request: CrearSolicitudRefuerzoRequest,
    db: Session = Depends(get_db)
):
    """Crea una nueva solicitud de refuerzo"""
    handler = get_crear_solicitud_refuerzo_handler(db)
    command = CrearSolicitudRefuerzoCommand(
        hospital_id=UUID(request.hospital_id),
        fecha_necesidad=request.fecha_necesidad,
        turno_necesario=request.turno_necesario,
        rol_requerido=request.rol_requerido,
        cantidad_personal=request.cantidad_personal,
        prioridad=request.prioridad,
        motivo=request.motivo,
        generado_automaticamente=False,
        solicitado_por=request.solicitado_por,
        notas=request.notas,
    )

    try:
        solicitud = handler.handle(command)
        return SolicitudRefuerzoResponse(**solicitud.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{solicitud_id}/estado", response_model=SolicitudRefuerzoResponse)
def actualizar_estado_refuerzo(
    solicitud_id: str,
    request: ActualizarEstadoRefuerzoRequest,
    db: Session = Depends(get_db)
):
    """Actualiza el estado de una solicitud de refuerzo"""
    handler = get_actualizar_estado_refuerzo_handler(db)
    command = ActualizarEstadoRefuerzoCommand(
        solicitud_id=UUID(solicitud_id),
        nuevo_estado=request.nuevo_estado,
        notas=request.notas,
    )

    solicitud = handler.handle(command)
    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solicitud no encontrada: {solicitud_id}"
        )

    return SolicitudRefuerzoResponse(**solicitud.to_dict())
