// ─────────────────────────────────────────────────────────────
//  ExamPortal — Shared HTML email wrapper
// ─────────────────────────────────────────────────────────────

const baseLayout = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ExamPortal</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4ff; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(30,50,120,0.10); }
    .header { background: linear-gradient(135deg, #1a2e6e 0%, #2e4bc6 100%); padding: 36px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p  { color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 13px; }
    .body   { padding: 36px 40px; color: #2d3748; line-height: 1.7; }
    .body h2 { color: #1a2e6e; margin-top: 0; font-size: 20px; }
    .body p  { margin: 0 0 16px; }
    .otp-box { background: #f0f4ff; border: 2px dashed #2e4bc6; border-radius: 12px; text-align: center; padding: 24px 16px; margin: 24px 0; }
    .otp-box .otp { font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #1a2e6e; font-family: 'Courier New', monospace; }
    .otp-box .sub { font-size: 13px; color: #718096; margin-top: 8px; }
    .btn  { display: inline-block; background: linear-gradient(135deg, #1a2e6e, #2e4bc6); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .info-box { background: #f0f4ff; border-left: 4px solid #2e4bc6; border-radius: 0 10px 10px 0; padding: 14px 18px; margin: 18px 0; font-size: 14px; color: #2d3748; }
    .warn-box { background: #fff8f0; border-left: 4px solid #e67e22; border-radius: 0 10px 10px 0; padding: 14px 18px; margin: 18px 0; font-size: 14px; color: #7d5a3c; }
    .footer { background: #f8faff; padding: 20px 40px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e8edf8; }
    .footer a { color: #2e4bc6; text-decoration: none; }
    @media (max-width: 600px) {
      .body, .header, .footer { padding-left: 20px !important; padding-right: 20px !important; }
      .otp-box .otp { font-size: 32px; letter-spacing: 6px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📚 ExamPortal</h1>
      <p>Online Examination System</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ExamPortal. All rights reserved.<br/>
      This is an automated email — please do not reply.
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────
//  1. Registration Welcome Email
// ─────────────────────────────────────────────
const registrationEmail = (name) => baseLayout(`
  <h2>Welcome to ExamPortal, ${name}! 🎉</h2>
  <p>Congratulations! Your account has been successfully created. You now have access to our online examination system.</p>
  <div class="info-box">
    <strong>Account Details</strong><br/>
    Name: <strong>${name}</strong><br/>
    Status: <strong>Active ✅</strong>
  </div>
  <p>You can now log in to your dashboard and start exploring available exams and study materials.</p>
  <p>If you have any questions or need assistance, feel free to contact our support team.</p>
  <p style="margin-top:24px;">Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

// ─────────────────────────────────────────────
//  2. Login OTP Email
// ─────────────────────────────────────────────
const loginOtpEmail = (name, otp) => baseLayout(`
  <h2>Login Verification Code 🔐</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>You are attempting to sign in to ExamPortal. Use the verification code below to complete your login:</p>
  <div class="otp-box">
    <div class="otp">${otp}</div>
    <div class="sub">This code expires in <strong>5 minutes</strong></div>
  </div>
  <div class="warn-box">⚠️ <strong>Never share this OTP</strong> with anyone. ExamPortal staff will never ask for your OTP.</div>
  <p>If you did not attempt to login, please ignore this email and consider changing your password.</p>
  <p>Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

// ─────────────────────────────────────────────
//  3. Forgot Password OTP Email
// ─────────────────────────────────────────────
const forgotPasswordEmail = (name, otp) => baseLayout(`
  <h2>Password Reset Request 🔑</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>We received a request to reset the password for your ExamPortal account. Use the code below to proceed:</p>
  <div class="otp-box">
    <div class="otp">${otp}</div>
    <div class="sub">This code expires in <strong>5 minutes</strong></div>
  </div>
  <div class="warn-box">⚠️ If you did NOT request a password reset, please ignore this email. Your password will remain unchanged.</div>
  <p>Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

// ─────────────────────────────────────────────
//  4. Password Changed Confirmation
// ─────────────────────────────────────────────
const passwordChangedEmail = (name) => baseLayout(`
  <h2>Password Changed Successfully ✅</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>Your ExamPortal account password has been changed successfully.</p>
  <div class="info-box">
    🕐 Changed at: <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>
  </div>
  <div class="warn-box">⚠️ If you did NOT change your password, please contact support immediately and reset it via Forgot Password.</div>
  <p>Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

// ─────────────────────────────────────────────
//  5. Change Email OTP
// ─────────────────────────────────────────────
const changeEmailOtpEmail = (name, otp, newEmail) => baseLayout(`
  <h2>Verify Your New Email Address 📧</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>You requested to change your email to <strong>${newEmail}</strong>. Use the code below to verify:</p>
  <div class="otp-box">
    <div class="otp">${otp}</div>
    <div class="sub">This code expires in <strong>5 minutes</strong></div>
  </div>
  <div class="warn-box">⚠️ If you did NOT request an email change, please ignore this and secure your account.</div>
  <p>Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

// ─────────────────────────────────────────────
//  6. Email Changed Confirmation
// ─────────────────────────────────────────────
const emailChangedEmail = (name, newEmail) => baseLayout(`
  <h2>Email Address Updated ✅</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>Your ExamPortal account email has been successfully updated to <strong>${newEmail}</strong>.</p>
  <div class="info-box">
    🕐 Updated at: <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>
  </div>
  <p>If you did NOT make this change, contact support immediately.</p>
  <p>Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

// ─────────────────────────────────────────────
//  7. Registration OTP
// ─────────────────────────────────────────────
const registrationOtpEmail = (name, otp) => baseLayout(`
  <h2>Verify Your Email to Register 📧</h2>
  <p>Hi <strong>${name}</strong>,</p>
  <p>Thank you for starting your registration at ExamPortal. Use the verification code below to complete your registration:</p>
  <div class="otp-box">
    <div class="otp">${otp}</div>
    <div class="sub">This code expires in <strong>5 minutes</strong></div>
  </div>
  <div class="warn-box">⚠️ <strong>Never share this OTP</strong> with anyone. ExamPortal staff will never ask for your OTP.</div>
  <p>If you did not request this registration, please ignore this email.</p>
  <p>Best regards,<br/><strong>The ExamPortal Team</strong></p>
`);

module.exports = {
  registrationEmail,
  loginOtpEmail,
  forgotPasswordEmail,
  passwordChangedEmail,
  changeEmailOtpEmail,
  emailChangedEmail,
  registrationOtpEmail,
};
