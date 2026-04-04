const roleSelect = document.getElementById('role');
const enrollmentGroup = document.getElementById('enrollmentGroup');
const usernameGroup = document.getElementById('usernameGroup');
const enrollmentInput = document.getElementById('enrollmentNumber');
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const suggestPasswordBtn = document.getElementById('suggestPasswordBtn');
const suggestedPasswordText = document.getElementById('suggestedPasswordText');
const passwordStrength = document.getElementById('passwordStrength');
const fullNameRegex = /^[A-Za-z\s.'-]+$/;

if (fullNameInput) {
  fullNameInput.addEventListener('input', () => {
    const sanitized = fullNameInput.value.replaceAll(/[^A-Za-z\s.'-]/g, '');
    if (sanitized !== fullNameInput.value) {
      fullNameInput.value = sanitized;
    }
  });
}

function generateStrongPassword(length = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()-_=+?';
  const allChars = upper + lower + numbers + symbols;

  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)]
  ];

  for (let i = required.length; i < length; i += 1) {
    required.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle characters for randomness
  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
}

function getPasswordStrengthLabel(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Medium';
  return 'Strong';
}

function updatePasswordStrength() {
  const label = getPasswordStrengthLabel(passwordInput.value);
  passwordStrength.textContent = `Strength: ${passwordInput.value ? label : '-'}`;
  passwordStrength.className = 'text-xs';

  if (label === 'Strong') {
    passwordStrength.classList.add('text-emerald-300');
  } else if (label === 'Medium') {
    passwordStrength.classList.add('text-amber-300');
  } else {
    passwordStrength.classList.add('text-rose-300');
  }
}

suggestPasswordBtn.addEventListener('click', () => {
  const strongPassword = generateStrongPassword();
  passwordInput.value = strongPassword;
  confirmPasswordInput.value = strongPassword;
  suggestedPasswordText.textContent = `Suggested password: ${strongPassword}`;
  suggestedPasswordText.classList.remove('d-none');
  updatePasswordStrength();
});

passwordInput.addEventListener('input', updatePasswordStrength);

roleSelect.addEventListener('change', () => {
  if (roleSelect.value === 'STUDENT') {
    enrollmentGroup.classList.remove('d-none');
    usernameGroup.classList.add('d-none');
    enrollmentInput.required = true;
    usernameInput.required = false;
  } else {
    enrollmentGroup.classList.add('d-none');
    usernameGroup.classList.remove('d-none');
    enrollmentInput.required = false;
    usernameInput.required = true;
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorAlert = document.getElementById('errorAlert');
  const successAlert = document.getElementById('successAlert');
  errorAlert.classList.add('d-none');
  successAlert.classList.add('d-none');

  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (password !== confirmPassword) {
    errorAlert.textContent = 'Passwords do not match';
    errorAlert.classList.remove('d-none');
    return;
  }

  if (getPasswordStrengthLabel(password) !== 'Strong') {
    errorAlert.textContent = 'Please use a strong password (12+ chars with uppercase, lowercase, number, and symbol).';
    errorAlert.classList.remove('d-none');
    return;
  }

  const role = roleSelect.value;
  const fullName = document.getElementById('fullName').value.trim();
  if (!fullNameRegex.test(fullName)) {
    errorAlert.textContent = 'Full Name should contain only alphabets.';
    errorAlert.classList.remove('d-none');
    return;
  }

  const data = {
    fullName,
    email: document.getElementById('email').value,
    role: role,
    password: password
  };

  if (role === 'STUDENT') {
    data.enrollmentNumber = enrollmentInput.value;
  } else {
    data.username = usernameInput.value;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      successAlert.textContent = 'Registration successful! Redirecting to login...';
      successAlert.classList.remove('d-none');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      errorAlert.textContent = result.message || 'Registration failed';
      errorAlert.classList.remove('d-none');
    }
  } catch (error) {
    errorAlert.textContent = 'Network error. Please try again.';
    errorAlert.classList.remove('d-none');
  }
});
