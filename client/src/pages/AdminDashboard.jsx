import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Form, Table, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ exams: 0, users: 0, results: 0 });
  const [recentExams, setRecentExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Ranking state
  const [selectedExam, setSelectedExam] = useState('');
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const examsRes = await API.get('/exams');
        setAllExams(examsRes.data);
        setRecentExams(examsRes.data.slice(0, 5));
        setStats(prev => ({ ...prev, exams: examsRes.data.length }));

        if (user.role === 'admin') {
          const usersRes = await API.get('/users');
          setStats(prev => ({ ...prev, users: usersRes.data.length }));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStats();
  }, [user.role]);

  const fetchResults = async (examId) => {
    if (!examId) { setResults([]); return; }
    setResultsLoading(true);
    try {
      const res = await API.get(`/results/exam/${examId}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
    setResultsLoading(false);
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    fetchResults(examId);
  };

  const selectedExamObj = allExams.find(e => e._id === selectedExam);

  const togglePublish = async () => {
    if (!selectedExam) return;
    try {
      await API.put(`/exams/${selectedExam}/publish-results`);
      const res = await API.get('/exams');
      setAllExams(res.data);
      setRecentExams(res.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <Container className="py-5 text-center"><Spinner animation="border" variant="primary" /></Container>;
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Admin Dashboard</h2>
      <p className="text-muted">Welcome, {user?.name}!</p>

      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card className="shadow-sm border-0 stat-card-exams" onClick={() => navigate('/admin/exams')} style={{ cursor: 'pointer' }}>
            <Card.Body className="text-center py-4">
              <h1 className="fw-bold">{stats.exams}</h1>
              <h5>Total Exams</h5>
            </Card.Body>
          </Card>
        </Col>
        {user.role === 'admin' && (
          <Col md={4} className="mb-3">
            <Card className="shadow-sm border-0 stat-card-users" onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>
              <Card.Body className="text-center py-4">
                <h1 className="fw-bold">{stats.users}</h1>
                <h5>Total Users</h5>
              </Card.Body>
            </Card>
          </Col>
        )}
        <Col md={4} className="mb-3">
          <Card className="shadow-sm border-0 stat-card-results" onClick={() => navigate('/admin/results')} style={{ cursor: 'pointer' }}>
            <Card.Body className="text-center py-4">
              <h1 className="fw-bold">View</h1>
              <h5>View Results</h5>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h4 className="mb-3">Recent Exams</h4>
      {recentExams.map(exam => (
        <Card key={exam._id} className="mb-2 shadow-sm border-0">
          <Card.Body className="py-2 d-flex justify-content-between align-items-center">
            <div>
              <strong>{exam.title}</strong>
              <small className="text-muted ms-3">{new Date(exam.date).toLocaleDateString()}</small>
            </div>
            <span className={`badge bg-${exam.isActive ? 'success' : 'secondary'}`}>
              {exam.isActive ? 'Active' : 'Inactive'}
            </span>
          </Card.Body>
        </Card>
      ))}

      {/* Student Rankings Section */}
      <h4 className="mt-5 mb-3">Student Rankings</h4>
      <Card className="mb-3 shadow-sm border-0">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">Select Exam</Form.Label>
                <Form.Select value={selectedExam} onChange={(e) => handleExamChange(e.target.value)} id="rank-select-exam">
                  <option value="">-- Select an Exam --</option>
                  {allExams.map(exam => (
                    <option key={exam._id} value={exam._id}>{exam.title} ({new Date(exam.date).toLocaleDateString()})</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              {selectedExamObj && (
                <div className="mt-3 mt-md-0 d-flex align-items-center gap-3">
                  <span className="fw-bold">Results Status:</span>
                  <Button
                    variant={selectedExamObj.resultsPublished ? 'success' : 'warning'}
                    size="sm"
                    onClick={togglePublish}
                  >
                    {selectedExamObj.resultsPublished ? 'Published (Click to Unpublish)' : 'Not Published (Click to Publish)'}
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {selectedExam && (
        <Card className="shadow-sm border-0">
          <Table responsive hover className="mb-0">
            <thead className="table-dark">
              <tr>
                <th>Rank</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Attempted</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Pass/Fail</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r._id}>
                  <td className="fw-bold">{r.rank}</td>
                  <td className="fw-bold">{r.student?.name}</td>
                  <td>{r.student?.email}</td>
                  <td>{r.attemptedQuestions}/{r.totalQuestions}</td>
                  <td className="fw-bold">{r.score}/{r.totalQuestions}</td>
                  <td>
                    <Badge bg={r.percentage >= 70 ? 'success' : r.percentage >= 40 ? 'warning' : 'danger'}>
                      {r.percentage}%
                    </Badge>
                  </td>
                  <td>
                    <Badge bg={r.passed ? 'success' : 'danger'} className="fs-6">
                      {r.passed ? 'PASS' : 'FAIL'}
                    </Badge>
                  </td>
                  <td><small>{new Date(r.submittedAt).toLocaleString()}</small></td>
                </tr>
              ))}
              {results.length === 0 && !resultsLoading && selectedExam && (
                <tr><td colSpan="8" className="text-center text-muted py-4">No results for this exam yet.</td></tr>
              )}
              {resultsLoading && (
                <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
              )}
            </tbody>
          </Table>
        </Card>
      )}
    </Container>
  );
};

export default AdminDashboard;
