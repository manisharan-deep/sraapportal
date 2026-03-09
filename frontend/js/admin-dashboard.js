if (!requireAuth() || !checkRole(['ADMIN'])) {
  throw new Error('Access denied');
}

document.getElementById('userName').textContent = getUserName();
document.getElementById('logoutBtn').addEventListener('click', () => {
  removeToken();
  window.location.href = '../../login.html';
});

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `fixed top-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl transition-all ${
    type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
  }`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ── Confirm modal ──────────────────────────────────────────────────────────
function confirmAction(title, body, onConfirm) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').textContent = body;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  const confirm = document.getElementById('modalConfirm');
  const cancel = document.getElementById('modalCancel');
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
  const handler = () => { close(); onConfirm(); confirm.removeEventListener('click', handler); };
  confirm.addEventListener('click', handler);
  cancel.onclick = close;
}

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${name}`));
  if (name === 'students') loadStudents();
  if (name === 'staff') loadStaff();
  if (name === 'approvals') loadApprovals();
  if (name === 'users') loadUsers();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Stats ──────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await apiRequest('/admin/stats');
    const data = await res.json();
    if (res.ok) {
      document.getElementById('stat-students').textContent = data.totalStudents;
      document.getElementById('stat-staff').textContent = data.totalStaff;
      document.getElementById('stat-users').textContent = data.totalUsers;
      document.getElementById('stat-pending').textContent = data.pendingCount;
    }
  } catch (e) { /* silent */ }
}

// ── Students ───────────────────────────────────────────────────────────────
let allStudents = [];

async function loadStudents() {
  const el = document.getElementById('studentsTable');
  el.innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  try {
    const res = await apiRequest('/admin/students');
    const data = await res.json();
    if (!res.ok) { el.innerHTML = `<p class="text-sm text-rose-400">${data.message}</p>`; return; }
    allStudents = data.students || [];
    renderStudents(allStudents);
  } catch (e) {
    el.innerHTML = '<p class="text-sm text-rose-400">Failed to load students</p>';
  }
}

function renderStudents(list) {
  const el = document.getElementById('studentsTable');
  if (!list.length) { el.innerHTML = '<p class="text-sm text-slate-400">No students found</p>'; return; }
  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Name</th><th>Roll Number</th><th>Branch</th><th>Semester</th><th>Email</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${list.map(s => `
          <tr>
            <td>${s.name || s.userId?.fullName || '—'}</td>
            <td>${s.rollNumber || s.userId?.enrollmentNumber || '—'}</td>
            <td>${s.branch}</td>
            <td>${s.semester}</td>
            <td class="text-slate-400">${s.userId?.email || '—'}</td>
            <td><span class="badge ${s.userId?.isActive ? 'badge-active' : 'badge-inactive'}">${s.userId?.isActive ? 'Active' : 'Inactive'}</span></td>
            <td class="flex gap-2 flex-wrap">
              <button class="btn-toggle btn-sm" onclick="toggleStatus('${s.userId?._id}', '${s.name || s.userId?.fullName}')">Toggle</button>
              <button class="btn-danger btn-sm" onclick="deleteStudent('${s._id}', '${s.name || s.userId?.fullName || 'Student'}')">Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

document.getElementById('studentSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderStudents(allStudents.filter(s =>
    (s.name || '').toLowerCase().includes(q) ||
    (s.rollNumber || '').toLowerCase().includes(q) ||
    (s.userId?.email || '').toLowerCase().includes(q)
  ));
});

async function deleteStudent(studentId, name) {
  confirmAction('Delete Student', `Delete "${name}" and ALL their data (attendance, results, fees, etc.)? This cannot be undone.`, async () => {
    try {
      const res = await apiRequest(`/admin/students/${studentId}`, { method: 'DELETE' });
      const data = await res.json();
      showToast(data.message, res.ok ? 'success' : 'error');
      if (res.ok) { loadStudents(); loadStats(); }
    } catch { showToast('Delete failed', 'error'); }
  });
}

// ── Staff ──────────────────────────────────────────────────────────────────
let allStaff = [];

async function loadStaff() {
  const el = document.getElementById('staffTable');
  el.innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  try {
    const res = await apiRequest('/admin/staff');
    const data = await res.json();
    if (!res.ok) { el.innerHTML = `<p class="text-sm text-rose-400">${data.message}</p>`; return; }
    allStaff = data.staff || [];
    renderStaff(allStaff);
  } catch {
    el.innerHTML = '<p class="text-sm text-rose-400">Failed to load staff</p>';
  }
}

