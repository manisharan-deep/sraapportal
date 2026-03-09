const classesRequiredFor75 = (totalClasses, presentClasses) => {
  return Math.max(0, Math.ceil((0.75 * totalClasses - presentClasses) / 0.25));
};

module.exports = { classesRequiredFor75 };
