/* ==========================================================================
   MASTER APPLICATION COORDINATOR
   ST PAULS COLLEGE Faculty Secret Santa Celebration
   ========================================================================== */

import { SnowEngine } from './canvas/snow.js';
import { SkyStarsEngine } from './canvas/skyStars.js';
import { sound } from './audio/soundManager.js';
import { authService } from './services/authService.js';
import { databaseService } from './services/databaseService.js';
import { openAuthModal } from './components/authModals.js';
import { renderDashboard } from './components/dashboardView.js';
import { renderAdminPanel } from './components/adminPanel.js';
import { trainJourney } from './components/trainJourney.js';
import { initDepartmentCredit } from './components/departmentCredit.js';

// Global Toast Notification System
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4200);
}

class AppCoordinator {
  constructor() {
    this.mainContent = document.getElementById('main-content');
    this.soundToggleBtn = document.getElementById('sound-toggle');
    this.soundBtnText = document.getElementById('sound-btn-text');
    this.collegeLogoBtn = document.getElementById('college-brand-logo');
    this.headerUserSlot = document.getElementById('header-user-slot');
    this.santaSleigh = document.getElementById('santa-sleigh');

    this.snowEngine = null;
    this.starsEngine = null;
  }

  init() {
    // 0. Initialize Global Department Credit
    initDepartmentCredit();

    // 1. Initialize Visual Canvas Engines
    this.snowEngine = new SnowEngine('snow-canvas');
    this.starsEngine = new SkyStarsEngine('stars-canvas');

    // 2. Initialize Sound Controls
    this.initSoundControls();

    // 3. Initialize Santa Celestial Flight Cycle
    this.initSantaFlight();

    // 4. Initialize Header Actions (College Crest -> Admin Portal)
    if (this.collegeLogoBtn) {
      this.collegeLogoBtn.addEventListener('click', () => {
        const user = authService.getCurrentUser();
        if (user && user.role === 'admin') {
          this.renderView(user);
        } else {
          openAuthModal('admin');
        }
      });
    }

    // 5. Initialize Train Journey Controller
    trainJourney.init();

    // 6. Subscribe to Authentication State Changes
    authService.subscribeAuth((user) => {
      this.updateHeaderUserStatus(user);
      this.renderView(user);
    });

    // 7. Subscribe to Real-Time Event State Changes
    databaseService.subscribeEventState((eventState) => {
      this.onEventStateUpdate(eventState);
    });
  }

  initSoundControls() {
    if (!this.soundToggleBtn) return;

    const updateBtnUI = (active) => {
      if (active) {
        this.soundToggleBtn.classList.add('active');
        if (this.soundBtnText) this.soundBtnText.textContent = 'Sound On';
      } else {
        this.soundToggleBtn.classList.remove('active');
        if (this.soundBtnText) this.soundBtnText.textContent = 'Sound Off';
      }
    };

    updateBtnUI(sound.isEnabled);

    this.soundToggleBtn.addEventListener('click', () => {
      const active = sound.toggleSound();
      updateBtnUI(active);
      showToast(active ? 'Atmospheric holiday audio enabled.' : 'Atmospheric audio muted.', 'info');
    });
  }

  initSantaFlight() {
    if (!this.santaSleigh) return;

    const triggerFlight = () => {
      this.santaSleigh.classList.remove('in-flight');
      void this.santaSleigh.offsetWidth; // Trigger reflow
      this.santaSleigh.classList.add('in-flight');

      // Schedule next flight after 38 - 50 seconds interval
      const nextDelay = Math.random() * 12000 + 38000;
      setTimeout(triggerFlight, nextDelay);
    };

    // First flight starts 5 seconds after page load
    setTimeout(triggerFlight, 5000);
  }

  updateHeaderUserStatus(user) {
    if (!this.headerUserSlot) return;

    if (!user) {
      this.headerUserSlot.innerHTML = '';
      return;
    }

    if (user.role === 'admin') {
      this.headerUserSlot.innerHTML = `
        <div class="user-badge" style="border-color: rgba(220, 38, 38, 0.5); color: #fca5a5;">
          <span>🛡</span> Admin Console
        </div>
      `;
    } else {
      this.headerUserSlot.innerHTML = `
        <div class="user-badge">
          <span>❄</span> ${user.name} (${user.participantNumber})
        </div>
      `;
    }
  }

