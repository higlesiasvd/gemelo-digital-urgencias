"""
Router para Hospitales
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.v1.dependencies import (
    get_db,
    get_create_hospital_handler,
    get_update_hospital_handler,
    get_delete_hospital_handler,
    get_hospital_query_handler,
    get_list_hospitales_handler,
)
from src.application.dto.hospital_dto import (
    CreateHospitalRequest, UpdateHospitalRequest,
    HospitalResponse, HospitalListResponse,
)
from src.application.commands.hospital import (
    CreateHospitalCommand, UpdateHospitalCommand, DeleteHospitalCommand
)
from src.application.queries.hospital import GetHospitalQuery, ListHospitalesQuery

router = APIRouter(prefix="/hospitales", tags=["Hospitales"])


@router.get("", response_model=HospitalListResponse)
def listar_hospitales(
    solo_activos: bool = True,
    db: Session = Depends(get_db)
):
    """Lista todos los hospitales"""
    handler = get_list_hospitales_handler(db)
    query = ListHospitalesQuery(solo_activos=solo_activos)
    hospitales = handler.handle(query)

    return HospitalListResponse(
        hospitales=[HospitalResponse(**h.to_dict()) for h in hospitales],
        total=len(hospitales)
    )


@router.get("/{hospital_id}", response_model=HospitalResponse)
def obtener_hospital(
    hospital_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene un hospital por ID o código"""
    handler = get_hospital_query_handler(db)

    # Intentar como UUID primero
    try:
        uuid_id = UUID(hospital_id)
        query = GetHospitalQuery(hospital_id=uuid_id)
    except ValueError:
        # Si no es UUID, buscar por código
        query = GetHospitalQuery(codigo=hospital_id)

    hospital = handler.handle(query)
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital no encontrado: {hospital_id}"
        )

    return HospitalResponse(**hospital.to_dict())


@router.post("", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
def crear_hospital(
    request: CreateHospitalRequest,
    db: Session = Depends(get_db)
):
    """Crea un nuevo hospital"""
    handler = get_create_hospital_handler(db)
    command = CreateHospitalCommand(
        codigo=request.codigo,
        nombre=request.nombre,
        latitud=request.latitud,
        longitud=request.longitud,
        direccion=request.direccion,
        num_ventanillas_recepcion=request.num_ventanillas_recepcion,
        aforo_sala_espera=request.aforo_sala_espera,
        numero_boxes_triaje=request.numero_boxes_triaje,
        numero_consultas=request.numero_consultas,
        num_camillas_observacion=request.num_camillas_observacion,
    )

    try:
        hospital = handler.handle(command)
        return HospitalResponse(**hospital.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{hospital_id}", response_model=HospitalResponse)
def actualizar_hospital(
    hospital_id: str,
    request: UpdateHospitalRequest,
    db: Session = Depends(get_db)
):
    """Actualiza un hospital existente"""
    handler = get_update_hospital_handler(db)
    command = UpdateHospitalCommand(
        hospital_id=UUID(hospital_id),
        nombre=request.nombre,
        latitud=request.latitud,
        longitud=request.longitud,
        direccion=request.direccion,
        num_ventanillas_recepcion=request.num_ventanillas_recepcion,
        aforo_sala_espera=request.aforo_sala_espera,
        numero_boxes_triaje=request.numero_boxes_triaje,
        numero_consultas=request.numero_consultas,
        num_camillas_observacion=request.num_camillas_observacion,
        activo=request.activo,
    )

    hospital = handler.handle(command)
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital no encontrado: {hospital_id}"
        )

    return HospitalResponse(**hospital.to_dict())


@router.delete("/{hospital_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_hospital(
    hospital_id: str,
    db: Session = Depends(get_db)
):
    """Elimina un hospital"""
    handler = get_delete_hospital_handler(db)
    command = DeleteHospitalCommand(hospital_id=UUID(hospital_id))

    if not handler.handle(command):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital no encontrado: {hospital_id}"
        )
