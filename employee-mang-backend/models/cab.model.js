const mongoose = require('mongoose');

const cabRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  financeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  requestType: {
    type: String,
    enum: ['daily', 'urgent'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  pickupLocation: {
    type: String,
    required: true
  },
  dropLocation: {
    type: String,
    required: true
  },
  pickupTime: {
    type: Date,
    required: true
  },
  returnTime: {
    type: Date
  },
  // For daily service
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'evening']
  },
  // For urgent service
  isAirportTrip: {
    type: Boolean,
    default: false
  },
  flightDetails: {
    flightNumber: String,
    airline: String
  },
  // Cab assignment
  cabDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CabDriver'
  },
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'approved_by_manager',
      'rejected_by_manager',
      'approved_by_finance',
      'rejected_by_finance',
      'approved_by_admin',
      'rejected_by_admin',
      'cab_assigned',
      'completed',
      'cancelled'
    ],
    default: 'submitted'
  },
  history: [{
    at: {
      type: Date,
      default: Date.now
    },
    byUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    byRole: {
      type: String,
      enum: ['admin', 'manager', 'finance', 'employee'],
      required: true
    },
    action: {
      type: String,
      required: true
    },
    fromStatus: String,
    toStatus: {
      type: String,
      required: true
    },
    comment: String
  }],
  // For leave/cancellation requests
  cancellationRequests: [{
    date: Date,
    reason: String,
    requestType: {
      type: String,
      enum: ['no_pickup', 'no_drop', 'both']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('CabRequest', cabRequestSchema);