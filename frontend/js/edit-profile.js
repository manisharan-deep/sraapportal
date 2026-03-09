if (!requireAuth() || !checkRole(['STUDENT'])) {
  throw new Error('Access denied');
}

const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');
const loadingSpinner = document.getElementById('loadingSpinner');
const profileForm = document.getElementById('profileForm');
const profilePhotoInput = document.getElementById('profilePhotoInput');
const profilePhotoDisplay = document.getElementById('profilePhotoDisplay');
const PROFILE_PHOTO_KEY = 'studentProfilePhoto';
let profilePhotoData = localStorage.getItem(PROFILE_PHOTO_KEY) || '';

function renderProfilePhoto(photoData) {
  if (!profilePhotoDisplay) return;
  if (photoData) {
    profilePhotoDisplay.style.backgroundImage = `url(${photoData})`;
    profilePhotoDisplay.textContent = '';
  } else {
    profilePhotoDisplay.style.backgroundImage = '';
    profilePhotoDisplay.textContent = '👤';
  }
}

if (profilePhotoInput) {
  profilePhotoInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      profilePhotoData = String(reader.result || '');
      localStorage.setItem(PROFILE_PHOTO_KEY, profilePhotoData);
      renderProfilePhoto(profilePhotoData);
    };
    reader.readAsDataURL(file);
  });
}

