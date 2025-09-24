const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createClaim,
  getClaims,
  getClaim,
  createOrder,
  getOrders,
  getDashboard,
  extractOcrData ,
  processQrCode,
  createCabRequest,
  getCabRequest,
  getCabRequests,
  createCancellationRequest
} = require('../controllers/employee.controller');
const fs = require('fs');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
     if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});
// OCR extract endpoint
// Cab routes
router.post('/cab-requests', createCabRequest);
router.get('/cab-requests', getCabRequests);
router.get('/cab-requests/:id', (req, res, next) => {
  console.log('Cab request detail route hit:', req.params.id);
  console.log('User ID:', req.user._id);
  next();
}, getCabRequest);
router.post('/cab-requests/cancellation', createCancellationRequest);
// Employee claim routes
router.post('/claims', upload.single('bill'), createClaim);
router.get('/claims', getClaims);
router.get('/claims/:id', getClaim);

// Employee order routes
router.post('/orders', createOrder);
router.get('/orders', getOrders);

// Dashboard route
router.get('/dashboard', getDashboard);
// Add this to your employee.routes.js
router.post('/qr/process', processQrCode);
// OCR endpoint
router.post('/ocr/extract', upload.single('file'), extractOcrData);
// Employee profile route
// Employee profile route
// Employee profile route
router.get('/profile', async (req, res) => {
  try {
    const employeeId = req.user._id;
    const User = require('../models/user.model');
   
    const employee = await User.findById(employeeId)
      .populate('managerId', 'name email')
      .populate('financeId', 'name email');
   
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
   
    res.json({
      success: true,
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        managerId: employee.managerId,
        financeId: employee.financeId,
        manager: employee.managerId,
        finance: employee.financeId
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Categories endpoint
router.get('/categories', async (req, res) => {
  try {
    const Category = require('../models/category.model');

    // Create default categories if none exist
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaultCategories = [
        { name: "Travel", code: "TRV", isActive: true },
        { name: "Food", code: "FOD", isActive: true },
        { name: "Transport", code: "TRN", isActive: true },
        { name: "Stationery", code: "STN", isActive: true },
        { name: "Equipment", code: "EQP", isActive: true }
      ];
      await Category.insertMany(defaultCategories);
    }

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: categories, count: categories.length });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: 'Failed to load categories', message: err.message });
  }
});

module.exports = router;