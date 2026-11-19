import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { query } from '../config/db.js';

dotenv.config();

/**
 * Parses and determines active email transport configuration.
 * Primary: Google Apps Script Web App (MailApp HTTPS API)
 * Secondary: Resend REST API (HTTPS Port 443), Gmail SMTP
 */
export function reloadEmailConfig() {
  dotenv.config({ override: true });
}

export function getEmailConfig() {
  const googleScriptUrl = (process.env.GOOGLE_SCRIPT_URL || '').trim();
  const googleScriptSecret = (process.env.GOOGLE_SCRIPT_SECRET || '').trim();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  
  const smtpSecure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE.trim().toLowerCase() === 'true'
    : smtpPort === 465;

  const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
  const rawPass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || '';
  const smtpPass = rawPass ? rawPass.trim().replace(/\s+/g, '') : '';

  let emailFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || '';
  if (emailFrom && !emailFrom.includes('resend.dev')) {
    emailFrom = emailFrom.trim();
  } else if (smtpUser) {
    emailFrom = `"THE EVERGREEN EXPRESS" <${smtpUser}>`;
  } else {
    emailFrom = '"THE EVERGREEN EXPRESS"';
  }

  let provider = 'none';
  if (googleScriptUrl && googleScriptSecret) {
    provider = 'google_script';
  } else if (resendApiKey) {
    provider = 'resend';
  } else if (smtpHost && smtpUser && smtpPass) {
    provider = 'smtp';
  }

  return {
    provider,
    googleScriptUrl,
    googleScriptSecret,
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    emailFrom,
  };
}

/**
 * Returns diagnostic status of the email integration without leaking passwords or secrets.
 */
export function getEmailStatus() {
  const config = getEmailConfig();
  let maskedUser = 'Not configured';
  if (config.smtpUser) {
    const parts = config.smtpUser.split('@');
    if (parts.length === 2) {
      const u = parts[0];
      const visible = u.length > 3 ? `${u.substring(0, 2)}***${u.slice(-1)}` : `${u.substring(0, 1)}***`;
      maskedUser = `${visible}@${parts[1]}`;
    } else {
      maskedUser = 'Configured';
    }
  }

  return {
    configured: config.provider !== 'none',
    provider: config.provider,
    googleScriptConfigured: !!(config.googleScriptUrl && config.googleScriptSecret),
    resendConfigured: !!config.resendApiKey,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    smtpUserMasked: maskedUser,
    senderEmail: config.emailFrom,
    isSimulator: false,
  };
}

/**
 * Creates a configured Nodemailer transporter instance with fail-fast timeouts
 * so blocked cloud firewalls do not cause long page loading.
 */
let cachedTransporter = null;
let cachedTransporterKey = null;

