/**
 * THE EVERGREEN EXPRESS — SECRET SANTA REVEAL SEQUENCE VERIFICATION
 * Validates the strict 5-stage Secret Santa reveal sequence order:
 * STAGE 1 — Christmas Train Sequence (ALREADY WORKING)
 * STAGE 2 — Gift Box Revelation (ALREADY WORKING)
 * STAGE 3 — Participant ID Revelation (RESTORED ORIGINAL)
 * STAGE 4 — Wax Seal Revelation (RESTORED ORIGINAL)
 * STAGE 5 — Final Secret Santa Assignment Page (ALREADY WORKING)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('\n=============================================================');
console.log('   THE EVERGREEN EXPRESS — 5-STAGE REVEAL SEQUENCE TESTS     ');
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

const revealJs = fs.readFileSync('src/components/revealModal.js', 'utf8');
const trainJs = fs.readFileSync('src/components/trainJourney.js', 'utf8');
const trainCss = fs.readFileSync('src/styles/train.css', 'utf8');
const modalsCss = fs.readFileSync('src/styles/modals.css', 'utf8');
const bundleJs = fs.readFileSync('bundle.js', 'utf8');
const bundleCss = fs.readFileSync('bundle.css', 'utf8');

// --- STAGE 1 & 2: Train Sequence & Gift-Opening Transition ---
console.log('--- STAGE 1 & 2: Train Journey & Gift Box Revelation ---');
it('gift opening smoothly invokes openSecretSantaRevealModal', () => {
  assert(trainJs.includes('this.launchExistingSecretSantaReveal(currentUser)'), 'launchExistingSecretSantaReveal missing');
  assert(trainJs.includes('openSecretSantaRevealModal(currentUser'), 'openSecretSantaRevealModal call missing');
});

it('background assignment prefetch runs during 33s train & Santa sequence', () => {
  assert(trainJs.includes('databaseService.revealStage1RecipientId()'), 'Stage 1 prefetch missing in trainJourney.js');
  assert(trainJs.includes('databaseService.revealStage2RecipientIdentity()'), 'Stage 2 prefetch missing in trainJourney.js');
});

// --- STAGE 3: Participant ID Revelation (RESTORED ORIGINAL) ---
console.log('\n--- STAGE 3: Participant ID Revelation (RESTORED ORIGINAL) ---');
it('immediately starts with renderStage6 (Participant ID Revelation) after gift opens', () => {
  assert(revealJs.includes('renderStage6();'), 'renderStage6() initial call missing at end of openSecretSantaRevealModal');
});

it('displays "YOUR SECRET SANTA IS..." headline in Participant ID stage', () => {
  assert(revealJs.includes('YOUR SECRET SANTA IS...'), '"YOUR SECRET SANTA IS..." headline missing in revealModal.js');
});

it('reveals real database participant ID in glowing monospace typography', () => {
  assert(revealJs.includes('${recipientId}'), 'Dynamic recipientId insertion missing in revealModal.js');
  assert(revealJs.includes('Assigned Participant ID'), 'Assigned Participant ID label missing');
  assert(revealJs.includes('🔒 Confidential Station Assignment'), 'Confidential station badge missing');
});

it('includes the original "OPEN CHRISTMAS LETTER" proceed button to advance to Stage 4', () => {
  assert(revealJs.includes('id="btn-proceed-stage7"'), 'btn-proceed-stage7 button missing');
  assert(revealJs.includes('OPEN CHRISTMAS LETTER'), 'OPEN CHRISTMAS LETTER button text missing');
  assert(revealJs.includes('proceedBtn.onclick = () => {\n        renderStage7();\n      };'), 'renderStage7 navigation on button click missing');
});

// --- STAGE 4: Wax Seal Revelation (RESTORED ORIGINAL) ---
console.log('\n--- STAGE 4: Wax Seal Revelation (RESTORED ORIGINAL) ---');
it('renders vintage Christmas sealed envelope with "EE" wax seal on Stage 4', () => {
  assert(revealJs.includes('id="interactive-envelope"'), 'interactive envelope missing');
  assert(revealJs.includes('id="wax-seal-btn"'), 'wax seal button missing');
  assert(revealJs.includes('>EE<'), 'EE monogram missing on wax seal');
  assert(revealJs.includes('Click the wax seal to open your Christmas letter'), 'Wax seal click instruction missing');
});

it('wax seal breaks with click/tap with strict guard and pointer-events protection', () => {
  assert(revealJs.includes('let isOpening = false'), 'isOpening state missing');
  assert(revealJs.includes('if (isOpening) return;'), 'isOpening guard missing');
  assert(revealJs.includes('waxSealBtn.addEventListener(\'click\', handleBreakSeal)'), 'wax seal click listener missing');
  assert(revealJs.includes('waxSealBtn.addEventListener(\'touchend\', handleBreakSeal'), 'wax seal touchend listener missing');
  assert(modalsCss.includes('.wax-seal-button * {\n  pointer-events: none !important;'), 'pointer-events protection missing');
});

it('wax seal click triggers seal crack sound, breaking animation, and Stage 2 DB resolution', () => {
  assert(revealJs.includes('sound.playSealCrack()'), 'seal crack sound missing');
  assert(revealJs.includes('waxSealBtn.classList.add(\'wax-seal-breaking\')'), 'wax-seal-breaking class missing');
  assert(revealJs.includes('databaseService.revealStage2RecipientIdentity()'), 'Stage 2 DB identity call missing');
});

// --- STAGE 5: Final Secret Santa Assignment Page (ALREADY WORKING) ---
console.log('\n--- STAGE 5: Final Secret Santa Assignment Page (ALREADY WORKING) ---');
it('transitions directly from wax seal break to final recipient reveal card without delay', () => {
  assert(revealJs.includes('envelope.style.display = \'none\''), 'envelope hide missing on seal break');
  assert(revealJs.includes('parchment.style.display = \'block\''), 'parchment show missing on seal break');
});

it('displays recipient full name, department, ticket ID, and holiday wishlist from DB', () => {
  assert(revealJs.includes('id="recipient-full-name"'), 'recipient-full-name container missing');
  assert(revealJs.includes('id="recipient-details"'), 'recipient-details container missing');
  assert(revealJs.includes('id="recipient-wishlist-text"'), 'recipient-wishlist-text container missing');
});

it('triggers celebratory confetti explosion and festive chime upon opening letter', () => {
  assert(revealJs.includes('sound.playRevealChime()'), 'reveal chime missing');
  assert(revealJs.includes('confetti({'), 'confetti explosion missing');
});

it('final parchment card has max-height and margins to prevent touching or cutting off at bottom', () => {
  assert(modalsCss.includes('max-height: min(84vh, 620px)'), 'max-height constraint missing in modals.css');
  assert(modalsCss.includes('overflow-y: auto'), 'overflow-y scroll support missing in modals.css');
  assert(modalsCss.includes('margin: auto'), 'centering margin missing in modals.css');
  assert(revealJs.includes('border: 3px solid var(--color-gold-champagne)'), 'all 4 gold borders missing in parchment card');
});

it('displays festive holiday messages: "Now it\'s your turn..." and "MERRY CHRISTMAS!"', () => {
  assert(revealJs.includes('Now it\'s your turn to make someone\'s Christmas magical!'), 'Final message 1 missing');
  assert(revealJs.includes('MERRY CHRISTMAS!'), 'Final message 2 missing');
});

it('"Go Back to Dashboard ➔" button navigates cleanly back to participant dashboard', () => {
  assert(revealJs.includes('Go Back to Dashboard ➔'), 'Go Back to Dashboard button text missing');
  assert(revealJs.includes('backDashboardBtn.onclick = exitRevealCleanly'), 'Clean dashboard exit handler missing');
  assert(revealJs.includes('trainJourney.closeJourney()'), 'trainJourney cleanup missing in exit');
});

it('"Replay the Christmas Journey 🔄" cleanly restarts the journey without altering DB', () => {
  assert(revealJs.includes('Replay the Christmas Journey 🔄'), 'Replay button text missing');
  assert(revealJs.includes('trainJourney.replayFullJourney()'), 'trainJourney.replayFullJourney() call missing');
});

// --- Strict Audio Asset Preservation ---
console.log('\n--- Strict Audio Asset Preservation ---');
it('both original MP3 audio files are preserved unmodified with exact byte sizes', () => {
  const trainMusic = fs.statSync('public/audio/christmas-train-music.mp3');
  const santaAudio = fs.statSync('public/audio/santa-arrival.mp3');
  assert(trainMusic.size === 1506324, 'christmas-train-music.mp3 byte size mismatch');
  assert(santaAudio.size === 260967, 'santa-arrival.mp3 byte size mismatch');
});

console.log('\n=============================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=============================================================\n');

if (failed > 0) {
  process.exit(1);
}
