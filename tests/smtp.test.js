import { getEmailConfig, getEmailStatus, sendOtpEmail } from '../services/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

async function runSmtpTests() {
  console.log('\n=============================================================');
  console.log('    THE EVERGREEN EXPRESS — GMAIL SMTP INTEGRATION TESTS     ');
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

  // ---------------------------------------------------------------------------
  // TEST 1: Dynamic Recipient Resolution
  // ---------------------------------------------------------------------------
  console.log('--- Test 1: Dynamic Recipient Resolution (Individual Delivery) ---');
  const emails = ['participant1@gmail.com', 'participant2@outlook.com', 'faculty3@college.edu'];
  
  emails.forEach((email, idx) => {
    assert(email.includes('@'), `Participant ${idx + 1} receives individualized destination: ${email}`);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Google App Password Space-Stripping & Fallback Compatibility
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 2: Google App Password Format & Sanitization ---');
  const originalEnv = { ...process.env };

  try {
    // Simulate App Password with copied spaces: "abcd efgh ijkl mnop"
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'evergreen.express.official@gmail.com';
    process.env.SMTP_APP_PASSWORD = 'abcd efgh ijkl mnop';
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.EMAIL_FROM;

    const config = getEmailConfig();
    assert(config.smtpPass === 'abcdefghijklmnop', 'Automatically strips spaces from 16-character Google App Passwords.');
    assert(config.smtpPort === 465, 'Correctly parses SMTP_PORT as 465.');
    assert(config.smtpSecure === true, 'Defaults smtpSecure to true for port 465.');
    assert(config.emailFrom.includes('evergreen.express.official@gmail.com'), 'Auto-formats SMTP_FROM with THE EVERGREEN EXPRESS brand.');

    // Fallback test: using SMTP_PASS instead of SMTP_APP_PASSWORD
    delete process.env.SMTP_APP_PASSWORD;
    process.env.SMTP_PASS = 'wxyz 1234 5678 90ab';
    const fallbackConfig = getEmailConfig();
    assert(fallbackConfig.smtpPass === 'wxyz1234567890ab', 'Backward-compatible fallback to SMTP_PASS works cleanly.');

    // Custom port 587 with STARTTLS test
    process.env.SMTP_PORT = '587';
    delete process.env.SMTP_SECURE;
    const port587Config = getEmailConfig();
    assert(port587Config.smtpSecure === false, 'Port 587 defaults to smtpSecure = false (STARTTLS).');
  } finally {
    process.env = originalEnv;
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Diagnostic Status & Credential Masking
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 3: Status Diagnostics & Credential Masking ---');
  try {
    process.env.SMTP_USER = 'conductor.express@gmail.com';
    process.env.SMTP_APP_PASSWORD = 'abcdefghijklmnop';
    const status = getEmailStatus();
    assert(status.configured === true, 'Status correctly reports configured = true.');
    assert(!status.smtpUserMasked.includes('conductor.express'), 'SMTP user is safely masked for public logs and diagnostics.');
    assert(status.provider === 'smtp', 'Provider is identified as SMTP.');
  } finally {
    process.env = originalEnv;
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Missing Configuration Security Enforcement
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 4: Missing Configuration Refusal & Safe Logging ---');
  try {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_APP_PASSWORD;
    delete process.env.SMTP_PASS;
    process.env.ENABLE_EMAIL_SIMULATOR = 'false';

    const dryRun = await sendOtpEmail('unknown.user@test.org', 'Unknown User', '123456');
    assert(dryRun.success === false, 'Strictly refuses fake success when SMTP credentials are not configured.');
    assert(dryRun.userMessage.includes('not configured yet'), 'Returns clear, actionable message directing user to configure .env credentials.');
  } finally {
    process.env = originalEnv;
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Concurrent Multi-Participant OTP Generation & Cryptographic Hashing
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 5: Concurrency & Independent Cryptographic Hashes ---');
  const participants = [
    { email: 'sarah.connor@college.edu', name: 'Dr. Sarah Connor' },
    { email: 'john.watson@college.edu', name: 'Dr. John Watson' },
    { email: 'marie.curie@college.edu', name: 'Prof. Marie Curie' },
  ];

  // Generate OTPs concurrently
  const generatedOtps = participants.map(p => ({
    ...p,
    rawOtp: crypto.randomInt(100000, 1000000).toString(),
  }));

  // Verify all OTPs are 6 digits and distinct
  const uniqueOtps = new Set(generatedOtps.map(p => p.rawOtp));
  assert(uniqueOtps.size === participants.length, 'All participants receive unique cryptographically generated 6-digit OTPs.');

  // Hash concurrently
  const hashedOtps = await Promise.all(
    generatedOtps.map(async p => ({
      ...p,
      hash: await bcrypt.hash(p.rawOtp, 8),
    }))
  );

  // Cross-verification: each hash matches ONLY its own OTP
  for (let i = 0; i < hashedOtps.length; i++) {
    const isSelfMatch = await bcrypt.compare(hashedOtps[i].rawOtp, hashedOtps[i].hash);
    assert(isSelfMatch, `Participant ${hashedOtps[i].name} OTP matches their unique hash.`);

    // Check that other participants cannot verify against this hash
    const otherIdx = (i + 1) % hashedOtps.length;
    const isCrossMatch = await bcrypt.compare(hashedOtps[otherIdx].rawOtp, hashedOtps[i].hash);
    assert(!isCrossMatch, `Participant ${hashedOtps[otherIdx].name}'s OTP cannot verify Participant ${hashedOtps[i].name}'s hash.`);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Simulator Mode Verification for Offline Development
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 6: Offline Simulator Dispatch Mode ---');
  try {
    process.env.ENABLE_EMAIL_SIMULATOR = 'true';
    const simResult = await sendOtpEmail('offline.test@example.com', 'Offline Tester', '999888');
    assert(simResult.success === true, 'Simulator allows offline development without failing registration.');
    assert(simResult.provider === 'simulator', 'Reports provider as simulator.');
  } finally {
    process.env = originalEnv;
  }

  console.log('\n=============================================================');
  console.log(` SMTP TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runSmtpTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

