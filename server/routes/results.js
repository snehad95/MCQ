const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const { auth, isAdminOrTeacher } = require('../middleware/auth');

// @route   POST /api/results/submit
// @desc    Submit exam answers
router.post('/submit', auth, async (req, res) => {
  try {
    const { examId, answers } = req.body;

    // 1. Check if exam exists and is active
    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res.status(400).json({ message: 'Exam is not available' });
    }

    // 2. Validate time window
    const now = new Date();
    const startDateTime = new Date(`${exam.date.toISOString().slice(0, 10)}T${exam.startTime}`);
    
    const endDateTime = new Date(`${exam.date.toISOString().slice(0, 10)}T${exam.endTime}`);
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }
    
    // Add a small 2-minute buffer to endDateTime to account for network latency during auto-submit
    const endDateTimeWithBuffer = new Date(endDateTime.getTime() + 2 * 60000); 

    if (now < startDateTime) {
      return res.status(403).json({ message: 'The exam has not started yet' });
    }
    if (now > endDateTimeWithBuffer) {
      return res.status(403).json({ message: 'The exam submission window has closed' });
    }

    // 3. Prevent duplicate submissions
    const existingResult = await Result.findOne({ student: req.user._id, exam: examId });
    if (existingResult) {
      return res.status(400).json({ message: 'You have already submitted this exam' });
    }

    // Get questions for the exam

    const questions = await Question.find({ exam: examId });
    const totalQuestions = questions.length;

    // Calculate score
    let score = 0;
    let attemptedQuestions = 0;

    const processedAnswers = questions.map(q => {
      const studentAnswer = answers.find(a => a.question === q._id.toString());
      const selectedAnswer = studentAnswer ? studentAnswer.selectedAnswer : -1;
      
      if (selectedAnswer !== -1) {
        attemptedQuestions++;
        if (selectedAnswer === q.correctAnswer) {
          score++;
        }
      }

      return {
        question: q._id,
        selectedAnswer
      };
    });

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const passed = percentage >= exam.passingScore;

    const result = new Result({
      student: req.user._id,
      exam: examId,
      answers: processedAnswers,
      score,
      totalQuestions,
      attemptedQuestions,
      percentage,
      passed
    });

    await result.save();

    res.status(201).json({
      message: 'Exam submitted successfully',
      result: {
        score,
        totalQuestions,
        attemptedQuestions,
        percentage,
        passed
      }
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/results/exam/:examId
// @desc    Get all results for an exam (admin/teacher only)
router.get('/exam/:examId', auth, isAdminOrTeacher, async (req, res) => {
  try {
    const results = await Result.find({ exam: req.params.examId })
      .populate('student', 'name email')
      .populate('exam', 'title passingScore')
      .sort({ percentage: -1 });

    // Dense ranking: same percentage = same rank
    let rank = 0;
    let prevPercentage = null;
    const rankedResults = results.map((r, idx) => {
      const obj = r.toObject();
      if (obj.percentage !== prevPercentage) {
        rank = idx + 1;
        prevPercentage = obj.percentage;
      }
      obj.rank = rank;
      return obj;
    });

    res.json(rankedResults);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/results/my
// @desc    Get current student's results (only for published exams)
router.get('/my', auth, async (req, res) => {
  try {
    const results = await Result.find({ student: req.user._id })
      .populate({
        path: 'exam',
        select: 'title date passingScore resultsPublished'
      })
      .sort({ submittedAt: -1 });

    // Filter: only show results for exams where results are published
    const visibleResults = results.filter(r => r.exam && r.exam.resultsPublished);

    // Also include a "pending" list for exams not yet published
    const pendingResults = results.filter(r => r.exam && !r.exam.resultsPublished);

    // For each published result, find the student's rank
    const publishedWithRank = await Promise.all(visibleResults.map(async (r) => {
      const allResults = await Result.find({ exam: r.exam._id }).sort({ percentage: -1 });
      let rank = 0;
      let prevPercentage = null;
      let studentRank = 1;
      const totalStudents = allResults.length;
      for (let i = 0; i < allResults.length; i++) {
        if (allResults[i].percentage !== prevPercentage) {
          rank = i + 1;
          prevPercentage = allResults[i].percentage;
        }
        if (allResults[i].student.toString() === req.user._id.toString()) {
          studentRank = rank;
          break;
        }
      }
      const obj = r.toObject();
      obj.rank = studentRank;
      obj.totalStudents = totalStudents;
      return obj;
    }));

    res.json({
      published: publishedWithRank,
      pending: pendingResults.map(r => ({
        _id: r._id,
        exam: { _id: r.exam._id, title: r.exam.title, date: r.exam.date },
        message: 'Results pending approval from teacher/admin'
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
