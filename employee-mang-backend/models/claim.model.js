const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
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
  fromStatus: {
    type: String
  },
  toStatus: {
    type: String,
    required: true
  },
  comment: {
    type: String
  }
});

const claimSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  financeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  description: {
    type: String,
    required: true
  },
  billUrl: {
    type: String
  },
  status: {
    type: String,
    enum: [
      'submitted',           // Employee submits claim
      'under_review',        // Manager is reviewing
      'approved_by_manager', // Manager approves
      'rejected_by_manager', // Manager rejects
      'escalated_to_admin',  // Manager escalates to admin
      'approved_by_admin',   // Admin approves
      'rejected_by_admin',   // Admin rejects
      'returned_to_manager', // Admin returns to manager
      'sent_to_finance',     // Ready for finance review
      'direct_to_finance',   // NEW: Direct to finance (bypass manager)
      'approved_by_finance', // Finance approves
      'rejected_by_finance', // Finance rejects
      'escalated_to_admin_by_finance', // Finance escalates to admin
      'paid'                 // Finance marks as paid
    ],
    default: 'submitted'
  },
  history: [historySchema],
  sla: {
    dueAt: Date,
    breached: {
      type: Boolean,
      default: false
    }
  },
  submittedOn: {
    type: Date,
    default: Date.now
  },
  paymentDate: Date,
  paymentMethod: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Claim', claimSchema);