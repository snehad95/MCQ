import { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Form, Row, Col, Tabs, Tab } from 'react-bootstrap';
import API from '../utils/api';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [examResults, setExamResults] = useState([]);
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await API.get('/exams');
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExamResults = async (examId) => {
    if (!examId) { setExamResults([]); return; }
    try {
      const res = await API.get(`/results/exam/${examId}`);
      setExamResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchExamResults(selectedExam);
    } else {
      setExamResults([]);
    }
  }, [selectedExam]);

  const changeRole = async (userId, newRole) => {
    try {
      await API.put(`/users/${userId}/role`, { role: newRole });
      fetchUsers();
      setSuccess(`Role updated to ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await API.delete(`/users/${userId}`);
      fetchUsers();
      setSuccess('User deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadge = (role) => {
    const colors = { admin: 'danger', teacher: 'warning', student: 'info' };
    return <Badge bg={colors[role]}>{role}</Badge>;
  };

  const selectedExamData = exams.find(e => e._id === selectedExam);

  return (
    <Container className="py-4">
      <h2 className="mb-4">Manage Users</h2>
      {success && <Alert variant="success">{success}</Alert>}

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">
        {/* TAB 1: All Users */}
        <Tab eventKey="users" title="All Users">
          <Card className="shadow-sm border-0">
            <Table responsive hover className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Change Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td className="fw-bold">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={u.role}
                        onChange={(e) => changeRole(u._id, e.target.value)}
                        style={{ width: '120px' }}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </Form.Select>
                    </td>
                    <td><small>{new Date(u.createdAt).toLocaleDateString()}</small></td>
                    <td>
                      <Button size="sm" variant="outline-danger" onClick={() => deleteUser(u._id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted py-4">No users found</td></tr>
                )}
              </tbody>
            </Table>
          </Card>
        </Tab>

        {/* TAB 2: Students by Exam */}
        <Tab eventKey="byExam" title="Students by Exam">
          <Card className="shadow-sm border-0 p-3 mb-3">
            <Row className="align-items-center">
              <Col md={6}>
                <Form.Label className="fw-bold">Select an Exam:</Form.Label>
                <Form.Select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  id="select-exam-filter"
                >
                  <option value="">-- Choose an exam --</option>
                  {exams.map(exam => (
                    <option key={exam._id} value={exam._id}>
                      {exam.title} ({new Date(exam.date).toLocaleDateString()})
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} className="text-end">
                {selectedExam && (
                  <div className="mt-2">
                    <Badge bg="primary" className="fs-6 me-2">
                      {examResults.length} Student{examResults.length !== 1 ? 's' : ''} Attempted
                    </Badge>
                    {selectedExamData && (
                      <Badge bg={selectedExamData.resultsPublished ? 'success' : 'warning'} className="fs-6">
                        {selectedExamData.resultsPublished ? 'Published' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                )}
              </Col>
            </Row>
          </Card>

          {selectedExam ? (
            <Card className="shadow-sm border-0">
              <Table responsive hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Attempted</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {examResults.map((r, idx) => (
                    <tr key={r._id}>
                      <td>{idx + 1}</td>
                      <td className="fw-bold">{r.student?.name}</td>
                      <td>{r.student?.email}</td>
                      <td>{r.attemptedQuestions}/{r.totalQuestions}</td>
                      <td><strong>{r.score}/{r.totalQuestions}</strong></td>
                      <td><strong>{r.percentage}%</strong></td>
                      <td>
                        <Badge bg={r.passed ? 'success' : 'danger'} className="fs-6">
                          {r.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </td>
                      <td><small>{new Date(r.submittedAt).toLocaleString()}</small></td>
                    </tr>
                  ))}
                  {examResults.length === 0 && (
                    <tr><td colSpan="8" className="text-center text-muted py-4">No students have attempted this exam yet.</td></tr>
                  )}
                </tbody>
              </Table>
            </Card>
          ) : (
            <Card className="shadow-sm border-0 p-5 text-center text-muted">
              <h5>Select an exam above to view students who attempted it</h5>
            </Card>
          )}
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ManageUsers;
