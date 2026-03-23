if (!requireAuth() || !checkRole(['STUDENT'])) {
  throw new Error('Access denied');
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `${num.toFixed(2)}%`;
}

function statusBadgeClass(status) {
  return String(status || '').toLowerCase() === 'present' ? 'status-present' : 'status-absent';
}

function renderAnnouncements(announcements = []) {
  const listEl = document.getElementById('announcementsList');
  if (!listEl) return;

  if (!announcements.length) {
    listEl.innerHTML = `
      <li class="announcement-empty">No announcements available right now.</li>
    `;
    return;
  }

  listEl.innerHTML = announcements.map((announcement) => {
    const dateText = announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : '';
    return `
      <li class="announcement-item">
        <div class="announcement-title-row">
          <h4>${announcement.title || 'Announcement'}</h4>
          ${dateText ? `<span class="announcement-date">${dateText}</span>` : ''}
        </div>
        <p>${announcement.message || '-'}</p>
      </li>
    `;
  }).join('');
}

function setProfileIcon(student) {
  const icon = document.getElementById('profileIcon');
  if (!icon) return;

  const activePhoto = (student && student.profilePhoto) ? student.profilePhoto : '';

  if (activePhoto) {
    icon.style.backgroundImage = `url(${activePhoto})`;
    icon.style.backgroundSize = 'cover';
    icon.style.backgroundPosition = 'center';
    icon.textContent = '';
    localStorage.setItem('studentProfilePhoto', activePhoto);
    return;
  }

  icon.style.backgroundImage = '';
  localStorage.removeItem('studentProfilePhoto');
  icon.textContent = '';
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  removeToken();
  window.location.href = '../../login.html?role=STUDENT';
});

async function loadDashboard() {
  try {
    const response = await apiRequest('/student/dashboard');
    const data = await response.json();

    if (response.ok && data.student) {
      const student = data.student;
      
      // Welcome banner - only show if data exists
      setText('studentName', student.name || '-');
      setText('rollNumber', student.rollNumber || '-');
      setText('program', student.program || '-');
      setText('branch', student.branch || '-');
      setProfileIcon(student);
      
      // Info cards - only show actual data
      setText('yearSem', student.yearSem || '-');
      setText('attendancePercent', formatPercent(student.attendancePercentage));
      setText('mentorName', student.mentorName || '-');
      setText('mentorContact', student.mentorContact || '-');
      setText('alphaCoins', student.alphaCoins || '0');
      setText('sigmaCoins', student.sigmaCoins || '0');
      setText('cgpa', student.cgpa || '-');
      setText('coursesCount', student.coursesCount || '0');
      setText('backlogsCount', student.backlogs || '0');
      renderAnnouncements(data.announcements || []);
      
      // Last Week Attendance - only show if data exists from API
      if (data.lastWeekAttendance && data.lastWeekAttendance.length > 0) {
        document.getElementById('lastWeekAttendance').innerHTML = data.lastWeekAttendance.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><a href="#">${row.date}</a></td>
            <td>${row.held}</td>
            <td><span class="attendance-status-badge ${statusBadgeClass(row.attend || row.status)}">${row.attend || row.status || '-'}</span></td>
          </tr>
        `).join('');
      } else {
        document.getElementById('lastWeekAttendance').innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; color: #999; padding: 20px;">No attendance data available</td>
          </tr>
        `;
      }
      
      // Course Wise Attendance - only show if data exists from API
      if (data.courseAttendance && data.courseAttendance.length > 0) {
        document.getElementById('courseAttendance').innerHTML = data.courseAttendance.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><a href="#">${row.courseName || row.name}</a></td>
            <td>${row.ltp || '-'}</td>
            <td>${row.held || '-'}</td>
            <td>${row.present || row.pr || '-'}</td>
            <td>${row.absent || row.ab || '-'}</td>
            <td>
              <span class="attendance-red">${formatPercent(row.percentage)}</span>
              <span class="attendance-status-badge ${statusBadgeClass(row.latestStatus)}">${row.latestStatus || '-'}</span>
            </td>
            <td>${row.loss || '-'}</td>
          </tr>
        `).join('');
      } else {
        document.getElementById('courseAttendance').innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: #999; padding: 20px;">No course attendance data available</td>
          </tr>
        `;
      }
    } else {
      // No data from API - show empty state
      showEmptyState();
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    // Show empty state on error
    showEmptyState();
  }
}

function showEmptyState() {
  // Set default values for all fields
  setText('studentName', '-');
  setText('rollNumber', '-');
  setText('program', '-');
  setText('branch', '-');
  setProfileIcon(null);
  setText('yearSem', '-');
  setText('attendancePercent', '-');
  setText('mentorName', '-');
  setText('mentorContact', '-');
  setText('alphaCoins', '0');
  setText('sigmaCoins', '0');
  setText('cgpa', '-');
  setText('coursesCount', '0');
  setText('backlogsCount', '0');
  renderAnnouncements([]);
  
  // Show no data messages in tables
  document.getElementById('lastWeekAttendance').innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; color: #999; padding: 20px;">No attendance data available</td>
    </tr>
  `;
  
  document.getElementById('courseAttendance').innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; color: #999; padding: 20px;">No course attendance data available</td>
    </tr>
  `;
}

function initAttendanceCalculator() {
  const btn = document.getElementById('calcAttendBtn');
  const result = document.getElementById('calcResult');
  if (!btn || !result) return;

  btn.addEventListener('click', () => {
    const required = Number(document.getElementById('requiredPct')?.value || 75);
    const present = Number(document.getElementById('presentClasses')?.value || 0);
    const total = Number(document.getElementById('totalClasses')?.value || 0);

    if (present < 0 || total < 0 || Number.isNaN(present) || Number.isNaN(total)) {
      result.style.display = 'block';
      result.textContent = 'Please enter valid non-negative numbers.';
      return;
    }

    if (present > total) {
      result.style.display = 'block';
      result.textContent = 'Present classes cannot be greater than total classes.';
      return;
    }

    const current = total > 0 ? (present / total) * 100 : 0;
    const needRatio = required / 100;

    if (total === 0) {
      result.style.display = 'block';
      result.innerHTML = `Current Attendance: 0.00%<br>Start attending classes to build attendance.`;
      return;
    }

    if (current >= required) {
      const bunkAllowed = Math.floor((present / needRatio) - total);
      result.style.display = 'block';
      result.innerHTML = `Current Attendance: ${current.toFixed(2)}%<br>You can bunk up to ${Math.max(0, bunkAllowed)} class(es) and remain at ${required}% or above.`;
    } else {
      const classesNeeded = Math.ceil(((needRatio * total) - present) / (1 - needRatio));
      result.style.display = 'block';
      result.innerHTML = `Current Attendance: ${current.toFixed(2)}%<br>Attend next ${Math.max(0, classesNeeded)} class(es) continuously to reach ${required}%.`;
    }
  });
}

loadDashboard();
initAttendanceCalculator();
