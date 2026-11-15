/* ==========================================================================
   PARTICIPANT DASHBOARD VIEW
   Implements Part 7 requirements:
   - Welcome aboard, [Participant Name]!
   - Card 1: Personal Details
   - Card 2: Participant ID (prominently displayed)
   - Card 3: Secret Santa Status (before reveal vs after reveal)
   - Event Status & "THE JOURNEY BEGINS!" boarding trigger
   - Replay reveal functionality
   ========================================================================== */

import { authService } from '../services/authService.js';
import { databaseService } from '../services/databaseService.js';
import { trainJourney } from './trainJourney.js';
import { showToast } from '../main.js';

export async function renderDashboard(container, currentUser) {
  let dashboardData;
  try {
    dashboardData = await databaseService.getDashboardData();
  } catch (err) {
    showToast(err.message, 'error');
    dashboardData = {
      participant: currentUser,
      event: { status: 'pending', name: 'The Evergreen Express' },
      revealStatus: { canReveal: false, hasRevealedName: false },
    };
  }

  const { participant, event, revealStatus } = dashboardData;
  const isEventActive = event.status === 'active';
  const hasRevealed = revealStatus.hasRevealedName;
  const assignedRecipient = revealStatus.assignedRecipient;

  container.innerHTML = `
    <div class="dashboard-section">
      <!-- Welcome Header -->
      <div class="dashboard-header-block">
        <div class="dashboard-title-area">
          <div style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-champagne);">
            🚂 The Evergreen Express • Passenger Cabin
          </div>
          <h1 style="margin: 0.25rem 0;">Welcome aboard, ${participant.fullName}!</h1>
          <p class="dashboard-subtitle">
            ${participant.department || 'College Faculty'} • Ticket #${participant.participantId}
          </p>
        </div>

        <div class="dashboard-quick-actions" style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-brand-logo-img" style="height: 38px;" />
          <button id="btn-dashboard-logout" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 13px;">
            Logout
          </button>
        </div>
      </div>

      <!-- MAIN 3 INFORMATION CARDS (PART 7) -->
      <div class="dashboard-grid">
        <!-- Card 1 — Personal Details -->
        <div class="card dashboard-card">
          <div class="card-header-icon">👤</div>
          <h3>Personal Details</h3>
          <div class="card-field" style="margin-top: 1rem;">
            <label style="font-size: 11px; text-transform: uppercase; color: var(--color-gold-champagne);">Full Name</label>
            <div style="font-size: 1.1rem; font-weight: 600; color: #fff;">${participant.fullName}</div>
          </div>
          <div class="card-field" style="margin-top: 0.75rem;">
            <label style="font-size: 11px; text-transform: uppercase; color: var(--color-gold-champagne);">Email Address</label>
            <div style="font-size: 0.95rem; color: #cbd5e1;">${participant.email}</div>
          </div>
          <div class="card-field" style="margin-top: 0.75rem;">
            <label style="font-size: 11px; text-transform: uppercase; color: var(--color-gold-champagne);">Department</label>
            <div style="font-size: 0.95rem; color: #cbd5e1;">${participant.department || 'College Faculty'}</div>
          </div>
        </div>

        <!-- Card 2 — Participant ID (Prominently Displayed) -->
        <div class="card dashboard-card" style="border-color: rgba(212, 175, 55, 0.4); background: radial-gradient(circle at top, rgba(212, 175, 55, 0.12), rgba(15, 28, 56, 0.75));">
          <div class="card-header-icon">🎫</div>
          <h3>Participant ID</h3>
          <p style="font-size: 0.85rem; color: #94a3b8; margin: 0.25rem 0 1rem 0;">
            Your official passenger ticket number
          </p>
          <div style="background: rgba(0, 0, 0, 0.35); border: 2px dashed var(--color-gold-champagne); border-radius: 8px; padding: 1.25rem; text-align: center;">
            <span style="font-family: monospace; font-size: 2.2rem; font-weight: 700; color: var(--color-gold-champagne); letter-spacing: 4px; text-shadow: 0 0 15px rgba(254, 240, 138, 0.6);">
              ${participant.participantId}
            </span>
          </div>
          <p style="font-size: 11px; color: var(--color-gold-light); margin-top: 0.75rem; text-align: center;">
            🔒 Permanent unique faculty assignment key
          </p>
        </div>

        <!-- Card 3 — Secret Santa Status -->
        <div class="card dashboard-card">
          <div class="card-header-icon">🎁</div>
          <h3>Secret Santa Status</h3>
          <div style="margin-top: 1rem;">
            ${hasRevealed && assignedRecipient ? `
              <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #86efac; letter-spacing: 1px;">Recipient Assigned</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin: 0.25rem 0;">
                  ${assignedRecipient.recipient_name}
                </div>
                <div style="font-size: 12px; color: #cbd5e1;">
                  Ticket: <strong>${assignedRecipient.recipient_participant_id}</strong> • ${assignedRecipient.recipient_department || 'Faculty'}
                </div>
                <div style="font-size: 12px; color: var(--color-gold-champagne); margin-top: 0.5rem;">
                  🎁 Wishlist: <em>"${assignedRecipient.recipient_gift_preference || 'Holiday surprise'}"</em>
                </div>
              </div>
            ` : `
              <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 1.05rem; font-style: italic; color: var(--color-gold-light);">
                  "Your Christmas friend is waiting to be discovered."
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin: 0.5rem 0 0 0;">
                  Board The Evergreen Express below once the journey commences.
                </p>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- EVENT STATUS & JOURNEY ACTION BANNER -->
      <div class="event-action-banner" style="margin-top: 2rem; background: linear-gradient(135deg, rgba(15, 28, 56, 0.95), rgba(5, 10, 22, 0.95)); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 12px; padding: 2rem; text-align: center;">
        ${!isEventActive ? `
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">❄️</div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin-bottom: 0.5rem;">
            THE EVERGREEN EXPRESS is preparing for its Christmas journey.
          </h2>
          <p style="color: var(--color-ivory-warm); max-width: 600px; margin: 0 auto; line-height: 1.5;">
            Please wait for the official announcement from the administration. Once the conductor rings the bell, you can board the train and discover your assigned Christmas friend!
          </p>
          <div style="display: inline-block; margin-top: 1.25rem; padding: 0.5rem 1.25rem; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 20px; color: #fbbf24; font-size: 13px;">
            ⏳ Event Status: PREPARING AT THE STATION
          </div>
        ` : `
          <div style="font-size: 3rem; margin-bottom: 0.5rem; animation: floatSleigh 3s ease-in-out infinite;">🚂✨</div>
          <div style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 3px; color: #4ade80; margin-bottom: 0.25rem;">
            ● OFFICIAL ANNOUNCEMENT
          </div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); font-size: 2.2rem; margin: 0.25rem 0 0.5rem 0;">
            THE JOURNEY BEGINS!
          </h2>
          <p style="color: var(--color-ivory-warm); max-width: 620px; margin: 0 auto 1.5rem auto; line-height: 1.6;">
            Steam fills the winter air and the golden lantern is lit. Your holiday friend is waiting at the end of the railway line.
          </p>
          <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            <button id="btn-start-train-journey" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.85rem 2.25rem; box-shadow: 0 0 25px rgba(212, 175, 55, 0.5);">
              ${hasRevealed ? 'Replay The Reveal Journey 🚂' : 'CONFIRM & JOIN THE EVENT 🎫'}
            </button>
          </div>
        `}
      </div>

      <!-- WISHLIST CUSTOMIZATION SECTION -->
      <div class="card" style="margin-top: 2rem; padding: 1.5rem;">
        <h3 style="margin-bottom: 0.5rem;">Your Christmas Wishlist</h3>
        <p style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 1rem;">
          Help your Secret Santa choose the perfect holiday gift for you (e.g. favourite books, coffee roast, hobby items):
        </p>
        <div style="display: flex; gap: 0.75rem;">
          <input 
            type="text" 
            id="input-wishlist-update" 
            class="form-input" 
            value="${participant.giftPreference || ''}" 
            placeholder="e.g. Specialty coffee beans, sci-fi novels, fountain pen stationery" 
            style="flex: 1;"
          />
          <button id="btn-save-wishlist" class="btn btn-secondary" style="white-space: nowrap;">
            Update Wishlist
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach Dashboard Handlers
  const logoutBtn = document.getElementById('btn-dashboard-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.logout();
      showToast('You have safely disembarked The Evergreen Express.', 'info');
    });
  }

  const wishlistBtn = document.getElementById('btn-save-wishlist');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', async () => {
      const input = document.getElementById('input-wishlist-update');
      const val = input ? input.value : '';
      try {
        wishlistBtn.disabled = true;
        wishlistBtn.textContent = 'Saving...';
        await databaseService.updateWishlist(val);
        showToast('Holiday wishlist updated successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        wishlistBtn.disabled = false;
        wishlistBtn.textContent = 'Update Wishlist';
      }
    });
  }

  const journeyBtn = document.getElementById('btn-start-train-journey');
  if (journeyBtn) {
    journeyBtn.addEventListener('click', async () => {
      try {
        const participantPayload = {
          ...participant,
          hasRevealedName: Boolean(hasRevealed),
          assignedRecipient: assignedRecipient || null,
        };
        await trainJourney.startJourney(participantPayload, () => {
          // Re-render dashboard on reveal completion to show recipient card
          renderDashboard(container, currentUser);
        });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}
