if (!requireAuth() || !checkRole(['STUDENT'])) {
  throw new Error('Access denied');
}

const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');
const academicsForm = document.getElementById('academicsForm');

// Load existing academic data
async function loadAcademics() {
  try {
    const response = await apiRequest('/student/dashboard');
    const data = await response.json();
    
    if (response.ok && data.student) {
      const student = data.student;
      
      document.getElementById('cgpa').value = student.cgpa || '';
      document.getElementById('attendancePercentage').value = student.attendancePercentage || '';
      document.getElementById('backlogs').value = student.backlogs || '0';
      document.getElementById('coursesCount').value = student.coursesCount || '';
      document.getElementById('mentorName').value = student.mentorName || '';
      document.getElementById('mentorContact').value = student.mentorContact || '';
      document.getElementById('alphaCoins').value = student.alphaCoins || '0';
      document.getElementById('sigmaCoins').value = student.sigmaCoins || '0';
    }
  } catch (error) {
    console.error('Failed to load academic data:', error);
    showError('Failed to load academic data. Please try again.');
  }
}

// Handle form submission
academicsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  hideAlerts();
  
  const formData = {
    cgpa: parseFloat(document.getElementById('cgpa').value) || 0,
    attendancePercentage: parseFloat(document.getElementById('attendancePercentage').value) || 0,
    backlogs: parseInt(document.getElementById('backlogs').value) || 0,
    coursesCount: parseInt(document.getElementById('coursesCount').value) || 0,
    mentorName: document.getElementById('mentorName').value.trim(),
    mentorContact: document.getElementById('mentorContact').value.trim(),
    alphaCoins: parseInt(document.getElementById('alphaCoins').value) || 0,
    sigmaCoins: parseInt(document.getElementById('sigmaCoins').value) || 0
  };
  
  try {
    const response = await apiRequest('/student/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showSuccess('Academic information updated successfully! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
    } else {
      showError(result.message || 'Failed to update academic information. Please try again.');
    }
  } catch (error) {
    console.error('Failed to update academics:', error);
    showError('An error occurred while updating your academic information. Please try again.');
  }
});

function showSuccess(message) {
  successAlert.textContent = message;
  successAlert.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
  errorAlert.textContent = message;
  errorAlert.classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAlerts() {
  successAlert.classList.remove('show');
  errorAlert.classList.remove('show');
}

// Load academic data on page load
loadAcademics();
