(() => {
  const signinForm = document.getElementById('signinForm');
  const registerForm = document.getElementById('registerForm');
  const tabSignin = document.getElementById('tabSignin');
  const tabRegister = document.getElementById('tabRegister');
  const switcherIndicator = document.getElementById('switcherIndicator');
  const errorAlert = document.getElementById('errorAlert');
  const successAlert = document.getElementById('successAlert');

  const signinRoleToggle = document.getElementById('signinRoleToggle');
  const signinRoleInput = document.getElementById('signinRole');
  const identifierLabel = document.getElementById('identifierLabel');
  const identifierInput = document.getElementById('identifier');

  const registerRoleToggle = document.getElementById('registerRoleToggle');
  const registerRoleInput = document.getElementById('registerRole');
  const enrollmentField = document.getElementById('enrollmentField');
  const usernameField = document.getElementById('usernameField');
  const enrollmentInput = document.getElementById('enrollmentNumber');
  const usernameInput = document.getElementById('username');

  const captchaCanvas = document.getElementById('captchaCanvas');
  const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
  const captchaInput = document.getElementById('captchaInput');

  const loader = document.getElementById('loader');
  const spotlight = document.getElementById('spotlight');
  const floatingEls = [...document.querySelectorAll('[data-depth]')];
  const ring = document.getElementById('attendanceRing');
  const ringValue = document.getElementById('ringValue');

  const ringCircumference = 2 * Math.PI * 54;
  let activeCaptcha = '';
  let rafId = null;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;

  function hideAlerts() {
    errorAlert.classList.remove('show');
    successAlert.classList.remove('show');
    errorAlert.textContent = '';
    successAlert.textContent = '';
  }

  function showError(message) {
    successAlert.classList.remove('show');
    errorAlert.textContent = message;
    errorAlert.classList.add('show');
  }

  function showSuccess(message) {
    errorAlert.classList.remove('show');
    successAlert.textContent = message;
    successAlert.classList.add('show');
  }

  function setAuthTab(tabName) {
    const signinActive = tabName === 'signin';
    tabSignin.classList.toggle('active', signinActive);
    tabRegister.classList.toggle('active', !signinActive);
    signinForm.classList.toggle('active', signinActive);
    registerForm.classList.toggle('active', !signinActive);
    switcherIndicator.style.transform = signinActive ? 'translateX(0)' : 'translateX(100%)';
    hideAlerts();
  }

  function setSigninRole(role) {
    if (!['STUDENT', 'STAFF'].includes(role)) return;
    signinRoleInput.value = role;
    [...signinRoleToggle.querySelectorAll('button')].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.role === role);
    });

    if (role === 'STUDENT') {
      identifierLabel.textContent = 'Enrollment Number';
      identifierInput.placeholder = ' ';
      document.getElementById('headerStudentBtn')?.classList.add('active');
      document.getElementById('headerStaffBtn')?.classList.remove('active');
    } else {
      identifierLabel.textContent = 'Username';
      identifierInput.placeholder = ' ';
      document.getElementById('headerStaffBtn')?.classList.add('active');
      document.getElementById('headerStudentBtn')?.classList.remove('active');
    }
  }

  function setRegisterRole(role) {
    if (!['STUDENT', 'STAFF'].includes(role)) return;
    registerRoleInput.value = role;
    [...registerRoleToggle.querySelectorAll('button')].forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.role === role);
    });

    if (role === 'STUDENT') {
      enrollmentField.style.display = '';
      usernameField.style.display = 'none';
      enrollmentInput.required = true;
      usernameInput.required = false;
    } else {
      enrollmentField.style.display = 'none';
      usernameField.style.display = '';
      enrollmentInput.required = false;
      usernameInput.required = true;
    }
  }

  function generateCaptchaText() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function drawCaptcha(text) {
    const ctx = captchaCanvas.getContext('2d');
    ctx.clearRect(0, 0, captchaCanvas.width, captchaCanvas.height);

    ctx.fillStyle = '#dbeeff';
    ctx.fillRect(0, 0, captchaCanvas.width, captchaCanvas.height);

    for (let i = 0; i < 6; i += 1) {
      ctx.strokeStyle = `rgba(12, 88, 166, ${0.2 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
      ctx.lineTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
      ctx.stroke();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = 'bold 28px Outfit';
    ctx.fillStyle = '#0c4d98';
    ctx.textBaseline = 'middle';

    [...text].forEach((char, idx) => {
      const x = 14 + idx * 33;
      const y = 27 + (Math.random() * 8 - 4);
      const angle = (Math.random() * 0.36) - 0.18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  }

  function regenerateCaptcha() {
    activeCaptcha = generateCaptchaText();
    drawCaptcha(activeCaptcha);
    captchaInput.value = '';
  }

  function applyPointerEffects() {
    const xNorm = (pointerX / window.innerWidth - 0.5) * 2;
    const yNorm = (pointerY / window.innerHeight - 0.5) * 2;

    spotlight.style.left = `${pointerX}px`;
    spotlight.style.top = `${pointerY}px`;

    floatingEls.forEach((el) => {
      const depth = Number(el.dataset.depth || 15);
      el.style.transform = `translate3d(${xNorm * depth * 0.35}px, ${yNorm * depth * 0.35}px, 0)`;
    });

    rafId = null;
  }

  function onPointerMove(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(applyPointerEffects);
    }
  }

  function createRipple(event) {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 620);
  }

  function animateMetricBars() {
    const bars = document.querySelectorAll('.progress-bar');
    bars.forEach((bar, i) => {
      const value = Number(bar.dataset.progress || 0);
      setTimeout(() => {
        bar.style.width = `${Math.max(0, Math.min(value, 100))}%`;
      }, 250 + i * 130);
    });
  }

  function animateAttendanceRing(targetPercent = 84) {
    const bounded = Math.max(0, Math.min(targetPercent, 100));
    let current = 0;
    ring.style.strokeDasharray = String(ringCircumference);
    ring.style.strokeDashoffset = String(ringCircumference);

    const timer = setInterval(() => {
      current += 1;
      const offset = ringCircumference - (ringCircumference * current) / 100;
      ring.style.strokeDashoffset = String(offset);
      ringValue.textContent = `${current}%`;
      if (current >= bounded) {
        clearInterval(timer);
      }
    }, 16);
  }

  function validateStrongPassword(password) {
    return password.length >= 12
      && /[A-Z]/.test(password)
      && /[a-z]/.test(password)
      && /\d/.test(password)
      && /[^A-Za-z0-9]/.test(password);
  }

  function resolveRoleFromQuery() {
    const role = new URLSearchParams(window.location.search).get('role');
    if (!role) return;
    const normalized = role.toUpperCase();
    if (['STUDENT', 'STAFF'].includes(normalized)) {
      setSigninRole(normalized);
    }
  }

  signinRoleToggle.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-role]');
    if (!btn) return;
    setSigninRole(btn.dataset.role);
  });

  registerRoleToggle.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-role]');
    if (!btn) return;
    setRegisterRole(btn.dataset.role);
  });

  tabSignin.addEventListener('click', () => setAuthTab('signin'));
  tabRegister.addEventListener('click', () => setAuthTab('register'));

  refreshCaptchaBtn.addEventListener('click', regenerateCaptcha);

  signinForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlerts();

    if (captchaInput.value.trim().toUpperCase() !== activeCaptcha) {
      showError('Invalid captcha. Please try again.');
      regenerateCaptcha();
      return;
    }

    const payload = {
      identifier: document.getElementById('identifier').value.trim(),
      password: document.getElementById('password').value,
      role: signinRoleInput.value
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        showError(result.message || 'Invalid credentials.');
        regenerateCaptcha();
        return;
      }

      setToken(result.accessToken);
      setUserRole(result.user.role);
      setUserName(result.user.fullName);

      if (result.user.role === 'STUDENT') {
        window.location.href = 'pages/student/dashboard.html';
      } else if (result.user.role === 'STAFF') {
        window.location.href = 'pages/staff/dashboard.html';
      } else {
        window.location.href = 'pages/admin/dashboard.html';
      }
    } catch (_error) {
      showError('Network error. Please try again.');
      regenerateCaptcha();
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlerts();

    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    if (!validateStrongPassword(password)) {
      showError('Password must be 12+ chars with uppercase, lowercase, number, and symbol.');
      return;
    }

    const role = registerRoleInput.value;
    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      role,
      password
    };

    if (role === 'STUDENT') {
      payload.enrollmentNumber = enrollmentInput.value.trim();
    } else {
      payload.username = usernameInput.value.trim();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        showError(result.message || 'Registration failed.');
        return;
      }

      showSuccess('Registration successful. You can sign in now.');
      registerForm.reset();
      setRegisterRole('STUDENT');
      setTimeout(() => setAuthTab('signin'), 700);
    } catch (_error) {
      showError('Network error. Please try again.');
    }
  });

  document.querySelectorAll('.ripple-btn').forEach((btn) => {
    btn.addEventListener('click', createRipple);
  });

  document.addEventListener('mousemove', onPointerMove, { passive: true });

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.classList.add('page-ready');
    }, 480);
    animateMetricBars();
    animateAttendanceRing(84);
  });

  setAuthTab('signin');
  setSigninRole('STUDENT');
  setRegisterRole('STUDENT');
  resolveRoleFromQuery();
  regenerateCaptcha();
})();
