"""
Router para Personal
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.api.v1.dependencies import (
    get_db,
    get_create_personal_handler,
    get_update_personal_handler,
    get_delete_personal_handler,
    get_personal_query_handler,
    get_list_personal_handler,
    get_disponibles_refuerzo_handler,
)
from src.application.dto.personal_dto import (
    CreatePersonalRequest, UpdatePersonalRequest,
    PersonalResponse, PersonalListResponse,
)
from src.application.commands.personal import (
    CreatePersonalCommand, UpdatePersonalCommand, DeletePersonalCommand
)
from src.application.queries.personal import (
    GetPersonalQuery, ListPersonalQuery, GetDisponiblesRefuerzoQuery
)

router = APIRouter(prefix="/personal", tags=["Personal"])


@router.get("", response_model=PersonalListResponse)
def listar_personal(
    hospital_id: Optional[str] = Query(None),
    rol: Optional[str] = Query(None),
    solo_activos: bool = Query(True),
    acepta_refuerzos: Optional[bool] = Query(None),
    en_lista_sergas: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Lista personal con filtros opcionales"""
    handler = get_list_personal_handler(db)
    query = ListPersonalQuery(
        hospital_id=UUID(hospital_id) if hospital_id else None,
        rol=rol,
        solo_activos=solo_activos,
        acepta_refuerzos=acepta_refuerzos,
        en_lista_sergas=en_lista_sergas,
    )
    personal = handler.handle(query)

    return PersonalListResponse(
        personal=[PersonalResponse(**p.to_dict()) for p in personal],
        total=len(personal)
    )


@router.get("/disponibles-refuerzo", response_model=PersonalListResponse)
def obtener_disponibles_refuerzo(
    rol: Optional[str] = Query(None),
    excluir_hospital_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Obtiene personal disponible para refuerzos"""
    handler = get_disponibles_refuerzo_handler(db)
    query = GetDisponiblesRefuerzoQuery(
        rol=rol,
        excluir_hospital_id=UUID(excluir_hospital_id) if excluir_hospital_id else None,
    )
    personal = handler.handle(query)

    return PersonalListResponse(
        personal=[PersonalResponse(**p.to_dict()) for p in personal],
        total=len(personal)
    )


@router.get("/{personal_id}", response_model=PersonalResponse)
def obtener_personal(
    personal_id: str,
    db: Session = Depends(get_db)
):
    """Obtiene un personal por ID, número de empleado o DNI"""
    handler = get_personal_query_handler(db)

    # Intentar como UUID primero
    try:
        uuid_id = UUID(personal_id)
        query = GetPersonalQuery(personal_id=uuid_id)
    except ValueError:
        # Si no es UUID, buscar por número de empleado
        query = GetPersonalQuery(numero_empleado=personal_id)

    personal = handler.handle(query)
    if not personal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Personal no encontrado: {personal_id}"
        )

    return PersonalResponse(**personal.to_dict())


@router.post("", response_model=PersonalResponse, status_code=status.HTTP_201_CREATED)
def crear_personal(
    request: CreatePersonalRequest,
    db: Session = Depends(get_db)
):
    """Crea un nuevo miembro del personal"""
    handler = get_create_personal_handler(db)
    command = CreatePersonalCommand(
        numero_empleado=request.numero_empleado,
        nombre=request.nombre,
        apellidos=request.apellidos,
        dni=request.dni,
        email=request.email,
        telefono=request.telefono,
        rol=request.rol,
        especialidad=request.especialidad,
        hospital_id=UUID(request.hospital_id) if request.hospital_id else None,
        unidad=request.unidad,
        fecha_alta=request.fecha_alta,
        acepta_refuerzos=request.acepta_refuerzos,
        horas_semanales_contrato=request.horas_semanales_contrato,
        en_lista_sergas=request.en_lista_sergas,
    )

    try:
        personal = handler.handle(command)
        return PersonalResponse(**personal.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.patch("/{personal_id}", response_model=PersonalResponse)
def actualizar_personal(
    personal_id: str,
    request: UpdatePersonalRequest,
    db: Session = Depends(get_db)
):
    """Actualiza un miembro del personal"""
    handler = get_update_personal_handler(db)
    command = UpdatePersonalCommand(
        personal_id=UUID(personal_id),
        nombre=request.nombre,
        apellidos=request.apellidos,
        email=request.email,
        telefono=request.telefono,
        rol=request.rol,
        especialidad=request.especialidad,
        hospital_id=UUID(request.hospital_id) if request.hospital_id else None,
        unidad=request.unidad,
        activo=request.activo,
        acepta_refuerzos=request.acepta_refuerzos,
        horas_semanales_contrato=request.horas_semanales_contrato,
    )

    personal = handler.handle(command)
    if not personal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Personal no encontrado: {personal_id}"
        )

    return PersonalResponse(**personal.to_dict())


@router.delete("/{personal_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_personal(
    personal_id: str,
    db: Session = Depends(get_db)
):
    """Elimina un miembro del personal"""
    handler = get_delete_personal_handler(db)
    command = DeletePersonalCommand(personal_id=UUID(personal_id))

    if not handler.handle(command):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Personal no encontrado: {personal_id}"
        )
