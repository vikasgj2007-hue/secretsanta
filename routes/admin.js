import express from 'express';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateDraw, lockDraw, generateAndLockDraw } from '../services/drawService.js';
import { sendOtpEmail, sendAnnouncementEmail, generateAnnouncementHtml } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/admin/login
 * Authenticates administrator
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both Administrator Username and Password.',
      });
    }

    const cleanUsername = username.trim();

    const adminRes = await query(
      `SELECT id, username, email, password_hash, role, account_status
       FROM administrators
       WHERE LOWER(username) = LOWER($1)`,
      [cleanUsername]
    );

    if (adminRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Administrator credentials.',
      });
    }

    const admin = adminRes.rows[0];

    if (admin.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This administrator account is disabled.',
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Administrator credentials.',
      });
    }

    // Set server-side admin session
    req.session.adminId = admin.id;
    req.session.username = admin.username;
    req.session.role = 'admin';

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, ip_address, details)
       VALUES ('admin', $1, 'ADMIN_LOGIN', $2, $3)`,
      [admin.id, req.ip || 'unknown', JSON.stringify({ username: cleanUsername })]
    );

    return res.json({
      success: true,
      message: 'Administrator authenticated successfully.',
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during admin authentication.' });
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('evergreen_session');
    return res.json({ success: true, message: 'Administrator logged out.' });
  });
});

/**
 * GET /api/admin/dashboard
 * High-performance aggregated statistics executed concurrently via Promise.all
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [countRes, eventRes, revealCountRes] = await Promise.all([
      query("SELECT COUNT(*) as total FROM participants WHERE account_status = 'active' AND email_verified = TRUE"),
      query("SELECT * FROM events WHERE id = 'evergreen_2026'"),
      query(
        `SELECT COUNT(DISTINCT participant_id) as total 
         FROM reveal_records 
         WHERE event_id = 'evergreen_2026' AND revealed_name_at IS NOT NULL`
      ),
    ]);

    const totalParticipants = parseInt(countRes.rows[0].total, 10);
    const event = eventRes.rows[0] || {
      id: 'evergreen_2026',
      event_name: 'The Evergreen Express',
      registration_status: 'open',
      event_status: 'pending',
      draw_generated: false,
      draw_locked: false,
    };
    const revealedCount = parseInt(revealCountRes.rows[0].total, 10);

    return res.json({
      success: true,
      stats: {
        totalParticipants,
        revealedCount,
        pendingRevealCount: Math.max(0, totalParticipants - revealedCount),
        event: {
          id: event.id,
          name: event.event_name,
          registrationStatus: event.registration_status, // 'open', 'closed'
          eventStatus: event.event_status,               // 'pending', 'active', 'ended'
          drawGenerated: !!event.draw_generated,
          drawLocked: !!event.draw_locked,
          eventStartedAt: event.event_started_at,
          eventEndedAt: event.event_ended_at,
        },
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin dashboard.' });
  }
});

/**
 * GET /api/admin/registrations
 * Returns the list of registered faculty participants
 */
router.get('/registrations', requireAdmin, async (req, res) => {
  try {
    const listRes = await query(
      `SELECT p.id, p.participant_id, p.full_name, p.email, p.department, p.gift_preference, p.created_at,
              rr.revealed_name_at IS NOT NULL as has_revealed,
              rr.reveal_count
       FROM participants p
       LEFT JOIN reveal_records rr ON rr.event_id = 'evergreen_2026' AND rr.participant_id = p.id
       WHERE p.account_status = 'active'
       ORDER BY p.participant_id ASC`
    );

    return res.json({
      success: true,
      participants: listRes.rows,
    });
  } catch (error) {
    console.error('Admin registrations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load registrations.' });
  }
});

/**
 * GET /api/admin/assignments
 * Strictly protected: displays complete Secret Santa derangement pairings
 */
router.get('/assignments', requireAdmin, async (req, res) => {
  try {
    const assignRes = await query(
      `SELECT a.id,
              g.participant_id as giver_id,
              g.full_name as giver_name,
              g.email as giver_email,
              r.participant_id as recipient_id,
              r.full_name as recipient_name,
              r.email as recipient_email,
              r.gift_preference as recipient_gift_preference,
              a.assigned_at,
              a.is_locked,
              rr.revealed_name_at IS NOT NULL as is_revealed
       FROM assignments a
       JOIN participants g ON a.giver_id = g.id
       JOIN participants r ON a.recipient_id = r.id
       LEFT JOIN reveal_records rr ON rr.event_id = a.event_id AND rr.participant_id = g.id
       WHERE a.event_id = 'evergreen_2026'
       ORDER BY g.participant_id ASC`
    );

    return res.json({
      success: true,
      total: assignRes.rowCount,
      assignments: assignRes.rows,
    });
  } catch (error) {
    console.error('Admin assignments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load assignments.' });
  }
});

/**
 * STEP 1: POST /api/admin/registration/close
 * Closes faculty registration. Enforces minimum 2 verified participants.
 */
router.post('/registration/close', requireAdmin, async (req, res) => {
  try {
    const eventRes = await query("SELECT registration_status FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (eventRes.rows[0].registration_status === 'closed') {
      return res.status(400).json({ success: false, message: 'Registration is already closed.' });
    }

    // Count eligible, verified participants
    const countRes = await query(
      "SELECT COUNT(*) as total FROM participants WHERE account_status = 'active' AND email_verified = TRUE"
    );
    const count = parseInt(countRes.rows[0].total, 10);

    if (count < 2) {
      return res.status(400).json({
        success: false,
        message: `Cannot close registration: At least 2 verified participants are required before proceeding (currently ${count}).`,
        totalParticipants: count,
      });
    }

    await query(
      `UPDATE events 
       SET registration_status = 'closed', 
           registration_closed_at = NOW(),
           updated_at = NOW() 
       WHERE id = 'evergreen_2026'`
    );

    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'REGISTRATION_CLOSED', $2)`,
      [req.session.adminId, JSON.stringify({ totalParticipants: count })]
    );

    return res.json({
      success: true,
      registrationStatus: 'closed',
      totalParticipants: count,
      message: `Registration has been successfully CLOSED with ${count} verified participants ready for the draw.`,
    });
  } catch (error) {
    console.error('Close registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to close registration.' });
  }
});

