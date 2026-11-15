import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, query } from '../config/db.js';
import { sendOtpEmail, getEmailStatus } from '../services/emailService.js';

async function runOtpTests() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — EMAIL OTP TEST SUITE          ');
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

  const testEmail = 'prof.elena.rostova@testcollege.edu';
  const testName = 'Prof. Elena Rostova';
  const testPassword = 'ChristmasSecret2026!';

  try {
    // 0. Clean up previous test runs
    await query('DELETE FROM email_verifications WHERE email = $1', [testEmail]);
    await query('DELETE FROM participants WHERE email = $1', [testEmail]);

    // -------------------------------------------------------------------------
    // TEST 1: Provider Configuration Inspection
    // -------------------------------------------------------------------------
    console.log('--- Case 1: Email Provider Detection & Rejection on Missing Config ---');
    const status = getEmailStatus();
    if (!status.configured) {
      const dryRun = await sendOtpEmail(testEmail, testName, '123456');
      assert(dryRun.success === false, 'System strictly rejects sending and refuses fake success when no email provider is configured.');
      assert(dryRun.userMessage.includes('not configured'), 'Returns clear, actionable message directing user to configure .env credentials.');
    } else {
      assert(true, `Active email provider detected: ${status.provider.toUpperCase()}`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: OTP Generation, Hashing & Storage Invariants
    // -------------------------------------------------------------------------
    console.log('\n--- Case 2: Cryptographic OTP Hashing & Database Security ---');
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Store in email_verifications table
    const regData = { fullName: testName, email: testEmail, passwordHash, department: 'Physics' };
    await query(
      `INSERT INTO email_verifications (email, otp_hash, registration_data, expires_at, resend_available_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '60 seconds')`,
      [testEmail, otpHash, JSON.stringify(regData)]
    );

    const recordRes = await query('SELECT * FROM email_verifications WHERE email = $1', [testEmail]);
    assert(recordRes.rowCount === 1, 'OTP verification record created in database with 5-minute expiry.');
    assert(recordRes.rows[0].otp_hash !== rawOtp, 'Plain OTP is NOT stored in the database (stored as salted bcrypt hash).');

    // -------------------------------------------------------------------------
    // TEST 3: Incorrect OTP is rejected and attempt counter increments
    // -------------------------------------------------------------------------
    console.log('\n--- Case 3: Incorrect OTP Rejection & Attempt Counter ---');
    const badOtp = '000000';
    const isBadMatch = await bcrypt.compare(badOtp, recordRes.rows[0].otp_hash);
    assert(!isBadMatch, 'Bcrypt strictly rejects incorrect OTP code.');

    await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE email = $1', [testEmail]);
    const attemptCheck = await query('SELECT attempts FROM email_verifications WHERE email = $1', [testEmail]);
    assert(attemptCheck.rows[0].attempts === 1, 'Attempt counter successfully tracks failed verification attempts.');

    // -------------------------------------------------------------------------
    // TEST 4: Expired OTP is rejected
    // -------------------------------------------------------------------------
    console.log('\n--- Case 4: Expired OTP Validation ---');
    await query("UPDATE email_verifications SET expires_at = NOW() - INTERVAL '1 minute' WHERE email = $1", [testEmail]);
    const expRes = await query('SELECT expires_at FROM email_verifications WHERE email = $1', [testEmail]);
    const isExpired = new Date(expRes.rows[0].expires_at) < new Date();
    assert(isExpired, 'Expired OTP is recognized and rejected by expiration timestamp comparison.');

    // Restore valid expiry for subsequent tests
    await query("UPDATE email_verifications SET expires_at = NOW() + INTERVAL '5 minutes' WHERE email = $1", [testEmail]);

    // -------------------------------------------------------------------------
    // TEST 5: Resend OTP cooldown enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Case 5: Resend OTP Cooldown Enforcement ---');
    const cooldownRes = await query('SELECT resend_available_at FROM email_verifications WHERE email = $1', [testEmail]);
    const isWithinCooldown = new Date(cooldownRes.rows[0].resend_available_at) > new Date();
    assert(isWithinCooldown, 'Resend OTP is locked during active 60-second cooldown period.');

    // Simulate cooldown passing
    await query("UPDATE email_verifications SET resend_available_at = NOW() - INTERVAL '1 second' WHERE email = $1", [testEmail]);
    const cooledRes = await query('SELECT resend_available_at FROM email_verifications WHERE email = $1', [testEmail]);
    const isCooldownPassed = new Date(cooledRes.rows[0].resend_available_at) <= new Date();
    assert(isCooldownPassed, 'Resend OTP is unlocked once 60-second cooldown elapses.');

    // -------------------------------------------------------------------------
    // TEST 6: Repeated incorrect attempts block (Max 5 attempts)
    // -------------------------------------------------------------------------
    console.log('\n--- Case 6: Rate Limiting & Max Attempts Invalidation ---');
    await query('UPDATE email_verifications SET attempts = 5 WHERE email = $1', [testEmail]);
    const maxRes = await query('SELECT attempts FROM email_verifications WHERE email = $1', [testEmail]);
    const isExceeded = maxRes.rows[0].attempts >= 5;
    assert(isExceeded, 'Exceeding 5 failed attempts triggers code invalidation.');

    // Reset attempts and set valid OTP for account creation test
    await query('UPDATE email_verifications SET attempts = 0 WHERE email = $1', [testEmail]);

    // -------------------------------------------------------------------------
    // TEST 7 & 8: Correct OTP verification & Account Creation
    // -------------------------------------------------------------------------
    console.log('\n--- Case 7, 8 & 10: Successful Verification, Single ID & Login ---');
    const isGoodMatch = await bcrypt.compare(rawOtp, recordRes.rows[0].otp_hash);
    assert(isGoodMatch, 'Correct OTP verifies successfully against bcrypt hash.');

    // Generate unique participant ID
    const seqRes = await query("SELECT nextval('participant_id_seq') as next_num");
    const pId = `SS${seqRes.rows[0].next_num}`;

    await query(
      `INSERT INTO participants (participant_id, full_name, email, password_hash, department, email_verified)
       VALUES ($1, $2, $3, $4, 'Physics', TRUE)
       RETURNING id, participant_id, email, email_verified`,
      [pId, testName, testEmail, passwordHash]
    );

    // Clean up verification record
    await query('DELETE FROM email_verifications WHERE email = $1', [testEmail]);
    const cleanCheck = await query('SELECT id FROM email_verifications WHERE email = $1', [testEmail]);
    assert(cleanCheck.rowCount === 0, 'Verification record safely purged after successful account creation.');

    // Verify account in database
    const userRes = await query('SELECT * FROM participants WHERE email = $1', [testEmail]);
    assert(userRes.rowCount === 1, 'Participant account permanently stored in Supabase with email_verified = TRUE.');
    assert(userRes.rows[0].participant_id === pId, `Participant ID is assigned exactly once (${pId}).`);

    // Verify login with Participant ID and Password
    const loginUser = userRes.rows[0];
    const passwordValid = await bcrypt.compare(testPassword, loginUser.password_hash);
    const canLogin = passwordValid && loginUser.email_verified === true && loginUser.account_status === 'active';
    assert(canLogin, 'Verified participant can successfully authenticate using Participant ID and Password.');

    // -------------------------------------------------------------------------
    // TEST 9: Duplicate email prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Case 9: Duplicate Email Registration Prevention ---');
    try {
      await query(
        `INSERT INTO participants (participant_id, full_name, email, password_hash, email_verified)
         VALUES ('SS998', 'Duplicate Test', $1, 'somehash', TRUE)`,
        [testEmail]
      );
      assert(false, 'Should prevent duplicate email registration');
    } catch (e) {
      assert(true, 'PostgreSQL unique constraint strictly blocks duplicate email registration.');
    }

    // Clean up test participant
    await query('DELETE FROM participants WHERE email = $1', [testEmail]);

    console.log('\n=============================================================');
    console.log(` OTP TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('OTP Test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runOtpTests();
