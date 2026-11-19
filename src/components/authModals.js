/* ==========================================================================
   AUTHENTICATION MODALS (LOGIN, REGISTER, EMAIL OTP VERIFICATION, SUCCESS, ADMIN)
   Features secure email OTP verification with countdown timer & Gmail SMTP integration
   ========================================================================== */

import { authService } from '../services/authService.js';
import { showToast } from '../main.js';

export const EYE_ICONS = {
  show: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
  hide: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`
};

export function setupPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = isPassword ? EYE_ICONS.hide : EYE_ICONS.show;
    btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    btn.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
  };
}

let resendInterval = null;

export function openAuthModal(mode = 'login', prefilledId = '') {
  let modalBackdrop = document.getElementById('auth-modal-backdrop');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'auth-modal-backdrop';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  modalBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';

  const closeModal = () => {
    if (resendInterval) clearInterval(resendInterval);
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  };

  const renderContent = (currentMode, extraData = {}) => {
    if (resendInterval) clearInterval(resendInterval);

    if (currentMode === 'login') {
      modalBackdrop.innerHTML = `
        <div class="modal-window">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>
          <div class="modal-header">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎄</div>
            <h2>The Evergreen Express</h2>
            <p class="modal-subtitle">Participant Login • Secret Christmas Journey</p>
          </div>
          <form id="form-faculty-login">
            <div class="form-group">
              <label class="form-label" for="login-participant-id">Participant ID or Email Address</label>
              <input 
                type="text" 
                id="login-participant-id" 
                class="form-input" 
                placeholder="e.g. SS101 or your email" 
                value="${prefilledId || ''}" 
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
                <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password" />
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

      document.getElementById('modal-close-x').onclick = closeModal;
      document.getElementById('link-goto-register').onclick = () => renderContent('register');
      setupPasswordToggle('toggle-login-password', 'login-password');

      const loginForm = document.getElementById('form-faculty-login');
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const participantId = document.getElementById('login-participant-id').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('btn-submit-login');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="button-spinner"></span> Logging in...';

        try {
          const user = await authService.login(participantId, password);
          showToast(`Welcome aboard, ${user.name}!`, 'success');
          closeModal();
        } catch (err) {
          showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Login';
        }
      };

    } else if (currentMode === 'register') {
      const prevData = extraData.formData || {};
      modalBackdrop.innerHTML = `
        <div class="modal-window" style="max-width: 520px;">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>
          <div class="modal-header">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">✨</div>
            <h2>Faculty Registration</h2>
            <p class="modal-subtitle">Join The Evergreen Express • Step 1: Account Details</p>
          </div>
          <form id="form-faculty-register">
            <div class="form-group">
              <label class="form-label" for="reg-name">Full Name & Title</label>
              <input type="text" id="reg-name" class="form-input" placeholder="e.g. Dr. Robert Vance" value="${prevData.fullName || ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">College Email Address</label>
              <input type="email" id="reg-email" class="form-input" placeholder="e.g. r.vance@college.edu" value="${prevData.email || ''}" required />
              <span style="font-size: 11px; color: var(--color-gold-champagne); margin-top: 4px; display: block;">
                ✉️ A 6-digit verification code will be sent to this email address.
              </span>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-dept">Department / Faculty</label>
              <input type="text" id="reg-dept" class="form-input" placeholder="e.g. Department of Computer Science" value="${prevData.department || ''}" />
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
              <input type="text" id="reg-wishlist" class="form-input" placeholder="e.g. Books, dark chocolates, coffee, fountain pen ink" value="${prevData.giftPreference || ''}" />
            </div>
            <div class="form-footer-action">
              <button type="submit" class="btn btn-primary" id="btn-submit-register" style="width: 100%;">
                Continue to Verification ➔
              </button>
              <p class="form-switch-prompt">
                Already registered? <button type="button" class="form-switch-link" id="link-goto-login">Login with Participant ID</button>
              </p>
            </div>
          </form>
        </div>
      `;

      document.getElementById('modal-close-x').onclick = closeModal;
      document.getElementById('link-goto-login').onclick = () => renderContent('login');
      setupPasswordToggle('toggle-reg-password', 'reg-password');
      setupPasswordToggle('toggle-reg-confirm-password', 'reg-confirm-password');

      const regForm = document.getElementById('form-faculty-register');
      regForm.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = (document.getElementById('reg-name').value || '').trim();
        const email = (document.getElementById('reg-email').value || '').trim().toLowerCase();
        const dept = (document.getElementById('reg-dept').value || '').trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        const wishlist = (document.getElementById('reg-wishlist').value || '').trim();
        const submitBtn = document.getElementById('btn-submit-register');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          showToast('Please enter a valid email address (e.g. name@gmail.com).', 'error');
          return;
        }

        if (password !== confirmPassword) {
          showToast('Passwords do not match. Please verify.', 'error');
          return;
        }

        if (password.length < 6) {
          showToast('Password must be at least 6 characters long.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="button-spinner"></span> Sending Verification Code...';

        try {
          const res = await authService.requestRegistrationOtp(fullName, email, password, confirmPassword, wishlist, dept);
          showToast('Verification code dispatched to your email!', 'info');
          renderContent('verify-otp', {
            email,
            maskedEmail: res.maskedEmail || email,
            formData: { fullName, email, password, confirmPassword, giftPreference: wishlist, department: dept },
          });
        } catch (err) {
          showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Continue to Verification ➔'; 
        }
      };

    } else if (currentMode === 'verify-otp') {
      // Christmas-Themed Email OTP Verification Screen
      const { email, maskedEmail, formData } = extraData;
      let countdownSeconds = 60;

      modalBackdrop.innerHTML = `
        <div class="modal-window" style="max-width: 480px; text-align: center; border: 2px solid var(--color-gold-champagne); background: radial-gradient(circle at top, rgba(17, 30, 56, 0.98), rgba(5, 10, 22, 0.99));">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>

          <div style="font-size: 2.8rem; margin-bottom: 0.25rem;">✉️❄️</div>
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
                placeholder="••••••" 
                maxlength="6" 
                pattern="[0-9]*" 
                inputmode="numeric" 
                style="text-align: center; font-family: monospace; font-size: 2.2rem; letter-spacing: 12px; font-weight: 700; color: #ffffff;" 
                required 
                autofocus 
                autocomplete="one-time-code"
              />
              <span style="font-size: 11px; color: #94a3b8; margin-top: 6px; display: block;">
                ⏳ Code expires in 5 minutes • Check your inbox or spam folder
              </span>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-submit-otp" style="width: 100%; font-size: 1.05rem; padding: 0.85rem; box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);">
              VERIFY EMAIL & ISSUE TICKET 🎫
            </button>
          </form>

          <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 13px; color: #cbd5e1;">
            <div id="resend-container">
              Didn't receive the code? 
              <span id="countdown-text" style="color: var(--color-gold-light);">Resend in <strong id="resend-timer">${countdownSeconds}s</strong></span>
              <button type="button" id="btn-resend-otp" class="form-switch-link" style="display: none; font-weight: 600; margin-left: 4px;">
                Resend Code 🔄
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

      document.getElementById('modal-close-x').onclick = closeModal;

      // Handle Back Button
      document.getElementById('btn-back-to-reg').onclick = () => {
        renderContent('register', { formData });
      };

      // Resend Timer Logic
      const timerSpan = document.getElementById('resend-timer');
      const countdownText = document.getElementById('countdown-text');
      const resendBtn = document.getElementById('btn-resend-otp');

      const startTimer = () => {
        countdownSeconds = 60;
        countdownText.style.display = 'inline';
        resendBtn.style.display = 'none';
        timerSpan.textContent = `${countdownSeconds}s`;

        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(() => {
          countdownSeconds--;
          timerSpan.textContent = `${countdownSeconds}s`;
          if (countdownSeconds <= 0) {
            clearInterval(resendInterval);
            countdownText.style.display = 'none';
            resendBtn.style.display = 'inline';
          }
        }, 1000);
      };

      startTimer();

      resendBtn.onclick = async () => {
        try {
          resendBtn.disabled = true;
          resendBtn.textContent = 'Sending...';
          const res = await authService.resendRegistrationOtp(email);
          showToast(res.message, 'success');
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend Code 🔄';
          startTimer();
        } catch (err) {
          showToast(err.message, 'error');
          resendBtn.disabled = false;
          resendBtn.textContent = 'Resend Code 🔄';
        }
      };

      // Handle Verification Submit
      const otpForm = document.getElementById('form-verify-otp');
      otpForm.onsubmit = async (e) => {
        e.preventDefault();
        const otpVal = document.getElementById('otp-input').value.trim();
        const submitBtn = document.getElementById('btn-submit-otp');

        if (otpVal.length !== 6) {
          showToast('Please enter the full 6-digit code.', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="button-spinner"></span> Verifying Code & Issuing Ticket...';

        try {
          const res = await authService.verifyRegistrationOtp(email, otpVal);
          showToast('Email verified successfully! Welcome aboard!', 'success');
          renderContent('success', { participantId: res.participantId, fullName: res.user.fullName });
        } catch (err) {
          showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'VERIFY EMAIL & ISSUE TICKET 🎫';
        }
      };

    } else if (currentMode === 'success') {
      modalBackdrop.innerHTML = `
        <div class="modal-window" style="text-align: center; border: 2px solid var(--color-gold-champagne); background: radial-gradient(circle at top, rgba(15, 28, 56, 0.98), rgba(5, 10, 22, 0.99));">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem; animation: floatSleigh 3s ease-in-out infinite;">🚂✨</div>
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
              📌 <strong>Keep your Participant ID safe.</strong> You will need it to log in and board The Evergreen Express on reveal day!
            </p>
          </div>

          <button id="btn-success-proceed" class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.85rem;">
            Enter Passenger Cabin ➔
          </button>
        </div>
      `;

      document.getElementById('btn-success-proceed').onclick = () => {
        closeModal();
      };

    } else if (currentMode === 'admin') {
      modalBackdrop.innerHTML = `
        <div class="modal-window">
          <button class="modal-close-btn" id="modal-close-x">&times;</button>
          <div class="college-modal-brand-banner">
            <img src="/images/st-pauls-college-logo.png" alt="ST PAULS COLLEGE" class="college-modal-logo-img" />
          </div>
          <div class="modal-header">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🛡️</div>
            <h2>ST PAULS COLLEGE Administration Portal</h2>
            <p class="modal-subtitle">The Evergreen Express • Management Console</p>
          </div>
          <form id="form-admin-login">
            <div class="form-group">
              <label class="form-label" for="admin-user">Administrator Username</label>
              <input type="text" id="admin-user" class="form-input" placeholder="e.g. admin" required autocomplete="username" />
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-password">Administrator Password</label>
              <div class="password-field-wrapper">
                <input type="password" id="admin-password" class="form-input" placeholder="••••••••" required autocomplete="current-password" />
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

      document.getElementById('modal-close-x').onclick = closeModal;
      document.getElementById('link-goto-faculty').onclick = () => renderContent('login');
      setupPasswordToggle('toggle-admin-password', 'admin-password');

      const adminForm = document.getElementById('form-admin-login');
      adminForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-user').value;
        const password = document.getElementById('admin-password').value;
        const submitBtn = document.getElementById('btn-submit-admin');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="button-spinner"></span> Authenticating Admin...';

        try {
          await authService.adminLogin(username, password);
          showToast('Administrator session established.', 'success');
          closeModal();
        } catch (err) {
          showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Authenticate Admin';
        }
      };
    }
  };

  renderContent(mode);
}
