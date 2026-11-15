/* ==========================================================================
   DATABASE SERVICE LAYER
   Connects frontend components to the Node.js + Express + Supabase backend
   High-performance, debounced, with intelligent polling and error recovery
   ========================================================================== */

class DatabaseService {
  constructor() {
    this.eventListeners = new Set();
    this.pollInterval = null;
    this.isPollingActive = true;
    this.cachedEventState = {
      id: 'evergreen_2026',
      status: 'pending',
      registrationOpen: true,
      drawLocked: false,
    };
    this.startPolling();
  }

  startPolling() {
    const fetchState = async () => {
      // Don't poll if document is hidden (user switched tabs) or offline
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const res = await fetch('/api/participant/dashboard', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.event) {
            this.cachedEventState = {
              id: data.event.id,
              status: (data.event.status || 'pending').toUpperCase(),
              registrationOpen: data.event.registrationStatus === 'open',
              drawLocked: !!data.event.drawLocked,
              drawGenerated: !!data.event.drawGenerated,
              eventStartedAt: data.event.eventStartedAt,
            };
            this.notifyEventListeners();
          }
        }
      } catch (e) {
        // Silent network/unauthenticated fallback
      }
    };

    fetchState();
    // 30 seconds interval is responsive yet reduces database connection pressure
    this.pollInterval = setInterval(fetchState, 30000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
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
    this.eventListeners.forEach(cb => {
      try { cb(this.cachedEventState); } catch (e) { console.error(e); }
    });
  }

  async getEventState() {
    return this.cachedEventState;
  }

  /**
   * Fetches participant dashboard payload
   */
  async getDashboardData() {
    const res = await fetch('/api/participant/dashboard', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Failed to retrieve dashboard.');
    }
    return data;
  }

  /**
   * Updates gift preference / wishlist
   */
  async updateWishlist(giftPreference) {
    const res = await fetch('/api/participant/wishlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ giftPreference }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to update wishlist.');
    return data;
  }

  /**
   * STAGE 6 Reveal: Fetches assigned recipient's Participant ID (e.g. SS124)
   */
  async revealStage1RecipientId() {
    const res = await fetch('/api/reveal/stage1-recipient-id', {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to reveal recipient ID.');
    return data;
  }

  /**
   * STAGE 7 Reveal: Opens Christmas letter and reveals recipient's Full Name & details
   */
  async revealStage2RecipientIdentity() {
    const res = await fetch('/api/reveal/stage2-recipient-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to open recipient letter.');
    return data;
  }

  // ---------------------------------------------------------------------------
  // ADMIN CONTROL METHODS
  // ---------------------------------------------------------------------------

  async getAdminDashboard() {
    const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load admin statistics.');
    return data;
  }

  async getParticipants() {
    const res = await fetch('/api/admin/registrations', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.participants || [];
  }

  async getAssignments() {
    const res = await fetch('/api/admin/assignments', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load assignments.');
    return data;
  }

  /**
   * STEP 1: Closes faculty registration (enforces min 2 participants)
   */
  async closeRegistration() {
    const res = await fetch('/api/admin/registration/close', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to close registration.');
    return data;
  }

  /**
   * Re-opens faculty registration
   */
  async openRegistration() {
    const res = await fetch('/api/admin/registration/open', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to open registration.');
    return data;
  }

  async toggleRegistration() {
    const res = await fetch('/api/admin/registration/toggle', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to toggle registration.');
    return data;
  }

  /**
   * STEP 2: Generates the Secret Santa draw (unlocked)
   */
  async generateDraw() {
    const res = await fetch('/api/admin/draw/generate', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to generate Secret Santa draw.');
    return data;
  }

  /**
   * STEP 3: Permanently locks the draw
   */
  async lockDraw() {
    const res = await fetch('/api/admin/draw/lock', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to lock Secret Santa draw.');
    return data;
  }

  /**
   * STEP 4: Starts the event (LIVE)
   */
  async startEvent() {
    const res = await fetch('/api/admin/event/start', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to start event.');
    return data;
  }

  async endEvent() {
    const res = await fetch('/api/admin/event/end', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to end event.');
    return data;
  }

  async getBackups() {
    const res = await fetch('/api/admin/backups', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    return data.backups || [];
  }

  async confirmReset(adminPassword, confirmationCode, resetParticipants = false) {
    const res = await fetch('/api/admin/reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ adminPassword, confirmationCode, resetParticipants }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Database reset failed.');
    return data;
  }
}

export const databaseService = new DatabaseService();