  async renderView(user) {
    if (!this.mainContent) return;

    // View Routing: Admin -> Dashboard -> Landing
    if (user && user.role === 'admin') {
      await renderAdminPanel(this.mainContent, user);
    } else if (user && user.role === 'faculty') {
      await renderDashboard(this.mainContent, user);
    } else {
      this.renderLandingView();
    }
  }

  async renderLandingView() {
    const event = await databaseService.getEventState();
    const participants = await databaseService.getParticipants();
    const isRegistrationOpen = event.registrationOpen !== false;

    this.mainContent.innerHTML = `
      <section class="landing-section">
        <div class="hero-content-box">
          <div class="hero-greeting" style="letter-spacing: 4px; text-transform: uppercase; font-size: 0.95rem; color: var(--color-gold-champagne);">
            ST PAULS COLLEGE PRESENTS
          </div>
          <h1 class="hero-title" style="font-family: var(--font-display); font-size: clamp(2.4rem, 5vw + 1rem, 4.6rem); margin: 0.35rem 0; letter-spacing: 2px;">
            THE EVERGREEN EXPRESS
          </h1>
          <div style="font-family: var(--font-display); font-size: 1.35rem; color: var(--color-gold-light); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 1.25rem;">
            A SECRET CHRISTMAS JOURNEY
          </div>
          <p class="hero-subtitle" style="font-size: 1.2rem; font-style: italic; color: #ffffff; margin-bottom: 0.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.7);">
            "A Little Magic. A Special Someone. A Christmas to Remember."
          </p>
          <p style="font-size: 0.95rem; color: #cbd5e1; max-width: 620px; margin: 0 auto 1.75rem auto; line-height: 1.6;">
            Beyond the winter lights and falling snow, a special Christmas connection is waiting to be discovered.
          </p>

          <div class="hero-actions" style="display: flex; justify-content: center; gap: 1.25rem; flex-wrap: wrap;">
            <button id="btn-hero-login" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.85rem 2.5rem; letter-spacing: 1.5px; box-shadow: 0 0 25px rgba(212, 175, 55, 0.5);">
              LOGIN
            </button>
            <button id="btn-hero-register" class="btn btn-secondary" style="font-size: 1.1rem; padding: 0.85rem 2.5rem; letter-spacing: 1.5px;">
              REGISTER
            </button>
          </div>

          <div class="event-status-pill" style="margin-top: 2rem;">
            <span class="status-dot-pulse ${isRegistrationOpen ? '' : 'closed'}"></span>
            <span>
              Registration: <strong style="color: ${isRegistrationOpen ? '#22c55e' : '#f59e0b'};">${isRegistrationOpen ? 'OPEN' : 'CLOSED'}</strong>
              • ${participants.length} Faculty Members Joined
            </span>
          </div>

          <div style="margin-top: 3.5rem; font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(254, 240, 138, 0.7);">
            Spread Joy • Share Kindness • Make It Magical
          </div>
        </div>
      </section>
    `;

    // Attach Landing Button Listeners
    const loginBtn = document.getElementById('btn-hero-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => openAuthModal('login'));
    }

    const regBtn = document.getElementById('btn-hero-register');
    if (regBtn) {
      regBtn.addEventListener('click', () => {
        if (isRegistrationOpen) {
          openAuthModal('register');
        } else {
          showToast('Registration is closed. Please log in with your Participant ID.', 'info');
          openAuthModal('login');
        }
      });
    }
  }

  onEventStateUpdate(eventState) {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      // Re-render landing status badge
      const pill = document.querySelector('.event-status-pill');
      if (pill) {
        databaseService.getParticipants().then(p => {
          pill.innerHTML = `
            <span class="status-dot-pulse ${eventState.registrationOpen ? '' : 'closed'}"></span>
            <span>
              Registration: <strong style="color: ${eventState.registrationOpen ? '#22c55e' : '#f59e0b'};">${eventState.registrationOpen ? 'OPEN' : 'CLOSED'}</strong>
              • ${p.length} Faculty Members Joined
            </span>
          `;
        });
      }
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppCoordinator();
  app.init();
});
