import express from 'express';
import { query } from '../config/db.js';
import { requireParticipant } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/participant/dashboard
 * Aggregates all data for the faculty dashboard view
 */
router.get('/dashboard', requireParticipant, async (req, res) => {
  try {
    const participantId = req.session.participantId;

    // Execute initial profile, event status, and reveal lookups in parallel
    const [userRes, eventRes, revealRes] = await Promise.all([
      query(
        `SELECT id, participant_id, full_name, email, department, gift_preference 
         FROM participants 
         WHERE id = $1`,
        [participantId]
      ),
      query("SELECT * FROM events WHERE id = 'evergreen_2026'"),
      query(
        `SELECT revealed_id_at, revealed_name_at, reveal_count 
         FROM reveal_records 
         WHERE event_id = 'evergreen_2026' AND participant_id = $1`,
        [participantId]
      ),
    ]);

    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Participant not found.' });
    }
    const profile = userRes.rows[0];

    const event = eventRes.rowCount > 0 ? eventRes.rows[0] : {
      event_status: 'pending',
      registration_status: 'open',
      draw_locked: false,
    };

    const hasRevealedId = revealRes.rowCount > 0 && revealRes.rows[0].revealed_id_at !== null;
    const hasRevealedName = revealRes.rowCount > 0 && revealRes.rows[0].revealed_name_at !== null;

    // 4. If already revealed and event is active, include recipient details
    let assignedRecipient = null;
    if (event.event_status === 'active' && hasRevealedName) {
      const assignRes = await query(
        `SELECT r.participant_id as recipient_participant_id, 
                r.full_name as recipient_name, 
                r.department as recipient_department, 
                r.gift_preference as recipient_gift_preference
         FROM assignments a
         JOIN participants r ON a.recipient_id = r.id
         WHERE a.event_id = 'evergreen_2026' AND a.giver_id = $1`,
        [participantId]
      );

      if (assignRes.rowCount > 0) {
        assignedRecipient = assignRes.rows[0];
      }
    }

    return res.json({
      success: true,
      participant: {
        id: profile.id,
        participantId: profile.participant_id,
        fullName: profile.full_name,
        email: profile.email,
        department: profile.department,
        giftPreference: profile.gift_preference,
      },
      event: {
        id: event.id,
        name: event.event_name,
        status: event.event_status, // 'pending', 'active', 'ended'
        registrationStatus: event.registration_status,
        drawLocked: event.draw_locked,
      },
      revealStatus: {
        hasRevealedId,
        hasRevealedName,
        canReveal: event.event_status === 'active',
        assignedRecipient,
      },
    });
  } catch (error) {
    console.error('Participant dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard data.' });
  }
});

/**
 * PUT /api/participant/wishlist
 * Updates participant's gift preference / wishlist
 */
router.put('/wishlist', requireParticipant, async (req, res) => {
  try {
    const { giftPreference } = req.body;
    const participantId = req.session.participantId;

    if (!giftPreference || typeof giftPreference !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide a valid gift preference.' });
    }

    await query(
      `UPDATE participants 
       SET gift_preference = $1, updated_at = NOW() 
       WHERE id = $2`,
      [giftPreference.trim().slice(0, 500), participantId]
    );

    return res.json({
      success: true,
      message: 'Holiday wishlist updated successfully!',
      giftPreference: giftPreference.trim(),
    });
  } catch (error) {
    console.error('Wishlist update error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update wishlist.' });
  }
});

export default router;

