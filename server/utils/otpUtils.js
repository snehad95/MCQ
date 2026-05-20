const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 15;

/**
 * Generate a cryptographically secure 6-digit OTP string
 */
const generateOtp = () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

/**
 * Hash an OTP using bcrypt for secure storage
 * @param {string} otp
 * @returns {Promise<string>} hashed OTP
 */
const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/**
 * Compare a plain OTP against a stored hash
 * @param {string} plainOtp
 * @param {string} hashedOtp
 * @returns {Promise<boolean>}
 */
const verifyOtp = async (plainOtp, hashedOtp) => {
  return bcrypt.compare(plainOtp, hashedOtp);
};

/**
 * Calculate OTP expiry Date object
 */
const getOtpExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
};

/**
 * Calculate block end time
 */
const getBlockExpiry = () => {
  const blockEnd = new Date();
  blockEnd.setMinutes(blockEnd.getMinutes() + BLOCK_DURATION_MINUTES);
  return blockEnd;
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  getOtpExpiry,
  getBlockExpiry,
  MAX_FAILED_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
  BLOCK_DURATION_MINUTES,
};
