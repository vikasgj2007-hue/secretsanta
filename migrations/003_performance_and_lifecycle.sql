-- =============================================================================
-- THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY
-- DATABASE MIGRATION: 003_performance_and_lifecycle.sql
-- Optimizes query performance, connection responsiveness, and adds backup store
-- =============================================================================

-- 1. Composite indexes for high-frequency dashboard & lifecycle queries
CREATE INDEX IF NOT EXISTS idx_participants_active_verified 
ON participants(account_status, email_verified);

CREATE INDEX IF NOT EXISTS idx_assignments_event_locked 
ON assignments(event_id, is_locked);

CREATE INDEX IF NOT EXISTS idx_reveal_records_event_revealed 
ON reveal_records(event_id, revealed_name_at);

-- 2. Backups table to store verified snapshots before any sensitive admin resets
CREATE TABLE IF NOT EXISTS system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(64) NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_backups_created_at 
ON system_backups(created_at DESC);

