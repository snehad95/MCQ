const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  questionText: {
    type: String,
    default: ''
  },
  questionImage: {
    type: String,
    default: ''
  },
  options: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length === 4;
      },
      message: 'A question must have exactly 4 options'
    },
    required: true
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