// Load existing profile data
async function loadProfile() {
  loadingSpinner.classList.add('show');
  
  try {
    const response = await apiRequest('/student/dashboard');
    const data = await response.json();
    
    if (response.ok && data.student) {
      const student = data.student;
      
      // Student Basic Information
      document.getElementById('name').value = student.name || '';
      document.getElementById('rollNumber').value = student.rollNumber || '';
        document.getElementById('program').value = student.program || 'BTECH';
        document.getElementById('branch').value = student.branch || '';

        // Student Admission Information
        document.getElementById('admissionNumber').value = student.admissionNumber || '';
        document.getElementById('admissionDate').value = student.admissionDate ? student.admissionDate.split('T')[0] : '';
        document.getElementById('admissionCategory').value = student.admissionCategory || '';
        document.getElementById('admissionType').value = student.admissionType || '';
        document.getElementById('admissionQuota').value = student.admissionQuota || '';
        document.getElementById('academicStatus').value = student.academicStatus || '';

        // Student Basic Details
      document.getElementById('fatherName').value = student.fatherName || '';
        document.getElementById('fatherOccupation').value = student.fatherOccupation || '';
        document.getElementById('fatherMobile').value = student.fatherMobile || '';
      document.getElementById('motherName').value = student.motherName || '';
        document.getElementById('motherOccupation').value = student.motherOccupation || '';
        document.getElementById('motherMobile').value = student.motherMobile || '';
        document.getElementById('phone').value = student.phone || '';
        document.getElementById('email').value = student.email || '';
        profilePhotoData = student.profilePhoto || localStorage.getItem(PROFILE_PHOTO_KEY) || '';
        if (profilePhotoData) {
          localStorage.setItem(PROFILE_PHOTO_KEY, profilePhotoData);
        }
        renderProfilePhoto(profilePhotoData);
      document.getElementById('dateOfBirth').value = student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '';
      document.getElementById('gender').value = student.gender || '';
      
      // Contact Address
      document.getElementById('contactState').value = student.contactState || '';
      document.getElementById('contactDistrict').value = student.contactDistrict || '';
      document.getElementById('contactMandal').value = student.contactMandal || '';
      document.getElementById('contactVillage').value = student.contactVillage || '';
      document.getElementById('contactStreet').value = student.contactStreet || '';
      document.getElementById('contactHouseNumber').value = student.contactHouseNumber || '';
      document.getElementById('contactPinCode').value = student.contactPinCode || '';
      
      // Permanent Address
      document.getElementById('permanentState').value = student.permanentState || '';
      document.getElementById('permanentDistrict').value = student.permanentDistrict || '';
      document.getElementById('permanentMandal').value = student.permanentMandal || '';
      document.getElementById('permanentVillage').value = student.permanentVillage || '';
      document.getElementById('permanentStreet').value = student.permanentStreet || '';
      document.getElementById('permanentHouseNumber').value = student.permanentHouseNumber || '';
      document.getElementById('permanentPinCode').value = student.permanentPinCode || '';
      
      // Identification Details
      document.getElementById('aadharNumber').value = student.aadharNumber || '';
      document.getElementById('bloodGroup').value = student.bloodGroup || '';
      document.getElementById('identificationMarks1').value = student.identificationMarks1 || '';
      document.getElementById('identificationMarks2').value = student.identificationMarks2 || '';
      document.getElementById('hostelResident').value = student.hostelResident || 'DAY SCHOLAR';

      // SSC Details
      document.getElementById('sscHallTicket').value = student.sscHallTicket || '';
      document.getElementById('sscBoard').value = student.sscBoard || '';
      document.getElementById('sscSchool').value = student.sscSchool || '';
      document.getElementById('sscSchoolAddress').value = student.sscSchoolAddress || '';
      document.getElementById('sscYearOfPass').value = student.sscYearOfPass || '';
      document.getElementById('sscMaxMarks').value = student.sscMaxMarks || '';
      document.getElementById('sscObtainedMarks').value = student.sscObtainedMarks || '';
      document.getElementById('sscPercentage').value = student.sscPercentage || '';
      document.getElementById('sscMedium').value = student.sscMedium || '';
      document.getElementById('sscPassType').value = student.sscPassType || '';

      // 10+2 Details
      document.getElementById('interType').value = student.interType || '';
      document.getElementById('interHallTicket').value = student.interHallTicket || '';
      document.getElementById('interCollege').value = student.interCollege || '';
      document.getElementById('interCollegeAddress').value = student.interCollegeAddress || '';
      document.getElementById('interBoard').value = student.interBoard || '';
      document.getElementById('interGroup').value = student.interGroup || '';
      document.getElementById('interYearOfPass').value = student.interYearOfPass || '';
      document.getElementById('interMaxMarks').value = student.interMaxMarks || '';
      document.getElementById('interObtainedMarks').value = student.interObtainedMarks || '';
      document.getElementById('interPercentage').value = student.interPercentage || '';
      document.getElementById('interMedium').value = student.interMedium || '';
      document.getElementById('interPassType').value = student.interPassType || '';
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
    showError('Failed to load profile data. Please try again.');
  } finally {
    loadingSpinner.classList.remove('show');
  }
}

// Handle form submission
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  hideAlerts();
  
  const formData = {
      // Basic Information
    name: document.getElementById('name').value.trim(),
      program: document.getElementById('program').value,
      branch: document.getElementById('branch').value,
    
      // Admission Information
      admissionNumber: document.getElementById('admissionNumber').value.trim(),
      admissionDate: document.getElementById('admissionDate').value,
      admissionCategory: document.getElementById('admissionCategory').value.trim(),
      admissionType: document.getElementById('admissionType').value.trim(),
      admissionQuota: document.getElementById('admissionQuota').value.trim(),
      academicStatus: document.getElementById('academicStatus').value.trim(),
    
      // Basic Details
    fatherName: document.getElementById('fatherName').value.trim(),
      fatherOccupation: document.getElementById('fatherOccupation').value.trim(),
      fatherMobile: document.getElementById('fatherMobile').value.trim(),
    motherName: document.getElementById('motherName').value.trim(),
      motherOccupation: document.getElementById('motherOccupation').value.trim(),
      motherMobile: document.getElementById('motherMobile').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      profilePhoto: profilePhotoData,
      email: document.getElementById('email').value.trim(),
    dateOfBirth: document.getElementById('dateOfBirth').value,
    gender: document.getElementById('gender').value,
    
    // Contact Address
    contactState: document.getElementById('contactState').value,
    contactDistrict: document.getElementById('contactDistrict').value.trim(),
    contactMandal: document.getElementById('contactMandal').value.trim(),
    contactVillage: document.getElementById('contactVillage').value.trim(),
    contactStreet: document.getElementById('contactStreet').value.trim(),
    contactHouseNumber: document.getElementById('contactHouseNumber').value.trim(),
    contactPinCode: document.getElementById('contactPinCode').value.trim(),
    
    // Permanent Address
    permanentState: document.getElementById('permanentState').value.trim(),
    permanentDistrict: document.getElementById('permanentDistrict').value.trim(),
    permanentMandal: document.getElementById('permanentMandal').value.trim(),
    permanentVillage: document.getElementById('permanentVillage').value.trim(),
    permanentStreet: document.getElementById('permanentStreet').value.trim(),
    permanentHouseNumber: document.getElementById('permanentHouseNumber').value.trim(),
    permanentPinCode: document.getElementById('permanentPinCode').value.trim(),
    
    // Identification Details
    aadharNumber: document.getElementById('aadharNumber').value.trim(),
    bloodGroup: document.getElementById('bloodGroup').value,
    identificationMarks1: document.getElementById('identificationMarks1').value.trim(),
    identificationMarks2: document.getElementById('identificationMarks2').value.trim(),
    hostelResident: document.getElementById('hostelResident').value,
    
    // SSC Details
    sscHallTicket: document.getElementById('sscHallTicket').value.trim(),
    sscBoard: document.getElementById('sscBoard').value.trim(),
    sscSchool: document.getElementById('sscSchool').value.trim(),
    sscSchoolAddress: document.getElementById('sscSchoolAddress').value.trim(),
    sscYearOfPass: document.getElementById('sscYearOfPass').value.trim(),
    sscMaxMarks: document.getElementById('sscMaxMarks').value.trim(),
    sscObtainedMarks: document.getElementById('sscObtainedMarks').value.trim(),
    sscPercentage: document.getElementById('sscPercentage').value.trim(),
    sscMedium: document.getElementById('sscMedium').value.trim(),
    sscPassType: document.getElementById('sscPassType').value.trim(),
    
    // 10+2 Details
    interType: document.getElementById('interType').value.trim(),
    interHallTicket: document.getElementById('interHallTicket').value.trim(),
    interCollege: document.getElementById('interCollege').value.trim(),
    interCollegeAddress: document.getElementById('interCollegeAddress').value.trim(),
    interBoard: document.getElementById('interBoard').value.trim(),
    interGroup: document.getElementById('interGroup').value.trim(),
    interYearOfPass: document.getElementById('interYearOfPass').value.trim(),
    interMaxMarks: document.getElementById('interMaxMarks').value.trim(),
    interObtainedMarks: document.getElementById('interObtainedMarks').value.trim(),
    interPercentage: document.getElementById('interPercentage').value.trim(),
    interMedium: document.getElementById('interMedium').value.trim(),
    interPassType: document.getElementById('interPassType').value.trim()
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
      if (profilePhotoData) {
        localStorage.setItem(PROFILE_PHOTO_KEY, profilePhotoData);
      }
      showSuccess('Profile updated successfully! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
    } else {
      showError(result.message || 'Failed to update profile. Please try again.');
    }
  } catch (error) {
    console.error('Failed to update profile:', error);
    showError('An error occurred while updating your profile. Please try again.');
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

// Load profile data on page load
renderProfilePhoto(profilePhotoData);
loadProfile();
