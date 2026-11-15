/**
 * THE EVERGREEN EXPRESS — GLOBAL DEPARTMENT CREDIT VERIFICATION
 * Validates the consistent, elegant department credit throughout the website:
 * "Department of Computer Science"
 */

import assert from 'assert';
import fs from 'fs';

console.log('\n=============================================================');
console.log('   THE EVERGREEN EXPRESS — DEPARTMENT CREDIT TEST SUITE      ');
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

const indexHtml = fs.readFileSync('index.html', 'utf8');
const mainJs = fs.readFileSync('src/main.js', 'utf8');
const creditComponentJs = fs.readFileSync('src/components/departmentCredit.js', 'utf8');
const mainCss = fs.readFileSync('src/styles/main.css', 'utf8');
const responsiveCss = fs.readFileSync('src/styles/responsive.css', 'utf8');
const variablesCss = fs.readFileSync('src/styles/variables.css', 'utf8');
const bundleCss = fs.readFileSync('bundle.css', 'utf8');
const bundleJs = fs.readFileSync('bundle.js', 'utf8');

// 1. Text & Element Architecture
console.log('--- 1. Shared Layout Element & Exact Text ---');
it('index.html contains persistent shared layout element with exact text', () => {
  assert(indexHtml.includes('Department of Computer Science'), 'Exact text missing in index.html');
  assert(indexHtml.includes('id="department-credit"'), 'id="department-credit" missing in index.html');
  assert(indexHtml.includes('class="department-credit"'), 'class="department-credit" missing in index.html');
});

it('modular component exists and exports correct text and initializer', () => {
  assert(creditComponentJs.includes("DEPARTMENT_CREDIT_TEXT = 'Department of Computer Science'"), 'Constant text missing');
  assert(creditComponentJs.includes('export function initDepartmentCredit'), 'initDepartmentCredit missing');
  assert(mainJs.includes('initDepartmentCredit()'), 'initDepartmentCredit call missing in main.js');
});

// 2. Styling, Positioning & Design Requirements
console.log('\n--- 2. Styling & Visual Aesthetics ---');
it('anchored to the bottom-right corner of viewport with fixed positioning', () => {
  assert(bundleCss.includes('.department-credit') &&
         bundleCss.includes('position: fixed') &&
         bundleCss.includes('right: 22px'),
         'Fixed bottom-right positioning missing in bundle.css');
});

it('uses elegant display serif font matching Christmas theme', () => {
  assert(mainCss.includes('font-family: var(--font-display)'), 'Display font family missing in main.css');
  assert(bundleCss.includes('font-family:var(--font-display)') || bundleCss.includes('font-family: var(--font-display)'),
         'Display font missing in bundle.css');
});

it('uses subtle champagne-gold / warm ivory color with high contrast against dark backgrounds', () => {
  assert(mainCss.includes('rgba(254, 240, 138,'), 'Champagne gold color missing in main.css');
  assert(mainCss.includes('text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9)'), 'Subtle shadow for legibility missing in main.css');
});

it('has pointer-events: none so it never blocks clicks on buttons, cards or links', () => {
  assert(mainCss.includes('pointer-events: none'), 'pointer-events: none missing in main.css');
  assert(mainCss.includes('user-select: none'), 'user-select: none missing in main.css');
});

it('z-index hierarchy is above background layers and train overlay, below toasts', () => {
  assert(variablesCss.includes('--z-credit: 205;'), '--z-credit variable missing in variables.css');
  assert(mainCss.includes('z-index: var(--z-credit)'), 'z-index: var(--z-credit) missing in main.css');
});

// 3. Cross-Device Responsiveness
console.log('\n--- 3. Cross-Device Responsiveness ---');
it('responsive styles adjust position, font size, and spacing on mobile (<=768px)', () => {
  assert(responsiveCss.includes('.department-credit') && responsiveCss.includes('bottom: calc(10px + var(--safe-bottom))'),
         '768px responsive rule missing in responsive.css');
});

it('responsive styles adjust for smartphones (<=480px)', () => {
  assert(responsiveCss.includes('.department-credit') && responsiveCss.includes('bottom: calc(8px + var(--safe-bottom))'),
         '480px responsive rule missing in responsive.css');
});

it('responsive styles adjust for narrow phones (<=360px)', () => {
  assert(responsiveCss.includes('.department-credit') && responsiveCss.includes('bottom: calc(6px + var(--safe-bottom))'),
         '360px responsive rule missing in responsive.css');
});

it('responsive styles adjust for landscape mobile viewports', () => {
  assert(responsiveCss.includes('.department-credit') && responsiveCss.includes('font-size: 0.65rem'),
         'Landscape responsive rule missing in responsive.css');
});

console.log('\n=============================================================');
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=============================================================\n');

if (failed > 0) {
  process.exit(1);
}
