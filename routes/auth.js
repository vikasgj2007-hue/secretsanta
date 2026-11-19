import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, query } from '../config/db.js';
import { sendOtpEmail, getEmailStatus, reloadEmailConfig } from '../services/emailService.js';

const router = express.Router();

/**
 * Helper to mask email address for privacy
 * Example: 'robert.vance@college.edu' -> 'ro***ce@college.edu'
 */
function maskEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];

  let maskedName = '';
  if (name.length <= 2) {
    maskedName = name[0] + '*';
  } else {
    maskedName = name.slice(0, 2) + '*'.repeat(Math.max(2, name.length - 4)) + name.slice(-2);
  }

  return `${maskedName}@${domain}`;
}

/**
 * POST /api/auth/register-request-otp
 * Validates registration data, generates a secure 6-digit OTP, and dispatches the verification email.
 * Account is NOT created yet.
 */
router.post('/register-request-otp', async (req, res) => {
  try {
    // Reload .env so any changes to Gmail credentials take effect immediately without server restart
    reloadEmailConfig();
    const { fullName, email, password, confirmPassword, giftPreference, department } = req.body;

    // 1. Validate required fields
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields (Full Name, Email, Password, and Confirm Password).',
      });
    }

    const trimmedName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    // 2. Validate email format (RFC-5322 compatible regex)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address that can receive emails (e.g. name@gmail.com).',
      });
    }

    // 3. Validate password matching & length
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match. Please verify both password fields.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // 4 & 5. Verify registration is open and prevent duplicate email concurrently
    const [eventRes, existingUser] = await Promise.all([
      query("SELECT registration_status FROM events WHERE id = 'evergreen_2026'"),
      query('SELECT id FROM participants WHERE LOWER(email) = $1', [cleanEmail]),
    ]);

    if (eventRes.rowCount > 0 && eventRes.rows[0].registration_status === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'Registration for The Evergreen Express is currently closed.',
      });
    }

    if (existingUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address has already been registered. Please log in using your Participant ID or Email.',
      });
    }

    // 6. Generate cryptographically secure random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // 7. Hash OTP (salt 8) and participant password (salt 10) concurrently for high performance
    const [otpHash, passwordHash] = await Promise.all([
      bcrypt.hash(rawOtp, 8),
      bcrypt.hash(password, 10),
    ]);

    // 9. Invalidate any previously pending verification for this email
    await query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [cleanEmail]);

    // 10. Store pending verification record with 5-minute expiry and 60-second resend cooldown
    const regData = {
      fullName: trimmedName,
      email: cleanEmail,
      passwordHash,
      department: department ? department.trim() : 'College Faculty',
      giftPreference: giftPreference ? giftPreference.trim() : 'Holiday surprise',
    };

    await query(
      `INSERT INTO email_verifications (
        email, otp_hash, registration_data, expires_at, resend_available_at
       ) VALUES (
        $1, $2, $3, NOW() + INTERVAL '5 minutes', NOW() + INTERVAL '60 seconds'
       )`,
      [cleanEmail, otpHash, JSON.stringify(regData)]
    );

    // 11. Dispatch verification email via Google Apps Script (or configured provider)
    const emailResult = await sendOtpEmail(cleanEmail, trimmedName, rawOtp);

    // If email failed to dispatch, remove pending verification and return error
    if (!emailResult.success) {
      await query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [cleanEmail]);

      return res.status(502).json({
        success: false,
        message: emailResult.userMessage || 'Failed to dispatch verification code to your email. Please verify your email address and try again.',
        error: emailResult.error,
        provider: emailResult.provider,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.',
      maskedEmail: maskEmail(cleanEmail),
      email: cleanEmail,
      expiresInMinutes: 5,
      resendCooldownSeconds: 60,
      provider: emailResult.provider,
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate verification code. Please try again.',
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP. On success, permanently creates the participant account and assigns a unique Participant ID.
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your email address and the 6-digit verification code.',
      });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    // 1. Find pending verification specifically associated with this email
    const verRes = await query(
      `SELECT id, otp_hash, registration_data, expires_at, attempts, resend_available_at
       FROM email_verifications
       WHERE LOWER(email) = $1 AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanEmail]
    );

    if (verRes.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active verification session found for this email address. Please submit the registration form again.',
      });
    }

    const verification = verRes.rows[0];

    // 2. Check Expiry (5 minutes)
    const now = new Date();
    if (new Date(verification.expires_at) < now) {
      return res.status(400).json({
        success: false,
        message: 'Your verification code has expired. Please click "Resend Code" to receive a new one.',
        isExpired: true,
      });
    }

    // 3. Check Attempt Limit (Max 5 attempts)
    if (verification.attempts >= 5) {
      await query('DELETE FROM email_verifications WHERE id = $1', [verification.id]);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. For security, this verification code has been invalidated. Please request a new code.',
        maxAttemptsExceeded: true,
      });
    }

    // 4. Verify OTP against bcrypt hash
    const isMatch = await bcrypt.compare(cleanOtp, verification.otp_hash);

    if (!isMatch) {
      // Increment attempt counter
      await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1', [verification.id]);
      const remainingAttempts = 5 - (verification.attempts + 1);

      return res.status(400).json({
        success: false,
        message: `Incorrect verification code. ${remainingAttempts > 0 ? remainingAttempts + ' attempt(s) remaining.' : 'Code invalidated.'}`,
        attemptsRemaining: Math.max(0, remainingAttempts),
      });
    }

    // 5 & 6. OTP IS VALID: Concurrently verify email uniqueness and fetch next sequence number
    const [existingCheck, seqRes] = await Promise.all([
      query('SELECT id FROM participants WHERE LOWER(email) = $1', [cleanEmail]),
      query("SELECT nextval('participant_id_seq') as next_num"),
    ]);

    if (existingCheck.rowCount > 0) {
      await query('DELETE FROM email_verifications WHERE id = $1', [verification.id]);
      return res.status(409).json({
        success: false,
        message: 'An account with this email address has already been registered.',
      });
    }

    const participantId = `SS${seqRes.rows[0].next_num}`;

    // 7. Insert new verified participant into participants table
    const regData = typeof verification.registration_data === 'string'
      ? JSON.parse(verification.registration_data)
      : verification.registration_data;

    const insertRes = await query(
      `INSERT INTO participants (
        participant_id, full_name, email, password_hash, gift_preference, department, email_verified
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, participant_id, full_name, email, department, gift_preference, created_at`,
      [
        participantId,
        regData.fullName,
        cleanEmail,
        regData.passwordHash,
        regData.giftPreference,
        regData.department,
      ]
    );

    const newParticipant = insertRes.rows[0];

    // 8. Delete pending verification record
    await query('DELETE FROM email_verifications WHERE id = $1', [verification.id]);

    // 9. Audit log
    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, ip_address, details)
       VALUES ('participant', $1, 'REGISTER_EMAIL_VERIFIED', $2, $3)`,
      [
        newParticipant.id,
        req.ip || 'unknown',
        JSON.stringify({ participantId, email: cleanEmail }),
      ]
    );

    // 10. Automatically establish session
    req.session.participantId = newParticipant.id;
    req.session.publicId = newParticipant.participant_id;
    req.session.fullName = newParticipant.full_name;
    req.session.role = 'participant';

    return res.status(201).json({
      success: true,
      message: 'Email verified successfully! Welcome aboard The Evergreen Express.',
      participantId: newParticipant.participant_id,
      user: {
        id: newParticipant.id,
        participantId: newParticipant.participant_id,
        fullName: newParticipant.full_name,
        email: newParticipant.email,
        department: newParticipant.department,
        giftPreference: newParticipant.gift_preference,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify code due to a server error. Please try again.',
    });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resends a fresh 6-digit OTP, enforcing a 60-second cooldown
 */
router.post('/resend-otp', async (req, res) => {
  try {
    // Reload .env so any changes to Gmail credentials take effect immediately without server restart
    reloadEmailConfig();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fetch pending verification
    const verRes = await query(
      `SELECT id, registration_data, resend_available_at
       FROM email_verifications
       WHERE LOWER(email) = $1 AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanEmail]
    );

    if (verRes.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending registration found. Please submit the registration form again.',
      });
    }

    const verification = verRes.rows[0];

    // 2. Check 60-second cooldown
    const now = new Date();
    const resendAvailableAt = new Date(verification.resend_available_at);

    if (now < resendAvailableAt) {
      const waitSeconds = Math.ceil((resendAvailableAt - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another verification code.`,
        waitSeconds,
      });
    }

    // 3. Generate new 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 8);

    // 4. Update verification record
    await query(
      `UPDATE email_verifications 
       SET otp_hash = $1, 
           expires_at = NOW() + INTERVAL '5 minutes', 
           resend_available_at = NOW() + INTERVAL '60 seconds',
           attempts = 0,
           created_at = NOW()
       WHERE id = $2`,
      [otpHash, verification.id]
    );

    const regData = typeof verification.registration_data === 'string'
      ? JSON.parse(verification.registration_data)
      : verification.registration_data;

    // 5. Send new OTP email
    const emailResult = await sendOtpEmail(cleanEmail, regData.fullName, rawOtp);

    if (!emailResult.success) {
      return res.status(502).json({
        success: false,
        message: emailResult.userMessage || 'Failed to dispatch fresh verification code.',
        error: emailResult.error,
      });
    }

    return res.json({
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched to your email.',
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification code. Please try again.',
    });
  }
});

