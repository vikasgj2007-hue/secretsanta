import { sendOtpEmail, getEmailStatus, verifySmtpConnection } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — EMAIL DISPATCH DIAGNOSTIC      ');
  console.log('=============================================================\n');

  const status = getEmailStatus();
  console.log('1. Active Provider Configuration:');
  console.log(`   - Provider:                ${status.provider.toUpperCase()}`);
  console.log(`   - Google Apps Script:      ${status.googleScriptConfigured ? 'CONFIGURED (Primary)' : 'Not configured'}`);
  console.log(`   - Resend API (HTTPS 443):  ${status.resendConfigured ? 'CONFIGURED' : 'Not configured'}`);
  console.log(`   - SMTP Server:             ${status.smtpHost}:${status.smtpPort} (${status.smtpUserMasked})`);
  console.log(`   - Configured:              ${status.configured ? 'YES' : 'NO'}`);

  if (!status.configured) {
    console.log('\n❌ ERROR: No email provider configured in .env.');
    console.log('   Please set GOOGLE_SCRIPT_URL and GOOGLE_SCRIPT_SECRET (or SMTP / Resend credentials).\n');
    process.exit(1);
  }

  // 2. Live Email Dispatch Check
  const targetEmail = process.argv[2];
  if (!targetEmail) {
    console.log(`\n💡 Email service is configured with provider: ${status.provider.toUpperCase()}!`);
    console.log('   To test sending a live OTP email to an actual inbox, run:');
    console.log('   node scripts/test-email.js someone@example.com\n');
    process.exit(0);
  }

  console.log(`\n2. Sending Live Test OTP Email to: ${targetEmail}...`);
  const testOtp = '882319';
  const result = await sendOtpEmail(targetEmail, 'Test Faculty Member', testOtp);

  console.log('\n3. Dispatch Result:');
  if (result.success) {
    console.log(`   ✅ SUCCESS! Verification email delivered via ${result.provider.toUpperCase()}.`);
    console.log(`   - Provider:   ${result.provider}`);
    console.log(`   - Recipient:  ${targetEmail}`);
    console.log(`   - Status:     ${result.deliveryStatus}`);
    console.log('\n📬 Check the inbox (and Spam/Junk folder) of ' + targetEmail + '!\n');
    process.exit(0);
  } else {
    console.log('   ❌ FAILED! Delivery failed.');
    console.log(`   - Error:        ${result.error}`);
    console.log(`   - User Message: ${result.userMessage}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
