import { sendOtpEmail, getEmailStatus, verifySmtpConnection } from '../services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n=============================================================');
  console.log('       THE EVERGREEN EXPRESS — GMAIL SMTP DIAGNOSTIC         ');
  console.log('=============================================================\n');

  const status = getEmailStatus();
  console.log('1. Active Provider Configuration:');
  console.log(`   - Provider:       ${status.provider.toUpperCase()}`);
  console.log(`   - SMTP Host:      ${status.smtpHost}`);
  console.log(`   - SMTP Port:      ${status.smtpPort} (${status.smtpSecure ? 'SSL/TLS' : 'STARTTLS'})`);
  console.log(`   - SMTP Account:   ${status.smtpUserMasked}`);
  console.log(`   - Sender (From):  ${status.senderEmail}`);
  console.log(`   - Configured:     ${status.configured ? 'YES' : 'NO'}`);
  console.log(`   - Simulator Mode: ${status.isSimulator ? 'ACTIVE (Offline)' : 'INACTIVE'}`);

  if (!status.configured) {
    console.log('\n❌ ERROR: Gmail SMTP is not configured in .env.');
    console.log('\n📋 REQUIRED .env CONFIGURATION:');
    console.log('   SMTP_HOST="smtp.gmail.com"');
    console.log('   SMTP_PORT=465');
    console.log('   SMTP_SECURE=true');
    console.log('   SMTP_USER="your-dedicated-gmail@gmail.com"');
    console.log('   SMTP_APP_PASSWORD="your-16-char-app-password"');
    console.log('   SMTP_FROM="THE EVERGREEN EXPRESS <your-dedicated-gmail@gmail.com>"\n');
    console.log('💡 Note: Generate a 16-character App Password after turning on 2-Step Verification at:');
    console.log('   https://myaccount.google.com/apppasswords\n');
    process.exit(1);
  }

  // 2. Test Connection / Auth
  console.log('\n2. Verifying Gmail SMTP Server Connection & Authentication...');
  const connTest = await verifySmtpConnection();

  if (connTest.success) {
    console.log(`   ✅ SUCCESS: ${connTest.message}`);
  } else {
    console.log(`   ❌ FAILED: ${connTest.message}`);
    if (connTest.error) console.log(`   - Error: ${connTest.error}`);
    if (connTest.code)  console.log(`   - Code:  ${connTest.code}`);
    if (connTest.hint)  console.log(`\n💡 Solution / Hint:\n   ${connTest.hint}\n`);
    process.exit(1);
  }

  // 3. Live Email Dispatch Check
  const targetEmail = process.argv[2];
  if (!targetEmail) {
    console.log('\n💡 Gmail SMTP connection is working perfectly!');
    console.log('   To test sending a live OTP email to an actual inbox, run:');
    console.log('   node scripts/test-email.js someone@example.com\n');
    process.exit(0);
  }

  console.log(`\n3. Sending Live Test OTP Email to: ${targetEmail}...`);
  const testOtp = '882319';
  const result = await sendOtpEmail(targetEmail, 'Test Faculty Member', testOtp);

  console.log('\n4. Dispatch Result:');
  if (result.success) {
    console.log('   ✅ SUCCESS! Verification email delivered via Gmail SMTP.');
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
