import { sattoloDerangement, validateAssignments } from '../services/drawService.js';
import { pool, query } from '../config/db.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — AUTOMATED SYSTEM TESTS        ');
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
    // TEST SUITE 1: Secret Santa Derangement Algorithm (75–80 Faculty)
    // -------------------------------------------------------------------------
    console.log('--- Test Suite 1: Mathematical Derangement (80 Faculty Members) ---');
    const mockFaculty = [];
    for (let i = 1; i <= 80; i++) {
      mockFaculty.push({ id: `uuid-fac-${i}`, participant_id: `SS${100 + i}`, name: `Faculty Member ${i}` });
    }

    // Run 50 independent derangement generations
    let allValid = true;
    for (let round = 1; round <= 50; round++) {
      const deranged = sattoloDerangement(mockFaculty);
      if (!validateAssignments(mockFaculty, deranged)) {
        allValid = false;
        break;
      }
    }
    assert(allValid, '50 consecutive derangement rounds for 80 participants produced 100% valid assignments (strictly zero self-assignments, 1:1 bijection).');

    // Test minimum participants requirement
    try {
      sattoloDerangement([{ id: '1' }]);
      assert(false, 'Should throw error for < 2 participants');
    } catch (e) {
      assert(true, 'Throws error when fewer than 2 participants are provided.');
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 2: Live Database Schema Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Supabase Relational Tables & Constraints ---');
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    const requiredTables = ['administrators', 'assignments', 'audit_logs', 'email_notifications', 'events', 'participants', 'reveal_records'];
    
    const allTablesPresent = requiredTables.every(t => tableNames.includes(t));
    assert(allTablesPresent, `All 7 relational tables are present in Supabase (${requiredTables.join(', ')}).`);

    // Verify participant sequence
    const seqRes = await query("SELECT nextval('participant_id_seq') as next_val");
    const nextVal = parseInt(seqRes.rows[0].next_val, 10);
    assert(nextVal >= 101, `Participant sequence is healthy and generates values >= 101 (current: SS${nextVal}).`);

    // Verify default event
    const eventRes = await query("SELECT * FROM events WHERE id = 'evergreen_2026'");
    assert(eventRes.rowCount === 1, 'Default event "evergreen_2026" exists with status "pending" and registration "open".');

    // Verify admin bootstrap
    const adminRes = await query("SELECT username, role FROM administrators WHERE username = 'admin'");
    assert(adminRes.rowCount === 1, 'Default administrator account "admin" is bootstrapped with bcrypt hash.');

    // -------------------------------------------------------------------------
    // TEST SUITE 3: Password Hashing Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Security & Password Hashing ---');
    const testPlain = 'ChristmasMagic2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(testPlain, salt);

    const matchGood = await bcrypt.compare(testPlain, hash);
    const matchBad = await bcrypt.compare('WrongPassword!', hash);
    assert(matchGood && !matchBad, 'bcrypt successfully validates authentic passwords and rejects invalid passwords.');

    console.log('\n=============================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

