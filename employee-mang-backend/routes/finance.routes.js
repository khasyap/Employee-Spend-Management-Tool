// routes/finance.routes.js
const express = require('express');
const {
  getClaims,
  getOrders,
  getClaim,
  approveClaim,
  rejectClaim,
  payClaim,
  escalateClaimToAdmin,
  approveOrder,
  rejectOrder,
  fulfillOrder,
  getDashboard,
  exportReports,
  exportBudgetReport,
  getBudgetAnalysis,
  getReportsAnalytics,
  getBudgetInfo,
  // Add new controllers for payment details
  getEmployeePaymentDetails,
  updateEmployeePaymentDetails,
  getFinancePaymentDetails,
  getCabRequests,
  getAvailableCabDrivers,
  assignCabToRequest,approveCabRequest
} = require('../controllers/finance.controller');

// Notification controllers
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notification.controller');

const router = express.Router();
// Cab routes
router.get('/cab-requests', getCabRequests);
router.get('/cab-drivers/available', getAvailableCabDrivers);
router.put('/cab-requests/:id/assign', assignCabToRequest);
router.put('/cab-requests/:id/approve', approveCabRequest);
// Claims routes
router.get('/claims', getClaims);
router.get('/claims/:id', getClaim);
router.put('/claims/:id/approve', approveClaim);
router.put('/claims/:id/reject', rejectClaim);
router.put('/claims/:id/pay', payClaim);
router.put('/claims/:id/escalate', escalateClaimToAdmin);
// Orders routes
router.get('/orders', getOrders);
router.put('/orders/:id/approve', approveOrder);
router.put('/orders/:id/reject', rejectOrder);
router.put('/orders/:id/fulfill', fulfillOrder);
// In finance.routes.js - add new route
router.get('/budget-info/:categoryId', getBudgetInfo);
// Dashboard
router.get('/dashboard', getDashboard);

// Reports
router.get('/reports/analytics', getReportsAnalytics);
router.get('/reports/export', exportReports);
router.get('/reports/budget-export', exportBudgetReport);

// Budget analysis
router.get('/budget-analysis', getBudgetAnalysis);

// Payment details routes
router.get('/employee/:employeeId/payment-details', getEmployeePaymentDetails);
router.put('/employee/:employeeId/payment-details', updateEmployeePaymentDetails);
router.get('/payment-details', getFinancePaymentDetails); // Updated implementation

// Notification routes
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationAsRead);
router.patch('/notifications/read-all', markAllNotificationsAsRead);

module.exports = router;