/**
 * POST /api/admin/registration/open
 * Re-opens faculty registration (only allowed if draw is not yet locked)
 */
router.post('/registration/open', requireAdmin, async (req, res) => {
  try {
    const eventRes = await query("SELECT draw_locked FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount > 0 && eventRes.rows[0].draw_locked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot re-open registration: Secret Santa draw has already been locked.',
      });
    }

    await query(
      `UPDATE events 
       SET registration_status = 'open', 
           registration_closed_at = NULL,
           updated_at = NOW() 
       WHERE id = 'evergreen_2026'`
    );

    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'REGISTRATION_OPENED', $2)`,
      [req.session.adminId, JSON.stringify({ eventId: 'evergreen_2026' })]
    );

    return res.json({
      success: true,
      registrationStatus: 'open',
      message: 'Registration is now OPEN for faculty participants.',
    });
  } catch (error) {
    console.error('Open registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to open registration.' });
  }
});

/**
 * POST /api/admin/registration/toggle (Backward-compatibility)
 */
router.post('/registration/toggle', requireAdmin, async (req, res) => {
  try {
    const eventRes = await query("SELECT registration_status, draw_locked FROM events WHERE id = 'evergreen_2026'");
    const currentStatus = eventRes.rows[0].registration_status;

    if (currentStatus === 'open') {
      // Closing registration: enforce minimum 2 participants
      const countRes = await query(
        "SELECT COUNT(*) as total FROM participants WHERE account_status = 'active' AND email_verified = TRUE"
      );
      const count = parseInt(countRes.rows[0].total, 10);
      if (count < 2) {
        return res.status(400).json({
          success: false,
          message: `Cannot close registration: At least 2 verified participants are required (currently ${count}).`,
        });
      }

      await query(
        `UPDATE events SET registration_status = 'closed', registration_closed_at = NOW(), updated_at = NOW() WHERE id = 'evergreen_2026'`
      );
      return res.json({
        success: true,
        registrationStatus: 'closed',
        message: `Registration is now CLOSED (${count} participants).`,
      });
    } else {
      if (eventRes.rows[0].draw_locked) {
        return res.status(400).json({
          success: false,
          message: 'Cannot open registration: Draw is already locked.',
        });
      }
      await query(
        `UPDATE events SET registration_status = 'open', registration_closed_at = NULL, updated_at = NOW() WHERE id = 'evergreen_2026'`
      );
      return res.json({
        success: true,
        registrationStatus: 'open',
        message: 'Registration is now OPEN.',
      });
    }
  } catch (error) {
    console.error('Toggle registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change registration status.' });
  }
});

/**
 * STEP 2: POST /api/admin/draw/generate
 * Generates the Secret Santa derangement without locking
 */
router.post('/draw/generate', requireAdmin, async (req, res) => {
  try {
    const result = await generateDraw('evergreen_2026');
    return res.json(result);
  } catch (error) {
    console.error('Draw generation error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate Secret Santa draw.',
    });
  }
});

/**
 * STEP 3: POST /api/admin/draw/lock
 * Permanently locks the Secret Santa assignments
 */
router.post('/draw/lock', requireAdmin, async (req, res) => {
  try {
    const result = await lockDraw('evergreen_2026');
    return res.json(result);
  } catch (error) {
    console.error('Draw locking error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to lock Secret Santa draw.',
    });
  }
});

/**
 * STEP 4: POST /api/admin/event/start
 * Starts the event so participants can board The Evergreen Express and reveal their recipient.
 * Dispatches notifications asynchronously so network latency never blocks the HTTP response.
 */
router.post('/event/start', requireAdmin, async (req, res) => {
  try {
    const eventRes = await query("SELECT * FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const event = eventRes.rows[0];

    if (!event.draw_generated || !event.draw_locked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start event: The Secret Santa draw must be generated and locked first.',
      });
    }

    if (event.event_status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'This event is already LIVE.',
      });
    }

    await query(
      `UPDATE events 
       SET event_status = 'active', 
           event_started_at = NOW(),
           updated_at = NOW() 
       WHERE id = 'evergreen_2026'`
    );

    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'EVENT_STARTED', $2)`,
      [req.session.adminId, JSON.stringify({ eventId: 'evergreen_2026' })]
    );

    // Asynchronously dispatch announcement log without blocking response
    setImmediate(async () => {
      try {
        console.log('🚂 THE EVERGREEN EXPRESS has officially departed! Event is now LIVE.');
      } catch (e) {
        console.error('Async notification notice:', e.message);
      }
    });

    return res.json({
      success: true,
      eventStatus: 'active',
      message: 'THE JOURNEY BEGINS! The Evergreen Express is now officially ACTIVE. Faculty members can now reveal their recipients!',
    });
  } catch (error) {
    console.error('Event start error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start event.' });
  }
});

