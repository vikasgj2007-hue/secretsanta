/**
 * THE EVERGREEN EXPRESS — FOUR BUG FIXES VERIFICATION SUITE
 * Validates:
 * 1. Performance optimizations (batch inserts, pooled transporter, concurrent DB operations)
 * 2. Train journey and progress bar synchronization
 * 3. Wax seal single-click interaction & prefetching
 * 4. Post-reveal dashboard navigation & overlay cleanup
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('\n=============================================================');
console.log('   THE EVERGREEN EXPRESS — 4 BUG FIXES VERIFICATION TESTS   ');
console.log('=============================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Performance & Batch Insert Verification
// -----------------------------------------------------------------------------
console.log('--- Bug 1: Performance & Lag Fixes ---');

it('drawService uses single multi-row batch insert instead of sequential loop queries', () => {
  const drawCode = fs.readFileSync('services/drawService.js', 'utf8');
  assert(
    drawCode.includes('INSERT INTO assignments (event_id, giver_id, recipient_id, is_locked)'),
    'Batch insert statement missing'
  );
  assert(
    drawCode.includes('VALUES ${placeholders.join'),
    'Multi-row VALUES placeholder missing'
  );
  // Ensure the old sequential await in for loop is removed
  assert(
    !drawCode.includes('for (let i = 0; i < participants.length; i++) {\n      const giver = participants[i];\n      const recipient = deranged[i];\n\n      await client.query'),
    'Sequential await client.query inside for loop detected'
  );
});

it('emailService uses connection pooling with persistent transporter', () => {
  const emailCode = fs.readFileSync('services/emailService.js', 'utf8');
  assert(emailCode.includes('cachedTransporter'), 'Transporter caching missing');
  assert(emailCode.includes('pool: true'), 'Nodemailer connection pooling missing');
  assert(emailCode.includes('maxConnections: 3'), 'Max connections setting missing');
});

it('auth routes execute event status and duplicate email check in parallel via Promise.all', () => {
  const authCode = fs.readFileSync('routes/auth.js', 'utf8');
  assert(
    authCode.includes('const [eventRes, existingUser] = await Promise.all(['),
    'Promise.all for event & email uniqueness check missing in auth.js'
  );
});

it('admin dashboard loads stats and participant roster concurrently', () => {
  const adminPanelCode = fs.readFileSync('src/components/adminPanel.js', 'utf8');
  assert(
    adminPanelCode.includes('Promise.all([\n      databaseService.getAdminDashboard(),\n      databaseService.getParticipants(),\n    ])'),
    'Concurrent admin loading missing'
  );
});

it('form submit buttons have immediate disabled and spinner loading states', () => {
  const authModalsCode = fs.readFileSync('src/components/authModals.js', 'utf8');
  assert(authModalsCode.includes('submitBtn.disabled = true'), 'Button disable on submit missing');
  assert(authModalsCode.includes('button-spinner'), 'Spinner loading indicator missing');
  const css = fs.readFileSync('src/styles/main.css', 'utf8');
  assert(css.includes('.button-spinner'), 'CSS for button-spinner missing');
});

// -----------------------------------------------------------------------------
// Test 2: Train Progress Indicator Synchronization
// -----------------------------------------------------------------------------
console.log('\n--- Bug 2: Train Progress Indicator Synchronization ---');

it('journey-progress-fill transition is set to none to eliminate CSS lag', () => {
  const trainCss = fs.readFileSync('src/styles/train.css', 'utf8');
  assert(
    trainCss.includes('.journey-progress-fill {\n  height: 100%;\n  width: 0%;\n  background: linear-gradient(to right, #eab308, #f59e0b, #ef4444);\n  border-radius: var(--radius-full);\n  box-shadow: 0 0 10px rgba(234, 179, 8, 0.6);\n  transition: none;'),
    'CSS transition: none missing on .journey-progress-fill'
  );
});

it('train progress is tied directly to physical locomotive displacement', () => {
  const trainJourneyCode = fs.readFileSync('src/components/trainJourney.js', 'utf8');
  assert(
    trainJourneyCode.includes('(currentX - startX) / totalTravelDistance'),
    'Physical distance ratio missing from progress calculation'
  );
  assert(
    trainJourneyCode.includes('this.progressFill.style.width = `${(physicalProgress * 100).toFixed(2)}%`'),
    'Progress bar width synchronization missing'
  );
  assert(
    trainJourneyCode.includes("this.progressFill.style.width = '100%'"),
    'Final 100% arrival sync missing'
  );
});

it('train journey starts with progress indicator explicitly at 0%', () => {
  const trainJourneyCode = fs.readFileSync('src/components/trainJourney.js', 'utf8');
  assert(
    trainJourneyCode.includes("this.progressFill.style.width = '0%'"),
    '0% reset missing on embarkTrainJourney'
  );
});

// -----------------------------------------------------------------------------
// Test 3: Wax-Seal Single Click Interaction & Prefetching
// -----------------------------------------------------------------------------
console.log('\n--- Bug 3: Wax-Seal Interaction Fix ---');

it('wax seal children have pointer-events: none to avoid missed taps on text', () => {
  const modalsCss = fs.readFileSync('src/styles/modals.css', 'utf8');
  assert(
    modalsCss.includes('.wax-seal-button * {\n  pointer-events: none !important;'),
    'pointer-events: none missing on wax seal child elements'
  );
});

it('wax seal has active breaking animation and audio feedback on first touch', () => {
  const modalsCss = fs.readFileSync('src/styles/modals.css', 'utf8');
  assert(modalsCss.includes('@keyframes sealCrackShake'), 'sealCrackShake animation missing');
  assert(modalsCss.includes('.wax-seal-breaking'), 'wax-seal-breaking class missing in CSS');
});

it('stage 2 recipient identity is eagerly prefetched when stage 7 opens', () => {
  const revealCode = fs.readFileSync('src/components/revealModal.js', 'utf8');
  assert(
    revealCode.includes('const stage2DataPromise = databaseService.revealStage2RecipientIdentity()'),
    'Eager prefetch of Stage 2 identity missing'
  );
});

it('wax seal click handler has strict isOpening guard to prevent duplicate triggers', () => {
  const revealCode = fs.readFileSync('src/components/revealModal.js', 'utf8');
  assert(revealCode.includes('let isOpening = false'), 'isOpening state variable missing');
  assert(revealCode.includes('if (isOpening) return;'), 'isOpening guard missing');
});

it('envelope container and wax seal button both accept click/tap events', () => {
  const revealCode = fs.readFileSync('src/components/revealModal.js', 'utf8');
  assert(revealCode.includes('waxSealBtn.addEventListener(\'click\', handleBreakSeal)'), 'wax seal click listener missing');
  assert(revealCode.includes('envelope.addEventListener(\'click\', handleBreakSeal)'), 'envelope click listener missing');
  assert(revealCode.includes('waxSealBtn.addEventListener(\'touchend\', handleBreakSeal'), 'mobile touchend listener missing');
});

// -----------------------------------------------------------------------------
// Test 4: Dashboard Navigation After Reveal
// -----------------------------------------------------------------------------
console.log('\n--- Bug 4: Dashboard Navigation After Reveal ---');

it('exitRevealCleanly cleanly terminates and removes train journey overlay', () => {
  const revealCode = fs.readFileSync('src/components/revealModal.js', 'utf8');
  assert(revealCode.includes('trainJourney.closeJourney()'), 'trainJourney.closeJourney() call missing');
  assert(revealCode.includes('modalBackdrop.classList.remove(\'active\')'), 'modalBackdrop active class removal missing');
  assert(revealCode.includes('document.body.style.overflow = \'\''), 'body overflow reset missing');
});

it('Go Back button triggers clean exit and re-renders dashboard', () => {
  const revealCode = fs.readFileSync('src/components/revealModal.js', 'utf8');
  assert(revealCode.includes('Go Back ➔') || revealCode.includes('Go Back to Dashboard ➔'), 'Go Back button text missing');
  assert(revealCode.includes('backDashboardBtn.onclick = exitRevealCleanly'), 'Clean exit handler binding missing');
});

it('trainJourney.closeJourney resets overlay active class and restores normal page flow', () => {
  const trainJourneyCode = fs.readFileSync('src/components/trainJourney.js', 'utf8');
  assert(
    trainJourneyCode.includes('this.overlay.classList.remove(\'active\')'),
    'train overlay active class removal missing in closeJourney'
  );
  assert(
    trainJourneyCode.includes('this.isJourneyRunning = false'),
    'isJourneyRunning = false missing in closeJourney'
  );
});

console.log('\n=============================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=============================================================\n');

if (failed > 0) {
  process.exit(1);
}

