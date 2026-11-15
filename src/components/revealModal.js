/* ==========================================================================
   THE EVERGREEN EXPRESS — COMPLETE CINEMATIC REVEAL SEQUENCE
   STAGE 1: Christmas Train Sequence (22s journey Left to Right)
   STAGE 2: Gift Box Revelation (Santa arrival, gift throw, 3D box opening)
   STAGE 3: Participant ID Revelation ("YOUR SECRET SANTA IS..." & Participant ID card)
   STAGE 4: Wax Seal Revelation (Sealed envelope with interactive "EE" wax seal)
   STAGE 5: Final Secret Santa Assignment Page (Recipient name, details, wishlist, Merry Christmas)
   ========================================================================== */

import confetti from 'canvas-confetti';
import { sound } from '../audio/soundManager.js';
import { databaseService } from '../services/databaseService.js';
import { trainJourney } from './trainJourney.js';

export async function openSecretSantaRevealModal(currentUserOrCallback, maybeCallback) {
  let currentUser = null;
  let onCompleteCallback = null;

  if (typeof currentUserOrCallback === 'function') {
    onCompleteCallback = currentUserOrCallback;
  } else if (currentUserOrCallback && typeof currentUserOrCallback === 'object') {
    currentUser = currentUserOrCallback;
    if (typeof maybeCallback === 'function') {
      onCompleteCallback = maybeCallback;
    }
  }

  let modalBackdrop = document.getElementById('reveal-modal-backdrop');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'reveal-modal-backdrop';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  const exitRevealCleanly = () => {
    sound.stopTrainChug();

    modalBackdrop.classList.remove('active');
    if (modalBackdrop.parentNode) {
      modalBackdrop.parentNode.removeChild(modalBackdrop);
    }
    document.body.style.overflow = '';
    // Clean up train journey overlay so the user never gets stranded
    trainJourney.closeJourney();
    if (onCompleteCallback) {
      onCompleteCallback();
    }
  };

  // 1. Resolve Assigned Recipient & Participant ID
  let recipientId = null;
  let preloadedRecipient = null;

  if (currentUser && currentUser.assignedRecipient) {
    const ar = currentUser.assignedRecipient;
    recipientId = ar.recipient_participant_id || ar.participantId || ar.recipientId;
    preloadedRecipient = {
      fullName: ar.recipient_name || ar.fullName || ar.name,
      participantId: recipientId,
      department: ar.recipient_department || ar.department || 'Faculty',
      giftPreference: ar.recipient_gift_preference || ar.giftPreference || 'Holiday surprise for a wonderful colleague!',
    };
  } else if (currentUser && (currentUser.recipientId || currentUser.assignedRecipientId)) {
    recipientId = currentUser.recipientId || currentUser.assignedRecipientId;
  }

  // Fallback to fetch Stage 1 participant ID if not already preloaded
  if (!recipientId) {
    try {
      const stage1Data = await databaseService.revealStage1RecipientId();
      if (stage1Data && stage1Data.recipientId) {
        recipientId = stage1Data.recipientId;
      }
    } catch (err) {
      console.warn('Assignment lookup notice:', err.message);
    }
  }

  if (!recipientId && currentUser) {
    recipientId = currentUser.recipientId || (currentUser.assignedRecipient && (currentUser.assignedRecipient.recipient_participant_id || currentUser.assignedRecipient.participantId)) || currentUser.participantId;
  }
  if (!recipientId) {
    recipientId = 'SS101';
  }

  // ==========================================================================
  // STAGE 3 — PARTICIPANT ID REVELATION
  // Appears immediately after the gift box opening finishes.
  // ==========================================================================
  const renderStage6 = () => {
    // Trigger celebratory stardust confetti & festive chime
    try {
      if (sound && typeof sound.playRevealChime === 'function') {
        sound.playRevealChime();
      }
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.45 },
        colors: ['#fef08a', '#eab308', '#22c55e', '#ef4444', '#ffffff']
      });
    } catch (e) {
      console.warn('Reveal effect notice:', e);
    }

    modalBackdrop.innerHTML = `
      <div class="modal-window reveal-modal-window participant-id-card-window" style="display: flex !important; flex-direction: column !important; align-items: center !important; text-align: center !important; max-width: 500px; width: 92vw; border: 2.5px solid var(--color-gold-champagne); background: radial-gradient(circle at top, rgba(22, 36, 71, 0.98), rgba(5, 10, 22, 0.99)); box-shadow: 0 0 55px rgba(212, 175, 55, 0.5), 0 20px 40px rgba(0,0,0,0.8); padding: 2.25rem 1.75rem; margin: auto; box-sizing: border-box; animation: modalWindowPop 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
        <div class="participant-id-subheading" style="width: 100% !important; display: block !important; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 3px; color: var(--color-gold-light); margin-bottom: 0.5rem; font-weight: 600; text-align: center;">
          ✨ The Evergreen Express • Secret Christmas Journey
        </div>
        
        <h2 class="participant-id-heading" style="width: 100% !important; display: block !important; font-family: var(--font-display); color: #ffffff; font-size: 2.1rem; margin: 0 0 1.15rem 0; text-shadow: 0 0 20px rgba(254, 240, 138, 0.7), 0 2px 4px rgba(0,0,0,0.8); letter-spacing: 1.5px; text-align: center; animation: glowPulse 2.5s ease-in-out infinite;">
          YOUR SECRET SANTA IS...
        </h2>

        <div class="participant-id-card-box" style="width: 100% !important; display: block !important; box-sizing: border-box !important; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(0, 0, 0, 0.65)); border: 2px dashed var(--color-gold-champagne); border-radius: 14px; padding: 1.75rem 1.25rem; margin: 0 0 1.5rem 0; box-shadow: 0 0 30px rgba(212, 175, 55, 0.25), inset 0 0 25px rgba(212, 175, 55, 0.15); position: relative; overflow: hidden; text-align: center; animation: idCardPop 0.6s cubic-bezier(0.16, 1, 0.3, 1);">
          <div class="participant-id-label" style="display: block !important; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-champagne); margin-bottom: 0.45rem; font-weight: 600; text-align: center;">
            Assigned Participant ID
          </div>
          <div class="participant-id-code-display" style="display: block !important; font-family: monospace; font-size: clamp(2.4rem, 8vw, 3.4rem); font-weight: 700; color: #ffffff; letter-spacing: clamp(3px, 1.5vw, 6px); text-shadow: 0 0 30px rgba(254, 240, 138, 1), 0 0 45px rgba(234, 179, 8, 0.85); margin: 0.4rem 0; line-height: 1.1; text-align: center;">
            ${recipientId}
          </div>
          <div class="participant-id-badge-confidential" style="display: inline-block !important; padding: 0.35rem 1rem; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(74, 222, 128, 0.5); border-radius: 20px; font-size: 11.5px; color: #86efac; margin: 0.35rem auto 0 auto; font-weight: 600; letter-spacing: 0.5px; text-align: center;">
            🔒 Confidential Station Assignment
          </div>
          <p class="participant-id-station-notice" style="display: block !important; font-size: 13px; color: #cbd5e1; margin: 0.85rem 0 0 0; line-height: 1.45; text-align: center;">
            Your official Christmas letter has arrived from Station Post!
          </p>
        </div>

        <button id="btn-proceed-stage7" class="btn btn-primary participant-id-proceed-btn" style="width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; font-size: 1.12rem; font-weight: 700; padding: 0.95rem 1.5rem; box-shadow: 0 0 30px rgba(212, 175, 55, 0.7); display: flex !important; align-items: center !important; justify-content: center !important; gap: 0.6rem; letter-spacing: 1px; cursor: pointer; border-radius: 10px; animation: pulseGlowBtn 2s infinite; position: static !important; margin: 0 !important;">
          <span>OPEN CHRISTMAS LETTER</span> ✉️
        </button>
        <div class="participant-id-footer-text" style="width: 100% !important; display: block !important; font-size: 11.5px; color: var(--color-snow-dark); margin-top: 0.75rem; letter-spacing: 0.5px; text-align: center;">
          Click to unseal and read your official Christmas assignment
        </div>
      </div>
    `;

    const proceedBtn = document.getElementById('btn-proceed-stage7');
    if (proceedBtn) {
      proceedBtn.onclick = () => {
        renderStage7();
      };
      proceedBtn.focus();
    }
  };

  // ==========================================================================
  // STAGE 4 — WAX SEAL REVELATION & STAGE 5 — FINAL ASSIGNMENT PAGE
  // ==========================================================================
  const renderStage7 = () => {
    // Eagerly prefetch Stage 2 recipient data as soon as Stage 7 is requested
    const stage2DataPromise = databaseService.revealStage2RecipientIdentity();

    modalBackdrop.innerHTML = `
      <div class="modal-window reveal-modal-window" style="max-width: 500px; width: 92vw; margin: auto; padding: 0; box-sizing: border-box; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; max-height: calc(100vh - 40px); animation: modalWindowPop 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
        <div class="envelope-wrapper" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
          
          <!-- STAGE 4: Interactive Christmas Sealed Envelope -->
          <div id="interactive-envelope" class="envelope-3d" style="width: 100%; max-width: 480px; min-height: 290px; background: linear-gradient(135deg, #78350f 0%, #451a03 100%); border: 2.5px solid var(--color-gold-champagne); border-radius: 14px; padding: 2.5rem 1.5rem; text-align: center; position: relative; box-shadow: 0 20px 45px rgba(0,0,0,0.65), 0 0 25px rgba(212, 175, 55, 0.25); cursor: pointer; box-sizing: border-box; overflow: hidden;">
            <!-- Authentic Envelope Triangular Flaps -->
            <svg style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.7;" preserveAspectRatio="none" viewBox="0 0 480 290">
              <path d="M0 0 L240 145 L480 0" stroke="rgba(212, 175, 55, 0.4)" stroke-width="2" fill="rgba(0,0,0,0.14)" />
              <path d="M0 290 L240 145 L480 290" stroke="rgba(212, 175, 55, 0.25)" stroke-width="1.5" fill="none" />
            </svg>
            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-champagne); margin-bottom: 1.5rem; pointer-events: none; user-select: none; position: relative; z-index: 2;">
              The Evergreen Express • Christmas Post
            </div>

            <button id="wax-seal-btn" class="wax-seal-button" type="button" aria-label="Break Wax Seal" title="Click to break the wax seal and open letter" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 92px; height: 92px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ef4444, #7f1d1d); border: 3px solid #fbbf24; cursor: pointer; box-shadow: 0 0 25px rgba(239, 68, 68, 0.6), inset 0 2px 4px rgba(255,255,255,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; touch-action: manipulation; z-index: 5;">
              <span style="font-family: var(--font-display); font-size: 1.55rem; font-weight: 700; color: #fef08a; pointer-events: none; user-select: none;">EE</span>
              <span id="wax-seal-subtext" style="font-size: 9.5px; text-transform: uppercase; color: #ffffff; letter-spacing: 1px; pointer-events: none; user-select: none;">Break Seal</span>
            </button>

            <div style="margin-top: 4.8rem; font-size: 12px; color: var(--color-ivory-warm); letter-spacing: 1px; pointer-events: none; user-select: none; position: relative; z-index: 2;">
              Click the wax seal to open your Christmas letter
            </div>
          </div>

          <!-- STAGE 5: Final Recipient Reveal Page: Balanced Rectangular Christmas Certificate Card -->
          <!-- Guaranteed breathing room on top & bottom with all 4 gold borders fully visible -->
          <div id="parchment-letter" class="parchment-letter-card" style="display: none; width: 100%; max-width: 480px; max-height: min(84vh, 620px); box-sizing: border-box; background: #fffdf5; color: #1e293b; border: 3px solid var(--color-gold-champagne); outline: 1px solid rgba(217, 119, 6, 0.35); outline-offset: -6px; border-radius: 14px; padding: 1.25rem 1.5rem; text-align: center; box-shadow: 0 20px 45px rgba(0,0,0,0.7), 0 0 30px rgba(212, 175, 55, 0.3); position: relative; overflow-y: auto;">
            <div style="font-size: 1.6rem; line-height: 1; margin-bottom: 0.15rem;">📜🎄</div>
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 2px; color: #b45309; font-weight: 600;">
              The Evergreen Express Official Assignment
            </div>

            <h2 style="font-family: var(--font-display); color: #881337; font-size: 1.45rem; margin: 0.35rem 0 0.65rem 0; font-weight: 700;">
              YOUR SECRET SANTA IS...
            </h2>

            <div style="background: rgba(180, 83, 9, 0.07); border: 2px solid #b45309; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
              <div id="recipient-full-name" style="font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; color: #7f1d1d; line-height: 1.2;">
                Loading...
              </div>
              <div id="recipient-details" style="font-size: 0.85rem; color: #475569; margin-top: 0.2rem;">
                Ticket #${recipientId}
              </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.65rem 0.9rem; text-align: left; margin-bottom: 0.75rem;">
              <strong style="color: #881337; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">🎁 Holiday Wishlist & Preferences:</strong>
              <div id="recipient-wishlist-text" style="font-size: 0.88rem; color: #1e293b; font-style: italic; line-height: 1.35; max-height: 3.8em; overflow-y: auto;">
                "Loading preferences..."
              </div>
            </div>

            <!-- Stage 8 Celebration Banner -->
            <div style="margin-bottom: 0.85rem;">
              <p style="font-family: var(--font-display); font-size: 0.95rem; color: #15803d; font-weight: 600; margin-bottom: 0.2rem;">
                Now it's your turn to make someone's Christmas magical!
              </p>
              <div style="font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: #b91c1c; letter-spacing: 2px;">
                MERRY CHRISTMAS!
              </div>
            </div>

            <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
              <button id="btn-view-dashboard" class="btn btn-primary" style="flex: 1; padding: 0.65rem 0.85rem; font-size: 0.92rem; font-weight: 600; box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);">
                Go Back to Dashboard ➔
              </button>
              <button id="btn-replay-reveal" class="btn btn-secondary" style="flex: 1; padding: 0.65rem 0.85rem; font-size: 0.92rem; font-weight: 600;">
                Replay the Christmas Journey 🔄
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const waxSealBtn = document.getElementById('wax-seal-btn');
    const envelope = document.getElementById('interactive-envelope');
    const parchment = document.getElementById('parchment-letter');
    const waxSubtext = document.getElementById('wax-seal-subtext');

    let isOpening = false;

    // Single unified handler guaranteed to trigger on the very first clean click or tap
    const handleBreakSeal = async (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (isOpening) return;
      isOpening = true;

      // Immediate visual & acoustic feedback on first tap/click
      sound.playSealCrack();
      if (waxSealBtn) {
        waxSealBtn.classList.add('wax-seal-breaking');
        waxSealBtn.style.pointerEvents = 'none';
        if (waxSubtext) waxSubtext.textContent = 'Breaking...';
      }

      try {
        // Wait for seal breaking animation and acoustic feedback (460ms) while Stage 2 DB call resolves
        const [stage2Data] = await Promise.all([
          stage2DataPromise.catch((err) => {
            console.warn('Stage 2 DB call fallback:', err.message);
            if (preloadedRecipient) return { success: true, recipient: preloadedRecipient };
            throw err;
          }),
          new Promise((resolve) => setTimeout(resolve, 460)),
        ]);

        const recipient = (stage2Data && stage2Data.recipient) || preloadedRecipient;
        if (!recipient) {
          throw new Error('Recipient identity details not available.');
        }

        if (currentUser) {
          currentUser.hasRevealedName = true;
          currentUser.assignedRecipient = recipient;
        }

        document.getElementById('recipient-full-name').textContent = recipient.fullName;
        document.getElementById('recipient-details').textContent = `${recipient.department || 'Faculty'} • Ticket #${recipient.participantId}`;
        document.getElementById('recipient-wishlist-text').textContent = `"${recipient.giftPreference || 'Holiday surprise for a wonderful colleague!'}"`;

        // Confetti explosion (Gold, Ruby, Emerald, Snow White)
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#fbbf24', '#dc2626', '#16a34a', '#ffffff', '#fde047'],
        });

        // Flip from envelope to parchment card
        envelope.style.display = 'none';
        parchment.style.display = 'block';

        // Play festive celebration sound
        setTimeout(() => {
          try {
            if (sound && typeof sound.playRevealChime === 'function') {
              sound.playRevealChime();
            }
          } catch (e) {
            console.warn('Reveal chime notice:', e);
          }
        }, 200);

        // Stage 8 Button Handlers: Go Back to Dashboard cleans up modal & overlay completely
        const backDashboardBtn = document.getElementById('btn-view-dashboard');
        if (backDashboardBtn) {
          backDashboardBtn.onclick = exitRevealCleanly;
        }

        const replayBtn = document.getElementById('btn-replay-reveal');
        if (replayBtn) {
          replayBtn.onclick = () => {
            exitRevealCleanly();
            trainJourney.replayFullJourney();
          };
        }

      } catch (err) {
        console.error('Wax seal break error:', err);
        if (preloadedRecipient) {
          // Graceful fallback for offline / replay mode
          const recipient = preloadedRecipient;
          if (currentUser) {
            currentUser.hasRevealedName = true;
            currentUser.assignedRecipient = recipient;
          }
          document.getElementById('recipient-full-name').textContent = recipient.fullName;
          document.getElementById('recipient-details').textContent = `${recipient.department || 'Faculty'} • Ticket #${recipient.participantId}`;
          document.getElementById('recipient-wishlist-text').textContent = `"${recipient.giftPreference || 'Holiday surprise for a wonderful colleague!'}"`;
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.55 },
            colors: ['#fbbf24', '#dc2626', '#16a34a', '#ffffff', '#fde047'],
          });
          envelope.style.display = 'none';
          parchment.style.display = 'block';
          const backDashboardBtn = document.getElementById('btn-view-dashboard');
          if (backDashboardBtn) backDashboardBtn.onclick = exitRevealCleanly;
          const replayBtn = document.getElementById('btn-replay-reveal');
          if (replayBtn) {
            replayBtn.onclick = () => {
              exitRevealCleanly();
              trainJourney.replayFullJourney();
            };
          }
          return;
        }

        alert(`Could not open letter: ${err.message}`);
        isOpening = false;
        if (waxSealBtn) {
          waxSealBtn.classList.remove('wax-seal-breaking');
          waxSealBtn.style.pointerEvents = 'auto';
          if (waxSubtext) waxSubtext.textContent = 'Break Seal';
        }
      }
    };

    // Attach to both the wax seal button and the envelope container for seamless, forgiving click targets
    if (waxSealBtn) {
      waxSealBtn.addEventListener('click', handleBreakSeal);
      waxSealBtn.addEventListener('touchend', handleBreakSeal, { passive: false });
    }
    if (envelope) {
      envelope.addEventListener('click', handleBreakSeal);
    }
  };

  // Start with STAGE 3: Participant ID Revelation immediately after gift opens
  renderStage6();
}
