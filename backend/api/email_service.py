"""
============================================================================
EMAIL SERVICE - Servicio de envío de emails
============================================================================
Servicio para envío de emails de verificación y notificaciones.
============================================================================
"""

import os
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@healthverse.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "HealthVerse")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3003")

# Token expiration
VERIFICATION_TOKEN_EXPIRY_HOURS = 24


# ============================================================================
# HELPERS
# ============================================================================

def generate_verification_token() -> str:
    """Genera un token seguro para verificación de email"""
    return secrets.token_urlsafe(32)


def get_token_expiry() -> datetime:
    """Obtiene la fecha de expiración del token"""
    return datetime.utcnow() + timedelta(hours=VERIFICATION_TOKEN_EXPIRY_HOURS)


# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

def get_verification_email_html(nombre: str, verification_url: str) -> str:
    """Genera el HTML del email de verificación"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a1628;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a1628; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0d1f3c 0%, #0a1628 100%); border-radius: 16px; border: 1px solid rgba(0, 196, 220, 0.2);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center;">
                                <h1 style="margin: 0; font-size: 28px; color: #ffffff;">
                                    <span style="color: #ffffff;">Health</span><span style="color: #00c4dc;">Verse</span>
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 20px 40px;">
                                <h2 style="color: #ffffff; margin: 0 0 20px;">¡Hola, {nombre}!</h2>
                                <p style="color: #a0aec0; line-height: 1.6; margin: 0 0 20px;">
                                    Gracias por registrarte en HealthVerse. Para completar tu registro y acceder 
                                    al sistema de formación gamificada, por favor verifica tu dirección de email.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Button -->
                        <tr>
                            <td style="padding: 10px 40px 30px; text-align: center;">
                                <a href="{verification_url}" 
                                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00c4dc 0%, #00d68f 100%); 
                                          color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px;">
                                    Verificar Email
                                </a>
                            </td>
                        </tr>
                        
                        <!-- Alternative link -->
                        <tr>
                            <td style="padding: 0 40px 20px;">
                                <p style="color: #718096; font-size: 13px; line-height: 1.5; margin: 0;">
                                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                                </p>
                                <p style="color: #00c4dc; font-size: 12px; word-break: break-all; margin: 10px 0 0;">
                                    {verification_url}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Expiry warning -->
                        <tr>
                            <td style="padding: 0 40px 30px;">
                                <p style="color: #f97316; font-size: 13px; margin: 0;">
                                    ⚠️ Este enlace expirará en {VERIFICATION_TOKEN_EXPIRY_HOURS} horas.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
                                <p style="color: #718096; font-size: 12px; margin: 0; text-align: center;">
                                    Si no has solicitado esta cuenta, puedes ignorar este mensaje.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_verification_email_text(nombre: str, verification_url: str) -> str:
    """Genera la versión de texto plano del email de verificación"""
    return f"""
¡Hola, {nombre}!

Gracias por registrarte en HealthVerse.

Para verificar tu email, visita el siguiente enlace:
{verification_url}

Este enlace expirará en {VERIFICATION_TOKEN_EXPIRY_HOURS} horas.

Si no has solicitado esta cuenta, puedes ignorar este mensaje.

- El equipo de HealthVerse
    """


# ============================================================================
# EMAIL SENDING
# ============================================================================

async def send_verification_email(email: str, nombre: str, token: str) -> bool:
    """
    Envía un email de verificación al usuario.
    
    Args:
        email: Dirección de email del destinatario
        nombre: Nombre del usuario
        token: Token de verificación
    
    Returns:
        True si se envió correctamente, False en caso de error
    """
    verification_url = f"{FRONTEND_URL}/verify-email?token={token}"
    
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("=" * 60)
        logger.warning("📧 SMTP NO CONFIGURADO - MODO DESARROLLO")
        logger.warning("=" * 60)
        logger.warning(f"📬 Email para: {email}")
        logger.warning(f"👤 Usuario: {nombre}")
        logger.warning(f"🔗 URL de verificación:")
        logger.warning(f"   {verification_url}")
        logger.warning("=" * 60)
        return True  # Return True in dev mode to not block registration
    
    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = "Verifica tu email - HealthVerse"
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    message["To"] = email
    
    # Attach text and HTML versions
    text_part = MIMEText(get_verification_email_text(nombre, verification_url), "plain", "utf-8")
    html_part = MIMEText(get_verification_email_html(nombre, verification_url), "html", "utf-8")
    
    message.attach(text_part)
    message.attach(html_part)
    
    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info(f"Email de verificación enviado a {email}")
        return True
    except Exception as e:
        logger.error(f"Error enviando email a {email}: {e}")
        return False


async def send_welcome_email(email: str, nombre: str) -> bool:
    """
    Envía un email de bienvenida después de verificar el email.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP no configurado. Email de bienvenida no enviado.")
        return True
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #0a1628;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a1628; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0d1f3c 0%, #0a1628 100%); border-radius: 16px; border: 1px solid rgba(0, 196, 220, 0.2);">
                        <tr>
                            <td style="padding: 40px; text-align: center;">
                                <h1 style="color: #00c4dc; margin: 0 0 20px;">🎉 ¡Bienvenido/a!</h1>
                                <p style="color: #ffffff; font-size: 18px; margin: 0 0 20px;">
                                    ¡Hola, {nombre}!
                                </p>
                                <p style="color: #a0aec0; line-height: 1.6; margin: 0 0 30px;">
                                    Tu cuenta ha sido verificada correctamente. Ya puedes acceder a 
                                    HealthVerse y comenzar tu formación en triaje Manchester.
                                </p>
                                <a href="{FRONTEND_URL}/login" 
                                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00c4dc 0%, #00d68f 100%); 
                                          color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600;">
                                    Iniciar Sesión
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    message = MIMEMultipart("alternative")
    message["Subject"] = "¡Bienvenido/a a HealthVerse!"
    message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    message["To"] = email
    
    html_part = MIMEText(html_content, "html", "utf-8")
    message.attach(html_part)
    
    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info(f"Email de bienvenida enviado a {email}")
        return True
    except Exception as e:
        logger.error(f"Error enviando email de bienvenida a {email}: {e}")
        return False
