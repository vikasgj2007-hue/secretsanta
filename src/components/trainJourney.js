/* ==========================================================================
   THE EVERGREEN EXPRESS — COMPLETE CINEMATIC TRAIN & SANTA ARRIVAL CONTROLLER
   Stage 1: Golden First-Class Passenger Ticket ("BOARD THE EXPRESS")
   Stage 2: Realistic Victorian Steam Train Journey (Synchronised 22s LEFT -> RIGHT)
   Stage 3: Progress Indicator Reaches 100% Exactly as Train Stops at Center
   Stage 4: Santa Claus Flying Arrival with Reindeer Sleigh in the Night Sky
   Stage 5: Santa Lands, Steps Down, Walks Forward with Velvet Gift Sack
   Stage 6: Santa Throws the Gift as Spoken "Merry Christmas" Greeting Plays
   Stage 7: 3D Magical Gift Box Arrives in Center & Opens with Golden Stardust
   Stage 8: Smooth Transition to Existing Two-Stage Secret Santa Reveal
   ========================================================================== */

import confetti from 'canvas-confetti';
import { sound } from '../audio/soundManager.js';
import { databaseService } from '../services/databaseService.js';
import { openSecretSantaRevealModal } from './revealModal.js';

class TrainJourneyController {
  constructor() {
    this.overlay = null;
    this.movementContainer = null;
    this.smokeEmitter = null;
    this.smokeInterval = null;
    this.progressFill = null;
    this.waypointLabel = null;
    this.isJourneyRunning = false;
    this.animationId = null;

    // Strict Audio Preservation: Exactly TWO Original Audio Files
    this.trainMusic = null;  // "/audio/christmas-train-music.mp3" (~22s)
    this.santaAudio = null;  // "/audio/santa-arrival.mp3" (~11s, arrival + greeting)
    this.isMusicMuted = localStorage.getItem('train_music_muted') === 'true';

    this.musicToggleBtn = null;
    this.musicIcon = null;
    this.musicLabel = null;

    // Santa & Gift Cinematic Elements
    this.santaStage = null;
    this.santaFlyingSleigh = null;
    this.santaGroundActor = null;
    this.santaFigure = null;
    this.thrownGiftActor = null;
    this.magicalGiftStage = null;
    this.giftLidFloating = null;
    this.giftBurstAura = null;

    // Timeout tracker for sequence cleanup
    this.cinematicTimeouts = [];
  }

