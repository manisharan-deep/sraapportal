const { classesRequiredFor75 } = require('../../src/utils/attendance');

describe('Attendance Utility', () => {
  test('returns zero when already above 75%', () => {
    expect(classesRequiredFor75(100, 80)).toBe(0);
  });

  test('returns required classes to hit 75%', () => {
    expect(classesRequiredFor75(40, 20)).toBe(40);
  });
});
