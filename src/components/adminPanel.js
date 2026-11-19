/* ==========================================================================
   THE EVERGREEN EXPRESS — ADMINISTRATOR CONTROL PORTAL
   Connects to Supabase PostgreSQL via backend /api/admin/... endpoints
   High-performance, debounced, with full lifecycle coordination and safety
   ========================================================================== */

import { authService } from '../services/authService.js';
import { databaseService } from '../services/databaseService.js';
import { showToast } from '../main.js';
import { setupPasswordToggle, EYE_ICONS } from './authModals.js';

export async function renderAdminPanel(container, currentUser) {
  let dashboardData;
  let participants = [];
  try {
    const [dashRes, partsRes] = await Promise.all([
      databaseService.getAdminDashboard(),
      databaseService.getParticipants(),
    ]);
    dashboardData = dashRes;
    participants = partsRes || [];
  } catch (err) {
    showToast(err.message, 'error');
    dashboardData = {
      stats: {
        totalParticipants: 0,
        revealedCount: 0,
        event: { registrationStatus: 'open', eventStatus: 'pending', drawGenerated: false, drawLocked: false },
      },
    };
  }

  const { stats } = dashboardData;
  const event = stats.event || {};

  // Dynamic count from database
  const count = stats.totalParticipants || 0;
  const canCloseReg = event.registrationStatus === 'open' && count >= 2;
  const canGenerateDraw = event.registrationStatus === 'closed' && !event.drawLocked && count >= 2;
  const canLockDraw = event.drawGenerated && !event.drawLocked && count >= 2;
  const canStartEvent = event.drawLocked && event.eventStatus !== 'active' && event.eventStatus !== 'ended';

  container.innerHTML = `
    <div class="admin-section">
      <!-- Admin Header -->
      <div class="admin-header-row">
        <div class="admin-header-title">
          <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-champagne);">
            🚂 The Evergreen Express • Management Terminal
          </div>
          <h1 style="margin: 0.25rem 0;">Administrator Control Room</h1>
          <span class="admin-shield-badge">Master Conductor • Logged in as ${currentUser.name || 'Admin'}</span>
        </div>

        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-brand-logo-img" style="height: 38px;" />
          <span style="font-size: 12px; color: #94a3b8;">
            Database: <strong style="color: #22c55e;">Supabase PostgreSQL (Live)</strong>
          </span>
          <button id="btn-admin-logout" class="btn btn-secondary" style="padding: 0.45rem 1rem; font-size: 13px;">
            Exit Admin
          </button>
        </div>
      </div>

      <!-- 4 Live Dynamic Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Verified Faculty Registered</div>
          <div class="metric-value">${count}</div>
          <div style="font-size: 11px; color: ${count >= 2 ? '#86efac' : '#fca5a5'}; margin-top: 4px;">
            ${count >= 2 ? '✓ Minimum 2 met for Secret Santa draw' : '⚠️ Need at least 2 to generate draw'}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Registration Status</div>
          <div class="metric-value ${event.registrationStatus === 'open' ? 'status-open' : 'status-closed'}">
            ${(event.registrationStatus || 'OPEN').toUpperCase()}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${event.registrationStatus === 'open' ? 'Step 1: Open for registrations' : 'Step 1: Registration Closed'}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Secret Santa Draw</div>
          <div class="metric-value" style="color: ${event.drawLocked ? '#86efac' : (event.drawGenerated ? '#fde047' : '#94a3b8')};">
            ${event.drawLocked ? 'LOCKED' : (event.drawGenerated ? 'UNLOCKED' : 'PENDING')}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${event.drawLocked ? '✓ Steps 2 & 3 Completed' : (event.drawGenerated ? 'Step 3: Ready to Lock' : 'Step 2: Awaiting Draw')}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Reveal Progress</div>
          <div class="metric-value" style="color: #60a5fa;">
            ${stats.revealedCount || 0} / ${count}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${event.eventStatus === 'active' ? '🟢 Event is actively LIVE' : '⚪ Waiting for departure'}
          </div>
        </div>
      </div>

      <!-- EVENT LIFECYCLE AND COORDINATION ACTIONS -->
      <div class="admin-toolbar-card" style="margin-top: 1.5rem; background: rgba(15, 28, 56, 0.95); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 12px; padding: 1.75rem;">
        <div class="toolbar-info">
          <h3 style="color: var(--color-gold-champagne); margin-bottom: 0.5rem;">
            Event Lifecycle and Coordination Actions
          </h3>
          <p style="font-size: 0.95rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 1.25rem;">
            Execute each stage of the faculty celebration in sequence: close registrations (min. 2 participants), generate the derangement draw, lock assignments permanently, and start the journey.
          </p>
        </div>

        <!-- 4 Step Sequential Lifecycle Bar -->
        <div style="display: flex; gap: 0.85rem; flex-wrap: wrap; align-items: center;">
          
          <!-- STEP 1: Registration Control -->
          ${event.registrationStatus === 'open' ? `
            <button id="btn-admin-close-reg" class="btn btn-secondary" ${!canCloseReg ? `disabled title="${count < 2 ? 'At least 2 verified participants required to close registration' : 'Registration is closed'}"` : ''}>
              1. Close Registration 🔒
            </button>
          ` : `
            ${!event.drawLocked ? `
              <button id="btn-admin-open-reg" class="btn btn-secondary" style="border-color: #f59e0b; color: #fbbf24;">
                Re-open Registration 🔓
              </button>
            ` : `
              <button class="btn btn-secondary" disabled style="opacity: 0.8; color: #86efac; border-color: #22c55e;">
                ✓ 1. Registration Closed
              </button>
            `}
          `}

          <!-- STEP 2: Generate Secret Santa Draw -->
          ${!event.drawLocked ? `
            <button id="btn-admin-generate-draw" class="btn btn-primary" ${!canGenerateDraw ? `disabled title="${event.registrationStatus !== 'closed' ? 'Close registration first before generating the draw' : (count < 2 ? 'At least 2 verified participants required' : 'Draw is already locked')}"` : ''}>
              ${event.drawGenerated ? '2. Regenerate Draw 🎲' : '2. Generate Secret Santa Draw 🎲'}
            </button>
          ` : `
            <button class="btn btn-secondary" disabled style="opacity: 0.8; color: #86efac; border-color: #22c55e;">
              ✓ 2. Draw Generated (${count} Pairs)
            </button>
          `}

          <!-- STEP 3: Lock Secret Santa Draw -->
          ${!event.drawLocked ? `
            <button id="btn-admin-lock-draw" class="btn btn-gold" ${!canLockDraw ? `disabled title="${!event.drawGenerated ? 'Generate draw first before locking' : 'Ready to lock'}"` : ''} style="box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);">
              3. Lock Secret Santa Draw 🔒
            </button>
          ` : `
            <button class="btn btn-secondary" disabled style="opacity: 0.8; color: #86efac; border-color: #22c55e;">
              ✓ 3. Draw Permanently Locked
            </button>
          `}

          <!-- NOTIFY PARTICIPANTS -->
          <button id="btn-admin-notify-participants" class="btn btn-secondary" style="border-color: var(--color-gold); color: #fef08a; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 0 12px rgba(212, 175, 55, 0.25);">
            🎄 NOTIFY PARTICIPANTS
          </button>

          <!-- STEP 4: Start The Evergreen Express -->
          ${event.eventStatus !== 'active' ? `
            <button id="btn-admin-start-event" class="btn btn-crimson" ${!canStartEvent ? `disabled title="${!event.drawLocked ? 'Lock draw first before starting the event' : 'Event ended'}"` : ''} style="font-weight: 700; letter-spacing: 1px;">
              4. ▶ START THE EVERGREEN EXPRESS
            </button>
          ` : `
            <button id="btn-admin-end-event" class="btn btn-secondary" style="border-color: #ef4444; color: #fca5a5;">
              ⏹ End Celebration
            </button>
          `}

          <!-- View Pairings Modal Button -->
          <button id="btn-admin-view-pairings" class="btn btn-secondary" ${!event.drawGenerated ? 'disabled title="Generate draw first to view pairings"' : ''} style="margin-left: auto;">
            View All Secret Pairings 👁️
          </button>
        </div>
      </div>

      <!-- Faculty Registrations Table Section -->
      <div class="card" style="margin-top: 2rem; padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="margin: 0;">Registered Faculty Roster (${participants.length})</h3>
            <span style="font-size: 12px; color: #94a3b8;">Dynamically loaded from Supabase • Supports any faculty count (min. 2)</span>
          </div>

          <input 
            type="text" 
            id="admin-search-roster" 
            class="form-input" 
            placeholder="Search by Name or Participant ID..." 
            style="width: 280px; font-size: 13px;" 
          />
        </div>

        <div style="overflow-x: auto;">
          <table class="admin-roster-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(212, 175, 55, 0.3); color: var(--color-gold-champagne);">
                <th style="padding: 0.75rem;">Ticket ID</th>
                <th style="padding: 0.75rem;">Faculty Name</th>
                <th style="padding: 0.75rem;">College Email</th>
                <th style="padding: 0.75rem;">Department</th>
                <th style="padding: 0.75rem;">Wishlist</th>
                <th style="padding: 0.75rem;">Reveal Status</th>
              </tr>
            </thead>
            <tbody id="admin-roster-tbody">
              ${participants.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding: 2rem; text-align: center; color: #94a3b8;">
                    No faculty participants registered yet. Share the website link for faculty to register!
                  </td>
                </tr>
              ` : participants.map(p => `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                  <td style="padding: 0.75rem; font-family: monospace; font-weight: 700; color: var(--color-gold-champagne);">${p.participant_id}</td>
                  <td style="padding: 0.75rem; font-weight: 600; color: #ffffff;">${p.full_name}</td>
                  <td style="padding: 0.75rem; color: #cbd5e1;">${p.email}</td>
                  <td style="padding: 0.75rem; color: #94a3b8;">${p.department || '—'}</td>
                  <td style="padding: 0.75rem; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.gift_preference || ''}">
                    ${p.gift_preference || '—'}
                  </td>
                  <td style="padding: 0.75rem;">
                    ${p.has_revealed ? `
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); color: #86efac; font-size: 11px;">
                        ✓ Revealed (${p.reveal_count || 1}x)
                      </span>
                    ` : `
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: rgba(148, 163, 184, 0.15); color: #94a3b8; font-size: 11px;">
                        Pending
                      </span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TASK 4: DEDICATED RESET DATABASE SECTION -->
      <div class="card" style="margin-top: 2rem; padding: 1.75rem; border: 1px solid rgba(239, 68, 68, 0.4); background: radial-gradient(circle at top left, rgba(239, 68, 68, 0.08) 0%, rgba(15, 28, 56, 0.95) 100%); border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span style="font-size: 1.25rem;">⚠️</span>
              <h3 style="margin: 0; color: #f87171; font-family: var(--font-display);">Emergency Database & Event Reset</h3>
              <span style="font-size: 11px; text-transform: uppercase; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); color: #fca5a5; padding: 2px 8px; border-radius: 4px;">
                Sensitive Action
              </span>
            </div>
            <p style="font-size: 0.88rem; color: #cbd5e1; margin: 0; line-height: 1.5; max-width: 780px;">
              Permanently clears generated Secret Santa pairings and reveal progress, returning the event to registration state. 
              <strong>An automatic, verifiable database snapshot is saved before any deletion.</strong> 
              Administrator credentials, environment configuration, and database structures are never deleted.
            </p>
          </div>

          <button id="btn-admin-reset-trigger" class="btn btn-secondary" style="border-color: #ef4444; color: #f87171; white-space: nowrap; padding: 0.65rem 1.25rem;">
            Open Reset Database Panel ⚙️
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach Admin Handlers
  document.getElementById('btn-admin-logout').onclick = async () => {
    await authService.logout();
    showToast('Administrator logged out.', 'info');
  };

  // Search filter
  const searchInput = document.getElementById('admin-search-roster');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('#admin-roster-tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    };
  }

  // STEP 1: Close Registration
  const closeRegBtn = document.getElementById('btn-admin-close-reg');
  if (closeRegBtn) {
    closeRegBtn.onclick = async () => {
      if (!confirm(`Close registration for The Evergreen Express? Current eligible participants: ${count}. Once closed, you can generate the Secret Santa draw.`)) {
        return;
      }
      try {
        closeRegBtn.disabled = true;
        closeRegBtn.textContent = 'Closing Registration...';
        const res = await databaseService.closeRegistration();
        showToast(res.message, 'success');
        renderAdminPanel(container, currentUser);
      } catch (err) {
        showToast(err.message, 'error');
        closeRegBtn.disabled = false;
        closeRegBtn.textContent = '1. Close Registration 🔒';
      }
    };
  }

  // STEP 1 (Alt): Re-open Registration
  const openRegBtn = document.getElementById('btn-admin-open-reg');
  if (openRegBtn) {
    openRegBtn.onclick = async () => {
      try {
        openRegBtn.disabled = true;
        openRegBtn.textContent = 'Opening...';
        const res = await databaseService.openRegistration();
        showToast(res.message, 'success');
        renderAdminPanel(container, currentUser);
      } catch (err) {
        showToast(err.message, 'error');
        openRegBtn.disabled = false;
        openRegBtn.textContent = 'Re-open Registration 🔓';
      }
    };
  }

  // STEP 2: Generate Draw
  const generateDrawBtn = document.getElementById('btn-admin-generate-draw');
  if (generateDrawBtn) {
    generateDrawBtn.onclick = async () => {
      if (!confirm(`Generate Secret Santa assignments for all ${count} verified participants? Every participant will be assigned exactly one recipient in a full derangement cycle with zero self-assignments.`)) {
        return;
      }
      try {
        generateDrawBtn.disabled = true;
        generateDrawBtn.textContent = 'Generating Derangement...';
        const res = await databaseService.generateDraw();
        showToast(res.message, 'success');
        renderAdminPanel(container, currentUser);
      } catch (err) {
        showToast(err.message, 'error');
        generateDrawBtn.disabled = false;
        generateDrawBtn.textContent = '2. Generate Secret Santa Draw 🎲';
      }
    };
  }

  // STEP 3: Lock Draw
  const lockDrawBtn = document.getElementById('btn-admin-lock-draw');
  if (lockDrawBtn) {
    lockDrawBtn.onclick = async () => {
      if (!confirm('Lock the Secret Santa draw permanently? Once locked, assignments cannot be regenerated and participants will receive these pairings when the journey begins.')) {
        return;
      }
      try {
        lockDrawBtn.disabled = true;
        lockDrawBtn.textContent = 'Locking Assignments...';
        const res = await databaseService.lockDraw();
        showToast(res.message, 'success');
        renderAdminPanel(container, currentUser);
      } catch (err) {
        showToast(err.message, 'error');
        lockDrawBtn.disabled = false;
        lockDrawBtn.textContent = '3. Lock Secret Santa Draw 🔒';
      }
    };
  }

  // NOTIFY PARTICIPANTS
  const notifyParticipantsBtn = document.getElementById('btn-admin-notify-participants');
  if (notifyParticipantsBtn) {
    notifyParticipantsBtn.onclick = () => {
      showNotificationModal(currentUser);
    };
  }

  // STEP 4: Start Event
  const startEventBtn = document.getElementById('btn-admin-start-event');
  if (startEventBtn) {
    startEventBtn.onclick = async () => {
      if (!confirm('Start THE EVERGREEN EXPRESS? The event will become LIVE immediately and all registered faculty members will be able to access the Christmas Express and reveal their recipient.')) {
        return;
      }
      try {
        startEventBtn.disabled = true;
        startEventBtn.textContent = 'Departing Station...';
        const res = await databaseService.startEvent();
        showToast(res.message, 'success');
        renderAdminPanel(container, currentUser);
      } catch (err) {
        showToast(err.message, 'error');
        startEventBtn.disabled = false;
        startEventBtn.textContent = '4. ▶ START THE EVERGREEN EXPRESS';
      }
    };
  }

  // End Event
  const endEventBtn = document.getElementById('btn-admin-end-event');
  if (endEventBtn) {
    endEventBtn.onclick = async () => {
      if (!confirm('Conclude the Secret Santa celebration?')) return;
      try {
        endEventBtn.disabled = true;
        endEventBtn.textContent = 'Ending Event...';
        const res = await databaseService.endEvent();
        showToast(res.message, 'info');
        renderAdminPanel(container, currentUser);
      } catch (err) {
        showToast(err.message, 'error');
        endEventBtn.disabled = false;
        endEventBtn.textContent = '⏹ End Celebration';
      }
    };
  }

  // View Pairings Modal
  const viewPairingsBtn = document.getElementById('btn-admin-view-pairings');
  if (viewPairingsBtn) {
    viewPairingsBtn.onclick = async () => {
      try {
        viewPairingsBtn.disabled = true;
        const data = await databaseService.getAssignments();
        viewPairingsBtn.disabled = false;
        showPairingsModal(data.assignments);
      } catch (err) {
        viewPairingsBtn.disabled = false;
        showToast(err.message, 'error');
      }
    };
  }

  // Reset Trigger Modal
  const resetBtn = document.getElementById('btn-admin-reset-trigger');
  if (resetBtn) {
    resetBtn.onclick = () => {
      showResetModal(event, () => renderAdminPanel(container, currentUser));
    };
  }
}