function renderStaff(list) {
  const el = document.getElementById('staffTable');
  if (!list.length) { el.innerHTML = '<p class="text-sm text-slate-400">No staff found</p>'; return; }
  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Name</th><th>Username</th><th>Department</th><th>Designation</th><th>Email</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${list.map(s => `
          <tr>
            <td>${s.userId?.fullName || '—'}</td>
            <td>${s.userId?.username || '—'}</td>
            <td>${s.department}</td>
            <td>${s.designation}</td>
            <td class="text-slate-400">${s.userId?.email || '—'}</td>
            <td><span class="badge ${s.userId?.isActive ? 'badge-active' : 'badge-inactive'}">${s.userId?.isActive ? 'Active' : 'Inactive'}</span></td>
            <td class="flex gap-2 flex-wrap">
              <button class="btn-toggle btn-sm" onclick="toggleStatus('${s.userId?._id}', '${s.userId?.fullName}')">Toggle</button>
              <button class="btn-danger btn-sm" onclick="deleteStaff('${s._id}', '${s.userId?.fullName || 'Staff'}')">Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

document.getElementById('staffSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  renderStaff(allStaff.filter(s =>
    (s.userId?.fullName || '').toLowerCase().includes(q) ||
    (s.department || '').toLowerCase().includes(q) ||
    (s.userId?.email || '').toLowerCase().includes(q)
  ));
});

async function deleteStaff(staffId, name) {
  confirmAction('Delete Staff', `Delete staff member "${name}"? Their announcements will also be removed.`, async () => {
    try {
      const res = await apiRequest(`/admin/staff/${staffId}`, { method: 'DELETE' });
      const data = await res.json();
      showToast(data.message, res.ok ? 'success' : 'error');
      if (res.ok) { loadStaff(); loadStats(); }
    } catch { showToast('Delete failed', 'error'); }
  });
}

// ── Toggle user status ─────────────────────────────────────────────────────
async function toggleStatus(userId, name) {
  try {
    const res = await apiRequest(`/admin/users/${userId}/toggle-status`, { method: 'PATCH' });
    const data = await res.json();
    showToast(data.message || `${name} status updated`, res.ok ? 'success' : 'error');
    if (res.ok) { loadStudents(); loadStaff(); }
  } catch { showToast('Toggle failed', 'error'); }
}

// ── Approvals ──────────────────────────────────────────────────────────────
async function loadApprovals() {
  const el = document.getElementById('pendingApprovals');
  el.innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  try {
    const res = await apiRequest('/admin/dashboard');
    const data = await res.json();
    if (!res.ok) { el.innerHTML = `<p class="text-sm text-rose-400">${data.message}</p>`; return; }
    if (data.pending && data.pending.length > 0) {
      el.innerHTML = data.pending.map(p => `
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/50 p-3 mb-2">
          <div>
            <p class="text-sm font-semibold text-white">${p.userId?.fullName || '—'}</p>
            <p class="text-xs text-slate-400">${p.branch} · Sem ${p.semester} · ${p.section}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary-tailwind px-3 py-1 text-xs" onclick="approveProfile('${p._id}')">Approve</button>
            <button class="btn-danger px-3 py-1 text-xs" onclick="rejectProfile('${p._id}')">Reject</button>
          </div>
        </div>`).join('');
    } else {
      el.innerHTML = '<p class="text-sm text-slate-400">No pending approvals</p>';
    }
  } catch {
    el.innerHTML = '<p class="text-sm text-rose-400">Failed to load approvals</p>';
  }
}

async function approveProfile(studentId) {
  try {
    const res = await apiRequest(`/admin/students/${studentId}/approve-profile`, { method: 'POST' });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    if (res.ok) { loadApprovals(); loadStats(); }
  } catch { showToast('Failed to approve', 'error'); }
}

async function rejectProfile(studentId) {
  try {
    const res = await apiRequest(`/admin/students/${studentId}/reject-profile`, { method: 'POST' });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    if (res.ok) loadApprovals();
  } catch { showToast('Failed to reject', 'error'); }
}

// ── All Users ──────────────────────────────────────────────────────────────
async function loadUsers() {
  const el = document.getElementById('usersList');
  el.innerHTML = '<p class="text-sm text-slate-400">Loading…</p>';
  try {
    const res = await apiRequest('/admin/dashboard');
    const data = await res.json();
    if (!res.ok) { el.innerHTML = `<p class="text-sm text-rose-400">${data.message}</p>`; return; }
    if (data.users && data.users.length > 0) {
      el.innerHTML = `
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${data.users.map(u => `
              <tr>
                <td>${u.fullName}</td>
                <td class="text-slate-400">${u.email}</td>
                <td><span class="badge badge-${u.role.toLowerCase()}">${u.role}</span></td>
                <td><span class="badge ${u.isActive ? 'badge-active' : 'badge-inactive'}">${u.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button class="btn-toggle btn-sm" onclick="toggleStatus('${u._id}', '${u.fullName}')">Toggle Status</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } else {
      el.innerHTML = '<p class="text-sm text-slate-400">No users found</p>';
    }
  } catch {
    el.innerHTML = '<p class="text-sm text-rose-400">Failed to load users</p>';
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
loadStats();

