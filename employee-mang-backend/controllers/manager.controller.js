const Claim = require('../models/claim.model');
const Order = require('../models/order.model');
const Notification = require('../models/notification.model');
const Settings = require('../models/settings.model');
const User = require('../models/user.model');
const { generateClaimsReport } = require('../utils/excel');
const { broadcastMessage, sendToUser } = require('../services/ws.service');
 const notificationService = require('../services/notification')
const mongoose = require('mongoose');

// Get claims for manager

// Get claims for manager
const getClaims = async (req, res) => {
  try {
    const { status } = req.query;
    const managerId = req.user._id;

    let query = { managerId };
    if (status) {
      query.status = status;
    }

    const claims = await Claim.find(query)
      .populate('employeeId', 'name email')
      .populate('category', 'name code')
      .populate('financeId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: claims
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get orders for manager
const getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const managerId = req.user._id;

    let query = { managerId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('employeeId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;

    console.log('Manager approving claim:', id);
    console.log('Manager ID:', managerId);

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email managerId financeId')
      .populate('category', 'name');

    if (!claim) {
      console.log('Claim not found:', id);
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    console.log('Current claim status:', claim.status);
    console.log('Claim amount:', claim.amount);
    console.log('Manager ID from claim:', claim.managerId.toString());
    console.log('Requesting manager ID:', managerId.toString());

    if (claim.managerId.toString() !== managerId.toString()) {
      console.log('Unauthorized access attempt');
      return res.status(403).json({ success: false, error: 'Not authorized to approve this claim' });
    }

    // Check if claim is within limit
    const Settings = require('../models/settings.model');
    const settings = await Settings.findOne();
    
    let newStatus;
    let actionText;
    
    console.log('Settings found:', !!settings);
    if (settings) {
      console.log('Manager limit:', settings.perClaimLimitByRole?.manager);
      console.log('Admin limit:', settings.perClaimLimitByRole?.admin);
    }
    
    if (!settings || !settings.perClaimLimitByRole) {
      // Default limit if settings not found
      newStatus = 'sent_to_finance';
      actionText = 'approved by manager and sent to finance';
      console.log('Using default limits');
    } else {
      const managerLimit = settings.perClaimLimitByRole.manager || 5000;
      const adminLimit = settings.perClaimLimitByRole.admin || 50000;
      
      console.log('Manager limit:', managerLimit);
      console.log('Admin limit:', adminLimit);
      console.log('Claim amount:', claim.amount);
      
      if (claim.amount <= managerLimit) {
        newStatus = 'sent_to_finance';
        actionText = 'approved by manager and sent to finance';
        console.log('Sending to finance');
      } else if (claim.amount <= adminLimit) {
        newStatus = 'escalated_to_admin'; // FIXED: This should be escalated_to_admin
        actionText = 'escalated to admin for approval';
        console.log('Escalating to admin');
      } else {
        console.log('Amount exceeds admin limit');
        return res.status(400).json({ 
          success: false, 
          error: `Claim amount exceeds maximum allowed limit of ${adminLimit}` 
        });
      }
    }

    const fromStatus = claim.status;
    claim.status = newStatus;

    console.log('Changing status from:', fromStatus, 'to:', newStatus);

    // Add history
    claim.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: newStatus === 'escalated_to_admin' ? 'escalated' : 'approved',
      fromStatus,
      toStatus: newStatus,
      comment: comment || `Claim ${actionText}`
    });

    await claim.save();
    console.log('Claim saved successfully with new status:', claim.status);

    // Create notification for employee
     await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Status Updated',
      message: `Your claim for ${claim.amount} has been ${actionText}`,
      type: newStatus === 'escalated_to_admin' ? 'warning' : 'success'
    });
    
    console.log('Notification created for employee');

    // Create notification for admin if escalated
    if (newStatus === 'escalated_to_admin') {
      const User = require('../models/user.model');
      const adminUsers = await User.find({ role: 'admin' });
      console.log('Found admin users:', adminUsers.length);
      
      for (const admin of adminUsers) {
        await notificationService.createNotification({
          userId: admin._id,
          title: 'Claim Escalated to Admin',
          message: `Claim from ${claim.employeeId.name} for ${claim.amount} has been escalated for approval`,
          type: 'warning'
        });
        
        console.log('Notification created for admin:', admin._id);
        
        // Send real-time notification to admin
        sendToUser(admin._id.toString(), {
          event: 'notification.new',
          data: adminNotification,
          timestamp: new Date()
        });
        console.log('Real-time notification sent to admin');
      }
    } else if (newStatus === 'sent_to_finance' && claim.financeId) {
      // Create notification for finance if sent to finance
      await notificationService.createNotification({
        userId: claim.financeId,
        title: 'New Claim for Review',
        message: `Claim from ${claim.employeeId.name} for ${claim.amount} requires finance approval`,
        type: 'info'
      });
      
      console.log('Notification created for finance');
      
      // Send real-time notification to finance
      sendToUser(claim.financeId.toString(), {
        event: 'notification.new',
        data: financeNotification,
        timestamp: new Date()
      });
      console.log('Real-time notification sent to finance');
    }

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Approve claim error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
};

const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    if (claim.managerId.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to reject this claim' });
    }

    const fromStatus = claim.status;
    claim.status = 'rejected_by_manager';

    // Add history
    claim.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected_by_manager',
      comment
    });

    await claim.save();

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Rejected',
      message: `Your claim for ${claim.amount} has been rejected by manager: ${comment}`,
      type: 'danger'
    });
    

    // Broadcast realtime update
    broadcastMessage({
      event: 'claim.updated',
      data: claim,
      timestamp: new Date()
    });

    // Send specific notification to employee
    sendToUser(claim.employeeId._id.toString(), {
      event: 'notification.new',
      data: notification,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Reject claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Return claim for revision
const returnClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for returning claim' });
    }

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    if (claim.managerId.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to return this claim' });
    }

    const fromStatus = claim.status;
    claim.status = 'submitted';

    // Add history
    claim.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'returned',
      fromStatus,
      toStatus: 'submitted',
      comment
    });

    await claim.save();

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Returned for Revision',
      message: `Your claim for ${claim.amount} has been returned for revision: ${comment}`,
      type: 'warning'
    });
    

    // Broadcast realtime update
    broadcastMessage({
      event: 'claim.updated',
      data: claim,
      timestamp: new Date()
    });

    // Send specific notification to employee
    sendToUser(claim.employeeId._id.toString(), {
      event: 'notification.new',
      data: notification,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Return claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add this to your existing manager.controller.js file


// Get reports analytics - FIXED VERSION for manager
const getReportsAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const managerId = req.user._id;

    console.log('Manager analytics request:', { managerId, startDate, endDate });

    // Build date filter
    const claimsDateFilter = {};
    const ordersDateFilter = {};
    
    if (startDate && endDate) {
      claimsDateFilter.submittedOn = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z'), // Include entire end date
      };
      ordersDateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    // Fetch claims & orders - FIXED: Properly filter by managerId
    const claims = await Claim.find({ 
      managerId: managerId,
      ...claimsDateFilter 
    })
    .populate('employeeId', 'name')
    .populate('category', 'name');

    const orders = await Order.find({ 
      managerId: managerId,
      ...ordersDateFilter 
    })
    .populate('employeeId', 'name');

    console.log('Manager claims found:', claims.length);
    console.log('Manager orders found:', orders.length);

    // Claims by status
    const claimsByStatus = {};
    claims.forEach((claim) => {
      const statusKey = claim.status || 'unknown';
      claimsByStatus[statusKey] = (claimsByStatus[statusKey] || 0) + 1;
    });

    // Orders by status
    const ordersByStatus = {};
    orders.forEach((order) => {
      const statusKey = order.status || 'unknown';
      ordersByStatus[statusKey] = (ordersByStatus[statusKey] || 0) + 1;
    });

    // Spending by category
    const spendingByCategory = {};
    claims.forEach((claim) => {
      const categoryName = claim.category?.name || 'Unknown';
      spendingByCategory[categoryName] =
        (spendingByCategory[categoryName] || 0) + (claim.amount || 0);
    });

    // Monthly spending data - FIXED: Use proper aggregation
    const monthlySpending = await Claim.aggregate([
      {
        $match: {
          managerId: mongoose.Types.ObjectId(managerId),
          ...(startDate && endDate ? {
            submittedOn: {
              $gte: new Date(startDate),
              $lte: new Date(endDate + 'T23:59:59.999Z')
            }
          } : {})
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedOn' },
            month: { $month: '$submittedOn' }
          },
          claimsTotal: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get monthly orders data
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          managerId: mongoose.Types.ObjectId(managerId),
          ...(startDate && endDate ? {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate + 'T23:59:59.999Z')
            }
          } : {})
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          ordersTotal: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format monthly spending data - combine claims and orders
    const monthlySpendingMap = new Map();
    
    // Add claims data
    monthlySpending.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      monthlySpendingMap.set(monthKey, {
        month: monthKey,
        claimsTotal: item.claimsTotal,
        ordersTotal: 0
      });
    });
    
    // Add orders data
    monthlyOrders.forEach(item => {
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      if (monthlySpendingMap.has(monthKey)) {
        monthlySpendingMap.get(monthKey).ordersTotal = item.ordersTotal;
      } else {
        monthlySpendingMap.set(monthKey, {
          month: monthKey,
          claimsTotal: 0,
          ordersTotal: item.ordersTotal
        });
      }
    });

    // Convert to array and sort
    const monthlySpendingArray = Array.from(monthlySpendingMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        claims: {
          byStatus: claimsByStatus,
          total: claims.length,
          totalAmount: claims.reduce((sum, claim) => sum + (claim.amount || 0), 0),
        },
        orders: {
          byStatus: ordersByStatus,
          total: orders.length,
          totalAmount: orders.reduce((sum, order) => sum + (order.amount || 0), 0),
        },
        spendingByCategory: Object.entries(spendingByCategory).map(
          ([category, total]) => ({ category, total })
        ),
        monthlySpending: monthlySpendingArray
      },
    });
  } catch (error) {
    console.error('Get manager reports analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to fetch manager analytics data' 
    });
  }
};




const approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;

    const order = await Order.findById(id)
      .populate('employeeId', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'submitted' && order.status !== 'under_review') {
      return res.status(400).json({ success: false, error: 'Order is not in a state that can be approved by manager' });
    }

    const fromStatus = order.status;
    order.status = 'approved_by_manager';
    order.managerId = managerId;

    // Add history
    order.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'approved',
      fromStatus,
      toStatus: 'approved_by_manager',
      comment: comment || 'Order approved by manager'
    });

    await order.save();

    // Create notification for employee
    const notification = new Notification({
      userId: order.employeeId._id,
      title: 'Order Approved by Manager',
      message: `Your order for ${order.item} has been approved by manager and sent to finance`,
      type: 'success'
    });
    await notification.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }

    const order = await Order.findById(id)
      .populate('employeeId', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'submitted' && order.status !== 'under_review') {
      return res.status(400).json({ success: false, error: 'Order is not in a state that can be rejected by manager' });
    }

    const fromStatus = order.status;
    order.status = 'rejected_by_manager';
    order.managerId = managerId;

    // Add history
    order.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected_by_manager',
      comment
    });

    await order.save();

    // Create notification for employee
    const notification = new Notification({
      userId: order.employeeId._id,
      title: 'Order Rejected by Manager',
      message: `Your order for ${order.item} has been rejected by manager: ${comment}`,
      type: 'danger'
    });
    await notification.save();

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get manager dashboard with analysis
const getDashboard = async (req, res) => {
  try {
    const managerId = req.user._id;

    // Get team members count
    const User = require('../models/user.model');
    const teamMembers = await User.countDocuments({ managerId, role: 'employee' });

    // Get claims statistics
    const claims = await Claim.find({ managerId })
      .populate('employeeId', 'name')
      .populate('category', 'name');

    // Get orders statistics
    const orders = await Order.find({ managerId })
      .populate('employeeId', 'name');

    const pendingClaims = claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
    const approvedClaims = claims.filter(c => c.status.includes('approved')).length;
    const rejectedClaims = claims.filter(c => c.status.includes('rejected')).length;
    
    // Calculate amounts by status
    const pendingAmount = claims
      .filter(c => c.status === 'submitted' || c.status === 'under_review')
      .reduce((sum, claim) => sum + claim.amount, 0);
    
    const approvedAmount = claims
      .filter(c => c.status.includes('approved'))
      .reduce((sum, claim) => sum + claim.amount, 0);
    
    const rejectedAmount = claims
      .filter(c => c.status.includes('rejected'))
      .reduce((sum, claim) => sum + claim.amount, 0);
    
    const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);

    const pendingOrders = orders.filter(o => o.status === 'submitted').length;
    const approvedOrders = orders.filter(o => o.status === 'approved').length;
    const rejectedOrders = orders.filter(o => o.status === 'rejected').length;

    // Status analysis
    const statusAnalysis = {
      pending: claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length,
      approved: claims.filter(c => c.status.includes('approved') && !c.status.includes('finance')).length,
      rejected: claims.filter(c => c.status.includes('rejected')).length,
      escalated: claims.filter(c => c.status === 'escalated_to_admin').length,
      sent_to_finance: claims.filter(c => c.status === 'sent_to_finance').length
    };

    // Team performance analysis
    const teamPerformance = await Claim.aggregate([
      { $match: { managerId: new mongoose.Types.ObjectId(managerId) } },
      {
        $group: {
          _id: '$employeeId',
          totalClaims: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          approvedClaims: { 
            $sum: { 
              $cond: [{ $regexMatch: { input: '$status', regex: 'approved' } }, 1, 0] 
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      }
    ]);

    const recentClaims = await Claim.find({ managerId })
      .populate('employeeId', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentOrders = await Order.find({ managerId })
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        totalAmount,
        pendingAmount,
        approvedAmount,
        rejectedAmount,
        teamMembers,
        statusAnalysis,
        teamPerformance: teamPerformance.map(p => ({
          employeeName: p.employee[0]?.name || 'Unknown',
          totalClaims: p.totalClaims,
          totalAmount: p.totalAmount,
          approvedClaims: p.approvedClaims
        })),
        recentClaims,
        recentOrders,
        averageClaim: claims.length > 0 ? totalAmount / claims.length : 0,
        pendingOrders,
        approvedOrders,
        rejectedOrders
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export reports
const exportReports = async (req, res) => {
  try {
    const { from, to, status, employee, category } = req.query;
    const managerId = req.user._id;

    let query = { managerId };

    // Add filters
    if (status) query.status = status;
    if (employee) query.employeeId = employee;
    if (category) query.category = category;

    if (from && to) {
      query.submittedOn = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const claims = await Claim.find(query)
      .populate('employeeId', 'name email')
      .populate('category', 'name')
      .sort({ submittedOn: -1 });

    await generateClaimsReport(claims, res);
  } catch (error) {
    console.error('Export reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get notifications
const getNotifications = async (req, res) => {
  try {
    const { unread } = req.query;
    const userId = req.user._id;

    let query = { userId };
    if (unread === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const CabRequest = require('../models/cab.model');

// Get cab requests for manager
const getCabRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const managerId = req.user._id;
    
    let query = { managerId };
    if (status) query.status = status;
    
    const cabRequests = await CabRequest.find(query)
      .populate('employeeId', 'name email')
      .populate('financeId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: cabRequests });
  } catch (error) {
    console.error('Get cab requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve cab request
const approveCabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;
    
    const cabRequest = await CabRequest.findById(id)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.managerId.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to approve this request' });
    }
    
    if (cabRequest.status !== 'submitted' && cabRequest.status !== 'under_review') {
      return res.status(400).json({ 
        success: false, 
        error: 'Request is not in a state that can be approved by manager' 
      });
    }
    
    const fromStatus = cabRequest.status;
    
    // For urgent requests, send directly to finance
    if (cabRequest.requestType === 'urgent') {
      cabRequest.status = 'approved_by_manager';
    } else {
      // For daily requests, send to finance for further processing
      cabRequest.status = 'approved_by_manager';
    }
    
    cabRequest.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'approved',
      fromStatus,
      toStatus: cabRequest.status,
      comment: comment || 'Cab request approved by manager'
    });
    
    await cabRequest.save();
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cab Request Approved by Manager',
      message: `Your cab request has been approved by manager${comment ? ': ' + comment : ''}`,
      type: 'success'
    });
    
    sendToUser(cabRequest.employeeId._id.toString(), {
      event: 'cabRequest.updated',
      data: cabRequest,
      timestamp: new Date()
    });
    
    // Notify finance for urgent requests
    if (cabRequest.requestType === 'urgent' && cabRequest.financeId) {
      await notificationService.createNotification({
        userId: cabRequest.financeId,
        title: 'Urgent Cab Request Needs Assignment',
        message: `Urgent cab request from ${cabRequest.employeeId.name} requires cab assignment`,
        type: 'info'
      });
      
      sendToUser(cabRequest.financeId.toString(), {
        event: 'notification.new',
        data: {
          title: 'Urgent Cab Request',
          message: 'Urgent cab request requires assignment',
          type: 'info'
        },
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, data: cabRequest });
  } catch (error) {
    console.error('Approve cab request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Reject cab request
const rejectCabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;
    
    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }
    
    const cabRequest = await CabRequest.findById(id)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.managerId.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to reject this request' });
    }
    
    if (cabRequest.status !== 'submitted' && cabRequest.status !== 'under_review') {
      return res.status(400).json({ 
        success: false, 
        error: 'Request is not in a state that can be rejected by manager' 
      });
    }
    
    const fromStatus = cabRequest.status;
    cabRequest.status = 'rejected_by_manager';
    
    cabRequest.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected_by_manager',
      comment
    });
    
    await cabRequest.save();
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cab Request Rejected by Manager',
      message: `Your cab request has been rejected by manager: ${comment}`,
      type: 'danger'
    });
    
    sendToUser(cabRequest.employeeId._id.toString(), {
      event: 'cabRequest.updated',
      data: cabRequest,
      timestamp: new Date()
    });
    
    res.json({ success: true, data: cabRequest });
  } catch (error) {
    console.error('Reject cab request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve cancellation request
const approveCancellationRequest = async (req, res) => {
  try {
    const { cabRequestId, cancellationId } = req.params;
    const { comment } = req.body;
    const managerId = req.user._id;
    
    const cabRequest = await CabRequest.findById(cabRequestId)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.managerId.toString() !== managerId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to approve this cancellation' });
    }
    
    const cancellation = cabRequest.cancellationRequests.id(cancellationId);
    if (!cancellation) {
      return res.status(404).json({ success: false, error: 'Cancellation request not found' });
    }
    
    cancellation.status = 'approved';
    cancellation.approvedBy = managerId;
    
    cabRequest.history.push({
      byUser: managerId,
      byRole: 'manager',
      action: 'approved_cancellation',
      fromStatus: cabRequest.status,
      toStatus: cabRequest.status,
      comment: comment || `Approved cancellation for ${cancellation.date.toDateString()}`
    });
    
    await cabRequest.save();
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cancellation Request Approved',
      message: `Your cancellation request for ${cancellation.date.toDateString()} has been approved`,
      type: 'success'
    });
    
    sendToUser(cabRequest.employeeId._id.toString(), {
      event: 'cabRequest.updated',
      data: cabRequest,
      timestamp: new Date()
    });
    
    res.json({ success: true, data: cabRequest });
  } catch (error) {
    console.error('Approve cancellation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
module.exports = {
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
  approveCabRequest,
  approveCancellationRequest,
  rejectCabRequest,
  getCabRequests,

  // ... your existing exports
  getReportsAnalytics,
  // ... your existing exports
};