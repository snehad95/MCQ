import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';

const ManageQuestions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fetchData = async () => {
    try {
      const [examRes, questionsRes] = await Promise.all([
        API.get(`/exams/${examId}`),
        API.get(`/questions/exam/${examId}`)
      ]);
      setExam(examRes.data);
      setQuestions(questionsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, [examId]);

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index] = value;
    setForm({ ...form, options: newOptions });
  };

  const resetForm = () => {
    setForm({ questionText: '', options: ['', '', '', ''], correctAnswer: 0 });
    setImageFile(null);
    setImagePreview(null);
    setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.options.some(o => o.trim() === '')) {
      return setError('All 4 options are required');
    }

    if (!form.questionText.trim() && !imageFile) {
      return setError('Please enter question text or upload a question image');
    }

    try {
      const formData = new FormData();
      formData.append('exam', examId);
      formData.append('questionText', form.questionText);
      formData.append('options', JSON.stringify(form.options));
      formData.append('correctAnswer', form.correctAnswer);
      if (imageFile) {
        formData.append('questionImage', imageFile);
      }

      await API.post('/questions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      resetForm();
      fetchData();
      setSuccess('Question added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add question');
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await API.delete(`/questions/${id}`);
      fetchData();
      setSuccess('Question deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container className="py-4">
      <Button variant="outline-secondary" onClick={() => navigate('/admin/exams')} className="mb-3">
                Back to Exams
      </Button>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Questions for: {exam?.title}</h2>
          <Badge bg="info">{questions.length} questions</Badge>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} id="add-question-btn">
          + Add Question
        </Button>
      </div>

      {success && <Alert variant="success">{success}</Alert>}

      <Card className="shadow-sm border-0">
        <Table responsive hover className="mb-0">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Question</th>
              <th>Image</th>
              <th>Options</th>
              <th>Correct</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => (
              <tr key={q._id}>
                <td>{idx + 1}</td>
                <td className="fw-bold">{q.questionText || <em className="text-muted">Image only</em>}</td>
                <td>
                  {q.questionImage ? (
                    <img
                      src={q.questionImage.startsWith('http') ? q.questionImage : `http://localhost:5000${q.questionImage}`}
                      alt="Question"
                      style={{ maxWidth: '80px', maxHeight: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => window.open(q.questionImage.startsWith('http') ? q.questionImage : `http://localhost:5000${q.questionImage}`, '_blank')}
                    />
                  ) : (
                    <small className="text-muted">—</small>
                  )}
                </td>
                <td>
                  {q.options.map((opt, i) => (
                    <div key={i}>
                      <small className={i === q.correctAnswer ? 'text-success fw-bold' : ''}>
                        {String.fromCharCode(65 + i)}. {opt} {i === q.correctAnswer && '(Correct)'}
                      </small>
                    </div>
                  ))}
                </td>
                <td><Badge bg="success">{String.fromCharCode(65 + q.correctAnswer)}</Badge></td>
                <td>
                  <Button size="sm" variant="outline-danger" onClick={() => deleteQuestion(q._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr><td colSpan="6" className="text-center text-muted py-4">No questions yet. Add some!</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Add Question Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Question</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Question Text</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.questionText}
                onChange={e => setForm({ ...form, questionText: e.target.value })}
                placeholder="Enter your question here... (optional if image is uploaded)"
                id="question-text"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Question Image (optional)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="question-image"
              />
              <Form.Text className="text-muted">
                Upload an image for the question (max 5MB). Supports JPG, PNG, GIF, WebP.
              </Form.Text>
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #dee2e6' }}
                  />
                </div>
              )}
            </Form.Group>
            {[0, 1, 2, 3].map(i => (
              <Form.Group className="mb-3" key={i}>
                <Form.Label>Option {String.fromCharCode(65 + i)}</Form.Label>
                <Form.Control
                  type="text"
                  value={form.options[i]}
                  onChange={e => handleOptionChange(i, e.target.value)}
                  required
                  placeholder={`Enter option ${String.fromCharCode(65 + i)}`}
                  id={`option-input-${i}`}
                />
              </Form.Group>
            ))}
            <Form.Group className="mb-3">
              <Form.Label>Correct Answer</Form.Label>
              <Form.Select
                value={form.correctAnswer}
                onChange={e => setForm({ ...form, correctAnswer: parseInt(e.target.value) })}
                id="correct-answer"
              >
                <option value={0}>A</option>
                <option value={1}>B</option>
                <option value={2}>C</option>
                <option value={3}>D</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Question</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ManageQuestions;
