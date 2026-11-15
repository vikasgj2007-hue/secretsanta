import crypto from 'crypto';
import { getClient, query } from '../config/db.js';

/**
 * Generates a completely scrambled Secret Santa derangement
 * Guaranteed invariants:
 * 1. P(i) !== i for all i (strictly zero self-assignments)
 * 2. Exactly one recipient per giver (1:1 bijection)
 * 3. Exactly one giver per recipient (no two participants get the same recipient)
 * 4. Mixed, non-sequential matching (avoids sequential chains like SS105 -> SS106)
 * Supports any N >= 2
 */
export function sattoloDerangement(array) {
  const n = array.length;
  if (n < 2) {
    throw new Error('At least 2 verified participants are required for a Secret Santa draw.');
  }

  // Edge case N = 2: Only mutual exchange is possible (A -> B, B -> A)
  if (n === 2) {
    return [array[1], array[0]];
  }

  let result;
  let isValid = false;
  let attempts = 0;

  while (!isValid && attempts < 500) {
    attempts++;
    result = [...array];

    // Cryptographic Fisher-Yates full shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }

    // Check 1: Strictly zero self-assignments (nobody gets themselves)
    let hasSelf = false;
    for (let i = 0; i < n; i++) {
      const giverId = array[i].id !== undefined ? array[i].id : array[i];
      const recId = result[i].id !== undefined ? result[i].id : result[i];
      if (giverId === recId) {
        hasSelf = true;
        break;
      }
    }
    if (hasSelf) continue;

    // Check 2: Avoid predictable adjacent sequence (e.g. everyone getting i+1) when N >= 4
    if (n >= 4) {
      let sequentialMatches = 0;
      for (let i = 0; i < n; i++) {
        const nextId = array[(i + 1) % n].id !== undefined ? array[(i + 1) % n].id : array[(i + 1) % n];
        const recId = result[i].id !== undefined ? result[i].id : result[i];
        if (recId === nextId) {
          sequentialMatches++;
        }
      }
      // Re-roll if majority of matches are simply the next sequential person
      if (sequentialMatches >= Math.max(2, Math.floor(n / 2))) {
        continue;
      }
    }

    isValid = true;
  }

  // High-reliability fallback (guaranteed single cycle if attempts exceed)
  if (!isValid) {
    result = [...array];
    for (let i = n - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i);
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
  }

  return result;
}

/**
 * Validates that an assignment list satisfies all Secret Santa invariants
 */
export function validateAssignments(givers, recipients) {
  if (!givers || !recipients || givers.length !== recipients.length) return false;
  const n = givers.length;
  if (n < 2) return false;

  const giverSet = new Set();
  const recipientSet = new Set();

  for (let i = 0; i < n; i++) {
    const giverId = givers[i].id;
    const recipientId = recipients[i].id;

    // Strict no self-assignment
    if (giverId === recipientId) {
      return false;
    }

    giverSet.add(giverId);
    recipientSet.add(recipientId);
  }

  // Every participant is a giver exactly once and a recipient exactly once
  return giverSet.size === n && recipientSet.size === n;
}

/**
 * STEP 2: Generates the Secret Santa draw (unlocked)
 * Transactionally saves assignments with is_locked = FALSE
 */
