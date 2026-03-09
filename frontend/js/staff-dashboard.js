if (!requireAuth('/login.html?role=STAFF') || !checkRole(['STAFF'])) {
  throw new Error('Access denied');
}

document.getElementById('userName').textContent = getUserName();
document.getElementById('logoutBtn').addEventListener('click', () => {
  removeToken();
  window.location.href = '../../login.html?role=STAFF';
});

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = type === 'success' ? 'toast-success' : 'toast-error';
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
        <div class="recent-item">
          <span>${a.studentId?.name || a.studentId?.rollNumber || 'Unknown'}</span>
          <span class="badge badge-${(a.status||'').toLowerCase()}">${a.status}</span>
        </div>`).join('');
    } else {
      attEl.innerHTML = '<p class="text-muted">No recent entries</p>';
    }

    // Recent coins
    const coinsEl = document.getElementById('recentCoins');
    if (data.recentCoins && data.recentCoins.length) {
      coinsEl.innerHTML = data.recentCoins.map(c => `
        <div class="recent-item">
          <span>${c.studentId?.name || '—'} — ${c.reason || 'No reason'}</span>
          <span class="badge badge-${(c.type||'').toLowerCase()}">${c.type} +${c.amount}</span>
        </div>`).join('');
    } else {
      coinsEl.innerHTML = '<p class="text-muted">No recent assignments</p>';
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
    ['coin-studentId', 'ann-studentId', 'marks-student'].forEach(id => {
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
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;padding:24px;">Loading…</td></tr>';

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
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;padding:24px;">No students found</td></tr>';
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr>
      <td style="font-weight:600;">${s.name || '—'}</td>
      <td style="font-family:monospace;color:#1e88e5;">${s.rollNumber || '—'}</td>
      <td>${s.branch || '—'}</td>
      <td>${s.section || '—'}</td>
      <td>${s.semester || '—'}</td>
      <td>${s.cgpa != null ? s.cgpa.toFixed(2) : '—'}</td>
      <td><span class="${attendanceClass(s.attendancePercentage)}">${s.attendancePercentage != null ? s.attendancePercentage.toFixed(1) + '%' : '—'}</span></td>
      <td>
        <span class="badge badge-alpha">a${s.alphaCoins||0}</span>
        <span class="badge badge-sigma">s${s.sigmaCoins||0}</span>
        <span class="badge badge-penalty">P${s.penaltyCoins||0}</span>
      </td>
      <td><button class="btn-view" onclick="openStudentModal('${s._id}')">View</button></td>
    </tr>`).join('');
}

function attendanceClass(pct) {
  if (pct == null) return 'text-muted';
  if (pct >= 75) return 'att-good';
  if (pct >= 60) return 'att-warn';
  return 'att-bad';
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
  title.textContent = 'Loading…';
  body.innerHTML = '<p class="text-slate-400">Fetching student data…</p>';

  try {
    const res = await apiRequest(`/staff/students/${studentId}`);
    const data = await res.json();
    if (!res.ok) { body.innerHTML = `<p class="text-rose-400">${data.message}</p>`; return; }
    const s = data.student;
    title.textContent = s.name || 'Student Profile';

    body.innerHTML = `
      <div style="background:#e0f2fe;border-radius:6px;padding:10px 12px;margin-bottom:10px;">
        <span style="font-size:11px;color:#6b7280;font-weight:600;display:block;">Enrollment Number</span>
        <span class="di-mono">${s.userId?.enrollmentNumber || s.rollNumber || '—'}</span>
      </div>
      <div class="detail-grid">
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
      <div style="margin-top:14px;">
        <p style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">Recent Attendance (last 10)</p>
        ${data.recentAttendance.map(a => `
          <div class="recent-item" style="font-size:13px;">
            <span>${a.courseId?.name || a.courseId?.code || 'Unknown Course'} · ${new Date(a.date).toLocaleDateString()}</span>
            <span class="badge badge-${(a.status||'').toLowerCase()}">${a.status}</span>
          </div>`).join('')}
      </div>` : ''}`;
  } catch (e) {
    body.innerHTML = '<p style="color:#dc2626;">Failed to load student details</p>';
  }
}

function infoItem(label, value) {
  return `<div class="detail-item">
    <span class="di-label">${label}</span>
    <span class="di-val">${value}</span>
  </div>`;
}

document.getElementById('closeStudentModal').addEventListener('click', () => {
  document.getElementById('studentModal').classList.add('hidden');
});
document.getElementById('studentModal').addEventListener('click', function (e) {
  if (e.target === this) { this.classList.add('hidden'); }
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
      <tr id="att-row-${s._id}">
        <td style="font-family:monospace;color:#1e88e5;">${s.rollNumber}</td>
        <td style="font-weight:500;">${s.name}</td>
        <td style="text-align:center;">
          <div class="att-btn-wrap">
            <button class="att-btn ${existing === 'PRESENT' ? 'att-btn-p-active' : 'att-btn-inactive'}"
              data-id="${s._id}" data-val="PRESENT" onclick="setAttStatus('${s._id}','PRESENT')">P</button>
            <button class="att-btn ${existing === 'ABSENT' ? 'att-btn-a-active' : 'att-btn-inactive'}"
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
    btn.className = `att-btn ${isActive ? (isPresent ? 'att-btn-p-active' : 'att-btn-a-active') : 'att-btn-inactive'}`;
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
  if (!list.length) { el.innerHTML = '<p class="text-muted">No announcements yet.</p>'; return; }
  el.innerHTML = list.map(a => `
    <div class="recent-item" style="flex-direction:column;align-items:flex-start;gap:4px;">
      <strong style="font-size:14px;color:#1e3a6d;">${a.title}</strong>
      <span style="font-size:13px;color:#374151;">${a.message}</span>
      <span class="text-muted">${a.scope} · ${new Date(a.createdAt).toLocaleDateString()}</span>
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
    msg.style.color = res.ok ? '#15803d' : '#dc2626';
    msg.classList.remove('hidden');
    if (res.ok) { showToast('Announcement posted!'); e.target.reset(); loadDashboard(); }
  } catch { msg.textContent = 'Network error'; msg.style.color = '#dc2626'; msg.classList.remove('hidden'); }
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
    msg.style.color = res.ok ? '#15803d' : '#dc2626';
    msg.classList.remove('hidden');
    if (res.ok) { showToast('File uploaded!'); e.target.reset(); }
  } catch { msg.textContent = 'Network error'; msg.style.color = '#dc2626'; msg.classList.remove('hidden'); }
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
    msg.style.color = res.ok ? '#15803d' : '#dc2626';
    msg.classList.remove('hidden');
    if (res.ok) { showToast('Coins assigned!'); e.target.reset(); }
  } catch { msg.textContent = 'Network error'; msg.style.color = '#dc2626'; msg.classList.remove('hidden'); }
});

