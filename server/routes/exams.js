const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const { auth, isAdminOrTeacher } = require('../middleware/auth');

// @route   POST /api/exams
// @desc    Create a new exam (admin/teacher only)
router.post('/', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const { title, description, date, startTime, endTime, duration, timePerQuestion, passingScore } = req.body;

    const exam = new Exam({
      title,
      description,
      date,
      startTime,
      endTime,
      duration,
      timePerQuestion: timePerQuestion || 60,
      passingScore: passingScore || 40,
      createdBy: req.user._id
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exams
// @desc    Get all exams
router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exams/:id
// @desc    Get single exam
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/exams/:id
// @desc    Update exam (admin/teacher only)
router.put('/:id', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/exams/:id/publish-results
// @desc    Publish/unpublish exam results (admin/teacher only)
router.put('/:id/publish-results', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    exam.resultsPublished = !exam.resultsPublished;
    await exam.save();
    res.json({ message: `Results ${exam.resultsPublished ? 'published' : 'unpublished'}`, exam });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/exams/:id
// @desc    Delete exam (admin/teacher only)
router.delete('/:id', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