  init() {
    this.overlay = document.getElementById('train-journey-overlay');
    this.movementContainer = document.getElementById('train-movement-container');
    this.smokeEmitter = document.getElementById('chimney-smoke-emitter');
    this.progressFill = document.getElementById('journey-progress-fill');
    this.waypointLabel = document.getElementById('journey-waypoint-label');

    // Santa & Gift Stage DOM Elements
    this.santaStage = document.getElementById('santa-cinematic-stage');
    this.santaFlyingSleigh = document.getElementById('santa-flying-sleigh');
    this.santaGroundActor = document.getElementById('santa-ground-actor');
    this.santaFigure = document.getElementById('santa-figure');
    this.thrownGiftActor = document.getElementById('thrown-gift-actor');
    this.magicalGiftStage = document.getElementById('magical-gift-stage');
    this.giftLidFloating = document.getElementById('gift-lid-floating');
    this.giftBurstAura = document.getElementById('gift-star-burst-aura');

    const exitBtn = document.getElementById('btn-exit-journey');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => this.closeJourney());
    }

    this.initAudio();
  }

  initAudio() {
    // 1. Audio File 1 — Christmas Train Music (~22s)
    if (!this.trainMusic) {
      this.trainMusic = new Audio('/audio/christmas-train-music.mp3');
      this.trainMusic.preload = 'auto';
      this.trainMusic.loop = false;
      this.trainMusic.volume = 0;
      this.trainMusic.muted = this.isMusicMuted;

      this.trainMusic.addEventListener('error', (e) => {
        console.warn('Christmas train music notice: Audio playback unavailable or prevented.', e);
      });
    }

    // 2. Audio File 2 — Santa Arrival (~11s, contains arrival audio + "Wishing you a Merry Christmas!" greeting)
    if (!this.santaAudio) {
      this.santaAudio = new Audio('/audio/santa-arrival.mp3');
      this.santaAudio.preload = 'auto';
      this.santaAudio.loop = false;
      this.santaAudio.volume = 0.85;
      this.santaAudio.muted = this.isMusicMuted;

      this.santaAudio.addEventListener('error', (e) => {
        console.warn('Santa arrival audio notice: Audio playback unavailable or prevented.', e);
      });
    }

    // Accessible Mute/Unmute Control
    this.musicToggleBtn = document.getElementById('btn-train-music-toggle');
    this.musicIcon = document.getElementById('train-music-icon');
    this.musicLabel = document.getElementById('train-music-label');

    if (this.musicToggleBtn) {
      this.musicToggleBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleMusicMute();
      };
      this.updateMusicUI();
    }
  }

  toggleMusicMute() {
    this.isMusicMuted = !this.isMusicMuted;
    localStorage.setItem('train_music_muted', this.isMusicMuted ? 'true' : 'false');

    if (this.trainMusic) this.trainMusic.muted = this.isMusicMuted;
    if (this.santaAudio) this.santaAudio.muted = this.isMusicMuted;

    this.updateMusicUI();
  }

  updateMusicUI() {
    if (!this.musicToggleBtn) return;
    if (this.isMusicMuted) {
      this.musicToggleBtn.classList.add('muted');
      if (this.musicIcon) this.musicIcon.textContent = '🔇';
      if (this.musicLabel) this.musicLabel.textContent = 'Music Off';
      this.musicToggleBtn.title = 'Unmute Audio Experience';
    } else {
      this.musicToggleBtn.classList.remove('muted');
      if (this.musicIcon) this.musicIcon.textContent = '🔊';
      if (this.musicLabel) this.musicLabel.textContent = 'Music On';
      this.musicToggleBtn.title = 'Mute Audio Experience';
    }
  }

  startTrainMusic() {
    this.stopAllAudio();
    if (this.trainMusic) {
      this.trainMusic.currentTime = 0;
      this.trainMusic.volume = 0; // Starts at 0 for smooth 2s volume fade in
      this.trainMusic.muted = this.isMusicMuted;
      this.updateMusicUI();

      const p = this.trainMusic.play();
      if (p !== undefined) {
        p.catch((err) => console.warn('Train audio autoplay notice:', err.message));
      }
    }
  }

  startSantaAudio() {
    if (this.trainMusic) {
      this.trainMusic.pause();
      this.trainMusic.currentTime = 0;
    }
    if (this.santaAudio) {
      this.santaAudio.currentTime = 0;
      this.santaAudio.volume = 0.85;
      this.santaAudio.muted = this.isMusicMuted;

      const p = this.santaAudio.play();
      if (p !== undefined) {
        p.catch((err) => console.warn('Santa audio autoplay notice:', err.message));
      }
    }
  }

  stopAllAudio() {
    if (this.trainMusic) {
      this.trainMusic.pause();
      this.trainMusic.currentTime = 0;
      this.trainMusic.volume = 0;
    }
    if (this.santaAudio) {
      this.santaAudio.pause();
      this.santaAudio.currentTime = 0;
    }
  }

  async startJourney(currentUser, onRevealComplete) {
    if (this.isJourneyRunning) return;

    this.currentUser = currentUser;
    this.onRevealCompleteCallback = onRevealComplete;

    // Verify event is active
    const event = await databaseService.getEventState();
    if (event.status !== 'ACTIVE') {
      throw new Error('The Secret Santa event has not been started by the Admin yet.');
    }

    if (!this.overlay) this.init();

    // Show Golden Ticket Boarding Pass Modal (Stage 1)
    this.showGoldenTicketModal(currentUser);
  }

  replayFullJourney() {
    this.closeJourney();
    if (this.currentUser) {
      setTimeout(() => {
        this.startTrainMusic();
        this.embarkTrainJourney(this.currentUser);
      }, 300);
    }
  }

  showGoldenTicketModal(currentUser) {
    let ticketModal = document.getElementById('golden-ticket-modal');
    if (!ticketModal) {
      ticketModal = document.createElement('div');
      ticketModal.id = 'golden-ticket-modal';
      ticketModal.className = 'modal-backdrop active';
      document.body.appendChild(ticketModal);
    }

    ticketModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    ticketModal.innerHTML = `
      <div class="modal-window" style="max-width: 580px; text-align: center; border: 3px solid var(--color-gold-champagne); background: radial-gradient(circle at top, #1e293b, #0f172a); box-shadow: 0 0 50px rgba(212, 175, 55, 0.4); padding: 2.5rem 1.75rem;">
        <div class="college-modal-brand-banner">
          <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
        </div>

        <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 3px; color: var(--color-gold-champagne); margin-bottom: 0.25rem;">
          First Class Passenger Ticket
        </div>

        <h2 style="font-family: var(--font-display); font-size: 2.2rem; color: #fef08a; margin: 0.25rem 0 1rem 0; letter-spacing: 1px;">
          THE EVERGREEN EXPRESS
        </h2>

        <!-- Golden Ticket Pass Card -->
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(0, 0, 0, 0.5)); border: 2px dashed #fde047; border-radius: 12px; padding: 1.5rem; margin: 1.25rem 0; text-align: left; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(253, 224, 71, 0.3); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; color: #fef08a;">Passenger Name</div>
              <div style="font-size: 1.15rem; font-weight: 700; color: #ffffff;">${currentUser.fullName || currentUser.name}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; text-transform: uppercase; color: #fef08a;">Ticket Number</div>
              <div style="font-family: monospace; font-size: 1.3rem; font-weight: 700; color: #fde047; letter-spacing: 2px;">
                ${currentUser.participantId || currentUser.participantNumber}
              </div>
            </div>
          </div>

          <div class="ticket-route-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; font-size: 12px; color: #cbd5e1;">
            <div><strong>Route:</strong> ST PAULS COLLEGE → North Pole</div>
            <div><strong>Carriage:</strong> Royal Pullman Special</div>
            <div><strong>Destination:</strong> Secret Christmas Friend</div>
            <div><strong>Status:</strong> Valid for Boarding</div>
          </div>
        </div>

        <div class="ticket-action-buttons" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem;">
          <button id="btn-cancel-ticket" class="btn btn-secondary" style="padding: 0.75rem 1.5rem; flex: 1; min-width: 120px;">
            Cancel
          </button>
          <button id="btn-board-express" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.75rem 2rem; box-shadow: 0 0 25px rgba(254, 240, 138, 0.6); flex: 2; min-width: 200px;">
            ENTER 🚂
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-cancel-ticket').onclick = () => {
      ticketModal.classList.remove('active');
      document.body.style.overflow = '';

    // Restore background canvas rendering
    if (window.__evergreenSnowEngine?.resume) window.__evergreenSnowEngine.resume();
    if (window.__evergreenStarsEngine?.resume) window.__evergreenStarsEngine.resume();
    };

    document.getElementById('btn-board-express').onclick = () => {
      ticketModal.classList.remove('active');
      // Start Christmas Music directly on user click gesture (satisfies browser autoplay policy)
      this.startTrainMusic();
      this.embarkTrainJourney(currentUser);
    };
  }

  embarkTrainJourney(currentUser) {
    this.isJourneyRunning = true;
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Conserve 100% of GPU & CPU for cinematic train & Santa experience
    if (window.__evergreenSnowEngine?.pause) window.__evergreenSnowEngine.pause();
    if (window.__evergreenStarsEngine?.pause) window.__evergreenStarsEngine.pause();

    // Clean any prior Santa or gift state
    this.cleanupCinematicStages();

    // Start train sound synthesis effects
    sound.ensureContext();
    sound.playTrainWhistle();
    sound.startTrainChug();

    // Eagerly prefetch recipient assignment in background during 33-second train & Santa journey
    // Guarantees zero latency and instantaneous reveal when Santa's gift opens
    this.prefetchedRecipientId = null;
    this.prefetchedRecipient = null;
    if (currentUser && currentUser.assignedRecipient) {
      const ar = currentUser.assignedRecipient;
      this.prefetchedRecipientId = ar.recipient_participant_id || ar.participantId || ar.recipientId;
      this.prefetchedRecipient = ar;
    } else if (currentUser) {
      databaseService.revealStage1RecipientId().then((s1) => {
        if (s1 && s1.recipientId) {
          this.prefetchedRecipientId = s1.recipientId;
          currentUser.recipientId = s1.recipientId;
        }
      }).catch((e) => console.warn('Background stage 1 prefetch notice:', e.message));

      databaseService.revealStage2RecipientIdentity().then((s2) => {
        if (s2 && s2.recipient) {
          this.prefetchedRecipient = s2.recipient;
          currentUser.assignedRecipient = s2.recipient;
        }
      }).catch((e) => console.warn('Background stage 2 prefetch notice:', e.message));
    }

    // Start chimney smoke particle emitter
    this.startSmokePuffs();

    // Add rolling class for wheels and connecting rods
    const visual = document.querySelector('.train-visual');
    if (visual) visual.classList.add('train-rolling');

    // EXACTLY 22 SECONDS (22000ms) matching original christmas-train-music.mp3
    const totalDuration = 22000;
    const startTime = performance.now();

    // Reset progress indicator immediately
    if (this.progressFill) {
      this.progressFill.style.transition = 'none';
      this.progressFill.style.width = '0%';
    }

    const stageDep = document.querySelector('.stage-departure');
    const stageViaduct = document.querySelector('.stage-viaduct');
    const stageArrival = document.querySelector('.stage-arrival');

    stageDep.classList.add('active');
    stageViaduct.classList.remove('active');
    stageArrival.classList.remove('active');

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      // Smooth Music Volume Dynamics:
      // 1. Fade in smoothly over first 2 seconds (0s - 2s: 0 to 2000ms)
      // 2. Play throughout 22-second train journey at comfortable background level (0.35)
      // 3. Fade out smoothly during final 3 seconds (19s - 22s: 19000ms - 22000ms)
      const TARGET_VOLUME = 0.35;
      if (this.trainMusic && !this.isMusicMuted) {
        let currentVol = TARGET_VOLUME;
        if (elapsed < 2000) {
          currentVol = TARGET_VOLUME * (elapsed / 2000);
        } else if (elapsed > 19000) {
          const fadeOutElapsed = Math.min(3000, elapsed - 19000);
          currentVol = Math.max(0, TARGET_VOLUME * (1 - fadeOutElapsed / 3000));
        }
        this.trainMusic.volume = Math.max(0, Math.min(1, currentVol));
      }

      // Train Movement: Strictly Monotonic LEFT -> RIGHT
      // Unscaled realistic train length: 4 coaches (960px) + tender (175px) + loco (360px) + couplers (~60px) = 1555px
      const screenWidth = window.innerWidth;
      let trainScale = 0.85;
      if (screenWidth <= 360) {
        trainScale = 0.32;
      } else if (screenWidth <= 480) {
        trainScale = 0.40;
      } else if (screenWidth <= 768) {
        trainScale = 0.55;
      } else if (screenWidth <= 1024) {
        trainScale = 0.70;
      } else if (screenWidth >= 1600) {
        trainScale = 1.0;
      }

      const scaledTrainWidth = 1555 * trainScale;
      const startX = -(scaledTrainWidth + 100);
      // Train stops gracefully at the center of the scene at 22 seconds
      const targetArrivalX = (screenWidth >= scaledTrainWidth + 40)
        ? (screenWidth - scaledTrainWidth) / 2
        : (screenWidth - scaledTrainWidth - 15);
      const totalTravelDistance = targetArrivalX - startX;

      // Pure monotonic smooth easing curve:
      // Enters naturally from outside the screen, cruises smoothly, gradually slows down, and stops at center
      // Monotonic cubic curve: f(p) = 1.5 * p - 0.5 * p^3 guarantees f'(p) >= 0 everywhere on [0, 1]
      // Absolutely ZERO backward movement, ZERO bounce, and stops exactly ONCE at center at 22 seconds!
      const easeProgress = 1.5 * progress - 0.5 * Math.pow(progress, 3);
      let currentX = startX + totalTravelDistance * easeProgress;

      if (progress >= 1) {
        currentX = targetArrivalX;
      }

      // Synchronize progress bar directly to the train's actual physical movement:
      // Starts with train at 0%, reaches 100% at exactly 22 seconds as train halts.
      const physicalProgress = Math.min(1, Math.max(0, (currentX - startX) / totalTravelDistance));
      if (this.progressFill) {
        this.progressFill.style.width = `${(physicalProgress * 100).toFixed(2)}%`;
      }

      // Parallax Scenery Transitions & Waypoints across 22 seconds
      if (progress < 0.33) {
        if (this.waypointLabel) this.waypointLabel.textContent = 'Departing: Faculty Quad Central Station';
        stageDep.classList.add('active');
        stageViaduct.classList.remove('active');
        stageArrival.classList.remove('active');
      } else if (progress < 0.70) {
        if (this.waypointLabel) this.waypointLabel.textContent = 'Crossing: Alpine Viaduct & Aurora Ridge';
        stageDep.classList.remove('active');
        stageViaduct.classList.add('active');
        stageArrival.classList.remove('active');
      } else {
        if (this.waypointLabel) this.waypointLabel.textContent = 'Arriving: North Pole Faculty Winter Pavilion';
        stageDep.classList.remove('active');
        stageViaduct.classList.remove('active');
        stageArrival.classList.add('active');
      }

      if (this.movementContainer) {
        this.movementContainer.style.transform = `translate3d(${currentX}px, 0, 0)`;
      }

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        // Progress reaches exactly 100% and stays completed
        if (this.progressFill) {
          this.progressFill.style.width = '100%';
        }
        this.onTrainArrivalComplete(currentUser);
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  startSmokePuffs() {
    this.stopSmokePuffs();
    if (!this.smokeEmitter) return;

    this.smokeInterval = setInterval(() => {
      const puff = document.createElement('div');
      puff.className = 'smoke-puff';
      this.smokeEmitter.appendChild(puff);

      setTimeout(() => {
        if (puff.parentNode) puff.parentNode.removeChild(puff);
      }, 2600);
    }, 240);
  }

  stopSmokePuffs() {
    if (this.smokeInterval) {
      clearInterval(this.smokeInterval);
      this.smokeInterval = null;
    }
  }

  onTrainArrivalComplete(currentUser) {
    // 1. Train has finished its 22-second journey and stopped gracefully at center
    if (this.trainMusic) {
      this.trainMusic.pause();
      this.trainMusic.currentTime = 0;
    }
    sound.stopTrainChug();
    sound.playSteamHiss();

    const visual = document.querySelector('.train-visual');
    if (visual) visual.classList.remove('train-rolling');

    // Progress bar MUST remain at 100% and NOT run during Santa's sequence
    if (this.progressFill) {
      this.progressFill.style.width = '100%';
    }

    if (this.waypointLabel) {
      this.waypointLabel.textContent = 'North Pole Terminal Reached! ✨ Look to the Skies...';
    }

    this.stopSmokePuffs();

    // 2. Keep train visible briefly (800ms) to complete the arrival moment,
    // then make the entire train disappear smoothly with a cinematic fade-exit!
    this.scheduleTimeout(() => {
      if (this.movementContainer) {
        this.movementContainer.classList.add('train-fade-exit');
      }
      const trackBed = document.querySelector('.railway-track-bed');
      if (trackBed) {
        trackBed.classList.add('train-fade-exit');
      }

      // 3. After 1400ms smooth fade-out, completely remove locomotive and coaches from the visible scene
      this.scheduleTimeout(() => {
        if (this.movementContainer) {
          this.movementContainer.style.display = 'none';
        }

        // 4. Start Santa Claus Arrival with Original 11-second Audio in clear snowy clearing
        this.startSantaCinematicSequence(currentUser);
      }, 1400);

    }, 800);
  }

  // ==========================================================================
  // SANTA CLAUS FLYING ARRIVAL, LANDING, WALKING & GIFT THROWING SEQUENCE
  // Synchronised with "santa-arrival.mp3" (~11 seconds)
  // ==========================================================================
  startSantaCinematicSequence(currentUser) {
    // 1. Start Audio File 2: "santa-arrival.mp3" from the beginning
    this.startSantaAudio();

    if (!this.santaStage) this.init();

    if (this.santaStage) {
      this.santaStage.classList.add('active');
    }

    // Phase 1 (0.0s - 4.5s): Sleigh Flying across the night sky
    if (this.santaFlyingSleigh) {
      this.santaFlyingSleigh.classList.remove('flying');
      // Trigger reflow to guarantee fresh CSS animation
      void this.santaFlyingSleigh.offsetWidth;
      this.santaFlyingSleigh.classList.add('flying');
    }
    if (this.waypointLabel) {
      this.waypointLabel.textContent = '🎅 Santa Claus and his Reindeer are soaring through the Aurora!';
    }

    // Phase 2 (4.5s - 6.5s): Sleigh Lands gracefully in the snow & Santa steps down naturally
    this.scheduleTimeout(() => {
      if (this.santaFlyingSleigh) {
        this.santaFlyingSleigh.style.opacity = '0';
      }
      if (this.santaGroundActor) {
        this.santaGroundActor.classList.add('active');
      }
      if (this.santaFigure) {
        this.santaFigure.classList.add('stepping-down');
      }
      if (this.waypointLabel) {
        this.waypointLabel.textContent = '🌟 Santa steps down from his sleigh onto the winter snow!';
      }
    }, 4500);

    // Phase 3 (6.5s - 8.5s): Santa walks forward naturally with weight transfer and gift sack
    this.scheduleTimeout(() => {
      if (this.santaFigure) {
        this.santaFigure.classList.remove('stepping-down');
        this.santaFigure.classList.add('walking');
      }
      if (this.waypointLabel) {
        this.waypointLabel.textContent = '🎁 Santa approaches with his magical Christmas sack...';
      }
    }, 6500);

    // Phase 4 (8.5s - 10.5s): Santa throws the gift towards the audience!
    // Spoken greeting in audio plays: "Wishing you a Merry Christmas!"
    this.scheduleTimeout(() => {
      if (this.santaFigure) {
        this.santaFigure.classList.remove('walking');
        this.santaFigure.classList.add('throwing');
      }
      if (this.thrownGiftActor) {
        this.thrownGiftActor.classList.add('in-flight');
      }
      if (this.waypointLabel) {
        this.waypointLabel.textContent = '🎄 "Wishing you a Merry Christmas!" — A gift takes flight!';
      }
    }, 8500);

    // Phase 5 (10.5s - 12.0s): Gift settles in center screen and magically opens
    // Audio finishes naturally without being cut off
    this.scheduleTimeout(() => {
      if (this.thrownGiftActor) {
        this.thrownGiftActor.style.opacity = '0';
      }
      if (this.magicalGiftStage) {
        this.magicalGiftStage.classList.add('active');
      }

      // Golden ribbon unties & lid floats upward
      this.scheduleTimeout(() => {
        if (this.giftLidFloating) {
          this.giftLidFloating.classList.add('open-lid');
        }
        if (this.giftBurstAura) {
          this.giftBurstAura.classList.add('burst');
        }

        // Festive celebration chime & sparkling stardust
        try {
          if (sound && typeof sound.playRevealChime === 'function') {
            sound.playRevealChime();
          }
        } catch (e) {
          console.warn('Reveal chime notice:', e);
        }

        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#fef08a', '#eab308', '#dc2626', '#047857', '#ffffff']
          });
        } catch (e) {
          console.warn('Confetti notice:', e);
        }

        // Phase 6: Smoothly Transition into the Existing Two-Stage Secret Santa Reveal
        this.scheduleTimeout(() => {
          this.launchExistingSecretSantaReveal(currentUser);
        }, 1200);

      }, 600);

    }, 10800);
  }

  launchExistingSecretSantaReveal(currentUser) {
    if (this.isRevealing) return;
    this.isRevealing = true;

    // Fade out magical gift stage, Santa actor and sleigh cleanly
    if (this.magicalGiftStage) {
      this.magicalGiftStage.classList.remove('active');
    }
    if (this.santaStage) {
      this.santaStage.classList.remove('active');
    }
    if (this.santaGroundActor) {
      this.santaGroundActor.classList.remove('active');
    }
    if (this.santaFigure) {
      this.santaFigure.classList.remove('stepping-down', 'walking', 'throwing');
    }
    if (this.thrownGiftActor) {
      this.thrownGiftActor.classList.remove('in-flight');
      this.thrownGiftActor.style.opacity = '0';
    }

    const assignedRecipient = this.prefetchedRecipient || (currentUser && currentUser.assignedRecipient) || null;
    const hasRevealedName = Boolean(
      (currentUser && (currentUser.hasRevealedName || currentUser.hasRevealed)) ||
      (assignedRecipient && (assignedRecipient.recipient_name || assignedRecipient.fullName))
    );

    currentUser = {
      ...currentUser,
      hasRevealedName,
      recipientId: this.prefetchedRecipientId || (currentUser && currentUser.recipientId),
      assignedRecipient,
    };

    openSecretSantaRevealModal(currentUser, () => {
      this.isRevealing = false;
      if (typeof this.onRevealCompleteCallback === 'function') {
        this.onRevealCompleteCallback();
      }
    });
  }

  scheduleTimeout(fn, delay) {
    const id = setTimeout(fn, delay);
    this.cinematicTimeouts.push(id);
    return id;
  }

  cleanupCinematicStages() {
    this.cinematicTimeouts.forEach(clearTimeout);
    this.cinematicTimeouts = [];

    if (this.movementContainer) {
      this.movementContainer.classList.remove('train-fade-exit');
      this.movementContainer.style.display = '';
      this.movementContainer.style.opacity = '';
    }
    const trackBed = document.querySelector('.railway-track-bed');
    if (trackBed) {
      trackBed.classList.remove('train-fade-exit');
      trackBed.style.opacity = '';
    }
    const visual = document.querySelector('.train-visual');
    if (visual) {
      visual.classList.remove('train-fade-exit', 'train-rolling');
      visual.style.opacity = '';
    }

    if (this.santaStage) {
      this.santaStage.classList.remove('active');
    }
    if (this.santaFlyingSleigh) {
      this.santaFlyingSleigh.classList.remove('flying');
      this.santaFlyingSleigh.style.opacity = '';
    }
    if (this.santaGroundActor) {
      this.santaGroundActor.classList.remove('active');
    }
    if (this.santaFigure) {
      this.santaFigure.classList.remove('stepping-down', 'walking', 'throwing');
    }
    if (this.thrownGiftActor) {
      this.thrownGiftActor.classList.remove('in-flight');
      this.thrownGiftActor.style.opacity = '';
    }
    if (this.magicalGiftStage) {
      this.magicalGiftStage.classList.remove('active');
    }
    if (this.giftLidFloating) {
      this.giftLidFloating.classList.remove('open-lid');
    }
    if (this.giftBurstAura) {
      this.giftBurstAura.classList.remove('burst');
    }
  }

  closeJourney() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.stopSmokePuffs();
    sound.stopTrainChug();
    this.stopAllAudio();
    this.cleanupCinematicStages();
    this.isJourneyRunning = false;
    this.isRevealing = false;

    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
    if (this.progressFill) {
      this.progressFill.style.width = '0%';
    }
    document.body.style.overflow = '';

    // Restore background canvas rendering
    if (window.__evergreenSnowEngine?.resume) window.__evergreenSnowEngine.resume();
    if (window.__evergreenStarsEngine?.resume) window.__evergreenStarsEngine.resume();
  }
}

export const trainJourney = new TrainJourneyController();
