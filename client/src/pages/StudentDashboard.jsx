import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState({ published: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, resultsRes] = await Promise.all([
          API.get('/exams'),
          API.get('/results/my')
        ]);
        setExams(examsRes.data);
        setResults(resultsRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const hasAttempted = (examId) => {
    return [...results.published, ...results.pending].some(
      r => (r.exam?._id || r.exam) === examId
    );
  };

  const getExamStatus = (exam) => {
    if (hasAttempted(exam._id)) return { status: 'attempted', label: 'Already Attempted' };
    
    const now = new Date();
    // Parse exam start date/time
    const startDateTime = new Date(`${exam.date.slice(0, 10)}T${exam.startTime}`);
    
    // Parse exam end date/time
    // We assume the end time is on the same date unless it crosses midnight
    const endDateTime = new Date(`${exam.date.slice(0, 10)}T${exam.endTime}`);
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    if (now < startDateTime) {
      return { status: 'upcoming', label: `Starts at ${exam.startTime}` };
    } else if (now > endDateTime) {
      return { status: 'missed', label: 'Exam Ended' };
    } else {
      return { status: 'active', label: 'Start Exam' };
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Welcome, {user?.name}</h2>
      
      <h4 className="mb-3 fw-bold text-main" style={{ fontFamily: 'Outfit, sans-serif' }}>Available Exams</h4>
      <Row className="mb-5">
        {exams.filter(e => e.isActive).length === 0 && (
          <Col><p className="text-muted">No exams available right now.</p></Col>
        )}
        {exams.filter(e => e.isActive).map(exam => {
          const examStatus = getExamStatus(exam);
          return (
            <Col md={6} lg={4} key={exam._id} className="mb-4">
              <Card className="h-100 shadow-sm border-0 d-flex flex-column justify-content-between">
                <Card.Body className="d-flex flex-column p-4">
                  {/* Top Badges / Indicators */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Badge bg="transparent" className="text-body border" style={{ fontSize: '0.75rem', padding: '0.4em 0.8em', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                      <i className="bi bi-calendar3 me-1"></i>
                      {new Date(exam.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Badge>
                    {examStatus.status === 'active' && (
                      <span className="badge rounded-pill px-2.5 py-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'oklch(0.62 0.17 150 / 0.12)', color: 'oklch(0.62 0.17 150)', border: '1px solid oklch(0.62 0.17 150 / 0.2)' }}>
                        ● Active Now
                      </span>
                    )}
                    {examStatus.status === 'upcoming' && (
                      <span className="badge rounded-pill px-2.5 py-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'oklch(0.79 0.16 70 / 0.12)', color: 'oklch(0.79 0.16 70)', border: '1px solid oklch(0.79 0.16 70 / 0.2)' }}>
                        Upcoming
                      </span>
                    )}
                    {examStatus.status === 'missed' && (
                      <span className="badge rounded-pill px-2.5 py-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'oklch(0.57 0.2 27 / 0.12)', color: 'oklch(0.57 0.2 27)', border: '1px solid oklch(0.57 0.2 27 / 0.2)' }}>
                        Ended
                      </span>
                    )}
                    {examStatus.status === 'attempted' && (
                      <span className="badge rounded-pill px-2.5 py-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: 'oklch(0.62 0.17 150 / 0.12)', color: 'oklch(0.62 0.17 150)', border: '1px solid oklch(0.62 0.17 150 / 0.2)' }}>
                        ✔ Done
                      </span>
                    )}
                  </div>

                  {/* Exam Title & Description */}
                  <h4 className="fw-bold text-main mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{exam.title}</h4>
                  <p className="text-muted flex-grow-1 mb-3" style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {exam.description || <em className="opacity-50">No description available for this exam.</em>}
                  </p>

                  <hr className="my-3 opacity-10" style={{ borderColor: 'var(--border-color)' }} />

                  {/* Time slots and Details Grid */}
                  <div className="mb-4">
                    <div className="d-flex align-items-center text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-clock text-primary me-2 fs-6"></i>
                      <span className="fw-semibold me-1 text-secondary">Window:</span> {exam.startTime} - {exam.endTime}
                    </div>
                    
                    <div className="d-flex gap-2">
                      <div className="rounded-pill px-3 py-1.5 d-flex align-items-center text-muted" style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                        <i className="bi bi-hourglass-split me-1.5 text-muted"></i>
                        <span className="fw-bold text-primary ms-1 me-1">{exam.duration}</span> mins
                      </div>
                      <div className="rounded-pill px-3 py-1.5 d-flex align-items-center text-muted" style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                        <i className="bi bi-speedometer2 me-1.5 text-muted"></i>
                        <span className="fw-bold text-primary ms-1 me-1">{exam.timePerQuestion}s</span>/q
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-auto">
                    {(() => {
                      if (examStatus.status === 'attempted') {
                        return (
                          <Button variant="secondary" disabled className="w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center" style={{ backgroundColor: 'oklch(0.62 0.17 150)', borderColor: 'oklch(0.62 0.17 150)', cursor: 'not-allowed', color: 'white', opacity: '1' }}>
                            <i className="bi bi-check-circle-fill me-2"></i>{examStatus.label}
                          </Button>
                        );
                      } else if (examStatus.status === 'upcoming') {
                        return (
                          <Button variant="outline-primary" disabled className="w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center" style={{ cursor: 'not-allowed', color: 'var(--p-400)', borderColor: 'var(--p-400)', opacity: '0.85', backgroundColor: 'transparent' }}>
                            <i className="bi bi-calendar2-event me-2"></i>{examStatus.label}
                          </Button>
                        );
                      } else if (examStatus.status === 'missed') {
                        return (
                          <Button variant="danger" disabled className="w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center" style={{ backgroundColor: 'oklch(0.57 0.2 27)', borderColor: 'oklch(0.57 0.2 27)', cursor: 'not-allowed', color: 'white', opacity: '1' }}>
                            <i className="bi bi-lock-fill me-2"></i>{examStatus.label}
                          </Button>
                        );
                      } else {
                        return (
                          <Button variant="success" onClick={() => navigate(`/exam/${exam._id}`)} className="w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center shadow-sm">
                            {examStatus.label} <i className="bi bi-arrow-right-short fs-5 ms-1"></i>
                          </Button>
                        );
                      }
                    })()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <h4 className="mb-3">My Results</h4>
      {results.published.length > 0 && (
        <Row className="mb-3">
          {results.published.map(result => (
            <Col md={6} lg={4} key={result._id} className="mb-3">
              <Card className={`shadow-sm border-0 ${result.passed ? 'border-start border-success border-4' : 'border-start border-danger border-4'}`}>
                <Card.Body>
                  <Card.Title>{result.exam?.title}</Card.Title>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="mb-1">Score: <strong>{result.score}/{result.totalQuestions}</strong></p>
                      <p className="mb-1">Attempted: {result.attemptedQuestions}</p>
                      <p className="mb-0">Percentage: <strong>{result.percentage}%</strong></p>
                    </div>
                    <Badge bg={result.passed ? 'success' : 'danger'} className="fs-6 p-2">
                      {result.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {results.pending.length > 0 && (
        <>
          <h6 className="text-muted">Pending Results (Awaiting Approval)</h6>
          {results.pending.map(r => (
            <Card key={r._id} className="mb-2 border-0 shadow-sm">
              <Card.Body className="py-2">
                <span className="fw-bold">{r.exam?.title}</span>
                <Badge bg="warning" className="ms-2">Pending</Badge>
                <span className="text-muted ms-2">{r.message}</span>
              </Card.Body>
            </Card>
          ))}
        </>
      )}

      {results.published.length === 0 && results.pending.length === 0 && (
        <p className="text-muted">No results yet. Take an exam to see your scores!</p>
      )}
    </Container>
  );
};

export default StudentDashboard;