/**
 * Confidential Pairings Inspector Modal (Admin Only)
 */
function showPairingsModal(assignments) {
  let modal = document.getElementById('pairings-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pairings-modal';
    modal.className = 'modal-backdrop active';
    document.body.appendChild(modal);
  }

  modal.classList.add('active');
  modal.innerHTML = `
    <div class="modal-window" style="max-width: 760px; max-height: 85vh; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin: 0;">Secret Santa Assignments List</h2>
          <span style="font-size: 12px; color: #f87171;">CONFIDENTIAL • Strictly for Administration</span>
        </div>
        <button id="btn-close-pairings" class="modal-close-btn">&times;</button>
      </div>

      <div style="overflow-y: auto; flex: 1;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(212, 175, 55, 0.3); color: var(--color-gold-champagne);">
              <th style="padding: 0.6rem;">Giver (Secret Santa)</th>
              <th style="padding: 0.6rem; text-align: center;">→</th>
              <th style="padding: 0.6rem;">Recipient</th>
              <th style="padding: 0.6rem;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${assignments.length === 0 ? `
              <tr><td colspan="4" style="text-align: center; padding: 2rem; color: #94a3b8;">No assignments generated yet.</td></tr>
            ` : assignments.map(a => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 0.6rem;">
                  <strong>${a.giver_name}</strong> <span style="font-family: monospace; color: var(--color-gold-champagne);">(${a.giver_id})</span>
                </td>
                <td style="padding: 0.6rem; text-align: center; color: var(--color-gold-champagne);">➔</td>
                <td style="padding: 0.6rem;">
                  <strong>${a.recipient_name}</strong> <span style="font-family: monospace; color: var(--color-gold-champagne);">(${a.recipient_id})</span>
                </td>
                <td style="padding: 0.6rem;">
                  ${a.is_revealed ? '<span style="color: #4ade80;">✓ Revealed</span>' : '<span style="color: #94a3b8;">Unrevealed</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem; text-align: right;">
        <button id="btn-print-pairings" class="btn btn-secondary" style="margin-right: 0.5rem;">Print Roster 🖨️</button>
        <button id="btn-dismiss-pairings" class="btn btn-primary">Done</button>
      </div>
    </div>
  `;

  document.getElementById('btn-close-pairings').onclick = () => modal.classList.remove('active');
  document.getElementById('btn-dismiss-pairings').onclick = () => modal.classList.remove('active');
  document.getElementById('btn-print-pairings').onclick = () => window.print();
}

