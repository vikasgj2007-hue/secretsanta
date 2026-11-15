import express from 'express';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { generateDraw, lockDraw, generateAndLockDraw } from '../services/drawService.js';
import { sendOtpEmail } from '../services/emailService.js';

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
 * GET /api/admin/backups
 * Returns list of verified database backup snapshots
 */
router.get('/backups', requireAdmin, async (req, res) => {
  try {
    const backupRes = await query(
      `SELECT id, backup_type, created_at, 
              jsonb_array_length((snapshot_data->'assignments')::jsonb) as total_assignments,
              jsonb_array_length((snapshot_data->'participants')::jsonb) as total_participants
       FROM system_backups 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    return res.json({ success: true, backups: backupRes.rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve backups.' });
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
        client.query("SELECT id, participant_id, full_name, email, department FROM participants"),
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
