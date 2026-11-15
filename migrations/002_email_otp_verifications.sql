-- =============================================================================
-- THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY
-- DATABASE MIGRATION: 002_email_otp_verifications.sql
-- Adds email OTP verification table and email_verified column
-- =============================================================================

-- 1. Add email_verified column to participants if not exists
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Create email_verifications table for secure OTP staging
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    registration_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    resend_available_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

