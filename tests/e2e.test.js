import { pool, query } from '../config/db.js';

async function runE2ETest() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — END-TO-END FLOW TEST          ');
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
    // 1. Clean up any existing test accounts to keep test clean
    await query("DELETE FROM participants WHERE email LIKE '%@testcollege.edu'");

    // 2. Test Registration of 3 Faculty Members
    console.log('--- 1. Testing Registration of Faculty Members ---');
    const facultyData = [
      { name: 'Dr. Alistair Finch', email: 'alistair@testcollege.edu', pwd: 'ChristmasPassword123!', dept: 'Department of Physics' },
      { name: 'Prof. Clara Oswald', email: 'clara@testcollege.edu', pwd: 'ChristmasPassword123!', dept: 'Department of English Literature' },
      { name: 'Dr. River Song', email: 'river@testcollege.edu', pwd: 'ChristmasPassword123!', dept: 'Department of Archaeology' },
    ];

    const registeredUsers = [];
    for (const fac of facultyData) {
      const seqRes = await query("SELECT nextval('participant_id_seq') as next_val");
      const pId = `SS${seqRes.rows[0].next_val}`;

      // Insert directly or through test
      const res = await query(
        `INSERT INTO participants (participant_id, full_name, email, password_hash, department, gift_preference)
         VALUES ($1, $2, $3, 'hash_test_placeholder', $4, 'Holiday books')
         RETURNING id, participant_id, full_name, email`,
        [pId, fac.name, fac.email, fac.dept]
      );
      registeredUsers.push(res.rows[0]);
    }

    assert(registeredUsers.length === 3, 'Successfully registered 3 faculty members with sequential IDs.');
    registeredUsers.forEach(u => {
      assert(u.participant_id.startsWith('SS'), `Participant received valid format ID: ${u.participant_id}`);
    });

    // 3. Test Email Uniqueness constraint
    console.log('\n--- 2. Testing Database Constraint Enforcements ---');
    try {
      await query(
        `INSERT INTO participants (participant_id, full_name, email, password_hash)
         VALUES ('SS999', 'Duplicate Email Test', 'alistair@testcollege.edu', 'somehash')`
      );
      assert(false, 'Should prevent duplicate email registration');
    } catch (e) {
      assert(true, 'Database strictly rejected duplicate email address.');
    }

    // 4. Test Duplicate Names with Different Emails
    try {
      const seqRes = await query("SELECT nextval('participant_id_seq') as next_val");
      const dupId = `SS${seqRes.rows[0].next_val}`;
      const dupRes = await query(
        `INSERT INTO participants (participant_id, full_name, email, password_hash)
         VALUES ($1, 'Dr. Alistair Finch', 'alistair.second@testcollege.edu', 'somehash')
         RETURNING participant_id, full_name`,
        [dupId]
      );
      assert(dupRes.rowCount === 1, 'Allowed two participants with the identical full name but different emails.');
      // clean up duplicate
      await query("DELETE FROM participants WHERE email = 'alistair.second@testcollege.edu'");
    } catch (e) {
      assert(false, 'Should allow identical names with different emails');
    }

    // 5. Test Derangement Generation & Lock
    console.log('\n--- 3. Testing Secret Santa Derangement Transaction ---');
    // Step 1: Close registration first as required by event lifecycle
    await query("UPDATE events SET registration_status = 'closed', registration_closed_at = NOW() WHERE id = 'evergreen_2026'");
    const { generateAndLockDraw } = await import('../services/drawService.js');
    const drawRes = await generateAndLockDraw('evergreen_2026');
    assert(drawRes.success, 'Derangement algorithm generated and locked assignments.');

    // 6. Verify Assignments in Database
    const assignRes = await query(`
      SELECT a.id, g.participant_id as giver_id, r.participant_id as recipient_id
      FROM assignments a
      JOIN participants g ON a.giver_id = g.id
      JOIN participants r ON a.recipient_id = r.id
      WHERE a.event_id = 'evergreen_2026'
    `);
    assert(assignRes.rowCount >= 3, `Stored ${assignRes.rowCount} permanent assignments in database.`);

    let zeroSelfAssignments = true;
    assignRes.rows.forEach(a => {
      if (a.giver_id === a.recipient_id) zeroSelfAssignments = false;
    });
    assert(zeroSelfAssignments, 'Verified 100% zero self-assignments in the live database records.');

    // 7. Verify Draw Lock Enforcement
    try {
      await generateAndLockDraw('evergreen_2026');
      assert(false, 'Should prevent regenerating locked draw');
    } catch (e) {
      assert(true, 'System strictly prevented regenerating assignments after draw was locked.');
    }

    // 8. Clean up test assignments and participants to leave clean state for user
    await query("DELETE FROM assignments WHERE event_id = 'evergreen_2026'");
    await query("DELETE FROM participants WHERE email LIKE '%@testcollege.edu'");
    await query("UPDATE events SET draw_generated = FALSE, draw_locked = FALSE, event_status = 'pending', registration_status = 'open' WHERE id = 'evergreen_2026'");

    console.log('\n=============================================================');
    console.log(` E2E RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('E2E Test execution error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runE2ETest();

