const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Question = require('../models/Question');
const { auth, isAdminOrTeacher } = require('../middleware/auth');

// Multer config for question images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'questions');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
  }
});

// @route   POST /api/questions
// @desc    Add question to an exam (admin/teacher only)
router.post('/', auth, isAdminOrTeacher, upload.single('questionImage'), async (req, res) => {
  try {
    const { exam, questionText, options, correctAnswer } = req.body;

    // Parse options if sent as JSON string (from FormData)
    let parsedOptions = options;
    if (typeof options === 'string') {
      parsedOptions = JSON.parse(options);
    }

    const questionData = {
      exam,
      questionText: questionText || '',
      options: parsedOptions,
      correctAnswer: parseInt(correctAnswer)
    };

    if (req.file) {
      questionData.questionImage = `/uploads/questions/${req.file.filename}`;
    }

    const question = new Question(questionData);
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/questions/exam/:examId
// @desc    Get all questions for an exam
router.get('/exam/:examId', auth, async (req, res) => {
  try {
    const questions = await Question.find({ exam: req.params.examId });

    // If student, don't send correct answers
    if (req.user.role === 'student') {
      const sanitized = questions.map(q => ({
        _id: q._id,
        exam: q.exam,
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: q.options
      }));
      return res.json(sanitized);
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update a question (admin/teacher only)
router.put('/:id', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question (admin/teacher only)
router.delete('/:id', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    // Delete associated image file if exists
    if (question.questionImage) {
      const imagePath = path.join(__dirname, '..', question.questionImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
