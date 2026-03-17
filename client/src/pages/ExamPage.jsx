import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, ProgressBar, Modal } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import * as faceapi from '@vladmandic/face-api';

const MAX_WARNINGS = 5;

const ExamPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [webcamStream, setWebcamStream] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  // Per-question timer state
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const questionTimerRef = useRef(null);

  // Mark for review
  const [markedForReview, setMarkedForReview] = useState({});

  // Anti-cheat state
  const [violations, setViolations] = useState([]);
  const [faceModelLoaded, setFaceModelLoaded] = useState(false);
  const [showCheatModal, setShowCheatModal] = useState(false);
  const [cheatReason, setCheatReason] = useState('');
  const [faceStatus, setFaceStatus] = useState('loading');
  const [headDirection, setHeadDirection] = useState('center');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const faceDetectionRef = useRef(null);
  const violationCountRef = useRef(0);
  const submittedRef = useRef(false);
  const lastNoseXRef = useRef(null);
  const lastDetectionTimeRef = useRef(null);
  const lookAwayStartRef = useRef(null);

  // Add a violation
  const addViolation = useCallback((type, message) => {
    if (submittedRef.current) return;
    violationCountRef.current += 1;
    const count = violationCountRef.current;
    setViolations(prev => [...prev, { type, message, time: new Date().toLocaleTimeString(), count }]);
    
    if (count >= MAX_WARNINGS) {
      setCheatReason(`Maximum violations reached (${count}/${MAX_WARNINGS}). Exam auto-submitted.`);
      setShowCheatModal(true);
    }
  }, []);

  // Submit exam
  const submitExam = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (faceDetectionRef.current) clearInterval(faceDetectionRef.current);

    try {
      const formattedAnswers = Object.entries(answers).map(([question, selectedAnswer]) => ({
        question,
        selectedAnswer: parseInt(selectedAnswer)
      }));

      const res = await API.post('/results/submit', {
        examId,
        answers: formattedAnswers
      });

      setResult(res.data.result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    }
  }, [webcamStream, answers, examId]);

  // ===== ANTI-CHEAT: Tab Switch =====
  useEffect(() => {
    if (loading || submitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('tab-switch', 'Tab switch detected. You left the exam window.');
      }
    };

    const handleBlur = () => {
      if (!submittedRef.current) {
        addViolation('window-blur', 'Window lost focus. Possible tab or app switch.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [loading, submitted, addViolation]);

  // ===== ANTI-CHEAT: Window Resize =====
  useEffect(() => {
    if (loading || submitted) return;
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      if (submittedRef.current) return;
      const widthDiff = Math.abs(window.innerWidth - initialWidth);
      const heightDiff = Math.abs(window.innerHeight - initialHeight);
      if (widthDiff > 100 || heightDiff > 100) {
        addViolation('resize', 'Window resize detected. Keep the browser in full screen.');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loading, submitted, addViolation]);

  // ===== ANTI-CHEAT: Right-click, Copy, Keyboard =====
  useEffect(() => {
    if (loading || submitted) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      addViolation('right-click', 'Right-click blocked.');
    };

    const handleCopy = (e) => {
      e.preventDefault();
      addViolation('copy', 'Copy attempt blocked.');
    };

    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'u')) ||
        e.key === 'PrintScreen' ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        addViolation('keyboard', `Blocked key: ${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, submitted, addViolation]);

  // ===== ANTI-CHEAT: Load Face + Landmark Models =====
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models')
        ]);
        setFaceModelLoaded(true);
      } catch (err) {
        console.error('Failed to load face models:', err);
      }
    };
    loadModels();
  }, []);

  // ===== ANTI-CHEAT: Face Detection + Head Movement =====
  useEffect(() => {
    if (!faceModelLoaded || !videoRef.current || !webcamStream || submitted) return;

    const detectFaces = async () => {
      if (!videoRef.current || submittedRef.current) return;
      const video = videoRef.current;
      if (video.readyState !== 4) return;

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true); // useTinyModel = true

        // Draw on canvas
        if (canvasRef.current) {
          const displaySize = { width: video.videoWidth || 320, height: video.videoHeight || 240 };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resized = faceapi.resizeResults(detections, displaySize);
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resized);
        }

        const now = Date.now();

        // --- No face ---
        if (detections.length === 0) {
          setFaceStatus('no-face');
          setHeadDirection('away');
          // If no face for more than 3 seconds, add violation
          if (!lookAwayStartRef.current) {
            lookAwayStartRef.current = now;
          } else if (now - lookAwayStartRef.current > 3000) {
            addViolation('no-face', 'No face detected for extended period.');
            lookAwayStartRef.current = now; // reset so it doesn't spam
          }
          lastNoseXRef.current = null;
          return;
        }

        lookAwayStartRef.current = null;

        // --- Multiple faces ---
        if (detections.length > 1) {
          setFaceStatus('multi-face');
          addViolation('multi-face', `${detections.length} faces detected in camera.`);
          return;
        }

        // --- Single face: analyze head direction ---
        setFaceStatus('ok');
        const landmarks = detections[0].landmarks;
        const nose = landmarks.getNose();
        const jaw = landmarks.getJawOutline();

        // Use nose tip (index 3) and jaw boundaries to estimate head direction
        const noseTip = nose[3] || nose[0];
        const jawLeft = jaw[0];
        const jawRight = jaw[jaw.length - 1];
        const faceWidth = jawRight.x - jawLeft.x;
        const faceCenterX = (jawLeft.x + jawRight.x) / 2;
        
        // How far the nose is from the face center (normalized)
        const noseOffset = (noseTip.x - faceCenterX) / faceWidth;

        // Determine direction
        let direction = 'center';
        if (noseOffset < -0.15) {
          direction = 'right'; // mirrored camera
        } else if (noseOffset > 0.15) {
          direction = 'left'; // mirrored camera
        }
        setHeadDirection(direction);

        if (direction !== 'center') {
          addViolation('head-turn', `Head turned ${direction}. Look straight at the screen.`);
        }

        // --- Rapid movement detection ---
        if (lastNoseXRef.current !== null && lastDetectionTimeRef.current !== null) {
          const timeDelta = (now - lastDetectionTimeRef.current) / 1000; // seconds
          const xDelta = Math.abs(noseTip.x - lastNoseXRef.current);
          const speed = xDelta / timeDelta; // pixels per second

          // If head moved more than 150 pixels/second, flag it
          if (speed > 150 && timeDelta < 5) {
            addViolation('rapid-movement', 'Rapid head movement detected.');
          }
        }

        lastNoseXRef.current = noseTip.x;
        lastDetectionTimeRef.current = now;

      } catch (err) {
        // silently handle
      }
    };

    faceDetectionRef.current = setInterval(detectFaces, 2000);
    setTimeout(detectFaces, 1500);

    return () => {
      if (faceDetectionRef.current) clearInterval(faceDetectionRef.current);
    };
  }, [faceModelLoaded, webcamStream, submitted, addViolation]);

  // ===== Load Exam & Questions =====
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const [examRes, questionsRes] = await Promise.all([
          API.get(`/exams/${examId}`),
          API.get(`/questions/exam/${examId}`)
        ]);
        setExam(examRes.data);
        setQuestions(questionsRes.data);
        
        const totalDurationSeconds = examRes.data.duration * 60;
        const now = new Date();
        const endDateTime = new Date(`${examRes.data.date.slice(0, 10)}T${examRes.data.endTime}`);
        if (endDateTime < new Date(`${examRes.data.date.slice(0, 10)}T${examRes.data.startTime}`)) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        const secondsUntilEnd = Math.floor((endDateTime - now) / 1000);
        const actualSecondsLeft = Math.max(0, Math.min(totalDurationSeconds, secondsUntilEnd));
        
        setTimeLeft(actualSecondsLeft);
        if (actualSecondsLeft <= 0) {
          setError('This exam has already ended.');
        }
      } catch (err) {
        setError('Failed to load exam');
      }
      setLoading(false);
    };
    fetchExam();
  }, [examId]);

  // ===== Webcam =====
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        setWebcamStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Webcam access denied:', err);
      }
    };
    if (!loading && questions.length > 0) {
      startWebcam();
    }
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [loading, questions.length]);

  // ===== Timer =====
  useEffect(() => {
    if (loading || questions.length === 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, questions.length, submitted, submitExam]);

  // ===== Per-Question Timer =====
  useEffect(() => {
    if (loading || questions.length === 0 || submitted || !exam) return;
    // Reset per-question timer when question changes
    const perQTime = exam.timePerQuestion || 60;
    setQuestionTimeLeft(perQTime);

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft(prev => prev - 1); // goes negative, no auto-submit
    }, 1000);

    return () => { if (questionTimerRef.current) clearInterval(questionTimerRef.current); };
  }, [currentQ, loading, questions.length, submitted, exam]);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  const formatTime = (seconds) => {
    const isNegative = seconds < 0;
    const abs = Math.abs(seconds);
    const mins = Math.floor(abs / 60);
    const secs = abs % 60;
    return `${isNegative ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectAnswer = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const toggleReview = (questionId) => {
    setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    submitExam();
  };

  const handleCheatAutoSubmit = () => {
    setShowCheatModal(false);
    submitExam();
  };

  const getFaceStatusColor = () => {
    if (faceStatus === 'ok') return '#138808';
    if (faceStatus === 'no-face' || faceStatus === 'warning') return '#FF9933';
    if (faceStatus === 'multi-face' || faceStatus === 'danger') return '#c62828';
    return '#9e9e9e';
  };

  // ===== RESULT SCREEN =====
  if (result) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="shadow-lg border-0 text-center">
              <Card.Body className="p-5">
                <h2 className="mb-3 fw-bold">Exam Submitted</h2>
                <p className="text-muted mb-4">Thank you for completing the exam</p>
                <hr />
                {violations.length > 0 && (
                  <Alert variant="warning" className="mt-3 text-start">
                    <strong>Anti-cheat violations recorded: {violations.length}</strong>
                    <ul className="mb-0 mt-2" style={{ fontSize: '0.8rem' }}>
                      {violations.map((v, i) => (
                        <li key={i}>{v.time} - {v.message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                <p className="text-muted mt-3">
                  Results will be visible once approved by your teacher/admin.
                </p>
                <Button variant="primary" onClick={() => navigate('/dashboard')} className="mt-3">
                  Back to Dashboard
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (loading) return <Container className="py-5 text-center"><h4>Loading exam...</h4></Container>;

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </Container>
    );
  }

  if (questions.length === 0) {
    return (
      <Container className="py-5">
        <Alert variant="warning">No questions found for this exam.</Alert>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>Back</Button>
      </Container>
    );
  }

  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const reviewedCount = Object.values(markedForReview).filter(Boolean).length;
  const latestViolation = violations.length > 0 ? violations[violations.length - 1] : null;

  return (
    <Container fluid className="py-3 exam-lockdown">
      {/* Violation banner */}
      {latestViolation && (
        <Alert
          variant={violationCountRef.current >= 3 ? 'danger' : 'warning'}
          className="text-center fw-bold mb-3 anti-cheat-warning"
        >
          VIOLATION {violationCountRef.current}/{MAX_WARNINGS}: {latestViolation.message}
        </Alert>
      )}

      <Row>
        {/* Main exam area */}
        <Col lg={9}>
          {/* Header bar */}
          <Card className="mb-3 shadow-sm border-0">
            <Card.Body className="py-2">
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-0 fw-bold">{exam?.title}</h5>
                </Col>
                <Col xs="auto">
                  <Badge
                    bg={timeLeft < 60 ? 'danger' : timeLeft < 300 ? 'warning' : 'success'}
                    className="fs-5 p-2"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {formatTime(timeLeft)}
                  </Badge>
                </Col>
              </Row>
              <ProgressBar now={progress} className="mt-2" style={{ height: '4px' }} variant="info" />
            </Card.Body>
          </Card>

          {/* Question */}
          <Card className="shadow border-0">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between mb-3">
                <Badge bg="primary" className="fs-6">Q {currentQ + 1} / {questions.length}</Badge>
                <div className="d-flex gap-2 align-items-center">
                  <Badge
                    bg={questionTimeLeft > 0 ? 'secondary' : 'danger'}
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  >
                    Q Time: {formatTime(questionTimeLeft)}
                  </Badge>
                  <Badge bg="secondary">{answeredCount}/{questions.length} answered</Badge>
                  {reviewedCount > 0 && (
                    <Badge style={{ background: '#7b1fa2' }}>{reviewedCount} for review</Badge>
                  )}
                </div>
              </div>

              {markedForReview[question._id] && (
                <Alert variant="info" className="py-1 px-2 mb-2" style={{ fontSize: '0.85rem', borderLeft: '4px solid #7b1fa2' }}>
                  This question is marked for review
                </Alert>
              )}

              <h4 className="mb-4">{question.questionText}</h4>

              {question.questionImage && (
                <div className="mb-4 text-center">
                  <img
                    src={`http://localhost:5000${question.questionImage}`}
                    alt="Question"
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #dee2e6' }}
                  />
                </div>
              )}

              <div className="d-grid gap-2">
                {question.options.map((option, idx) => (
                  <Button
                    key={idx}
                    variant={answers[question._id] === idx ? 'primary' : 'outline-secondary'}
                    className="text-start p-3 fs-6"
                    onClick={() => selectAnswer(question._id, idx)}
                    id={`option-${idx}`}
                  >
                    <strong className="me-2">{String.fromCharCode(65 + idx)}.</strong> {option}
                  </Button>
                ))}
              </div>

              <div className="d-flex justify-content-between mt-4">
                <Button
                  variant="outline-secondary"
                  onClick={() => setCurrentQ(prev => prev - 1)}
                  disabled={currentQ === 0}
                >
                  Previous
                </Button>
                <div className="d-flex gap-2">
                  <Button
                    variant={markedForReview[question._id] ? 'warning' : 'outline-warning'}
                    onClick={() => toggleReview(question._id)}
                    size="sm"
                  >
                    {markedForReview[question._id] ? 'Unmark Review' : 'Mark for Review'}
                  </Button>
                  <Button variant="success" onClick={() => setShowSubmitModal(true)}>
                    Submit Exam
                  </Button>
                </div>
                {currentQ < questions.length - 1 ? (
                  <Button variant="primary" onClick={() => setCurrentQ(prev => prev + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button variant="outline-secondary" disabled style={{ visibility: 'hidden' }}>
                    Next
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col lg={3}>
          {/* Webcam */}
          <Card className="mb-3 shadow-sm" style={{ borderLeft: `4px solid ${getFaceStatusColor()}` }}>
            <Card.Body className="p-2">
              <div style={{ position: 'relative', width: '100%' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: '100%', borderRadius: '4px', transform: 'scaleX(-1)' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }}
                />
              </div>
              <div className="text-center mt-1">
                {!faceModelLoaded ? (
                  <small className="text-muted">Loading face detection...</small>
                ) : faceStatus === 'ok' ? (
                  <small style={{ color: '#138808' }} className="fw-bold">
                    Face OK | Direction: {headDirection.toUpperCase()}
                  </small>
                ) : faceStatus === 'no-face' ? (
                  <small style={{ color: '#FF9933' }} className="fw-bold">
                    NO FACE DETECTED
                  </small>
                ) : faceStatus === 'multi-face' ? (
                  <small style={{ color: '#c62828' }} className="fw-bold">
                    MULTIPLE FACES DETECTED
                  </small>
                ) : (
                  <small className="text-muted">Webcam Active</small>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Anti-Cheat Monitor */}
          <Card className="mb-3 shadow-sm border-0">
            <Card.Body className="py-2">
              <h6 className="fw-bold mb-2" style={{ color: '#1a237e' }}>Anti-Cheat Monitor</h6>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="fw-bold">Violations:</small>
                <Badge
                  bg={violations.length === 0 ? 'success' : violations.length < 3 ? 'warning' : 'danger'}
                  className="fs-6"
                >
                  {violations.length} / {MAX_WARNINGS}
                </Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="fw-bold">Head Direction:</small>
                <Badge bg={headDirection === 'center' ? 'success' : 'warning'}>
                  {headDirection.toUpperCase()}
                </Badge>
              </div>
              {violations.length > 0 && (
                <div className="mt-2 p-2 rounded" style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '0.7rem', background: 'rgba(198,40,40,0.05)' }}>
                  {violations.slice(-4).map((v, i) => (
                    <div key={i} className="text-danger mb-1">
                      {v.time}: {v.type}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Question Palette */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              <h6 className="fw-bold mb-2" style={{ color: '#1a237e' }}>Question Palette</h6>
              <div className="d-flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const isActive = idx === currentQ;
                  const isAnswered = answers[q._id] !== undefined;
                  const isReviewed = markedForReview[q._id];

                  let variant = 'outline-secondary';
                  let customStyle = { width: '38px', height: '38px', fontSize: '0.8rem' };

                  if (isActive) {
                    variant = 'primary';
                  } else if (isReviewed && isAnswered) {
                    variant = 'light';
                    customStyle = { ...customStyle, background: '#7b1fa2', color: '#fff', border: '2px solid #4a148c' };
                  } else if (isReviewed) {
                    variant = 'light';
                    customStyle = { ...customStyle, background: '#ce93d8', color: '#4a148c', border: '2px solid #7b1fa2' };
                  } else if (isAnswered) {
                    variant = 'success';
                  }

                  return (
                    <Button
                      key={q._id}
                      size="sm"
                      variant={variant}
                      onClick={() => setCurrentQ(idx)}
                      style={customStyle}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </div>
              <div className="mt-2" style={{ fontSize: '0.7rem' }}>
                <Badge bg="success" style={{ width: '10px', height: '10px', display: 'inline-block' }}>&nbsp;</Badge> Answered &nbsp;
                <Badge bg="light" className="border" style={{ width: '10px', height: '10px', display: 'inline-block' }}>&nbsp;</Badge> Unanswered &nbsp;
                <Badge style={{ width: '10px', height: '10px', display: 'inline-block', background: '#ce93d8' }}>&nbsp;</Badge> Review &nbsp;
                <Badge style={{ width: '10px', height: '10px', display: 'inline-block', background: '#7b1fa2' }}>&nbsp;</Badge> Answered+Review
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Submit Modal */}
      <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Submit Exam</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions.</p>
          {answeredCount < questions.length && (
            <Alert variant="warning">
              {questions.length - answeredCount} questions are unanswered.
            </Alert>
          )}
          {reviewedCount > 0 && (
            <Alert variant="info" style={{ borderLeft: '4px solid #7b1fa2' }}>
              {reviewedCount} question{reviewedCount > 1 ? 's are' : ' is'} still marked for review.
            </Alert>
          )}
          <p>Are you sure you want to submit?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleConfirmSubmit}>Yes, Submit</Button>
        </Modal.Footer>
      </Modal>

      {/* Anti-Cheat Auto-Submit Modal */}
      <Modal show={showCheatModal} backdrop="static" keyboard={false} centered>
        <Modal.Header style={{ background: '#c62828', color: '#fff' }}>
          <Modal.Title>Anti-Cheat Violation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>{cheatReason}</strong>
          </Alert>
          <p className="fw-bold">Violations detected:</p>
          <ul style={{ fontSize: '0.85rem' }}>
            {violations.map((v, i) => (
              <li key={i}>{v.time} - {v.message}</li>
            ))}
          </ul>
          <p className="text-danger fw-bold">Your exam will be auto-submitted and reported.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleCheatAutoSubmit}>Submit Exam Now</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ExamPage;
