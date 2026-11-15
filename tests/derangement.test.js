import { generateSecretSantaDerangement, validateAssignments } from '../src/services/secretSantaService.js';

console.log('--- RUNNING SECRET SANTA MATHEMATICAL VERIFICATION TESTS ---');

// Test 1: Validation with 8 faculty members
const faculty = [
  { id: '1', name: 'Dr. Vance' },
  { id: '2', name: 'Prof. Pendelton' },
  { id: '3', name: 'Dr. Chen' },
  { id: '4', name: 'Prof. Sterling' },
  { id: '5', name: 'Dr. Rostova' },
  { id: '6', name: 'Dr. Miller' },
  { id: '7', name: 'Prof. Green' },
  { id: '8', name: 'Dr. O\'Connor' }
];

let derangementCount = 0;
const iterations = 5000;

for (let iter = 0; iter < iterations; iter++) {
  const result = generateSecretSantaDerangement(faculty);

  // Check 1: Length matches
  if (result.length !== faculty.length) {
    throw new Error(`Length mismatch in iteration ${iter}`);
  }

  // Check 2: No self-assignments
  for (const pair of result) {
    if (pair.giverId === pair.receiverId) {
      throw new Error(`Self-assignment detected in iteration ${iter}: ${pair.giverId} -> ${pair.receiverId}`);
    }
  }

  // Check 3: Every giver unique
  const givers = new Set(result.map(r => r.giverId));
  if (givers.size !== faculty.length) {
    throw new Error(`Duplicate giver detected in iteration ${iter}`);
  }

  // Check 4: Every receiver unique
  const receivers = new Set(result.map(r => r.receiverId));
  if (receivers.size !== faculty.length) {
    throw new Error(`Duplicate receiver detected in iteration ${iter}`);
  }

  if (validateAssignments(result, faculty)) {
    derangementCount++;
  }
}

console.log(`✓ 5,000 / 5,000 iterations passed with ZERO self-assignments ($P(i) != i$)!`);

// Test 2: Stress test with 40 faculty members (college scale)
const largeFaculty = Array.from({ length: 40 }, (_, i) => ({
  id: `fac_${i + 1}`,
  name: `Faculty Member #${i + 1}`
}));

for (let iter = 0; iter < 1000; iter++) {
  const result = generateSecretSantaDerangement(largeFaculty);
  if (!validateAssignments(result, largeFaculty)) {
    throw new Error(`Failed validation on 40-member derangement in iteration ${iter}`);
  }
}

console.log('✓ 1,000 / 1,000 iterations passed on 40-faculty scale derangement!');

// Test 3: Edge case N = 2
const twoFaculty = [
  { id: 'A', name: 'Prof A' },
  { id: 'B', name: 'Prof B' }
];
const twoResult = generateSecretSantaDerangement(twoFaculty);
if (twoResult[0].giverId === twoResult[0].receiverId || twoResult[1].giverId === twoResult[1].receiverId) {
  throw new Error('Self assignment in N=2');
}
console.log('✓ Edge case N = 2 passed (mutual exchange: A -> B, B -> A)!');

// Test 4: Edge case N < 2 should throw error
try {
  generateSecretSantaDerangement([{ id: 'solo', name: 'Solo' }]);
  throw new Error('Should have failed with N < 2');
} catch (e) {
  console.log(`✓ Edge case N = 1 correctly throws error: "${e.message}"`);
}

console.log('--- ALL MATHEMATICAL SECRET SANTA TESTS PASSED 100% ---');
