const User = require('../models/User');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signRefreshToken } = require('../utils/tokens');
const env = require('../config/env');
const fullNameRegex = /^[A-Za-z\s.'-]+$/;
const escapeForRegex = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const register = asyncHandler(async (req, res) => {
  const { fullName, email, role, password, enrollmentNumber, username } = req.body;
  const fullNameTrimmed = String(fullName || '').trim();

  if (!fullNameRegex.test(fullNameTrimmed)) {
    return res.status(400).json({ message: 'Full Name should contain only alphabets' });
  }

  // Check for an existing user. If one exists but has no profile (orphaned from
  // a previous failed registration), clean it up so the user can re-register.
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const hasProfile =
      (existingUser.role === 'STUDENT' && (await Student.exists({ userId: existingUser._id }))) ||
      ((existingUser.role === 'STAFF' || existingUser.role === 'ADMIN') &&
        (await Staff.exists({ userId: existingUser._id })));

    if (hasProfile) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    // Orphaned user — delete so registration can proceed
    await User.findByIdAndDelete(existingUser._id);
  }

  if (role === 'STUDENT' && enrollmentNumber) {
    const existingEnrollment = await User.findOne({ enrollmentNumber });
    if (existingEnrollment) {
      return res.status(400).json({ message: 'Enrollment number already exists' });
    }
  }

  if ((role === 'STAFF' || role === 'ADMIN') && username) {
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already exists' });
    }
  }

  const user = await User.create({
    fullName: fullNameTrimmed,
    email,
    role,
    password,
    enrollmentNumber: role === 'STUDENT' ? enrollmentNumber : undefined,
    username: (role === 'STAFF' || role === 'ADMIN') ? username : undefined
  });

  try {
    if (role === 'STUDENT') {
      await Student.create({
        userId: user._id,
        name: fullNameTrimmed,
        rollNumber: enrollmentNumber,
        branch: 'Not Set',
        section: 'Not Set',
        semester: 1
      });
    } else if (role === 'STAFF') {
      await Staff.create({
        userId: user._id,
        department: 'Not Set',
        designation: 'Not Set'
      });
    }
  } catch (profileError) {
    // Roll back — delete the User so the account isn't stuck in a broken state
    await User.findByIdAndDelete(user._id);
    throw profileError;
  }

  return res.status(201).json({ message: 'Registration successful', userId: user._id });
});

const login = asyncHandler(async (req, res) => {
  const role = String(req.body.role || '').trim().toUpperCase();
  const identifier = String(req.body.identifier || '').trim();
  const { password } = req.body;

  if (!['STUDENT', 'STAFF', 'ADMIN'].includes(role) || !identifier || !password) {
    return res.status(400).json({ message: 'identifier, password and valid role are required' });
  }

  const rolePattern = new RegExp(`^${escapeForRegex(role)}$`, 'i');
  const query = { role: rolePattern };
  const exactCaseInsensitive = new RegExp(`^${escapeForRegex(identifier)}$`, 'i');
  if (role === 'STUDENT') {
    query.enrollmentNumber = exactCaseInsensitive;
  } else {
    query.$or = [
      { username: exactCaseInsensitive },
      { email: exactCaseInsensitive }
    ];
  }

  const user = await User.findOne(query);
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: 'Account is inactive' });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();

  return res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'Unauthorized' });

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await User.findOne({ _id: decoded.sub, refreshToken });
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const accessToken = signAccessToken(user);
  res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', secure: false });
  return res.json({ accessToken });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
});

const seedAdmin = asyncHandler(async (req, res) => {
  const username = process.env.ADMIN_SEED_USERNAME || 'admin';
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@sru.local';
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!password) {
    return res.status(400).json({ message: 'Set ADMIN_SEED_PASSWORD in environment before seeding admin' });
  }

  const exists = await User.findOne({ role: 'ADMIN', username });
  if (exists) return res.json({ message: 'Admin already exists' });

  const admin = await User.create({
    fullName: 'System Admin',
    role: 'ADMIN',
    username,
    email,
    password
  });

  await Staff.create({
    userId: admin._id,
    department: 'Administration',
    designation: 'Administrator'
  });

  return res.json({ message: `Seeded admin user: ${username}` });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  seedAdmin
};
