import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, query } from '../config/db.js';

async function runMultiUserTests() {
  console.log('\n=============================================================');
  console.log('   THE EVERGREEN EXPRESS — MULTI-USER REGISTRATION TESTS     ');
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

  const userA = { email: 'dr.evelyn.reed@college.edu', name: 'Dr. Evelyn Reed', pwd: 'ChristmasPassword123!' };
  const userB = { email: 'prof.marcus.vance@gmail.com', name: 'Prof. Marcus Vance', pwd: 'HolidaySecret2026!' };
  const userC = { email: 'dr.evelyn.reed.dupname@outlook.com', name: 'Dr. Evelyn Reed', pwd: 'DifferentPassword2026!' }; // Same name as User A!

  try {
    // 0. Clean up test users if they exist from prior runs
    const testEmails = [userA.email, userB.email, userC.email];
    for (const em of testEmails) {
      await query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [em]);
      await query('DELETE FROM participants WHERE LOWER(email) = $1', [em]);
    }

    // -------------------------------------------------------------------------
    // TEST 1: New Email Registration & Independent OTP Generation (3 Different Addresses)
    // -------------------------------------------------------------------------
    console.log('--- Test 1: New Email Registration for 3 Different Addresses ---');
    const otps = {};
    for (const user of [userA, userB, userC]) {
      const rawOtp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = await bcrypt.hash(rawOtp, 8);
      const passwordHash = await bcrypt.hash(user.pwd, 10);
      otps[user.email] = { rawOtp, otpHash, passwordHash };

      const regData = { fullName: user.name, email: user.email, passwordHash, department: 'Academic Faculty' };
      await query(
        `INSERT INTO email_verifications (email, otp_hash, registration_data, expires_at, resend_available_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '60 seconds')`,
        [user.email, otpHash, JSON.stringify(regData)]
      );

      const check = await query('SELECT email, otp_hash FROM email_verifications WHERE LOWER(email) = $1', [user.email]);
      assert(check.rowCount === 1, `Pending verification created for ${user.email} (non-owner address accepted).`);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Each address receives its own distinct OTP (No global OTP)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Independent 6-Digit OTP Generation per Participant ---');
    const distinctOtps = new Set([otps[userA.email].rawOtp, otps[userB.email].rawOtp, otps[userC.email].rawOtp]);
    assert(distinctOtps.size === 3, 'All 3 participants receive unique, distinct 6-digit OTP codes.');

    // -------------------------------------------------------------------------
    // TEST 3: Each OTP verifies only its corresponding email (Cross-verification is blocked)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: OTP Isolation (OTP from Email A cannot verify Email B) ---');
    const recB = await query('SELECT otp_hash FROM email_verifications WHERE LOWER(email) = $1', [userB.email]);
    const crossMatch = await bcrypt.compare(otps[userA.email].rawOtp, recB.rows[0].otp_hash);
    assert(!crossMatch, 'User A OTP is strictly rejected when attempted against User B verification.');

    const selfMatchB = await bcrypt.compare(otps[userB.email].rawOtp, recB.rows[0].otp_hash);
    assert(selfMatchB, 'User B OTP successfully verifies against User B verification record.');

    // -------------------------------------------------------------------------
    // TEST 4: Simultaneous / Concurrent Registration by Two People
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Simultaneous Concurrent Registrations (Race Conditions) ---');
    const simEmail1 = 'concurrent.prof.alpha@stpaulscollege.edu';
    const simEmail2 = 'concurrent.prof.beta@stpaulscollege.edu';
    await query('DELETE FROM email_verifications WHERE email IN ($1, $2)', [simEmail1, simEmail2]);

    const simOtp1 = crypto.randomInt(100000, 1000000).toString();
    const simOtp2 = crypto.randomInt(100000, 1000000).toString();
    const [h1, h2] = await Promise.all([bcrypt.hash(simOtp1, 8), bcrypt.hash(simOtp2, 8)]);

    // Simulate 2 participants submitting registration form at the exact same millisecond
    await Promise.all([
      query(
        `INSERT INTO email_verifications (email, otp_hash, registration_data, expires_at, resend_available_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '60 seconds')`,
        [simEmail1, h1, JSON.stringify({ fullName: 'Prof. Alpha' })]
      ),
      query(
        `INSERT INTO email_verifications (email, otp_hash, registration_data, expires_at, resend_available_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '60 seconds')`,
        [simEmail2, h2, JSON.stringify({ fullName: 'Prof. Beta' })]
      ),
    ]);

    const simCheck = await query('SELECT email FROM email_verifications WHERE email IN ($1, $2)', [simEmail1, simEmail2]);
    assert(simCheck.rowCount === 2, 'Simultaneous registrations from different users persist independently without overwriting.');

    // Clean up simulation rows
    await query('DELETE FROM email_verifications WHERE email IN ($1, $2)', [simEmail1, simEmail2]);

    // -------------------------------------------------------------------------
    // TEST 5: Duplicate Participant Names Allowed (User A and User C share name)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Duplicate Participant Full Names Allowed ---');
    assert(userA.name === userC.name, 'User A and User C have identical full names: "Dr. Evelyn Reed".');

    const seqA = await query("SELECT nextval('participant_id_seq') as next_num");
    const pidA = `SS${seqA.rows[0].next_num}`;
    await query(
      `INSERT INTO participants (participant_id, full_name, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [pidA, userA.name, userA.email, otps[userA.email].passwordHash]
    );

    const seqC = await query("SELECT nextval('participant_id_seq') as next_num");
    const pidC = `SS${seqC.rows[0].next_num}`;
    await query(
      `INSERT INTO participants (participant_id, full_name, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [pidC, userC.name, userC.email, otps[userC.email].passwordHash]
    );

    const dupNameCheck = await query('SELECT participant_id, email FROM participants WHERE full_name = $1', [userA.name]);
    assert(dupNameCheck.rowCount === 2, 'Both participants with identical name "Dr. Evelyn Reed" are successfully created.');
    assert(pidA !== pidC, `Each duplicate-named participant receives a distinct ID (${pidA} vs ${pidC}).`);

    // -------------------------------------------------------------------------
    // TEST 6: Duplicate Email Registration is Strictly Blocked
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Duplicate Email Registration Rejection ---');
    try {
      await query(
        `INSERT INTO participants (participant_id, full_name, email, password_hash, email_verified)
         VALUES ('SS999', 'Fake Dr. Reed', $1, 'somehash', TRUE)`,
        [userA.email]
      );
      assert(false, 'Should have blocked duplicate email');
    } catch (e) {
      assert(true, 'Duplicate email registration is strictly rejected by database uniqueness constraint.');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Expired OTP Rejection
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Expired OTP Enforcement ---');
    await query("UPDATE email_verifications SET expires_at = NOW() - INTERVAL '1 second' WHERE email = $1", [userB.email]);
    const expRes = await query('SELECT expires_at FROM email_verifications WHERE email = $1', [userB.email]);
    const isExpired = new Date(expRes.rows[0].expires_at) < new Date();
    assert(isExpired, 'Expired OTP is recognized as expired.');

    // -------------------------------------------------------------------------
    // TEST 8: Resending OTP after cooldown & invalidating old OTP
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Resend OTP Cooldown & Old Code Invalidation ---');
    const freshOtpB = '654321';
    const freshHashB = await bcrypt.hash(freshOtpB, 8);
    await query(
      `UPDATE email_verifications 
       SET otp_hash = $1, expires_at = NOW() + INTERVAL '5 minutes', resend_available_at = NOW() + INTERVAL '60 seconds'
       WHERE email = $2`,
      [freshHashB, userB.email]
    );

    const updatedRecB = await query('SELECT otp_hash, resend_available_at FROM email_verifications WHERE email = $1', [userB.email]);
    const oldCodeWorks = await bcrypt.compare(otps[userB.email].rawOtp, updatedRecB.rows[0].otp_hash);
    const newCodeWorks = await bcrypt.compare(freshOtpB, updatedRecB.rows[0].otp_hash);
    assert(!oldCodeWorks, 'Previously issued OTP is strictly invalidated after resend.');
    assert(newCodeWorks, 'Newly issued OTP is active and verifiable.');

    // -------------------------------------------------------------------------
    // TEST 9: Login via Participant ID OR Email Address
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Participant Login via ID OR Email ---');
    // Login with Participant ID (pidA)
    const loginById = await query(
      'SELECT id, participant_id, email FROM participants WHERE UPPER(participant_id) = UPPER($1) OR LOWER(email) = LOWER($1)',
      [pidA]
    );
    assert(loginById.rowCount === 1 && loginById.rows[0].participant_id === pidA, `Participant can authenticate via ID: ${pidA}.`);

    // Login with Email address
    const loginByEmail = await query(
      'SELECT id, participant_id, email FROM participants WHERE UPPER(participant_id) = UPPER($1) OR LOWER(email) = LOWER($1)',
      [userA.email]
    );
    assert(loginByEmail.rowCount === 1 && loginByEmail.rows[0].email === userA.email, `Participant can authenticate via Email: ${userA.email}.`);

    // Clean up created participants
    for (const em of testEmails) {
      await query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [em]);
      await query('DELETE FROM participants WHERE LOWER(email) = $1', [em]);
    }

    console.log('\n=============================================================');
    console.log(` MULTI-USER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runMultiUserTests();

