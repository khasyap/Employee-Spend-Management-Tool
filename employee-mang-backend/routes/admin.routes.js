const express = require('express');
const {
  createUser,
   getDashboard: getAdminDashboard,
  setLimits,
  createCategory,
  getCategories,
  getUsers,
  updateUser,
  getLoginHistory,
  getSecurityDashboard,
   getEscalatedClaims,
  getEscalatedClaim,
  approveClaim,
  rejectClaim,
  returnClaimToManager,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  setDirectFinanceThreshold,
  getSettings,
  getCabRequests,
  approveCabRequest,
  rejectCabRequest
} = require('../controllers/admin.controller');

const router = express.Router();

// Cab routes
router.get('/cab-requests', getCabRequests);
router.put('/cab-requests/:id/approve', approveCabRequest);
router.put('/cab-requests/:id/reject', rejectCabRequest);
// User management routes
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);



// Settings routes
router.put('/limits', setLimits);
router.get('/dashboard', getAdminDashboard);
// Category routes
router.post('/categories', createCategory);
router.get('/categories', getCategories);

// Security routes
router.get('/login-history', getLoginHistory);
router.get('/security-dashboard', getSecurityDashboard);
// Escalated claims routes
router.get('/escalated-claims', getEscalatedClaims);
router.get('/escalated-claims/:id', getEscalatedClaim);
router.put('/escalated-claims/:id/approve', approveClaim);
router.put('/escalated-claims/:id/reject', rejectClaim);
router.put('/escalated-claims/:id/return-to-manager', returnClaimToManager);
// In admin.routes.js - add new route
router.put('/direct-finance-threshold', setDirectFinanceThreshold);
// Notification routes
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationAsRead);
router.patch('/notifications/read-all', markAllNotificationsAsRead);
router.get('/settings', getSettings);
module.exports = router;