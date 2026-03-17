import { Navbar as BSNavbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BSNavbar variant="dark" expand="lg" className="shadow-sm">
      <Container>
        <BSNavbar.Brand as={Link} to="/" className="fw-bold">
          ExamPortal
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="main-navbar" />
        <BSNavbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            {user && user.role === 'student' && (
              <>
                <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/my-results">My Results</Nav.Link>
              </>
            )}
            {user && (user.role === 'admin' || user.role === 'teacher') && (
              <>
                <Nav.Link as={Link} to="/admin">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/admin/exams">Exams</Nav.Link>
                <Nav.Link as={Link} to="/admin/results">Results</Nav.Link>
              </>
            )}
            {user && user.role === 'admin' && (
              <Nav.Link as={Link} to="/admin/users">Users</Nav.Link>
            )}
          </Nav>
          <Nav className="align-items-center">
            <Button
              variant={darkMode ? 'outline-light' : 'outline-warning'}
              size="sm"
              onClick={toggleTheme}
              className="me-3"
              title="Toggle theme"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
            {user ? (
              <>
                <span className="text-light me-3">
                  {user.name} <Badge bg={user.role === 'admin' ? 'danger' : user.role === 'teacher' ? 'warning' : 'info'}>{user.role}</Badge>
                </span>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="text-light">Login</Nav.Link>
                <Nav.Link as={Link} to="/register" className="text-light">Register</Nav.Link>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