/**
 * POST /api/auth/register (Direct registration endpoint for tests or backward-compatibility)
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, giftPreference, department } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    const trimmedName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    const existingUser = await query('SELECT id FROM participants WHERE LOWER(email) = $1', [cleanEmail]);
    if (existingUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address has already been registered.',
      });
    }

    const seqRes = await query("SELECT nextval('participant_id_seq') as next_num");
    const participantId = `SS${seqRes.rows[0].next_num}`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const insertRes = await query(
      `INSERT INTO participants (
        participant_id, full_name, email, password_hash, gift_preference, department, email_verified
       ) VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, participant_id, full_name, email, department, gift_preference, created_at`,
      [
        participantId,
        trimmedName,
        cleanEmail,
        passwordHash,
        giftPreference ? giftPreference.trim() : 'Holiday surprise',
        department ? department.trim() : 'College Faculty',
      ]
    );

    const newParticipant = insertRes.rows[0];

    req.session.participantId = newParticipant.id;
    req.session.publicId = newParticipant.participant_id;
    req.session.fullName = newParticipant.full_name;
    req.session.role = 'participant';

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome aboard The Evergreen Express.',
      participantId: newParticipant.participant_id,
      user: {
        id: newParticipant.id,
        participantId: newParticipant.participant_id,
        fullName: newParticipant.full_name,
        email: newParticipant.email,
        department: newParticipant.department,
        giftPreference: newParticipant.gift_preference,
      },
    });
  } catch (error) {
    console.error('Registration fallback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to a server error.',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates participant using Participant ID (e.g. SS101) OR registered Email Address, and Password.
 * Strictly verifies that the account's email has been verified.
 */
