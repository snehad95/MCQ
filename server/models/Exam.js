const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required']
  },
  duration: {
    type: Number,
    required: true,
    default: 30 // total duration in minutes
  },
  timePerQuestion: {
    type: Number,
    default: 60 // seconds per question
  },
  passingScore: {
    type: Number,
    default: 40 // percentage
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resultsPublished: {
    type: Boolean,
    default: false // results visible to students only when approved
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