// ══════════════════════════════════════════════════════════════════════════
// MARKS TAB
// ══════════════════════════════════════════════════════════════════════════
let currentMarksCourses = [];

document.getElementById('loadMarksBtn').addEventListener('click', async () => {
  const studentId = document.getElementById('marks-student').value;
  const semester  = document.getElementById('marks-semester').value;
  const wrapper   = document.getElementById('marksTableWrapper');
  const tbody     = document.getElementById('marksTableBody');
  const msg       = document.getElementById('marks-msg');
  msg.classList.add('hidden');
  if (!studentId || !semester) { showToast('Please select a student and semester', 'error'); return; }

  // find the student's branch from already-loaded list
  const studentSel = document.getElementById('marks-student');
  const selectedOption = studentSel.options[studentSel.selectedIndex];
  // We need branch — fetch the student detail
  let branch = '';
  try {
    const detailRes = await apiRequest(`/staff/students/${studentId}`);
    if (detailRes.ok) {
      const detail = await detailRes.json();
      branch = detail.student ? detail.student.branch || '' : '';
    }
  } catch { /* ignore, courses will load without branch filter */ }

  try {
    const qs = new URLSearchParams({ semester });
    if (branch) qs.set('branch', branch);
    const [courseRes, resultRes] = await Promise.all([
      apiRequest(`/staff/courses?${qs}`),
      apiRequest(`/staff/results/${studentId}?semester=${semester}`)
    ]);
    if (!courseRes.ok) { showToast('Failed to load courses', 'error'); return; }
    const { courses } = await courseRes.json();
    currentMarksCourses = courses || [];

    let existingCie = {};
    let existingEte = {};
    if (resultRes.ok) {
      const rData = await resultRes.json();
      const r = rData.result;
      if (r) {
        (r.cie || []).forEach(c => { existingCie[c.courseCode] = c.marks; });
        (r.ete || []).forEach(c => { existingEte[c.courseCode] = c.marks; });
      }
    }

    if (currentMarksCourses.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#6b7280;padding:18px;">No courses found for this branch &amp; semester.</td></tr>';
    } else {
      tbody.innerHTML = currentMarksCourses.map(c => `
        <tr>
          <td>${c.code}</td>
          <td>${c.name}</td>
          <td><input type="number" id="cie-${c.code}" min="0" max="40" value="${existingCie[c.code] !== undefined ? existingCie[c.code] : ''}" style="width:80px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;"></td>
          <td><input type="number" id="ete-${c.code}" min="0" max="60" value="${existingEte[c.code] !== undefined ? existingEte[c.code] : ''}" style="width:80px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;"></td>
        </tr>`).join('');
    }
    wrapper.classList.remove('hidden');
  } catch { showToast('Network error loading marks data', 'error'); }
});

document.getElementById('saveMarksBtn').addEventListener('click', async () => {
  const studentId = document.getElementById('marks-student').value;
  const semester  = document.getElementById('marks-semester').value;
  const msg       = document.getElementById('marks-msg');
  if (!studentId || !semester || currentMarksCourses.length === 0) { showToast('Load courses first', 'error'); return; }

  const cie = [], ete = [];
  currentMarksCourses.forEach(c => {
    const cieVal = document.getElementById(`cie-${c.code}`);
    const eteVal = document.getElementById(`ete-${c.code}`);
    if (cieVal && cieVal.value !== '') cie.push({ courseCode: c.code, marks: Number(cieVal.value) });
    if (eteVal && eteVal.value !== '') ete.push({ courseCode: c.code, marks: Number(eteVal.value) });
  });

  try {
    const res = await apiRequest('/staff/results', { method: 'POST', body: JSON.stringify({ studentId, semester, cie, ete }) });
    const data = await res.json();
    msg.textContent = data.message || (res.ok ? 'Saved!' : 'Error saving marks');
    msg.style.color = res.ok ? '#15803d' : '#dc2626';
    msg.classList.remove('hidden');
    if (res.ok) showToast('Marks saved successfully!');
  } catch { msg.textContent = 'Network error'; msg.style.color = '#dc2626'; msg.classList.remove('hidden'); }
});

// ── Init ───────────────────────────────────────────────────────────────────
(async () => {
  await loadDashboard();
  loadFilters();
  loadStudentDropdowns();
})();
