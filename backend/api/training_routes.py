"""
============================================================================
TRAINING ROUTES - Módulo de formación estilo Duolingo
============================================================================
Rutas para el sistema de lecciones, ejercicios, XP, vidas y rachas.
============================================================================
"""

import logging
from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import UUID
import random

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from common.models import get_session
from sqlalchemy import text
from .auth_routes import require_auth, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/training", tags=["Formación"])


# ============================================================================
# MODELOS
# ============================================================================

class ConstantesVitales(BaseModel):
    pa: Optional[str] = None
    fc: Optional[int] = None
    sato2: Optional[int] = None
    temp: Optional[float] = None

class ClinicalCase(BaseModel):
    case_id: str
    titulo: str
    descripcion: str
    paciente_edad: Optional[int]
    paciente_sexo: Optional[str]
    motivo_consulta: str
    sintomas: List[str]
    constantes_vitales: Optional[ConstantesVitales]
    antecedentes: Optional[str]

class ClinicalCaseWithAnswer(ClinicalCase):
    triaje_correcto: str
    explicacion: str

class LessonProgress(BaseModel):
    lesson_id: str
    codigo: str
    nombre: str
    descripcion: Optional[str]
    icono: str
    color: str
    orden: int
    ejercicios_requeridos: int
    xp_recompensa: int
    # Progreso del usuario
    ejercicios_completados: int = 0
    estrellas: int = 0
    completada: bool = False
    desbloqueada: bool = False

class SubmitAnswerRequest(BaseModel):
    case_id: str
    respuesta: str  # 'rojo', 'naranja', 'amarillo', 'verde', 'azul'
    tiempo_ms: Optional[int] = None

class SubmitAnswerResponse(BaseModel):
    es_correcta: bool
    respuesta_correcta: str
    explicacion: str
    xp_obtenido: int
    xp_total: int
    vidas_restantes: int
    racha_correctas: int
    badges_desbloqueados: List[str] = []

class UserStats(BaseModel):
    xp_total: int
    nivel: int
    racha_dias: int
    racha_max: int
    vidas: int
    ejercicios_hoy: int
    ejercicios_total: int
    precision: float
    lecciones_completadas: int

class DailyProgress(BaseModel):
    fecha: str
    ejercicios_completados: int
    xp_ganado: int
    racha_mantenida: bool


# ============================================================================
# HELPERS
# ============================================================================

def calcular_nivel(xp: int) -> int:
    """Calcula el nivel basado en XP total"""
    # Fórmula: cada nivel requiere más XP
    # Nivel 1: 0-99 XP, Nivel 2: 100-299 XP, etc.
    if xp < 100:
        return 1
    elif xp < 300:
        return 2
    elif xp < 600:
        return 3
    elif xp < 1000:
        return 4
    elif xp < 1500:
        return 5
    elif xp < 2500:
        return 6
    elif xp < 4000:
        return 7
    elif xp < 6000:
        return 8
    elif xp < 10000:
        return 9
    else:
        return 10 + (xp - 10000) // 5000


