import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────
// OTP Input component — 6 individual digit boxes
// ─────────────────────────────────────────────
const OtpInput = ({ value, onChange, idPrefix = 'otp' }) => {
  const digits = value.padEnd(6, ' ').split('');

  const handleKey = (e, idx) => {
    const key = e.key;
    if (key === 'Backspace') {
      const arr = value.split('');
      arr[idx] = '';
      // Remove trailing empties
      const next = arr.join('').trimEnd();
      onChange(next.slice(0, idx > 0 ? idx : 0));
      if (idx > 0) {
        const prev = document.getElementById(`${idPrefix}-digit-${idx - 1}`);
        if (prev) prev.focus();
      }
      return;
    }
    if (/^\d$/.test(key)) {
      const arr = value.padEnd(6, '').split('');
      arr[idx] = key;
      const next = arr.join('').slice(0, 6).replace(/ /g, '');
      onChange(next);
      if (idx < 5) {
        const nextEl = document.getElementById(`${idPrefix}-digit-${idx + 1}`);
        if (nextEl) nextEl.focus();
      }
    }
  };

  return (
    <div className="d-flex gap-2 justify-content-center my-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          id={`${idPrefix}-digit-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(e, i)}
          onFocus={(e) => e.target.select()}
          className="form-control text-center fw-bold"
          style={{
            width: '48px',
            height: '56px',
            fontSize: '1.5rem',
            borderRadius: '12px',
            border: '2px solid var(--border-color)',
            transition: 'border-color 0.2s',
          }}
          autoComplete="off"
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Login Page
// ─────────────────────────────────────────────
const Login = () => {
  // Step 1 — credentials
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2 — OTP
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password
  const [forgotStep, setForgotStep] = useState(false); // show forgot modal
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpConfirmPass, setFpConfirmPass] = useState('');
  const [fpStage, setFpStage] = useState('email'); // 'email' | 'otp' | 'newpass' | 'done'
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpOtpLoading, setFpOtpLoading] = useState(false);
  const [fpResendCooldown, setFpResendCooldown] = useState(0);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1 submit — validate credentials, send OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/login', formData);
      // Backend returns { requiresOtp: true, email }
      setOtpStep(true);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  // Step 2 — verify OTP
  const handleOtpVerify = async () => {
    if (otp.replace(/ /g, '').length < 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await API.post('/auth/login/verify-otp', {
        email: formData.email,
        otp: otp.trim(),
      });
      login(res.data.token, res.data.user);
      if (res.data.user.role === 'admin' || res.data.user.role === 'teacher') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || 'OTP verification failed');
    }
    setOtpLoading(false);
  };

  const startResendCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setResendMsg('');
    setOtpError('');
    try {
      await API.post('/auth/resend-otp', { email: formData.email, purpose: 'login' });
      setResendMsg('A new OTP has been sent to your email.');
      setOtp('');
      startResendCooldown();
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend OTP');
    }
    setResendLoading(false);
  };

  // ── Forgot Password Handlers ──
  const startFpResendCooldown = (seconds = 60) => {
    setFpResendCooldown(seconds);
    const interval = setInterval(() => {
      setFpResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForgotSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFpError(''); setFpSuccess('');
    if (!fpEmail) { setFpError('Please enter your email address'); return; }
    setFpLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: fpEmail });
      setFpStage('otp');
      setFpOtp('');
      startFpResendCooldown();
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to send OTP. Please check your email address.');
    }
    setFpLoading(false);
  };

  const handleForgotResendOtp = async () => {
    setFpError(''); setFpSuccess('');
    setFpLoading(true);
    try {
      await API.post('/auth/resend-otp', { email: fpEmail, purpose: 'forgot_password' });
      setFpOtp('');
      setFpSuccess('A new OTP has been sent to your email.');
      startFpResendCooldown();
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to resend OTP.');
    }
    setFpLoading(false);
  };

  // Verify OTP against the backend before showing password fields
  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setFpError('');
    const cleanOtp = fpOtp.replace(/ /g, '');
    if (cleanOtp.length < 6) { setFpError('Enter the complete 6-digit OTP'); return; }
    setFpOtpLoading(true);
    try {
      // We verify OTP by doing a dry-run: call reset-password with a sentinel password.
      // Since the backend verifies OTP before checking password validity, we pass a dummy
      // and store fpOtp for the real reset. Instead, call a dedicated verify step via
      // reset-password. Actually, the backend requires newPassword — so we temporarily
      // set fpStage='newpass' after verifying length. We verify fully on final submit.
      // Better approach: verify the OTP is correct by sending it now and storing verified flag.
      await API.post('/auth/verify-reset-otp', { email: fpEmail, otp: cleanOtp });
      setFpStage('newpass');
    } catch (err) {
      const msg = err.response?.data?.message || 'OTP verification failed';
      setFpError(msg);
      // If too many attempts or blocked, clear OTP
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('expired')) {
        setFpOtp('');
      }
    }
    setFpOtpLoading(false);
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setFpError(''); setFpSuccess('');
    if (!fpNewPass || fpNewPass.length < 6) { setFpError('Password must be at least 6 characters'); return; }
    if (fpNewPass !== fpConfirmPass) { setFpError('Passwords do not match'); return; }
    setFpLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email: fpEmail,
        otp: fpOtp.trim(),
        newPassword: fpNewPass,
      });
      setFpSuccess('Password reset successfully! You can now log in.');
      setFpStage('done');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Password reset failed');
      // If OTP error, go back to OTP step
      if (err.response?.data?.message?.toLowerCase().includes('otp')) {
        setFpStage('otp');
        setFpOtp('');
      }
    }
    setFpLoading(false);
  };

  const closeForgotModal = () => {
    setForgotStep(false);
    setFpEmail(''); setFpOtp(''); setFpNewPass(''); setFpConfirmPass('');
    setFpStage('email'); setFpError(''); setFpSuccess('');
    setFpOtpLoading(false); setFpResendCooldown(0);
  };

  return (
    <>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="shadow-lg border-0 auth-card">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'var(--p-500)', color: 'white', boxShadow: '0 8px 16px oklch(0.36 0.09 255 / 0.2)' }}
                  >
                    <i className="bi bi-person fs-3"></i>
                  </div>
                  <div className="text-uppercase tracking-wider text-muted fw-semibold mb-3" style={{ letterSpacing: '0.15em', fontSize: '0.75rem' }}>Examination System</div>
                  <h3 className="fw-bold text-main mb-1">Sign In</h3>
                  <p className="text-muted" style={{ fontSize: '0.95rem' }}>Access your examination dashboard</p>
                </div>

                {!otpStep ? (
                  <>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Email address</Form.Label>
                        <div className="position-relative">
                          <i className="bi bi-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                          <Form.Control
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            style={{ paddingLeft: '2.75rem' }}
                            id="login-email"
                          />
                        </div>
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-semibold">Password</Form.Label>
                        <div className="position-relative">
                          <i className="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                          <Form.Control
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            style={{ paddingLeft: '2.75rem' }}
                            id="login-password"
                          />
                        </div>
                      </Form.Group>

                      <div className="text-end mb-4">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none fw-semibold"
                          style={{ fontSize: '0.875rem', color: 'var(--p-500)' }}
                          onClick={() => setForgotStep(true)}
                          id="forgot-password-link"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 fw-semibold"
                        disabled={loading}
                        id="login-submit"
                      >
                        {loading ? <><Spinner size="sm" className="me-2" />Sending OTP...</> : 'Sign In'}
                      </Button>
                    </Form>

                    <div className="text-center mt-3">
                      <span className="text-muted">Don&apos;t have an account? </span>
                      <Link to="/register" className="text-decoration-none fw-semibold">Register here</Link>
                    </div>
                  </>
                ) : (
                  /* OTP Verification Step */
                  <div className="text-center">
                    <div
                      className="d-inline-flex align-items-center justify-content-center mb-3"
                      style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg,#1a2e6e,#2e4bc6)', color: 'white' }}
                    >
                      <i className="bi bi-shield-lock fs-4"></i>
                    </div>
                    <h5 className="fw-bold mb-1">Verify Your Identity</h5>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                      Enter the 6-digit OTP sent to
                    </p>
                    <p className="fw-semibold mb-0" style={{ color: 'var(--p-500)', fontSize: '0.9rem' }}>
                      {formData.email}
                    </p>

                    {otpError && <Alert variant="danger" className="mt-3 text-start">{otpError}</Alert>}
                    {resendMsg && <Alert variant="success" className="mt-3 text-start">{resendMsg}</Alert>}

                    <OtpInput value={otp} onChange={setOtp} idPrefix="login-otp" />

                    <Button
                      variant="primary"
                      className="w-100 fw-semibold py-2 mb-3"
                      onClick={handleOtpVerify}
                      disabled={otpLoading}
                      id="otp-verify-submit"
                    >
                      {otpLoading ? <><Spinner size="sm" className="me-2" />Verifying...</> : 'Verify & Login'}
                    </Button>

                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none text-muted"
                        style={{ fontSize: '0.875rem' }}
                        onClick={() => { setOtpStep(false); setOtp(''); setOtpError(''); }}
                      >
                        ← Change email
                      </button>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-semibold"
                        style={{ fontSize: '0.875rem', color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--p-500)' }}
                        onClick={handleResendOtp}
                        disabled={resendLoading || resendCooldown > 0}
                        id="resend-otp-btn"
                      >
                        {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                    <p className="text-muted mt-3" style={{ fontSize: '0.8rem' }}>
                      <i className="bi bi-clock me-1"></i>OTP expires in 5 minutes
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ────── Forgot Password Modal ────── */}
      <Modal show={forgotStep} onHide={closeForgotModal} centered backdrop="static" id="forgot-password-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold" style={{ fontSize: '1.1rem' }}>
            {fpStage === 'email' && '🔑 Forgot Password'}
            {fpStage === 'otp'  && '📲 Enter OTP'}
            {fpStage === 'newpass' && '🔒 Set New Password'}
            {fpStage === 'done' && '✅ Password Reset'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          {fpError   && <Alert variant="danger"  className="py-2">{fpError}</Alert>}
          {fpSuccess && <Alert variant="success" className="py-2">{fpSuccess}</Alert>}

          {fpStage === 'email' && (
            <Form onSubmit={handleForgotSendOtp}>
              <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                Enter your registered email address and we&apos;ll send you a 6-digit OTP to reset your password.
              </p>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Email address</Form.Label>
                <div className="position-relative">
                  <i className="bi bi-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    required
                    style={{ paddingLeft: '2.75rem' }}
                    id="fp-email-input"
                  />
                </div>
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100 fw-semibold" disabled={fpLoading} id="fp-send-otp-btn">
                {fpLoading ? <><Spinner size="sm" className="me-2" />Sending OTP...</> : 'Send OTP'}
              </Button>
            </Form>
          )}

          {fpStage === 'otp' && (
            <Form onSubmit={handleForgotVerifyOtp}>
              <p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>
                OTP sent to <strong>{fpEmail}</strong>. Enter the 6-digit code below:
              </p>
              <p className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-info-circle me-1"></i>Check your <strong>Spam / Junk</strong> folder if you don&apos;t see it in your inbox.
              </p>
              <OtpInput value={fpOtp} onChange={setFpOtp} idPrefix="fp-otp" />
              <Button variant="primary" type="submit" className="w-100 fw-semibold mt-2" disabled={fpOtpLoading} id="fp-verify-otp-btn">
                {fpOtpLoading ? <><Spinner size="sm" className="me-2" />Verifying...</> : 'Verify OTP'}
              </Button>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none text-muted"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => { setFpStage('email'); setFpOtp(''); setFpError(''); }}
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none fw-semibold"
                  style={{ fontSize: '0.85rem', color: fpResendCooldown > 0 ? 'var(--text-muted)' : 'var(--p-500)' }}
                  onClick={handleForgotResendOtp}
                  disabled={fpLoading || fpResendCooldown > 0}
                >
                  {fpLoading ? 'Sending...' : fpResendCooldown > 0 ? `Resend in ${fpResendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </Form>
          )}

          {fpStage === 'newpass' && (
            <Form onSubmit={handleForgotReset}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">New Password</Form.Label>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                  <Form.Control
                    type="password"
                    placeholder="Min 6 characters"
                    value={fpNewPass}
                    onChange={(e) => setFpNewPass(e.target.value)}
                    required
                    style={{ paddingLeft: '2.75rem' }}
                    id="fp-new-pass-input"
                  />
                </div>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Confirm New Password</Form.Label>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                  <Form.Control
                    type="password"
                    placeholder="Re-enter password"
                    value={fpConfirmPass}
                    onChange={(e) => setFpConfirmPass(e.target.value)}
                    required
                    style={{ paddingLeft: '2.75rem' }}
                    id="fp-confirm-pass-input"
                  />
                </div>
              </Form.Group>
              <Button variant="primary" type="submit" className="w-100 fw-semibold" disabled={fpLoading} id="fp-reset-btn">
                {fpLoading ? <><Spinner size="sm" className="me-2" />Resetting...</> : 'Reset Password'}
              </Button>
            </Form>
          )}

          {fpStage === 'done' && (
            <div className="text-center py-2">
              <div className="mb-3" style={{ fontSize: '3rem' }}>🎉</div>
              <p className="text-muted">Your password has been reset. You can now sign in with your new password.</p>
              <Button variant="primary" className="fw-semibold" onClick={closeForgotModal} id="fp-done-btn">
                Go to Login
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Login;
