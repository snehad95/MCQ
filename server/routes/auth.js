const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { auth } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const {
  loginOtpEmail,
  registrationEmail,
  forgotPasswordEmail,
  passwordChangedEmail,
  changeEmailOtpEmail,
  emailChangedEmail,
  registrationOtpEmail,
} = require('../utils/emailTemplates');
const {
  generateOtp,
  hashOtp,
  verifyOtp,
  getOtpExpiry,
  getBlockExpiry,
  MAX_FAILED_ATTEMPTS,
} = require('../utils/otpUtils');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Issue a JWT token for a user */
const issueToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

/**
 * Create (or replace) an OTP record in DB and send an email.
 * Returns the plain OTP (for sending) and the saved Otp document.
 */
const createAndSendOtp = async ({ email, purpose, pendingEmail = null, userName, emailHtmlFn }) => {
  // Delete any existing OTP for this email+purpose (allow resend)
  await Otp.deleteMany({ email, purpose });

  const plain = generateOtp();
  const otpHash = await hashOtp(plain);

  const otpDoc = await Otp.create({
    email,
    purpose,
    otpHash,
    expiresAt: getOtpExpiry(),
    pendingEmail,
  });

  console.log(`[OTP Debug] Generated OTP: ${plain} for purpose: ${purpose} to: ${email}`);

  // Send email (non-blocking failure — we catch but still propagate)
  await sendEmail(email, getSubjectByPurpose(purpose), emailHtmlFn(plain));

  return { plain, otpDoc };
};

const getSubjectByPurpose = (purpose) => {
  const subjects = {
    login: '🔐 Your ExamPortal Login OTP',
    forgot_password: '🔑 ExamPortal Password Reset OTP',
    change_email: '📧 Verify Your New Email — ExamPortal',
    register: '📧 Verify Your Email to Register — ExamPortal',
  };
  return subjects[purpose] || 'ExamPortal OTP';
};