router.post('/login', async (req, res) => {
  try {
    const { participantId, email, password } = req.body;
    const identifier = String(participantId || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Participant ID (or Email Address) and Password.',
      });
    }

    const cleanUpper = identifier.toUpperCase();
    const cleanLower = identifier.toLowerCase();

    // Find participant by Participant ID (SS101) OR registered Email (LOWER)
    const userRes = await query(
      `SELECT id, participant_id, full_name, email, password_hash, department, gift_preference, account_status, email_verified
       FROM participants
       WHERE UPPER(participant_id) = $1 OR LOWER(email) = $2`,
      [cleanUpper, cleanLower]
    );

    if (userRes.rowCount === 0) {
      // Check if user entered an email that is still pending verification
      const pendingCheck = await query(
        'SELECT id FROM email_verifications WHERE LOWER(email) = $1 AND verified_at IS NULL',
        [cleanLower]
      );

      if (pendingCheck.rowCount > 0) {
        return res.status(401).json({
          success: false,
          message: 'This email is registered but not yet verified. Please complete email verification or register again.',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'No account found for this Participant ID or Email. Please verify your credentials or click "Register as Faculty".',
      });
    }

    const participant = userRes.rows[0];

    if (participant.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact the administrator.',
      });
    }

    if (participant.email_verified === false) {
      return res.status(403).json({
        success: false,
        message: 'Your email address has not been verified yet. Please complete email verification.',
      });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, participant.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify your password.',
      });
    }

    // Set server-side session
    req.session.participantId = participant.id;
    req.session.publicId = participant.participant_id;
    req.session.fullName = participant.full_name;
    req.session.role = 'participant';

    // Audit log (asynchronous so it doesn't block login response)
    query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, ip_address, details)
       VALUES ('participant', $1, 'LOGIN', $2, $3)`,
      [participant.id, req.ip || 'unknown', JSON.stringify({ participantId: participant.participant_id })]
    ).catch(err => console.warn('Could not record login audit log:', err.message));

    return res.json({
      success: true,
      message: `Welcome aboard, ${participant.full_name}!`,
      user: {
        id: participant.id,
        participantId: participant.participant_id,
        fullName: participant.full_name,
        email: participant.email,
        department: participant.department,
        giftPreference: participant.gift_preference,
      },
    });
  } catch (error) {
    console.error('Participant login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed due to a server error. Please try again.',
    });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.participantId || req.session.role !== 'participant') {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'No active participant session.',
      });
    }

    const userRes = await query(
      `SELECT id, participant_id, full_name, email, department, gift_preference
       FROM participants
       WHERE id = $1`,
      [req.session.participantId]
    );

    if (userRes.rowCount === 0) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Participant account not found.',
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      user: userRes.rows[0],
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving session.' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('evergreen_session');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

/**
 * GET /api/auth/email-status
 * Diagnostic endpoint for email configuration verification
 */
router.get('/email-status', (req, res) => {
  res.json({
    success: true,
    email: getEmailStatus(),
  });
});

export default router;
