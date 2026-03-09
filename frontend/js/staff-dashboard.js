if (!requireAuth() || !checkRole(['STAFF'])) {
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
  toast.className = `fixed top-6 right-6 z-50 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl ${
    type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
  }`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${name}`));
  if (name === 'students') renderMentoringStudents();
  if (name === 'announcements') loadRecentAnnouncements();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Announcement scope toggle ──────────────────────────────────────────────
document.getElementById('ann-scope').addEventListener('change', function () {
  document.getElementById('ann-batchGroup').classList.toggle('hidden', this.value !== 'BATCH');
  document.getElementById('ann-studentGroup').classList.toggle('hidden', this.value !== 'INDIVIDUAL');
});

// ── Load dashboard data ────────────────────────────────────────────────────
let dashboardData = null;
let allStudents = [];

async function loadDashboard() {
  try {
    const res = await apiRequest('/staff/dashboard');
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed to load', 'error'); return; }
    dashboardData = data;

    document.getElementById('stat-dept').textContent = data.staff?.department || '—';
    document.getElementById('stat-desig').textContent = data.staff?.designation || '—';
    document.getElementById('stat-mentoring').textContent = (data.staff?.mentoringStudents || []).length;
    document.getElementById('stat-announcements').textContent = (data.recentAnnouncements || []).length;

    // Recent attendance
    const attEl = document.getElementById('recentAttendance');
    if (data.recentAttendance && data.recentAttendance.length) {
      attEl.innerHTML = data.recentAttendance.map(a => `
        <div class="flex justify-between items-center rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2">
          <span class="text-slate-200">${a.studentId?.name || a.studentId?.rollNumber || '—'}</span>
          <span class="badge badge-${a.status.toLowerCase()}">${a.status}</span>
        </div>`).join('');
    } else {
      attEl.innerHTML = '<p class="text-slate-500 text-xs">No recent entries</p>';
    }

    // Recent coins
    const coinsEl = document.getElementById('recentCoins');
    if (data.recentCoins && data.recentCoins.length) {
      coinsEl.innerHTML = data.recentCoins.map(c => `
        <div class="flex justify-between items-center rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2">
          <span class="text-slate-200">${c.studentId?.name || '—'} — ${c.reason || 'No reason'}</span>
          <span class="badge badge-${c.type.toLowerCase()}">${c.type} +${c.amount}</span>
        </div>`).join('');
    } else {
      coinsEl.innerHTML = '<p class="text-slate-500 text-xs">No recent assignments</p>';
    }

  } catch (e) {
    showToast('Failed to load dashboard', 'error');
  }
}

// ── Load students for dropdowns ────────────────────────────────────────────
async function loadStudents() {
  try {
    const res = await apiRequest('/staff/students');
    const data = await res.json();
    if (!res.ok) return;
    allStudents = data.students || [];

    ['att-studentId', 'coin-studentId', 'ann-studentId'].forEach(id => {
      const sel = document.getElementById(id);
      const placeholder = sel.options[0];
      sel.innerHTML = '';
      sel.appendChild(placeholder);
      allStudents.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s._id;
        opt.textContent = `${s.name} (${s.rollNumber}) — ${s.branch} Sem ${s.semester}`;
        sel.appendChild(opt);
      });
    });
  } catch (e) { /* silent */ }
}

// ── Mentoring students tab ─────────────────────────────────────────────────
function renderMentoringStudents() {
  const el = document.getElementById('mentoringStudents');
  const list = dashboardData?.staff?.mentoringStudents || [];
  if (!list.length) {
    el.innerHTML = '<p class="text-sm text-slate-400">No mentoring students assigned yet.</p>';
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Roll Number</th><th>Branch</th><th>Section</th><th>Semester</th></tr></thead>
      <tbody>
        ${list.map(s => `
          <tr>
            <td>${s.name || '—'}</td>
            <td>${s.rollNumber || '—'}</td>
            <td>${s.branch}</td>
            <td>${s.section}</td>
            <td>${s.semester}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Recent announcements ───────────────────────────────────────────────────
async function loadRecentAnnouncements() {
  const el = document.getElementById('annList');
  const list = dashboardData?.recentAnnouncements || [];
  if (!list.length) { el.innerHTML = '<p class="text-slate-500 text-xs">No announcements yet.</p>'; return; }
  el.innerHTML = list.map(a => `
    <div class="rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2">
      <p class="text-sm font-semibold text-white">${a.title}</p>
      <p class="text-xs text-slate-400 mt-0.5">${a.message}</p>
      <p class="text-xs text-slate-500 mt-1">${a.scope} · ${new Date(a.createdAt).toLocaleDateString()}</p>
    </div>`).join('');
}

// ── Set today's date as default ────────────────────────────────────────────
document.getElementById('att-date').valueAsDate = new Date();

// ── Attendance form ────────────────────────────────────────────────────────
document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('att-msg');
  const payload = {
    studentId: document.getElementById('att-studentId').value,
    courseId: document.getElementById('att-courseId').value,
    date: document.getElementById('att-date').value,
    status: document.getElementById('att-status').value
  };
  try {
    const res = await apiRequest('/staff/attendance', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    msg.textContent = data.message;
    msg.className = `text-xs text-center ${res.ok ? 'text-emerald-400' : 'text-rose-400'}`;
    msg.classList.remove('hidden');
    if (res.ok) { showToast('Attendance marked!'); e.target.reset(); document.getElementById('att-date').valueAsDate = new Date(); }
  } catch { msg.textContent = 'Network error'; msg.className = 'text-xs text-center text-rose-400'; msg.classList.remove('hidden'); }
});