// ─────────────────────────────────────────────
// @route   POST /api/auth/register/request-otp
// @desc    Validate details and send registration OTP
// ─────────────────────────────────────────────
router.post('/register/request-otp', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if blocked
    const existingOtp = await Otp.findOne({ email: email.toLowerCase(), purpose: 'register' });
    if (existingOtp?.blockedUntil && existingOtp.blockedUntil > new Date()) {
      const waitMins = Math.ceil((existingOtp.blockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${waitMins} minute(s).`,
      });
    }

    // Generate & send OTP
    await createAndSendOtp({
      email: email.toLowerCase(),
      purpose: 'register',
      userName: name,
      emailHtmlFn: (otp) => registrationOtpEmail(name, otp),
    });

    res.json({
      message: 'Verification OTP sent to your email address',
      requiresOtp: true,
      email: email.toLowerCase(),
    });
  } catch (error) {
    console.error('Register OTP request error:', error);
    res.status(500).json({ message: 'Server error during registration OTP request' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Verify OTP and complete user registration
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ message: 'Name, email, password, and OTP are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const emailLower = email.toLowerCase();

    let user = await User.findOne({ email: emailLower });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const otpDoc = await Otp.findOne({
      email: emailLower,
      purpose: 'register',
      isUsed: false,
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or already used. Please request a new OTP.' });
    }

    // Check block
    if (otpDoc.blockedUntil && otpDoc.blockedUntil > new Date()) {
      const waitMins = Math.ceil((otpDoc.blockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${waitMins} minute(s).`,
      });
    }

    // Check expiry
    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email: emailLower, purpose: 'register' });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValid = await verifyOtp(otp.trim(), otpDoc.otpHash);

    if (!isValid) {
      otpDoc.failedAttempts += 1;

      if (otpDoc.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        otpDoc.blockedUntil = getBlockExpiry();
        await otpDoc.save();
        return res.status(429).json({
          message: 'Too many incorrect attempts. You are blocked for 15 minutes.',
        });
      }

      const remaining = MAX_FAILED_ATTEMPTS - otpDoc.failedAttempts;
      await otpDoc.save();
      return res.status(400).json({
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Now, create the user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email: emailLower, password: hashedPassword, emailVerified: true });
    await user.save();

    // Send welcome email (best-effort)
    try {
      await sendEmail(
        emailLower,
        '🎉 Welcome to ExamPortal — Account Created',
        registrationEmail(name)
      );
    } catch (emailErr) {
      console.error('Welcome email failed (non-fatal):', emailErr.message);
    }

    const token = issueToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Validate credentials → send Login OTP
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if there's a block on login OTPs for this email
    const existingOtp = await Otp.findOne({ email: user.email, purpose: 'login' });
    if (existingOtp?.blockedUntil && existingOtp.blockedUntil > new Date()) {
      const waitMins = Math.ceil((existingOtp.blockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${waitMins} minute(s).`,
      });
    }

    // Generate & send OTP
    await createAndSendOtp({
      email: user.email,
      purpose: 'login',
      userName: user.name,
      emailHtmlFn: (otp) => loginOtpEmail(user.name, otp),
    });

    res.json({
      message: 'OTP sent to your registered email address',
      requiresOtp: true,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/login/verify-otp
// @desc    Verify login OTP → issue JWT
// ─────────────────────────────────────────────
router.post('/login/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: 'login',
      isUsed: false,
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or already used. Please request a new OTP.' });
    }

    // Check block
    if (otpDoc.blockedUntil && otpDoc.blockedUntil > new Date()) {
      const waitMins = Math.ceil((otpDoc.blockedUntil - new Date()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${waitMins} minute(s).`,
      });
    }

    // Check expiry
    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'login' });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValid = await verifyOtp(otp.trim(), otpDoc.otpHash);

    if (!isValid) {
      otpDoc.failedAttempts += 1;

      if (otpDoc.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        otpDoc.blockedUntil = getBlockExpiry();
        await otpDoc.save();
        return res.status(429).json({
          message: 'Too many incorrect attempts. You are blocked for 15 minutes.',
        });
      }

      const remaining = MAX_FAILED_ATTEMPTS - otpDoc.failedAttempts;
      await otpDoc.save();
      return res.status(400).json({
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const token = issueToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for any purpose
// ─────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, purpose } = req.body;

    if (!email || !purpose) {
      return res.status(400).json({ message: 'Email and purpose are required' });
    }

    const validPurposes = ['login', 'forgot_password', 'change_email', 'register'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ message: 'Invalid OTP purpose' });
    }

    let user = null;
    if (purpose !== 'register') {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: 'If an account exists, a new OTP has been sent.' });
      }
    }

    let emailHtmlFn;
    let pendingEmail = null;
    const name = purpose === 'register' ? (req.body.name || 'User') : user.name;

    if (purpose === 'login') {
      emailHtmlFn = (otp) => loginOtpEmail(user.name, otp);
    } else if (purpose === 'forgot_password') {
      emailHtmlFn = (otp) => forgotPasswordEmail(user.name, otp);
    } else if (purpose === 'change_email') {
      // Need the pending email
      const existing = await Otp.findOne({ email: user.email, purpose: 'change_email' });
      pendingEmail = existing?.pendingEmail || null;
      emailHtmlFn = (otp) => changeEmailOtpEmail(user.name, otp, pendingEmail || '');
    } else if (purpose === 'register') {
      emailHtmlFn = (otp) => registrationOtpEmail(name, otp);
    }

    await createAndSendOtp({
      email: email.toLowerCase(),
      purpose,
      pendingEmail,
      userName: name,
      emailHtmlFn,
    });

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP resend' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/forgot-password
// @desc    Send forgot-password OTP to email
// ─────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.json({ message: 'If that email is registered, an OTP has been sent.' });
    }

    await createAndSendOtp({
      email: user.email,
      purpose: 'forgot_password',
      userName: user.name,
      emailHtmlFn: (otp) => forgotPasswordEmail(user.name, otp),
    });

    res.json({
      message: 'OTP sent to your registered email address.',
      email: user.email,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/verify-reset-otp
// @desc    Verify forgot-password OTP only (without changing password)
// ─────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: 'forgot_password',
      isUsed: false,
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or already used. Please request a new OTP.' });
    }

    if (otpDoc.blockedUntil && otpDoc.blockedUntil > new Date()) {
      const waitMins = Math.ceil((otpDoc.blockedUntil - new Date()) / 60000);
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${waitMins} minute(s).` });
    }

    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'forgot_password' });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValid = await verifyOtp(otp.trim(), otpDoc.otpHash);

    if (!isValid) {
      otpDoc.failedAttempts += 1;
      if (otpDoc.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        otpDoc.blockedUntil = getBlockExpiry();
        await otpDoc.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. You are blocked for 15 minutes.' });
      }
      const remaining = MAX_FAILED_ATTEMPTS - otpDoc.failedAttempts;
      await otpDoc.save();
      return res.status(400).json({ message: `Incorrect OTP. ${remaining} attempt(s) remaining.` });
    }

    // OTP is valid — do NOT mark as used yet; that happens in /reset-password
    res.json({ message: 'OTP verified. Please set your new password.' });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/reset-password
// @desc    Verify forgot-password OTP → update password
// ─────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const otpDoc = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: 'forgot_password',
      isUsed: false,
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or already used. Please request a new OTP.' });
    }

    if (otpDoc.blockedUntil && otpDoc.blockedUntil > new Date()) {
      const waitMins = Math.ceil((otpDoc.blockedUntil - new Date()) / 60000);
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${waitMins} minute(s).` });
    }

    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'forgot_password' });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValid = await verifyOtp(otp.trim(), otpDoc.otpHash);

    if (!isValid) {
      otpDoc.failedAttempts += 1;
      if (otpDoc.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        otpDoc.blockedUntil = getBlockExpiry();
        await otpDoc.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. You are blocked for 15 minutes.' });
      }
      const remaining = MAX_FAILED_ATTEMPTS - otpDoc.failedAttempts;
      await otpDoc.save();
      return res.status(400).json({ message: `Incorrect OTP. ${remaining} attempt(s) remaining.` });
    }

    // Mark used and update password
    otpDoc.isUsed = true;
    await otpDoc.save();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Send confirmation email (best-effort)
    try {
      await sendEmail(user.email, '✅ Password Reset Successful — ExamPortal', passwordChangedEmail(user.name));
    } catch (e) {
      console.error('Password change confirmation email failed:', e.message);
    }

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/change-password
// @desc    Authenticated password change (verify old pw first)
// ─────────────────────────────────────────────
router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Send confirmation email (best-effort)
    try {
      await sendEmail(user.email, '✅ Password Changed — ExamPortal', passwordChangedEmail(user.name));
    } catch (e) {
      console.error('Password change email failed:', e.message);
    }

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/change-email/request
// @desc    Request email change — send OTP to new email
// ─────────────────────────────────────────────
router.post('/change-email/request', auth, async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ message: 'New email is required' });
    }

    const emailLower = newEmail.toLowerCase();

    // Prevent duplicate email
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(400).json({ message: 'This email is already in use by another account' });
    }

    const user = await User.findById(req.user._id);

    await createAndSendOtp({
      email: emailLower,
      purpose: 'change_email',
      pendingEmail: emailLower,
      userName: user.name,
      emailHtmlFn: (otp) => changeEmailOtpEmail(user.name, otp, emailLower),
    });

    res.json({ message: `OTP sent to ${emailLower}. Verify to confirm the change.`, newEmail: emailLower });
  } catch (error) {
    console.error('Change email request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// @route   POST /api/auth/change-email/verify
// @desc    Verify OTP and update email
// ─────────────────────────────────────────────
router.post('/change-email/verify', auth, async (req, res) => {
  try {
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({ message: 'New email and OTP are required' });
    }

    const emailLower = newEmail.toLowerCase();

    const otpDoc = await Otp.findOne({
      email: emailLower,
      purpose: 'change_email',
      isUsed: false,
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or already used. Please request a new OTP.' });
    }

    if (otpDoc.blockedUntil && otpDoc.blockedUntil > new Date()) {
      const waitMins = Math.ceil((otpDoc.blockedUntil - new Date()) / 60000);
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${waitMins} minute(s).` });
    }

    if (otpDoc.expiresAt < new Date()) {
      await Otp.deleteMany({ email: emailLower, purpose: 'change_email' });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isValid = await verifyOtp(otp.trim(), otpDoc.otpHash);

    if (!isValid) {
      otpDoc.failedAttempts += 1;
      if (otpDoc.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        otpDoc.blockedUntil = getBlockExpiry();
        await otpDoc.save();
        return res.status(429).json({ message: 'Too many incorrect attempts. You are blocked for 15 minutes.' });
      }
      const remaining = MAX_FAILED_ATTEMPTS - otpDoc.failedAttempts;
      await otpDoc.save();
      return res.status(400).json({ message: `Incorrect OTP. ${remaining} attempt(s) remaining.` });
    }

    // Check again that new email is still free
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already in use' });
    }

    const user = await User.findById(req.user._id);
    const oldEmail = user.email;

    otpDoc.isUsed = true;
    await otpDoc.save();

    user.email = emailLower;
    await user.save();

    // Send confirmation email to NEW address
    try {
      await sendEmail(emailLower, '✅ Email Updated — ExamPortal', emailChangedEmail(user.name, emailLower));
    } catch (e) {
      console.error('Email changed confirmation failed:', e.message);
    }

    res.json({ message: 'Email updated successfully.', newEmail: emailLower });
  } catch (error) {
    console.error('Change email verify error:', error);
    res.status(500).json({ message: 'Server error during email update' });
  }
});

// ─────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current authenticated user
// ─────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