def actualizar_racha(session, user_id: str) -> int:
    """Actualiza la racha de días consecutivos"""
    hoy = date.today()
    ayer = hoy - timedelta(days=1)
    
    # Obtener última actividad
    result = session.execute(text("SELECT ultima_actividad, racha_dias, racha_max FROM users WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    row = result.fetchone()
    ultima_actividad = row[0]
    racha_actual = row[1]
    racha_max = row[2]
    
    if ultima_actividad == hoy:
        # Ya practicó hoy, no cambia nada
        return racha_actual
    elif ultima_actividad == ayer:
        # Continúa la racha
        nueva_racha = racha_actual + 1
    else:
        # Perdió la racha, empieza de nuevo
        nueva_racha = 1
    
    # Actualizar en BD
    nuevo_max = max(racha_max, nueva_racha)
    session.execute(text("""

        UPDATE users SET 
            racha_dias = :racha,
            racha_max = :max,
            ultima_actividad = :hoy
        WHERE user_id = :user_id
        """),
            {"racha": nueva_racha, "max": nuevo_max, "hoy": hoy, "user_id": user_id}
    )
    
    return nueva_racha


def verificar_badges(session, user_id: str, user_data: dict) -> List[str]:
    """Verifica y otorga badges que el usuario haya desbloqueado"""
    badges_nuevos = []
    
    # Obtener badges que el usuario NO tiene
    result = session.execute(text("""

        SELECT b.badge_id, b.codigo, b.criterio
        FROM badges b
        WHERE b.badge_id NOT IN (
            SELECT badge_id FROM user_badges WHERE user_id = :user_id
        )
        """),
            {"user_id": user_id}
    )
    
    for row in result.fetchall():
        badge_id, codigo, criterio = row
        desbloqueado = False
        
        if criterio.get("tipo") == "ejercicios":
            # Contar ejercicios totales
            count_result = session.execute(text("SELECT COUNT(*) FROM exercise_attempts WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            count = count_result.fetchone()[0]
            if count >= criterio.get("cantidad", 1):
                desbloqueado = True
        
        elif criterio.get("tipo") == "racha":
            if user_data.get("racha_dias", 0) >= criterio.get("dias", 3):
                desbloqueado = True
        
        elif criterio.get("tipo") == "xp":
            if user_data.get("xp_total", 0) >= criterio.get("cantidad", 500):
                desbloqueado = True
        
        elif criterio.get("tipo") == "leccion_completada":
            leccion_codigo = criterio.get("leccion")
            result_lesson = session.execute(text("""

                SELECT ul.completada FROM user_lessons ul
                JOIN lessons l ON ul.lesson_id = l.lesson_id
                WHERE ul.user_id = :user_id AND l.codigo = :codigo
                """),
            {"user_id": user_id, "codigo": leccion_codigo}
            )
            lesson_row = result_lesson.fetchone()
            if lesson_row and lesson_row[0]:
                desbloqueado = True
        
        if desbloqueado:
            session.execute(text("INSERT INTO user_badges (user_id, badge_id) VALUES (:user_id, :badge_id)"),
                {"user_id": user_id, "badge_id": badge_id}
            )
            badges_nuevos.append(codigo)
    
    return badges_nuevos


# ============================================================================
# ENDPOINTS - CURSOS
# ============================================================================

@router.get("/courses")
async def get_courses(user: dict = Depends(require_auth)):
    """
    Obtiene la lista de cursos disponibles con estadísticas de progreso.
    """
    user_id = user["user_id"]
    
    COURSE_NAMES = {
        'triaje': 'Triaje Manchester',
        'rcp': 'RCP y Soporte Vital',
        'pediatria': 'Urgencias Pediátricas',
        'farmacologia': 'Farmacología de Urgencias',
        'trauma': 'Trauma y Politraumatismo',
        'ecg': 'ECG en Urgencias'
    }
    
    with get_session() as session:
        result = session.execute(text("""
            SELECT 
                COALESCE(l.curso, 'triaje') as curso,
                COUNT(l.lesson_id) as total_lecciones,
                COUNT(CASE WHEN ul.completada = true THEN 1 END) as completadas
            FROM lessons l
            LEFT JOIN user_lessons ul ON l.lesson_id = ul.lesson_id AND ul.user_id = :user_id
            GROUP BY COALESCE(l.curso, 'triaje')
            ORDER BY 
                CASE COALESCE(l.curso, 'triaje')
                    WHEN 'triaje' THEN 1
                    WHEN 'rcp' THEN 2
                    WHEN 'pediatria' THEN 3
                    WHEN 'farmacologia' THEN 4
                    WHEN 'trauma' THEN 5
                    WHEN 'ecg' THEN 6
                    ELSE 99
                END
        """), {"user_id": user_id})
        
        courses = []
        for row in result.fetchall():
            codigo = row[0]
            courses.append({
                "curso": codigo,
                "nombre": COURSE_NAMES.get(codigo, codigo.title()),
                "total_lecciones": row[1],
                "completadas": row[2]
            })
        
        return courses


# ============================================================================
# ENDPOINTS - LECCIONES
# ============================================================================

@router.get("/lessons", response_model=List[LessonProgress])
async def get_lessons(
    curso: str = Query(None, description="Filtrar por curso"),
    user: dict = Depends(require_auth)
):
    """
    Obtiene el árbol de lecciones con el progreso del usuario.
    Las lecciones bloqueadas se indican con desbloqueada=False.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        # Construir query con filtro opcional de curso
        query = """
            SELECT 
                l.lesson_id, l.codigo, l.nombre, l.descripcion, l.icono, l.color,
                l.orden, l.ejercicios_requeridos, l.xp_recompensa, l.lesson_prerequisito,
                COALESCE(ul.ejercicios_completados, 0) as ejercicios_completados,
                COALESCE(ul.estrellas, 0) as estrellas,
                COALESCE(ul.completada, false) as completada
            FROM lessons l
            LEFT JOIN user_lessons ul ON l.lesson_id = ul.lesson_id AND ul.user_id = :user_id
        """
        
        params = {"user_id": user_id}
        
        if curso:
            query += " WHERE COALESCE(l.curso, 'triaje') = :curso"
            params["curso"] = curso
        
        query += " ORDER BY l.orden"
        
        result = session.execute(text(query), params)
        
        lessons = []
        completadas = set()
        
        for row in result.fetchall():
            lesson_id = str(row[0])
            prerequisito_id = str(row[9]) if row[9] else None
            completada = row[12]
            
            # Determinar si está desbloqueada
            # Primera lección siempre desbloqueada, las demás necesitan prerequisito completado
            if prerequisito_id is None:
                desbloqueada = True
            else:
                desbloqueada = prerequisito_id in completadas
            
            if completada:
                completadas.add(lesson_id)
            
            lessons.append(LessonProgress(
                lesson_id=lesson_id,
                codigo=row[1],
                nombre=row[2],
                descripcion=row[3],
                icono=row[4],
                color=row[5],
                orden=row[6],
                ejercicios_requeridos=row[7],
                xp_recompensa=row[8],
                ejercicios_completados=row[10],
                estrellas=row[11],
                completada=completada,
                desbloqueada=desbloqueada
            ))
        
        return lessons


@router.get("/lessons/{lesson_id}/exercises", response_model=List[ClinicalCase])
async def get_lesson_exercises(
    lesson_id: str,
    limit: int = Query(10, ge=1, le=20),
    user: dict = Depends(require_auth)
):
    """
    Obtiene ejercicios (casos clínicos) para una lección.
    No incluye la respuesta correcta para evitar trampas.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        # Verificar que la lección existe y está desbloqueada
        result = session.execute(text("""

            SELECT l.lesson_id, l.lesson_prerequisito
            FROM lessons l
            WHERE l.lesson_id = :lesson_id
            """),
            {"lesson_id": lesson_id}
        )
        lesson_row = result.fetchone()
        if not lesson_row:
            raise HTTPException(status_code=404, detail="Lección no encontrada")
        
        prereq_id = lesson_row[1]
        if prereq_id:
            # Verificar que el prerequisito está completado
            prereq_result = session.execute(text("""

                SELECT completada FROM user_lessons
                WHERE user_id = :user_id AND lesson_id = :prereq_id
                """),
            {"user_id": user_id, "prereq_id": prereq_id}
            )
            prereq_row = prereq_result.fetchone()
            if not prereq_row or not prereq_row[0]:
                raise HTTPException(status_code=403, detail="Lección bloqueada")
        
        # Obtener casos clínicos de la lección
        result = session.execute(text("""

            SELECT case_id, titulo, descripcion, paciente_edad, paciente_sexo,
                   motivo_consulta, sintomas, constantes_vitales, antecedentes
            FROM clinical_cases
            WHERE lesson_id = :lesson_id
            ORDER BY RANDOM()
            LIMIT :limit
            """),
            {"lesson_id": lesson_id, "limit": limit}
        )
        
        cases = []
        for row in result.fetchall():
            constantes = None
            if row[7]:
                constantes = ConstantesVitales(**row[7])
            
            cases.append(ClinicalCase(
                case_id=str(row[0]),
                titulo=row[1],
                descripcion=row[2],
                paciente_edad=row[3],
                paciente_sexo=row[4],
                motivo_consulta=row[5],
                sintomas=row[6] if isinstance(row[6], list) else [],
                constantes_vitales=constantes,
                antecedentes=row[8]
            ))
        
        return cases


# ============================================================================
# ENDPOINTS - EJERCICIOS
# ============================================================================

@router.post("/exercises/submit", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    user: dict = Depends(require_auth)
):
    """
    Envía una respuesta a un ejercicio.
    Actualiza XP, vidas y racha según el resultado.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        # Verificar vidas
        result = session.execute(text("SELECT vidas, xp_total FROM users WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
        vidas = user_row[0]
        xp_actual = user_row[1]
        
        if vidas <= 0:
            raise HTTPException(
                status_code=403, 
                detail="No tienes vidas. Espera a que se regeneren."
            )
        
        # Obtener el caso clínico
        result = session.execute(text("""

            SELECT case_id, lesson_id, triaje_correcto, explicacion, xp_base
            FROM clinical_cases
            WHERE case_id = :case_id
            """),
            {"case_id": request.case_id}
        )
        case_row = result.fetchone()
        if not case_row:
            raise HTTPException(status_code=404, detail="Caso no encontrado")
        
        case_id = case_row[0]
        lesson_id = case_row[1]
        triaje_correcto = case_row[2]
        explicacion = case_row[3]
        xp_base = case_row[4]
        
        # Verificar respuesta
        es_correcta = request.respuesta.lower() == triaje_correcto.lower()
        
        # Calcular XP
        xp_obtenido = 0
        if es_correcta:
            xp_obtenido = xp_base
            # Bonus por velocidad
            if request.tiempo_ms and request.tiempo_ms < 10000:
                xp_obtenido += 5
            if request.tiempo_ms and request.tiempo_ms < 5000:
                xp_obtenido += 5
        
        # Actualizar vidas (solo pierde si falla)
        nuevas_vidas = vidas
        if not es_correcta:
            nuevas_vidas = max(0, vidas - 1)
        
        # Actualizar XP
        nuevo_xp = xp_actual + xp_obtenido
        nuevo_nivel = calcular_nivel(nuevo_xp)
        
        # Actualizar usuario
        session.execute(text("""

            UPDATE users SET
                xp_total = :xp,
                nivel = :nivel,
                vidas = :vidas
            WHERE user_id = :user_id
            """),
            {"xp": nuevo_xp, "nivel": nuevo_nivel, "vidas": nuevas_vidas, "user_id": user_id}
        )
        
        # Registrar intento
        session.execute(text("""

            INSERT INTO exercise_attempts 
            (user_id, case_id, lesson_id, respuesta_usuario, es_correcta, tiempo_ms, xp_obtenido)
            VALUES (:user_id, :case_id, :lesson_id, :respuesta, :correcta, :tiempo, :xp)
            """),
            {
                "user_id": user_id,
                "case_id": case_id,
                "lesson_id": lesson_id,
                "respuesta": request.respuesta,
                "correcta": es_correcta,
                "tiempo": request.tiempo_ms,
                "xp": xp_obtenido
            }
        )
        
        # Actualizar progreso de lección
        session.execute(text("""

            INSERT INTO user_lessons (user_id, lesson_id, ejercicios_completados)
            VALUES (:user_id, :lesson_id, 1)
            ON CONFLICT (user_id, lesson_id) 
            DO UPDATE SET ejercicios_completados = user_lessons.ejercicios_completados + 1
            """),
            {"user_id": user_id, "lesson_id": lesson_id}
        )
        
        # Verificar si completó la lección
        result = session.execute(text("""

            SELECT ul.ejercicios_completados, l.ejercicios_requeridos
            FROM user_lessons ul
            JOIN lessons l ON ul.lesson_id = l.lesson_id
            WHERE ul.user_id = :user_id AND ul.lesson_id = :lesson_id
            """),
            {"user_id": user_id, "lesson_id": lesson_id}
        )
        progress_row = result.fetchone()
        if progress_row and progress_row[0] >= progress_row[1]:
            session.execute(text("""

                UPDATE user_lessons SET completada = true, completed_at = NOW()
                WHERE user_id = :user_id AND lesson_id = :lesson_id
                """),
            {"user_id": user_id, "lesson_id": lesson_id}
            )
        
        # Actualizar progreso diario
        session.execute(text("""

            INSERT INTO user_daily_progress (user_id, fecha, ejercicios_completados, xp_ganado)
            VALUES (:user_id, CURRENT_DATE, 1, :xp)
            ON CONFLICT (user_id, fecha)
            DO UPDATE SET 
                ejercicios_completados = user_daily_progress.ejercicios_completados + 1,
                xp_ganado = user_daily_progress.xp_ganado + :xp
            """),
            {"user_id": user_id, "xp": xp_obtenido}
        )
        
        # Actualizar racha
        racha = actualizar_racha(session, user_id)
        
        # Contar racha de respuestas correctas consecutivas
        result = session.execute(text("""

            SELECT es_correcta FROM exercise_attempts
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 20
            """),
            {"user_id": user_id}
        )
        racha_correctas = 0
        for row in result.fetchall():
            if row[0]:
                racha_correctas += 1
            else:
                break
        
        # Verificar badges
        user_data = {
            "xp_total": nuevo_xp,
            "racha_dias": racha
        }
        badges_nuevos = verificar_badges(session, user_id, user_data)
        
        session.commit()
        
        return SubmitAnswerResponse(
            es_correcta=es_correcta,
            respuesta_correcta=triaje_correcto,
            explicacion=explicacion,
            xp_obtenido=xp_obtenido,
            xp_total=nuevo_xp,
            vidas_restantes=nuevas_vidas,
            racha_correctas=racha_correctas,
            badges_desbloqueados=badges_nuevos
        )


# ============================================================================
# ENDPOINTS - ESTADÍSTICAS
# ============================================================================

@router.get("/stats", response_model=UserStats)
async def get_user_stats(user: dict = Depends(require_auth)):
    """
    Obtiene estadísticas detalladas del usuario.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        # Datos básicos del usuario
        result = session.execute(text("SELECT xp_total, nivel, racha_dias, racha_max, vidas FROM users WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
        
        # Ejercicios de hoy
        result = session.execute(text("""

            SELECT COALESCE(ejercicios_completados, 0) 
            FROM user_daily_progress 
            WHERE user_id = :user_id AND fecha = CURRENT_DATE
            """),
            {"user_id": user_id}
        )
        hoy_row = result.fetchone()
        ejercicios_hoy = hoy_row[0] if hoy_row else 0
        
        # Total de ejercicios y precisión
        result = session.execute(text("""

            SELECT COUNT(*), SUM(CASE WHEN es_correcta THEN 1 ELSE 0 END)
            FROM exercise_attempts
            WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )
        stats_row = result.fetchone()
        ejercicios_total = stats_row[0] or 0
        correctas = stats_row[1] or 0
        precision = (correctas / ejercicios_total * 100) if ejercicios_total > 0 else 0.0
        
        # Lecciones completadas
        result = session.execute(text("SELECT COUNT(*) FROM user_lessons WHERE user_id = :user_id AND completada = true"),
            {"user_id": user_id}
        )
        lecciones_completadas = result.fetchone()[0]
        
        return UserStats(
            xp_total=user_row[0],
            nivel=user_row[1],
            racha_dias=user_row[2],
            racha_max=user_row[3],
            vidas=user_row[4],
            ejercicios_hoy=ejercicios_hoy,
            ejercicios_total=ejercicios_total,
            precision=round(precision, 1),
            lecciones_completadas=lecciones_completadas
        )


@router.post("/restore-life")
async def restore_life(user: dict = Depends(require_auth)):
    """
    Restaura una vida (máximo 5).
    En producción, esto debería tener un cooldown.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        result = session.execute(text("SELECT vidas FROM users WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        vidas = result.fetchone()[0]
        
        if vidas >= 5:
            return {"message": "Ya tienes todas las vidas", "vidas": 5}
        
        nuevas_vidas = vidas + 1
        session.execute(text("UPDATE users SET vidas = :vidas WHERE user_id = :user_id"),
            {"vidas": nuevas_vidas, "user_id": user_id}
        )
        session.commit()
        
        return {"message": "Vida restaurada", "vidas": nuevas_vidas}


@router.get("/daily")
async def get_daily_challenge(user: dict = Depends(require_auth)):
    """
    Obtiene el reto diario.
    """
    with get_session() as session:
        # Buscar reto de hoy
        result = session.execute(text("SELECT challenge_id, casos_ids, xp_bonus FROM daily_challenges WHERE fecha = CURRENT_DATE")
        )
        challenge = result.fetchone()
        
        if not challenge:
            # Crear reto diario con casos aleatorios
            result = session.execute(text("SELECT case_id FROM clinical_cases ORDER BY RANDOM() LIMIT 5")
            )
            casos = [str(row[0]) for row in result.fetchall()]
            
            result = session.execute(text("""

                INSERT INTO daily_challenges (fecha, casos_ids, xp_bonus)
                VALUES (CURRENT_DATE, :casos, 50)
                RETURNING challenge_id, casos_ids, xp_bonus
                """),
            {"casos": casos}
            )
            challenge = result.fetchone()
            session.commit()
        
        return {
            "challenge_id": str(challenge[0]),
            "casos_count": len(challenge[1]) if challenge[1] else 0,
            "xp_bonus": challenge[2]
        }
