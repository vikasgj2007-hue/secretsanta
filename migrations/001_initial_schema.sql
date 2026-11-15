-- =============================================================================
-- THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY
-- DATABASE MIGRATION: 001_initial_schema.sql
-- Compatible with PostgreSQL 14+ / Supabase PostgreSQL
-- =============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. SEQUENCE FOR UNIQUE PARTICIPANT IDENTIFIERS (SS101, SS102, ...)
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS participant_id_seq START WITH 101 INCREMENT BY 1;

-- =============================================================================
-- 2. EVENTS TABLE
-- Tracks the Secret Santa celebration lifecycle and stages
-- =============================================================================
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(64) PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    registration_status VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'closed'
    event_status VARCHAR(32) NOT NULL DEFAULT 'pending',       -- 'pending', 'active', 'ended'
    draw_generated BOOLEAN NOT NULL DEFAULT FALSE,
    draw_locked BOOLEAN NOT NULL DEFAULT FALSE,
    registration_closed_at TIMESTAMPTZ,
    event_started_at TIMESTAMPTZ,
    event_ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default initial event if not exists
INSERT INTO events (id, event_name, registration_status, event_status, draw_generated, draw_locked)
VALUES ('evergreen_2026', 'The Evergreen Express — Christmas 2026', 'open', 'pending', FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. ADMINISTRATORS TABLE
-- Manages administrative accounts with bcrypt-hashed passwords
-- =============================================================================
CREATE TABLE IF NOT EXISTS administrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    account_status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 4. PARTICIPANTS TABLE
-- Stores registered college faculty members
-- Allows duplicate full names, strictly enforces unique email & unique participant_id
-- =============================================================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id VARCHAR(32) UNIQUE NOT NULL, -- e.g. SS101, SS102
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    gift_preference TEXT,
    department VARCHAR(255),
    account_status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_participant_id ON participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);

-- =============================================================================
-- 5. SECRET SANTA ASSIGNMENTS TABLE
-- Permanent derangement assignments
-- Guarantees: No self-assignment, one recipient per giver, one giver per recipient
-- =============================================================================
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    giver_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_locked BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_no_self_assignment CHECK (giver_id <> recipient_id),
    CONSTRAINT uq_event_giver UNIQUE (event_id, giver_id),
    CONSTRAINT uq_event_recipient UNIQUE (event_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_event_giver ON assignments(event_id, giver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_event_recipient ON assignments(event_id, recipient_id);

-- =============================================================================
-- 6. REVEAL RECORDS TABLE
-- Tracks when each participant completes the 2-stage reveal experience
-- Allows seamless replay without changing the stored assignment
-- =============================================================================
CREATE TABLE IF NOT EXISTS reveal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    revealed_id_at TIMESTAMPTZ,    -- Timestamp when Stage 6 (Recipient ID) was revealed
    revealed_name_at TIMESTAMPTZ,  -- Timestamp when Stage 7 (Sealed Letter opened) was revealed
    reveal_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_participant_reveal UNIQUE (event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_reveal_records_event_participant ON reveal_records(event_id, participant_id);

-- =============================================================================
-- 7. AUDIT LOGS TABLE
-- Complete audit trail for security and event integrity
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type VARCHAR(32) NOT NULL, -- 'admin', 'participant', 'system'
    actor_id VARCHAR(128),
    action VARCHAR(100) NOT NULL,    -- 'REGISTER', 'LOGIN', 'DRAW_GENERATED', 'DRAW_LOCKED', etc.
    ip_address VARCHAR(64),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- 8. EMAIL NOTIFICATIONS TABLE
-- Tracks sent, pending, and failed notification emails
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(64),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);

