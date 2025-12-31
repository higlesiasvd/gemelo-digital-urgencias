"""
============================================================================
AUTH ROUTES - Autenticación OAuth con Google + Email Tradicional
============================================================================
Sistema de autenticación para el módulo de formación gamificada.
Soporta Google OAuth y registro tradicional con email/contraseña.
============================================================================
"""

import os
import logging
import re
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, HTTPException, Depends, Query, Response, Cookie, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, validator
import jwt
from passlib.context import CryptContext

from common.models import get_session
from sqlalchemy import text
from backend.api.email_service import (
    generate_verification_token,
    get_token_expiry,
    send_verification_email,
    send_welcome_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3003/auth/callback")
JWT_SECRET = os.getenv("JWT_SECRET", "tu-secreto-jwt-muy-seguro-cambiar-en-produccion")
JWT_EXPIRATION_DAYS = 7
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3003")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# MODELOS
# ============================================================================

class UserResponse(BaseModel):
    user_id: str
    email: str
    nombre: str
    apellidos: Optional[str]
    avatar_url: Optional[str]
    rol: str
    xp_total: int
    nivel: int
    racha_dias: int
    racha_max: int
    vidas: int

class AuthStatus(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    apellidos: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('La contraseña debe tener al menos una mayúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('La contraseña debe tener al menos una minúscula')
        if not re.search(r'[0-9]', v):
            raise ValueError('La contraseña debe tener al menos un número')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class MessageResponse(BaseModel):
    message: str
    success: bool = True


# ============================================================================
# HELPERS
# ============================================================================

def create_jwt_token(user_id: str, email: str) -> str:
    """Crea un token JWT para el usuario"""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_jwt_token(token: str) -> Optional[dict]:
    """Verifica y decodifica un token JWT"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def hash_password(password: str) -> str:
    """Hash de contraseña con bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña contra su hash"""
    return pwd_context.verify(plain_password, hashed_password)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    auth_token: Optional[str] = Cookie(None)
) -> Optional[dict]:
    """Obtiene el usuario actual del token JWT"""
    token = None
    
    # Intentar obtener token del header Authorization
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    # O de la cookie
    elif auth_token:
        token = auth_token
    
    if not token:
        return None
    
    payload = verify_jwt_token(token)
    if not payload:
        return None
    
    # Obtener usuario de la base de datos
    with get_session() as session:
        result = session.execute(text(
            "SELECT user_id, email, nombre, apellidos, avatar_url, rol, "
            "xp_total, nivel, racha_dias, racha_max, vidas "
            "FROM users WHERE user_id = :user_id"), {"user_id": payload["user_id"]}
        )
        row = result.fetchone()
        if row:
            return {
                "user_id": str(row[0]),
                "email": row[1],
                "nombre": row[2],
                "apellidos": row[3],
                "avatar_url": row[4],
                "rol": row[5],
                "xp_total": row[6],
                "nivel": row[7],
                "racha_dias": row[8],
                "racha_max": row[9],
                "vidas": row[10]
            }
    return None


def require_auth(user: Optional[dict] = Depends(get_current_user)):
    """Dependency que requiere autenticación"""
    if not user:
        raise HTTPException(status_code=401, detail="No autenticado")
    return user


# ============================================================================
# ENDPOINTS - REGISTRO Y LOGIN CON EMAIL
# ============================================================================

@router.post("/register", response_model=MessageResponse)
async def register(request: RegisterRequest):
    """
    Registra un nuevo usuario con email y contraseña.
    """
    with get_session() as session:
        # Verificar si el email ya existe
        result = session.execute(text(
            "SELECT user_id, email_verified, oauth_provider FROM users WHERE email = :email"), {"email": request.email}
        )
        existing = result.fetchone()
        
        if existing:
            if existing[2] == 'google':
                raise HTTPException(
                    status_code=400, 
                    detail="Este email ya está registrado con Google. Usa el botón de Google para iniciar sesión."
                )
            raise HTTPException(status_code=400, detail="Este email ya está registrado")
        
        # Crear usuario (email_verified = true para saltar verificación)
        password_hash = hash_password(request.password)
        session.execute(text(
            """
            INSERT INTO users (oauth_provider, email, nombre, apellidos, password_hash, email_verified)
            VALUES ('email', :email, :nombre, :apellidos, :password_hash, true)
            """), {
                "email": request.email,
                "nombre": request.nombre,
                "apellidos": request.apellidos,
                "password_hash": password_hash
            }
        )
        session.commit()
    
    return MessageResponse(
        message="¡Registro exitoso! Ya puedes iniciar sesión.",
        success=True
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Inicia sesión con email y contraseña.
    Requiere email verificado.
    """
    with get_session() as session:
        result = session.execute(text(
            """
            SELECT user_id, email, nombre, apellidos, avatar_url, rol, 
                   xp_total, nivel, racha_dias, racha_max, vidas,
                   password_hash, email_verified, oauth_provider
            FROM users WHERE email = :email
            """), {"email": request.email}
        )
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        
        # Verificar que no sea usuario OAuth
        if row[13] == 'google':
            raise HTTPException(
                status_code=400,
                detail="Este email está registrado con Google. Usa el botón de Google para iniciar sesión."
            )
        
        # Verificar contraseña
        if not row[11] or not verify_password(request.password, row[11]):
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        
        # Verificar que el email esté verificado
        if not row[12]:
            raise HTTPException(
                status_code=403, 
                detail="Por favor, verifica tu email antes de iniciar sesión"
            )
        
        user_id = str(row[0])
        
        # Actualizar último login
        session.execute(text(
            "UPDATE users SET last_login = NOW() WHERE user_id = :user_id"), {"user_id": user_id}
        )
        session.commit()
    
    # Crear JWT
    jwt_token = create_jwt_token(user_id, request.email)
    
    return TokenResponse(
        access_token=jwt_token,
        user=UserResponse(
            user_id=user_id,
            email=row[1],
            nombre=row[2],
            apellidos=row[3],
            avatar_url=row[4],
            rol=row[5],
            xp_total=row[6],
            nivel=row[7],
            racha_dias=row[8],
            racha_max=row[9],
            vidas=row[10]
        )
    )


@router.get("/verify-email", response_model=MessageResponse)
async def verify_email(token: str = Query(..., description="Token de verificación")):
    """
    Verifica el email del usuario con el token.
    """
    with get_session() as session:
        # Buscar token válido
        result = session.execute(text(
            """
            SELECT t.user_id, t.expires_at, t.used, u.email, u.nombre
            FROM email_verification_tokens t
            JOIN users u ON t.user_id = u.user_id
            WHERE t.token = :token
            """), {"token": token}
        )
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=400, detail="Token de verificación inválido")
        
        user_id, expires_at, used, email, nombre = row
        
        if used:
            raise HTTPException(status_code=400, detail="Este token ya ha sido usado")
        
        if datetime.utcnow() > expires_at:
            raise HTTPException(
                status_code=400, 
                detail="El token ha expirado. Solicita un nuevo email de verificación."
            )
        
        # Marcar email como verificado
        session.execute(text(
            "UPDATE users SET email_verified = true WHERE user_id = :user_id"), {"user_id": user_id}
        )
        
        # Marcar token como usado
        session.execute(text(
            "UPDATE email_verification_tokens SET used = true WHERE token = :token"), {"token": token}
        )
        session.commit()
    
    # Enviar email de bienvenida
    await send_welcome_email(email, nombre)
    
    return MessageResponse(
        message="¡Email verificado correctamente! Ya puedes iniciar sesión.",
        success=True
    )


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(request: ResendVerificationRequest):
    """
    Reenvía el email de verificación.
    """
    with get_session() as session:
        result = session.execute(text(
            "SELECT user_id, nombre, email_verified FROM users WHERE email = :email"), {"email": request.email}
        )
        row = result.fetchone()
        
        if not row:
            # No revelar si el email existe o no
            return MessageResponse(
                message="Si el email existe, recibirás un nuevo enlace de verificación.",
                success=True
            )
        
        user_id, nombre, email_verified = row
        
        if email_verified:
            return MessageResponse(
                message="Este email ya está verificado. Puedes iniciar sesión.",
                success=True
            )
        
        # Invalidar tokens anteriores
        session.execute(text(
            "UPDATE email_verification_tokens SET used = true WHERE user_id = :user_id AND used = false"), {"user_id": user_id}
        )
        
        # Crear nuevo token
        token = generate_verification_token()
        expires_at = get_token_expiry()
        session.execute(text(
            """
            INSERT INTO email_verification_tokens (user_id, token, expires_at)
            VALUES (:user_id, :token, :expires_at)
            """), {"user_id": user_id, "token": token, "expires_at": expires_at}
        )
        session.commit()
    
    # Enviar email
    await send_verification_email(request.email, nombre, token)
    
    return MessageResponse(
        message="Si el email existe, recibirás un nuevo enlace de verificación.",
        success=True
    )


# ============================================================================
# ENDPOINTS - GOOGLE OAUTH
# ============================================================================

@router.get("/google")
async def google_login():
    """
    Inicia el flujo de autenticación con Google OAuth.
    Redirige al usuario a la página de login de Google.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500, 
            detail="Google OAuth no configurado. Configura GOOGLE_CLIENT_ID"
        )
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?" + "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(..., description="Código de autorización de Google"),
    response: Response = None
):
    """
    Callback de Google OAuth.
    Intercambia el código por un token, obtiene información del usuario,
    crea o actualiza el usuario en la BD, y devuelve un JWT.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth no configurado")
    
    async with httpx.AsyncClient() as client:
        # Intercambiar código por token de acceso
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code"
            }
        )
        
        if token_response.status_code != 200:
            logger.error(f"Error obteniendo token de Google: {token_response.text}")
            raise HTTPException(status_code=400, detail="Error obteniendo token de Google")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        # Obtener información del usuario de Google
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            logger.error(f"Error obteniendo userinfo: {userinfo_response.text}")
            raise HTTPException(status_code=400, detail="Error obteniendo información del usuario")
        
        google_user = userinfo_response.json()
    
    # Extraer datos del usuario
    oauth_id = google_user.get("id")
    email = google_user.get("email")
    nombre = google_user.get("given_name", google_user.get("name", "Usuario"))
    apellidos = google_user.get("family_name")
    avatar_url = google_user.get("picture")
    
    # Crear o actualizar usuario en la base de datos
    with get_session() as session:
        # Buscar usuario existente
        result = session.execute(text(
            "SELECT user_id FROM users WHERE oauth_provider = 'google' AND oauth_id = :oauth_id"), {"oauth_id": oauth_id}
        )
        existing = result.fetchone()
        
        if existing:
            # Actualizar último login
            user_id = str(existing[0])
            session.execute(text(
                "UPDATE users SET last_login = NOW(), avatar_url = :avatar WHERE user_id = :user_id"), {"user_id": user_id, "avatar": avatar_url}
            )
        else:
            # Crear nuevo usuario (ya verificado porque viene de Google)
            result = session.execute(text(
                """
                INSERT INTO users (oauth_provider, oauth_id, email, nombre, apellidos, avatar_url, email_verified, last_login)
                VALUES ('google', :oauth_id, :email, :nombre, :apellidos, :avatar_url, true, NOW())
                RETURNING user_id
                """), {
                    "oauth_id": oauth_id,
                    "email": email,
                    "nombre": nombre,
                    "apellidos": apellidos,
                    "avatar_url": avatar_url
                }
            )
            user_id = str(result.fetchone()[0])
        
        session.commit()
        
        # Obtener datos completos del usuario
        result = session.execute(text(
            "SELECT user_id, email, nombre, apellidos, avatar_url, rol, "
            "xp_total, nivel, racha_dias, racha_max, vidas "
            "FROM users WHERE user_id = :user_id"), {"user_id": user_id}
        )
        row = result.fetchone()
    
    # Crear JWT
    jwt_token = create_jwt_token(user_id, email)
    
    # Redirigir al frontend con el token
    redirect_url = f"{FRONTEND_URL}/auth/success?token={jwt_token}"
    return RedirectResponse(url=redirect_url)


