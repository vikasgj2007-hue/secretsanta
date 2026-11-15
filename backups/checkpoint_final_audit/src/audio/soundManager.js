/* ==========================================================================
   WEB AUDIO API SOUND & ATMOSPHERIC SYNTHESIZER
   Subtle, optional, zero external file dependencies
   ========================================================================== */

export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = localStorage.getItem('santa_sound_enabled') === 'true';
    this.isMuted = !this.isEnabled;
    this.chimeTimer = null;
    this.chugTimer = null;
    this.masterGain = null;

    // Harmonious Christmas pentatonic notes in Hz (Silent Night / Carol bells)
    this.bellNotes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isEnabled ? 0.25 : 0, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.ensureContext();
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('santa_sound_enabled', this.isEnabled ? 'true' : 'false');

    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.25 : 0, this.audioCtx.currentTime, 0.1);
    }

    if (this.isEnabled) {
      this.startAtmosphericChimes();
      this.playChime(659.25, 0.8);
    } else {
      this.stopAtmosphericChimes();
    }

    return this.isEnabled;
  }

  startAtmosphericChimes() {
    if (!this.isEnabled) return;
    this.stopAtmosphericChimes();

    const playRandomChime = () => {
      if (!this.isEnabled) return;
      const note = this.bellNotes[Math.floor(Math.random() * this.bellNotes.length)];
      this.playChime(note, 2.5);
      
      const nextDelay = Math.random() * 3500 + 2500;
      this.chimeTimer = setTimeout(playRandomChime, nextDelay);
    };

    this.chimeTimer = setTimeout(playRandomChime, 1000);
  }

  stopAtmosphericChimes() {
    if (this.chimeTimer) {
      clearTimeout(this.chimeTimer);
      this.chimeTimer = null;
    }
  }

  // Play a gentle music box / celesta chime
  playChime(freq, duration = 2.0) {
    if (!this.isEnabled || !this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.audioCtx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio error ignored safely
    }
  }

  // Train Whistle ("Chhoooo-chhoooo!")
  playTrainWhistle() {
    if (!this.isEnabled || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      const frequencies = [440, 554.37, 659.25]; // Warm harmonic triad

      frequencies.forEach((f) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        // Subtle whistle pitch inflection
        osc.frequency.linearRampToValueAtTime(f * 1.03, now + 0.4);
        osc.frequency.linearRampToValueAtTime(f, now + 1.2);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
        gain.gain.setValueAtTime(0.07, now + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 1.4);
      });

      // Second burst after a short breath
      setTimeout(() => {
        if (!this.isEnabled || !this.audioCtx) return;
        const now2 = this.audioCtx.currentTime;
        frequencies.forEach((f) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now2);
          osc.frequency.linearRampToValueAtTime(f * 1.02, now2 + 0.5);

          gain.gain.setValueAtTime(0, now2);
          gain.gain.linearRampToValueAtTime(0.09, now2 + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now2 + 1.8);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.start(now2);
          osc.stop(now2 + 1.8);
        });
      }, 700);
    } catch (e) {
      // ignore
    }
  }

  // Steam locomotive rhythmic chuffing
  startTrainChug() {
    if (!this.isEnabled || !this.audioCtx) return;
    this.stopTrainChug();

    let tempo = 380;
    const playChug = () => {
      if (!this.isEnabled || !this.audioCtx) return;
      this.playChugSound();
      this.chugTimer = setTimeout(playChug, tempo);
    };
    this.chugTimer = setTimeout(playChug, 200);
  }

  stopTrainChug() {
    if (this.chugTimer) {
      clearTimeout(this.chugTimer);
      this.chugTimer = null;
    }
  }

  playChugSound() {
    try {
      if (!this.audioCtx || !this.isEnabled) return;
      const bufferSize = this.audioCtx.sampleRate * 0.08;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
    } catch (e) {
      // ignore
    }
  }

  // Steam pressure hiss on arrival
  playSteamHiss() {
    if (!this.audioCtx || !this.isEnabled) return;
    try {
      const bufferSize = this.audioCtx.sampleRate * 1.5;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
    } catch (e) {
      // ignore
    }
  }

  // Wax seal break sound
  playSealCrack() {
    if (!this.audioCtx || !this.isEnabled) return;
    this.playChime(783.99, 1.2);
    setTimeout(() => this.playChime(1046.50, 1.8), 120);
  }

  // Festive Christmas reveal celesta chime triad
  playRevealChime() {
    if (!this.audioCtx || !this.isEnabled) return;
    try {
      this.playChime(659.25, 1.2); // E5
      setTimeout(() => this.playChime(783.99, 1.5), 90); // G5
      setTimeout(() => this.playChime(1046.50, 2.0), 180); // C6
      setTimeout(() => this.playChime(1318.51, 2.5), 280); // E6
    } catch (e) {
      // ignore safely
    }
  }
}

export const sound = new SoundManager();
