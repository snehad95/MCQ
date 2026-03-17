import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import API from '../utils/api';

const MyResults = () => {
  const [results, setResults] = useState({ published: [], pending: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await API.get('/results/my');
        setResults(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <Container className="py-5 text-center"><Spinner animation="border" variant="primary" /></Container>;
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">My Results</h2>

      {results.published.length > 0 && (
        <>
          <h5 className="mb-3 text-success">Published Results</h5>
          <Row className="mb-4">
            {results.published.map(r => (
              <Col md={6} lg={4} key={r._id} className="mb-3">
                <Card className={`shadow-sm border-0 ${r.passed ? 'border-start border-success border-4' : 'border-start border-danger border-4'}`}>
                  <Card.Body>
                    <Card.Title>{r.exam?.title}</Card.Title>
                    <p className="mb-1">{new Date(r.exam?.date).toLocaleDateString()}</p>
                    <hr />
                    <p>Rank: <strong>#{r.rank}</strong> {r.totalStudents ? `of ${r.totalStudents}` : ''}</p>
                    <p>Score: <strong>{r.score}/{r.totalQuestions}</strong></p>
                    <p>Attempted: <strong>{r.attemptedQuestions}</strong></p>
                    <p>Percentage: <strong>{r.percentage}%</strong></p>
                    <h4 className={`text-${r.passed ? 'success' : 'danger'} fw-bold`}>
                      {r.passed ? 'PASS' : 'FAIL'}
                    </h4>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {results.pending.length > 0 && (
        <>
          <h5 className="mb-3 text-warning">Pending Approval</h5>
          {results.pending.map(r => (
            <Card key={r._id} className="mb-2 shadow-sm border-0 border-start border-warning border-4">
              <Card.Body className="py-3">
                <strong>{r.exam?.title}</strong>
                <p className="text-muted mb-0 mt-1">{r.message}</p>
              </Card.Body>
            </Card>
          ))}
        </>
      )}

      {results.published.length === 0 && results.pending.length === 0 && (
        <Card className="shadow-sm border-0">
          <Card.Body className="text-center py-5 text-muted">
            <h4>No results yet</h4>
            <p>Take an exam to see your results here!</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default MyResults;