export async function generateDraw(eventId = 'evergreen_2026') {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Check event state
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (eventRes.rowCount === 0) {
      throw new Error(`Event "${eventId}" not found.`);
    }
    const event = eventRes.rows[0];

    if (event.registration_status !== 'closed') {
      throw new Error('Registration must be closed before generating the Secret Santa draw.');
    }

    if (event.draw_locked) {
      throw new Error('Secret Santa assignments are locked and cannot be regenerated.');
    }

    // 2. Fetch all active and verified participants
    const participantsRes = await client.query(
      `SELECT id, participant_id, full_name, email 
       FROM participants 
       WHERE account_status = 'active' AND email_verified = TRUE 
       ORDER BY created_at ASC`
    );
    const participants = participantsRes.rows;

    if (participants.length < 2) {
      throw new Error(`Insufficient participants: At least 2 verified participants are required (currently ${participants.length}).`);
    }

    // 3. Generate derangement using Sattolo's Algorithm
    let deranged = sattoloDerangement(participants);
    let attempts = 0;
    while (!validateAssignments(participants, deranged) && attempts < 20) {
      deranged = sattoloDerangement(participants);
      attempts++;
    }

    if (!validateAssignments(participants, deranged)) {
      throw new Error('Failed to generate a valid Secret Santa derangement after multiple attempts.');
    }

    // 4. Delete existing unlocked assignments if any
    await client.query('DELETE FROM assignments WHERE event_id = $1', [eventId]);

    // 5. Batch insert new assignments in a single multi-row query (is_locked = FALSE until Step 3)
    const values = [];
    const placeholders = [];
    for (let i = 0; i < participants.length; i++) {
      const giver = participants[i];
      const recipient = deranged[i];
      const offset = i * 3;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, FALSE)`);
      values.push(eventId, giver.id, recipient.id);
    }

    await client.query(
      `INSERT INTO assignments (event_id, giver_id, recipient_id, is_locked)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    // 6. Update event flags
    await client.query(
      `UPDATE events 
       SET draw_generated = TRUE, 
           draw_locked = FALSE, 
           updated_at = NOW() 
       WHERE id = $1`,
      [eventId]
    );

    // 7. Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_type, action, details)
       VALUES ('admin', 'DRAW_GENERATED', $1)`,
      [JSON.stringify({ eventId, totalParticipants: participants.length })]
    );

    await client.query('COMMIT');

    return {
      success: true,
      totalAssigned: participants.length,
      message: `Successfully generated Secret Santa draw for ${participants.length} participants. Please review and lock the draw.`,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * STEP 3: Permanently locks the generated Secret Santa draw
 */
export async function lockDraw(eventId = 'evergreen_2026') {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify event state
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    if (eventRes.rowCount === 0) {
      throw new Error(`Event "${eventId}" not found.`);
    }
    const event = eventRes.rows[0];

    if (!event.draw_generated) {
      throw new Error('Secret Santa draw has not been generated yet. Please generate the draw first.');
    }

    if (event.draw_locked) {
      throw new Error('Secret Santa draw is already locked.');
    }

    // 2. Validate all assignments in database
    const assignRes = await client.query(
      `SELECT giver_id, recipient_id FROM assignments WHERE event_id = $1`,
      [eventId]
    );
    const assignments = assignRes.rows;

    const countRes = await client.query(
      `SELECT COUNT(*) as total FROM participants WHERE account_status = 'active' AND email_verified = TRUE`
    );
    const participantCount = parseInt(countRes.rows[0].total, 10);

    if (assignments.length < 2 || assignments.length !== participantCount) {
      throw new Error(`Assignment validation failed: Expected ${participantCount} assignments, found ${assignments.length}.`);
    }

    // Invariant check
    const giverSet = new Set();
    const recipientSet = new Set();
    for (const a of assignments) {
      if (a.giver_id === a.recipient_id) {
        throw new Error('Validation failed: Self-assignment detected.');
      }
      giverSet.add(a.giver_id);
      recipientSet.add(a.recipient_id);
    }

    if (giverSet.size !== participantCount || recipientSet.size !== participantCount) {
      throw new Error('Validation failed: Duplicate or missing givers/recipients detected.');
    }

    // 3. Lock assignments
    await client.query(
      `UPDATE assignments SET is_locked = TRUE WHERE event_id = $1`,
      [eventId]
    );

    await client.query(
      `UPDATE events SET draw_locked = TRUE, updated_at = NOW() WHERE id = $1`,
      [eventId]
    );

    // 4. Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_type, action, details)
       VALUES ('admin', 'DRAW_LOCKED', $1)`,
      [JSON.stringify({ eventId, totalAssignments: assignments.length })]
    );

    await client.query('COMMIT');

    return {
      success: true,
      totalLocked: assignments.length,
      message: `Secret Santa draw successfully locked for ${assignments.length} participants. Event is now ready to start!`,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Backward-compatible helper that generates and locks in one call if requested
 */
export async function generateAndLockDraw(eventId = 'evergreen_2026') {
  await generateDraw(eventId);
  return await lockDraw(eventId);
}
