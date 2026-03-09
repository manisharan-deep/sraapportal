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
  toast.className = `fixed bottom-6 right-6 z-50 max-w-xs rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
    type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
  }`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${name}`));
  if (name === 'students') loadAllStudents();
  if (name === 'attendance') initAttendanceTab();
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

// ── Global state ───────────────────────────────────────────────────────────
let dashboardData = null;
let filterOptions = { branches: [], sections: [], semesters: [] };
let attStudents = [];         // students loaded for current attendance session
let attMap = {};              // pre-existing status map for the loaded session

// ── Load dashboard overview ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await apiRequest('/staff/dashboard');
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed to load dashboard', 'error'); return; }
    dashboardData = data;

    document.getElementById('stat-dept').textContent = data.staff?.department || '—';
    document.getElementById('stat-desig').textContent = data.staff?.designation || '—';
    document.getElementById('stat-mentoring').textContent = (data.staff?.mentoringStudents || []).length;
    document.getElementById('stat-total-students').textContent = data.totalStudents ?? '—';

    // Recent attendance
    const attEl = document.getElementById('recentAttendance');
    if (data.recentAttendance && data.recentAttendance.length) {
      attEl.innerHTML = data.recentAttendance.map(a => `
        <div class="flex justify-between items-center rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2">
          <span class="text-slate-200">${a.studentId?.name || a.studentId?.rollNumber || 'Unknown'}</span>
          <span class="badge badge-${(a.status||'').toLowerCase()}">${a.status}</span>
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
          <span class="badge badge-${(c.type||'').toLowerCase()}">${c.type} +${c.amount}</span>
        </div>`).join('');
    } else {
      coinsEl.innerHTML = '<p class="text-slate-500 text-xs">No recent assignments</p>';
    }
  } catch (e) {
    showToast('Failed to load dashboard', 'error');
  }
}

// ── Load filter options (branches, sections, semesters) ───────────────────
async function loadFilters() {
  try {
    const res = await apiRequest('/staff/filters');
    if (!res.ok) return;
    const data = await res.json();
    filterOptions = data;

    ['studBranch', 'attBranch'].forEach(id => {
      const el = document.getElementById(id);
      data.branches.forEach(b => {
        const o = document.createElement('option');
        o.value = b; o.textContent = b; el.appendChild(o);
      });
    });
    ['studSection', 'attSection'].forEach(id => {
      const el = document.getElementById(id);
      data.sections.forEach(s => {
        const o = document.createElement('option');
        o.value = s; o.textContent = `Section ${s}`; el.appendChild(o);
      });
    });
    ['studSem', 'attSemester'].forEach(id => {
      const el = document.getElementById(id);
      data.semesters.forEach(s => {
        const o = document.createElement('option');
        o.value = s; o.textContent = `Sem ${s}`; el.appendChild(o);
      });
    });
  } catch (e) { /* silent */ }
}

// ── Load coins + announcement student dropdowns ────────────────────────────
async function loadStudentDropdowns() {
  try {
    const res = await apiRequest('/staff/students');
    if (!res.ok) return;
    const { students } = await res.json();
    ['coin-studentId', 'ann-studentId'].forEach(id => {
      const sel = document.getElementById(id);
      students.forEach(s => {
        const o = document.createElement('option');
        o.value = s._id;
        o.textContent = `${s.name} (${s.rollNumber})`;
        sel.appendChild(o);
      });
    });
  } catch (e) { /* silent */ }
}

// ══════════════════════════════════════════════════════════════════════════
// ALL STUDENTS TAB
// ══════════════════════════════════════════════════════════════════════════
let currentStudents = [];

async function loadAllStudents(params = {}) {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="px-3 py-8 text-center text-slate-500">Loading…</td></tr>';

  const qs = new URLSearchParams();
  if (params.search)  qs.set('search',  params.search);
  if (params.branch)  qs.set('branch',  params.branch);
  if (params.section) qs.set('section', params.section);
  if (params.semester)qs.set('semester',params.semester);

  try {
    const res = await apiRequest(`/staff/students?${qs}`);
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed to load students', 'error'); return; }
    currentStudents = data.students || [];
    renderStudentsTable(currentStudents);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="9" class="px-3 py-8 text-center text-rose-400">Failed to load</td></tr>';
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTableBody');
  document.getElementById('studCount').textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="px-3 py-8 text-center text-slate-500">No students found</td></tr>';
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr class="hover:bg-white/5 cursor-pointer transition-colors">
      <td class="px-3 py-2.5 font-medium text-white">${s.name || '—'}</td>
      <td class="px-3 py-2.5 font-mono text-cyan-300">${s.rollNumber || '—'}</td>
      <td class="px-3 py-2.5">${s.branch || '—'}</td>
      <td class="px-3 py-2.5">${s.section || '—'}</td>
      <td class="px-3 py-2.5">${s.semester || '—'}</td>
      <td class="px-3 py-2.5">${s.cgpa != null ? s.cgpa.toFixed(2) : '—'}</td>
      <td class="px-3 py-2.5">
        <span class="${attendanceClass(s.attendancePercentage)}">${s.attendancePercentage != null ? s.attendancePercentage.toFixed(1) + '%' : '—'}</span>
      </td>
      <td class="px-3 py-2.5 text-xs">
        <span class="badge badge-alpha">α${s.alphaCoins||0}</span>
        <span class="badge badge-sigma">σ${s.sigmaCoins||0}</span>
        <span class="badge badge-penalty">P${s.penaltyCoins||0}</span>
      </td>
      <td class="px-3 py-2.5">
        <button class="rounded-lg bg-cyan-700 hover:bg-cyan-600 px-3 py-1 text-xs font-semibold" onclick="openStudentModal('${s._id}')">View</button>
      </td>
    </tr>`).join('');
}

