/**
 * THE EVERGREEN EXPRESS — Responsive Design & Cross-Device Compatibility Verification
 */

import fs from 'fs';
import path from 'path';

function runTests() {
  console.log('🚂 Running Responsive Design & Cross-Device Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // 1. Verify index.html Viewport & Meta Tags
  console.log('1. Checking HTML Meta & Viewport:');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert(indexHtml.includes('viewport-fit=cover'), 'index.html contains viewport-fit=cover');
  assert(indexHtml.includes('name="apple-mobile-web-app-capable"'), 'index.html contains mobile-web-app capability meta');
  assert(indexHtml.includes('name="theme-color"'), 'index.html contains theme-color meta tag');

  // 2. Verify bundle.css exists and contains responsive media queries
  console.log('\n2. Checking CSS Media Queries & Breakpoints:');
  const bundleCss = fs.readFileSync(path.resolve('bundle.css'), 'utf-8');
  assert(bundleCss.includes('(max-width: 1024px)'), 'bundle.css contains tablet breakpoint (1024px)');
  assert(bundleCss.includes('(max-width: 768px)'), 'bundle.css contains mobile breakpoint (768px)');
  assert(bundleCss.includes('(max-width: 480px)'), 'bundle.css contains small mobile breakpoint (480px)');
  assert(bundleCss.includes('(max-width: 360px)'), 'bundle.css contains ultra-small phone breakpoint (360px)');
  assert(bundleCss.includes('(orientation: landscape) and (max-height: 500px)'), 'bundle.css contains landscape mobile query (max-height: 500px)');
  assert(bundleCss.includes('(min-width: 1440px)'), 'bundle.css contains desktop 1440px media query');
  assert(bundleCss.includes('(min-width: 1920px)'), 'bundle.css contains ultrawide 1920px media query');

  // 3. Verify iOS Safari Zoom Prevention (16px input font size)
  console.log('\n3. Checking Touch and Input Accessibility:');
  assert(bundleCss.includes('font-size: 16px !important'), 'bundle.css sets 16px font-size on inputs for <= 768px to prevent iOS auto-zoom');
  assert(bundleCss.includes('min-height: 44px'), 'bundle.css establishes accessible 44px touch targets on mobile buttons');
  assert(bundleCss.includes('env(safe-area-inset-top'), 'bundle.css handles iPhone safe area insets');

  // 4. Verify Responsive Train Calculation in trainJourney.js
  console.log('\n4. Checking Adaptive Train Movement Formula:');
  const trainJourneyJs = fs.readFileSync(path.resolve('src/components/trainJourney.js'), 'utf-8');
  assert(trainJourneyJs.includes('trainScale = 0.32'), 'trainJourney.js includes scale for <= 360px viewports');
  assert(trainJourneyJs.includes('scaledTrainWidth = 1555 * trainScale'), 'trainJourney.js calculates scaled realistic train width dynamically');
  assert(trainJourneyJs.includes('targetArrivalX = (screenWidth >= scaledTrainWidth + 40)'), 'trainJourney.js computes adaptive targetArrivalX preventing offscreen cutoff');

  // 5. Verify OTP input responsive styles
  console.log('\n5. Checking OTP Input Responsiveness:');
  assert(bundleCss.includes('#otp-input'), 'bundle.css includes dedicated responsive rules for #otp-input');

  // 6. Verify Dashboard Grid avoids horizontal scroll
  console.log('\n6. Checking Grid Sizing:');
  assert(!bundleCss.includes('minmax(320px, 1fr)'), 'No hardcoded minmax(320px, 1fr) causing horizontal overflow on 320px screens');

  // 7. Verify Prefers-Reduced-Motion Accessibility
  console.log('\n7. Checking Accessibility & Reduced Motion:');
  assert(bundleCss.includes('prefers-reduced-motion: reduce'), 'bundle.css supports prefers-reduced-motion');

  console.log(`\n======================================================`);
  console.log(`SUMMARY: ${passed} / ${total} responsive checks passed.`);
  console.log(`======================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

