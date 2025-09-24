// order.model.js - Updated
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

const orderSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  item: {
    type: String,
    required: true,
    trim: true
  },
  vendor: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: String,
  status: {
    type: String,
    enum: [
      'submitted',           // Employee submits order
      'under_review',        // Manager is reviewing
      'approved_by_manager', // Manager approves
      'rejected_by_manager', // Manager rejects
      'sent_to_finance',     // Sent to finance for approval
      'approved_by_finance', // Finance approves
      'rejected_by_finance', // Finance rejects
      'processing',          // Finance is processing payment
      'fulfilled',           // Order fulfilled
      'cancelled'            // Order is cancelled
    ],
    default: 'submitted'
  },
  history: [historySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);