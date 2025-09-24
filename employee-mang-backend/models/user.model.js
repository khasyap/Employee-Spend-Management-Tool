const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'finance', 'employee'],
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  financeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // NEW: Payment details fields
  paymentDetails: {
    upiId: {
      type: String,
      trim: true
    },
    bankAccount: {
      accountNumber: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      },
      ifscCode: {
        type: String,
        trim: true
      },
      accountHolderName: {
        type: String,
        trim: true
      }
    }
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

userSchema.virtual('password').set(function(password) {
  this.passwordHash = bcrypt.hashSync(password, 10);
});

userSchema.methods.checkPassword = function(password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);