export function createTransporter() {
  const config = getEmailConfig();
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return null;
  }

  const key = `${config.smtpHost}:${config.smtpPort}:${config.smtpUser}:${config.smtpPass}:${config.smtpSecure}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  const isGmail = config.smtpHost.includes('gmail.com') || config.smtpUser.toLowerCase().endsWith('@gmail.com');

  if (isGmail) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });
  } else {
    cachedTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  cachedTransporterKey = key;
  return cachedTransporter;
}

/**
 * Verifies SMTP connection and authentication with the mail server.
 * Tests primary configuration (port 465 SSL or custom) and falls back to port 587 STARTTLS for Gmail.
 * Useful for diagnostics, health checks, and test scripts.
 */
export async function verifySmtpConnection() {
  const config = getEmailConfig();

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    const missing = [];
    if (!config.smtpHost) missing.push('SMTP_HOST');
    if (!config.smtpUser) missing.push('SMTP_USER');
    if (!config.smtpPass) missing.push('SMTP_APP_PASSWORD');
    return {
      success: false,
      configured: false,
      provider: 'none',
      error: `Missing credentials: ${missing.join(', ')}`,
      userMessage: `SMTP is not configured on this server instance (Missing: ${missing.join(', ')}). Set these in your environment variables.`,
      message: `SMTP is not configured on this server instance (Missing: ${missing.join(', ')}).`,
    };
  }

  // 1. Try primary transporter
  try {
    const transporter = createTransporter();
    if (!transporter) throw new Error('Could not create SMTP transporter');
    await transporter.verify();
    return {
      success: true,
      configured: true,
      provider: 'smtp',
      user: getEmailStatus().smtpUserMasked,
      host: config.smtpHost,
      port: config.smtpPort,
      message: `Successfully connected and authenticated with ${config.smtpHost}:${config.smtpPort} as ${getEmailStatus().smtpUserMasked}.`,
    };
  } catch (err) {
    console.warn('Primary SMTP verification failed:', err.message);

    // 2. If Gmail, try Port 587 STARTTLS
    const isGmail = config.smtpHost.includes('gmail.com') || config.smtpUser.toLowerCase().endsWith('@gmail.com');
    if (isGmail) {
      try {
        const fallback587 = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
          },
          connectionTimeout: 20000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
        });
        await fallback587.verify();
        return {
          success: true,
          configured: true,
          provider: 'smtp_587',
          user: getEmailStatus().smtpUserMasked,
          host: 'smtp.gmail.com',
          port: 587,
          message: `Successfully connected to smtp.gmail.com:587 STARTTLS as ${getEmailStatus().smtpUserMasked}.`,
        };
      } catch (retryErr) {
        console.warn('Port 587 fallback verification failed:', retryErr.message);
      }
    }

    const errorDetails = formatSmtpError(err);
    return {
      success: false,
      configured: true,
      provider: 'smtp',
      error: err.message,
      code: err.code || 'UNKNOWN',
      userMessage: errorDetails.userMessage,
      hint: errorDetails.hint,
      message: `SMTP verification failed: ${err.message}`,
    };
  }
}

/**
 * Maps technical SMTP errors to user-friendly messages and actionable troubleshooting hints
 */
function formatSmtpError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toUpperCase();

  if (code === 'EAUTH' || msg.includes('authentication') || msg.includes('invalid credentials') || msg.includes('username and password not accepted') || msg.includes('535')) {
    return {
      userMessage: 'Gmail authentication failed. Please check your SMTP_USER and 16-character Google App Password in .env.',
      hint: 'Gmail SMTP authentication failed. You must use a 16-character Google App Password (with 2-Step Verification enabled), NOT your regular Gmail password.',
    };
  }

  if (code === 'EENVELOPE' || msg.includes('recipient') || msg.includes('550') || msg.includes('553')) {
    return {
      userMessage: 'The provided email address could not be delivered to. Please verify your email address.',
      hint: 'The mail server rejected the recipient email address.',
    };
  }

  if (msg.includes('daily user sending limit') || msg.includes('5.4.5') || msg.includes('quota') || msg.includes('554')) {
    return {
      userMessage: 'Email delivery service is momentarily experiencing high volume. Please try again later.',
      hint: 'Gmail daily sending limit or quota exceeded for the sending account.',
    };
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ESOCKET' || msg.includes('timeout')) {
    return {
      userMessage: 'Unable to reach the verification server right now. Please try again later.',
      hint: `Connection to SMTP server timed out or was refused (${code || 'TIMEOUT'}). Check your internet connection or port settings (port 465 with SSL or port 587 with STARTTLS).`,
    };
  }

  return {
    userMessage: 'Unable to send your verification code right now. Please try again later.',
    hint: `SMTP error: ${err.message}`,
  };
}

/**
 * Generates the festive HTML email template for the 6-digit OTP code
 */
function generateOtpHtml(fullName, otp) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email – THE EVERGREEN EXPRESS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050a16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050a16; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: radial-gradient(circle at top, #111e38 0%, #070d1e 100%); border: 2px solid #d4af37; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.8);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3);">
              <div style="font-size: 38px; margin-bottom: 6px;">🚂✨</div>
              <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #fef08a; font-weight: 700; margin-bottom: 4px;">
                FIRST-CLASS PASSENGER VERIFICATION
              </div>
              <h1 style="margin: 0; font-size: 24px; color: #ffffff; letter-spacing: 1.5px; font-weight: 700;">
                THE EVERGREEN EXPRESS
              </h1>
              <div style="font-size: 12px; letter-spacing: 2px; color: #cbd5e1; text-transform: uppercase; margin-top: 4px;">
                A Secret Christmas Journey
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 35px; text-align: left;">
              <p style="font-size: 16px; color: #ffffff; margin-top: 0; margin-bottom: 14px;">
                Dear <strong>${fullName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px;">
                Welcome to our college faculty Secret Santa celebration! Before your passenger ticket can be officially issued and your account activated, please enter the following 6-digit verification code:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background: rgba(212, 175, 55, 0.12); border: 2px dashed #fde047; border-radius: 12px; padding: 20px 15px;">
                    <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #fef08a; margin-bottom: 8px;">
                      Your Secret Verification Code
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ffffff; text-shadow: 0 0 15px rgba(254, 240, 138, 0.8);">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice and Security -->
              <div style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #fecaca;">
                  ⏳ <strong>This code will expire in 5 minutes.</strong><br />
                  🔒 For your security, never share this verification code with anyone.
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #94a3b8; margin-bottom: 0;">
                If you did not request this registration, please disregard this email.
              </p>
            </td>
          </tr>

          <!-- Festive Footer -->
          <tr>
            <td style="padding: 20px 30px 25px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(0, 0, 0, 0.25);">
              <p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #fef08a;">
                Spread Joy • Share Kindness • Make It Magical
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                ST PAULS COLLEGE • The Evergreen Express Faculty Secret Santa Committee
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates the plain text fallback version for email clients that don't render HTML
 */
function generateOtpText(fullName, otp) {
  return `
THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY
ST PAULS COLLEGE Faculty Secret Santa Celebration

Dear ${fullName},

Welcome aboard! Before your passenger ticket can be officially issued, please enter the following 6-digit verification code:

------------------------------------------------
VERIFICATION CODE: ${otp}
------------------------------------------------

⏳ This code will expire in 5 minutes.
🔒 For your security, never share this verification code with anyone.

If you did not request this registration, please disregard this email.

ST PAULS COLLEGE • The Evergreen Express Committee
`.trim();
}

/**
 * Sends OTP email via user's Google Apps Script Web App using HTTPS POST.
 * Follows 302 redirects automatically, handles timeouts, and checks JSON response.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message?: string, error?: string, userMessage?: string}>}
 */
export async function sendOtpViaGoogleScript(email, otp) {
  const config = getEmailConfig();
  if (!config.googleScriptUrl || !config.googleScriptSecret) {
    return {
      success: false,
      error: 'Google Apps Script configuration is missing (GOOGLE_SCRIPT_URL or GOOGLE_SCRIPT_SECRET).',
      userMessage: 'Email verification service is not configured. Please contact the administrator.',
    };
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanOtp = String(otp || '').trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(config.googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: config.googleScriptSecret,
        email: cleanEmail,
        otp: cleanOtp,
      }),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse Google Apps Script response JSON:', responseText.slice(0, 150));
      return {
        success: false,
        error: `Unexpected response from Google Apps Script (HTTP ${response.status})`,
        userMessage: 'Verification email could not be sent. Please check your email address or try again shortly.',
      };
    }

    if (!response.ok || !data || data.success !== true) {
      const errMsg = (data && data.message) || (data && data.error) || `HTTP ${response.status}`;
      console.warn(`Google Apps Script delivery failed for ${cleanEmail}:`, errMsg);
      return {
        success: false,
        error: errMsg,
        userMessage: data?.message === 'Unauthorized'
          ? 'Email delivery authorization failed. Please contact the administrator.'
          : 'Unable to deliver verification email to this address. Please ensure the email is valid and try again.',
      };
    }

    return {
      success: true,
      message: data.message || 'Email sent successfully via Google Apps Script.',
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Google Apps Script request timed out after 15 seconds.');
      return {
        success: false,
        error: 'Network timeout contacting Google Apps Script.',
        userMessage: 'Email verification service timed out. Please try again in a few moments.',
      };
    }
    console.error('Google Apps Script request error:', err.message);
    return {
      success: false,
      error: err.message,
      userMessage: 'Unable to reach the email verification service. Please try again shortly.',
    };
  }
}

/**
 * Sends a 6-digit OTP verification email.
 * Primary: Google Apps Script Web App (MailApp HTTPS API)
 * Secondary fallback: Resend REST API, Gmail SMTP
 * 
 * Secure design:
 * - Never returns plain OTP in response
 * - Never logs plain OTP to console
 * - Does not simulate or fake success
 *
 * @param {string} email - Recipient email dynamically passed from registration
 * @param {string} fullName - Recipient full name
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, provider: string, deliveryStatus: string, error?: string, userMessage?: string}>}
 */
export async function sendOtpEmail(email, fullName, otp) {
  const subject = 'Verify Your Email – THE EVERGREEN EXPRESS';
  const config = getEmailConfig();

  let deliveryStatus = 'failed';
  let errorMessage = null;
  let userMessage = null;
  let activeProvider = config.provider;

  // 1. Primary: Google Apps Script Web App (MailApp over HTTPS)
  if (config.googleScriptUrl && config.googleScriptSecret) {
    const gasResult = await sendOtpViaGoogleScript(email, otp);
    if (gasResult.success) {
      deliveryStatus = 'sent';
      activeProvider = 'google_script';
      console.log(`✉️ Live OTP email dispatched via Google Apps Script to ${email}`);
    } else {
      errorMessage = gasResult.error;
      userMessage = gasResult.userMessage;
      console.warn(`Google Apps Script dispatch failed for ${email}: ${errorMessage}`);
    }
  }

  // 2. Secondary fallback: Resend REST API (if GAS was not configured or failed)
  if (deliveryStatus !== 'sent' && config.resendApiKey) {
    try {
      const resend = new Resend(config.resendApiKey);
      const resendFrom = process.env.EMAIL_FROM || 'The Evergreen Express <onboarding@resend.dev>';
      const html = generateOtpHtml(fullName, otp);
      const text = generateOtpText(fullName, otp);
      const res = await resend.emails.send({
        from: resendFrom,
        to: email,
        subject,
        text,
        html,
      });

      if (res && res.data && res.data.id) {
        deliveryStatus = 'sent';
        activeProvider = 'resend';
        errorMessage = null;
        userMessage = null;
        console.log(`✉️ Live OTP email dispatched via Resend HTTPS API to ${email} (ID: ${res.data.id})`);
      } else if (res && res.error) {
        console.warn(`Resend notice for ${email}: ${res.error.message}`);
        errorMessage = res.error.message;
      }
    } catch (resendErr) {
      console.warn(`Resend attempt notice: ${resendErr.message}`);
      errorMessage = resendErr.message;
    }
  }

  // 3. Secondary fallback: Gmail SMTP (if credentials provided and not yet sent)
  if (deliveryStatus !== 'sent' && config.smtpHost && config.smtpUser && config.smtpPass) {
    try {
      const transporter = createTransporter();
      if (transporter) {
        const html = generateOtpHtml(fullName, otp);
        const text = generateOtpText(fullName, otp);
        const info = await transporter.sendMail({
          from: config.emailFrom,
          to: email,
          subject,
          text,
          html,
        });

        deliveryStatus = 'sent';
        activeProvider = 'smtp';
        errorMessage = null;
        userMessage = null;
        console.log(`✉️ Live OTP email dispatched via Gmail SMTP to ${email} (MessageID: ${info.messageId})`);
      }
    } catch (err) {
      errorMessage = err.message;
      const formatted = formatSmtpError(err);
      userMessage = formatted.userMessage;
      console.warn(`SMTP delivery notice for ${email}:`, err.message);
    }
  }

  const isSuccess = deliveryStatus === 'sent';

  // Record dispatch in email_notifications table asynchronously
  query(
    `INSERT INTO email_notifications (recipient_email, subject, status, error_message, sent_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [email, subject, deliveryStatus, errorMessage]
  ).catch((dbErr) => {
    console.warn('Could not record notification in database:', dbErr.message);
  });

  return {
    success: isSuccess,
    provider: activeProvider,
    deliveryStatus,
    error: isSuccess ? undefined : errorMessage,
    userMessage: isSuccess ? undefined : (userMessage || 'Failed to deliver verification code. Please check your email and try again.'),
  };
}

