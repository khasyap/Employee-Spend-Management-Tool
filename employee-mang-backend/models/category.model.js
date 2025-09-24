const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    unique: true,
    maxlength: 3
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
categorySchema.index({ isActive: 1 });
categorySchema.index({ code: 1 });
module.exports = mongoose.model('Category', categorySchema);