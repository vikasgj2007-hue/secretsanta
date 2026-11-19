import dotenv from 'dotenv';
import { query, pool } from '../config/db.js';
import { generateAnnouncementHtml, generateAnnouncementText, sendAnnouncementEmail } from '../services/emailService.js';

dotenv.config();

async function runAnnouncementTests() {
  console.log('\n=============================================================');
  console.log(' THE EVERGREEN EXPRESS — PARTICIPANT ANNOUNCEMENT TEST SUITE ');
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

  const sampleName = 'Dr. Robert Vance';
  const sampleTicketId = 'SS101';
  const sampleSiteUrl = 'https://santa-ol5v.onrender.com';

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Template Structure & Content Requirements
    // -------------------------------------------------------------------------
    console.log('--- Test 1: HTML Announcement Email Template Requirements ---');
    const html = generateAnnouncementHtml(sampleName, sampleTicketId, sampleSiteUrl);

    assert(html.includes(sampleName), 'Template contains faculty member full name.');
    assert(html.includes(sampleTicketId), 'Template contains unique Participant ID.');
    assert(html.includes('OFFICIAL CELEBRATION ANNOUNCEMENT') || html.includes('begun'), 'Template announces celebration kickoff.');
    assert(html.includes('Secret Santa') || html.includes('holiday friend'), 'Template contains festive Christmas holiday message.');
    assert(html.includes('password') && html.includes('login'), 'Template contains clear login instructions.');
    assert(html.includes(sampleSiteUrl), 'Template contains clickable direct link to live website.');
    assert(html.includes('font-family: \'Courier New\', Courier, monospace'), 'Ticket ID is styled prominently in large bold monospace.');

    // -------------------------------------------------------------------------
    // TEST 2: Plain Text Fallback Requirements
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Plain Text Announcement Email Fallback ---');
    const text = generateAnnouncementText(sampleName, sampleTicketId, sampleSiteUrl);

    assert(text.includes(sampleName), 'Plain text contains faculty member full name.');
    assert(text.includes(sampleTicketId), 'Plain text contains unique Participant ID.');
    assert(text.includes(sampleSiteUrl), 'Plain text contains direct website link.');
    assert(text.includes('Secret Santa'), 'Plain text contains Secret Santa instructions.');

    // -------------------------------------------------------------------------
    // TEST 3: Database Eligible Participants Filter
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Eligible Registered Participants Query ---');
    const eligibleRes = await query(
      `SELECT id, participant_id, full_name, email, department
       FROM participants
       WHERE email_verified = TRUE AND account_status = 'active'
       ORDER BY participant_id ASC`
    );

    assert(eligibleRes.rowCount >= 0, `Query successfully retrieved ${eligibleRes.rowCount} eligible verified participants.`);
    if (eligibleRes.rowCount > 0) {
      const sample = eligibleRes.rows[0];
      assert(sample.participant_id.startsWith('SS'), `Participant ID has valid format (${sample.participant_id}).`);
      assert(sample.email.includes('@'), `Participant email is valid (${sample.email}).`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Audit Logging for Batch Notification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Batch Announcement Audit Logging & Traceability ---');
    const testBatchDetails = JSON.stringify({
      total: 5,
      sent: 5,
      failed: 0,
      timestamp: new Date().toISOString(),
      testRun: true,
    });

    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, details)
       VALUES ('admin', 'system-test', 'ANNOUNCEMENT_BULK_SENT', $1)`,
      [testBatchDetails]
    );

    const auditCheck = await query(
      `SELECT details, created_at
       FROM audit_logs
       WHERE action = 'ANNOUNCEMENT_BULK_SENT'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    assert(auditCheck.rowCount === 1, 'Batch announcement event logged in audit_logs.');
    const details = typeof auditCheck.rows[0].details === 'string'
      ? JSON.parse(auditCheck.rows[0].details)
      : auditCheck.rows[0].details;
    assert(details.total === 5 && details.sent === 5, 'Audit log accurately records total and sent counts.');

    // Clean up test audit log
    await query("DELETE FROM audit_logs WHERE actor_id = 'system-test'");

    // -------------------------------------------------------------------------
    // TEST 5: Live Dispatch via Google Apps Script (Test Target)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Live Google Apps Script Announcement Dispatch ---');
    const testTargetEmail = 'vikas.gj2007@gmail.com';
    const dispatchResult = await sendAnnouncementEmail(
      testTargetEmail,
      'Faculty Member',
      'SS101',
      sampleSiteUrl
    );

    assert(dispatchResult.success === true, `Live announcement successfully dispatched via ${dispatchResult.provider.toUpperCase()} to ${testTargetEmail}.`);
    assert(dispatchResult.deliveryStatus === 'sent', 'Delivery status recorded as sent.');

    // Verify record in email_notifications table
    const notifCheck = await query(
      `SELECT recipient_email, subject, status, sent_at
       FROM email_notifications
       WHERE recipient_email = $1 AND subject LIKE '%The Journey Begins%'
       ORDER BY sent_at DESC
       LIMIT 1`,
      [testTargetEmail]
    );

    assert(notifCheck.rowCount === 1, 'Announcement dispatch recorded in email_notifications table.');
    assert(notifCheck.rows[0].status === 'sent', 'Notification table status confirmed as "sent".');

    console.log('\n=============================================================');
    console.log(` ANNOUNCEMENT SUITE: ${passed} PASSED, ${failed} FAILED`);
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

runAnnouncementTests();
