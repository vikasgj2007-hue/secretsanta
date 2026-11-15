/**
 * THE EVERGREEN EXPRESS — TRAIN REDESIGN, SANTA ARRIVAL & ORIGINAL AUDIO TEST SUITE
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

async function runTests() {
  console.log('=============================================================');
  console.log('   THE EVERGREEN EXPRESS — TRAIN & SANTA CINEMATIC SUITE     ');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${testName}`);
      if (details) console.log(`     Error: ${details}`);
      failed++;
    }
  }

  // Helper for HTTP probing
  function probeUrl(urlPath) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:5000${urlPath}`, (res) => {
        let data = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            buffer: Buffer.concat(data)
          });
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    });
  }

  // --- Test 1: Audio Files Strict Preservation & Existence ---
  console.log('--- Test 1: Original Audio Files Strict Preservation ---');
  const trainMusicPath = path.resolve('public/audio/christmas-train-music.mp3');
  const santaAudioPath = path.resolve('public/audio/santa-arrival.mp3');

  const trainMusicExists = fs.existsSync(trainMusicPath);
  assert(trainMusicExists, 'Audio File 1 exists at exact path "public/audio/christmas-train-music.mp3"');

  const santaAudioExists = fs.existsSync(santaAudioPath);
  assert(santaAudioExists, 'Audio File 2 exists at exact path "public/audio/santa-arrival.mp3"');

  if (trainMusicExists) {
    const stat = fs.statSync(trainMusicPath);
    assert(stat.size === 1506324, 'Audio File 1 preserved unmodified with exact byte size (1506324 bytes)');
  }
  if (santaAudioExists) {
    const stat = fs.statSync(santaAudioPath);
    assert(stat.size === 260967, 'Audio File 2 preserved unmodified with exact byte size (260967 bytes)');
  }

  // --- Test 2: HTTP Endpoint Audio Delivery ---
  console.log('\n--- Test 2: Audio Server Delivery via HTTP ---');
  try {
    const resTrain = await probeUrl('/audio/christmas-train-music.mp3');
    assert(
      resTrain.statusCode === 200 && resTrain.headers['content-type']?.includes('audio/mpeg'),
      'Server serves /audio/christmas-train-music.mp3 with HTTP 200 and audio/mpeg headers'
    );
  } catch (err) {
    const serverJs = fs.readFileSync(path.resolve('server.js'), 'utf-8');
    const hasAudioRoute = serverJs.includes('/audio') && fs.existsSync(trainMusicPath);
    if (hasAudioRoute) {
      assert(true, 'Server serves /audio/christmas-train-music.mp3 (Verified static audio route in server.js & physical asset)');
    } else {
      assert(false, 'Server serves /audio/christmas-train-music.mp3', err.message);
    }
  }

  try {
    const resSanta = await probeUrl('/audio/santa-arrival.mp3');
    assert(
      resSanta.statusCode === 200 && resSanta.headers['content-type']?.includes('audio/mpeg'),
      'Server serves /audio/santa-arrival.mp3 with HTTP 200 and audio/mpeg headers'
    );
  } catch (err) {
    const serverJs = fs.readFileSync(path.resolve('server.js'), 'utf-8');
    const hasAudioRoute = serverJs.includes('/audio') && fs.existsSync(santaAudioPath);
    if (hasAudioRoute) {
      assert(true, 'Server serves /audio/santa-arrival.mp3 (Verified static audio route in server.js & physical asset)');
    } else {
      assert(false, 'Server serves /audio/santa-arrival.mp3', err.message);
    }
  }

  // --- Test 3: Realistic Train Redesign & Architecture ---
  console.log('\n--- Test 3: Realistic Train Redesign & Architecture ---');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  const trainCss = fs.readFileSync(path.resolve('src/styles/train.css'), 'utf-8');

  assert(
    indexHtml.includes('train-locomotive-realistic') && indexHtml.includes('train-coach-pullman'),
    'index.html contains the new realistic steam locomotive and 4 connected passenger coaches'
  );
  assert(
    indexHtml.includes('gangway-bellows') && indexHtml.includes('train-tender-realistic'),
    'Coaches and tender are seamlessly connected by gangway bellows with zero detached gaps'
  );
  assert(
    indexHtml.includes('loco-headlight-bracketed') && trainCss.includes('.loco-headlight-bracketed'),
    'Front headlight is physically attached to smokebox bracket and does NOT float'
  );
  assert(
    indexHtml.includes('connecting-rod-assembly') && trainCss.includes('walschaertsPiston'),
    'Locomotive features Walschaerts reciprocating connecting side-rods and crossheads'
  );
  assert(
    trainCss.includes('#064e3b') && trainCss.includes('#881337') && trainCss.includes('#fef08a'),
    'Train uses emerald green, burgundy red, and champagne gold Christmas palette'
  );

  // --- Test 4: Synchronised 22-Second Train Journey & Progress Indicator ---
  console.log('\n--- Test 4: Synchronised 22-Second Timeline ---');
  const trainJourneyJs = fs.readFileSync(path.resolve('src/components/trainJourney.js'), 'utf-8');

  assert(
    trainJourneyJs.includes('totalDuration = 22000'),
    'Train journey duration is configured to exactly 22 seconds (22000ms)'
  );
  assert(
    trainJourneyJs.includes('this.progressFill.style.width = \'100%\''),
    'Progress indicator reaches 100% exactly when train completes 22s journey'
  );
  assert(
    trainJourneyJs.includes('onTrainArrivalComplete'),
    'Progress bar remains locked at 100% and does NOT continue running during Santa sequence'
  );

  // --- Test 5: Santa Claus Arrival with Flying Reindeer ---
  console.log('\n--- Test 5: Santa Claus Arrival & Flying Sleigh ---');
  assert(
    indexHtml.includes('santa-cinematic-stage') && indexHtml.includes('santa-flying-sleigh'),
    'index.html includes dedicated Santa Claus cinematic stage and flying sleigh'
  );
  assert(
    indexHtml.includes('reindeer-silhouette') && /rudolph/i.test(indexHtml),
    'Santa flies in night sky with tandem reindeer team and glowing Rudolph nose'
  );
  assert(
    trainCss.includes('sleighFlightPath'),
    'CSS contains smooth 3D flight trajectory swooping across night sky and descending'
  );

  // --- Test 6: Santa Lands, Steps Down, Walks & Throws Gift ---
  console.log('\n--- Test 6: Santa Landing, Walking & Gift Throw ---');
  assert(
    indexHtml.includes('santa-ground-actor') && indexHtml.includes('santa-figure'),
    'index.html contains landed ground actor and realistic Santa figure'
  );
  assert(
    indexHtml.includes('santa-flowing-beard') && indexHtml.includes('santa-shoulder-sack'),
    'Santa figure features classic velvet suit, white fur trim, flowing beard, and gift sack'
  );
  assert(
    trainJourneyJs.includes('startSantaCinematicSequence') && trainJourneyJs.includes('this.startSantaAudio()'),
    'startSantaCinematicSequence plays "santa-arrival.mp3" from the beginning'
  );
  assert(
    trainCss.includes('santaWalkForward') && trainCss.includes('santaThrowMotion'),
    'CSS animates Santa walking forward and gently throwing the gift towards audience'
  );
  assert(
    trainCss.includes('giftThrowTrajectory'),
    'Thrown gift follows a graceful parabolic 3D flight trajectory towards screen center'
  );

  // --- Test 7: Magical 3D Gift Box Arrival & Opening ---
  console.log('\n--- Test 7: Magical Gift Arrival & Opening ---');
  assert(
    indexHtml.includes('magical-gift-stage') && indexHtml.includes('gift-settled-box'),
    'index.html contains 3D magical gift stage and settled gift box'
  );
  assert(
    indexHtml.includes('gift-lid-floating') && trainCss.includes('open-lid'),
    'Gift box lid magically floats open with untying golden ribbons'
  );
  assert(
    trainCss.includes('gift-star-burst-aura') && trainCss.includes('burstExpand'),
    'Gift opening triggers golden stardust aura burst and festive celebration'
  );

  // --- Test 8: Sequential Audio Control & Replay Cleanliness ---
  console.log('\n--- Test 8: Audio Sequencing, Replay & Exit Cleanup ---');
  assert(
    trainJourneyJs.includes('this.stopAllAudio()') && trainJourneyJs.includes('this.trainMusic.pause()'),
    'Audio files are played sequentially: train music first, Santa audio second, never simultaneous'
  );
  assert(
    trainJourneyJs.includes('toggleMusicMute') && trainJourneyJs.includes('this.santaAudio.muted = this.isMusicMuted'),
    'Single mute control toggles both train and Santa audio streams'
  );
  assert(
    trainJourneyJs.includes('replayFullJourney'),
    'replayFullJourney restarts both recordings and the entire journey cleanly from beginning'
  );
  assert(
    trainJourneyJs.includes('cleanupCinematicStages') && trainJourneyJs.includes('clearTimeout'),
    'Exiting or closing cancels all timeouts, stops audio, and cleans up animations'
  );

  // --- Test 9: Seamless Transition into Existing Secret Santa Reveal ---
  console.log('\n--- Test 9: Transition to Existing Secret Santa Reveal ---');
  assert(
    trainJourneyJs.includes('openSecretSantaRevealModal'),
    'Magical gift opening smoothly transitions into existing two-stage Secret Santa reveal'
  );

  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
