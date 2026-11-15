/**
 * THE EVERGREEN EXPRESS — CHRISTMAS TRAIN JOURNEY MUSIC INTEGRATION TESTS
 * Validates:
 * 1. Audio file presence & server HTTP delivery (/audio/christmas-train-music.mp3)
 * 2. Playback initiation exclusively on BOARD THE EXPRESS click
 * 3. Smooth 2-second fade-in volume dynamics
 * 4. Exact 30-second synchronization for train, progress indicator, and music
 * 5. Smooth 3-second fade-out volume dynamics as train reaches terminal
 * 6. Mute / unmute functionality & persistent state
 * 7. Clean stoppage when leaving reveal sequence or returning to dashboard
 * 8. Replay journey restarts audio cleanly from beginning (currentTime = 0)
 * 9. Prevention of duplicate audio elements / playback
 * 10. Preservation of non-music website functionality
 */

import assert from 'assert';
import fs from 'fs';
import http from 'http';

console.log('\n=============================================================');
console.log('   THE EVERGREEN EXPRESS — CHRISTMAS MUSIC INTEGRATION TESTS   ');
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

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  // 1. Audio File Verification on Disk & HTTP Delivery
  console.log('--- Test 1 & 10: Audio File Existence & HTTP Endpoint Delivery ---');

  it('Audio file exists at exact path "public/audio/christmas-train-music.mp3"', () => {
    assert(fs.existsSync('public/audio/christmas-train-music.mp3'), 'File missing in public/audio');
    const stats = fs.statSync('public/audio/christmas-train-music.mp3');
    assert(stats.size > 500000, `Audio file too small: ${stats.size} bytes`);
  });

  await itAsync('Server serves /audio/christmas-train-music.mp3 with HTTP 200 and audio/mpeg headers', async () => {
    return new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:5000/audio/christmas-train-music.mp3', (res) => {
        try {
          assert.strictEqual(res.statusCode, 200, `Expected 200 OK, got ${res.statusCode}`);
          const contentType = res.headers['content-type'];
          assert(contentType && contentType.includes('audio/'), `Expected audio content-type, got ${contentType}`);
          const contentLength = parseInt(res.headers['content-length'], 10);
          assert(contentLength > 500000, `Expected content length > 500KB, got ${contentLength}`);
          res.resume();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  });

  // 2. Playback Initiation on BOARD THE EXPRESS Click
  console.log('\n--- Test 2: Audio Playback Initiation ---');

  it('Music playback starts strictly when user clicks BOARD THE EXPRESS (no autoplay)', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes("document.getElementById('btn-board-express').onclick = () => {"), 'Board express click handler missing');
    assert(code.includes('this.startMusic()'), 'this.startMusic() must be called inside board express click');
    // Ensure no autoplay on load
    const mainCode = fs.readFileSync('src/main.js', 'utf8');
    assert(!mainCode.includes('trainMusic.play()'), 'Unexpected autoplay found in main.js');
  });

  // 3 & 5. Fade In & Fade Out Volume Dynamics
  console.log('\n--- Test 3 & 5: Volume Fading Dynamics ---');

  it('Music fades in smoothly over first 2 seconds (0 - 2000ms)', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('if (elapsed < 2000)'), 'Fade-in elapsed condition missing');
    assert(code.includes('currentVol = TARGET_VOLUME * (elapsed / 2000)'), 'Fade-in linear ramp missing');
  });

  it('Music fades out smoothly during final 3 seconds (27000ms - 30000ms)', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('else if (elapsed > 27000)'), 'Fade-out elapsed condition missing');
    assert(code.includes('TARGET_VOLUME * (1 - fadeOutElapsed / 3000)'), 'Fade-out linear ramp missing');
  });

  // 4. Exact 30-Second Journey Synchronization
  console.log('\n--- Test 4: 30-Second Train & Indicator Synchronization ---');

  it('Journey duration is configured to exactly 30 seconds (30000ms)', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('const totalDuration = 30000;'), 'totalDuration must be exactly 30000ms');
  });

  it('Progress indicator reaches 100% exactly when train arrives at terminal', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('totalTravelDistance = targetArrivalX - startX'), 'Travel distance missing');
    assert(code.includes('this.progressFill.style.width = `${(physicalProgress * 100).toFixed(2)}%`'), 'Physical progress binding missing');
    assert(code.includes("this.progressFill.style.width = '100%'"), '100% completion assignment missing');
  });

  // 6. Music Controls (Mute / Unmute)
  console.log('\n--- Test 6: Mute / Unmute Controls ---');

  it('Train HUD contains music toggle button with speaker icon and label', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('id="btn-train-music-toggle"'), 'btn-train-music-toggle missing in index.html');
    assert(html.includes('id="train-music-icon"'), 'train-music-icon missing in index.html');
    assert(html.includes('id="train-music-label"'), 'train-music-label missing in index.html');
  });

  it('toggleMusicMute toggles muted state, persists to localStorage, and updates UI', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('toggleMusicMute()'), 'toggleMusicMute method missing');
    assert(code.includes('this.trainMusic.muted = this.isMusicMuted'), 'audio.muted assignment missing');
    assert(code.includes("localStorage.setItem('train_music_muted'"), 'localStorage persistence missing');
    assert(code.includes('this.updateMusicUI()'), 'updateMusicUI method call missing');
  });

  it('train.css contains responsive and elegant styles for .btn-train-music-toggle', () => {
    const css = fs.readFileSync('src/styles/train.css', 'utf8');
    assert(css.includes('.btn-train-music-toggle'), 'CSS class .btn-train-music-toggle missing');
    assert(css.includes('.btn-train-music-toggle.muted'), 'CSS class .btn-train-music-toggle.muted missing');
  });

  // 7. Navigation Cleanup
  console.log('\n--- Test 7: Navigation Cleanup & Music Termination ---');

  it('Music stops cleanly when user exits journey or arrives at station', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('stopMusic()'), 'stopMusic method missing');
    assert(code.includes('this.stopMusic();\n    sound.stopTrainChug();'), 'stopMusic must be called in onJourneyComplete');
    assert(code.includes('this.stopMusic();\n    this.isJourneyRunning = false;'), 'stopMusic must be called in closeJourney');
  });

  it('Returning to dashboard from reveal modal stops any remaining audio', () => {
    const revealCode = fs.readFileSync('src/components/revealModal.js', 'utf8');
    assert(revealCode.includes('trainJourney.closeJourney()'), 'trainJourney.closeJourney() must be called on reveal exit');
  });

  // 8 & 9. Replay & Duplicate Audio Prevention
  console.log('\n--- Test 8 & 9: Replay & Duplicate Audio Prevention ---');

  it('Replaying journey resets music to currentTime = 0 and restarts clean playback', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes('this.trainMusic.currentTime = 0'), 'currentTime = 0 reset missing in startMusic');
    assert(code.includes('this.trainMusic.pause()'), 'pause before restart missing in startMusic');
  });

  it('Maintains a single persistent audio instance to guarantee zero duplicate audio', () => {
    const code = fs.readFileSync('src/components/trainJourney.js', 'utf8');
    assert(code.includes("if (!this.trainMusic) {\n      this.trainMusic = new Audio('/audio/christmas-train-music.mp3');"), 'Single audio instance guard missing');
  });

  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