# ============================================================================
# ENDPOINTS - SESIÓN
# ============================================================================

@router.get("/me", response_model=AuthStatus)
async def get_me(user: Optional[dict] = Depends(get_current_user)):
    """
    Obtiene el usuario actualmente autenticado.
    Devuelve el estado de autenticación y datos del usuario.
    """
    if not user:
        return AuthStatus(authenticated=False)
    
    return AuthStatus(
        authenticated=True,
        user=UserResponse(**user)
    )


@router.post("/logout")
async def logout(response: Response):
    """
    Cierra la sesión del usuario.
    Elimina la cookie de autenticación.
    """
    response.delete_cookie("auth_token")
    return {"message": "Sesión cerrada correctamente"}


@router.get("/status")
async def auth_status(user: Optional[dict] = Depends(get_current_user)):
    """
    Verifica el estado de autenticación.
    Útil para verificar si el token sigue siendo válido.
    """
    return {
        "authenticated": user is not None,
        "user_id": user["user_id"] if user else None
    }


# ============================================================================
# ENDPOINTS DE DESARROLLO (solo para testing)
# ============================================================================

@router.post("/dev/login")
async def dev_login(email: str = "test@example.com", nombre: str = "Test User"):
    """
    Login de desarrollo sin OAuth.
    SOLO USAR EN DESARROLLO - eliminar en producción.
    """
    if os.getenv("ENVIRONMENT", "development") == "production":
        raise HTTPException(status_code=403, detail="No disponible en producción")
    
    with get_session() as session:
        # Buscar o crear usuario de prueba
        result = session.execute(text(
            "SELECT user_id FROM users WHERE email = :email"), {"email": email}
        )
        existing = result.fetchone()
        
        if existing:
            user_id = str(existing[0])
        else:
            result = session.execute(text(
                """
                INSERT INTO users (oauth_provider, oauth_id, email, nombre, email_verified, last_login)
                VALUES ('dev', :email, :email, :nombre, true, NOW())
                RETURNING user_id
                """), {"email": email, "nombre": nombre}
            )
            user_id = str(result.fetchone()[0])
            session.commit()
        
        result = session.execute(text(
            "SELECT user_id, email, nombre, apellidos, avatar_url, rol, "
            "xp_total, nivel, racha_dias, racha_max, vidas "
            "FROM users WHERE user_id = :user_id"), {"user_id": user_id}
        )
        row = result.fetchone()
    
    jwt_token = create_jwt_token(user_id, email)
    
    return TokenResponse(
        access_token=jwt_token,
        user=UserResponse(
            user_id=str(row[0]),
            email=row[1],
            nombre=row[2],
            apellidos=row[3],
            avatar_url=row[4],
            rol=row[5],
            xp_total=row[6],
            nivel=row[7],
            racha_dias=row[8],
            racha_max=row[9],
            vidas=row[10]
        )
    )

