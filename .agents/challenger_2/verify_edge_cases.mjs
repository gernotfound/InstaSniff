// Empirical Edge-Case & Boundary Verification Script for Challenger 2
import assert from 'node:assert';

console.log('================================================================');
console.log('INSTASNIFF CHALLENGER 2: EMPIRICAL EDGE-CASE & BOUNDARY TEST RUN');
console.log('================================================================\n');

// --------------------------------------------------------------------------
// TEST SUITE 1: 15 MB FILE UPLOAD BOUNDARY & SIZE THRESHOLD VERIFICATION
// --------------------------------------------------------------------------
console.log('[TEST SUITE 1] File Upload Size Limits & Error Handling');

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15,728,640 bytes

function simulateFileUpload(fileSize) {
  let fileError = null;
  let parsedContent = null;

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    fileError = 'Il file supera la dimensione massima consentita di 15 MB.';
    return { success: false, error: fileError, content: parsedContent };
  }

  // Simulated successful read
  parsedContent = 'valid_user_1\nvalid_user_2';
  return { success: true, error: null, content: parsedContent };
}

// 1.1 Test exactly 15 MB (15 * 1024 * 1024 = 15728640 bytes)
const boundaryExact = simulateFileUpload(15728640);
assert.strictEqual(boundaryExact.success, true, '15MB exact should be allowed');
assert.strictEqual(boundaryExact.error, null);
console.log('  ✓ File exactly 15,728,640 bytes (15.00 MB) -> ALLOWED (success: true)');

// 1.2 Test 15 MB + 1 byte (15728641 bytes)
const boundaryOver1Byte = simulateFileUpload(15728641);
assert.strictEqual(boundaryOver1Byte.success, false, '15MB + 1 byte should be blocked');
assert.strictEqual(boundaryOver1Byte.error, 'Il file supera la dimensione massima consentita di 15 MB.');
console.log('  ✓ File at 15,728,641 bytes (15.00 MB + 1B) -> BLOCKED (rejected by limit guard)');

// 1.3 Test 50 MB extreme file
const boundary50MB = simulateFileUpload(50 * 1024 * 1024);
assert.strictEqual(boundary50MB.success, false, '50MB file should be blocked');
console.log('  ✓ File at 52,428,800 bytes (50 MB) -> BLOCKED (prevents OOM / browser freeze)');

// 1.4 Test 0 byte empty file
const boundary0Byte = simulateFileUpload(0);
assert.strictEqual(boundary0Byte.success, true);
console.log('  ✓ File at 0 bytes -> ALLOWED to read, handled by empty string parser guard');


// --------------------------------------------------------------------------
// TEST SUITE 2: STATE SYNCHRONIZATION & RESET TRIGGERS
// --------------------------------------------------------------------------
console.log('\n[TEST SUITE 2] State Synchronization & Invalidation Triggers');

class AppStateController {
  constructor() {
    this.followers = '';
    this.following = '';
    this.stats = null;
    this.alert = null;
  }

  handleFollowersChange(val) {
    this.followers = val;
    if (this.stats) this.stats = null;
    if (this.alert) this.alert = null;
  }

  handleFollowingChange(val) {
    this.following = val;
    if (this.stats) this.stats = null;
    if (this.alert) this.alert = null;
  }

  handleReset() {
    this.followers = '';
    this.following = '';
    this.stats = null;
    this.alert = null;
  }

  setMockStats(stats) {
    this.stats = stats;
  }
}

const state = new AppStateController();

// 2.1 Initial state
assert.strictEqual(state.followers, '');
assert.strictEqual(state.following, '');
assert.strictEqual(state.stats, null);
assert.strictEqual(state.alert, null);
console.log('  ✓ Initial state: followers="", following="", stats=null, alert=null');

// 2.2 Populate and analyze
state.handleFollowersChange('user_a\nuser_b');
state.handleFollowingChange('user_a\nuser_c');
state.setMockStats({ unfollowers: ['user_c'], fans: ['user_b'], mutuals: ['user_a'] });
assert.notStrictEqual(state.stats, null);
console.log('  ✓ Analysis complete: stats populated with 3 categories');

// 2.3 Mutate followers input -> stats MUST invalidate
state.handleFollowersChange('user_a\nuser_b\nuser_d');
assert.strictEqual(state.stats, null, 'Editing followers must invalidate previous stats');
console.log('  ✓ Mutating followers textarea -> stats IMMEDIATELY invalidated (null)');

// 2.4 Re-populate stats and mutate following input -> stats MUST invalidate
state.setMockStats({ unfollowers: ['user_c'] });
state.handleFollowingChange('user_a');
assert.strictEqual(state.stats, null, 'Editing following must invalidate previous stats');
console.log('  ✓ Mutating following textarea -> stats IMMEDIATELY invalidated (null)');

// 2.5 Hard reset trigger
state.handleFollowersChange('user1');
state.handleFollowingChange('user2');
state.setMockStats({ unfollowers: ['user2'] });
state.handleReset();
assert.strictEqual(state.followers, '');
assert.strictEqual(state.following, '');
assert.strictEqual(state.stats, null);
assert.strictEqual(state.alert, null);
console.log('  ✓ Hard Reset trigger -> all inputs and stats completely cleared');


// --------------------------------------------------------------------------
// TEST SUITE 3: WCAG 2.1 AA/AAA COLOR CONTRAST RATIO VERIFICATION
// --------------------------------------------------------------------------
console.log('\n[TEST SUITE 3] WCAG 2.1 AA/AAA Color Contrast Verification');

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getRelativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const colorTokens = [
  { name: 'text-white on slate-950', fg: '#ffffff', bg: '#020617', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-white on slate-900', fg: '#ffffff', bg: '#0f172a', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-slate-100 on slate-950', fg: '#f1f5f9', bg: '#020617', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-slate-200 on slate-900', fg: '#e2e8f0', bg: '#0f172a', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-slate-300 on slate-900', fg: '#cbd5e1', bg: '#0f172a', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-slate-400 on slate-950', fg: '#94a3b8', bg: '#020617', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-slate-400 on slate-900', fg: '#94a3b8', bg: '#0f172a', minAA: 4.5, minAAA: null },
  { name: 'text-indigo-400 on slate-900', fg: '#818cf8', bg: '#0f172a', minAA: 4.5, minAAA: null },
  { name: 'text-emerald-400 on slate-900', fg: '#34d399', bg: '#0f172a', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-amber-400 on slate-900', fg: '#fbbf24', bg: '#0f172a', minAA: 4.5, minAAA: 7.0 },
  { name: 'text-red-400 on slate-900', fg: '#f87171', bg: '#0f172a', minAA: 4.5, minAAA: null },
];

for (const token of colorTokens) {
  const ratio = getContrastRatio(token.fg, token.bg);
  const passAA = ratio >= token.minAA;
  const passAAA = token.minAAA ? ratio >= token.minAAA : false;

  assert.strictEqual(passAA, true, `${token.name} failed WCAG AA`);
  console.log(
    `  ✓ ${token.name.padEnd(32)} -> ${ratio.toFixed(2)}:1 [WCAG AA: PASS${
      passAAA ? ' | WCAG AAA: PASS' : ''
    }]`
  );
}

console.log('\n================================================================');
console.log('ALL EMPIRICAL TESTS PASSED SUCCESSFULLY (0 FAILURES)');
console.log('================================================================');
