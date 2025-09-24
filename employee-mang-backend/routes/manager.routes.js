const express = require('express');
const {
  getClaims,
  getOrders,
  approveClaim,
  rejectClaim,
  returnClaim,
  approveOrder,
  rejectOrder,
  getDashboard,
  exportReports,
  getNotifications,
  markNotificationAsRead,
  getReportsAnalytics,getCabRequests,
  approveCabRequest,rejectCabRequest,
  approveCancellationRequest
} = require('../controllers/manager.controller');

const router = express.Router();
// Cab routes
router.get('/cab-requests', getCabRequests);
router.put('/cab-requests/:id/approve', approveCabRequest);
router.put('/cab-requests/:id/reject', rejectCabRequest);
router.put('/cab-requests/:cabRequestId/cancellation/:cancellationId/approve', approveCancellationRequest);
// Claims routes
router.get('/claims', getClaims);
router.put('/claims/:id/approve', approveClaim);
router.put('/claims/:id/reject', rejectClaim);
router.put('/claims/:id/return', returnClaim);
// Add this to your existing manager.routes.js file
router.get('/reports/analytics', getReportsAnalytics);
// Orders routes
router.get('/orders', getOrders);
router.put('/orders/:id/approve', approveOrder);
router.put('/orders/:id/reject', rejectOrder);

// Dashboard
router.get('/dashboard', getDashboard);

// Reports
router.get('/reports/export', exportReports);

// Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationAsRead);

module.exports = router;