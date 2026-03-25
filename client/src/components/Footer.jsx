import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="mt-auto py-3 border-top" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
      <Container className="text-center">
        <span className="text-muted" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500, letterSpacing: '0.02em' }}>
          Developed by ACTS  CDAC Delhi
        </span>
      </Container>
    </footer>
  );
};

export default Footer;
