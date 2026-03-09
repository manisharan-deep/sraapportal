if (!requireAuth() || !checkRole(['ADMIN'])) {
  throw new Error('Access denied');
}

document.getElementById('userName').textContent = getUserName();

document.getElementById('logoutBtn').addEventListener('click', () => {
  removeToken();
  window.location.href = '../../login.html';
});

async function loadDashboard() {
  try {
    const response = await apiRequest('/admin/dashboard');
    const data = await response.json();

    if (response.ok) {
      const pendingDiv = document.getElementById('pendingApprovals');
      if (data.pending && data.pending.length > 0) {
        pendingDiv.innerHTML = data.pending.map(p => `
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/50 p-3">
            <span class="text-sm text-slate-200">${p.userId.fullName} - ${p.branch}</span>
            <button class="btn-primary-tailwind px-3 py-2 text-xs" onclick="approveProfile('${p._id}')">Approve</button>
          </div>
        `).join('');
      } else {
        pendingDiv.innerHTML = '<p class="text-sm text-slate-400">No pending approvals</p>';
      }

      const usersDiv = document.getElementById('usersList');
      if (data.users && data.users.length > 0) {
        usersDiv.innerHTML = `<ul class="space-y-2">` + 
          data.users.map(u => `
            <li class="rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-slate-200">${u.fullName} - ${u.role} - ${u.email}</li>
          `).join('') + 
          `</ul>`;
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

async function approveProfile(studentId) {
  try {
    const response = await apiRequest(`/admin/students/${studentId}/approve-profile`, {
      method: 'POST'
    });
    if (response.ok) {
      alert('Profile approved successfully');
      loadDashboard();
    }
  } catch (error) {
    alert('Failed to approve profile');
  }
}

loadDashboard();
