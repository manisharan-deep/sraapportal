const GRADE_SCALE = [
  { grade: 'O', minPercentage: 90, points: 10 },
  { grade: 'A+', minPercentage: 80, points: 9 },
  { grade: 'A', minPercentage: 70, points: 8 },
  { grade: 'B+', minPercentage: 60, points: 7 },
  { grade: 'B', minPercentage: 50, points: 6 },
  { grade: 'C', minPercentage: 40, points: 5 }
];

const MAX_MARKS = 120;

function calculateGrade(totalMarks, maxMarks = MAX_MARKS) {
  const percentage = maxMarks > 0 ? (Number(totalMarks || 0) / maxMarks) * 100 : 0;
  const scale = GRADE_SCALE.find((item) => percentage >= item.minPercentage);
  return scale ? scale.grade : 'Fail';
}

function getGradePoints(grade) {
  const scale = GRADE_SCALE.find((item) => item.grade === grade);
  return scale ? scale.points : 0;
}

function normalizeMarks({ internalMarks = 0, externalMarks = 0, assignmentMarks = 0 }) {
  const internal = Number(internalMarks) || 0;
  const external = Number(externalMarks) || 0;
  const assignment = Number(assignmentMarks) || 0;
  const totalMarks = internal + external + assignment;
  const grade = calculateGrade(totalMarks);

  return {
    internalMarks: internal,
    externalMarks: external,
    assignmentMarks: assignment,
    totalMarks,
    grade,
    gradePoints: getGradePoints(grade)
  };
}

function calculateCgpa(rows = [], creditsLookup = new Map()) {
  let totalCredits = 0;
  let totalWeightedPoints = 0;

  rows.forEach((row) => {
    const credits = Number(creditsLookup.get(String(row.subject || '').toLowerCase()) || row.credits || 0);
    const gradePoints = Number(row.gradePoints ?? getGradePoints(row.grade));

    if (credits > 0) {
      totalCredits += credits;
      totalWeightedPoints += gradePoints * credits;
    }
  });

  if (!totalCredits) return 0;
  return Number((totalWeightedPoints / totalCredits).toFixed(2));
}

module.exports = {
  GRADE_SCALE,
  calculateGrade,
  getGradePoints,
  normalizeMarks,
  calculateCgpa
};