import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Tab, Nav } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

// 6-digit OTP input
const OtpInput = ({ value, onChange }) => {
  const digits = value.padEnd(6, ' ').split('');
  const handleKey = (e, idx) => {
    const key = e.key;
    if (key === 'Backspace') {
      const arr = value.split('');
      arr[idx] = '';
      const next = arr.join('').trimEnd();
      onChange(next.slice(0, idx > 0 ? idx : 0));
      if (idx > 0) document.getElementById(`settings-otp-${idx - 1}`)?.focus();
      return;
    }
    if (/^\d$/.test(key)) {
      const arr = value.padEnd(6, '').split('');
      arr[idx] = key;
      const next = arr.join('').slice(0, 6).replace(/ /g, '');
      onChange(next);
      if (idx < 5) document.getElementById(`settings-otp-${idx + 1}`)?.focus();
    }
  };
  return (
    <div className="d-flex gap-2 justify-content-center my-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          id={`settings-otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(e, i)}
          onFocus={(e) => e.target.select()}
          className="form-control text-center fw-bold"
          style={{ width: '46px', height: '52px', fontSize: '1.4rem', borderRadius: '10px', border: '2px solid var(--border-color)' }}
          autoComplete="off"
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Change Password Section
// ─────────────────────────────────────────────
const ChangePasswordSection = () => {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('New passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/auth/change-password', {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password changed successfully! A confirmation email has been sent.');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed');
    }
    setLoading(false);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>
        <i className="bi bi-lock me-2" style={{ color: 'var(--p-500)' }}></i>
        Change Password
      </h6>
      {error   && <Alert variant="danger"  className="py-2">{error}</Alert>}
      {success && <Alert variant="success" className="py-2">{success}</Alert>}

      <Form.Group className="mb-3">
        <Form.Label className="fw-semibold">Current Password</Form.Label>
        <div className="position-relative">
          <i className="bi bi-lock position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
          <Form.Control
            type="password"
            name="oldPassword"
            placeholder="Enter current password"
            value={form.oldPassword}
            onChange={handleChange}
            required
            style={{ paddingLeft: '2.5rem' }}
            id="cp-old-password"
          />
        </div>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label className="fw-semibold">New Password</Form.Label>
        <div className="position-relative">
          <i className="bi bi-key position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
          <Form.Control
            type="password"
            name="newPassword"
            placeholder="Min 6 characters"
            value={form.newPassword}
            onChange={handleChange}
            required
            style={{ paddingLeft: '2.5rem' }}
            id="cp-new-password"
          />
        </div>
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label className="fw-semibold">Confirm New Password</Form.Label>
        <div className="position-relative">
          <i className="bi bi-key position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
          <Form.Control
            type="password"
            name="confirmPassword"
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            style={{ paddingLeft: '2.5rem' }}
            id="cp-confirm-password"
          />
        </div>
      </Form.Group>

      <Button variant="primary" type="submit" className="fw-semibold px-4" disabled={loading} id="cp-submit-btn">
        {loading ? <><Spinner size="sm" className="me-2" />Updating...</> : 'Change Password'}
      </Button>
    </Form>
  );
};

// ─────────────────────────────────────────────
// Change Email Section
// ─────────────────────────────────────────────
const ChangeEmailSection = ({ currentEmail }) => {
  const [stage, setStage] = useState('input'); // 'input' | 'otp' | 'done'
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { logout } = useAuth();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newEmail) { setError('Please enter a new email address'); return; }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) { setError('New email must be different from your current email'); return; }
    setLoading(true);
    try {
      await API.post('/auth/change-email/request', { newEmail });
      setStage('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.replace(/ /g, '').length < 6) { setError('Enter the complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      await API.post('/auth/change-email/verify', { newEmail, otp: otp.trim() });
      setSuccess('Email updated successfully! Please log in again with your new email.');
      setStage('done');
      setTimeout(() => logout(), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    }
    setLoading(false);
  };

  return (
    <div>
      <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>
        <i className="bi bi-envelope me-2" style={{ color: 'var(--p-500)' }}></i>
        Change Email Address
      </h6>

      <div className="mb-3 p-3 rounded-3" style={{ background: 'var(--p-50)', border: '1px solid var(--border-color)' }}>
        <small className="text-muted">Current email</small>
        <div className="fw-semibold">{currentEmail}</div>
      </div>

      {error   && <Alert variant="danger"  className="py-2">{error}</Alert>}
      {success && <Alert variant="success" className="py-2">{success}</Alert>}

      {stage === 'input' && (
        <Form onSubmit={handleRequestOtp}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">New Email Address</Form.Label>
            <div className="position-relative">
              <i className="bi bi-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
              <Form.Control
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
                id="ce-new-email-input"
              />
            </div>
          </Form.Group>
          <Button variant="primary" type="submit" className="fw-semibold px-4" disabled={loading} id="ce-send-otp-btn">
            {loading ? <><Spinner size="sm" className="me-2" />Sending OTP...</> : 'Send Verification OTP'}
          </Button>
        </Form>
      )}

      {stage === 'otp' && (
        <Form onSubmit={handleVerifyOtp}>
          <p className="text-muted mb-1" style={{ fontSize: '0.9rem' }}>
            OTP sent to <strong>{newEmail}</strong>. Enter it below to verify:
          </p>
          <OtpInput value={otp} onChange={setOtp} />
          <div className="d-flex gap-2">
            <Button variant="primary" type="submit" className="fw-semibold px-4" disabled={loading} id="ce-verify-otp-btn">
              {loading ? <><Spinner size="sm" className="me-2" />Verifying...</> : 'Verify & Update Email'}
            </Button>
            <Button variant="outline-secondary" type="button" onClick={() => { setStage('input'); setOtp(''); setError(''); }} id="ce-back-btn">
              Back
            </Button>
          </div>
        </Form>
      )}

      {stage === 'done' && (
        <div className="text-center py-2">
          <div style={{ fontSize: '2.5rem' }}>✅</div>
          <p className="text-muted mt-2">Email updated! Logging you out in 3 seconds...</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Account Settings Page
// ─────────────────────────────────────────────
const AccountSettings = () => {
  const { user } = useAuth();

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={8} xl={7}>
          <div className="mb-4">
            <h2 className="mb-1">Account Settings</h2>
            <p className="text-muted">Manage your password and email address</p>
          </div>

          <Tab.Container defaultActiveKey="password">
            <Card className="shadow-sm border-0">
              <Card.Header className="border-0 pt-3 px-4 pb-0" style={{ background: 'transparent' }}>
                <Nav variant="tabs" className="border-0">
                  <Nav.Item>
                    <Nav.Link eventKey="password" className="fw-semibold" id="settings-tab-password">
                      <i className="bi bi-lock me-2"></i>Password
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="email" className="fw-semibold" id="settings-tab-email">
                      <i className="bi bi-envelope me-2"></i>Email
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Header>
              <Card.Body className="p-4">
                <Tab.Content>
                  <Tab.Pane eventKey="password">
                    <ChangePasswordSection />
                  </Tab.Pane>
                  <Tab.Pane eventKey="email">
                    <ChangeEmailSection currentEmail={user?.email || ''} />
                  </Tab.Pane>
                </Tab.Content>
              </Card.Body>
            </Card>
          </Tab.Container>
        </Col>
      </Row>
    </Container>
  );
};

export default AccountSettings;
