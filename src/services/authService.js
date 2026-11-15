/* ==========================================================================
   AUTHENTICATION SERVICE
   Connects to Node.js + Express backend session endpoints with real Supabase authentication
   ========================================================================== */

class AuthService {
  constructor() {
    this.authListeners = new Set();
    this.currentUser = null;
    this.initSession();
  }

  async initSession() {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
            role: 'faculty',
          };
          this.notifyAuthListeners();
        }
      }
    } catch (e) {
      console.warn('Session check skipped:', e.message);
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
    this.authListeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }

  /**
   * Request Email OTP for Registration
   */
  async requestRegistrationOtp(fullName, email, password, confirmPassword, giftPreference = '', department = '') {
    const res = await fetch('/api/auth/register-request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fullName,
        email,
        password,
        confirmPassword,
        giftPreference,
        department,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to request verification code.');
    }
    return data;
  }

  /**
   * Verify Email OTP and Create Participant Account
   */
  async verifyRegistrationOtp(email, otp) {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const err = new Error(data.message || 'OTP verification failed.');
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
        role: 'faculty',
      };
      this.notifyAuthListeners();
    }

    return data;
  }

  /**
   * Resend Email OTP (with 60-second cooldown enforcement)
   */
  async resendRegistrationOtp(email) {
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to resend code.');
    }
    return data;
  }

  /**
   * Faculty Registration via Backend API (Fallback)
   */
  async register(fullName, email, password, confirmPassword, giftPreference = '', department = '') {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        fullName,
        email,
        password,
        confirmPassword,
        giftPreference,
        department,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Registration failed. Please check your details.');
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
        role: 'faculty',
      };
      this.notifyAuthListeners();
    }

    return data;
  }

  /**
   * Faculty Login using Participant ID (e.g. SS101) & Password
   */
  async login(participantId, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ participantId, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invalid Participant ID or Password.');
    }

    this.currentUser = {
      id: data.user.id,
      participantId: data.user.participantId,
      participantNumber: data.user.participantId,
      name: data.user.fullName,
      email: data.user.email,
      department: data.user.department,
      giftPreference: data.user.giftPreference,
      role: 'faculty',
    };

    this.notifyAuthListeners();
    return this.currentUser;
  }

  /**
   * Admin Login
   */
  async adminLogin(username, password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invalid Administrator credentials.');
    }

    this.currentUser = {
      id: data.admin.id,
      name: data.admin.username,
      username: data.admin.username,
      role: 'admin',
    };

    this.notifyAuthListeners();
    return this.currentUser;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      const endpoint = (this.currentUser && this.currentUser.role === 'admin') 
        ? '/api/admin/logout' 
        : '/api/auth/logout';
      await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Logout request warning:', e);
    }

    this.currentUser = null;
    this.notifyAuthListeners();
  }
}

export const authService = new AuthService();