/**
 * POST /api/admin/event/end
 * Concludes the celebration
 */
router.post('/event/end', requireAdmin, async (req, res) => {
  try {
    await query(
      `UPDATE events 
       SET event_status = 'ended', 
           event_ended_at = NOW(),
           updated_at = NOW() 
       WHERE id = 'evergreen_2026'`
    );

    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, details)
       VALUES ('admin', $1, 'EVENT_ENDED', $2)`,
      [req.session.adminId, JSON.stringify({ eventId: 'evergreen_2026' })]
    );

    return res.json({
      success: true,
      eventStatus: 'ended',
      message: 'The Secret Santa celebration has been officially concluded.',
    });
  } catch (error) {
    console.error('Event end error:', error);
    return res.status(500).json({ success: false, message: 'Failed to end event.' });
  }
});

/**
 * GET /api/admin/announcement/status
 * Fetches eligible participants list, previous announcement history, and sample preview
 */
router.get('/announcement/status', requireAdmin, async (req, res) => {
  try {
    const [eligibleRes, auditRes] = await Promise.all([
      query(
        `SELECT id, participant_id, full_name, email, department
         FROM participants
         WHERE email_verified = TRUE AND account_status = 'active'
         ORDER BY participant_id ASC`
      ),
      query(
        `SELECT details, created_at
         FROM audit_logs
         WHERE action = 'ANNOUNCEMENT_BULK_SENT'
         ORDER BY created_at DESC
         LIMIT 1`
      ),
    ]);

    const participants = eligibleRes.rows.map(p => ({
      id: p.id,
      participantId: p.participant_id,
      fullName: p.full_name,
      email: p.email,
      department: p.department,
    }));

    const lastAnnouncement = auditRes.rowCount > 0 ? {
      sentAt: auditRes.rows[0].created_at,
      details: typeof auditRes.rows[0].details === 'string'
        ? JSON.parse(auditRes.rows[0].details)
        : auditRes.rows[0].details,
    } : null;

    const siteUrl = process.env.APP_URL || req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const sampleRecipient = participants[0] || {
      fullName: 'Dr. Robert Vance',
      participantId: 'SS101',
    };

    const sampleHtml = generateAnnouncementHtml(sampleRecipient.fullName, sampleRecipient.participantId, siteUrl);

    return res.json({
      success: true,
      eligibleCount: participants.length,
      participants,
      lastAnnouncement,
      siteUrl,
      preview: {
        subject: '🎄 The Journey Begins! Discover Your Secret Santa Friend – THE EVERGREEN EXPRESS',
        sampleRecipient,
        html: sampleHtml,
      },
    });
  } catch (error) {
    console.error('Announcement status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve announcement status.' });
  }
});

/**
 * POST /api/admin/announcement/send-single
 * Sends personalized announcement email to one specific participant or test address
 */
router.post('/announcement/send-single', requireAdmin, async (req, res) => {
  try {
    const { participantId, testEmail } = req.body;
    const siteUrl = process.env.APP_URL || req.headers.origin || `${req.protocol}://${req.get('host')}`;

    // Test send to admin's custom email
    if (testEmail) {
      const cleanTestEmail = String(testEmail).trim().toLowerCase();
      const testResult = await sendAnnouncementEmail(
        cleanTestEmail,
        'Faculty Member (Test)',
        'SS101',
        siteUrl
      );
      return res.json({
        success: testResult.success,
        email: cleanTestEmail,
        participantId: 'SS101',
        error: testResult.error,
        provider: testResult.provider,
      });
    }

    if (!participantId) {
      return res.status(400).json({ success: false, message: 'Participant ID is required.' });
    }

    // Look up participant
    const partRes = await query(
      `SELECT id, participant_id, full_name, email, email_verified, account_status
       FROM participants
       WHERE (participant_id = $1 OR id::text = $1)
       LIMIT 1`,
      [String(participantId).trim()]
    );

    if (partRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: `Participant ${participantId} not found.` });
    }

    const participant = partRes.rows[0];

    if (!participant.email_verified) {
      return res.status(400).json({
        success: false,
        message: `Participant ${participant.participant_id} has not verified their email address.`,
      });
    }

    const emailResult = await sendAnnouncementEmail(
      participant.email,
      participant.full_name,
      participant.participant_id,
      siteUrl
    );

    return res.json({
      success: emailResult.success,
      participantId: participant.participant_id,
      fullName: participant.full_name,
      email: participant.email,
      provider: emailResult.provider,
      error: emailResult.error,
    });
  } catch (error) {
    console.error('Send single announcement error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/admin/announcement/log-batch
 * Records completion of bulk announcement run in audit logs
 */
router.post('/announcement/log-batch', requireAdmin, async (req, res) => {
  try {
    const { total, sent, failed } = req.body;
    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, ip_address, details)
       VALUES ('admin', $1, 'ANNOUNCEMENT_BULK_SENT', $2, $3)`,
      [
        req.session.adminId,
        req.ip || 'unknown',
        JSON.stringify({ total, sent, failed, timestamp: new Date().toISOString() }),
      ]
    );

    return res.json({ success: true, message: 'Announcement batch logged successfully.' });
  } catch (error) {
    console.error('Log batch announcement error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/admin/backups
 * Returns list of verified database backup snapshots
 */
router.get('/backups', requireAdmin, async (req, res) => {
  try {
    const backupRes = await query(
      `SELECT id, backup_type, created_at, 
              CASE 
                WHEN snapshot_data ? 'assignments' THEN jsonb_array_length((snapshot_data->'assignments')::jsonb)
                ELSE NULL 
              END as total_assignments,
              CASE 
                WHEN snapshot_data ? 'participants' THEN jsonb_array_length((snapshot_data->'participants')::jsonb)
                ELSE NULL 
              END as total_participants
       FROM system_backups 
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    return res.json({ success: true, backups: backupRes.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve backups.' });
  }
});

/**
 * POST /api/admin/backups/create
 * Creates an on-demand verified snapshot backup of all 4 operational tables
 */
router.post('/backups/create', requireAdmin, async (req, res) => {
  try {
    const client = await getClient();
    try {
      const [curEvent, curAssign, curReveals, curParticipants] = await Promise.all([
        client.query("SELECT * FROM events WHERE id = 'evergreen_2026'"),
        client.query("SELECT * FROM assignments WHERE event_id = 'evergreen_2026'"),
        client.query("SELECT * FROM reveal_records WHERE event_id = 'evergreen_2026'"),
        client.query("SELECT * FROM participants ORDER BY created_at ASC"),
      ]);

      const snapshot = {
        timestamp: new Date().toISOString(),
        event: curEvent.rows[0] || null,
        assignments: curAssign.rows,
        reveals: curReveals.rows,
        participants: curParticipants.rows,
      };

      const backupRes = await client.query(
        `INSERT INTO system_backups (backup_type, snapshot_data, created_by)
         VALUES ('ON_DEMAND_SNAPSHOT', $1, $2)
         RETURNING id, created_at`,
        [JSON.stringify(snapshot), req.session.adminId]
      );

      const backupId = backupRes.rows[0].id;

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (actor_type, actor_id, action, details)
         VALUES ('admin', $1, 'ADMIN_BACKUP_CREATED', $2)`,
        [req.session.adminId, JSON.stringify({ backupId, timestamp: new Date().toISOString() })]
      );

      return res.json({
        success: true,
        backupId,
        message: `Verified snapshot backup created successfully (ID: ${backupId.slice(0, 8)}). Saved ${curParticipants.rows.length} faculty and ${curAssign.rows.length} pairings.`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Backup create error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create backup snapshot.' });
  }
});

/**
 * POST /api/admin/backups/:id/restore
 * Safely restores a verified database snapshot from system_backups
 */
router.post('/backups/:id/restore', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminPassword } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Backup ID is required.' });
    }

    // 1. Verify event is NOT actively LIVE
    const eventRes = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount > 0 && eventRes.rows[0].event_status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot restore backup while the event is actively LIVE. Please end the celebration first.',
      });
    }

    // 2. Verify admin password
    const adminRes = await query('SELECT password_hash FROM administrators WHERE id = $1', [req.session.adminId]);
    if (adminRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Administrator account not found.' });
    }

    const isMatch = await bcrypt.compare(adminPassword || '', adminRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect administrator password.' });
    }

    // 3. Fetch snapshot from system_backups
    const backupRes = await query('SELECT snapshot_data FROM system_backups WHERE id = $1', [id]);
    if (backupRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Specified backup snapshot was not found.' });
    }

    const snapshot = backupRes.rows[0].snapshot_data;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ success: false, message: 'Corrupt or unreadable snapshot data.' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Pre-validate foreign keys for assignments
      if (Array.isArray(snapshot.assignments) && snapshot.assignments.length > 0) {
        const participantIdSet = new Set();
        if (Array.isArray(snapshot.participants)) {
          for (const p of snapshot.participants) {
            if (p && p.id) participantIdSet.add(p.id);
          }
        }
        const dbParticipants = await client.query('SELECT id FROM participants');
        for (const row of dbParticipants.rows) {
          participantIdSet.add(row.id);
        }

        const missingIds = [];
        for (const a of snapshot.assignments) {
          if (a.giver_id && !participantIdSet.has(a.giver_id)) missingIds.push(a.giver_id);
          if (a.recipient_id && !participantIdSet.has(a.recipient_id)) missingIds.push(a.recipient_id);
        }

        if (missingIds.length > 0) {
          throw new Error(
            `Cannot restore assignments from this older snapshot: It references participant IDs from an earlier setup that are not present in this database. Please restore a snapshot that contains full participant records.`
          );
        }
      }

      // Restore participants if present in snapshot
      if (Array.isArray(snapshot.participants) && snapshot.participants.length > 0) {
        for (const p of snapshot.participants) {
          await client.query(
            `INSERT INTO participants (id, participant_id, full_name, email, password_hash, gift_preference, department, account_status, email_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               participant_id = EXCLUDED.participant_id,
               full_name = EXCLUDED.full_name,
               email = EXCLUDED.email,
               gift_preference = EXCLUDED.gift_preference,
               department = EXCLUDED.department,
               account_status = EXCLUDED.account_status,
               email_verified = EXCLUDED.email_verified,
               updated_at = NOW()`,
            [
              p.id,
              p.participant_id,
              p.full_name,
              p.email,
              p.password_hash || '$2a$10$temporaryhashduringrestore',
              p.gift_preference || 'Holiday surprise',
              p.department || 'College Faculty',
              p.account_status || 'active',
              p.email_verified !== undefined ? p.email_verified : true,
            ]
          );
        }
      }

      // Restore assignments
      await client.query("DELETE FROM assignments WHERE event_id = 'evergreen_2026'");
      if (Array.isArray(snapshot.assignments) && snapshot.assignments.length > 0) {
        for (const a of snapshot.assignments) {
          await client.query(
            `INSERT INTO assignments (id, event_id, giver_id, recipient_id, assigned_at, is_locked)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               giver_id = EXCLUDED.giver_id,
               recipient_id = EXCLUDED.recipient_id,
               is_locked = EXCLUDED.is_locked`,
            [a.id, a.event_id || 'evergreen_2026', a.giver_id, a.recipient_id, a.assigned_at || new Date(), a.is_locked !== undefined ? a.is_locked : true]
          );
        }
      }

      // Restore reveal records
      await client.query("DELETE FROM reveal_records WHERE event_id = 'evergreen_2026'");
      if (Array.isArray(snapshot.reveals) && snapshot.reveals.length > 0) {
        for (const r of snapshot.reveals) {
          await client.query(
            `INSERT INTO reveal_records (id, event_id, participant_id, revealed_id_at, revealed_name_at, reveal_count)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               revealed_id_at = EXCLUDED.revealed_id_at,
               revealed_name_at = EXCLUDED.revealed_name_at,
               reveal_count = EXCLUDED.reveal_count`,
            [r.id, r.event_id || 'evergreen_2026', r.participant_id, r.revealed_id_at, r.revealed_name_at, r.reveal_count || 1]
          );
        }
      }

      // Restore event state if in snapshot
      if (snapshot.event) {
        const ev = snapshot.event;
        await client.query(
          `UPDATE events
           SET registration_status = $1,
               event_status = $2,
               draw_generated = $3,
               draw_locked = $4,
               registration_closed_at = $5,
               event_started_at = $6,
               event_ended_at = $7,
               updated_at = NOW()
           WHERE id = 'evergreen_2026'`,
          [
            ev.registration_status || 'open',
            ev.event_status || 'pending',
            ev.draw_generated !== undefined ? ev.draw_generated : false,
            ev.draw_locked !== undefined ? ev.draw_locked : false,
            ev.registration_closed_at || null,
            ev.event_started_at || null,
            ev.event_ended_at || null,
          ]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (actor_type, actor_id, action, details)
         VALUES ('admin', $1, 'ADMIN_BACKUP_RESTORED', $2)`,
        [req.session.adminId, JSON.stringify({ backupId: id, timestamp: new Date().toISOString() })]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: `Backup ${id.slice(0, 8)} successfully restored. All assignments, reveals, and event statuses were reinstated.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Backup restore error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to restore backup.' });
  }
});

/**
 * POST /api/admin/reset/confirm
 * Protected emergency database reset with mandatory pre-reset backup
 */
router.post('/reset/confirm', requireAdmin, async (req, res) => {
  try {
    const { adminPassword, confirmationCode, resetParticipants } = req.body;

    if (confirmationCode !== 'RESET_CONFIRM_EVERGREEN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation phrase. Please type RESET_CONFIRM_EVERGREEN to confirm.',
      });
    }

    // 1. Verify event is NOT actively LIVE
    const eventRes = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount > 0 && eventRes.rows[0].event_status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reset database while the event is actively LIVE. Please end the celebration first before resetting.',
      });
    }

    // 2. Verify admin password
    const adminRes = await query('SELECT password_hash FROM administrators WHERE id = $1', [req.session.adminId]);
    if (adminRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Administrator account not found.' });
    }

    const isMatch = await bcrypt.compare(adminPassword || '', adminRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect administrator password.',
      });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 3. Create pre-reset verified snapshot backup
      const [curEvent, curAssign, curReveals, curParticipants] = await Promise.all([
        client.query("SELECT * FROM events WHERE id = 'evergreen_2026'"),
        client.query("SELECT * FROM assignments WHERE event_id = 'evergreen_2026'"),
        client.query("SELECT * FROM reveal_records WHERE event_id = 'evergreen_2026'"),
        client.query("SELECT * FROM participants"),
      ]);

      const snapshot = {
        timestamp: new Date().toISOString(),
        event: curEvent.rows[0] || null,
        assignments: curAssign.rows,
        reveals: curReveals.rows,
        participants: curParticipants.rows,
      };

      const backupRes = await client.query(
        `INSERT INTO system_backups (backup_type, snapshot_data, created_by)
         VALUES ('PRE_RESET_SNAPSHOT', $1, $2)
         RETURNING id, created_at`,
        [JSON.stringify(snapshot), req.session.adminId]
      );

      const backupId = backupRes.rows[0].id;

      // 4. Reset assignments & reveal records
      await client.query("DELETE FROM reveal_records WHERE event_id = 'evergreen_2026'");
      await client.query("DELETE FROM assignments WHERE event_id = 'evergreen_2026'");

      // Optionally reset participant accounts if requested
      if (resetParticipants === true) {
        await client.query("DELETE FROM email_verifications");
        await client.query("DELETE FROM participants");
      }

      // Reset event state back to Open & Pending
      await client.query(
        `UPDATE events 
         SET registration_status = 'open', 
             event_status = 'pending', 
             draw_generated = FALSE, 
             draw_locked = FALSE,
             registration_closed_at = NULL,
             event_started_at = NULL,
             event_ended_at = NULL,
             updated_at = NOW() 
         WHERE id = 'evergreen_2026'`
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (actor_type, actor_id, action, details)
         VALUES ('admin', $1, 'ADMIN_RESET_PERFORMED', $2)`,
        [
          req.session.adminId,
          JSON.stringify({
            eventId: 'evergreen_2026',
            backupId,
            resetParticipants: !!resetParticipants,
          }),
        ]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        backupId,
        message: `Database successfully reset. A verified snapshot was saved (Backup ID: ${backupId.slice(0, 8)}). Event is now Open and Pending.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reset confirm error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to execute reset.' });
  }
});

export default router;