// ── Announcement form ──────────────────────────────────────────────────────
document.getElementById('announcementForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('ann-msg');
  const scope = document.getElementById('ann-scope').value;
  const payload = {
    title: document.getElementById('ann-title').value,
    message: document.getElementById('ann-message').value,
    scope
  };
  if (scope === 'BATCH') payload.batch = document.getElementById('ann-batch').value;
  if (scope === 'INDIVIDUAL') payload.studentId = document.getElementById('ann-studentId').value;

  try {
    const res = await apiRequest('/staff/announcements', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    msg.textContent = data.message;
    msg.className = `text-xs text-center ${res.ok ? 'text-emerald-400' : 'text-rose-400'}`;
    msg.classList.remove('hidden');
    if (res.ok) {
      showToast('Announcement posted!');
      e.target.reset();
      // refresh recent list
      await loadDashboard();
      loadRecentAnnouncements();
    }
  } catch { msg.textContent = 'Network error'; msg.className = 'text-xs text-center text-rose-400'; msg.classList.remove('hidden'); }
});

// ── File upload form ───────────────────────────────────────────────────────
document.getElementById('fileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('file-msg');
  const payload = {
    name: document.getElementById('file-name').value,
    url: document.getElementById('file-url').value,
    batch: document.getElementById('file-batch').value
  };
  try {
    const res = await apiRequest('/staff/files', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    msg.textContent = data.message;
    msg.className = `text-xs text-center ${res.ok ? 'text-emerald-400' : 'text-rose-400'}`;
    msg.classList.remove('hidden');
    if (res.ok) { showToast('File uploaded!'); e.target.reset(); }
  } catch { msg.textContent = 'Network error'; msg.className = 'text-xs text-center text-rose-400'; msg.classList.remove('hidden'); }
});

// ── Coins form ─────────────────────────────────────────────────────────────
document.getElementById('coinsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('coin-msg');
  const payload = {
    studentId: document.getElementById('coin-studentId').value,
    type: document.getElementById('coin-type').value,
    amount: document.getElementById('coin-amount').value,
    reason: document.getElementById('coin-reason').value
  };
  try {
    const res = await apiRequest('/staff/coins', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json();
    msg.textContent = data.message;
    msg.className = `text-xs text-center ${res.ok ? 'text-emerald-400' : 'text-rose-400'}`;
    msg.classList.remove('hidden');
    if (res.ok) { showToast('Coins assigned!'); e.target.reset(); }
  } catch { msg.textContent = 'Network error'; msg.className = 'text-xs text-center text-rose-400'; msg.classList.remove('hidden'); }
});

// ── Init ───────────────────────────────────────────────────────────────────
loadDashboard();
loadStudents();
