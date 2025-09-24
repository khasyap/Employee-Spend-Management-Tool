const mongoose = require('mongoose');

const cabDriverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  alternateContact: String,
  licenseNumber: {
    type: String,
    required: true
  },
  carModel: {
    type: String,
    required: true
  },
  carNumber: {
    type: String,
    required: true,
    unique: true
  },
  carColor: String,
  capacity: {
    type: Number,
    default: 4
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilitySchedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    shift: {
      type: String,
      enum: ['morning', 'afternoon', 'evening']
    },
    available: {
      type: Boolean,
      default: true
    }
  }],
  currentLocation: {
    type: String
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalTrips: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CabDriver', cabDriverSchema);