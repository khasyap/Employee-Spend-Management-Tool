const mongoose = require('mongoose');

const employeeLimitSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
});

const monthlyLimitSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  employeeLimits: [employeeLimitSchema]
});

const settingsSchema = new mongoose.Schema({
  perClaimLimitByRole: {
    employee: {
      type: Number,
      required: true,
      min: 0,
      default: 1000
    },
    manager: {
      type: Number,
      required: true,
      min: 0,
      default: 5000
    },
    finance: {
      type: Number,
      required: true,
      min: 0,
      default: 10000
    },
    admin: {
      type: Number,
      required: true,
      min: 0,
      default: 50000
    }
  },
  directFinanceThreshold: {
    type: Number,
    default: 1000, // Default $1000 threshold
    min: 0
  },
  monthlyLimitByCategory: [monthlyLimitSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add a static method to get or create settings
settingsSchema.statics.getSettings = function() {
  return this.findOne().then(settings => {
    if (!settings) {
      // Create default settings if none exist
      return this.create({
        perClaimLimitByRole: {
          employee: 1000,
          manager: 5000,
          finance: 10000,
          admin: 50000
        },
        directFinanceThreshold: 1000
      });
    }
    return settings;
  });
};

module.exports = mongoose.model('Settings', settingsSchema);
