export function gradeToPoints(grade) {
  const map = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, Fail: 0 };
  return map[grade] ?? 0;
}

export function calculateCgpa(rows = []) {
  const totals = rows.reduce(
    (acc, row) => {
      const credits = Number(row.credits || 0);
      const points = Number(row.gradePoints ?? gradeToPoints(row.grade));
      if (credits > 0) {
        acc.credits += credits;
        acc.weighted += credits * points;
      }
      return acc;
    },
    { credits: 0, weighted: 0 }
  );

  if (!totals.credits) return 0;
  return Number((totals.weighted / totals.credits).toFixed(2));
}

export function marksToGrade(totalMarks, maxMarks = 120) {
  const pct = maxMarks > 0 ? (Number(totalMarks || 0) / maxMarks) * 100 : 0;
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'C';
  return 'Fail';
}