/**
 * Generates the festive event-started announcement HTML email template
 */
export function generateAnnouncementHtml(fullName, participantId, siteUrl) {
  const safeSiteUrl = siteUrl || process.env.APP_URL || 'https://santa-ol5v.onrender.com';
  const greeting = fullName ? `Hello ${fullName}!` : 'Hello!';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🎅 Secret Santa Has Officially Started!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050a16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050a16; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: radial-gradient(circle at top, #111e38 0%, #070d1e 100%); border: 2px solid #d4af37; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.85);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3);">
              <div style="font-size: 44px; margin-bottom: 8px;">🎅🎄</div>
              <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #fef08a; font-weight: 700; margin-bottom: 6px;">
                OFFICIAL CELEBRATION ANNOUNCEMENT
              </div>
              <h1 style="margin: 0; font-size: 26px; color: #ffffff; letter-spacing: 1px; font-weight: 800;">
                Secret Santa Has Officially Started!
              </h1>
              <div style="font-size: 12px; letter-spacing: 2px; color: #cbd5e1; text-transform: uppercase; margin-top: 6px;">
                The Evergreen Express • St Pauls College
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 35px; text-align: left;">
              <p style="font-size: 18px; color: #ffffff; margin-top: 0; margin-bottom: 14px; font-weight: 600;">
                ${greeting}
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #fef08a; font-weight: 700; margin-bottom: 12px;">
                The wait is over! Our Secret Santa event has officially started! 🎄
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px;">
                It's time to begin your Secret Santa journey and spread some festive joy.
              </p>

              <!-- Prominent Participant ID Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background: rgba(212, 175, 55, 0.12); border: 2px dashed #fde047; border-radius: 12px; padding: 22px 15px;">
                    <div style="font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #fef08a; margin-bottom: 8px; font-weight: 700;">
                      YOUR PARTICIPANT ID
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 6px; color: #ffffff; text-shadow: 0 0 15px rgba(254, 240, 138, 0.8);">
                      <strong>${participantId}</strong>
                    </div>
                    <div style="font-size: 13px; color: #cbd5e1; margin-top: 10px; line-height: 1.5;">
                      Keep this Participant ID safe, as you will need it to log in to the Secret Santa website.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0 15px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeSiteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #050a16; font-weight: 800; font-size: 15px; padding: 15px 32px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.5); text-transform: uppercase; letter-spacing: 1px;">
                      VISIT THE SECRET SANTA WEBSITE ➔
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.5; color: #94a3b8; text-align: center; margin-top: 12px; margin-bottom: 24px;">
                Visit the Secret Santa Website: <a href="${safeSiteUrl}" target="_blank" style="color: #93c5fd; text-decoration: underline; font-weight: 600;">${safeSiteUrl}</a>
              </p>

              <!-- Instructions -->
              <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #a7f3d0;">
                  🎁 <strong>How to get started:</strong> Log in with your <strong>Participant ID</strong> (or registered email) and your password to discover your assigned Christmas friend and explore their wishlist!
                </p>
              </div>

              <p style="font-size: 15px; line-height: 1.6; color: #fef08a; font-weight: 600; margin-bottom: 6px;">
                Wishing you a fun, exciting and magical Secret Santa experience!
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #ffffff; font-weight: 700; margin-top: 0;">
                – Secret Santa Team 🎅
              </p>
            </td>
          </tr>

          <!-- Festive Footer -->
          <tr>
            <td style="padding: 22px 30px 25px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(0, 0, 0, 0.3);">
              <p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #fef08a; font-weight: 600;">
                Spread Joy • Share Kindness • Make It Magical
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                ST PAULS COLLEGE • Department of Computer Science • The Evergreen Express
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generates the plain text announcement email fallback
 */
export function generateAnnouncementText(fullName, participantId, siteUrl) {
  const safeSiteUrl = siteUrl || process.env.APP_URL || 'https://santa-ol5v.onrender.com';
  const greeting = fullName ? `Hello ${fullName}!` : 'Hello!';
  return `
🎅 Secret Santa Has Officially Started!

${greeting}

The wait is over! Our Secret Santa event has officially started! 🎄

It's time to begin your Secret Santa journey and spread some festive joy.

================================================
Your Participant ID: ${participantId}
================================================

Keep this Participant ID safe, as you will need it to log in to the Secret Santa website.

Visit the Secret Santa Website: ${safeSiteUrl}

Instructions:
1. Open the website link above.
2. Log in using your Participant ID (${participantId}) or your registered email, and your password.
3. Discover your Christmas friend, explore their wishlist, and make their holiday magical!

Wishing you a fun, exciting and magical Secret Santa experience!

– Secret Santa Team 🎅
ST PAULS COLLEGE • The Evergreen Express
`.trim();
}

/**
 * Sends a personalized event-start announcement email to a registered participant.
 * Uses Gmail SMTP (primary) and Resend REST API (fallback).
 * Strictly separated from registration OTP verification — NEVER triggers Google Apps Script or OTP codes.
 *
 * @param {string} email - Participant email
 * @param {string} fullName - Participant name
 * @param {string} participantId - Ticket ID (e.g. SS124)
 * @param {string} siteUrl - Portal URL
 * @returns {Promise<{success: boolean, provider: string, deliveryStatus: string, error?: string}>}
 */
export async function sendAnnouncementEmail(email, fullName, participantId, siteUrl) {
  const subject = '🎅 Secret Santa Has Officially Started!';
  const html = generateAnnouncementHtml(fullName, participantId, siteUrl);
  const text = generateAnnouncementText(fullName, participantId, siteUrl);
  const config = getEmailConfig();

  let deliveryStatus = 'failed';
  let errorMessage = null;
  let activeProvider = 'none';

  // 1. Primary: Gmail SMTP (Full rich HTML & Text, verified direct delivery)
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    try {
      const transporter = createTransporter();
      if (!transporter) {
        throw new Error('SMTP transporter could not be created');
      }
      const info = await transporter.sendMail({
        from: config.emailFrom,
        to: email,
        subject,
        text,
        html,
      });

      deliveryStatus = 'sent';
      activeProvider = 'smtp';
      errorMessage = null;
      console.log(`✉️ Live announcement dispatched via Gmail SMTP to ${email} (MessageID: ${info.messageId})`);
    } catch (smtpErr) {
      errorMessage = `SMTP delivery error (${smtpErr.code || 'TIMEOUT/NETWORK'}): ${smtpErr.message}`;
      console.warn(`[Announcement SMTP Error for ${email}]:`, smtpErr.message);

      // Attempt automatic fallback to Port 587 STARTTLS if primary attempt failed
      const isGmail = config.smtpHost.includes('gmail.com') || config.smtpUser.toLowerCase().endsWith('@gmail.com');
      if (isGmail) {
        try {
          console.log(`Retrying delivery to ${email} via Gmail Port 587 STARTTLS...`);
          const fallback587 = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: config.smtpUser,
              pass: config.smtpPass,
            },
            connectionTimeout: 30000,
            greetingTimeout: 20000,
            socketTimeout: 30000,
          });

          const fallbackInfo = await fallback587.sendMail({
            from: config.emailFrom,
            to: email,
            subject,
            text,
            html,
          });

          deliveryStatus = 'sent';
          activeProvider = 'smtp_587';
          errorMessage = null;
          console.log(`✉️ Live announcement dispatched via Gmail SMTP (Port 587) to ${email} (MessageID: ${fallbackInfo.messageId})`);
        } catch (retryErr) {
          errorMessage = `SMTP Port 465 error (${smtpErr.message}) & Port 587 error (${retryErr.message})`;
          console.warn(`[Announcement SMTP Port 587 Retry Failed for ${email}]:`, retryErr.message);
        }
      }
    }
  } else {
    const missing = [];
    if (!config.smtpHost) missing.push('SMTP_HOST');
    if (!config.smtpUser) missing.push('SMTP_USER');
    if (!config.smtpPass) missing.push('SMTP_APP_PASSWORD');
    errorMessage = `SMTP credentials incomplete on this server instance (Missing: ${missing.join(', ')}). Please configure these environment variables in your server settings.`;
    console.warn(`[Announcement Warning for ${email}]:`, errorMessage);
  }

  // 2. Secondary fallback: Resend REST API (HTTPS port 443)
  // ONLY attempt Resend if a verified domain is configured, OR if recipient is the sandbox owner
  const isResendSandbox = (config.emailFrom || '').includes('resend.dev');
  const canSendViaResend = config.resendApiKey && (!isResendSandbox || email.toLowerCase() === 'anandhuwork.8@gmail.com');

  if (deliveryStatus !== 'sent' && canSendViaResend) {
    try {
      const resend = new Resend(config.resendApiKey);
      const resendFrom = process.env.EMAIL_FROM || 'The Evergreen Express <onboarding@resend.dev>';
      const res = await resend.emails.send({
        from: resendFrom,
        to: email,
        subject,
        text,
        html,
      });

      if (res && res.data && res.data.id) {
        deliveryStatus = 'sent';
        activeProvider = 'resend';
        errorMessage = null;
        console.log(`✉️ Live announcement dispatched via Resend to ${email} (ID: ${res.data.id})`);
      } else if (res && res.error) {
        errorMessage = `${errorMessage ? errorMessage + ' | ' : ''}Resend error: ${res.error.message}`;
      }
    } catch (resendErr) {
      errorMessage = `${errorMessage ? errorMessage + ' | ' : ''}Resend error: ${resendErr.message}`;
      console.warn(`Resend announcement delivery attempt failed for ${email}:`, resendErr.message);
    }
  }

  const isSuccess = deliveryStatus === 'sent';

  // Record dispatch in email_notifications table asynchronously
  query(
    `INSERT INTO email_notifications (recipient_email, subject, status, error_message, sent_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [email, subject, deliveryStatus, errorMessage]
  ).catch((dbErr) => {
    console.warn('Could not record notification in database:', dbErr.message);
  });

  return {
    success: isSuccess,
    provider: activeProvider,
    deliveryStatus,
    error: isSuccess ? undefined : errorMessage,
  };
}
