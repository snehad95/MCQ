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
    <BSNavbar variant={darkMode ? "dark" : "light"} expand="lg" className="navbar-custom py-2">
      <Container fluid className="px-lg-5 px-3 d-flex justify-content-between align-items-center">
        <BSNavbar.Brand as={Link} to="/" className="fw-bold m-0 p-0">
          <img
            src={logo}
            style={{ backgroundColor: "transparent", maxHeight: "42px", width: "auto" }}
            alt="CDAC Logo"
            className="img-fluid logo-img"
          />
        </BSNavbar.Brand>
        
        <BSNavbar.Collapse id="main-navbar">
          <Nav className="ms-auto d-flex align-items-center gap-1 py-3 py-lg-0">
            {user && user.role === 'student' && (
              <>
                <Nav.Link as={Link} to="/dashboard" className="px-3 text-nowrap">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/my-results" className="px-3 text-nowrap">My Results</Nav.Link>
              </>
            )}
            {user && (user.role === 'admin' || user.role === 'teacher') && (
              <>
                <Nav.Link as={Link} to="/admin" className="px-3 text-nowrap">Dashboard</Nav.Link>
                <Nav.Link as={Link} to="/admin/exams" className="px-3 text-nowrap">Exams</Nav.Link>
                <Nav.Link as={Link} to="/admin/results" className="px-3 text-nowrap">Results</Nav.Link>
              </>
            )}
            {user && user.role === 'admin' && (
              <Nav.Link as={Link} to="/admin/users" className="px-3 text-nowrap">Users</Nav.Link>
            )}
            {user ? (
              <div className="d-flex align-items-center gap-3 ms-lg-3 py-2 py-lg-0 border-0">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-body text-nowrap" style={{ fontSize: '0.95rem' }}>{user.name}</span>
                  <Badge bg={user.role === 'admin' ? 'danger' : user.role === 'teacher' ? 'warning' : 'info'} className="text-uppercase text-nowrap" style={{ fontSize: '0.65rem', padding: '0.35em 0.7em', borderRadius: '6px' }}>{user.role}</Badge>
                </div>
                <Nav.Link as={Link} to="/settings" title="Account Settings" style={{ padding: '0', color: 'var(--text-muted)' }} id="navbar-settings-link">
                  <i className="bi bi-gear-fill fs-5"></i>
                </Nav.Link>
                <span 
                  onClick={handleLogout} 
                  className="fw-bold logout-text text-nowrap"
                  style={{ fontSize: '0.95rem' }}
                >
                  Logout
                </span>
              </div>
            ) : (
              <div className="d-flex flex-column flex-lg-row align-items-center gap-2 ms-lg-3 py-3 py-lg-0 border-0">
                <Nav.Link as={Link} to="/login" className="fw-semibold px-3 text-nowrap">Login</Nav.Link>
                <Nav.Link as={Link} to="/register" className="fw-semibold px-3 text-nowrap">Register</Nav.Link>
              </div>
            )}
          </Nav>
        </BSNavbar.Collapse>

        <div className="d-flex align-items-center ms-lg-3 gap-2">
          <BSNavbar.Toggle aria-controls="main-navbar" />
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
            }}
            title="Toggle theme"
          >
            {darkMode ? <i className="bi bi-sun-fill fs-5"></i> : <i className="bi bi-moon-fill fs-5"></i>}
          </Button>
        </div>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
