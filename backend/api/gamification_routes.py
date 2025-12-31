"""
============================================================================
GAMIFICATION ROUTES - Sistema de badges, leaderboard y perfil
============================================================================
Rutas para gamificación: badges, rankings y perfiles públicos.
============================================================================
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from common.models import get_session
from sqlalchemy import text
from .auth_routes import require_auth, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gamification", tags=["Gamificación"])


# ============================================================================
# MODELOS
# ============================================================================

class Badge(BaseModel):
    badge_id: str
    codigo: str
    nombre: str
    descripcion: Optional[str]
    icono: str
    color: str
    obtenido: bool = False
    obtenido_en: Optional[str] = None

class UserProfile(BaseModel):
    user_id: str
    nombre: str
    apellidos: Optional[str]
    avatar_url: Optional[str]
    xp_total: int
    nivel: int
    racha_dias: int
    racha_max: int
    badges: List[Badge]
    lecciones_completadas: int
    ejercicios_total: int
    precision: float

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    nombre: str
    avatar_url: Optional[str]
    xp_total: int
    nivel: int
    racha_dias: int
    badges_count: int

class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
    user_rank: Optional[int] = None
    total_users: int


# ============================================================================
# ENDPOINTS - BADGES
# ============================================================================

@router.get("/badges", response_model=List[Badge])
async def get_all_badges(user: dict = Depends(require_auth)):
    """
    Obtiene todos los badges disponibles con indicación de cuáles tiene el usuario.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        result = session.execute(text("""

            SELECT 
                b.badge_id, b.codigo, b.nombre, b.descripcion, b.icono, b.color,
                ub.obtenido_en IS NOT NULL as obtenido,
                ub.obtenido_en
            FROM badges b
            LEFT JOIN user_badges ub ON b.badge_id = ub.badge_id AND ub.user_id = :user_id
            ORDER BY b.codigo
            """),
            {"user_id": user_id}
        )
        
        badges = []
        for row in result.fetchall():
            badges.append(Badge(
                badge_id=str(row[0]),
                codigo=row[1],
                nombre=row[2],
                descripcion=row[3],
                icono=row[4],
                color=row[5],
                obtenido=row[6],
                obtenido_en=row[7].isoformat() if row[7] else None
            ))
        
        return badges


