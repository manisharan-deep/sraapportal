// Central function to switch login role
function applyRole(role) {
  if (!['STUDENT', 'STAFF', 'ADMIN'].includes(role)) return;
  const niceRole = role.charAt(0) + role.slice(1).toLowerCase();
  const roleInput = document.getElementById('role');
  const loginTitle = document.getElementById('loginTitle');
  const identifierLabel = document.getElementById('identifierLabel');
  const identifierInput = document.getElementById('identifier');
  if (roleInput) roleInput.value = role;
  if (loginTitle) loginTitle.textContent = niceRole + ' Login';
  document.title = niceRole + ' Login - SR University';
  if (identifierLabel) identifierLabel.textContent = role === 'STUDENT' ? 'Enrollment Number' : 'Username';
  if (identifierInput) identifierInput.placeholder = role === 'STUDENT' ? 'Enter Enrollment Number' : 'Enter Username';
  document.querySelectorAll('[data-role-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-role-btn') === role);
  });
}

// Apply role from URL on load
(function() {
  const roleFromUrl = new URLSearchParams(window.location.search).get('role');
  if (roleFromUrl) applyRole(roleFromUrl);
})();

// In-form tab button click handlers
document.querySelectorAll('.sru-form-role-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    applyRole(btn.getAttribute('data-role-btn'));
    const id = document.getElementById('identifier');
    id.value = '';
    id.focus();
  });
});

const roleSelect = document.getElementById('role');
const identifierLabel = document.getElementById('identifierLabel');
const captchaCanvas = document.getElementById('captchaCanvas');
const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
const captchaInput = document.getElementById('captchaInput');
let activeCaptcha = '';

function generateCaptchaText() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function drawCaptcha(text) {
  const ctx = captchaCanvas.getContext('2d');
  ctx.clearRect(0, 0, captchaCanvas.width, captchaCanvas.height);

  ctx.fillStyle = '#e0e7ff';
  ctx.fillRect(0, 0, captchaCanvas.width, captchaCanvas.height);

  for (let i = 0; i < 5; i += 1) {
    ctx.strokeStyle = `rgba(37, 99, 235, ${0.25 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
    ctx.lineTo(Math.random() * captchaCanvas.width, Math.random() * captchaCanvas.height);
    ctx.stroke();
  }

  ctx.font = 'bold 30px Sora';
  ctx.fillStyle = '#1e3a8a';
  ctx.textBaseline = 'middle';
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  [...text].forEach((char, index) => {
    const x = 16 + index * 28;
    const y = 26 + (Math.random() * 8 - 4);
    const angle = (Math.random() * 0.35) - 0.175;

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

// Role switching is now handled by applyRole() + in-form tab buttons above

refreshCaptchaBtn.addEventListener('click', regenerateCaptcha);
regenerateCaptcha();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorAlert = document.getElementById('errorAlert');
  errorAlert.classList.add('d-none');

  if (captchaInput.value.trim().toUpperCase() !== activeCaptcha) {
    errorAlert.textContent = 'Invalid captcha. Please try again.';
    errorAlert.classList.remove('d-none');
    regenerateCaptcha();
    return;
  }

  const data = {
    identifier: document.getElementById('identifier').value,
    password: document.getElementById('password').value,
    role: roleSelect.value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      setToken(result.accessToken);
      setUserRole(result.user.role);
      setUserName(result.user.fullName);

      // Redirect based on role
      if (result.user.role === 'STUDENT') {
        window.location.href = 'pages/student/dashboard.html';
      } else if (result.user.role === 'STAFF') {
        window.location.href = 'pages/staff/dashboard.html';
      } else if (result.user.role === 'ADMIN') {
        window.location.href = 'pages/admin/dashboard.html';
      }
    } else {
      errorAlert.textContent = result.message || 'Invalid credentials';
      errorAlert.classList.remove('d-none');
      regenerateCaptcha();
    }
  } catch (error) {

      // Password suggestion functionality
      function generateStrongPassword() {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';
        const allChars = uppercase + lowercase + numbers + symbols;
  
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
  
        for (let i = password.length; i < 12; i++) {
          password += allChars[Math.floor(Math.random() * allChars.length)];
        }
  
        return password.split('').sort(() => Math.random() - 0.5).join('');
      }

      function evaluatePasswordStrength(password) {
        let strength = 0;
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
  
        if (!password) {
          strengthBar.style.width = '0';
          strengthBar.style.background = '#ef4444';
          strengthText.textContent = 'Password strength';
          return;
        }
  
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 10;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/\d/.test(password)) strength += 15;
        if (/[!@#$%^&*]/.test(password)) strength += 15;
  
        strengthBar.style.width = strength + '%';
  
        if (strength < 30) {
          strengthBar.style.background = '#ef4444';
          strengthText.textContent = 'Weak';
        } else if (strength < 60) {
          strengthBar.style.background = '#f97316';
          strengthText.textContent = 'Fair';
        } else if (strength < 85) {
          strengthBar.style.background = '#eab308';
          strengthText.textContent = 'Good';
        } else {
          strengthBar.style.background = '#4caf50';
          strengthText.textContent = 'Strong';
        }
      }

      const passwordInput = document.getElementById('password');
      const suggestPasswordBtn = document.getElementById('suggestPasswordBtn');
      const suggestedPasswordDiv = document.getElementById('suggestedPassword');
      const suggestedPasswordInput = document.getElementById('suggestedPasswordInput');
      const copyPasswordBtn = document.getElementById('copyPasswordBtn');

      // Real-time password strength check
      passwordInput.addEventListener('input', (e) => {
        evaluatePasswordStrength(e.target.value);
      });

      // Suggest password button
      suggestPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const strongPassword = generateStrongPassword();
        suggestedPasswordInput.value = strongPassword;
        suggestedPasswordDiv.classList.remove('d-none');
        evaluatePasswordStrength(strongPassword);
      });

      // Copy to clipboard
      copyPasswordBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(suggestedPasswordInput.value);
          const originalText = copyPasswordBtn.textContent;
          copyPasswordBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyPasswordBtn.textContent = originalText;
          }, 2000);
          // Also put it in the password field
          passwordInput.value = suggestedPasswordInput.value;
          evaluatePasswordStrength(suggestedPasswordInput.value);
        } catch (err) {
          alert('Failed to copy password');
        }
      });


    errorAlert.textContent = 'Network error. Please try again.';
    errorAlert.classList.remove('d-none');
    regenerateCaptcha();
  }
});
