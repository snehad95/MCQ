const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  // The user's email this OTP is associated with
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  // OTP purpose: 'login' | 'forgot_password' | 'change_email' | 'register'
  purpose: {
    type: String,
    required: true,
    enum: ['login', 'forgot_password', 'change_email', 'register'],
  },

  // Hashed OTP (we hash for security — never store plain)
  otpHash: {
    type: String,
    required: true,
  },

  // When this OTP expires (5 minutes from creation)
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-cleanup
  },

  // Number of wrong attempts for this OTP
  failedAttempts: {
    type: Number,
    default: 0,
  },

  // Whether this OTP has been used/verified already
  isUsed: {
    type: Boolean,
    default: false,
  },

  // For change_email flow: store the pending new email
  pendingEmail: {
    type: String,
    default: null,
  },

  // Block timestamp: if max attempts exceeded, block until this time
  blockedUntil: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Compound index for efficient lookup
otpSchema.index({ email: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
