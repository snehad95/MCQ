import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import API from '../utils/api';

const ManageExams = () => {
  const [exams, setExams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  // eslint-disable-next-line
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
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await API.delete(`/exams/${id}`);
      setConfirmDeleteId(null);
      fetchExams();
      setSuccess('Exam deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete exam. Please try again.');
    }
    setDeleteLoading(false);
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
                  <Button size="sm" variant="outline-danger" onClick={() => { setConfirmDeleteId(exam._id); setDeleteError(''); }}>Delete</Button>
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
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="premium-modal">
        <div style={{ borderRadius: '24px', overflow: 'hidden', border: 'none' }}>
          <Modal.Header closeButton className="border-bottom-0 pb-0 px-4 pt-4">
            <div>
              <Modal.Title className="fw-bold text-main" style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem' }}>
                {editing ? 'Edit Exam Settings' : 'Create New Exam'}
              </Modal.Title>
              <small className="text-muted">Fill in the exam particulars below to configure the test.</small>
            </div>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body className="px-4 py-3">
              {error && <Alert variant="danger" className="rounded-3">{error}</Alert>}
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Exam Title</Form.Label>
                <div className="position-relative d-flex align-items-center">
                  <i className="bi bi-journal-text position-absolute text-muted ms-3 fs-5"></i>
                  <Form.Control 
                    type="text" 
                    value={form.title} 
                    onChange={e => setForm({ ...form, title: e.target.value })} 
                    required 
                    id="exam-title" 
                    className="py-2.5 ps-5" 
                    placeholder="Enter exam title (e.g. Advanced Java Test)"
                    style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Description</Form.Label>
                <div className="position-relative d-flex align-items-start">
                  <i className="bi bi-blockquote-left position-absolute text-muted ms-3 mt-2.5 fs-5"></i>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    className="py-2.5 ps-5"
                    placeholder="Brief overview or instructions for students..."
                    style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                  />
                </div>
              </Form.Group>

              <div className="row g-3 mb-3">
                <Form.Group className="col-md-4">
                  <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Date</Form.Label>
                  <div className="position-relative d-flex align-items-center">
                    <i className="bi bi-calendar-event position-absolute text-muted ms-3 fs-5" style={{ pointerEvents: 'none', zIndex: 10 }}></i>
                    <Form.Control 
                      type="date" 
                      value={form.date} 
                      onChange={e => setForm({ ...form, date: e.target.value })} 
                      required 
                      className="py-2.5 ps-5"
                      style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                    />
                  </div>
                </Form.Group>

                <Form.Group className="col-md-4">
                  <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Start Time (24HR)</Form.Label>
                  <div className="position-relative d-flex align-items-center">
                    <i className="bi bi-clock position-absolute text-muted ms-3 fs-5" style={{ pointerEvents: 'none', zIndex: 10 }}></i>
                    <Form.Control 
                      type="time" 
                      value={form.startTime} 
                      onChange={e => {
                        const newStart = e.target.value;
                        setForm(prev => ({ ...prev, startTime: newStart, duration: calcDuration(newStart, prev.endTime) }));
                      }} 
                      required 
                      className="py-2.5 ps-5"
                      style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                    />
                  </div>
                </Form.Group>

                <Form.Group className="col-md-4">
                  <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>End Time (24HR)</Form.Label>
                  <div className="position-relative d-flex align-items-center">
                    <i className="bi bi-clock-history position-absolute text-muted ms-3 fs-5" style={{ pointerEvents: 'none', zIndex: 10 }}></i>
                    <Form.Control 
                      type="time" 
                      value={form.endTime} 
                      onChange={e => {
                        const newEnd = e.target.value;
                        setForm(prev => ({ ...prev, endTime: newEnd, duration: calcDuration(prev.startTime, newEnd) }));
                      }} 
                      required 
                      className="py-2.5 ps-5"
                      style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                    />
                  </div>
                </Form.Group>
              </div>

              <div className="row g-3 mb-4">
                <Form.Group className="col-md-4">
                  <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Duration (auto-calculated)</Form.Label>
                  <div className="d-flex align-items-center px-3 py-2.5" style={{ backgroundColor: 'var(--bg-main)', border: '1.5px solid var(--border-color)', borderRadius: '12px', height: '47px', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    <i className="bi bi-stopwatch text-primary me-2.5 fs-5"></i>
                    <span className="fw-bold">{form.duration ? `${form.duration} mins` : 'Set start & end time'}</span>
                  </div>
                </Form.Group>

                <Form.Group className="col-md-4">
                  <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Time/Question (sec)</Form.Label>
                  <div className="position-relative d-flex align-items-center">
                    <i className="bi bi-speedometer2 position-absolute text-muted ms-3 fs-5"></i>
                    <Form.Control 
                      type="number" 
                      value={form.timePerQuestion} 
                      onChange={e => setForm({ ...form, timePerQuestion: parseInt(e.target.value) })} 
                      min="10" 
                      required 
                      className="py-2.5 ps-5"
                      style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                    />
                  </div>
                </Form.Group>

                <Form.Group className="col-md-4">
                  <Form.Label className="fw-semibold text-secondary" style={{ fontSize: '0.9rem' }}>Passing Score (%)</Form.Label>
                  <div className="position-relative d-flex align-items-center">
                    <i className="bi bi-trophy position-absolute text-muted ms-3 fs-5"></i>
                    <Form.Control 
                      type="number" 
                      value={form.passingScore} 
                      onChange={e => setForm({ ...form, passingScore: parseInt(e.target.value) })} 
                      min="0" 
                      max="100" 
                      required 
                      className="py-2.5 ps-5"
                      style={{ borderRadius: '12px', border: '1.5px solid var(--border-color)', fontSize: '0.95rem' }} 
                    />
                  </div>
                </Form.Group>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-top-0 px-4 pb-4 pt-0 gap-2">
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 fw-semibold"
                style={{ borderRadius: '12px', fontSize: '0.95rem' }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                className="px-4 py-2 fw-bold shadow-sm"
                style={{ borderRadius: '12px', fontSize: '0.95rem', minWidth: '110px' }}
              >
                {editing ? 'Update' : 'Create'}
              </Button>
            </Modal.Footer>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={!!confirmDeleteId}
        onHide={() => { setConfirmDeleteId(null); setDeleteError(''); }}
        centered
        size="sm"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-6" style={{ color: '#dc3545' }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>Delete Exam
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2 pb-3 px-4">
          {deleteError && <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: '0.875rem' }}>{deleteError}</Alert>}
          <p className="mb-0" style={{ fontSize: '0.95rem' }}>
            Are you sure you want to <strong>permanently delete</strong> this exam? This action cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 px-4 pb-3 gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => { setConfirmDeleteId(null); setDeleteError(''); }}
            disabled={deleteLoading}
            className="px-3"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => deleteExam(confirmDeleteId)}
            disabled={deleteLoading}
            className="px-3 fw-semibold"
            id="confirm-delete-exam-btn"
          >
            {deleteLoading ? <><Spinner size="sm" className="me-1" />Deleting...</> : 'Yes, Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ManageExams;
