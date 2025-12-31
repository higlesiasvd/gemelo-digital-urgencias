-- ============================================================================
-- MIGRACIÓN: Añadir autenticación tradicional con email/contraseña
-- ============================================================================
-- Ejecutar después de init.sql para añadir soporte de auth por email
-- ============================================================================

-- Modificar tabla users para soportar password y verificación de email
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Hacer oauth_id nullable para usuarios con auth tradicional
ALTER TABLE users ALTER COLUMN oauth_id DROP NOT NULL;

-- Tabla para tokens de verificación de email
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda rápida de tokens
CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token);

-- Tabla para tokens de reset de contraseña (para futuro)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);

-- Actualizar usuarios existentes de OAuth como verificados
UPDATE users SET email_verified = true WHERE oauth_provider = 'google' AND email_verified IS NULL;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Migración de autenticación tradicional completada correctamente';
END $$;
