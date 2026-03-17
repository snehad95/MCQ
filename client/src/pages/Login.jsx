import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await API.post('/auth/login', formData);
      login(res.data.token, res.data.user);
      
      // Redirect based on role
      if (res.data.user.role === 'admin' || res.data.user.role === 'teacher') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0 auth-card">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold" style={{ borderBottom: 'none', display: 'block' }}>ExamPortal</h2>
                <small className="text-muted d-block" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>Online Examination System</small>
                <hr style={{ borderColor: '#FF9933', borderWidth: '2px', width: '60px', margin: '12px auto' }} />
                <p className="text-muted mb-0">Login to your account</p>
              </div>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    id="login-email"
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    id="login-password"
                  />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 py-2" disabled={loading} id="login-submit">
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>
              <div className="text-center mt-3">
                <span className="text-muted">Don&apos;t have an account? </span>
                <Link to="/register" className="text-decoration-none">Register here</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
