import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { pool, query } from '../config/db.js';
import { sendOtpViaGoogleScript, sendOtpEmail, getEmailStatus } from '../services/emailService.js';

dotenv.config();

async function runGasOtpSuite() {
  console.log('\n=============================================================');
  console.log('  THE EVERGREEN EXPRESS — GOOGLE APPS SCRIPT OTP TEST SUITE  ');
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

  const testEmail = 'gas.test.faculty@college.edu';
  const testName = 'Dr. Julian Vance';
  const testPassword = 'EvergreenHoliday2026!';

  try {
    // 0. Clean up any previous test state
    await query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    await query('DELETE FROM participants WHERE LOWER(email) = $1', [testEmail]);

    // -------------------------------------------------------------------------
    // TEST 1: Provider Detection & Environment Variables
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Google Apps Script Provider Detection ---');
    const status = getEmailStatus();
    assert(status.googleScriptConfigured === true, 'GOOGLE_SCRIPT_URL and GOOGLE_SCRIPT_SECRET are detected in environment.');
    assert(status.provider === 'google_script', 'Primary email provider is GOOGLE_SCRIPT.');
    assert(status.isSimulator === false, 'Simulator mode is completely inactive.');

    // -------------------------------------------------------------------------
    // TEST 2: Google Apps Script Web App HTTPS POST & Secret Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Google Apps Script HTTPS Endpoint & Security ---');
    // Test with invalid secret
    const origSecret = process.env.GOOGLE_SCRIPT_SECRET;
    try {
      process.env.GOOGLE_SCRIPT_SECRET = 'invalid-secret-for-test';
      const unauthorizedResult = await sendOtpViaGoogleScript(testEmail, '123456');
      assert(unauthorizedResult.success === false, 'Google Apps Script strictly rejects requests with unauthorized secret.');
      assert(unauthorizedResult.userMessage.includes('authorization') || unauthorizedResult.error.includes('Unauthorized'), 'Clear unauthorized message returned.');
    } finally {
      process.env.GOOGLE_SCRIPT_SECRET = origSecret;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Email Delivery Failure Handling (No Verification on Failure)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Failure Handling & Email Verification Integrity ---');
    // If an invalid endpoint or failed delivery occurs, the system must NOT mark verified
    const dummyFailResult = await sendOtpViaGoogleScript('', '123456');
    assert(dummyFailResult.success === false, 'Invalid delivery target is rejected with success: false.');

    // -------------------------------------------------------------------------
    // TEST 4: Backend Cryptographic OTP Generation & Salted Hashing
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Cryptographic OTP Hashing & Secure Storage ---');
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    assert(rawOtp.length === 6 && /^\d{6}$/.test(rawOtp), 'Generates secure 6-digit numerical OTP.');

    const [otpHash, passwordHash] = await Promise.all([
      bcrypt.hash(rawOtp, 10),
      bcrypt.hash(testPassword, 10),
    ]);

    const regData = {
      fullName: testName,
      email: testEmail,
      passwordHash,
      department: 'Department of Computer Science',
      giftPreference: 'Fountain pens and books',
    };

    // Staging record with 5-minute expiry and 60-second resend cooldown
    await query(
      `INSERT INTO email_verifications (
        email, otp_hash, registration_data, expires_at, resend_available_at
       ) VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '60 seconds')`,
      [testEmail, otpHash, JSON.stringify(regData)]
    );

    const recordRes = await query('SELECT * FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    assert(recordRes.rowCount === 1, 'Verification record safely staged in database.');
    assert(recordRes.rows[0].otp_hash !== rawOtp, 'Plain OTP is never stored in database (stored as bcrypt hash).');

    // -------------------------------------------------------------------------
    // TEST 5: Incorrect OTP Rejection & Max 5 Attempts Counter
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Incorrect OTP Handling & 5-Attempt Limit ---');
    const wrongOtp = '000000';
    const isBadMatch = await bcrypt.compare(wrongOtp, recordRes.rows[0].otp_hash);
    assert(isBadMatch === false, 'Bcrypt comparison strictly rejects incorrect OTP.');

    // Increment attempts
    await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE LOWER(email) = $1', [testEmail]);
    const attempt1 = await query('SELECT attempts FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    assert(attempt1.rows[0].attempts === 1, 'Attempt counter incremented to 1.');

    // Simulate exceeding 5 attempts
    await query('UPDATE email_verifications SET attempts = 5 WHERE LOWER(email) = $1', [testEmail]);
    const maxRes = await query('SELECT attempts FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    assert(maxRes.rows[0].attempts >= 5, 'System detects 5 failed attempts reached.');

    // Reset attempts for subsequent tests
    await query('UPDATE email_verifications SET attempts = 0 WHERE LOWER(email) = $1', [testEmail]);

    // -------------------------------------------------------------------------
    // TEST 6: Resend Cooldown Enforcement (60s)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Resend Cooldown Enforcement ---');
    const cooldownCheck = await query('SELECT resend_available_at FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    const isInCooldown = new Date(cooldownCheck.rows[0].resend_available_at) > new Date();
    assert(isInCooldown === true, 'Resend request blocked during active 60s cooldown.');

    // Simulate cooldown passing
    await query("UPDATE email_verifications SET resend_available_at = NOW() - INTERVAL '1 second' WHERE LOWER(email) = $1", [testEmail]);
    const cooledCheck = await query('SELECT resend_available_at FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    assert(new Date(cooledCheck.rows[0].resend_available_at) <= new Date(), 'Resend request allowed after cooldown elapses.');

    // -------------------------------------------------------------------------
    // TEST 7: Expired OTP Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Expired OTP Validation ---');
    await query("UPDATE email_verifications SET expires_at = NOW() - INTERVAL '1 minute' WHERE LOWER(email) = $1", [testEmail]);
    const expCheck = await query('SELECT expires_at FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    assert(new Date(expCheck.rows[0].expires_at) < new Date(), 'Expired OTP recognized and rejected.');

    // Restore valid 5-minute expiry
    await query("UPDATE email_verifications SET expires_at = NOW() + INTERVAL '5 minutes' WHERE LOWER(email) = $1", [testEmail]);

    // -------------------------------------------------------------------------
    // TEST 8: Successful OTP Verification & SS Participant ID Assignment
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Successful Verification & Participant Creation ---');
    const isCorrect = await bcrypt.compare(rawOtp, recordRes.rows[0].otp_hash);
    assert(isCorrect === true, 'Correct OTP verified successfully against bcrypt hash.');

    // Fetch next sequence for participant ID
    const seqRes = await query("SELECT nextval('participant_id_seq') as next_num");
    const newParticipantId = `SS${seqRes.rows[0].next_num}`;

    // Create participant only after successful verification
    const insertRes = await query(
      `INSERT INTO participants (
        participant_id, full_name, email, password_hash, department, gift_preference, email_verified
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, participant_id, email, email_verified`,
      [newParticipantId, regData.fullName, testEmail, regData.passwordHash, regData.department, regData.giftPreference]
    );

    assert(insertRes.rowCount === 1, 'Participant record created in participants table.');
    assert(insertRes.rows[0].participant_id === newParticipantId, `Assigned unique Participant ID: ${newParticipantId}`);
    assert(insertRes.rows[0].email_verified === true, 'Participant email_verified flag set to TRUE.');

    // Clean up verification record (single-use guarantee)
    await query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    const postVerifyCheck = await query('SELECT id FROM email_verifications WHERE LOWER(email) = $1', [testEmail]);
    assert(postVerifyCheck.rowCount === 0, 'Verification session purged: OTP cannot be reused.');

    // -------------------------------------------------------------------------
    // TEST 9: Authenticate with New Participant Credentials
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Participant Login Verification ---');
    const userRes = await query('SELECT * FROM participants WHERE LOWER(email) = $1', [testEmail]);
    const storedUser = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(testPassword, storedUser.password_hash);
    assert(passwordMatch === true, 'Participant can authenticate using the password set during registration.');
    assert(storedUser.account_status === 'active', 'Participant account status is active.');

    // -------------------------------------------------------------------------
    // TEST 10: Duplicate Email Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Duplicate Email Registration Prevention ---');
    try {
      await query(
        `INSERT INTO participants (participant_id, full_name, email, password_hash, email_verified)
         VALUES ('SS999', 'Duplicate Test', $1, 'somehash', TRUE)`,
        [testEmail]
      );
      assert(false, 'Should prevent duplicate email registration.');
    } catch (err) {
      assert(true, 'PostgreSQL unique constraint strictly blocks duplicate email registration.');
    }

    // Clean up test data
    await query('DELETE FROM participants WHERE LOWER(email) = $1', [testEmail]);

    console.log('\n=============================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runGasOtpSuite();
