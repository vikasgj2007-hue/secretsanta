import express from 'express';
import { query } from '../config/db.js';
import { requireParticipant } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/reveal/stage1-recipient-id
 * STAGE 6: Reveals ONLY the assigned recipient's Participant ID (e.g. SS124)
 * Does NOT reveal the full name.
 */
router.get('/stage1-recipient-id', requireParticipant, async (req, res) => {
  try {
    const participantId = req.session.participantId;

    // 1. Verify event is active
    const eventRes = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount === 0 || eventRes.rows[0].event_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'The Secret Santa journey has not officially begun yet. Please wait for the announcement.',
      });
    }

    // 2. Fetch the assigned recipient's ID from permanent database assignments
    const assignRes = await query(
      `SELECT r.participant_id
       FROM assignments a
       JOIN participants r ON a.recipient_id = r.id
       WHERE a.event_id = 'evergreen_2026' AND a.giver_id = $1`,
      [participantId]
    );

    if (assignRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Secret Santa assignment found. Please contact your event administrator.',
      });
    }

    const recipientParticipantId = assignRes.rows[0].participant_id;

    // 3. Record stage 1 reveal in reveal_records
    await query(
      `INSERT INTO reveal_records (event_id, participant_id, revealed_id_at)
       VALUES ('evergreen_2026', $1, NOW())
       ON CONFLICT (event_id, participant_id) 
       DO UPDATE SET revealed_id_at = COALESCE(reveal_records.revealed_id_at, NOW()), updated_at = NOW()`,
      [participantId]
    );

    return res.json({
      success: true,
      stage: 1,
      recipientId: recipientParticipantId,
    });
  } catch (error) {
    console.error('Stage 1 reveal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve recipient ID.' });
  }
});

/**
 * POST /api/reveal/stage2-recipient-identity
 * STAGE 7: Opens the sealed Christmas letter and reveals the recipient's Full Name & Wishlist
 */
router.post('/stage2-recipient-identity', requireParticipant, async (req, res) => {
  try {
    const participantId = req.session.participantId;

    // 1. Verify event is active
    const eventRes = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    if (eventRes.rowCount === 0 || eventRes.rows[0].event_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'The Secret Santa journey has not officially begun yet.',
      });
    }

    // 2. Fetch complete recipient identity from permanent database assignments
    const assignRes = await query(
      `SELECT r.participant_id, r.full_name, r.department, r.gift_preference
       FROM assignments a
       JOIN participants r ON a.recipient_id = r.id
       WHERE a.event_id = 'evergreen_2026' AND a.giver_id = $1`,
      [participantId]
    );

    if (assignRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No Secret Santa assignment found.',
      });
    }

    const recipient = assignRes.rows[0];

    // 3. Record stage 2 reveal in reveal_records and track replay count
    await query(
      `INSERT INTO reveal_records (event_id, participant_id, revealed_id_at, revealed_name_at, reveal_count)
       VALUES ('evergreen_2026', $1, NOW(), NOW(), 1)
       ON CONFLICT (event_id, participant_id)
       DO UPDATE SET 
         revealed_name_at = COALESCE(reveal_records.revealed_name_at, NOW()),
         reveal_count = reveal_records.reveal_count + 1,
         updated_at = NOW()`,
      [participantId]
    );

    // 4. Audit log
    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, ip_address, details)
       VALUES ('participant', $1, 'REVEAL_COMPLETED', $2, $3)`,
      [
        participantId,
        req.ip || 'unknown',
        JSON.stringify({ recipientId: recipient.participant_id }),
      ]
    );

    return res.json({
      success: true,
      stage: 2,
      recipient: {
        participantId: recipient.participant_id,
        fullName: recipient.full_name,
        department: recipient.department,
        giftPreference: recipient.gift_preference,
      },
    });
  } catch (error) {
    console.error('Stage 2 reveal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reveal recipient identity.' });
  }
});

export default router;

