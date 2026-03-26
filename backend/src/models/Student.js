const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Basic Information
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  hallticket: { type: String, default: '', trim: true, index: true },
  fatherName: { type: String, default: '' },
  motherName: { type: String, default: '' },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'Male', 'Female', ''], default: '' },
  bloodGroup: { type: String, default: '' },
  
  // Admission Information
  admissionNumber: { type: String, default: '' },
  admissionDate: { type: Date },
  admissionCategory: { type: String, default: '' },
  admissionType: { type: String, default: '' },
  admissionQuota: { type: String, default: '' },
  academicStatus: { type: String, default: '' },
  
  // Parent Information
  fatherOccupation: { type: String, default: '' },
  fatherMobile: { type: String, default: '' },
  motherOccupation: { type: String, default: '' },
  motherMobile: { type: String, default: '' },
  
  // Contact Information (Student)
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  studentPhone: { type: String, default: '' },
  parentPhone: { type: String, default: '' },
  profilePhoto: { type: String, default: '' },
  
  // Contact Address
  contactState: { type: String, default: '' },
  contactDistrict: { type: String, default: '' },
  contactMandal: { type: String, default: '' },
  contactVillage: { type: String, default: '' },
  contactStreet: { type: String, default: '' },
  contactHouseNumber: { type: String, default: '' },
  contactPinCode: { type: String, default: '' },
  
  // Permanent Address
  permanentState: { type: String, default: '' },
  permanentDistrict: { type: String, default: '' },
  permanentMandal: { type: String, default: '' },
  permanentVillage: { type: String, default: '' },
  permanentStreet: { type: String, default: '' },
  permanentHouseNumber: { type: String, default: '' },
  permanentPinCode: { type: String, default: '' },
  
  // Academic Information
  branch: { type: String, required: true },
  section: { type: String, required: true },
  batch: { type: String, default: '' },
  yearSem: { type: String, default: '' },
  semester: { type: Number, required: true },
  admissionYear: { type: Number },
  program: { type: String, default: 'BTECH' },
  subjects: [{ type: String, trim: true }],
  
  // Performance Metrics
  cgpa: { type: Number, default: 0 },
  backlogs: { type: Number, default: 0 },
  attendancePercentage: { type: Number, default: 0 },
  coursesCount: { type: Number, default: 0 },
  attendance: { type: [attendanceEntrySchema], default: [] },
  
  // Mentor Information
  mentor: { type: String, default: '' },
  mentorName: { type: String, default: '' },
  mentorContact: { type: String, default: '' },
  
  // Rewards & Recognition
  alphaCoins: { type: Number, default: 0 },
  sigmaCoins: { type: Number, default: 0 },
  penaltyCoins: { type: Number, default: 0 },
  
  // Identification Information
  aadharNumber: { type: String, default: '' },
  identificationMarks1: { type: String, default: '' },
  identificationMarks2: { type: String, default: '' },
  hostelResident: { type: String, default: 'DAY SCHOLAR' },
  
  // SSC / 10th Class Details
  sscHallTicket: { type: String, default: '' },
  sscBoard: { type: String, default: '' },
  sscSchool: { type: String, default: '' },
  sscSchoolAddress: { type: String, default: '' },
  sscYearOfPass: { type: String, default: '' },
  sscMaxMarks: { type: String, default: '' },
  sscObtainedMarks: { type: String, default: '' },
  sscPercentage: { type: String, default: '' },
  sscMedium: { type: String, default: '' },
  sscPassType: { type: String, default: '' },
  
  // 10+2 / Intermediate Details
  interType: { type: String, default: '' },
  interHallTicket: { type: String, default: '' },
  interCollege: { type: String, default: '' },
  interCollegeAddress: { type: String, default: '' },
  interBoard: { type: String, default: '' },
  interGroup: { type: String, default: '' },
  interYearOfPass: { type: String, default: '' },
  interMaxMarks: { type: String, default: '' },
  interObtainedMarks: { type: String, default: '' },
  interPercentage: { type: String, default: '' },
  interMedium: { type: String, default: '' },
  interPassType: { type: String, default: '' },
  
  // Profile Management
  profileEditPendingApproval: { type: Boolean, default: false },
  pendingProfileData: {
    branch: { type: String, default: null },
    section: { type: String, default: null },
    semester: { type: Number, default: null },
    mentor: { type: String, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
