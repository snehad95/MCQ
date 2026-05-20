import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
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

  // Bulk Upload States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

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

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setBulkError('');
    setBulkSuccess('');

    if (!bulkFile) {
      return setBulkError('Please select a CSV file first');
    }

    setBulkLoading(true);
    try {
      const formData = new FormData();
      formData.append('examId', examId);
      formData.append('file', bulkFile);

      const res = await API.post('/questions/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setBulkSuccess(res.data.message);
      setBulkFile(null);
      
      const fileInput = document.getElementById('bulk-file-input');
      if (fileInput) fileInput.value = '';

      if (res.data.errors && res.data.errors.length > 0) {
        setBulkError(`Partial Success. Some rows failed:\n${res.data.errors.join('\n')}`);
      }

      fetchData();
      setTimeout(() => {
        if (!res.data.errors || res.data.errors.length === 0) {
          setShowBulkModal(false);
        }
        setBulkSuccess('');
      }, 4000);

    } catch (err) {
      setBulkError(err.response?.data?.message || 'Failed to upload questions CSV');
    }
    setBulkLoading(false);
  };

  const downloadTemplate = () => {
    const headers = "questionText,optionA,optionB,optionC,optionD,correctAnswer\n";
    const row1 = "\"What is the primary tech stack of CDAC ExamWeb?\",\"LAMP Stack\",\"MERN Stack\",\"Django + PostgreSQL\",\"Java Spring + Oracle\",\"MERN Stack\"\n";
    const row2 = "\"Which tool manages backend processes in clustered mode?\",\"Nodemon\",\"Docker\",\"PM2\",\"Kubernetes\",\"PM2\"\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + row1 + row2);
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "questions_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => { setBulkError(''); setBulkSuccess(''); setBulkFile(null); setShowBulkModal(true); }} id="bulk-upload-btn">
            <i className="bi bi-file-earmark-spreadsheet me-1"></i> Bulk Upload CSV
          </Button>
          <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }} id="add-question-btn">
            + Add Question
          </Button>
        </div>
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

      {/* Bulk Upload Excel/CSV Modal */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><i className="bi bi-file-earmark-spreadsheet me-2 text-primary"></i>Bulk Upload Questions (Excel or CSV)</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleBulkUpload}>
          <Modal.Body>
            {bulkError && <Alert variant={bulkSuccess ? "warning" : "danger"} style={{ whiteSpace: 'pre-line' }}>{bulkError}</Alert>}
            {bulkSuccess && <Alert variant="success">{bulkSuccess}</Alert>}

            {/* Quick Tutorial: How to upload Excel or CSV */}
            <div className="mb-4 p-3 bg-light rounded border">
              <h6 className="fw-bold mb-2 text-main text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                💡 Bulk Upload File Formats & Guide
              </h6>
              <ol className="small text-muted mb-0 ps-3">
                <li>Create your question sheet in Excel or Google Sheets with these exact column headers:
                  <code className="d-block bg-white border rounded p-1.5 my-1.5 fw-semibold text-dark text-center select-all">
                    questionText,optionA,optionB,optionC,optionD,correctAnswer
                  </code>
                </li>
                <li>Write your options. The <strong>correctAnswer</strong> column can be option text (e.g., matching options exactly), letter indices (<code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>), or option numbers (<code>1</code>, <code>2</code>, <code>3</code>, <code>4</code>).</li>
                <li>You can directly upload the raw <strong>Excel Sheet (.xlsx, .xls)</strong> or a standard <strong>CSV file (.csv)</strong>. Both formats are fully parsed and validated instantly!</li>
                <li>Click <strong>Download Template</strong> below to see a sample:</li>
              </ol>
              <div className="mt-2.5">
                <Button variant="outline-secondary" size="sm" onClick={downloadTemplate}>
                  <i className="bi bi-download me-1"></i> Download Template (.csv)
                </Button>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Select File (Excel or CSV)</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xlsx,.xls"
                id="bulk-file-input"
                onChange={e => setBulkFile(e.target.files[0])}
                required
              />
              <Form.Text className="text-muted">
                Supports Excel (.xlsx, .xls) and Comma Separated Values (.csv) formats.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={bulkLoading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={bulkLoading} id="bulk-submit-btn">
              {bulkLoading ? <><Spinner size="sm" className="me-2" />Uploading & Parsing...</> : 'Upload Questions'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ManageQuestions;
