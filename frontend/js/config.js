const API_BASE_URL = `${window.location.origin}/api`;

function getToken() {
  return localStorage.getItem('accessToken');
}

function setToken(token) {
  localStorage.setItem('accessToken', token);
}

function removeToken() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('studentProfilePhoto');
}

function getUserRole() {
  return localStorage.getItem('userRole');
}

function setUserRole(role) {
  localStorage.setItem('userRole', role);
}

function getUserName() {
  return localStorage.getItem('userName');
}

function setUserName(name) {
  localStorage.setItem('userName', name);
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    removeToken();
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }

  return response;
}

function requireAuth(loginUrl = '/login.html') {
  if (!getToken()) {
    window.location.href = loginUrl;
    return false;
  }
  return true;
}

function checkRole(allowedRoles) {
  const role = getUserRole();
  if (!allowedRoles.includes(role)) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}
