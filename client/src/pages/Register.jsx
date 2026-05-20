import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
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

const Register = () => {
  // Step 1 — details
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1 Submit — request registration OTP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await API.post('/auth/register/request-otp', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      setOtpStep(true);
      startResendCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration request failed');
    }
    setLoading(false);
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

  // Step 2 Resend OTP
  const handleResendOtp = async () => {
    setResendLoading(true);
    setResendMsg('');
    setOtpError('');
    try {
      await API.post('/auth/resend-otp', {
        name: formData.name,
        email: formData.email,
        purpose: 'register'
      });
      setResendMsg('A new OTP has been sent to your email.');
      setOtp('');
      startResendCooldown();
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Failed to resend OTP');
    }
    setResendLoading(false);
  };

  // Step 2 Submit — verify OTP and register
  const handleOtpVerify = async () => {
    if (otp.replace(/ /g, '').length < 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await API.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        otp: otp.trim()
      });
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'OTP verification failed');
    }
    setOtpLoading(false);
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0 auth-card">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div className="d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'var(--p-500)', color: 'white', boxShadow: '0 8px 16px oklch(0.36 0.09 255 / 0.2)' }}>
                  <i className="bi bi-person-plus fs-3"></i>
                </div>
                <div className="text-uppercase tracking-wider text-muted fw-semibold mb-3" style={{ letterSpacing: '0.15em', fontSize: '0.75rem' }}>Examination System</div>
                <h3 className="fw-bold text-main mb-1">Create account</h3>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>Join the Examination System in seconds</p>
              </div>

              {!otpStep ? (
                <>
                  {error && <Alert variant="danger">{error}</Alert>}
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Full name</Form.Label>
                      <div className="position-relative">
                        <i className="bi bi-person position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                        <Form.Control
                          type="text"
                          name="name"
                          placeholder="Jane Doe"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          style={{ paddingLeft: '2.75rem' }}
                          id="register-name"
                        />
                      </div>
                    </Form.Group>
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
                          id="register-email"
                        />
                      </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Password</Form.Label>
                      <div className="position-relative">
                        <i className="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                        <Form.Control
                          type="password"
                          name="password"
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={handleChange}
                          required
                          style={{ paddingLeft: '2.75rem' }}
                          id="register-password"
                        />
                      </div>
                    </Form.Group>
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold">Confirm password</Form.Label>
                      <div className="position-relative">
                        <i className="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          style={{ paddingLeft: '2.75rem' }}
                          id="register-confirm-password"
                        />
                      </div>
                    </Form.Group>
                    <Button variant="primary" type="submit" className="w-100 py-2.5 fw-semibold" disabled={loading} id="register-submit">
                      {loading ? <><Spinner size="sm" className="me-2" />Sending Verification OTP...</> : 'Create account'}
                    </Button>
                  </Form>
                  <div className="text-center mt-3">
                    <span className="text-muted">Already have an account? </span>
                    <Link to="/login" className="text-decoration-none fw-semibold">Login here</Link>
                  </div>
                </>
              ) : (
                /* OTP Verification Step */
                <div className="text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center mb-3"
                    style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg,#1a2e6e,#2e4bc6)', color: 'white' }}
                  >
                    <i className="bi bi-envelope-check fs-4"></i>
                  </div>
                  <h5 className="fw-bold mb-1">Verify Your Email</h5>
                  <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                    Enter the 6-digit OTP sent to
                  </p>
                  <p className="fw-semibold mb-0" style={{ color: 'var(--p-500)', fontSize: '0.9rem' }}>
                    {formData.email}
                  </p>

                  {otpError && <Alert variant="danger" className="mt-3 text-start">{otpError}</Alert>}
                  {resendMsg && <Alert variant="success" className="mt-3 text-start">{resendMsg}</Alert>}

                  <OtpInput value={otp} onChange={setOtp} idPrefix="register-otp" />

                  <Button
                    variant="primary"
                    className="w-100 fw-semibold py-2 mb-3"
                    onClick={handleOtpVerify}
                    disabled={otpLoading}
                    id="otp-verify-submit"
                  >
                    {otpLoading ? <><Spinner size="sm" className="me-2" />Verifying...</> : 'Verify & Register'}
                  </Button>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-muted"
                      style={{ fontSize: '0.875rem' }}
                      onClick={() => { setOtpStep(false); setOtp(''); setOtpError(''); }}
                    >
                      ← Change details
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
  );
};

export default Register;