function attendanceClass(pct) {
  if (pct == null) return 'text-slate-400';
  if (pct >= 75) return 'text-emerald-400 font-semibold';
  if (pct >= 60) return 'text-amber-400 font-semibold';
  return 'text-rose-400 font-semibold';
}

// Student filter button
document.getElementById('studFilterBtn').addEventListener('click', () => {
  loadAllStudents({
    search:  document.getElementById('studSearch').value.trim(),
    branch:  document.getElementById('studBranch').value,
    section: document.getElementById('studSection').value,
    semester:document.getElementById('studSem').value
  });
});
document.getElementById('studSearch').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('studFilterBtn').click();
});

// ── Student detail modal ───────────────────────────────────────────────────
async function openStudentModal(studentId) {
  const modal = document.getElementById('studentModal');
  const body  = document.getElementById('modalStudentBody');
  const title = document.getElementById('modalStudentName');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  title.textContent = 'Loading…';
  body.innerHTML = '<p class="text-slate-400">Fetching student data…</p>';

  try {
    const res = await apiRequest(`/staff/students/${studentId}`);
    const data = await res.json();
    if (!res.ok) { body.innerHTML = `<p class="text-rose-400">${data.message}</p>`; return; }
    const s = data.student;
    title.textContent = s.name || 'Student Profile';

    body.innerHTML = `
      <div class="grid grid-cols-2 gap-3">
        <div class="col-span-2 rounded-lg bg-slate-800/50 px-4 py-3">
          <p class="text-xs text-slate-400 mb-0.5">Enrollment Number</p>
          <p class="font-mono text-cyan-300 font-semibold">${s.userId?.enrollmentNumber || s.rollNumber || '—'}</p>
        </div>
        ${infoItem('Email', s.email || s.userId?.email || '—')}
        ${infoItem('Phone', s.phone || '—')}
        ${infoItem('Branch', s.branch || '—')}
        ${infoItem('Section', s.section || '—')}
        ${infoItem('Semester', s.semester || '—')}
        ${infoItem('CGPA', s.cgpa != null ? s.cgpa.toFixed(2) : '—')}
        ${infoItem('Backlogs', s.backlogs ?? '0')}
        ${infoItem('Attendance', s.attendancePercentage != null ? s.attendancePercentage.toFixed(1) + '%' : '—')}
        ${infoItem('Alpha Coins', s.alphaCoins ?? 0)}
        ${infoItem('Sigma Coins', s.sigmaCoins ?? 0)}
        ${infoItem('Penalty Coins', s.penaltyCoins ?? 0)}
        ${infoItem('Batch', s.batch || '—')}
        ${infoItem('Gender', s.gender || '—')}
        ${infoItem('Account Status', s.userId?.isActive ? 'Active' : 'Inactive')}
        ${infoItem('Joined', s.userId?.createdAt ? new Date(s.userId.createdAt).toLocaleDateString() : '—')}
      </div>
      ${data.recentAttendance && data.recentAttendance.length ? `
      <div class="mt-4">
        <p class="text-xs font-semibold text-slate-400 mb-2">Recent Attendance (last 10)</p>
        <div class="space-y-1">
          ${data.recentAttendance.map(a => `
            <div class="flex justify-between text-xs">
              <span class="text-slate-300">${a.courseId?.name || a.courseId?.code || 'Unknown Course'} · ${new Date(a.date).toLocaleDateString()}</span>
              <span class="badge badge-${(a.status||'').toLowerCase()}">${a.status}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}`;
  } catch (e) {
    body.innerHTML = '<p class="text-rose-400">Failed to load student details</p>';
  }
}

function infoItem(label, value) {
  return `<div class="rounded-lg bg-slate-800/40 px-3 py-2">
    <p class="text-xs text-slate-400 mb-0.5">${label}</p>
    <p class="text-sm text-slate-100">${value}</p>
  </div>`;
}

document.getElementById('closeStudentModal').addEventListener('click', () => {
  document.getElementById('studentModal').classList.add('hidden');
  document.getElementById('studentModal').classList.remove('flex');
});
document.getElementById('studentModal').addEventListener('click', function (e) {
  if (e.target === this) { this.classList.add('hidden'); this.classList.remove('flex'); }
});

// ══════════════════════════════════════════════════════════════════════════
// BULK ATTENDANCE TAB
// ══════════════════════════════════════════════════════════════════════════
function initAttendanceTab() {
  document.getElementById('attDate').valueAsDate = new Date();
}
initAttendanceTab();

// When branch/semester changes, refresh courses dropdown
async function loadCourses() {
  const branch = document.getElementById('attBranch').value;
  const semester = document.getElementById('attSemester').value;
  const sel = document.getElementById('attCourse');
  sel.innerHTML = '<option value="">— select course —</option>';
  if (!branch && !semester) return;

  try {
    const qs = new URLSearchParams();
    if (branch) qs.set('branch', branch);
    if (semester) qs.set('semester', semester);
    const res = await apiRequest(`/staff/courses?${qs}`);
    if (!res.ok) return;
    const { courses } = await res.json();
    courses.forEach(c => {
      const o = document.createElement('option');
      o.value = c._id;
      o.textContent = `${c.code} — ${c.name} (Sem ${c.semester})`;
      sel.appendChild(o);
    });
  } catch (e) { /* silent */ }
}

document.getElementById('attBranch').addEventListener('change', loadCourses);
document.getElementById('attSemester').addEventListener('change', loadCourses);

// Load students for the selected class
document.getElementById('loadAttStudentsBtn').addEventListener('click', async () => {
  const branch   = document.getElementById('attBranch').value;
  const section  = document.getElementById('attSection').value;
  const semester = document.getElementById('attSemester').value;
  const courseId = document.getElementById('attCourse').value;
  const date     = document.getElementById('attDate').value;

  if (!branch || !semester) { showToast('Select at least Branch and Semester', 'error'); return; }
  if (!courseId) { showToast('Select a Course', 'error'); return; }
  if (!date) { showToast('Select a Date', 'error'); return; }

  // fetch students
  const qs = new URLSearchParams({ branch, semester });
  if (section) qs.set('section', section);
  try {
    const [studRes, statusRes] = await Promise.all([
      apiRequest(`/staff/students?${qs}`),
      apiRequest(`/staff/attendance/status?courseId=${courseId}&date=${date}`)
    ]);
    const studData = await studRes.json();
    const statusData = statusRes.ok ? await statusRes.json() : { map: {} };
    if (!studRes.ok) { showToast(studData.message || 'Failed to load students', 'error'); return; }

    attStudents = studData.students || [];
    attMap = statusData.map || {};

    if (!attStudents.length) { showToast('No students found for selected filters', 'error'); return; }

    renderAttTable();
    document.getElementById('attControls').classList.remove('hidden');
    document.getElementById('attTableWrapper').classList.remove('hidden');
    document.getElementById('attSubmitRow').classList.remove('hidden');
    updateAttSummary();
    showToast(`Loaded ${attStudents.length} students`);
  } catch (e) {
    showToast('Failed to load students', 'error');
  }
});

function renderAttTable() {
  const tbody = document.getElementById('attTableBody');
  tbody.innerHTML = attStudents.map(s => {
    const existing = attMap[s._id] || 'PRESENT';
    return `
      <tr id="att-row-${s._id}" class="hover:bg-white/5">
        <td class="px-3 py-2.5 font-mono text-cyan-300">${s.rollNumber}</td>
        <td class="px-3 py-2.5 text-white">${s.name}</td>
        <td class="px-3 py-2.5 text-center">
          <div class="inline-flex rounded-lg overflow-hidden border border-white/10">
            <button class="att-btn px-4 py-1.5 text-xs font-bold transition-colors ${existing === 'PRESENT' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
              data-id="${s._id}" data-val="PRESENT" onclick="setAttStatus('${s._id}','PRESENT')">P</button>
            <button class="att-btn px-4 py-1.5 text-xs font-bold transition-colors ${existing === 'ABSENT' ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}"
              data-id="${s._id}" data-val="ABSENT" onclick="setAttStatus('${s._id}','ABSENT')">A</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function setAttStatus(studentId, status) {
  attMap[studentId] = status;
  const row = document.getElementById(`att-row-${studentId}`);
  row.querySelectorAll('.att-btn').forEach(btn => {
    const isActive = btn.dataset.val === status;
    const isPresent = btn.dataset.val === 'PRESENT';
    btn.className = `att-btn px-4 py-1.5 text-xs font-bold transition-colors ${
      isActive
        ? (isPresent ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white')
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    }`;
  });
  updateAttSummary();
}

function updateAttSummary() {
  const present = attStudents.filter(s => (attMap[s._id] || 'PRESENT') === 'PRESENT').length;
  document.getElementById('attSummary').textContent =
    `${present} Present / ${attStudents.length - present} Absent`;
}

document.getElementById('markAllPresent').addEventListener('click', () => {
  attStudents.forEach(s => setAttStatus(s._id, 'PRESENT'));
});
document.getElementById('markAllAbsent').addEventListener('click', () => {
  attStudents.forEach(s => setAttStatus(s._id, 'ABSENT'));
});

document.getElementById('submitBulkAttBtn').addEventListener('click', async () => {
  const courseId = document.getElementById('attCourse').value;
  const date     = document.getElementById('attDate').value;
  if (!courseId || !date || !attStudents.length) {
    showToast('Load students first before saving', 'error'); return;
  }
  const records = attStudents.map(s => ({
    studentId: s._id,
    status: attMap[s._id] || 'PRESENT'
  }));
  const btn = document.getElementById('submitBulkAttBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const res = await apiRequest('/staff/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify({ courseId, date, records })
    });
    const data = await res.json();
    btn.disabled = false; btn.textContent = 'Save Attendance';
    if (res.ok) { showToast(data.message); }
    else { showToast(data.message || 'Failed to save', 'error'); }
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Save Attendance';
    showToast('Network error', 'error');
  }
});

// ── Recent announcements ───────────────────────────────────────────────────
async function loadRecentAnnouncements() {
  const el = document.getElementById('annList');
  if (!el) return;
  const list = dashboardData?.recentAnnouncements || [];
  if (!list.length) { el.innerHTML = '<p class="text-slate-500 text-xs">No announcements yet.</p>'; return; }
  el.innerHTML = list.map(a => `
    <div class="rounded-lg border border-white/10 bg-slate-800/40 px-3 py-2">
      <p class="text-sm font-semibold text-white">${a.title}</p>
      <p class="text-xs text-slate-400 mt-0.5">${a.message}</p>
      <p class="text-xs text-slate-500 mt-1">${a.scope} · ${new Date(a.createdAt).toLocaleDateString()}</p>
    </div>`).join('');
}

// ── Announcement form ──────────────────────────────────────────────────────
document.getElementById('announcementForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('ann-msg');
  const scope = document.getElementById('ann-scope').value;
  const payload = {
    title:   document.getElementById('ann-title').value,
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
    if (res.ok) { showToast('Announcement posted!'); e.target.reset(); loadDashboard(); }
  } catch { msg.textContent = 'Network error'; msg.className = 'text-xs text-center text-rose-400'; msg.classList.remove('hidden'); }
});

// ── File upload form ───────────────────────────────────────────────────────
document.getElementById('fileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('file-msg');
  const payload = {
    name:  document.getElementById('file-name').value,
    url:   document.getElementById('file-url').value,
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
    type:      document.getElementById('coin-type').value,
    amount:    document.getElementById('coin-amount').value,
    reason:    document.getElementById('coin-reason').value
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
(async () => {
  await loadDashboard();
  loadFilters();
  loadStudentDropdowns();
})();
