import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import API from '../utils/api';

const ManageExams = () => {
  const [exams, setExams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', date: '', startTime: '', endTime: '',
    duration: 0, timePerQuestion: 60, passingScore: 40
  });

  const calcDuration = (start, end) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60; // overnight exam
    return diff;
  };

  const fetchExams = async () => {
    try {
      const res = await API.get('/exams');
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchExams(); }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', date: '', startTime: '', endTime: '', duration: 0, timePerQuestion: 60, passingScore: 40 });
    setEditing(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (exam) => {
    const start = exam.startTime;
    const end = exam.endTime || '';
    setForm({
      title: exam.title,
      description: exam.description || '',
      date: exam.date.slice(0, 10),
      startTime: start,
      endTime: end,
      duration: calcDuration(start, end),
      timePerQuestion: exam.timePerQuestion,
      passingScore: exam.passingScore
    });
    setEditing(exam._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await API.put(`/exams/${editing}`, form);
        setSuccess('Exam updated!');
      } else {
        await API.post('/exams', form);
        setSuccess('Exam created!');
      }
      setShowModal(false);
      fetchExams();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save exam');
    }
  };

  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    try {
      await API.delete(`/exams/${id}`);
      fetchExams();
      setSuccess('Exam deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (exam) => {
    try {
      await API.put(`/exams/${exam._id}`, { isActive: !exam.isActive });
      fetchExams();
    } catch (err) {
      console.error(err);
    }
  };

  const togglePublishResults = async (exam) => {
    try {
      await API.put(`/exams/${exam._id}/publish-results`);
      fetchExams();
      setSuccess(`Results ${exam.resultsPublished ? 'unpublished' : 'published'}!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Manage Exams</h2>
        <Button variant="primary" onClick={openCreate} id="create-exam-btn">+ Create Exam</Button>
      </div>

      {success && <Alert variant="success">{success}</Alert>}

      <Card className="shadow-sm border-0">
        <Table responsive hover className="mb-0">
          <thead className="table-dark">
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Window</th>
              <th>Duration</th>
              <th>Pass %</th>
              <th>Status</th>
              <th>Results</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.map(exam => (
              <tr key={exam._id}>
                <td className="fw-bold">{exam.title}</td>
                <td>{new Date(exam.date).toLocaleDateString()}</td>
                <td><Badge bg="info">{exam.startTime} - {exam.endTime}</Badge></td>
                <td>{exam.duration} min</td>
                <td>{exam.passingScore}%</td>
                <td>
                  <Badge bg={exam.isActive ? 'success' : 'secondary'} style={{ cursor: 'pointer' }} onClick={() => toggleActive(exam)}>
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>
                  <Button
                    size="sm"
                    variant={exam.resultsPublished ? 'success' : 'outline-warning'}
                    onClick={() => togglePublishResults(exam)}
                  >
                    {exam.resultsPublished ? 'Published' : 'Pending'}
                  </Button>
                </td>
                <td>
                  <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openEdit(exam)}>Edit</Button>
                  <Button size="sm" variant="outline-info" className="me-1" onClick={() => window.location.href = `/admin/questions/${exam._id}`}>Questions</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => deleteExam(exam._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr><td colSpan="8" className="text-center text-muted py-4">No exams yet. Create one!</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Exam' : 'Create New Exam'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Exam Title</Form.Label>
              <Form.Control type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required id="exam-title" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Form.Group>
            <div className="row">
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </Form.Group>
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Start Time</Form.Label>
                <Form.Control type="time" value={form.startTime} onChange={e => {
                  const newStart = e.target.value;
                  setForm(prev => ({ ...prev, startTime: newStart, duration: calcDuration(newStart, prev.endTime) }));
                }} required />
              </Form.Group>
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>End Time</Form.Label>
                <Form.Control type="time" value={form.endTime} onChange={e => {
                  const newEnd = e.target.value;
                  setForm(prev => ({ ...prev, endTime: newEnd, duration: calcDuration(prev.startTime, newEnd) }));
                }} required />
              </Form.Group>
            </div>
            <div className="row">
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Duration (auto-calculated)</Form.Label>
                <Form.Control type="text" value={form.duration ? `${form.duration} minutes` : 'Set start & end time'} readOnly style={{ backgroundColor: '#e9ecef' }} />
              </Form.Group>
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Time/Question (sec)</Form.Label>
                <Form.Control type="number" value={form.timePerQuestion} onChange={e => setForm({ ...form, timePerQuestion: parseInt(e.target.value) })} min="10" required />
              </Form.Group>
              <Form.Group className="mb-3 col-md-4">
                <Form.Label>Passing Score (%)</Form.Label>
                <Form.Control type="number" value={form.passingScore} onChange={e => setForm({ ...form, passingScore: parseInt(e.target.value) })} min="0" max="100" required />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{editing ? 'Update' : 'Create'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ManageExams;