@router.get("/badges/user", response_model=List[Badge])
async def get_user_badges(user: dict = Depends(require_auth)):
    """
    Obtiene solo los badges que el usuario ha desbloqueado.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        result = session.execute(text("""

            SELECT 
                b.badge_id, b.codigo, b.nombre, b.descripcion, b.icono, b.color,
                ub.obtenido_en
            FROM badges b
            INNER JOIN user_badges ub ON b.badge_id = ub.badge_id
            WHERE ub.user_id = :user_id
            ORDER BY ub.obtenido_en DESC
            """),
            {"user_id": user_id}
        )
        
        badges = []
        for row in result.fetchall():
            badges.append(Badge(
                badge_id=str(row[0]),
                codigo=row[1],
                nombre=row[2],
                descripcion=row[3],
                icono=row[4],
                color=row[5],
                obtenido=True,
                obtenido_en=row[6].isoformat() if row[6] else None
            ))
        
        return badges


# ============================================================================
# ENDPOINTS - PERFIL
# ============================================================================

@router.get("/profile", response_model=UserProfile)
async def get_my_profile(user: dict = Depends(require_auth)):
    """
    Obtiene el perfil completo del usuario actual.
    """
    user_id = user["user_id"]
    
    with get_session() as session:
        # Datos del usuario
        result = session.execute(text("""

            SELECT user_id, nombre, apellidos, avatar_url, xp_total, nivel, racha_dias, racha_max
            FROM users WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
        
        # Badges del usuario
        result = session.execute(text("""

            SELECT b.badge_id, b.codigo, b.nombre, b.descripcion, b.icono, b.color, ub.obtenido_en
            FROM badges b
            INNER JOIN user_badges ub ON b.badge_id = ub.badge_id
            WHERE ub.user_id = :user_id
            """),
            {"user_id": user_id}
        )
        badges = [
            Badge(
                badge_id=str(row[0]),
                codigo=row[1],
                nombre=row[2],
                descripcion=row[3],
                icono=row[4],
                color=row[5],
                obtenido=True,
                obtenido_en=row[6].isoformat() if row[6] else None
            )
            for row in result.fetchall()
        ]
        
        # Lecciones completadas
        result = session.execute(text("SELECT COUNT(*) FROM user_lessons WHERE user_id = :user_id AND completada = true"),
            {"user_id": user_id}
        )
        lecciones_completadas = result.fetchone()[0]
        
        # Estadísticas de ejercicios
        result = session.execute(text("""

            SELECT COUNT(*), SUM(CASE WHEN es_correcta THEN 1 ELSE 0 END)
            FROM exercise_attempts WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )
        stats = result.fetchone()
        ejercicios_total = stats[0] or 0
        correctas = stats[1] or 0
        precision = (correctas / ejercicios_total * 100) if ejercicios_total > 0 else 0.0
        
        return UserProfile(
            user_id=str(user_row[0]),
            nombre=user_row[1],
            apellidos=user_row[2],
            avatar_url=user_row[3],
            xp_total=user_row[4],
            nivel=user_row[5],
            racha_dias=user_row[6],
            racha_max=user_row[7],
            badges=badges,
            lecciones_completadas=lecciones_completadas,
            ejercicios_total=ejercicios_total,
            precision=round(precision, 1)
        )


@router.get("/profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """
    Obtiene el perfil público de un usuario.
    """
    with get_session() as session:
        result = session.execute(text("""

            SELECT user_id, nombre, apellidos, avatar_url, xp_total, nivel, racha_dias, racha_max
            FROM users WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
        
        if not user_row:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Badges del usuario
        result = session.execute(text("""

            SELECT b.badge_id, b.codigo, b.nombre, b.descripcion, b.icono, b.color, ub.obtenido_en
            FROM badges b
            INNER JOIN user_badges ub ON b.badge_id = ub.badge_id
            WHERE ub.user_id = :user_id
            """),
            {"user_id": user_id}
        )
        badges = [
            Badge(
                badge_id=str(row[0]),
                codigo=row[1],
                nombre=row[2],
                descripcion=row[3],
                icono=row[4],
                color=row[5],
                obtenido=True,
                obtenido_en=row[6].isoformat() if row[6] else None
            )
            for row in result.fetchall()
        ]
        
        # Lecciones completadas
        result = session.execute(text("SELECT COUNT(*) FROM user_lessons WHERE user_id = :user_id AND completada = true"),
            {"user_id": user_id}
        )
        lecciones_completadas = result.fetchone()[0]
        
        # Estadísticas
        result = session.execute(text("""

            SELECT COUNT(*), SUM(CASE WHEN es_correcta THEN 1 ELSE 0 END)
            FROM exercise_attempts WHERE user_id = :user_id
            """),
            {"user_id": user_id}
        )
        stats = result.fetchone()
        ejercicios_total = stats[0] or 0
        correctas = stats[1] or 0
        precision = (correctas / ejercicios_total * 100) if ejercicios_total > 0 else 0.0
        
        return UserProfile(
            user_id=str(user_row[0]),
            nombre=user_row[1],
            apellidos=user_row[2],
            avatar_url=user_row[3],
            xp_total=user_row[4],
            nivel=user_row[5],
            racha_dias=user_row[6],
            racha_max=user_row[7],
            badges=badges,
            lecciones_completadas=lecciones_completadas,
            ejercicios_total=ejercicios_total,
            precision=round(precision, 1)
        )


# ============================================================================
# ENDPOINTS - LEADERBOARD
# ============================================================================

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    limit: int = Query(50, ge=10, le=100),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Obtiene el ranking global de usuarios por XP total.
    """
    with get_session() as session:
        # Obtener top usuarios
        result = session.execute(text("""

            SELECT 
                u.user_id, u.nombre, u.avatar_url, u.xp_total, u.nivel, u.racha_dias,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = u.user_id) as badges_count
            FROM users u
            ORDER BY u.xp_total DESC
            LIMIT :limit
            """),
            {"limit": limit}
        )
        
        entries = []
        for i, row in enumerate(result.fetchall(), 1):
            entries.append(LeaderboardEntry(
                rank=i,
                user_id=str(row[0]),
                nombre=row[1],
                avatar_url=row[2],
                xp_total=row[3],
                nivel=row[4],
                racha_dias=row[5],
                badges_count=row[6]
            ))
        
        # Obtener ranking del usuario actual
        user_rank = None
        if user:
            result = session.execute(text("""

                SELECT rank FROM (
                    SELECT user_id, RANK() OVER (ORDER BY xp_total DESC) as rank
                    FROM users
                ) ranked
                WHERE user_id = :user_id
                """),
            {"user_id": user["user_id"]}
            )
            rank_row = result.fetchone()
            if rank_row:
                user_rank = rank_row[0]
        
        # Total de usuarios
        result = session.execute(text("SELECT COUNT(*) FROM users"))
        total_users = result.fetchone()[0]
        
        return LeaderboardResponse(
            entries=entries,
            user_rank=user_rank,
            total_users=total_users
        )


@router.get("/leaderboard/weekly", response_model=LeaderboardResponse)
async def get_weekly_leaderboard(
    limit: int = Query(50, ge=10, le=100),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Obtiene el ranking semanal de usuarios por XP ganado esta semana.
    """
    with get_session() as session:
        # Obtener top usuarios de la semana
        result = session.execute(text("""

            SELECT 
                u.user_id, u.nombre, u.avatar_url, 
                COALESCE(SUM(udp.xp_ganado), 0) as xp_semanal,
                u.nivel, u.racha_dias,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = u.user_id) as badges_count
            FROM users u
            LEFT JOIN user_daily_progress udp ON u.user_id = udp.user_id 
                AND udp.fecha >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY u.user_id, u.nombre, u.avatar_url, u.nivel, u.racha_dias
            ORDER BY xp_semanal DESC
            LIMIT :limit
            """),
            {"limit": limit}
        )
        
        entries = []
        for i, row in enumerate(result.fetchall(), 1):
            entries.append(LeaderboardEntry(
                rank=i,
                user_id=str(row[0]),
                nombre=row[1],
                avatar_url=row[2],
                xp_total=row[3],  # En este caso es XP semanal
                nivel=row[4],
                racha_dias=row[5],
                badges_count=row[6]
            ))
        
        # Obtener ranking del usuario actual
        user_rank = None
        if user:
            result = session.execute(text("""

                SELECT rank FROM (
                    SELECT 
                        u.user_id,
                        RANK() OVER (ORDER BY COALESCE(SUM(udp.xp_ganado), 0) DESC) as rank
                    FROM users u
                    LEFT JOIN user_daily_progress udp ON u.user_id = udp.user_id 
                        AND udp.fecha >= CURRENT_DATE - INTERVAL '7 days'
                    GROUP BY u.user_id
                ) ranked
                WHERE user_id = :user_id
                """),
            {"user_id": user["user_id"]}
            )
            rank_row = result.fetchone()
            if rank_row:
                user_rank = rank_row[0]
        
        # Total de usuarios
        result = session.execute(text("SELECT COUNT(*) FROM users"))
        total_users = result.fetchone()[0]
        
        return LeaderboardResponse(
            entries=entries,
            user_rank=user_rank,
            total_users=total_users
        )


@router.get("/leaderboard/streak", response_model=LeaderboardResponse)
async def get_streak_leaderboard(
    limit: int = Query(50, ge=10, le=100),
    user: Optional[dict] = Depends(get_current_user)
):
    """
    Obtiene el ranking de usuarios por racha de días más larga.
    """
    with get_session() as session:
        result = session.execute(text("""

            SELECT 
                u.user_id, u.nombre, u.avatar_url, u.xp_total, u.nivel, u.racha_dias,
                (SELECT COUNT(*) FROM user_badges WHERE user_id = u.user_id) as badges_count
            FROM users u
            ORDER BY u.racha_dias DESC, u.xp_total DESC
            LIMIT :limit
            """),
            {"limit": limit}
        )
        
        entries = []
        for i, row in enumerate(result.fetchall(), 1):
            entries.append(LeaderboardEntry(
                rank=i,
                user_id=str(row[0]),
                nombre=row[1],
                avatar_url=row[2],
                xp_total=row[3],
                nivel=row[4],
                racha_dias=row[5],
                badges_count=row[6]
            ))
        
        user_rank = None
        if user:
            result = session.execute(text("""

                SELECT rank FROM (
                    SELECT user_id, RANK() OVER (ORDER BY racha_dias DESC, xp_total DESC) as rank
                    FROM users
                ) ranked
                WHERE user_id = :user_id
                """),
            {"user_id": user["user_id"]}
            )
            rank_row = result.fetchone()
            if rank_row:
                user_rank = rank_row[0]
        
        result = session.execute(text("SELECT COUNT(*) FROM users"))
        total_users = result.fetchone()[0]
        
        return LeaderboardResponse(
            entries=entries,
            user_rank=user_rank,
            total_users=total_users
        )
