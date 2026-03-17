import { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Badge, Alert, Button } from 'react-bootstrap';
import API from '../utils/api';

const ViewResults = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await API.get('/exams');
        setExams(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, []);

  const fetchResults = async (examId) => {
    if (!examId) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await API.get(`/results/exam/${examId}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleExamChange = (examId) => {
    setSelectedExam(examId);
    fetchResults(examId);
  };

  const selectedExamObj = exams.find(e => e._id === selectedExam);

  const togglePublish = async () => {
    if (!selectedExam) return;
    try {
      await API.put(`/exams/${selectedExam}/publish-results`);
      // Refresh exams to get updated publish status
      const res = await API.get('/exams');
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">View Results</h2>

      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Form.Group>
            <Form.Label className="fw-bold">Select Exam</Form.Label>
            <Form.Select value={selectedExam} onChange={(e) => handleExamChange(e.target.value)} id="select-exam">
              <option value="">-- Select an Exam --</option>
              {exams.map(exam => (
                <option key={exam._id} value={exam._id}>{exam.title} ({new Date(exam.date).toLocaleDateString()})</option>
              ))}
            </Form.Select>
          </Form.Group>
          {selectedExamObj && (
            <div className="mt-3 d-flex align-items-center gap-3">
              <span>Results Status:</span>
              <Button
                variant={selectedExamObj.resultsPublished ? 'success' : 'warning'}
                size="sm"
                onClick={togglePublish}
              >
                {selectedExamObj.resultsPublished ? 'Published (Click to Unpublish)' : 'Not Published (Click to Publish)'}
              </Button>
            </div>
          )}
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
              {results.length === 0 && !loading && (
                <tr><td colSpan="8" className="text-center text-muted py-4">No results for this exam yet.</td></tr>
              )}
              {loading && (
                <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
              )}
            </tbody>
          </Table>
        </Card>
      )}
    </Container>
  );
};

export default ViewResults;
