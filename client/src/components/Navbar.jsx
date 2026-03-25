import { Navbar as BSNavbar, Nav, Container, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/cdac_logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <BSNavbar variant={darkMode ? "dark" : "light"} expand="lg" className="navbar-custom">
      <Container className="d-flex justify-content-between align-items-center">
        <BSNavbar.Brand as={Link} to="/" className="fw-bold m-0 p-0">
          <img
            src={logo}
            style={{ backgroundColor: "transparent", maxHeight: "40px", width: "auto" }}
            alt="CDAC Logo"
            className="img-fluid logo-img"
          />
        </BSNavbar.Brand>
        
        <BSNavbar.Collapse id="main-navbar">
          <Nav className="ms-auto text-center py-3 py-lg-0">
            {user && user.role === 'student' && (
              <>
                <Nav.Link as={Link} to="/dashboard" className="px-3">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/my-results" className="px-3">My Results</Nav.Link>
              </>
            )}
            {user && (user.role === 'admin' || user.role === 'teacher') && (
              <>
                <Nav.Link as={Link} to="/admin" className="px-3">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/admin/exams" className="px-3">Exams</Nav.Link>
                <Nav.Link as={Link} to="/admin/results" className="px-3">Results</Nav.Link>
              </>
            )}
            {user && user.role === 'admin' && (
              <Nav.Link as={Link} to="/admin/users" className="px-3">Users</Nav.Link>
            )}
            {user ? (
              <div className="d-flex flex-column flex-lg-row align-items-center gap-2 ms-lg-3 py-3 py-lg-0 border-top border-lg-0">
                <span className="fw-semibold text-body mb-2 mb-lg-0">
                  {user.name} <Badge bg={user.role === 'admin' ? 'danger' : user.role === 'teacher' ? 'warning' : 'info'}>{user.role}</Badge>
                </span>
                <Button variant={darkMode ? "outline-light" : "outline-danger"} size="sm" onClick={handleLogout} className="w-100 w-lg-auto">Logout</Button>
              </div>
            ) : (
              <div className="d-flex flex-column flex-lg-row gap-2 ms-lg-3 py-3 py-lg-0 border-top border-lg-0">
                <Nav.Link as={Link} to="/login" className="fw-semibold px-3">Login</Nav.Link>
                <Nav.Link as={Link} to="/register" className="fw-semibold px-3">Register</Nav.Link>
              </div>
            )}
          </Nav>
        </BSNavbar.Collapse>

        <div className="d-flex align-items-center ms-lg-3">
          <Button
            variant={darkMode ? "light" : "dark"}
            size="sm"
            onClick={toggleTheme}
            className="d-flex align-items-center justify-content-center"
            style={{ 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              padding: '0',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
              color: darkMode ? '#fff' : '#000',
              marginLeft: '10px'
            }}
            title="Toggle theme"
          >
            {darkMode ? <i className="bi bi-sun-fill fs-5"></i> : <i className="bi bi-moon-fill fs-5"></i>}
          </Button>
          <BSNavbar.Toggle aria-controls="main-navbar" className="ms-2" />
        </div>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
