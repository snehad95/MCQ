const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Question = require('../models/Question');
const { auth, isAdminOrTeacher } = require('../middleware/auth');

// CSV Parser Helper
const parseCSV = (text) => {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
};

// Parse Correct Answer Helper
const parseCorrectAnswer = (val, optA, optB, optC, optD) => {
  if (typeof val === 'number') {
    if (val >= 0 && val <= 3) return val;
    if (val >= 1 && val <= 4) return val - 1;
    return -1;
  }

  const clean = String(val || '').trim().toLowerCase();
  
  const textMatches = [optA, optB, optC, optD].map(o => String(o || '').trim().toLowerCase());
  const exactIdx = textMatches.indexOf(clean);
  if (exactIdx !== -1) return exactIdx;

  if (clean === 'a' || clean === 'option a' || clean === 'option1') return 0;
  if (clean === 'b' || clean === 'option b' || clean === 'option2') return 1;
  if (clean === 'c' || clean === 'option c' || clean === 'option3') return 2;
  if (clean === 'd' || clean === 'option d' || clean === 'option4') return 3;

  const num = parseInt(clean);
  if (!isNaN(num)) {
    if (num >= 0 && num <= 3) return num;
    if (num >= 1 && num <= 4) return num - 1;
  }

  return -1;
};

// Multer memory storage config for bulk CSV upload
const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

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

// @route   POST /api/questions/bulk-upload
// @desc    Bulk upload questions from a CSV or Excel file (admin/teacher only)
router.post('/bulk-upload', auth, isAdminOrTeacher, csvUpload.single('file'), async (req, res) => {
  try {
    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ message: 'Exam ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV or Excel file' });
    }

    let parsedLines = [];
    const isExcel = req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls');

    if (isExcel) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      parsedLines = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    } else {
      const csvText = req.file.buffer.toString('utf-8');
      parsedLines = parseCSV(csvText);
    }

    if (parsedLines.length < 2) {
      return res.status(400).json({ message: 'File is empty or missing data rows' });
    }

    // Auto-detect columns
    const headers = parsedLines[0].map(h => String(h || '').trim().toLowerCase());
    
    const textIdx = headers.findIndex(h => h.includes('question') || h === 'text');
    const optAIdx = headers.findIndex(h => h === 'optiona' || h === 'option a' || h === 'option1' || h === 'a');
    const optBIdx = headers.findIndex(h => h === 'optionb' || h === 'option b' || h === 'option2' || h === 'b');
    const optCIdx = headers.findIndex(h => h === 'optionc' || h === 'option c' || h === 'option3' || h === 'c');
    const optDIdx = headers.findIndex(h => h === 'optiond' || h === 'option d' || h === 'option4' || h === 'd');
    const ansIdx = headers.findIndex(h => h.includes('correct') || h === 'answer');

    const missing = [];
    if (textIdx === -1) missing.push('Question Text');
    if (optAIdx === -1) missing.push('Option A');
    if (optBIdx === -1) missing.push('Option B');
    if (optCIdx === -1) missing.push('Option C');
    if (optDIdx === -1) missing.push('Option D');
    if (ansIdx === -1) missing.push('Correct Answer');

    if (missing.length > 0) {
      return res.status(400).json({ 
        message: `Missing required columns in upload: ${missing.join(', ')}. Please use headers like: questionText, optionA, optionB, optionC, optionD, correctAnswer.` 
      });
    }

    const questionsToCreate = [];
    const errors = [];

    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      if (!row || row.length === 0) continue;
      
      // Skip completely empty lines
      if (row.length === 1 && String(row[0] || '').trim() === '') continue;
      
      // Pad row to headers length to avoid undefined access errors
      while (row.length < headers.length) {
        row.push(null);
      }

      const qText = row[textIdx] !== undefined && row[textIdx] !== null ? String(row[textIdx]).trim() : '';
      const optA = row[optAIdx] !== undefined && row[optAIdx] !== null ? String(row[optAIdx]).trim() : '';
      const optB = row[optBIdx] !== undefined && row[optBIdx] !== null ? String(row[optBIdx]).trim() : '';
      const optC = row[optCIdx] !== undefined && row[optCIdx] !== null ? String(row[optCIdx]).trim() : '';
      const optD = row[optDIdx] !== undefined && row[optDIdx] !== null ? String(row[optDIdx]).trim() : '';
      const ansVal = row[ansIdx] !== undefined && row[ansIdx] !== null ? row[ansIdx] : null;

      if (!qText && !optA && !optB && !optC && !optD && ansVal === null) {
        // Skip empty row
        continue;
      }

      if (!qText || !optA || !optB || !optC || !optD || ansVal === null) {
        errors.push(`Row ${i + 1}: Missing required field values.`);
        continue;
      }

      const parsedAns = parseCorrectAnswer(ansVal, optA, optB, optC, optD);
      if (parsedAns === -1) {
        errors.push(`Row ${i + 1}: Could not parse correct answer: "${ansVal}". Should match A, B, C, D or 1, 2, 3, 4.`);
        continue;
      }

      questionsToCreate.push({
        exam: examId,
        questionText: qText,
        options: [optA, optB, optC, optD],
        correctAnswer: parsedAns,
        questionImage: ''
      });
    }

    if (questionsToCreate.length === 0) {
      return res.status(400).json({ 
        message: 'No valid questions could be parsed from the file.',
        errors 
      });
    }

    const createdQuestions = await Question.insertMany(questionsToCreate);

    res.status(201).json({
      message: `Successfully uploaded ${createdQuestions.length} questions.`,
      count: createdQuestions.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload questions error:', error);
    res.status(500).json({ message: error.message || 'Server error during bulk upload' });
  }
});

module.exports = router;