/**
 * Protected Emergency Database Reset Modal (Task 4)
 */
function showResetModal(eventState, onResetSuccess) {
  let modal = document.getElementById('reset-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reset-modal';
    modal.className = 'modal-backdrop active';
    document.body.appendChild(modal);
  }

  const isLive = eventState && eventState.eventStatus === 'active';

  modal.classList.add('active');
  modal.innerHTML = `
    <div class="modal-window" style="max-width: 520px; border: 2px solid #ef4444; background: radial-gradient(circle at top, #1e1b2e 0%, #0c0a17 100%);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="color: #ef4444; margin: 0; font-size: 1.4rem;">⚠️ Reset Database & Event</h2>
        <button id="btn-close-reset-modal" class="modal-close-btn">&times;</button>
      </div>

      ${isLive ? `
        <div style="background: rgba(239, 68, 68, 0.2); border-left: 4px solid #ef4444; padding: 12px 14px; border-radius: 6px; margin-bottom: 1.25rem;">
          <strong style="color: #fca5a5;">⛔ RESET NOT PERMITTED WHILE EVENT IS LIVE</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #fecaca;">
            The Evergreen Express is currently active. To prevent accidental disruption to participants, you must first click <strong>"End Celebration"</strong> before performing a reset.
          </p>
        </div>
      ` : `
        <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 6px; margin-bottom: 1.25rem;">
          <strong style="color: #fde047; font-size: 13px;">🛡️ Automated Safety Snapshot Enabled</strong>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #cbd5e1;">
            A verified backup snapshot of the database will be created and saved in the <code>system_backups</code> table before any records are cleared.
          </p>
        </div>
      `}

      <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-bottom: 1.25rem;">
        This action will permanently delete all generated Secret Santa pairings, reset reveal progress, and return the event to <strong>Open & Pending</strong>.
      </p>

      <div style="margin-bottom: 1.25rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;">
        <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 13px; color: #ffffff; cursor: pointer;">
          <input type="checkbox" id="reset-include-participants" />
          <span>Also delete registered participant accounts (Full Reset)</span>
        </label>
        <span style="display: block; font-size: 11px; color: #94a3b8; margin-top: 4px; margin-left: 24px;">
          Unchecked (Recommended): Preserves faculty passenger tickets. Checked: Deletes participants too.
        </span>
      </div>

      <div class="form-group" style="margin-bottom: 1rem;">
        <label class="form-label" style="font-size: 12px;">Administrator Password</label>
        <div class="password-field-wrapper">
          <input type="password" id="reset-admin-pwd" class="form-input" placeholder="Enter admin password to authorize" ${isLive ? 'disabled' : ''} />
          <button type="button" class="password-toggle-btn" id="toggle-reset-admin-pwd" aria-label="Show password" title="Show password" ${isLive ? 'disabled' : ''}>
            ${EYE_ICONS.show}
          </button>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="font-size: 12px;">
          Type confirmation phrase <code style="color: #f87171; background: rgba(239, 68, 68, 0.2); padding: 2px 6px; border-radius: 4px;">RESET_CONFIRM_EVERGREEN</code>:
        </label>
        <input type="text" id="reset-confirm-code" class="form-input" placeholder="RESET_CONFIRM_EVERGREEN" ${isLive ? 'disabled' : ''} />
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="btn-cancel-reset" class="btn btn-secondary">Cancel</button>
        <button id="btn-execute-reset" class="btn btn-crimson" ${isLive ? 'disabled' : ''}>
          Confirm & Execute Safe Reset ⚠️
        </button>
      </div>

      <!-- Verified Snapshots & Restoration Store -->
      <div id="reset-backups-container"></div>
    </div>
  `;

  document.getElementById('btn-close-reset-modal').onclick = () => modal.classList.remove('active');
  document.getElementById('btn-cancel-reset').onclick = () => modal.classList.remove('active');
  setupPasswordToggle('toggle-reset-admin-pwd', 'reset-admin-pwd');

  // Load and display recent snapshots
  const loadSnapshots = async () => {
    try {
      const backups = await databaseService.getBackups();
      const backupListContainer = document.getElementById('reset-backups-container');
      if (!backupListContainer) return;

      backupListContainer.innerHTML = `
        <div style="margin-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-gold-champagne); font-weight: 600;">
              📦 Available Verified Snapshots (${backups.length})
            </div>
            <button id="btn-save-manual-snapshot" class="btn btn-secondary" style="padding: 3px 8px; font-size: 11px;" ${isLive ? 'disabled' : ''}>
              + Save New Snapshot 💾
            </button>
          </div>
          ${backups.length === 0 ? `
            <div style="font-size: 12px; color: #94a3b8; text-align: center; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 6px;">
              No snapshots saved yet. Click "+ Save New Snapshot" to capture current database state.
            </div>
          ` : `
            <div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
              ${backups.map(b => {
                const pairsText = b.total_assignments !== null ? `${b.total_assignments} pairs` : 'Pairs not included';
                const facultyText = b.total_participants !== null ? `${b.total_participants} faculty` : 'Faculty not included';
                return `
                  <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
                    <div>
                      <span style="font-family: monospace; color: var(--color-gold-light); font-weight: 700;">#${b.id.slice(0, 8)}</span>
                      <span style="color: #94a3b8; margin-left: 6px;">${new Date(b.created_at).toLocaleString()}</span>
                      <span style="color: #cbd5e1; margin-left: 6px;">(${pairsText}, ${facultyText})</span>
                    </div>
                    <button class="btn btn-secondary btn-restore-snapshot" data-backup-id="${b.id}" style="padding: 3px 8px; font-size: 11px;" ${isLive ? 'disabled' : ''}>
                      Restore 🔄
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;

      // Attach manual snapshot save handler
      const saveBtn = document.getElementById('btn-save-manual-snapshot');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving Snapshot...';
            const res = await databaseService.createBackup();
            showToast(res.message, 'success');
            await loadSnapshots();
          } catch (e) {
            showToast(e.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = '+ Save New Snapshot 💾';
          }
        };
      }

      // Attach restore handlers
      backupListContainer.querySelectorAll('.btn-restore-snapshot').forEach(btn => {
        btn.onclick = async () => {
          const backupId = btn.getAttribute('data-backup-id');
          const pwd = prompt('Enter your Administrator Password to confirm restoring snapshot #' + backupId.slice(0, 8) + ':');
          if (!pwd) return;

          try {
            btn.disabled = true;
            btn.textContent = 'Restoring...';
            const res = await databaseService.restoreBackup(backupId, pwd);
            showToast(res.message, 'success');
            modal.classList.remove('active');
            if (onResetSuccess) onResetSuccess();
          } catch (e) {
            showToast(e.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Restore 🔄';
          }
        };
      });
    } catch (e) {
      console.warn('Backup fetch notice:', e);
    }
  };

  loadSnapshots();

  const executeBtn = document.getElementById('btn-execute-reset');
  if (executeBtn && !isLive) {
    executeBtn.onclick = async () => {
      const pwd = document.getElementById('reset-admin-pwd').value.trim();
      const code = document.getElementById('reset-confirm-code').value.trim();
      const resetParticipants = document.getElementById('reset-include-participants').checked;

      if (!pwd) {
        showToast('Please enter your administrator password.', 'error');
        return;
      }

      if (code !== 'RESET_CONFIRM_EVERGREEN') {
        showToast('Please type RESET_CONFIRM_EVERGREEN exactly to confirm.', 'error');
        return;
      }

      try {
        executeBtn.disabled = true;
        executeBtn.textContent = 'Executing Safe Reset...';
        const res = await databaseService.confirmReset(pwd, code, resetParticipants);
        showToast(res.message, 'success');
        modal.classList.remove('active');
        if (onResetSuccess) onResetSuccess();
      } catch (err) {
        showToast(err.message, 'error');
        executeBtn.disabled = false;
        executeBtn.textContent = 'Confirm & Execute Safe Reset ⚠️';
      }
    };
  }
}

/**
 * Modal to preview and dispatch commencement announcement emails to eligible participants
 */
async function showNotificationModal(currentUser) {
  let modal = document.getElementById('admin-notify-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-notify-modal';
    modal.className = 'modal-backdrop active';
    document.body.appendChild(modal);
  }

  modal.classList.add('active');
  modal.innerHTML = `
    <div class="modal-window" style="max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin: 0; font-size: 1.4rem;">
            🎄 Notify Registered Participants
          </h2>
          <span style="font-size: 12px; color: #cbd5e1;">Send Secret Santa Announcement & Login Tickets</span>
        </div>
        <button id="btn-close-notify-modal" class="modal-close-btn">&times;</button>
      </div>
      <div id="notify-modal-content" style="overflow-y: auto; flex: 1; padding-right: 4px;">
        <div style="text-align: center; padding: 2.5rem 1rem; color: #94a3b8;">
          <span class="button-spinner" style="display: inline-block; width: 24px; height: 24px; border-width: 3px; margin-bottom: 0.75rem;"></span>
          <p style="margin: 0; font-size: 14px;">Loading eligible faculty members & notification status...</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-notify-modal').onclick = () => modal.classList.remove('active');

  let data;
  try {
    data = await databaseService.getAnnouncementStatus();
  } catch (err) {
    const content = document.getElementById('notify-modal-content');
    if (content) {
      content.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; padding: 1.25rem; color: #fca5a5;">
          <strong>Failed to load announcement status:</strong> ${err.message}
        </div>
      `;
    }
    return;
  }

  const { eligibleCount, participants, lastAnnouncement, preview, siteUrl } = data;
  let activeTab = 'preview';
  let isSending = false;
  let sentList = new Set();
  let failedMap = new Map();

  const renderModalBody = () => {
    const content = document.getElementById('notify-modal-content');
    if (!content) return;

    content.innerHTML = `
      <!-- Status & Notice Banner -->
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
        <div style="flex: 1; min-width: 240px; background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 8px; padding: 0.75rem 1rem;">
          <div style="font-size: 11px; text-transform: uppercase; color: #fef08a; font-weight: 700; letter-spacing: 1px;">
            Eligible Recipients
          </div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin-top: 2px;">
            ${eligibleCount} <span style="font-size: 0.85rem; font-weight: 400; color: #cbd5e1;">Verified Faculty Member${eligibleCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div style="flex: 1; min-width: 240px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 0.75rem 1rem;">
          <div style="font-size: 11px; text-transform: uppercase; color: #86efac; font-weight: 700; letter-spacing: 1px;">
            Email Delivery Integration
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #ffffff; margin-top: 4px;">
            Google Apps Script Web App ✉️
          </div>
        </div>
      </div>

      ${lastAnnouncement ? `
        <div style="background: rgba(245, 158, 11, 0.12); border-left: 4px solid #f59e0b; border-radius: 6px; padding: 10px 14px; margin-bottom: 1.25rem; font-size: 12px; color: #fde047;">
          <strong>🔔 Previous Notification Broadcast:</strong> Sent on ${new Date(lastAnnouncement.sentAt).toLocaleString()} (${lastAnnouncement.details?.sent || 0} delivered, ${lastAnnouncement.details?.failed || 0} failed).
        </div>
      ` : ''}

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 1rem;">
        <button id="tab-btn-preview" class="btn btn-secondary" style="border-radius: 6px 6px 0 0; padding: 0.5rem 1rem; font-size: 13px; border-bottom: none; ${activeTab === 'preview' ? 'background: rgba(212, 175, 55, 0.2); border-color: var(--color-gold); color: #fef08a;' : 'opacity: 0.7;'}">
          ✉️ Email Preview
        </button>
        <button id="tab-btn-roster" class="btn btn-secondary" style="border-radius: 6px 6px 0 0; padding: 0.5rem 1rem; font-size: 13px; border-bottom: none; ${activeTab === 'roster' ? 'background: rgba(212, 175, 55, 0.2); border-color: var(--color-gold); color: #fef08a;' : 'opacity: 0.7;'}">
          👥 Recipients Roster (${participants.length})
        </button>
      </div>

      <!-- Tab Content: Preview -->
      <div id="tab-content-preview" style="${activeTab === 'preview' ? 'display: block;' : 'display: none;'}">
        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 14px; margin-bottom: 1rem; font-size: 13px;">
          <div style="color: #94a3b8; margin-bottom: 4px;"><strong>Subject:</strong> <span style="color: #fef08a;">${preview.subject}</span></div>
          <div style="color: #94a3b8;"><strong>Sample Recipient:</strong> ${preview.sampleRecipient.fullName} (<code style="color: #fef08a;">${preview.sampleRecipient.participantId}</code>)</div>
        </div>

        <div style="border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; overflow: hidden; background: #050a16; margin-bottom: 1.25rem;">
          <iframe id="announcement-preview-frame" style="width: 100%; height: 380px; border: none; background: #050a16;" srcdoc="${encodeURIComponent(preview.html)}"></iframe>
        </div>

        <!-- Send Test Email -->
        <div style="display: flex; gap: 0.5rem; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; margin-bottom: 1.25rem;">
          <span style="font-size: 12px; color: #cbd5e1; white-space: nowrap;">Send sample test email to:</span>
          <input type="email" id="input-test-email" class="form-input" placeholder="e.g. your-email@gmail.com" style="padding: 0.4rem 0.75rem; font-size: 12px; flex: 1;" />
          <button id="btn-send-test-email" class="btn btn-secondary" style="font-size: 12px; padding: 0.45rem 0.85rem; white-space: nowrap;">
            Send Test ✉️
          </button>
        </div>
      </div>

      <!-- Tab Content: Recipients Roster -->
      <div id="tab-content-roster" style="${activeTab === 'roster' ? 'display: block;' : 'display: none;'}">
        <div style="max-height: 380px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 1.25rem;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid rgba(212, 175, 55, 0.3); color: var(--color-gold-champagne); background: rgba(0,0,0,0.3); position: sticky; top: 0;">
                <th style="padding: 0.6rem 0.75rem;">Ticket ID</th>
                <th style="padding: 0.6rem 0.75rem;">Faculty Name</th>
                <th style="padding: 0.6rem 0.75rem;">Email Address</th>
                <th style="padding: 0.6rem 0.75rem;">Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              ${participants.map(p => {
                const isSent = sentList.has(p.participantId);
                const isFailed = failedMap.has(p.participantId);
                let statusBadge = '<span style="color: #94a3b8;">Pending</span>';
                if (isSent) {
                  statusBadge = '<span style="color: #4ade80; font-weight: 600;">✓ Delivered</span>';
                } else if (isFailed) {
                  statusBadge = `<span style="color: #ef4444; font-weight: 600;" title="${failedMap.get(p.participantId)}">✕ Failed</span>`;
                }
                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 0.5rem 0.75rem; font-family: monospace; color: #fef08a; font-weight: 700;">${p.participantId}</td>
                    <td style="padding: 0.5rem 0.75rem; font-weight: 500;">${p.fullName}</td>
                    <td style="padding: 0.5rem 0.75rem; color: #cbd5e1;">${p.email}</td>
                    <td id="status-badge-${p.participantId}" style="padding: 0.5rem 0.75rem;">${statusBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Live Progress Bar (when sending) -->
      <div id="notify-progress-area" style="display: ${isSending ? 'block' : 'none'}; margin-bottom: 1.25rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
          <span id="notify-progress-text" style="color: #fef08a; font-weight: 600;">Preparing batch...</span>
          <span id="notify-progress-percent" style="color: #cbd5e1; font-family: monospace;">0%</span>
        </div>
        <div style="width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
          <div id="notify-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #d4af37, #22c55e); transition: width 0.2s ease;"></div>
        </div>
      </div>

      <!-- Action Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem; flex-wrap: wrap; gap: 0.75rem;">
        <div id="notify-result-summary" style="font-size: 13px; color: #cbd5e1;">
          ${eligibleCount === 0 ? 'No eligible participants found.' : `Ready to notify ${eligibleCount} registered faculty member${eligibleCount === 1 ? '' : 's'}.`}
        </div>

        <div style="display: flex; gap: 0.65rem;">
          <button id="btn-cancel-notify" class="btn btn-secondary" ${isSending ? 'disabled' : ''}>
            ${sentList.size > 0 ? 'Close' : 'Cancel'}
          </button>

          ${failedMap.size > 0 && !isSending ? `
            <button id="btn-retry-failed-notify" class="btn btn-crimson" style="font-weight: 600;">
              🔄 Retry Failed Emails (${failedMap.size})
            </button>
          ` : ''}

          ${!isSending && sentList.size < participants.length && eligibleCount > 0 ? `
            <button id="btn-confirm-send-notify" class="btn btn-primary" style="background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #050a16; font-weight: 700;">
              🚀 Confirm & Send to All (${participants.length})
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Tab buttons
    document.getElementById('tab-btn-preview').onclick = () => {
      activeTab = 'preview';
      renderModalBody();
    };
    document.getElementById('tab-btn-roster').onclick = () => {
      activeTab = 'roster';
      renderModalBody();
    };

    // Close / Cancel
    document.getElementById('btn-cancel-notify').onclick = () => modal.classList.remove('active');

    // Test send button
    const testBtn = document.getElementById('btn-send-test-email');
    if (testBtn) {
      testBtn.onclick = async () => {
        const testInput = document.getElementById('input-test-email');
        const testEmail = (testInput?.value || '').trim();
        if (!testEmail || !testEmail.includes('@')) {
          showToast('Please enter a valid email address to receive the test email.', 'error');
          return;
        }

        testBtn.disabled = true;
        testBtn.textContent = 'Sending Test...';
        try {
          const res = await databaseService.sendAnnouncementSingle(null, testEmail);
          if (res.success) {
            showToast(`Test announcement delivered to ${testEmail}! Check your inbox.`, 'success');
          } else {
            showToast(`Test failed: ${res.error || 'Delivery failed'}`, 'error');
          }
        } catch (e) {
          showToast(`Test error: ${e.message}`, 'error');
        } finally {
          testBtn.disabled = false;
          testBtn.textContent = 'Send Test ✉️';
        }
      };
    }

    // Confirm send handler
    const confirmBtn = document.getElementById('btn-confirm-send-notify');
    if (confirmBtn) {
      confirmBtn.onclick = () => startBulkDispatch(participants);
    }

    // Retry failed handler
    const retryBtn = document.getElementById('btn-retry-failed-notify');
    if (retryBtn) {
      retryBtn.onclick = () => {
        const failedParticipants = participants.filter(p => failedMap.has(p.participantId));
        startBulkDispatch(failedParticipants);
      };
    }
  };

  const startBulkDispatch = async (targetParticipants) => {
    if (!targetParticipants || targetParticipants.length === 0) return;

    if (!confirm(`Are you sure you want to send the Secret Santa announcement to ${targetParticipants.length} participant(s)?`)) {
      return;
    }

    isSending = true;
    activeTab = 'roster';
    renderModalBody();

    const progressArea = document.getElementById('notify-progress-area');
    const progressBar = document.getElementById('notify-progress-bar');
    const progressText = document.getElementById('notify-progress-text');
    const progressPercent = document.getElementById('notify-progress-percent');
    if (progressArea) progressArea.style.display = 'block';

    let current = 0;
    const total = targetParticipants.length;

    for (const p of targetParticipants) {
      current++;
      const pct = Math.round((current / total) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressPercent) progressPercent.textContent = `${pct}%`;
      if (progressText) progressText.textContent = `Sending ${current} of ${total}: ${p.fullName} (${p.participantId})...`;

      try {
        const res = await databaseService.sendAnnouncementSingle(p.participantId);
        if (res.success) {
          sentList.add(p.participantId);
          failedMap.delete(p.participantId);
          const badge = document.getElementById(`status-badge-${p.participantId}`);
          if (badge) badge.innerHTML = '<span style="color: #4ade80; font-weight: 600;">✓ Delivered</span>';
        } else {
          failedMap.set(p.participantId, res.error || 'Delivery failed');
          const badge = document.getElementById(`status-badge-${p.participantId}`);
          if (badge) badge.innerHTML = `<span style="color: #ef4444; font-weight: 600;" title="${res.error}">✕ Failed</span>`;
        }
      } catch (err) {
        failedMap.set(p.participantId, err.message);
        const badge = document.getElementById(`status-badge-${p.participantId}`);
        if (badge) badge.innerHTML = `<span style="color: #ef4444; font-weight: 600;" title="${err.message}">✕ Failed</span>`;
      }
    }

    isSending = false;

    // Log the batch run to audit logs
    try {
      await databaseService.logAnnouncementBatch({
        total: targetParticipants.length,
        sent: targetParticipants.length - failedMap.size,
        failed: failedMap.size,
      });
    } catch (e) {
      console.warn('Could not log batch audit:', e.message);
    }

    showToast(`Bulk notification completed: ${sentList.size} delivered, ${failedMap.size} failed.`, failedMap.size === 0 ? 'success' : 'info');
    renderModalBody();
  };

  renderModalBody();
}
