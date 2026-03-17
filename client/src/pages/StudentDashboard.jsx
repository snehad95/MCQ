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
      
      <h4 className="mb-3">Available Exams</h4>
      <Row className="mb-5">
        {exams.filter(e => e.isActive).length === 0 && (
          <Col><p className="text-muted">No exams available right now.</p></Col>
        )}
        {exams.filter(e => e.isActive).map(exam => (
          <Col md={6} lg={4} key={exam._id} className="mb-3">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <Card.Title className="fw-bold">{exam.title}</Card.Title>
                <Card.Text className="text-muted">{exam.description || 'No description'}</Card.Text>
                <div className="mb-2">
                  <small className="text-muted">
                    {new Date(exam.date).toLocaleDateString()}
                  </small>
                  <br />
                  <Badge bg="info" className="mt-1">
                    Window: {exam.startTime} - {exam.endTime}
                  </Badge>
                </div>
                <div className="mb-3">
                  <Badge bg="info" className="me-2">{exam.duration} min</Badge>
                  <Badge bg="secondary">{exam.timePerQuestion}s/question</Badge>
                </div>
                {(() => {
                  const examStatus = getExamStatus(exam);
                  if (examStatus.status === 'attempted') {
                    return <Button variant="secondary" disabled>{examStatus.label}</Button>;
                  } else if (examStatus.status === 'upcoming') {
                    return <Button variant="outline-primary" disabled>{examStatus.label}</Button>;
                  } else if (examStatus.status === 'missed') {
                    return <Button variant="danger" disabled>{examStatus.label}</Button>;
                  } else {
                    return (
                      <Button variant="success" onClick={() => navigate(`/exam/${exam._id}`)}>
                        {examStatus.label}
                      </Button>
                    );
                  }
                })()}
              </Card.Body>
            </Card>
          </Col>
        ))}
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
