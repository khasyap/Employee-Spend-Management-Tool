const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  success: {
    type: Boolean,
    default: true
  },
  failureReason: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('LoginHistory', loginHistorySchema);