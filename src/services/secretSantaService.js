/* ==========================================================================
   SECRET SANTA DERANGEMENT ENGINE
   Mathematically verified: No self-assignments, uniform single/full cycle,
   every giver has 1 recipient, every recipient has 1 giver.
   ========================================================================== */

/**
 * Generates a valid derangement for a list of participants.
 * Uses Sattolo's Algorithm to generate a uniform random cyclic permutation.
 * In a cyclic permutation of length N >= 2, no element can be mapped to itself (fixed-point free).
 * 
 * @param {Array<Object>} participants - Array of participant objects ({ id, name, ... })
 * @returns {Array<Object>} assignments - Array of { giverId, receiverId, createdAt }
 */
export function generateSecretSantaDerangement(participants) {
  if (!Array.isArray(participants) || participants.length < 2) {
    throw new Error('A minimum of 2 participants is required to generate Secret Santa assignments.');
  }

  const n = participants.length;
  // Clone list to preserve original order of givers
  const givers = [...participants];
  const receivers = [...participants];

  // Sattolo's Algorithm for uniform random derangement (single cycle of length n)
  for (let i = n - 1; i > 0; i--) {
    // Note: j is strictly less than i: 0 <= j < i
    const j = Math.floor(Math.random() * i);
    const temp = receivers[i];
    receivers[i] = receivers[j];
    receivers[j] = temp;
  }

  // Final check: if for any reason receivers[0].id === givers[0].id, swap with adjacent
  if (receivers[0].id === givers[0].id) {
    const temp = receivers[0];
    receivers[0] = receivers[1];
    receivers[1] = temp;
  }

  // Construct assignment pairs
  const assignments = [];
  const assignedGivers = new Set();
  const assignedReceivers = new Set();

  for (let i = 0; i < n; i++) {
    const giver = givers[i];
    const receiver = receivers[i];

    // Strictly forbidden checks
    if (giver.id === receiver.id) {
      // Rejection recovery: regenerate if a fixed point is detected
      return generateSecretSantaDerangement(participants);
    }

    if (assignedGivers.has(giver.id) || assignedReceivers.has(receiver.id)) {
      return generateSecretSantaDerangement(participants);
    }

    assignedGivers.add(giver.id);
    assignedReceivers.add(receiver.id);

    assignments.push({
      giverId: giver.id,
      receiverId: receiver.id,
      createdAt: new Date().toISOString()
    });
  }

  // Validate complete coverage
  if (assignments.length !== n || assignedGivers.size !== n || assignedReceivers.size !== n) {
    throw new Error('Failed assignment integrity check: incomplete derangement.');
  }

  return assignments;
}

/**
 * Validates an existing assignment array against all Secret Santa rules.
 */
export function validateAssignments(assignments, participants) {
  if (!assignments || assignments.length !== participants.length) return false;

  const giverSet = new Set();
  const receiverSet = new Set();

  for (const pair of assignments) {
    if (pair.giverId === pair.receiverId) return false; // Self-assignment detected
    if (giverSet.has(pair.giverId)) return false; // Duplicate giver
    if (receiverSet.has(pair.receiverId)) return false; // Duplicate receiver

    giverSet.add(pair.giverId);
    receiverSet.add(pair.receiverId);
  }

  return giverSet.size === participants.length && receiverSet.size === participants.length;
}
