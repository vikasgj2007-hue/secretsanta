(() => {
  // src/canvas/snow.js
  var SnowEngine = class {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d", { alpha: true });
      this.particles = [];
      this.animationFrameId = null;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.wind = 0.2;
      this.windTarget = 0.2;
      this.isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.isPaused = false;
      this.init();
    }
    init() {
      this.resize();
      window.addEventListener("resize", () => this.resize());
      const baseCount = this.width < 768 ? 60 : 130;
      const count = this.isReducedMotion ? 20 : baseCount;
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createFlake(true));
      }
      setInterval(() => {
        this.windTarget = (Math.random() - 0.45) * 0.8;
      }, 4e3);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.pause();
        } else if (!this.isPaused) {
          this.resume();
        }
      });
      this.render();
    }
    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      if (this.canvas) {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
      }
    }
    pause() {
      this.isPaused = true;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
    resume() {
      this.isPaused = false;
      if (!this.animationFrameId) {
        this.render();
      }
    }
    createFlake(randomY = false) {
      const layer = Math.random() < 0.2 ? 2 : Math.random() < 0.6 ? 1 : 0;
      let radius, speed, opacity;
      if (layer === 2) {
        radius = Math.random() * 2 + 2.4;
        speed = Math.random() * 1.5 + 1.8;
        opacity = Math.random() * 0.25 + 0.65;
      } else if (layer === 1) {
        radius = Math.random() * 1.4 + 1.2;
        speed = Math.random() * 1 + 1.1;
        opacity = Math.random() * 0.35 + 0.5;
      } else {
        radius = Math.random() * 0.9 + 0.6;
        speed = Math.random() * 0.6 + 0.6;
        opacity = Math.random() * 0.2 + 0.3;
      }
      return {
        x: Math.random() * this.width,
        y: randomY ? Math.random() * this.height : -15,
        radius,
        speed,
        opacity,
        layer,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.01
      };
    }
    render() {
      if (this.isPaused) return;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.wind += (this.windTarget - this.wind) * 0.02;
      const layers = [[], [], []];
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.sway += p.swaySpeed;
        p.x += Math.sin(p.sway) * 0.5 + this.wind * (p.layer + 1);
        p.y += p.speed;
        if (p.y > this.height + 10) {
          this.particles[i] = this.createFlake(false);
        }
        if (p.x > this.width + 10) {
          p.x = -10;
        } else if (p.x < -10) {
          p.x = this.width + 10;
        }
        layers[p.layer].push(p);
      }
      if (layers[0].length > 0) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
        this.ctx.beginPath();
        for (let i = 0; i < layers[0].length; i++) {
          const p = layers[0][i];
          this.ctx.moveTo(p.x + p.radius, p.y);
          this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
        this.ctx.fill();
      }
      if (layers[1].length > 0) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        this.ctx.beginPath();
        for (let i = 0; i < layers[1].length; i++) {
          const p = layers[1][i];
          this.ctx.moveTo(p.x + p.radius, p.y);
          this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
        this.ctx.fill();
      }
      if (layers[2].length > 0) {
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        this.ctx.beginPath();
        for (let i = 0; i < layers[2].length; i++) {
          const p = layers[2][i];
          this.ctx.moveTo(p.x + p.radius, p.y);
          this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
        this.ctx.fill();
      }
      this.animationFrameId = requestAnimationFrame(() => this.render());
    }
    destroy() {
      cancelAnimationFrame(this.animationFrameId);
    }
  };

  // src/canvas/skyStars.js
  var SkyStarsEngine = class {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.stars = [];
      this.shootingStars = [];
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.animationFrameId = null;
      this.isPaused = false;
      this.init();
    }
    pause() {
      this.isPaused = true;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
    resume() {
      this.isPaused = false;
      if (!this.animationFrameId) {
        this.render();
      }
    }
    init() {
      this.resize();
      window.addEventListener("resize", () => this.resize());
      const count = this.width < 768 ? 90 : 180;
      this.stars = [];
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * (this.height * 0.65),
          radius: Math.random() * 1.2 + 0.4,
          baseAlpha: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() < 0.2 ? "#fef08a" : Math.random() < 0.3 ? "#bae6fd" : "#ffffff"
        });
      }
      this.scheduleShootingStar();
      this.render();
    }
    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      if (this.canvas) {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
      }
    }
    scheduleShootingStar() {
      const delay = Math.random() * 12e3 + 12e3;
      setTimeout(() => {
        this.spawnShootingStar();
        this.scheduleShootingStar();
      }, delay);
    }
    spawnShootingStar() {
      const startX = Math.random() * (this.width * 0.7);
      const startY = Math.random() * (this.height * 0.3);
      const length = Math.random() * 80 + 90;
      const speed = Math.random() * 8 + 10;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
      this.shootingStars.push({
        x: startX,
        y: startY,
        len: length,
        speed,
        angle,
        alpha: 1,
        decay: 0.016
      });
    }
    render() {
      if (this.isPaused) return;
      this.ctx.clearRect(0, 0, this.width, this.height);
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.phase += s.twinkleSpeed;
        const alpha = s.baseAlpha + Math.sin(s.phase) * 0.25;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = s.color;
        this.ctx.globalAlpha = Math.max(0.1, Math.min(1, alpha));
        this.ctx.fill();
      }
      for (let i = this.shootingStars.length - 1; i >= 0; i--) {
        const ss = this.shootingStars[i];
        const endX = ss.x - Math.cos(ss.angle) * ss.len;
        const endY = ss.y - Math.sin(ss.angle) * ss.len;
        const grad = this.ctx.createLinearGradient(ss.x, ss.y, endX, endY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${ss.alpha})`);
        grad.addColorStop(0.3, `rgba(254, 240, 138, ${ss.alpha * 0.7})`);
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        this.ctx.beginPath();
        this.ctx.moveTo(ss.x, ss.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 1.8;
        this.ctx.globalAlpha = ss.alpha;
        this.ctx.stroke();
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.alpha -= ss.decay;
        if (ss.alpha <= 0) {
          this.shootingStars.splice(i, 1);
        }
      }
      this.ctx.globalAlpha = 1;
      this.animationFrameId = requestAnimationFrame(() => this.render());
    }
    destroy() {
      cancelAnimationFrame(this.animationFrameId);
    }
  };

  // src/audio/soundManager.js
  var SoundManager = class {
    constructor() {
      this.audioCtx = null;
      this.isEnabled = localStorage.getItem("santa_sound_enabled") === "true";
      this.isMuted = !this.isEnabled;
      this.chimeTimer = null;
      this.chugTimer = null;
      this.masterGain = null;
      this.bellNotes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
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
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
    }
    toggleSound() {
      this.ensureContext();
      this.isEnabled = !this.isEnabled;
      localStorage.setItem("santa_sound_enabled", this.isEnabled ? "true" : "false");
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
      this.chimeTimer = setTimeout(playRandomChime, 1e3);
    }
    stopAtmosphericChimes() {
      if (this.chimeTimer) {
        clearTimeout(this.chimeTimer);
        this.chimeTimer = null;
      }
    }
    // Play a gentle music box / celesta chime
    playChime(freq, duration = 2) {
      if (!this.isEnabled || !this.audioCtx) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, this.audioCtx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(1e-4, this.audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {
      }
    }
    // Train Whistle ("Chhoooo-chhoooo!")
    playTrainWhistle() {
      if (!this.isEnabled || !this.audioCtx) return;
      try {
        const now = this.audioCtx.currentTime;
        const frequencies = [440, 554.37, 659.25];
        frequencies.forEach((f) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.linearRampToValueAtTime(f * 1.03, now + 0.4);
          osc.frequency.linearRampToValueAtTime(f, now + 1.2);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
          gain.gain.setValueAtTime(0.07, now + 0.8);
          gain.gain.exponentialRampToValueAtTime(1e-4, now + 1.4);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 1.4);
        });
        setTimeout(() => {
          if (!this.isEnabled || !this.audioCtx) return;
          const now2 = this.audioCtx.currentTime;
          frequencies.forEach((f) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(f, now2);
            osc.frequency.linearRampToValueAtTime(f * 1.02, now2 + 0.5);
            gain.gain.setValueAtTime(0, now2);
            gain.gain.linearRampToValueAtTime(0.09, now2 + 0.1);
            gain.gain.exponentialRampToValueAtTime(1e-4, now2 + 1.8);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now2);
            osc.stop(now2 + 1.8);
          });
        }, 700);
      } catch (e) {
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
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(380, this.audioCtx.currentTime);
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(1e-3, this.audioCtx.currentTime + 0.08);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
      } catch (e) {
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
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(1e-4, this.audioCtx.currentTime + 1.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
      } catch (e) {
      }
    }
    // Wax seal break sound
    playSealCrack() {
      if (!this.audioCtx || !this.isEnabled) return;
      this.playChime(783.99, 1.2);
      setTimeout(() => this.playChime(1046.5, 1.8), 120);
    }
    // Festive Christmas reveal celesta chime triad
    playRevealChime() {
      if (!this.audioCtx || !this.isEnabled) return;
      try {
        this.playChime(659.25, 1.2);
        setTimeout(() => this.playChime(783.99, 1.5), 90);
        setTimeout(() => this.playChime(1046.5, 2), 180);
        setTimeout(() => this.playChime(1318.51, 2.5), 280);
      } catch (e) {
      }
    }
  };
  var sound = new SoundManager();

  // src/services/authService.js
  var AuthService = class {
    constructor() {
      this.authListeners = /* @__PURE__ */ new Set();
      this.currentUser = null;
      this.initSession();
    }
    async initSession() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            this.currentUser = {
              id: data.user.id,
              participantId: data.user.participant_id,
              participantNumber: data.user.participant_id,
              name: data.user.full_name,
              email: data.user.email,
              department: data.user.department,
              giftPreference: data.user.gift_preference,
              role: "faculty"
            };
            this.notifyAuthListeners();
          }
        }
      } catch (e) {
        console.warn("Session check skipped:", e.message);
      }
    }
    getCurrentUser() {
      return this.currentUser;
    }
    subscribeAuth(callback) {
      this.authListeners.add(callback);
      callback(this.currentUser);
      return () => this.authListeners.delete(callback);
    }
    notifyAuthListeners() {
      this.authListeners.forEach((cb) => {
        try {
          cb(this.currentUser);
        } catch (e) {
          console.error(e);
        }
      });
    }
    /**
     * Request Email OTP for Registration
     */
    async requestRegistrationOtp(fullName, email, password, confirmPassword, giftPreference = "", department = "") {
      const res = await fetch("/api/auth/register-request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
          giftPreference,
          department
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to request verification code.");
      }
      return data;
    }
    /**
     * Verify Email OTP and Create Participant Account
     */
    async verifyRegistrationOtp(email, otp) {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = new Error(data.message || "OTP verification failed.");
        err.data = data;
        throw err;
      }
      if (data.user) {
        this.currentUser = {
          id: data.user.id,
          participantId: data.user.participantId,
          participantNumber: data.user.participantId,
          name: data.user.fullName,
          email: data.user.email,
          department: data.user.department,
          giftPreference: data.user.giftPreference,
          role: "faculty"
        };
        this.notifyAuthListeners();
      }
      return data;
    }
    /**
     * Resend Email OTP (with 60-second cooldown enforcement)
     */
    async resendRegistrationOtp(email) {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to resend code.");
      }
      return data;
    }
    /**
     * Faculty Registration via Backend API (Fallback)
     */
    async register(fullName, email, password, confirmPassword, giftPreference = "", department = "") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
          giftPreference,
          department
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Registration failed. Please check your details.");
      }
      if (data.user) {
        this.currentUser = {
          id: data.user.id,
          participantId: data.user.participantId,
          participantNumber: data.user.participantId,
          name: data.user.fullName,
          email: data.user.email,
          department: data.user.department,
          giftPreference: data.user.giftPreference,
          role: "faculty"
        };
        this.notifyAuthListeners();
      }
      return data;
    }
    /**
     * Faculty Login using Participant ID (e.g. SS101) & Password
     */
    async login(participantId, password) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantId, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid Participant ID or Password.");
      }
      this.currentUser = {
        id: data.user.id,
        participantId: data.user.participantId,
        participantNumber: data.user.participantId,
        name: data.user.fullName,
        email: data.user.email,
        department: data.user.department,
        giftPreference: data.user.giftPreference,
        role: "faculty"
      };
      this.notifyAuthListeners();
      return this.currentUser;
    }
    /**
     * Admin Login
     */
    async adminLogin(username, password) {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid Administrator credentials.");
      }
      this.currentUser = {
        id: data.admin.id,
        name: data.admin.username,
        username: data.admin.username,
        role: "admin"
      };
      this.notifyAuthListeners();
      return this.currentUser;
    }
    /**
     * Logout
     */
    async logout() {
      try {
        const endpoint = this.currentUser && this.currentUser.role === "admin" ? "/api/admin/logout" : "/api/auth/logout";
        await fetch(endpoint, {
          method: "POST",
          credentials: "include"
        });
      } catch (e) {
        console.warn("Logout request warning:", e);
      }
      this.currentUser = null;
      this.notifyAuthListeners();
    }
  };
  var authService = new AuthService();

  // src/services/databaseService.js
  var DatabaseService = class {
    constructor() {
      this.eventListeners = /* @__PURE__ */ new Set();
      this.pollInterval = null;
      this.isPollingActive = true;
      this.cachedEventState = {
        id: "evergreen_2026",
        status: "pending",
        registrationOpen: true,
        drawLocked: false
      };
      this.startPolling();
    }
    startPolling() {
      const fetchState = async () => {
        if (typeof document !== "undefined" && document.hidden) return;
        try {
          const res = await fetch("/api/participant/dashboard", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (data.event) {
              this.cachedEventState = {
                id: data.event.id,
                status: (data.event.status || "pending").toUpperCase(),
                registrationOpen: data.event.registrationStatus === "open",
                drawLocked: !!data.event.drawLocked,
                drawGenerated: !!data.event.drawGenerated,
                eventStartedAt: data.event.eventStartedAt
              };
              this.notifyEventListeners();
            }
          }
        } catch (e) {
        }
      };
      fetchState();
      this.pollInterval = setInterval(fetchState, 3e4);
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) fetchState();
        });
      }
    }
    subscribeEventState(callback) {
      this.eventListeners.add(callback);
      callback(this.cachedEventState);
      return () => this.eventListeners.delete(callback);
    }
    notifyEventListeners() {
      this.eventListeners.forEach((cb) => {
        try {
          cb(this.cachedEventState);
        } catch (e) {
          console.error(e);
        }
      });
    }
    async getEventState() {
      return this.cachedEventState;
    }
    /**
     * Fetches participant dashboard payload
     */
    async getDashboardData() {
      const res = await fetch("/api/participant/dashboard", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to retrieve dashboard.");
      }
      return data;
    }
    /**
     * Updates gift preference / wishlist
     */
    async updateWishlist(giftPreference) {
      const res = await fetch("/api/participant/wishlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ giftPreference })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update wishlist.");
      return data;
    }
    /**
     * STAGE 6 Reveal: Fetches assigned recipient's Participant ID (e.g. SS124)
     */
    async revealStage1RecipientId() {
      const res = await fetch("/api/reveal/stage1-recipient-id", {
        method: "GET",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to reveal recipient ID.");
      return data;
    }
    /**
     * STAGE 7 Reveal: Opens Christmas letter and reveals recipient's Full Name & details
     */
    async revealStage2RecipientIdentity() {
      const res = await fetch("/api/reveal/stage2-recipient-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to open recipient letter.");
      return data;
    }
    // ---------------------------------------------------------------------------
    // ADMIN CONTROL METHODS
    // ---------------------------------------------------------------------------
    async getAdminDashboard() {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load admin statistics.");
      return data;
    }
    async getParticipants() {
      const res = await fetch("/api/admin/registrations", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      return data.participants || [];
    }
    async getAssignments() {
      const res = await fetch("/api/admin/assignments", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load assignments.");
      return data;
    }
    /**
     * STEP 1: Closes faculty registration (enforces min 2 participants)
     */
    async closeRegistration() {
      const res = await fetch("/api/admin/registration/close", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to close registration.");
      return data;
    }
    /**
     * Re-opens faculty registration
     */
    async openRegistration() {
      const res = await fetch("/api/admin/registration/open", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to open registration.");
      return data;
    }
    async toggleRegistration() {
      const res = await fetch("/api/admin/registration/toggle", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to toggle registration.");
      return data;
    }
    /**
     * STEP 2: Generates the Secret Santa draw (unlocked)
     */
    async generateDraw() {
      const res = await fetch("/api/admin/draw/generate", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to generate Secret Santa draw.");
      return data;
    }
    /**
     * STEP 3: Permanently locks the draw
     */
    async lockDraw() {
      const res = await fetch("/api/admin/draw/lock", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to lock Secret Santa draw.");
      return data;
    }
    /**
     * STEP 4: Starts the event (LIVE)
     */
    async startEvent() {
      const res = await fetch("/api/admin/event/start", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to start event.");
      return data;
    }
    async endEvent() {
      const res = await fetch("/api/admin/event/end", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to end event.");
      return data;
    }
    async getBackups() {
      const res = await fetch("/api/admin/backups", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [];
      return data.backups || [];
    }
    async createBackup() {
      const res = await fetch("/api/admin/backups/create", {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create backup snapshot.");
      return data;
    }
    async restoreBackup(backupId, adminPassword) {
      const res = await fetch(`/api/admin/backups/${backupId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adminPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to restore backup snapshot.");
      return data;
    }
    async confirmReset(adminPassword, confirmationCode, resetParticipants = false) {
      const res = await fetch("/api/admin/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ adminPassword, confirmationCode, resetParticipants })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Database reset failed.");
      return data;
    }
    async getAnnouncementStatus() {
      const res = await fetch("/api/admin/announcement/status", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to fetch announcement status.");
      return data;
    }
    async sendAnnouncementSingle(participantId, testEmail = null) {
      const res = await fetch("/api/admin/announcement/send-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantId, testEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to dispatch announcement email.");
      return data;
    }
    async logAnnouncementBatch(summary) {
      const res = await fetch("/api/admin/announcement/log-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(summary)
      });
      return res.json().catch(() => ({}));
    }
  };
  var databaseService = new DatabaseService();

  // src/components/authModals.js
  var EYE_ICONS = {
    show: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
    hide: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`
  };
  function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.innerHTML = isPassword ? EYE_ICONS.hide : EYE_ICONS.show;
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
      btn.setAttribute("title", isPassword ? "Hide password" : "Show password");
    };
  }
  var resendInterval = null;
  function openAuthModal(mode = "login", prefilledId = "") {
    let modalBackdrop = document.getElementById("auth-modal-backdrop");
    if (!modalBackdrop) {
      modalBackdrop = document.createElement("div");
      modalBackdrop.id = "auth-modal-backdrop";
      modalBackdrop.className = "modal-backdrop";
      document.body.appendChild(modalBackdrop);
    }
    modalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
    const closeModal = () => {
      if (resendInterval) clearInterval(resendInterval);
      modalBackdrop.classList.remove("active");
      document.body.style.overflow = "";
    };
    const renderContent = (currentMode, extraData = {}) => {
      if (resendInterval) clearInterval(resendInterval);
      if (currentMode === "login") {
        modalBackdrop.innerHTML = `
        <div class="modal-window">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>
          <div class="modal-header">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">\u{1F384}</div>
            <h2>The Evergreen Express</h2>
            <p class="modal-subtitle">Participant Login \u2022 Secret Christmas Journey</p>
          </div>
          <form id="form-faculty-login">
            <div class="form-group">
              <label class="form-label" for="login-participant-id">Participant ID or Email Address</label>
              <input 
                type="text" 
                id="login-participant-id" 
                class="form-input" 
                placeholder="e.g. SS101 or your email" 
                value="${prefilledId || ""}" 
                required 
                autocomplete="username" 
                style="font-size: 1rem; letter-spacing: 0.5px;"
              />
              <span style="font-size: 11px; color: var(--color-gold-champagne); margin-top: 4px; display: block;">
                Enter your unique Participant ID (e.g. SS101) or your registered Email Address
              </span>
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <div class="password-field-wrapper">
                <input type="password" id="login-password" class="form-input" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required autocomplete="current-password" />
                <button type="button" class="password-toggle-btn" id="toggle-login-password" aria-label="Show password" title="Show password">
                  ${EYE_ICONS.show}
                </button>
              </div>
            </div>
            <div class="form-footer-action">
              <button type="submit" class="btn btn-primary" id="btn-submit-login" style="width: 100%;">
                Login
              </button>
              <p class="form-switch-prompt">
                Not registered yet? <button type="button" class="form-switch-link" id="link-goto-register">Register as Faculty</button>
              </p>
            </div>
          </form>
        </div>
      `;
        document.getElementById("modal-close-x").onclick = closeModal;
        document.getElementById("link-goto-register").onclick = () => renderContent("register");
        setupPasswordToggle("toggle-login-password", "login-password");
        const loginForm = document.getElementById("form-faculty-login");
        loginForm.onsubmit = async (e) => {
          e.preventDefault();
          const participantId = document.getElementById("login-participant-id").value;
          const password = document.getElementById("login-password").value;
          const submitBtn = document.getElementById("btn-submit-login");
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="button-spinner"></span> Logging in...';
          try {
            const user = await authService.login(participantId, password);
            showToast(`Welcome aboard, ${user.name}!`, "success");
            closeModal();
          } catch (err) {
            showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Login";
          }
        };
      } else if (currentMode === "register") {
        const prevData = extraData.formData || {};
        modalBackdrop.innerHTML = `
        <div class="modal-window" style="max-width: 520px;">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>
          <div class="modal-header">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">\u2728</div>
            <h2>Faculty Registration</h2>
            <p class="modal-subtitle">Join The Evergreen Express \u2022 Step 1: Account Details</p>
          </div>
          <form id="form-faculty-register">
            <div class="form-group">
              <label class="form-label" for="reg-name">Full Name & Title</label>
              <input type="text" id="reg-name" class="form-input" placeholder="e.g. Dr. Robert Vance" value="${prevData.fullName || ""}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">College Email Address</label>
              <input type="email" id="reg-email" class="form-input" placeholder="e.g. r.vance@college.edu" value="${prevData.email || ""}" required />
              <span style="font-size: 11px; color: var(--color-gold-champagne); margin-top: 4px; display: block;">
                \u2709\uFE0F A 6-digit verification code will be sent to this email address.
              </span>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-dept">Department / Faculty</label>
              <input type="text" id="reg-dept" class="form-input" placeholder="e.g. Department of Computer Science" value="${prevData.department || ""}" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label" for="reg-password">Password</label>
                <div class="password-field-wrapper">
                  <input type="password" id="reg-password" class="form-input" placeholder="Min 6 chars" minlength="6" required />
                  <button type="button" class="password-toggle-btn" id="toggle-reg-password" aria-label="Show password" title="Show password">
                    ${EYE_ICONS.show}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-confirm-password">Confirm Password</label>
                <div class="password-field-wrapper">
                  <input type="password" id="reg-confirm-password" class="form-input" placeholder="Re-enter password" minlength="6" required />
                  <button type="button" class="password-toggle-btn" id="toggle-reg-confirm-password" aria-label="Show password" title="Show password">
                    ${EYE_ICONS.show}
                  </button>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-wishlist">Holiday Gift Preference / Wishlist (Optional)</label>
              <input type="text" id="reg-wishlist" class="form-input" placeholder="e.g. Books, dark chocolates, coffee, fountain pen ink" value="${prevData.giftPreference || ""}" />
            </div>
            <div class="form-footer-action">
              <button type="submit" class="btn btn-primary" id="btn-submit-register" style="width: 100%;">
                Continue to Verification \u2794
              </button>
              <p class="form-switch-prompt">
                Already registered? <button type="button" class="form-switch-link" id="link-goto-login">Login with Participant ID</button>
              </p>
            </div>
          </form>
        </div>
      `;
        document.getElementById("modal-close-x").onclick = closeModal;
        document.getElementById("link-goto-login").onclick = () => renderContent("login");
        setupPasswordToggle("toggle-reg-password", "reg-password");
        setupPasswordToggle("toggle-reg-confirm-password", "reg-confirm-password");
        const regForm = document.getElementById("form-faculty-register");
        regForm.onsubmit = async (e) => {
          e.preventDefault();
          const fullName = (document.getElementById("reg-name").value || "").trim();
          const email = (document.getElementById("reg-email").value || "").trim().toLowerCase();
          const dept = (document.getElementById("reg-dept").value || "").trim();
          const password = document.getElementById("reg-password").value;
          const confirmPassword = document.getElementById("reg-confirm-password").value;
          const wishlist = (document.getElementById("reg-wishlist").value || "").trim();
          const submitBtn = document.getElementById("btn-submit-register");
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address (e.g. name@gmail.com).", "error");
            return;
          }
          if (password !== confirmPassword) {
            showToast("Passwords do not match. Please verify.", "error");
            return;
          }
          if (password.length < 6) {
            showToast("Password must be at least 6 characters long.", "error");
            return;
          }
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="button-spinner"></span> Sending Verification Code...';
          try {
            const res = await authService.requestRegistrationOtp(fullName, email, password, confirmPassword, wishlist, dept);
            showToast("Verification code dispatched to your email!", "info");
            renderContent("verify-otp", {
              email,
              maskedEmail: res.maskedEmail || email,
              formData: { fullName, email, password, confirmPassword, giftPreference: wishlist, department: dept }
            });
          } catch (err) {
            showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Continue to Verification \u2794";
          }
        };
      } else if (currentMode === "verify-otp") {
        const { email, maskedEmail, formData } = extraData;
        let countdownSeconds = 60;
        modalBackdrop.innerHTML = `
        <div class="modal-window" style="max-width: 480px; text-align: center; border: 2px solid var(--color-gold-champagne); background: radial-gradient(circle at top, rgba(17, 30, 56, 0.98), rgba(5, 10, 22, 0.99));">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>

          <div style="font-size: 2.8rem; margin-bottom: 0.25rem;">\u2709\uFE0F\u2744\uFE0F</div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin-bottom: 0.25rem; font-size: 1.8rem;">
            Verify Your Email
          </h2>
          <p style="color: #cbd5e1; font-size: 0.95rem; margin-bottom: 1.25rem;">
            A 6-digit Christmas passenger verification code has been dispatched to:
          </p>

          <div style="background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 8px; padding: 0.65rem 1rem; margin-bottom: 1.25rem; display: inline-block;">
            <span style="font-family: monospace; font-size: 1.05rem; font-weight: 700; color: #fef08a;">
              ${maskedEmail}
            </span>
          </div>

          <form id="form-verify-otp">
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label" for="otp-input" style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">
                Enter 6-Digit Verification Code
              </label>
              <input 
                type="text" 
                id="otp-input" 
                class="form-input" 
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022" 
                maxlength="6" 
                pattern="[0-9]*" 
                inputmode="numeric" 
                style="text-align: center; font-family: monospace; font-size: 2.2rem; letter-spacing: 12px; font-weight: 700; color: #ffffff;" 
                required 
                autofocus 
                autocomplete="one-time-code"
              />
              <span style="font-size: 11px; color: #94a3b8; margin-top: 6px; display: block;">
                \u23F3 Code expires in 5 minutes \u2022 Check your inbox or spam folder
              </span>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-submit-otp" style="width: 100%; font-size: 1.05rem; padding: 0.85rem; box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);">
              VERIFY EMAIL & ISSUE TICKET \u{1F3AB}
            </button>
          </form>

          <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 13px; color: #cbd5e1;">
            <div id="resend-container">
              Didn't receive the code? 
              <span id="countdown-text" style="color: var(--color-gold-light);">Resend in <strong id="resend-timer">${countdownSeconds}s</strong></span>
              <button type="button" id="btn-resend-otp" class="form-switch-link" style="display: none; font-weight: 600; margin-left: 4px;">
                Resend Code \u{1F504}
              </button>
            </div>
            <div style="margin-top: 0.75rem;">
              Wrong email address? 
              <button type="button" id="btn-back-to-reg" class="form-switch-link" style="color: #93c5fd;">
                Change Details
              </button>
            </div>
          </div>
        </div>
      `;
        document.getElementById("modal-close-x").onclick = closeModal;
        document.getElementById("btn-back-to-reg").onclick = () => {
          renderContent("register", { formData });
        };
        const timerSpan = document.getElementById("resend-timer");
        const countdownText = document.getElementById("countdown-text");
        const resendBtn = document.getElementById("btn-resend-otp");
        const startTimer = () => {
          countdownSeconds = 60;
          countdownText.style.display = "inline";
          resendBtn.style.display = "none";
          timerSpan.textContent = `${countdownSeconds}s`;
          if (resendInterval) clearInterval(resendInterval);
          resendInterval = setInterval(() => {
            countdownSeconds--;
            timerSpan.textContent = `${countdownSeconds}s`;
            if (countdownSeconds <= 0) {
              clearInterval(resendInterval);
              countdownText.style.display = "none";
              resendBtn.style.display = "inline";
            }
          }, 1e3);
        };
        startTimer();
        resendBtn.onclick = async () => {
          try {
            resendBtn.disabled = true;
            resendBtn.textContent = "Sending...";
            const res = await authService.resendRegistrationOtp(email);
            showToast(res.message, "success");
            resendBtn.disabled = false;
            resendBtn.textContent = "Resend Code \u{1F504}";
            startTimer();
          } catch (err) {
            showToast(err.message, "error");
            resendBtn.disabled = false;
            resendBtn.textContent = "Resend Code \u{1F504}";
          }
        };
        const otpForm = document.getElementById("form-verify-otp");
        otpForm.onsubmit = async (e) => {
          e.preventDefault();
          const otpVal = document.getElementById("otp-input").value.trim();
          const submitBtn = document.getElementById("btn-submit-otp");
          if (otpVal.length !== 6) {
            showToast("Please enter the full 6-digit code.", "error");
            return;
          }
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="button-spinner"></span> Verifying Code & Issuing Ticket...';
          try {
            const res = await authService.verifyRegistrationOtp(email, otpVal);
            showToast("Email verified successfully! Welcome aboard!", "success");
            renderContent("success", { participantId: res.participantId, fullName: res.user.fullName });
          } catch (err) {
            showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "VERIFY EMAIL & ISSUE TICKET \u{1F3AB}";
          }
        };
      } else if (currentMode === "success") {
        modalBackdrop.innerHTML = `
        <div class="modal-window" style="text-align: center; border: 2px solid var(--color-gold-champagne); background: radial-gradient(circle at top, rgba(15, 28, 56, 0.98), rgba(5, 10, 22, 0.99));">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem; animation: floatSleigh 3s ease-in-out infinite;">\u{1F682}\u2728</div>
          <h2 style="color: var(--color-gold-champagne); font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 0.5rem;">
            Welcome aboard THE EVERGREEN EXPRESS!
          </h2>
          <p style="color: var(--color-ivory-warm); font-size: 1rem; margin-bottom: 1.5rem;">
            Your registration and email verification are complete.
          </p>

          <div style="background: rgba(212, 175, 55, 0.1); border: 2px dashed var(--color-gold-champagne); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
            <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-light); margin-bottom: 0.5rem;">
              Your Unique Ticket Number
            </div>
            <div style="font-size: 2.4rem; font-weight: 700; letter-spacing: 4px; color: #ffffff; text-shadow: 0 0 15px rgba(254, 240, 138, 0.8); font-family: monospace;">
              ${extraData.participantId}
            </div>
          </div>

          <div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid var(--color-crimson); padding: 0.85rem 1rem; text-align: left; border-radius: 4px; margin-bottom: 1.5rem;">
            <p style="color: #fecaca; font-size: 0.9rem; margin: 0; line-height: 1.4;">
              \u{1F4CC} <strong>Keep your Participant ID safe.</strong> You will need it to log in and board The Evergreen Express on reveal day!
            </p>
          </div>

          <button id="btn-success-proceed" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.85rem;">
            Enter Passenger Cabin \u2794
          </button>
        </div>
      `;
        document.getElementById("btn-success-proceed").onclick = () => {
          closeModal();
        };
      } else if (currentMode === "admin") {
        modalBackdrop.innerHTML = `
        <div class="modal-window">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>
          <div class="modal-header">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">\u{1F6E1}\uFE0F</div>
            <h2>ST PAULS COLLEGE Administration Portal</h2>
            <p class="modal-subtitle">The Evergreen Express \u2022 Management Console</p>
          </div>
          <form id="form-admin-login">
            <div class="form-group">
              <label class="form-label" for="admin-user">Administrator Username</label>
              <input type="text" id="admin-user" class="form-input" placeholder="e.g. admin" required autocomplete="username" />
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-password">Administrator Password</label>
              <div class="password-field-wrapper">
                <input type="password" id="admin-password" class="form-input" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required autocomplete="current-password" />
                <button type="button" class="password-toggle-btn" id="toggle-admin-password" aria-label="Show password" title="Show password">
                  ${EYE_ICONS.show}
                </button>
              </div>
            </div>
            <div class="form-footer-action">
              <button type="submit" class="btn btn-primary" id="btn-submit-admin" style="width: 100%; background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);">
                Authenticate Admin
              </button>
              <p class="form-switch-prompt">
                Faculty member? <button type="button" class="form-switch-link" id="link-goto-faculty">Faculty Portal</button>
              </p>
            </div>
          </form>
        </div>
      `;
        document.getElementById("modal-close-x").onclick = closeModal;
        document.getElementById("link-goto-faculty").onclick = () => renderContent("login");
        setupPasswordToggle("toggle-admin-password", "admin-password");
        const adminForm = document.getElementById("form-admin-login");
        adminForm.onsubmit = async (e) => {
          e.preventDefault();
          const username = document.getElementById("admin-user").value;
          const password = document.getElementById("admin-password").value;
          const submitBtn = document.getElementById("btn-submit-admin");
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="button-spinner"></span> Authenticating Admin...';
          try {
            await authService.adminLogin(username, password);
            showToast("Administrator session established.", "success");
            closeModal();
          } catch (err) {
            showToast(err.message, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Authenticate Admin";
          }
        };
      }
    };
    renderContent(mode);
  }

  // node_modules/canvas-confetti/dist/confetti.module.mjs
  var module = {};
  (function main(global, module2, isWorker, workerSize) {
    var canUseWorker = !!(global.Worker && global.Blob && global.Promise && global.OffscreenCanvas && global.OffscreenCanvasRenderingContext2D && global.HTMLCanvasElement && global.HTMLCanvasElement.prototype.transferControlToOffscreen && global.URL && global.URL.createObjectURL);
    var canUsePaths = typeof Path2D === "function" && typeof DOMMatrix === "function";
    var canDrawBitmap = (function() {
      if (!global.OffscreenCanvas) {
        return false;
      }
      try {
        var canvas = new OffscreenCanvas(1, 1);
        var ctx = canvas.getContext("2d");
        ctx.fillRect(0, 0, 1, 1);
        var bitmap = canvas.transferToImageBitmap();
        ctx.createPattern(bitmap, "no-repeat");
      } catch (e) {
        return false;
      }
      return true;
    })();
    function noop() {
    }
    function promise(func) {
      var ModulePromise = module2.exports.Promise;
      var Prom = ModulePromise !== void 0 ? ModulePromise : global.Promise;
      if (typeof Prom === "function") {
        return new Prom(func);
      }
      func(noop, noop);
      return null;
    }
    var bitmapMapper = /* @__PURE__ */ (function(skipTransform, map) {
      return {
        transform: function(bitmap) {
          if (skipTransform) {
            return bitmap;
          }
          if (map.has(bitmap)) {
            return map.get(bitmap);
          }
          var canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          var ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0);
          map.set(bitmap, canvas);
          return canvas;
        },
        clear: function() {
          map.clear();
        }
      };
    })(canDrawBitmap, /* @__PURE__ */ new Map());
    var raf = (function() {
      var TIME = Math.floor(1e3 / 60);
      var frame, cancel;
      var frames = {};
      var lastFrameTime = 0;
      if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
        frame = function(cb) {
          var id = Math.random();
          frames[id] = requestAnimationFrame(function onFrame(time) {
            if (lastFrameTime === time || lastFrameTime + TIME - 1 < time) {
              lastFrameTime = time;
              delete frames[id];
              cb();
            } else {
              frames[id] = requestAnimationFrame(onFrame);
            }
          });
          return id;
        };
        cancel = function(id) {
          if (frames[id]) {
            cancelAnimationFrame(frames[id]);
          }
        };
      } else {
        frame = function(cb) {
          return setTimeout(cb, TIME);
        };
        cancel = function(timer) {
          return clearTimeout(timer);
        };
      }
      return { frame, cancel };
    })();
    var getWorker = /* @__PURE__ */ (function() {
      var worker;
      var prom;
      var resolves = {};
      function decorate(worker2) {
        function execute(options, callback) {
          worker2.postMessage({ options: options || {}, callback });
        }
        worker2.init = function initWorker(canvas) {
          var offscreen = canvas.transferControlToOffscreen();
          worker2.postMessage({ canvas: offscreen }, [offscreen]);
        };
        worker2.fire = function fireWorker(options, size, done) {
          if (prom) {
            execute(options, null);
            return prom;
          }
          var id = Math.random().toString(36).slice(2);
          prom = promise(function(resolve) {
            function workerDone(msg) {
              if (msg.data.callback !== id) {
                return;
              }
              delete resolves[id];
              worker2.removeEventListener("message", workerDone);
              prom = null;
              bitmapMapper.clear();
              done();
              resolve();
            }
            worker2.addEventListener("message", workerDone);
            execute(options, id);
            resolves[id] = workerDone.bind(null, { data: { callback: id } });
          });
          return prom;
        };
        worker2.reset = function resetWorker() {
          worker2.postMessage({ reset: true });
          for (var id in resolves) {
            resolves[id]();
            delete resolves[id];
          }
        };
      }
      return function() {
        if (worker) {
          return worker;
        }
        if (!isWorker && canUseWorker) {
          var code = [
            "var CONFETTI, SIZE = {}, module = {};",
            "(" + main.toString() + ")(this, module, true, SIZE);",
            "onmessage = function(msg) {",
            "  if (msg.data.options) {",
            "    CONFETTI(msg.data.options).then(function () {",
            "      if (msg.data.callback) {",
            "        postMessage({ callback: msg.data.callback });",
            "      }",
            "    });",
            "  } else if (msg.data.reset) {",
            "    CONFETTI && CONFETTI.reset();",
            "  } else if (msg.data.resize) {",
            "    SIZE.width = msg.data.resize.width;",
            "    SIZE.height = msg.data.resize.height;",
            "  } else if (msg.data.canvas) {",
            "    SIZE.width = msg.data.canvas.width;",
            "    SIZE.height = msg.data.canvas.height;",
            "    CONFETTI = module.exports.create(msg.data.canvas);",
            "  }",
            "}"
          ].join("\n");
          try {
            worker = new Worker(URL.createObjectURL(new Blob([code])));
          } catch (e) {
            typeof console !== "undefined" && typeof console.warn === "function" ? console.warn("\u{1F38A} Could not load worker", e) : null;
            return null;
          }
          decorate(worker);
        }
        return worker;
      };
    })();
    var defaults = {
      particleCount: 50,
      angle: 90,
      spread: 45,
      startVelocity: 45,
      decay: 0.9,
      gravity: 1,
      drift: 0,
      ticks: 200,
      x: 0.5,
      y: 0.5,
      shapes: ["square", "circle"],
      zIndex: 100,
      colors: [
        "#26ccff",
        "#a25afd",
        "#ff5e7e",
        "#88ff5a",
        "#fcff42",
        "#ffa62d",
        "#ff36ff"
      ],
      // probably should be true, but back-compat
      disableForReducedMotion: false,
      scalar: 1
    };
    function convert(val, transform) {
      return transform ? transform(val) : val;
    }
    function isOk(val) {
      return !(val === null || val === void 0);
    }
    function prop(options, name, transform) {
      return convert(
        options && isOk(options[name]) ? options[name] : defaults[name],
        transform
      );
    }
    function onlyPositiveInt(number) {
      return number < 0 ? 0 : Math.floor(number);
    }
    function randomInt(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }
    function toDecimal(str) {
      return parseInt(str, 16);
    }
    function colorsToRgb(colors) {
      return colors.map(hexToRgb);
    }
    function hexToRgb(str) {
      var val = String(str).replace(/[^0-9a-f]/gi, "");
      if (val.length < 6) {
        val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
      }
      return {
        r: toDecimal(val.substring(0, 2)),
        g: toDecimal(val.substring(2, 4)),
        b: toDecimal(val.substring(4, 6))
      };
    }
    function getOrigin(options) {
      var origin = prop(options, "origin", Object);
      origin.x = prop(origin, "x", Number);
      origin.y = prop(origin, "y", Number);
      return origin;
    }
    function setCanvasWindowSize(canvas) {
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
    }
    function setCanvasRectSize(canvas) {
      var rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    function getCanvas(zIndex) {
      var canvas = document.createElement("canvas");
      canvas.style.position = "fixed";
      canvas.style.top = "0px";
      canvas.style.left = "0px";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = zIndex;
      return canvas;
    }
    function ellipse(context, x, y, radiusX, radiusY, rotation, startAngle, endAngle, antiClockwise) {
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.scale(radiusX, radiusY);
      context.arc(0, 0, 1, startAngle, endAngle, antiClockwise);
      context.restore();
    }
    function randomPhysics(opts) {
      var radAngle = opts.angle * (Math.PI / 180);
      var radSpread = opts.spread * (Math.PI / 180);
      return {
        x: opts.x,
        y: opts.y,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
        velocity: opts.startVelocity * 0.5 + Math.random() * opts.startVelocity,
        angle2D: -radAngle + (0.5 * radSpread - Math.random() * radSpread),
        tiltAngle: (Math.random() * (0.75 - 0.25) + 0.25) * Math.PI,
        color: opts.color,
        shape: opts.shape,
        tick: 0,
        totalTicks: opts.ticks,
        decay: opts.decay,
        drift: opts.drift,
        random: Math.random() + 2,
        tiltSin: 0,
        tiltCos: 0,
        wobbleX: 0,
        wobbleY: 0,
        gravity: opts.gravity * 3,
        ovalScalar: 0.6,
        scalar: opts.scalar,
        flat: opts.flat
      };
    }
    function updateFetti(context, fetti) {
      fetti.x += Math.cos(fetti.angle2D) * fetti.velocity + fetti.drift;
      fetti.y += Math.sin(fetti.angle2D) * fetti.velocity + fetti.gravity;
      fetti.velocity *= fetti.decay;
      if (fetti.flat) {
        fetti.wobble = 0;
        fetti.wobbleX = fetti.x + 10 * fetti.scalar;
        fetti.wobbleY = fetti.y + 10 * fetti.scalar;
        fetti.tiltSin = 0;
        fetti.tiltCos = 0;
        fetti.random = 1;
      } else {
        fetti.wobble += fetti.wobbleSpeed;
        fetti.wobbleX = fetti.x + 10 * fetti.scalar * Math.cos(fetti.wobble);
        fetti.wobbleY = fetti.y + 10 * fetti.scalar * Math.sin(fetti.wobble);
        fetti.tiltAngle += 0.1;
        fetti.tiltSin = Math.sin(fetti.tiltAngle);
        fetti.tiltCos = Math.cos(fetti.tiltAngle);
        fetti.random = Math.random() + 2;
      }
      var progress = fetti.tick++ / fetti.totalTicks;
      var x1 = fetti.x + fetti.random * fetti.tiltCos;
      var y1 = fetti.y + fetti.random * fetti.tiltSin;
      var x2 = fetti.wobbleX + fetti.random * fetti.tiltCos;
      var y2 = fetti.wobbleY + fetti.random * fetti.tiltSin;
      context.fillStyle = "rgba(" + fetti.color.r + ", " + fetti.color.g + ", " + fetti.color.b + ", " + (1 - progress) + ")";
      context.beginPath();
      if (canUsePaths && fetti.shape.type === "path" && typeof fetti.shape.path === "string" && Array.isArray(fetti.shape.matrix)) {
        context.fill(transformPath2D(
          fetti.shape.path,
          fetti.shape.matrix,
          fetti.x,
          fetti.y,
          Math.abs(x2 - x1) * 0.1,
          Math.abs(y2 - y1) * 0.1,
          Math.PI / 10 * fetti.wobble
        ));
      } else if (fetti.shape.type === "bitmap") {
        var rotation = Math.PI / 10 * fetti.wobble;
        var scaleX = Math.abs(x2 - x1) * 0.1;
        var scaleY = Math.abs(y2 - y1) * 0.1;
        var width = fetti.shape.bitmap.width * fetti.scalar;
        var height = fetti.shape.bitmap.height * fetti.scalar;
        var matrix = new DOMMatrix([
          Math.cos(rotation) * scaleX,
          Math.sin(rotation) * scaleX,
          -Math.sin(rotation) * scaleY,
          Math.cos(rotation) * scaleY,
          fetti.x,
          fetti.y
        ]);
        matrix.multiplySelf(new DOMMatrix(fetti.shape.matrix));
        var pattern = context.createPattern(bitmapMapper.transform(fetti.shape.bitmap), "no-repeat");
        pattern.setTransform(matrix);
        context.globalAlpha = 1 - progress;
        context.fillStyle = pattern;
        context.fillRect(
          fetti.x - width / 2,
          fetti.y - height / 2,
          width,
          height
        );
        context.globalAlpha = 1;
      } else if (fetti.shape === "circle") {
        context.ellipse ? context.ellipse(fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI) : ellipse(context, fetti.x, fetti.y, Math.abs(x2 - x1) * fetti.ovalScalar, Math.abs(y2 - y1) * fetti.ovalScalar, Math.PI / 10 * fetti.wobble, 0, 2 * Math.PI);
      } else if (fetti.shape === "star") {
        var rot = Math.PI / 2 * 3;
        var innerRadius = 4 * fetti.scalar;
        var outerRadius = 8 * fetti.scalar;
        var x = fetti.x;
        var y = fetti.y;
        var spikes = 5;
        var step = Math.PI / spikes;
        while (spikes--) {
          x = fetti.x + Math.cos(rot) * outerRadius;
          y = fetti.y + Math.sin(rot) * outerRadius;
          context.lineTo(x, y);
          rot += step;
          x = fetti.x + Math.cos(rot) * innerRadius;
          y = fetti.y + Math.sin(rot) * innerRadius;
          context.lineTo(x, y);
          rot += step;
        }
      } else {
        context.moveTo(Math.floor(fetti.x), Math.floor(fetti.y));
        context.lineTo(Math.floor(fetti.wobbleX), Math.floor(y1));
        context.lineTo(Math.floor(x2), Math.floor(y2));
        context.lineTo(Math.floor(x1), Math.floor(fetti.wobbleY));
      }
      context.closePath();
      context.fill();
      return fetti.tick < fetti.totalTicks;
    }
    function animate(canvas, fettis, resizer, size, done) {
      var animatingFettis = fettis.slice();
      var context = canvas.getContext("2d");
      var animationFrame;
      var destroy;
      var prom = promise(function(resolve) {
        function onDone() {
          animationFrame = destroy = null;
          context.clearRect(0, 0, size.width, size.height);
          bitmapMapper.clear();
          done();
          resolve();
        }
        function update() {
          if (isWorker && !(size.width === workerSize.width && size.height === workerSize.height)) {
            size.width = canvas.width = workerSize.width;
            size.height = canvas.height = workerSize.height;
          }
          if (!size.width && !size.height) {
            resizer(canvas);
            size.width = canvas.width;
            size.height = canvas.height;
          }
          context.clearRect(0, 0, size.width, size.height);
          animatingFettis = animatingFettis.filter(function(fetti) {
            return updateFetti(context, fetti);
          });
          if (animatingFettis.length) {
            animationFrame = raf.frame(update);
          } else {
            onDone();
          }
        }
        animationFrame = raf.frame(update);
        destroy = onDone;
      });
      return {
        addFettis: function(fettis2) {
          animatingFettis = animatingFettis.concat(fettis2);
          return prom;
        },
        canvas,
        promise: prom,
        reset: function() {
          if (animationFrame) {
            raf.cancel(animationFrame);
          }
          if (destroy) {
            destroy();
          }
        }
      };
    }
    function confettiCannon(canvas, globalOpts) {
      var isLibCanvas = !canvas;
      var allowResize = !!prop(globalOpts || {}, "resize");
      var hasResizeEventRegistered = false;
      var globalDisableForReducedMotion = prop(globalOpts, "disableForReducedMotion", Boolean);
      var shouldUseWorker = canUseWorker && !!prop(globalOpts || {}, "useWorker");
      var worker = shouldUseWorker ? getWorker() : null;
      var resizer = isLibCanvas ? setCanvasWindowSize : setCanvasRectSize;
      var initialized = canvas && worker ? !!canvas.__confetti_initialized : false;
      var preferLessMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion)").matches;
      var animationObj;
      function fireLocal(options, size, done) {
        var particleCount = prop(options, "particleCount", onlyPositiveInt);
        var angle = prop(options, "angle", Number);
        var spread = prop(options, "spread", Number);
        var startVelocity = prop(options, "startVelocity", Number);
        var decay = prop(options, "decay", Number);
        var gravity = prop(options, "gravity", Number);
        var drift = prop(options, "drift", Number);
        var colors = prop(options, "colors", colorsToRgb);
        var ticks = prop(options, "ticks", Number);
        var shapes = prop(options, "shapes");
        var scalar = prop(options, "scalar");
        var flat = !!prop(options, "flat");
        var origin = getOrigin(options);
        var temp = particleCount;
        var fettis = [];
        var startX = canvas.width * origin.x;
        var startY = canvas.height * origin.y;
        while (temp--) {
          fettis.push(
            randomPhysics({
              x: startX,
              y: startY,
              angle,
              spread,
              startVelocity,
              color: colors[temp % colors.length],
              shape: shapes[randomInt(0, shapes.length)],
              ticks,
              decay,
              gravity,
              drift,
              scalar,
              flat
            })
          );
        }
        if (animationObj) {
          return animationObj.addFettis(fettis);
        }
        animationObj = animate(canvas, fettis, resizer, size, done);
        return animationObj.promise;
      }
      function fire(options) {
        var disableForReducedMotion = globalDisableForReducedMotion || prop(options, "disableForReducedMotion", Boolean);
        var zIndex = prop(options, "zIndex", Number);
        if (disableForReducedMotion && preferLessMotion) {
          return promise(function(resolve) {
            resolve();
          });
        }
        if (isLibCanvas && animationObj) {
          canvas = animationObj.canvas;
        } else if (isLibCanvas && !canvas) {
          canvas = getCanvas(zIndex);
          document.body.appendChild(canvas);
        }
        if (allowResize && !initialized) {
          resizer(canvas);
        }
        var size = {
          width: canvas.width,
          height: canvas.height
        };
        if (worker && !initialized) {
          worker.init(canvas);
        }
        initialized = true;
        if (worker) {
          canvas.__confetti_initialized = true;
        }
        function onResize() {
          if (worker) {
            var obj = {
              getBoundingClientRect: function() {
                if (!isLibCanvas) {
                  return canvas.getBoundingClientRect();
                }
              }
            };
            resizer(obj);
            worker.postMessage({
              resize: {
                width: obj.width,
                height: obj.height
              }
            });
            return;
          }
          size.width = size.height = null;
        }
        function done() {
          animationObj = null;
          if (allowResize) {
            hasResizeEventRegistered = false;
            global.removeEventListener("resize", onResize);
          }
          if (isLibCanvas && canvas) {
            if (document.body.contains(canvas)) {
              document.body.removeChild(canvas);
            }
            canvas = null;
            initialized = false;
          }
        }
        if (allowResize && !hasResizeEventRegistered) {
          hasResizeEventRegistered = true;
          global.addEventListener("resize", onResize, false);
        }
        if (worker) {
          return worker.fire(options, size, done);
        }
        return fireLocal(options, size, done);
      }
      fire.reset = function() {
        if (worker) {
          worker.reset();
        }
        if (animationObj) {
          animationObj.reset();
        }
      };
      return fire;
    }
    var defaultFire;
    function getDefaultFire() {
      if (!defaultFire) {
        defaultFire = confettiCannon(null, { useWorker: true, resize: true });
      }
      return defaultFire;
    }
    function transformPath2D(pathString, pathMatrix, x, y, scaleX, scaleY, rotation) {
      var path2d = new Path2D(pathString);
      var t1 = new Path2D();
      t1.addPath(path2d, new DOMMatrix(pathMatrix));
      var t2 = new Path2D();
      t2.addPath(t1, new DOMMatrix([
        Math.cos(rotation) * scaleX,
        Math.sin(rotation) * scaleX,
        -Math.sin(rotation) * scaleY,
        Math.cos(rotation) * scaleY,
        x,
        y
      ]));
      return t2;
    }
    function shapeFromPath(pathData) {
      if (!canUsePaths) {
        throw new Error("path confetti are not supported in this browser");
      }
      var path, matrix;
      if (typeof pathData === "string") {
        path = pathData;
      } else {
        path = pathData.path;
        matrix = pathData.matrix;
      }
      var path2d = new Path2D(path);
      var tempCanvas = document.createElement("canvas");
      var tempCtx = tempCanvas.getContext("2d");
      if (!matrix) {
        var maxSize = 1e3;
        var minX = maxSize;
        var minY = maxSize;
        var maxX = 0;
        var maxY = 0;
        var width, height;
        for (var x = 0; x < maxSize; x += 2) {
          for (var y = 0; y < maxSize; y += 2) {
            if (tempCtx.isPointInPath(path2d, x, y, "nonzero")) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        width = maxX - minX;
        height = maxY - minY;
        var maxDesiredSize = 10;
        var scale = Math.min(maxDesiredSize / width, maxDesiredSize / height);
        matrix = [
          scale,
          0,
          0,
          scale,
          -Math.round(width / 2 + minX) * scale,
          -Math.round(height / 2 + minY) * scale
        ];
      }
      return {
        type: "path",
        path,
        matrix
      };
    }
    function shapeFromText(textData) {
      var text, scalar = 1, color = "#000000", fontFamily = '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';
      if (typeof textData === "string") {
        text = textData;
      } else {
        text = textData.text;
        scalar = "scalar" in textData ? textData.scalar : scalar;
        fontFamily = "fontFamily" in textData ? textData.fontFamily : fontFamily;
        color = "color" in textData ? textData.color : color;
      }
      var fontSize = 10 * scalar;
      var font = "" + fontSize + "px " + fontFamily;
      var canvas = new OffscreenCanvas(fontSize, fontSize);
      var ctx = canvas.getContext("2d");
      ctx.font = font;
      var size = ctx.measureText(text);
      var width = Math.ceil(size.actualBoundingBoxRight + size.actualBoundingBoxLeft);
      var height = Math.ceil(size.actualBoundingBoxAscent + size.actualBoundingBoxDescent);
      var padding = 2;
      var x = size.actualBoundingBoxLeft + padding;
      var y = size.actualBoundingBoxAscent + padding;
      width += padding + padding;
      height += padding + padding;
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext("2d");
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      var scale = 1 / scalar;
      return {
        type: "bitmap",
        // TODO these probably need to be transfered for workers
        bitmap: canvas.transferToImageBitmap(),
        matrix: [scale, 0, 0, scale, -width * scale / 2, -height * scale / 2]
      };
    }
    module2.exports = function() {
      return getDefaultFire().apply(this, arguments);
    };
    module2.exports.reset = function() {
      getDefaultFire().reset();
    };
    module2.exports.create = confettiCannon;
    module2.exports.shapeFromPath = shapeFromPath;
    module2.exports.shapeFromText = shapeFromText;
  })((function() {
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof self !== "undefined") {
      return self;
    }
    return this || {};
  })(), module, false);
  var confetti_module_default = module.exports;
  var create = module.exports.create;

  // src/components/revealModal.js
  async function openSecretSantaRevealModal(currentUserOrCallback, maybeCallback) {
    let currentUser = null;
    let onCompleteCallback = null;
    if (typeof currentUserOrCallback === "function") {
      onCompleteCallback = currentUserOrCallback;
    } else if (currentUserOrCallback && typeof currentUserOrCallback === "object") {
      currentUser = currentUserOrCallback;
      if (typeof maybeCallback === "function") {
        onCompleteCallback = maybeCallback;
      }
    }
    let modalBackdrop = document.getElementById("reveal-modal-backdrop");
    if (!modalBackdrop) {
      modalBackdrop = document.createElement("div");
      modalBackdrop.id = "reveal-modal-backdrop";
      modalBackdrop.className = "modal-backdrop";
      document.body.appendChild(modalBackdrop);
    }
    modalBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
    const exitRevealCleanly = () => {
      sound.stopTrainChug();
      modalBackdrop.classList.remove("active");
      if (modalBackdrop.parentNode) {
        modalBackdrop.parentNode.removeChild(modalBackdrop);
      }
      document.body.style.overflow = "";
      trainJourney.closeJourney();
      if (onCompleteCallback) {
        onCompleteCallback();
      }
    };
    let recipientId = null;
    let preloadedRecipient = null;
    if (currentUser && currentUser.assignedRecipient) {
      const ar = currentUser.assignedRecipient;
      recipientId = ar.recipient_participant_id || ar.participantId || ar.recipientId;
      preloadedRecipient = {
        fullName: ar.recipient_name || ar.fullName || ar.name,
        participantId: recipientId,
        department: ar.recipient_department || ar.department || "Faculty",
        giftPreference: ar.recipient_gift_preference || ar.giftPreference || "Holiday surprise for a wonderful colleague!"
      };
    } else if (currentUser && (currentUser.recipientId || currentUser.assignedRecipientId)) {
      recipientId = currentUser.recipientId || currentUser.assignedRecipientId;
    }
    if (!recipientId) {
      try {
        const stage1Data = await databaseService.revealStage1RecipientId();
        if (stage1Data && stage1Data.recipientId) {
          recipientId = stage1Data.recipientId;
        }
      } catch (err) {
        console.warn("Assignment lookup notice:", err.message);
      }
    }
    if (!recipientId && currentUser) {
      recipientId = currentUser.recipientId || currentUser.assignedRecipient && (currentUser.assignedRecipient.recipient_participant_id || currentUser.assignedRecipient.participantId) || currentUser.participantId;
    }
    if (!recipientId) {
      recipientId = "SS101";
    }
    const renderStage6 = () => {
      try {
        if (sound && typeof sound.playRevealChime === "function") {
          sound.playRevealChime();
        }
        confetti_module_default({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.45 },
          colors: ["#fef08a", "#eab308", "#22c55e", "#ef4444", "#ffffff"]
        });
      } catch (e) {
        console.warn("Reveal effect notice:", e);
      }
      modalBackdrop.innerHTML = `
      <div class="modal-window reveal-modal-window participant-id-card-window" style="display: flex !important; flex-direction: column !important; align-items: center !important; text-align: center !important; max-width: 500px; width: 92vw; border: 2.5px solid var(--color-gold-champagne); background: radial-gradient(circle at top, rgba(22, 36, 71, 0.98), rgba(5, 10, 22, 0.99)); box-shadow: 0 0 55px rgba(212, 175, 55, 0.5), 0 20px 40px rgba(0,0,0,0.8); padding: 2.25rem 1.75rem; margin: auto; box-sizing: border-box; animation: modalWindowPop 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
        <div class="participant-id-subheading" style="width: 100% !important; display: block !important; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 3px; color: var(--color-gold-light); margin-bottom: 0.5rem; font-weight: 600; text-align: center;">
          \u2728 The Evergreen Express \u2022 Secret Christmas Journey
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
            \u{1F512} Confidential Station Assignment
          </div>
          <p class="participant-id-station-notice" style="display: block !important; font-size: 13px; color: #cbd5e1; margin: 0.85rem 0 0 0; line-height: 1.45; text-align: center;">
            Your official Christmas letter has arrived from Station Post!
          </p>
        </div>

        <button id="btn-proceed-stage7" class="btn btn-primary participant-id-proceed-btn" style="width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; font-size: 1.12rem; font-weight: 700; padding: 0.95rem 1.5rem; box-shadow: 0 0 30px rgba(212, 175, 55, 0.7); display: flex !important; align-items: center !important; justify-content: center !important; gap: 0.6rem; letter-spacing: 1px; cursor: pointer; border-radius: 10px; animation: pulseGlowBtn 2s infinite; position: static !important; margin: 0 !important;">
          <span>OPEN CHRISTMAS LETTER</span> \u2709\uFE0F
        </button>
        <div class="participant-id-footer-text" style="width: 100% !important; display: block !important; font-size: 11.5px; color: var(--color-snow-dark); margin-top: 0.75rem; letter-spacing: 0.5px; text-align: center;">
          Click to unseal and read your official Christmas assignment
        </div>
      </div>
    `;
      const proceedBtn = document.getElementById("btn-proceed-stage7");
      if (proceedBtn) {
        proceedBtn.onclick = () => {
          renderStage7();
        };
        proceedBtn.focus();
      }
    };
    const renderStage7 = () => {
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
              The Evergreen Express \u2022 Christmas Post
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
            <div style="font-size: 1.6rem; line-height: 1; margin-bottom: 0.15rem;">\u{1F4DC}\u{1F384}</div>
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
              <strong style="color: #881337; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">\u{1F381} Holiday Wishlist & Preferences:</strong>
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
                Go Back \u2794
              </button>
              <button id="btn-replay-reveal" class="btn btn-secondary" style="flex: 1; padding: 0.65rem 0.85rem; font-size: 0.92rem; font-weight: 600; color: #1e293b; background: rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.2);">
                Replay the Christmas Journey \u{1F504}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
      const waxSealBtn = document.getElementById("wax-seal-btn");
      const envelope = document.getElementById("interactive-envelope");
      const parchment = document.getElementById("parchment-letter");
      const waxSubtext = document.getElementById("wax-seal-subtext");
      let isOpening = false;
      const handleBreakSeal = async (e) => {
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (isOpening) return;
        isOpening = true;
        sound.playSealCrack();
        if (waxSealBtn) {
          waxSealBtn.classList.add("wax-seal-breaking");
          waxSealBtn.style.pointerEvents = "none";
          if (waxSubtext) waxSubtext.textContent = "Breaking...";
        }
        try {
          const [stage2Data] = await Promise.all([
            stage2DataPromise.catch((err) => {
              console.warn("Stage 2 DB call fallback:", err.message);
              if (preloadedRecipient) return { success: true, recipient: preloadedRecipient };
              throw err;
            }),
            new Promise((resolve) => setTimeout(resolve, 460))
          ]);
          const recipient = stage2Data && stage2Data.recipient || preloadedRecipient;
          if (!recipient) {
            throw new Error("Recipient identity details not available.");
          }
          if (currentUser) {
            currentUser.hasRevealedName = true;
            currentUser.assignedRecipient = recipient;
          }
          document.getElementById("recipient-full-name").textContent = recipient.fullName;
          document.getElementById("recipient-details").textContent = `${recipient.department || "Faculty"} \u2022 Ticket #${recipient.participantId}`;
          document.getElementById("recipient-wishlist-text").textContent = `"${recipient.giftPreference || "Holiday surprise for a wonderful colleague!"}"`;
          confetti_module_default({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.55 },
            colors: ["#fbbf24", "#dc2626", "#16a34a", "#ffffff", "#fde047"]
          });
          envelope.style.display = "none";
          parchment.style.display = "block";
          setTimeout(() => {
            try {
              if (sound && typeof sound.playRevealChime === "function") {
                sound.playRevealChime();
              }
            } catch (e2) {
              console.warn("Reveal chime notice:", e2);
            }
          }, 200);
          const backDashboardBtn = document.getElementById("btn-view-dashboard");
          if (backDashboardBtn) {
            backDashboardBtn.onclick = exitRevealCleanly;
          }
          const replayBtn = document.getElementById("btn-replay-reveal");
          if (replayBtn) {
            replayBtn.onclick = () => {
              exitRevealCleanly();
              trainJourney.replayFullJourney();
            };
          }
        } catch (err) {
          console.error("Wax seal break error:", err);
          if (preloadedRecipient) {
            const recipient = preloadedRecipient;
            if (currentUser) {
              currentUser.hasRevealedName = true;
              currentUser.assignedRecipient = recipient;
            }
            document.getElementById("recipient-full-name").textContent = recipient.fullName;
            document.getElementById("recipient-details").textContent = `${recipient.department || "Faculty"} \u2022 Ticket #${recipient.participantId}`;
            document.getElementById("recipient-wishlist-text").textContent = `"${recipient.giftPreference || "Holiday surprise for a wonderful colleague!"}"`;
            confetti_module_default({
              particleCount: 110,
              spread: 80,
              origin: { y: 0.55 },
              colors: ["#fbbf24", "#dc2626", "#16a34a", "#ffffff", "#fde047"]
            });
            envelope.style.display = "none";
            parchment.style.display = "block";
            const backDashboardBtn = document.getElementById("btn-view-dashboard");
            if (backDashboardBtn) backDashboardBtn.onclick = exitRevealCleanly;
            const replayBtn = document.getElementById("btn-replay-reveal");
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
            waxSealBtn.classList.remove("wax-seal-breaking");
            waxSealBtn.style.pointerEvents = "auto";
            if (waxSubtext) waxSubtext.textContent = "Break Seal";
          }
        }
      };
      if (waxSealBtn) {
        waxSealBtn.addEventListener("click", handleBreakSeal);
        waxSealBtn.addEventListener("touchend", handleBreakSeal, { passive: false });
      }
      if (envelope) {
        envelope.addEventListener("click", handleBreakSeal);
      }
    };
    renderStage6();
  }

  // src/components/trainJourney.js
  var TrainJourneyController = class {
    constructor() {
      this.overlay = null;
      this.movementContainer = null;
      this.smokeEmitter = null;
      this.smokeInterval = null;
      this.progressFill = null;
      this.waypointLabel = null;
      this.isJourneyRunning = false;
      this.animationId = null;
      this.trainMusic = null;
      this.santaAudio = null;
      this.isMusicMuted = localStorage.getItem("train_music_muted") === "true";
      this.musicToggleBtn = null;
      this.musicIcon = null;
      this.musicLabel = null;
      this.santaStage = null;
      this.santaFlyingSleigh = null;
      this.santaGroundActor = null;
      this.santaFigure = null;
      this.thrownGiftActor = null;
      this.magicalGiftStage = null;
      this.giftLidFloating = null;
      this.giftBurstAura = null;
      this.cinematicTimeouts = [];
    }
    init() {
      this.overlay = document.getElementById("train-journey-overlay");
      this.movementContainer = document.getElementById("train-movement-container");
      this.smokeEmitter = document.getElementById("chimney-smoke-emitter");
      this.progressFill = document.getElementById("journey-progress-fill");
      this.waypointLabel = document.getElementById("journey-waypoint-label");
      this.santaStage = document.getElementById("santa-cinematic-stage");
      this.santaFlyingSleigh = document.getElementById("santa-flying-sleigh");
      this.santaGroundActor = document.getElementById("santa-ground-actor");
      this.santaFigure = document.getElementById("santa-figure");
      this.thrownGiftActor = document.getElementById("thrown-gift-actor");
      this.magicalGiftStage = document.getElementById("magical-gift-stage");
      this.giftLidFloating = document.getElementById("gift-lid-floating");
      this.giftBurstAura = document.getElementById("gift-star-burst-aura");
      const exitBtn = document.getElementById("btn-exit-journey");
      if (exitBtn) {
        exitBtn.addEventListener("click", () => this.closeJourney());
      }
      this.initAudio();
    }
    initAudio() {
      if (!this.trainMusic) {
        this.trainMusic = new Audio("/audio/christmas-train-music.mp3");
        this.trainMusic.preload = "auto";
        this.trainMusic.loop = false;
        this.trainMusic.volume = 0;
        this.trainMusic.muted = this.isMusicMuted;
        this.trainMusic.addEventListener("error", (e) => {
          console.warn("Christmas train music notice: Audio playback unavailable or prevented.", e);
        });
      }
      if (!this.santaAudio) {
        this.santaAudio = new Audio("/audio/santa-arrival.mp3");
        this.santaAudio.preload = "auto";
        this.santaAudio.loop = false;
        this.santaAudio.volume = 0.85;
        this.santaAudio.muted = this.isMusicMuted;
        this.santaAudio.addEventListener("error", (e) => {
          console.warn("Santa arrival audio notice: Audio playback unavailable or prevented.", e);
        });
      }
      this.musicToggleBtn = document.getElementById("btn-train-music-toggle");
      this.musicIcon = document.getElementById("train-music-icon");
      this.musicLabel = document.getElementById("train-music-label");
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
      localStorage.setItem("train_music_muted", this.isMusicMuted ? "true" : "false");
      if (this.trainMusic) this.trainMusic.muted = this.isMusicMuted;
      if (this.santaAudio) this.santaAudio.muted = this.isMusicMuted;
      this.updateMusicUI();
    }
    updateMusicUI() {
      if (!this.musicToggleBtn) return;
      if (this.isMusicMuted) {
        this.musicToggleBtn.classList.add("muted");
        if (this.musicIcon) this.musicIcon.textContent = "\u{1F507}";
        if (this.musicLabel) this.musicLabel.textContent = "Music Off";
        this.musicToggleBtn.title = "Unmute Audio Experience";
      } else {
        this.musicToggleBtn.classList.remove("muted");
        if (this.musicIcon) this.musicIcon.textContent = "\u{1F50A}";
        if (this.musicLabel) this.musicLabel.textContent = "Music On";
        this.musicToggleBtn.title = "Mute Audio Experience";
      }
    }
    startTrainMusic() {
      this.stopAllAudio();
      if (this.trainMusic) {
        this.trainMusic.currentTime = 0;
        this.trainMusic.volume = 0;
        this.trainMusic.muted = this.isMusicMuted;
        this.updateMusicUI();
        const p = this.trainMusic.play();
        if (p !== void 0) {
          p.catch((err) => console.warn("Train audio autoplay notice:", err.message));
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
        if (p !== void 0) {
          p.catch((err) => console.warn("Santa audio autoplay notice:", err.message));
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
      const event = await databaseService.getEventState();
      if (event.status !== "ACTIVE") {
        throw new Error("The Secret Santa event has not been started by the Admin yet.");
      }
      if (!this.overlay) this.init();
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
      let ticketModal = document.getElementById("golden-ticket-modal");
      if (!ticketModal) {
        ticketModal = document.createElement("div");
        ticketModal.id = "golden-ticket-modal";
        ticketModal.className = "modal-backdrop active";
        document.body.appendChild(ticketModal);
      }
      ticketModal.classList.add("active");
      document.body.style.overflow = "hidden";
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
            <div><strong>Route:</strong> ST PAULS COLLEGE \u2192 North Pole</div>
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
            ENTER \u{1F682}
          </button>
        </div>
      </div>
    `;
      document.getElementById("btn-cancel-ticket").onclick = () => {
        ticketModal.classList.remove("active");
        document.body.style.overflow = "";
        if (window.__evergreenSnowEngine?.resume) window.__evergreenSnowEngine.resume();
        if (window.__evergreenStarsEngine?.resume) window.__evergreenStarsEngine.resume();
      };
      document.getElementById("btn-board-express").onclick = () => {
        ticketModal.classList.remove("active");
        this.startTrainMusic();
        this.embarkTrainJourney(currentUser);
      };
    }
    embarkTrainJourney(currentUser) {
      this.isJourneyRunning = true;
      this.overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      if (window.__evergreenSnowEngine?.pause) window.__evergreenSnowEngine.pause();
      if (window.__evergreenStarsEngine?.pause) window.__evergreenStarsEngine.pause();
      this.cleanupCinematicStages();
      sound.ensureContext();
      sound.playTrainWhistle();
      sound.startTrainChug();
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
        }).catch((e) => console.warn("Background stage 1 prefetch notice:", e.message));
        databaseService.revealStage2RecipientIdentity().then((s2) => {
          if (s2 && s2.recipient) {
            this.prefetchedRecipient = s2.recipient;
            currentUser.assignedRecipient = s2.recipient;
          }
        }).catch((e) => console.warn("Background stage 2 prefetch notice:", e.message));
      }
      this.startSmokePuffs();
      const visual = document.querySelector(".train-visual");
      if (visual) visual.classList.add("train-rolling");
      const totalDuration = 22e3;
      const startTime = performance.now();
      if (this.progressFill) {
        this.progressFill.style.transition = "none";
        this.progressFill.style.width = "0%";
      }
      const stageDep = document.querySelector(".stage-departure");
      const stageViaduct = document.querySelector(".stage-viaduct");
      const stageArrival = document.querySelector(".stage-arrival");
      stageDep.classList.add("active");
      stageViaduct.classList.remove("active");
      stageArrival.classList.remove("active");
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / totalDuration);
        const TARGET_VOLUME = 0.35;
        if (this.trainMusic && !this.isMusicMuted) {
          let currentVol = TARGET_VOLUME;
          if (elapsed < 2e3) {
            currentVol = TARGET_VOLUME * (elapsed / 2e3);
          } else if (elapsed > 19e3) {
            const fadeOutElapsed = Math.min(3e3, elapsed - 19e3);
            currentVol = Math.max(0, TARGET_VOLUME * (1 - fadeOutElapsed / 3e3));
          }
          this.trainMusic.volume = Math.max(0, Math.min(1, currentVol));
        }
        const screenWidth = window.innerWidth;
        let trainScale = 0.85;
        if (screenWidth <= 360) {
          trainScale = 0.32;
        } else if (screenWidth <= 480) {
          trainScale = 0.4;
        } else if (screenWidth <= 768) {
          trainScale = 0.55;
        } else if (screenWidth <= 1024) {
          trainScale = 0.7;
        } else if (screenWidth >= 1600) {
          trainScale = 1;
        }
        const scaledTrainWidth = 1555 * trainScale;
        const startX = -(scaledTrainWidth + 100);
        const targetArrivalX = screenWidth >= scaledTrainWidth + 40 ? (screenWidth - scaledTrainWidth) / 2 : screenWidth - scaledTrainWidth - 15;
        const totalTravelDistance = targetArrivalX - startX;
        const easeProgress = 1.5 * progress - 0.5 * Math.pow(progress, 3);
        let currentX = startX + totalTravelDistance * easeProgress;
        if (progress >= 1) {
          currentX = targetArrivalX;
        }
        const physicalProgress = Math.min(1, Math.max(0, (currentX - startX) / totalTravelDistance));
        if (this.progressFill) {
          this.progressFill.style.width = `${(physicalProgress * 100).toFixed(2)}%`;
        }
        if (progress < 0.33) {
          if (this.waypointLabel) this.waypointLabel.textContent = "Departing: Faculty Quad Central Station";
          stageDep.classList.add("active");
          stageViaduct.classList.remove("active");
          stageArrival.classList.remove("active");
        } else if (progress < 0.7) {
          if (this.waypointLabel) this.waypointLabel.textContent = "Crossing: Alpine Viaduct & Aurora Ridge";
          stageDep.classList.remove("active");
          stageViaduct.classList.add("active");
          stageArrival.classList.remove("active");
        } else {
          if (this.waypointLabel) this.waypointLabel.textContent = "Arriving: North Pole Faculty Winter Pavilion";
          stageDep.classList.remove("active");
          stageViaduct.classList.remove("active");
          stageArrival.classList.add("active");
        }
        if (this.movementContainer) {
          this.movementContainer.style.transform = `translate3d(${currentX}px, 0, 0)`;
        }
        if (progress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          if (this.progressFill) {
            this.progressFill.style.width = "100%";
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
        const puff = document.createElement("div");
        puff.className = "smoke-puff";
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
      if (this.trainMusic) {
        this.trainMusic.pause();
        this.trainMusic.currentTime = 0;
      }
      sound.stopTrainChug();
      sound.playSteamHiss();
      const visual = document.querySelector(".train-visual");
      if (visual) visual.classList.remove("train-rolling");
      if (this.progressFill) {
        this.progressFill.style.width = "100%";
      }
      if (this.waypointLabel) {
        this.waypointLabel.textContent = "North Pole Terminal Reached! \u2728 Look to the Skies...";
      }
      this.stopSmokePuffs();
      this.scheduleTimeout(() => {
        if (this.movementContainer) {
          this.movementContainer.classList.add("train-fade-exit");
        }
        const trackBed = document.querySelector(".railway-track-bed");
        if (trackBed) {
          trackBed.classList.add("train-fade-exit");
        }
        this.scheduleTimeout(() => {
          if (this.movementContainer) {
            this.movementContainer.style.display = "none";
          }
          this.startSantaCinematicSequence(currentUser);
        }, 1400);
      }, 800);
    }
    // ==========================================================================
    // SANTA CLAUS FLYING ARRIVAL, LANDING, WALKING & GIFT THROWING SEQUENCE
    // Synchronised with "santa-arrival.mp3" (~11 seconds)
    // ==========================================================================
    startSantaCinematicSequence(currentUser) {
      this.startSantaAudio();
      if (!this.santaStage) this.init();
      if (this.santaStage) {
        this.santaStage.classList.add("active");
      }
      if (this.santaFlyingSleigh) {
        this.santaFlyingSleigh.classList.remove("flying");
        void this.santaFlyingSleigh.offsetWidth;
        this.santaFlyingSleigh.classList.add("flying");
      }
      if (this.waypointLabel) {
        this.waypointLabel.textContent = "\u{1F385} Santa Claus and his Reindeer are soaring through the Aurora!";
      }
      this.scheduleTimeout(() => {
        if (this.santaFlyingSleigh) {
          this.santaFlyingSleigh.style.opacity = "0";
        }
        if (this.santaGroundActor) {
          this.santaGroundActor.classList.add("active");
        }
        if (this.santaFigure) {
          this.santaFigure.classList.add("stepping-down");
        }
        if (this.waypointLabel) {
          this.waypointLabel.textContent = "\u{1F31F} Santa steps down from his sleigh onto the winter snow!";
        }
      }, 4500);
      this.scheduleTimeout(() => {
        if (this.santaFigure) {
          this.santaFigure.classList.remove("stepping-down");
          this.santaFigure.classList.add("walking");
        }
        if (this.waypointLabel) {
          this.waypointLabel.textContent = "\u{1F381} Santa approaches with his magical Christmas sack...";
        }
      }, 6500);
      this.scheduleTimeout(() => {
        if (this.santaFigure) {
          this.santaFigure.classList.remove("walking");
          this.santaFigure.classList.add("throwing");
        }
        if (this.thrownGiftActor) {
          this.thrownGiftActor.classList.add("in-flight");
        }
        if (this.waypointLabel) {
          this.waypointLabel.textContent = '\u{1F384} "Wishing you a Merry Christmas!" \u2014 A gift takes flight!';
        }
      }, 8500);
      this.scheduleTimeout(() => {
        if (this.thrownGiftActor) {
          this.thrownGiftActor.style.opacity = "0";
        }
        if (this.magicalGiftStage) {
          this.magicalGiftStage.classList.add("active");
        }
        this.scheduleTimeout(() => {
          if (this.giftLidFloating) {
            this.giftLidFloating.classList.add("open-lid");
          }
          if (this.giftBurstAura) {
            this.giftBurstAura.classList.add("burst");
          }
          try {
            if (sound && typeof sound.playRevealChime === "function") {
              sound.playRevealChime();
            }
          } catch (e) {
            console.warn("Reveal chime notice:", e);
          }
          try {
            confetti_module_default({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.5 },
              colors: ["#fef08a", "#eab308", "#dc2626", "#047857", "#ffffff"]
            });
          } catch (e) {
            console.warn("Confetti notice:", e);
          }
          this.scheduleTimeout(() => {
            this.launchExistingSecretSantaReveal(currentUser);
          }, 1200);
        }, 600);
      }, 10800);
    }
    launchExistingSecretSantaReveal(currentUser) {
      if (this.isRevealing) return;
      this.isRevealing = true;
      if (this.magicalGiftStage) {
        this.magicalGiftStage.classList.remove("active");
      }
      if (this.santaStage) {
        this.santaStage.classList.remove("active");
      }
      if (this.santaGroundActor) {
        this.santaGroundActor.classList.remove("active");
      }
      if (this.santaFigure) {
        this.santaFigure.classList.remove("stepping-down", "walking", "throwing");
      }
      if (this.thrownGiftActor) {
        this.thrownGiftActor.classList.remove("in-flight");
        this.thrownGiftActor.style.opacity = "0";
      }
      const assignedRecipient = this.prefetchedRecipient || currentUser && currentUser.assignedRecipient || null;
      const hasRevealedName = Boolean(
        currentUser && (currentUser.hasRevealedName || currentUser.hasRevealed) || assignedRecipient && (assignedRecipient.recipient_name || assignedRecipient.fullName)
      );
      currentUser = {
        ...currentUser,
        hasRevealedName,
        recipientId: this.prefetchedRecipientId || currentUser && currentUser.recipientId,
        assignedRecipient
      };
      openSecretSantaRevealModal(currentUser, () => {
        this.isRevealing = false;
        if (typeof this.onRevealCompleteCallback === "function") {
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
        this.movementContainer.classList.remove("train-fade-exit");
        this.movementContainer.style.display = "";
        this.movementContainer.style.opacity = "";
      }
      const trackBed = document.querySelector(".railway-track-bed");
      if (trackBed) {
        trackBed.classList.remove("train-fade-exit");
        trackBed.style.opacity = "";
      }
      const visual = document.querySelector(".train-visual");
      if (visual) {
        visual.classList.remove("train-fade-exit", "train-rolling");
        visual.style.opacity = "";
      }
      if (this.santaStage) {
        this.santaStage.classList.remove("active");
      }
      if (this.santaFlyingSleigh) {
        this.santaFlyingSleigh.classList.remove("flying");
        this.santaFlyingSleigh.style.opacity = "";
      }
      if (this.santaGroundActor) {
        this.santaGroundActor.classList.remove("active");
      }
      if (this.santaFigure) {
        this.santaFigure.classList.remove("stepping-down", "walking", "throwing");
      }
      if (this.thrownGiftActor) {
        this.thrownGiftActor.classList.remove("in-flight");
        this.thrownGiftActor.style.opacity = "";
      }
      if (this.magicalGiftStage) {
        this.magicalGiftStage.classList.remove("active");
      }
      if (this.giftLidFloating) {
        this.giftLidFloating.classList.remove("open-lid");
      }
      if (this.giftBurstAura) {
        this.giftBurstAura.classList.remove("burst");
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
        this.overlay.classList.remove("active");
      }
      if (this.progressFill) {
        this.progressFill.style.width = "0%";
      }
      document.body.style.overflow = "";
      if (window.__evergreenSnowEngine?.resume) window.__evergreenSnowEngine.resume();
      if (window.__evergreenStarsEngine?.resume) window.__evergreenStarsEngine.resume();
    }
  };
  var trainJourney = new TrainJourneyController();

  // src/components/dashboardView.js
  async function renderDashboard(container, currentUser) {
    let dashboardData;
    try {
      dashboardData = await databaseService.getDashboardData();
    } catch (err) {
      showToast(err.message, "error");
      dashboardData = {
        participant: currentUser,
        event: { status: "pending", name: "The Evergreen Express" },
        revealStatus: { canReveal: false, hasRevealedName: false }
      };
    }
    const { participant, event, revealStatus } = dashboardData;
    const isEventActive = event.status === "active";
    const hasRevealed = revealStatus.hasRevealedName;
    const assignedRecipient = revealStatus.assignedRecipient;
    container.innerHTML = `
    <div class="dashboard-section">
      <!-- Welcome Header -->
      <div class="dashboard-header-block">
        <div class="dashboard-title-area">
          <div style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-champagne);">
            \u{1F682} The Evergreen Express \u2022 Passenger Cabin
          </div>
          <h1 style="margin: 0.25rem 0;">Welcome aboard, ${participant.fullName}!</h1>
          <p class="dashboard-subtitle">
            ${participant.department || "College Faculty"} \u2022 Ticket #${participant.participantId}
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
        <!-- Card 1 \u2014 Personal Details -->
        <div class="card dashboard-card">
          <div class="card-header-icon">\u{1F464}</div>
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
            <div style="font-size: 0.95rem; color: #cbd5e1;">${participant.department || "College Faculty"}</div>
          </div>
        </div>

        <!-- Card 2 \u2014 Participant ID (Prominently Displayed) -->
        <div class="card dashboard-card" style="border-color: rgba(212, 175, 55, 0.4); background: radial-gradient(circle at top, rgba(212, 175, 55, 0.12), rgba(15, 28, 56, 0.75));">
          <div class="card-header-icon">\u{1F3AB}</div>
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
            \u{1F512} Permanent unique faculty assignment key
          </p>
        </div>

        <!-- Card 3 \u2014 Secret Santa Status -->
        <div class="card dashboard-card">
          <div class="card-header-icon">\u{1F381}</div>
          <h3>Secret Santa Status</h3>
          <div style="margin-top: 1rem;">
            ${hasRevealed && assignedRecipient ? `
              <div style="background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #86efac; letter-spacing: 1px;">Recipient Assigned</div>
                <div style="font-size: 1.25rem; font-weight: 700; color: #ffffff; margin: 0.25rem 0;">
                  ${assignedRecipient.recipient_name}
                </div>
                <div style="font-size: 12px; color: #cbd5e1;">
                  Ticket: <strong>${assignedRecipient.recipient_participant_id}</strong> \u2022 ${assignedRecipient.recipient_department || "Faculty"}
                </div>
                <div style="font-size: 12px; color: var(--color-gold-champagne); margin-top: 0.5rem;">
                  \u{1F381} Wishlist: <em>"${assignedRecipient.recipient_gift_preference || "Holiday surprise"}"</em>
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
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">\u2744\uFE0F</div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin-bottom: 0.5rem;">
            THE EVERGREEN EXPRESS is preparing for its Christmas journey.
          </h2>
          <p style="color: var(--color-ivory-warm); max-width: 600px; margin: 0 auto; line-height: 1.5;">
            Please wait for the official announcement from the administration. Once the conductor rings the bell, you can board the train and discover your assigned Christmas friend!
          </p>
          <div style="display: inline-block; margin-top: 1.25rem; padding: 0.5rem 1.25rem; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 20px; color: #fbbf24; font-size: 13px;">
            \u23F3 Event Status: PREPARING AT THE STATION
          </div>
        ` : `
          <div style="font-size: 3rem; margin-bottom: 0.5rem; animation: floatSleigh 3s ease-in-out infinite;">\u{1F682}\u2728</div>
          <div style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 3px; color: #4ade80; margin-bottom: 0.25rem;">
            \u25CF OFFICIAL ANNOUNCEMENT
          </div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); font-size: 2.2rem; margin: 0.25rem 0 0.5rem 0;">
            THE JOURNEY BEGINS!
          </h2>
          <p style="color: var(--color-ivory-warm); max-width: 620px; margin: 0 auto 1.5rem auto; line-height: 1.6;">
            Steam fills the winter air and the golden lantern is lit. Your holiday friend is waiting at the end of the railway line.
          </p>
          <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            <button id="btn-start-train-journey" class="btn btn-primary" style="font-size: 1.1rem; padding: 0.85rem 2.25rem; box-shadow: 0 0 25px rgba(212, 175, 55, 0.5);">
              ${hasRevealed ? "Replay The Reveal Journey \u{1F682}" : "CONFIRM & JOIN THE EVENT \u{1F3AB}"}
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
            value="${participant.giftPreference || ""}" 
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
    const logoutBtn = document.getElementById("btn-dashboard-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await authService.logout();
        showToast("You have safely disembarked The Evergreen Express.", "info");
      });
    }
    const wishlistBtn = document.getElementById("btn-save-wishlist");
    if (wishlistBtn) {
      wishlistBtn.addEventListener("click", async () => {
        const input = document.getElementById("input-wishlist-update");
        const val = input ? input.value : "";
        try {
          wishlistBtn.disabled = true;
          wishlistBtn.textContent = "Saving...";
          await databaseService.updateWishlist(val);
          showToast("Holiday wishlist updated successfully!", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          wishlistBtn.disabled = false;
          wishlistBtn.textContent = "Update Wishlist";
        }
      });
    }
    const journeyBtn = document.getElementById("btn-start-train-journey");
    if (journeyBtn) {
      journeyBtn.addEventListener("click", async () => {
        try {
          const participantPayload = {
            ...participant,
            hasRevealedName: Boolean(hasRevealed),
            assignedRecipient: assignedRecipient || null
          };
          await trainJourney.startJourney(participantPayload, () => {
            renderDashboard(container, currentUser);
          });
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }
  }

  // src/components/adminPanel.js
  async function renderAdminPanel(container, currentUser) {
    let dashboardData;
    let participants = [];
    try {
      const [dashRes, partsRes] = await Promise.all([
        databaseService.getAdminDashboard(),
        databaseService.getParticipants()
      ]);
      dashboardData = dashRes;
      participants = partsRes || [];
    } catch (err) {
      showToast(err.message, "error");
      dashboardData = {
        stats: {
          totalParticipants: 0,
          revealedCount: 0,
          event: { registrationStatus: "open", eventStatus: "pending", drawGenerated: false, drawLocked: false }
        }
      };
    }
    const { stats } = dashboardData;
    const event = stats.event || {};
    const count = stats.totalParticipants || 0;
    const canCloseReg = event.registrationStatus === "open" && count >= 2;
    const canGenerateDraw = event.registrationStatus === "closed" && !event.drawLocked && count >= 2;
    const canLockDraw = event.drawGenerated && !event.drawLocked && count >= 2;
    const canStartEvent = event.drawLocked && event.eventStatus !== "active" && event.eventStatus !== "ended";
    container.innerHTML = `
    <div class="admin-section">
      <!-- Admin Header -->
      <div class="admin-header-row">
        <div class="admin-header-title">
          <div style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; color: var(--color-gold-champagne);">
            \u{1F682} The Evergreen Express \u2022 Management Terminal
          </div>
          <h1 style="margin: 0.25rem 0;">Administrator Control Room</h1>
          <span class="admin-shield-badge">Master Conductor \u2022 Logged in as ${currentUser.name || "Admin"}</span>
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
          <div style="font-size: 11px; color: ${count >= 2 ? "#86efac" : "#fca5a5"}; margin-top: 4px;">
            ${count >= 2 ? "\u2713 Minimum 2 met for Secret Santa draw" : "\u26A0\uFE0F Need at least 2 to generate draw"}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Registration Status</div>
          <div class="metric-value ${event.registrationStatus === "open" ? "status-open" : "status-closed"}">
            ${(event.registrationStatus || "OPEN").toUpperCase()}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${event.registrationStatus === "open" ? "Step 1: Open for registrations" : "Step 1: Registration Closed"}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Secret Santa Draw</div>
          <div class="metric-value" style="color: ${event.drawLocked ? "#86efac" : event.drawGenerated ? "#fde047" : "#94a3b8"};">
            ${event.drawLocked ? "LOCKED" : event.drawGenerated ? "UNLOCKED" : "PENDING"}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${event.drawLocked ? "\u2713 Steps 2 & 3 Completed" : event.drawGenerated ? "Step 3: Ready to Lock" : "Step 2: Awaiting Draw"}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Reveal Progress</div>
          <div class="metric-value" style="color: #60a5fa;">
            ${stats.revealedCount || 0} / ${count}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${event.eventStatus === "active" ? "\u{1F7E2} Event is actively LIVE" : "\u26AA Waiting for departure"}
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
          ${event.registrationStatus === "open" ? `
            <button id="btn-admin-close-reg" class="btn btn-secondary" ${!canCloseReg ? `disabled title="${count < 2 ? "At least 2 verified participants required to close registration" : "Registration is closed"}"` : ""}>
              1. Close Registration \u{1F512}
            </button>
          ` : `
            ${!event.drawLocked ? `
              <button id="btn-admin-open-reg" class="btn btn-secondary" style="border-color: #f59e0b; color: #fbbf24;">
                Re-open Registration \u{1F513}
              </button>
            ` : `
              <button class="btn btn-secondary" disabled style="opacity: 0.8; color: #86efac; border-color: #22c55e;">
                \u2713 1. Registration Closed
              </button>
            `}
          `}

          <!-- STEP 2: Generate Secret Santa Draw -->
          ${!event.drawLocked ? `
            <button id="btn-admin-generate-draw" class="btn btn-primary" ${!canGenerateDraw ? `disabled title="${event.registrationStatus !== "closed" ? "Close registration first before generating the draw" : count < 2 ? "At least 2 verified participants required" : "Draw is already locked"}"` : ""}>
              ${event.drawGenerated ? "2. Regenerate Draw \u{1F3B2}" : "2. Generate Secret Santa Draw \u{1F3B2}"}
            </button>
          ` : `
            <button class="btn btn-secondary" disabled style="opacity: 0.8; color: #86efac; border-color: #22c55e;">
              \u2713 2. Draw Generated (${count} Pairs)
            </button>
          `}

          <!-- STEP 3: Lock Secret Santa Draw -->
          ${!event.drawLocked ? `
            <button id="btn-admin-lock-draw" class="btn btn-gold" ${!canLockDraw ? `disabled title="${!event.drawGenerated ? "Generate draw first before locking" : "Ready to lock"}"` : ""} style="box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);">
              3. Lock Secret Santa Draw \u{1F512}
            </button>
          ` : `
            <button class="btn btn-secondary" disabled style="opacity: 0.8; color: #86efac; border-color: #22c55e;">
              \u2713 3. Draw Permanently Locked
            </button>
          `}

          <!-- NOTIFY PARTICIPANTS -->
          <button id="btn-admin-notify-participants" class="btn btn-secondary" style="border-color: var(--color-gold); color: #fef08a; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 0 12px rgba(212, 175, 55, 0.25);">
            \u{1F384} NOTIFY PARTICIPANTS
          </button>

          <!-- STEP 4: Start The Evergreen Express -->
          ${event.eventStatus !== "active" ? `
            <button id="btn-admin-start-event" class="btn btn-crimson" ${!canStartEvent ? `disabled title="${!event.drawLocked ? "Lock draw first before starting the event" : "Event ended"}"` : ""} style="font-weight: 700; letter-spacing: 1px;">
              4. \u25B6 START THE EVERGREEN EXPRESS
            </button>
          ` : `
            <button id="btn-admin-end-event" class="btn btn-secondary" style="border-color: #ef4444; color: #fca5a5;">
              \u23F9 End Celebration
            </button>
          `}

          <!-- View Pairings Modal Button -->
          <button id="btn-admin-view-pairings" class="btn btn-secondary" ${!event.drawGenerated ? 'disabled title="Generate draw first to view pairings"' : ""} style="margin-left: auto;">
            View All Secret Pairings \u{1F441}\uFE0F
          </button>
        </div>
      </div>

      <!-- Faculty Registrations Table Section -->
      <div class="card" style="margin-top: 2rem; padding: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3 style="margin: 0;">Registered Faculty Roster (${participants.length})</h3>
            <span style="font-size: 12px; color: #94a3b8;">Dynamically loaded from Supabase \u2022 Supports any faculty count (min. 2)</span>
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
              ` : participants.map((p) => `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                  <td style="padding: 0.75rem; font-family: monospace; font-weight: 700; color: var(--color-gold-champagne);">${p.participant_id}</td>
                  <td style="padding: 0.75rem; font-weight: 600; color: #ffffff;">${p.full_name}</td>
                  <td style="padding: 0.75rem; color: #cbd5e1;">${p.email}</td>
                  <td style="padding: 0.75rem; color: #94a3b8;">${p.department || "\u2014"}</td>
                  <td style="padding: 0.75rem; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.gift_preference || ""}">
                    ${p.gift_preference || "\u2014"}
                  </td>
                  <td style="padding: 0.75rem;">
                    ${p.has_revealed ? `
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); color: #86efac; font-size: 11px;">
                        \u2713 Revealed (${p.reveal_count || 1}x)
                      </span>
                    ` : `
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: rgba(148, 163, 184, 0.15); color: #94a3b8; font-size: 11px;">
                        Pending
                      </span>
                    `}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TASK 4: DEDICATED RESET DATABASE SECTION -->
      <div class="card" style="margin-top: 2rem; padding: 1.75rem; border: 1px solid rgba(239, 68, 68, 0.4); background: radial-gradient(circle at top left, rgba(239, 68, 68, 0.08) 0%, rgba(15, 28, 56, 0.95) 100%); border-radius: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span style="font-size: 1.25rem;">\u26A0\uFE0F</span>
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
            Open Reset Database Panel \u2699\uFE0F
          </button>
        </div>
      </div>
    </div>
  `;
    document.getElementById("btn-admin-logout").onclick = async () => {
      await authService.logout();
      showToast("Administrator logged out.", "info");
    };
    const searchInput = document.getElementById("admin-search-roster");
    if (searchInput) {
      searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const rows = document.querySelectorAll("#admin-roster-tbody tr");
        rows.forEach((row) => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(q) ? "" : "none";
        });
      };
    }
    const closeRegBtn = document.getElementById("btn-admin-close-reg");
    if (closeRegBtn) {
      closeRegBtn.onclick = async () => {
        if (!confirm(`Close registration for The Evergreen Express? Current eligible participants: ${count}. Once closed, you can generate the Secret Santa draw.`)) {
          return;
        }
        try {
          closeRegBtn.disabled = true;
          closeRegBtn.textContent = "Closing Registration...";
          const res = await databaseService.closeRegistration();
          showToast(res.message, "success");
          renderAdminPanel(container, currentUser);
        } catch (err) {
          showToast(err.message, "error");
          closeRegBtn.disabled = false;
          closeRegBtn.textContent = "1. Close Registration \u{1F512}";
        }
      };
    }
    const openRegBtn = document.getElementById("btn-admin-open-reg");
    if (openRegBtn) {
      openRegBtn.onclick = async () => {
        try {
          openRegBtn.disabled = true;
          openRegBtn.textContent = "Opening...";
          const res = await databaseService.openRegistration();
          showToast(res.message, "success");
          renderAdminPanel(container, currentUser);
        } catch (err) {
          showToast(err.message, "error");
          openRegBtn.disabled = false;
          openRegBtn.textContent = "Re-open Registration \u{1F513}";
        }
      };
    }
    const generateDrawBtn = document.getElementById("btn-admin-generate-draw");
    if (generateDrawBtn) {
      generateDrawBtn.onclick = async () => {
        if (!confirm(`Generate Secret Santa assignments for all ${count} verified participants? Every participant will be assigned exactly one recipient in a full derangement cycle with zero self-assignments.`)) {
          return;
        }
        try {
          generateDrawBtn.disabled = true;
          generateDrawBtn.textContent = "Generating Derangement...";
          const res = await databaseService.generateDraw();
          showToast(res.message, "success");
          renderAdminPanel(container, currentUser);
        } catch (err) {
          showToast(err.message, "error");
          generateDrawBtn.disabled = false;
          generateDrawBtn.textContent = "2. Generate Secret Santa Draw \u{1F3B2}";
        }
      };
    }
    const lockDrawBtn = document.getElementById("btn-admin-lock-draw");
    if (lockDrawBtn) {
      lockDrawBtn.onclick = async () => {
        if (!confirm("Lock the Secret Santa draw permanently? Once locked, assignments cannot be regenerated and participants will receive these pairings when the journey begins.")) {
          return;
        }
        try {
          lockDrawBtn.disabled = true;
          lockDrawBtn.textContent = "Locking Assignments...";
          const res = await databaseService.lockDraw();
          showToast(res.message, "success");
          renderAdminPanel(container, currentUser);
        } catch (err) {
          showToast(err.message, "error");
          lockDrawBtn.disabled = false;
          lockDrawBtn.textContent = "3. Lock Secret Santa Draw \u{1F512}";
        }
      };
    }
    const notifyParticipantsBtn = document.getElementById("btn-admin-notify-participants");
    if (notifyParticipantsBtn) {
      notifyParticipantsBtn.onclick = () => {
        showNotificationModal(currentUser);
      };
    }
    const startEventBtn = document.getElementById("btn-admin-start-event");
    if (startEventBtn) {
      startEventBtn.onclick = async () => {
        if (!confirm("Start THE EVERGREEN EXPRESS? The event will become LIVE immediately and all registered faculty members will be able to access the Christmas Express and reveal their recipient.")) {
          return;
        }
        try {
          startEventBtn.disabled = true;
          startEventBtn.textContent = "Departing Station...";
          const res = await databaseService.startEvent();
          showToast(res.message, "success");
          renderAdminPanel(container, currentUser);
        } catch (err) {
          showToast(err.message, "error");
          startEventBtn.disabled = false;
          startEventBtn.textContent = "4. \u25B6 START THE EVERGREEN EXPRESS";
        }
      };
    }
    const endEventBtn = document.getElementById("btn-admin-end-event");
    if (endEventBtn) {
      endEventBtn.onclick = async () => {
        if (!confirm("Conclude the Secret Santa celebration?")) return;
        try {
          endEventBtn.disabled = true;
          endEventBtn.textContent = "Ending Event...";
          const res = await databaseService.endEvent();
          showToast(res.message, "info");
          renderAdminPanel(container, currentUser);
        } catch (err) {
          showToast(err.message, "error");
          endEventBtn.disabled = false;
          endEventBtn.textContent = "\u23F9 End Celebration";
        }
      };
    }
    const viewPairingsBtn = document.getElementById("btn-admin-view-pairings");
    if (viewPairingsBtn) {
      viewPairingsBtn.onclick = async () => {
        try {
          viewPairingsBtn.disabled = true;
          const data = await databaseService.getAssignments();
          viewPairingsBtn.disabled = false;
          showPairingsModal(data.assignments);
        } catch (err) {
          viewPairingsBtn.disabled = false;
          showToast(err.message, "error");
        }
      };
    }
    const resetBtn = document.getElementById("btn-admin-reset-trigger");
    if (resetBtn) {
      resetBtn.onclick = () => {
        showResetModal(event, () => renderAdminPanel(container, currentUser));
      };
    }
  }
  function showPairingsModal(assignments) {
    let modal = document.getElementById("pairings-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "pairings-modal";
      modal.className = "modal-backdrop active";
      document.body.appendChild(modal);
    }
    modal.classList.add("active");
    modal.innerHTML = `
    <div class="modal-window" style="max-width: 760px; max-height: 85vh; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin: 0;">Secret Santa Assignments List</h2>
          <span style="font-size: 12px; color: #f87171;">CONFIDENTIAL \u2022 Strictly for Administration</span>
        </div>
        <button id="btn-close-pairings" class="modal-close-btn">&times;</button>
      </div>

      <div style="overflow-y: auto; flex: 1;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(212, 175, 55, 0.3); color: var(--color-gold-champagne);">
              <th style="padding: 0.6rem;">Giver (Secret Santa)</th>
              <th style="padding: 0.6rem; text-align: center;">\u2192</th>
              <th style="padding: 0.6rem;">Recipient</th>
              <th style="padding: 0.6rem;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${assignments.length === 0 ? `
              <tr><td colspan="4" style="text-align: center; padding: 2rem; color: #94a3b8;">No assignments generated yet.</td></tr>
            ` : assignments.map((a) => `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 0.6rem;">
                  <strong>${a.giver_name}</strong> <span style="font-family: monospace; color: var(--color-gold-champagne);">(${a.giver_id})</span>
                </td>
                <td style="padding: 0.6rem; text-align: center; color: var(--color-gold-champagne);">\u2794</td>
                <td style="padding: 0.6rem;">
                  <strong>${a.recipient_name}</strong> <span style="font-family: monospace; color: var(--color-gold-champagne);">(${a.recipient_id})</span>
                </td>
                <td style="padding: 0.6rem;">
                  ${a.is_revealed ? '<span style="color: #4ade80;">\u2713 Revealed</span>' : '<span style="color: #94a3b8;">Unrevealed</span>'}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem; text-align: right;">
        <button id="btn-print-pairings" class="btn btn-secondary" style="margin-right: 0.5rem;">Print Roster \u{1F5A8}\uFE0F</button>
        <button id="btn-dismiss-pairings" class="btn btn-primary">Done</button>
      </div>
    </div>
  `;
    document.getElementById("btn-close-pairings").onclick = () => modal.classList.remove("active");
    document.getElementById("btn-dismiss-pairings").onclick = () => modal.classList.remove("active");
    document.getElementById("btn-print-pairings").onclick = () => window.print();
  }
  function showResetModal(eventState, onResetSuccess) {
    let modal = document.getElementById("reset-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "reset-modal";
      modal.className = "modal-backdrop active";
      document.body.appendChild(modal);
    }
    const isLive = eventState && eventState.eventStatus === "active";
    modal.classList.add("active");
    modal.innerHTML = `
    <div class="modal-window" style="max-width: 520px; border: 2px solid #ef4444; background: radial-gradient(circle at top, #1e1b2e 0%, #0c0a17 100%);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h2 style="color: #ef4444; margin: 0; font-size: 1.4rem;">\u26A0\uFE0F Reset Database & Event</h2>
        <button id="btn-close-reset-modal" class="modal-close-btn">&times;</button>
      </div>

      ${isLive ? `
        <div style="background: rgba(239, 68, 68, 0.2); border-left: 4px solid #ef4444; padding: 12px 14px; border-radius: 6px; margin-bottom: 1.25rem;">
          <strong style="color: #fca5a5;">\u26D4 RESET NOT PERMITTED WHILE EVENT IS LIVE</strong>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #fecaca;">
            The Evergreen Express is currently active. To prevent accidental disruption to participants, you must first click <strong>"End Celebration"</strong> before performing a reset.
          </p>
        </div>
      ` : `
        <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 6px; margin-bottom: 1.25rem;">
          <strong style="color: #fde047; font-size: 13px;">\u{1F6E1}\uFE0F Automated Safety Snapshot Enabled</strong>
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
          <input type="password" id="reset-admin-pwd" class="form-input" placeholder="Enter admin password to authorize" ${isLive ? "disabled" : ""} />
          <button type="button" class="password-toggle-btn" id="toggle-reset-admin-pwd" aria-label="Show password" title="Show password" ${isLive ? "disabled" : ""}>
            ${EYE_ICONS.show}
          </button>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label class="form-label" style="font-size: 12px;">
          Type confirmation phrase <code style="color: #f87171; background: rgba(239, 68, 68, 0.2); padding: 2px 6px; border-radius: 4px;">RESET_CONFIRM_EVERGREEN</code>:
        </label>
        <input type="text" id="reset-confirm-code" class="form-input" placeholder="RESET_CONFIRM_EVERGREEN" ${isLive ? "disabled" : ""} />
      </div>

      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="btn-cancel-reset" class="btn btn-secondary">Cancel</button>
        <button id="btn-execute-reset" class="btn btn-crimson" ${isLive ? "disabled" : ""}>
          Confirm & Execute Safe Reset \u26A0\uFE0F
        </button>
      </div>

      <!-- Verified Snapshots & Restoration Store -->
      <div id="reset-backups-container"></div>
    </div>
  `;
    document.getElementById("btn-close-reset-modal").onclick = () => modal.classList.remove("active");
    document.getElementById("btn-cancel-reset").onclick = () => modal.classList.remove("active");
    setupPasswordToggle("toggle-reset-admin-pwd", "reset-admin-pwd");
    const loadSnapshots = async () => {
      try {
        const backups = await databaseService.getBackups();
        const backupListContainer = document.getElementById("reset-backups-container");
        if (!backupListContainer) return;
        backupListContainer.innerHTML = `
        <div style="margin-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-gold-champagne); font-weight: 600;">
              \u{1F4E6} Available Verified Snapshots (${backups.length})
            </div>
            <button id="btn-save-manual-snapshot" class="btn btn-secondary" style="padding: 3px 8px; font-size: 11px;" ${isLive ? "disabled" : ""}>
              + Save New Snapshot \u{1F4BE}
            </button>
          </div>
          ${backups.length === 0 ? `
            <div style="font-size: 12px; color: #94a3b8; text-align: center; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 6px;">
              No snapshots saved yet. Click "+ Save New Snapshot" to capture current database state.
            </div>
          ` : `
            <div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
              ${backups.map((b) => {
          const pairsText = b.total_assignments !== null ? `${b.total_assignments} pairs` : "Pairs not included";
          const facultyText = b.total_participants !== null ? `${b.total_participants} faculty` : "Faculty not included";
          return `
                  <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
                    <div>
                      <span style="font-family: monospace; color: var(--color-gold-light); font-weight: 700;">#${b.id.slice(0, 8)}</span>
                      <span style="color: #94a3b8; margin-left: 6px;">${new Date(b.created_at).toLocaleString()}</span>
                      <span style="color: #cbd5e1; margin-left: 6px;">(${pairsText}, ${facultyText})</span>
                    </div>
                    <button class="btn btn-secondary btn-restore-snapshot" data-backup-id="${b.id}" style="padding: 3px 8px; font-size: 11px;" ${isLive ? "disabled" : ""}>
                      Restore \u{1F504}
                    </button>
                  </div>
                `;
        }).join("")}
            </div>
          `}
        </div>
      `;
        const saveBtn = document.getElementById("btn-save-manual-snapshot");
        if (saveBtn) {
          saveBtn.onclick = async () => {
            try {
              saveBtn.disabled = true;
              saveBtn.textContent = "Saving Snapshot...";
              const res = await databaseService.createBackup();
              showToast(res.message, "success");
              await loadSnapshots();
            } catch (e) {
              showToast(e.message, "error");
              saveBtn.disabled = false;
              saveBtn.textContent = "+ Save New Snapshot \u{1F4BE}";
            }
          };
        }
        backupListContainer.querySelectorAll(".btn-restore-snapshot").forEach((btn) => {
          btn.onclick = async () => {
            const backupId = btn.getAttribute("data-backup-id");
            const pwd = prompt("Enter your Administrator Password to confirm restoring snapshot #" + backupId.slice(0, 8) + ":");
            if (!pwd) return;
            try {
              btn.disabled = true;
              btn.textContent = "Restoring...";
              const res = await databaseService.restoreBackup(backupId, pwd);
              showToast(res.message, "success");
              modal.classList.remove("active");
              if (onResetSuccess) onResetSuccess();
            } catch (e) {
              showToast(e.message, "error");
              btn.disabled = false;
              btn.textContent = "Restore \u{1F504}";
            }
          };
        });
      } catch (e) {
        console.warn("Backup fetch notice:", e);
      }
    };
    loadSnapshots();
    const executeBtn = document.getElementById("btn-execute-reset");
    if (executeBtn && !isLive) {
      executeBtn.onclick = async () => {
        const pwd = document.getElementById("reset-admin-pwd").value.trim();
        const code = document.getElementById("reset-confirm-code").value.trim();
        const resetParticipants = document.getElementById("reset-include-participants").checked;
        if (!pwd) {
          showToast("Please enter your administrator password.", "error");
          return;
        }
        if (code !== "RESET_CONFIRM_EVERGREEN") {
          showToast("Please type RESET_CONFIRM_EVERGREEN exactly to confirm.", "error");
          return;
        }
        try {
          executeBtn.disabled = true;
          executeBtn.textContent = "Executing Safe Reset...";
          const res = await databaseService.confirmReset(pwd, code, resetParticipants);
          showToast(res.message, "success");
          modal.classList.remove("active");
          if (onResetSuccess) onResetSuccess();
        } catch (err) {
          showToast(err.message, "error");
          executeBtn.disabled = false;
          executeBtn.textContent = "Confirm & Execute Safe Reset \u26A0\uFE0F";
        }
      };
    }
  }
  async function showNotificationModal(currentUser) {
    let modal = document.getElementById("admin-notify-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "admin-notify-modal";
      modal.className = "modal-backdrop active";
      document.body.appendChild(modal);
    }
    modal.classList.add("active");
    modal.innerHTML = `
    <div class="modal-window" style="max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(212, 175, 55, 0.3); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div>
          <h2 style="font-family: var(--font-display); color: var(--color-gold-champagne); margin: 0; font-size: 1.4rem;">
            \u{1F384} Notify Registered Participants
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
    document.getElementById("btn-close-notify-modal").onclick = () => modal.classList.remove("active");
    let data;
    try {
      data = await databaseService.getAnnouncementStatus();
    } catch (err) {
      const content = document.getElementById("notify-modal-content");
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
    let activeTab = "preview";
    let isSending = false;
    let sentList = /* @__PURE__ */ new Set();
    let failedMap = /* @__PURE__ */ new Map();
    const renderModalBody = () => {
      const content = document.getElementById("notify-modal-content");
      if (!content) return;
      content.innerHTML = `
      <!-- Status & Notice Banner -->
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
        <div style="flex: 1; min-width: 240px; background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 8px; padding: 0.75rem 1rem;">
          <div style="font-size: 11px; text-transform: uppercase; color: #fef08a; font-weight: 700; letter-spacing: 1px;">
            Eligible Recipients
          </div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin-top: 2px;">
            ${eligibleCount} <span style="font-size: 0.85rem; font-weight: 400; color: #cbd5e1;">Verified Faculty Member${eligibleCount === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div style="flex: 1; min-width: 240px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 0.75rem 1rem;">
          <div style="font-size: 11px; text-transform: uppercase; color: #86efac; font-weight: 700; letter-spacing: 1px;">
            Email Delivery Integration
          </div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #ffffff; margin-top: 4px;">
            Live Event Notification (Gmail SMTP) \u2709\uFE0F
          </div>
        </div>
      </div>

      ${lastAnnouncement ? `
        <div style="background: rgba(245, 158, 11, 0.12); border-left: 4px solid #f59e0b; border-radius: 6px; padding: 10px 14px; margin-bottom: 1.25rem; font-size: 12px; color: #fde047;">
          <strong>\u{1F514} Previous Notification Broadcast:</strong> Sent on ${new Date(lastAnnouncement.sentAt).toLocaleString()} (${lastAnnouncement.details?.sent || 0} delivered, ${lastAnnouncement.details?.failed || 0} failed).
        </div>
      ` : ""}

      <!-- Navigation Tabs -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 1rem;">
        <button id="tab-btn-preview" class="btn btn-secondary" style="border-radius: 6px 6px 0 0; padding: 0.5rem 1rem; font-size: 13px; border-bottom: none; ${activeTab === "preview" ? "background: rgba(212, 175, 55, 0.2); border-color: var(--color-gold); color: #fef08a;" : "opacity: 0.7;"}">
          \u2709\uFE0F Email Preview
        </button>
        <button id="tab-btn-roster" class="btn btn-secondary" style="border-radius: 6px 6px 0 0; padding: 0.5rem 1rem; font-size: 13px; border-bottom: none; ${activeTab === "roster" ? "background: rgba(212, 175, 55, 0.2); border-color: var(--color-gold); color: #fef08a;" : "opacity: 0.7;"}">
          \u{1F465} Recipients Roster (${participants.length})
        </button>
      </div>

      <!-- Tab Content: Preview -->
      <div id="tab-content-preview" style="${activeTab === "preview" ? "display: block;" : "display: none;"}">
        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 14px; margin-bottom: 1rem; font-size: 13px;">
          <div style="color: #94a3b8; margin-bottom: 4px;"><strong>Subject:</strong> <span style="color: #fef08a;">${preview.subject}</span></div>
          <div style="color: #94a3b8;"><strong>Sample Recipient:</strong> ${preview.sampleRecipient.fullName} (<code style="color: #fef08a;">${preview.sampleRecipient.participantId}</code>)</div>
        </div>

        <div style="border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 8px; overflow: hidden; background: #050a16; margin-bottom: 1.25rem;">
          <iframe id="announcement-preview-frame" style="width: 100%; height: 380px; border: none; background: #050a16;"></iframe>
        </div>

        <!-- Send Test Email -->
        <div style="display: flex; gap: 0.5rem; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 14px; margin-bottom: 1.25rem;">
          <span style="font-size: 12px; color: #cbd5e1; white-space: nowrap;">Send sample test email to:</span>
          <input type="email" id="input-test-email" class="form-input" placeholder="e.g. your-email@gmail.com" style="padding: 0.4rem 0.75rem; font-size: 12px; flex: 1;" />
          <button id="btn-send-test-email" class="btn btn-secondary" style="font-size: 12px; padding: 0.45rem 0.85rem; white-space: nowrap;">
            Send Test \u2709\uFE0F
          </button>
        </div>
      </div>

      <!-- Tab Content: Recipients Roster -->
      <div id="tab-content-roster" style="${activeTab === "roster" ? "display: block;" : "display: none;"}">
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
              ${participants.map((p) => {
        const isSent = sentList.has(p.participantId);
        const isFailed = failedMap.has(p.participantId);
        let statusBadge = '<span style="color: #94a3b8;">Pending</span>';
        if (isSent) {
          statusBadge = '<span style="color: #4ade80; font-weight: 600;">\u2713 Delivered</span>';
        } else if (isFailed) {
          statusBadge = `<span style="color: #ef4444; font-weight: 600;" title="${failedMap.get(p.participantId)}">\u2715 Failed</span>`;
        }
        return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 0.5rem 0.75rem; font-family: monospace; color: #fef08a; font-weight: 700;">${p.participantId}</td>
                    <td style="padding: 0.5rem 0.75rem; font-weight: 500;">${p.fullName}</td>
                    <td style="padding: 0.5rem 0.75rem; color: #cbd5e1;">${p.email}</td>
                    <td id="status-badge-${p.participantId}" style="padding: 0.5rem 0.75rem;">${statusBadge}</td>
                  </tr>
                `;
      }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Live Progress Bar (when sending) -->
      <div id="notify-progress-area" style="display: ${isSending ? "block" : "none"}; margin-bottom: 1.25rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 16px;">
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
          ${eligibleCount === 0 ? "No eligible participants found." : `Ready to notify ${eligibleCount} registered faculty member${eligibleCount === 1 ? "" : "s"}.`}
        </div>

        <div style="display: flex; gap: 0.65rem;">
          <button id="btn-cancel-notify" class="btn btn-secondary" ${isSending ? "disabled" : ""}>
            ${sentList.size > 0 ? "Close" : "Cancel"}
          </button>

          ${failedMap.size > 0 && !isSending ? `
            <button id="btn-retry-failed-notify" class="btn btn-crimson" style="font-weight: 600;">
              \u{1F504} Retry Failed Emails (${failedMap.size})
            </button>
          ` : ""}

          ${!isSending && sentList.size < participants.length && eligibleCount > 0 ? `
            <button id="btn-confirm-send-notify" class="btn btn-primary" style="background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #050a16; font-weight: 700;">
              \u{1F680} Confirm & Send to All (${participants.length})
            </button>
          ` : ""}
        </div>
      </div>
    `;
      const previewFrame = document.getElementById("announcement-preview-frame");
      if (previewFrame && preview?.html) {
        previewFrame.srcdoc = preview.html;
      }
      document.getElementById("tab-btn-preview").onclick = () => {
        activeTab = "preview";
        renderModalBody();
      };
      document.getElementById("tab-btn-roster").onclick = () => {
        activeTab = "roster";
        renderModalBody();
      };
      document.getElementById("btn-cancel-notify").onclick = () => modal.classList.remove("active");
      const testBtn = document.getElementById("btn-send-test-email");
      if (testBtn) {
        testBtn.onclick = async () => {
          const testInput = document.getElementById("input-test-email");
          const testEmail = (testInput?.value || "").trim();
          if (!testEmail || !testEmail.includes("@")) {
            showToast("Please enter a valid email address to receive the test email.", "error");
            return;
          }
          testBtn.disabled = true;
          testBtn.textContent = "Sending Test...";
          try {
            const res = await databaseService.sendAnnouncementSingle(null, testEmail);
            if (res.success) {
              showToast(`Test announcement delivered to ${testEmail}! Check your inbox.`, "success");
            } else {
              showToast(`Test failed: ${res.error || "Delivery failed"}`, "error");
            }
          } catch (e) {
            showToast(`Test error: ${e.message}`, "error");
          } finally {
            testBtn.disabled = false;
            testBtn.textContent = "Send Test \u2709\uFE0F";
          }
        };
      }
      const confirmBtn = document.getElementById("btn-confirm-send-notify");
      if (confirmBtn) {
        confirmBtn.onclick = () => startBulkDispatch(participants);
      }
      const retryBtn = document.getElementById("btn-retry-failed-notify");
      if (retryBtn) {
        retryBtn.onclick = () => {
          const failedParticipants = participants.filter((p) => failedMap.has(p.participantId));
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
      activeTab = "roster";
      renderModalBody();
      const progressArea = document.getElementById("notify-progress-area");
      const progressBar = document.getElementById("notify-progress-bar");
      const progressText = document.getElementById("notify-progress-text");
      const progressPercent = document.getElementById("notify-progress-percent");
      if (progressArea) progressArea.style.display = "block";
      let current = 0;
      const total = targetParticipants.length;
      for (const p of targetParticipants) {
        current++;
        const pct = Math.round(current / total * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressText) progressText.textContent = `Sending ${current} of ${total}: ${p.fullName} (${p.participantId})...`;
        try {
          const res = await databaseService.sendAnnouncementSingle(p.participantId);
          if (res.success) {
            sentList.add(p.participantId);
            failedMap.delete(p.participantId);
            const badge = document.getElementById(`status-badge-${p.participantId}`);
            if (badge) badge.innerHTML = '<span style="color: #4ade80; font-weight: 600;">\u2713 Delivered</span>';
          } else {
            failedMap.set(p.participantId, res.error || "Delivery failed");
            const badge = document.getElementById(`status-badge-${p.participantId}`);
            if (badge) badge.innerHTML = `<span style="color: #ef4444; font-weight: 600;" title="${res.error}">\u2715 Failed</span>`;
          }
        } catch (err) {
          failedMap.set(p.participantId, err.message);
          const badge = document.getElementById(`status-badge-${p.participantId}`);
          if (badge) badge.innerHTML = `<span style="color: #ef4444; font-weight: 600;" title="${err.message}">\u2715 Failed</span>`;
        }
      }
      isSending = false;
      try {
        await databaseService.logAnnouncementBatch({
          total: targetParticipants.length,
          sent: targetParticipants.length - failedMap.size,
          failed: failedMap.size
        });
      } catch (e) {
        console.warn("Could not log batch audit:", e.message);
      }
      showToast(`Bulk notification completed: ${sentList.size} delivered, ${failedMap.size} failed.`, failedMap.size === 0 ? "success" : "info");
      renderModalBody();
    };
    renderModalBody();
  }

  // src/components/departmentCredit.js
  var DEPARTMENT_CREDIT_TEXT = "Department of Computer Science";
  function initDepartmentCredit() {
    let creditEl = document.getElementById("department-credit");
    if (!creditEl) {
      creditEl = document.createElement("aside");
      creditEl.id = "department-credit";
      creditEl.className = "department-credit";
      creditEl.setAttribute("aria-label", "Department of Computer Science");
      creditEl.innerHTML = `<span class="department-credit-text">${DEPARTMENT_CREDIT_TEXT}</span>`;
      const appEl = document.getElementById("app") || document.body;
      appEl.appendChild(creditEl);
    }
    return creditEl;
  }

  // src/main.js
  function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span>${type === "success" ? "\u2713" : type === "error" ? "\u26A0" : "\u2139"}</span>
    <div>${message}</div>
  `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("hiding");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4200);
  }
  var AppCoordinator = class {
    constructor() {
      this.mainContent = document.getElementById("main-content");
      this.soundToggleBtn = document.getElementById("sound-toggle");
      this.soundBtnText = document.getElementById("sound-btn-text");
      this.collegeLogoBtn = document.getElementById("college-brand-logo");
      this.headerUserSlot = document.getElementById("header-user-slot");
      this.santaSleigh = document.getElementById("santa-sleigh");
      this.snowEngine = null;
      this.starsEngine = null;
    }
    init() {
      initDepartmentCredit();
      this.snowEngine = new SnowEngine("snow-canvas");
      this.starsEngine = new SkyStarsEngine("stars-canvas");
      window.__evergreenSnowEngine = this.snowEngine;
      window.__evergreenStarsEngine = this.starsEngine;
      this.initSoundControls();
      this.initSantaFlight();
      if (this.collegeLogoBtn) {
        this.collegeLogoBtn.addEventListener("click", () => {
          const user = authService.getCurrentUser();
          if (user && user.role === "admin") {
            this.renderView(user);
          } else {
            openAuthModal("admin");
          }
        });
      }
      trainJourney.init();
      authService.subscribeAuth((user) => {
        this.updateHeaderUserStatus(user);
        this.renderView(user);
      });
      databaseService.subscribeEventState((eventState) => {
        this.onEventStateUpdate(eventState);
      });
    }
    initSoundControls() {
      if (!this.soundToggleBtn) return;
      const updateBtnUI = (active) => {
        if (active) {
          this.soundToggleBtn.classList.add("active");
          if (this.soundBtnText) this.soundBtnText.textContent = "Sound On";
        } else {
          this.soundToggleBtn.classList.remove("active");
          if (this.soundBtnText) this.soundBtnText.textContent = "Sound Off";
        }
      };
      updateBtnUI(sound.isEnabled);
      this.soundToggleBtn.addEventListener("click", () => {
        const active = sound.toggleSound();
        updateBtnUI(active);
        showToast(active ? "Atmospheric holiday audio enabled." : "Atmospheric audio muted.", "info");
      });
    }
    initSantaFlight() {
      if (!this.santaSleigh) return;
      const triggerFlight = () => {
        this.santaSleigh.classList.remove("in-flight");
        void this.santaSleigh.offsetWidth;
        this.santaSleigh.classList.add("in-flight");
        const nextDelay = Math.random() * 12e3 + 38e3;
        setTimeout(triggerFlight, nextDelay);
      };
      setTimeout(triggerFlight, 5e3);
    }
    updateHeaderUserStatus(user) {
      if (!this.headerUserSlot) return;
      if (!user) {
        this.headerUserSlot.innerHTML = "";
        return;
      }
      if (user.role === "admin") {
        this.headerUserSlot.innerHTML = `
        <div class="user-badge" style="border-color: rgba(220, 38, 38, 0.5); color: #fca5a5;">
          <span>\u{1F6E1}</span> Admin Console
        </div>
      `;
      } else {
        this.headerUserSlot.innerHTML = `
        <div class="user-badge">
          <span>\u2744</span> ${user.name} (${user.participantNumber})
        </div>
      `;
      }
    }
    async renderView(user) {
      if (!this.mainContent) return;
      if (user && user.role === "admin") {
        await renderAdminPanel(this.mainContent, user);
      } else if (user && user.role === "faculty") {
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
            <span class="status-dot-pulse ${isRegistrationOpen ? "" : "closed"}"></span>
            <span>
              Registration: <strong style="color: ${isRegistrationOpen ? "#22c55e" : "#f59e0b"};">${isRegistrationOpen ? "OPEN" : "CLOSED"}</strong>
              \u2022 ${participants.length} Faculty Members Joined
            </span>
          </div>

          <div style="margin-top: 3.5rem; font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(254, 240, 138, 0.7);">
            Spread Joy \u2022 Share Kindness \u2022 Make It Magical
          </div>
        </div>
      </section>
    `;
      const loginBtn = document.getElementById("btn-hero-login");
      if (loginBtn) {
        loginBtn.addEventListener("click", () => openAuthModal("login"));
      }
      const regBtn = document.getElementById("btn-hero-register");
      if (regBtn) {
        regBtn.addEventListener("click", () => {
          if (isRegistrationOpen) {
            openAuthModal("register");
          } else {
            showToast("Registration is closed. Please log in with your Participant ID.", "info");
            openAuthModal("login");
          }
        });
      }
    }
    onEventStateUpdate(eventState) {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        const pill = document.querySelector(".event-status-pill");
        if (pill) {
          databaseService.getParticipants().then((p) => {
            pill.innerHTML = `
            <span class="status-dot-pulse ${eventState.registrationOpen ? "" : "closed"}"></span>
            <span>
              Registration: <strong style="color: ${eventState.registrationOpen ? "#22c55e" : "#f59e0b"};">${eventState.registrationOpen ? "OPEN" : "CLOSED"}</strong>
              \u2022 ${p.length} Faculty Members Joined
            </span>
          `;
          });
        }
      }
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    const app = new AppCoordinator();
    app.init();
  });
})();
