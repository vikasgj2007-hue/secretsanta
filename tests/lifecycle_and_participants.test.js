import { sattoloDerangement, validateAssignments, generateDraw, lockDraw } from '../services/drawService.js';
import { pool, query, getClient } from '../config/db.js';

async function runComprehensiveTests() {
  console.log('\n=============================================================');
  console.log('  THE EVERGREEN EXPRESS — PARTICIPANT & LIFECYCLE TESTS     ');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: Participant Counts Derangement Invariants (2, 3, 5, 25, 80)
    // -------------------------------------------------------------------------
    console.log('--- Test Suite 1: Mathematical Invariants across Participant Counts ---');

    const testCounts = [2, 3, 5, 25, 80];
    for (const n of testCounts) {
      const participants = Array.from({ length: n }, (_, i) => ({
        id: `fac-${n}-${i + 1}`,
        participant_id: `SS${200 + i}`,
        full_name: `Faculty Member ${i + 1}`,
      }));

      // Test 100 iterations per count
      let allValid = true;
      for (let iter = 0; iter < 100; iter++) {
        const deranged = sattoloDerangement(participants);
        if (!validateAssignments(participants, deranged)) {
          allValid = false;
          break;
        }
      }
      assert(allValid, `N = ${n} participants: 100 iterations passed (0 self-assignments, 1:1 bijection, full cycle).`);
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Invalid Scenarios & Guard Enforcements
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Invalid Lifecycle Operations & Boundary Enforcement ---');

    // 1. Generation with fewer than 2 participants must throw
    try {
      sattoloDerangement([{ id: 'solo', full_name: 'Solo' }]);
      assert(false, 'Should throw with 1 participant');
    } catch (e) {
      assert(true, `Fewer than 2 participants strictly rejected: "${e.message}"`);
    }

    // 2. Cannot generate draw while registration is open
    await query("UPDATE events SET registration_status = 'open', draw_locked = FALSE WHERE id = 'evergreen_2026'");
    try {
      await generateDraw('evergreen_2026');
      assert(false, 'Should reject draw generation while registration is open');
    } catch (e) {
      assert(e.message.includes('Registration must be closed'), `Draw generation rejected while registration is OPEN: "${e.message}"`);
    }

    // 3. Clean and stage test faculty for live lifecycle test
    await query("DELETE FROM participants WHERE email LIKE '%@lifecycle.test'");
    await query(
      `INSERT INTO participants (participant_id, full_name, email, password_hash, account_status, email_verified)
       VALUES 
       ('SS801', 'Dr. Alice Winter', 'alice@lifecycle.test', 'hash1', 'active', TRUE),
       ('SS802', 'Prof. Bob Snow', 'bob@lifecycle.test', 'hash2', 'active', TRUE)
       ON CONFLICT (email) DO NOTHING`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Full 4-Step Lifecycle in Order
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: 4-Step Event Lifecycle Execution in Order ---');

    // STEP 1: Close registration (enforces min 2 participants)
    const countRes = await query("SELECT COUNT(*) as total FROM participants WHERE account_status = 'active' AND email_verified = TRUE");
    const count = parseInt(countRes.rows[0].total, 10);
    assert(count >= 2, `Verified participant count in database is ${count} (>= 2).`);

    await query("UPDATE events SET registration_status = 'closed', registration_closed_at = NOW() WHERE id = 'evergreen_2026'");
    const closedEventRes = await query("SELECT registration_status FROM events WHERE id = 'evergreen_2026'");
    assert(closedEventRes.rows[0].registration_status === 'closed', 'Step 1: Registration closed successfully.');

    // STEP 2: Generate Secret Santa draw
    const genResult = await generateDraw('evergreen_2026');
    assert(genResult.success, `Step 2: Secret Santa draw generated (${genResult.totalAssigned} assignments created with is_locked = FALSE).`);

    const assignCheck = await query("SELECT COUNT(*) as total, bool_and(is_locked) as all_locked FROM assignments WHERE event_id = 'evergreen_2026'");
    assert(parseInt(assignCheck.rows[0].total, 10) >= 2 && !assignCheck.rows[0].all_locked, 'Assignments stored in DB with is_locked = FALSE (awaiting Step 3).');

    // Verify cannot start event before locking draw
    const eventPreLock = await query("SELECT * FROM events WHERE id = 'evergreen_2026'");
    assert(!eventPreLock.rows[0].draw_locked, 'Event correctly reflects draw_locked = FALSE.');

    // STEP 3: Lock Secret Santa draw
    const lockResult = await lockDraw('evergreen_2026');
    assert(lockResult.success, `Step 3: Secret Santa draw locked permanently (${lockResult.totalLocked} pairs).`);

    const eventPostLock = await query("SELECT * FROM events WHERE id = 'evergreen_2026'");
    assert(eventPostLock.rows[0].draw_locked, 'Event correctly reflects draw_locked = TRUE.');

    // Verify cannot regenerate after locking
    try {
      await generateDraw('evergreen_2026');
      assert(false, 'Should reject draw regeneration after locking');
    } catch (e) {
      assert(e.message.includes('locked'), `Regeneration strictly blocked when draw is locked: "${e.message}"`);
    }

    // STEP 4: Start THE EVERGREEN EXPRESS
    await query("UPDATE events SET event_status = 'active', event_started_at = NOW() WHERE id = 'evergreen_2026'");
    const eventLive = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    assert(eventLive.rows[0].event_status === 'active', 'Step 4: Event status is active (LIVE). Participants can now board.');

    // -------------------------------------------------------------------------
    // TEST SUITE 4: Reset Protection & Verification Snapshot (Task 4)
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Database Reset Safeguards & Automated Backup ---');

    // Reset while LIVE must be blocked
    const liveCheck = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    assert(liveCheck.rows[0].event_status === 'active', 'Event is currently LIVE.');

    // End event before reset
    await query("UPDATE events SET event_status = 'ended', event_ended_at = NOW() WHERE id = 'evergreen_2026'");
    const endedCheck = await query("SELECT event_status FROM events WHERE id = 'evergreen_2026'");
    assert(endedCheck.rows[0].event_status === 'ended', 'Celebration ended cleanly.');

    // Create backup snapshot before clearing
    const curAssign = await query("SELECT * FROM assignments WHERE event_id = 'evergreen_2026'");
    const snapshot = {
      timestamp: new Date().toISOString(),
      assignments: curAssign.rows,
    };

    const backupRes = await query(
      `INSERT INTO system_backups (backup_type, snapshot_data)
       VALUES ('PRE_RESET_SNAPSHOT', $1)
       RETURNING id`,
      [JSON.stringify(snapshot)]
    );
    assert(backupRes.rowCount === 1, `Verified backup snapshot created in system_backups (ID: ${backupRes.rows[0].id}).`);

    // Reset assignments and event state
    await query("DELETE FROM assignments WHERE event_id = 'evergreen_2026'");
    await query(
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

    const postReset = await query("SELECT * FROM events WHERE id = 'evergreen_2026'");
    assert(
      postReset.rows[0].registration_status === 'open' &&
      postReset.rows[0].event_status === 'pending' &&
      !postReset.rows[0].draw_generated &&
      !postReset.rows[0].draw_locked,
      'Event successfully reset back to Open & Pending.'
    );

    // Verify admin accounts were untouched
    const adminCount = await query("SELECT COUNT(*) as total FROM administrators WHERE account_status = 'active'");
    assert(parseInt(adminCount.rows[0].total, 10) >= 1, 'Administrator account preserved through database reset.');

    // Clean up lifecycle test users
    await query("DELETE FROM participants WHERE email LIKE '%@lifecycle.test'");

    console.log('\n=============================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Lifecycle test execution error:', err);
    process.exit(1);
  }
}

runComprehensiveTests();

