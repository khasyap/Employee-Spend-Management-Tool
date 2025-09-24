const Claim = require('../models/claim.model');
const Order = require('../models/order.model');
const Notification = require('../models/notification.model');
const Settings = require('../models/settings.model');
const User = require('../models/user.model');
 const notificationService = require('../services/notification')
const { generateClaimsReport, generateBudgetReport } = require('../utils/excel');
const { broadcastMessage, sendToUser } = require('../services/ws.service');
const mongoose = require('mongoose');
const { getEscalatedClaim } = require('./admin.controller');

// In finance.controller.js - update getClaims function
const getClaims = async (req, res) => {
  try {
    const financeId = req.user._id;

    const claims = await Claim.find({
      $or: [
        { financeId }, // Claims assigned to this finance user
        { status: { $in: ['sent_to_finance', 'direct_to_finance', 'escalated_to_admin_by_finance'] } } // All claims ready for finance review
      ]
    })
    .populate('employeeId', 'name email department')
    .populate('category', 'name code')
    .populate('managerId', 'name email')
    .populate('adminId', 'name email')
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

const getOrders = async (req, res) => {
  try {
    const financeId = req.user._id;

    const orders = await Order.find({
      $or: [
        { financeId }, // Orders assigned to this finance user
        { status: { $in: ['approved_by_manager', 'sent_to_finance'] } } // All orders ready for finance review
      ]
    })
    .populate('employeeId', 'name email')
    .populate('managerId', 'name email')
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

// Get finance dashboard with proper data
const getDashboard = async (req, res) => {
  try {
    const financeId = req.user._id;

    // Get all claims assigned to this finance user
    const claims = await Claim.find({ 
      $or: [
        { financeId },
        { status: 'escalated_to_admin_by_finance' } // Include admin-escalated claims
      ]
    })
    .populate('employeeId', 'name')
    .populate('category', 'name');

    // Get all orders assigned to this finance user
    const orders = await Order.find({ financeId })
      .populate('employeeId', 'name');

    // Finance-specific status counts
    const pendingClaims = claims.filter(c => c.status === 'sent_to_finance').length;
    const approvedClaims = claims.filter(c => c.status === 'approved_by_finance').length;
    const rejectedClaims = claims.filter(c => c.status === 'rejected_by_finance').length;
    const paidClaims = claims.filter(c => c.status === 'paid').length;
    const escalatedClaims = claims.filter(c => c.status === 'escalated_to_admin_by_finance').length;
   const directToFinanceClaims = claims.filter(c => c.status === 'direct_to_finance').length;


// And these amount calculations:
const directToFinanceAmount = claims.filter(c => c.status === 'direct_to_finance').reduce((sum, claim) => sum + claim.amount, 0);
const escalatedAmount = claims.filter(c => c.status === 'escalated_to_admin_by_finance').reduce((sum, claim) => sum + claim.amount, 0);

    // Amount calculations
    const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
    const paidAmount = claims.filter(c => c.status === 'paid').reduce((sum, claim) => sum + claim.amount, 0);
    const pendingAmount = claims.filter(c => c.status === 'sent_to_finance').reduce((sum, claim) => sum + claim.amount, 0);
   

    // Orders calculations
    const pendingOrders = orders.filter(o => o.status === 'approved').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const fulfilledOrders = orders.filter(o => o.status === 'fulfilled').length;
    const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
    const totalOrderAmount = orders.reduce((sum, order) => sum + order.amount, 0);

    // Get budget status
    const settings = await Settings.findOne().populate('monthlyLimitByCategory.categoryId');
    const budgetStatus = settings?.monthlyLimitByCategory || [];

    // Recent items (last 5)
    const recentClaims = await Claim.find({ 
      $or: [
        { financeId },
        { status: 'escalated_to_admin_by_finance' }
      ]
    })
    .populate('employeeId', 'name')
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

    const recentOrders = await Order.find({ financeId })
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        paidClaims,
        escalatedClaims,
        totalAmount,
        paidAmount,
        pendingAmount,
        escalatedAmount,
        budgetStatus,
        recentClaims,
        recentOrders,
         directToFinanceClaims, 
          escalatedClaims,
        averageClaim: claims.length > 0 ? totalAmount / claims.length : 0,
        pendingOrders,
         directToFinanceAmount, // Add this
            directToFinanceClaims,
    escalatedAmount,
        processingOrders,
        fulfilledOrders,
        rejectedOrders,
        totalOrderAmount
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get reports analytics - FIXED VERSION
const getReportsAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const financeId = req.user._id;

    console.log('Finance analytics request:', { financeId, startDate, endDate });

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

    // Fetch claims & orders - FIXED: Properly filter by financeId
    const claims = await Claim.find({ 
      $or: [
        { financeId: financeId },
        { status: { $in: ['sent_to_finance', 'escalated_to_admin'] } }
      ],
      ...claimsDateFilter 
    })
    .populate('employeeId', 'name')
    .populate('category', 'name');

    const orders = await Order.find({ 
      $or: [
        { financeId: financeId },
        { status: { $in: ['approved_by_manager', 'sent_to_finance'] } }
      ],
      ...ordersDateFilter 
    })
    .populate('employeeId', 'name');

    console.log('Claims found:', claims.length);
    console.log('Orders found:', orders.length);

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

    // Monthly spending data - FIXED: Add proper monthly aggregation
    const monthlySpending = await Claim.aggregate([
      {
        $match: {
          $or: [
            { financeId: mongoose.Types.ObjectId(financeId) },
            { status: { $in: ['sent_to_finance', 'escalated_to_admin'] } }
          ],
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

    // Format monthly spending data
    const monthlySpendingFormatted = monthlySpending.map(item => ({
      month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      claimsTotal: item.claimsTotal,
      ordersTotal: 0 // You can add orders aggregation similarly
    }));

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
        monthlySpending: monthlySpendingFormatted
      },
    });
  } catch (error) {
    console.error('Get reports analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to fetch analytics data' 
    });
  }
};

// Export reports
const exportReports = async (req, res) => {
  try {
    const { from, to } = req.query;
    const financeId = req.user._id;

    let query = { financeId };

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

// Export budget report
const exportBudgetReport = async (req, res) => {
  try {
    const financeId = req.user._id;

    // Get budget analysis data
    const budgetData = await getBudgetAnalysisData(financeId);
    
    await generateBudgetReport(budgetData, res);
  } catch (error) {
    console.error('Export budget report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper function to get budget analysis data
const getBudgetAnalysisData = async (financeId) => {
  // Get settings with populated categories
  const settings = await Settings.findOne().populate('monthlyLimitByCategory.categoryId');
  
  if (!settings || !settings.monthlyLimitByCategory) {
    return [];
  }

  // Calculate used amounts for each category
  const categoryUsage = await Claim.aggregate([
    {
      $match: {
        financeId: mongoose.Types.ObjectId(financeId),
        status: { $in: ['approved_by_finance', 'paid'] }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Merge limit data with usage data
  return settings.monthlyLimitByCategory.map(limit => {
    const usage = categoryUsage.find(u => 
      u._id && limit.categoryId && 
      u._id.toString() === limit.categoryId._id.toString()
    );
    
    return {
      category: limit.categoryId.name,
      limit: limit.amount,
      used: usage ? usage.totalAmount : 0,
      remaining: limit.amount - (usage ? usage.totalAmount : 0),
      utilization: limit.amount > 0 ? Math.round((usage ? usage.totalAmount : 0) / limit.amount * 100) : 0
    };
  });
};

// In finance.controller.js - update approveClaim function with budget validation
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const financeId = req.user._id;

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email managerId financeId')
      .populate('category', 'name');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Check if claim is assigned to this finance user or is in finance review status
    if ((claim.financeId && claim.financeId.toString() !== financeId.toString()) &&
        (claim.status !== 'sent_to_finance' && claim.status !== 'direct_to_finance' && claim.status !== 'escalated_to_admin_by_finance')) {
      return res.status(403).json({ success: false, error: 'Not authorized to approve this claim' });
    }

    // Check if claim is in a state that finance can approve
    if (claim.status !== 'sent_to_finance' && 
        claim.status !== 'direct_to_finance' && 
        claim.status !== 'escalated_to_admin_by_finance') {
      return res.status(400).json({ success: false, error: 'Claim is not in a state that can be approved by finance' });
    }

    // BUDGET VALIDATION - Check if category has enough budget
    const settings = await Settings.findOne().populate('monthlyLimitByCategory.categoryId');
    const categoryLimit = settings.monthlyLimitByCategory.find(
      limit => limit.categoryId && limit.categoryId._id.toString() === claim.category._id.toString()
    );

    if (categoryLimit) {
      // Calculate current month's usage for this category
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const monthlyUsage = await Claim.aggregate([
        {
          $match: {
            category: claim.category._id,
            status: { $in: ['approved_by_finance', 'paid'] },
            submittedOn: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const currentUsage = monthlyUsage.length > 0 ? monthlyUsage[0].totalAmount : 0;
      const remainingBudget = categoryLimit.amount - currentUsage;
      
      // Check if claim amount exceeds remaining budget
      if (claim.amount > remainingBudget) {
        // Escalate to admin due to budget constraints
        const fromStatus = claim.status;
        claim.status = 'escalated_to_admin_by_finance';

        // Add history
        claim.history.push({
          byUser: financeId,
          byRole: 'finance',
          action: 'escalated',
          fromStatus,
          toStatus: 'escalated_to_admin_by_finance',
          comment: `Claim amount (${claim.amount}) exceeds remaining budget (${remainingBudget}) for this category. Requires admin approval.`
        });

        await claim.save();

        // Create notification for admin
        const adminUsers = await User.find({ role: 'admin' });
        for (const admin of adminUsers) {
          await notificationService.createNotification({
            userId: admin._id,
            title: 'Claim Escalated - Budget Exceeded',
            message: `Claim from ${claim.employeeId.name} for ${claim.amount} exceeds the remaining budget of ${remainingBudget} for category ${claim.category.name}`,
            type: 'warning'
          });
          
          // Send real-time notification to admin
          sendToUser(admin._id.toString(), {
            event: 'notification.new',
            data: {
              title: 'Budget Exceeded',
              message: `Claim requires approval due to budget constraints`
            },
            timestamp: new Date()
          });
        }

        return res.json({
          success: true,
          data: claim,
          message: 'Claim escalated to admin due to budget constraints'
        });
      }
    }

    // If budget is sufficient, proceed with approval
    const fromStatus = claim.status;
    claim.status = 'approved_by_finance';
    claim.financeId = financeId;

    // Add history
    claim.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'approved',
      fromStatus,
      toStatus: 'approved_by_finance',
      comment: comment || 'Claim approved by finance'
    });

    await claim.save();

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Approved by Finance',
      message: `Your claim for ${claim.amount} has been approved by finance department`,
      type: 'success'
    });

    // Send real-time update to employee
    sendToUser(claim.employeeId._id.toString(), {
      event: 'claim.updated',
      data: claim,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const getBudgetInfo = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const financeId = req.user._id;

    const settings = await Settings.findOne().populate('monthlyLimitByCategory.categoryId');
    const categoryLimit = settings.monthlyLimitByCategory.find(
      limit => limit.categoryId && limit.categoryId._id.toString() === categoryId
    );

    if (!categoryLimit) {
      return res.status(404).json({ success: false, error: 'Category limit not found' });
    }

    // Calculate current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyUsage = await Claim.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          status: { $in: ['approved_by_finance', 'paid'] },
          submittedOn: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const currentUsage = monthlyUsage.length > 0 ? monthlyUsage[0].totalAmount : 0;
    const remainingBudget = categoryLimit.amount - currentUsage;

    res.json({
      success: true,
      data: {
        category: categoryLimit.categoryId.name,
        monthlyLimit: categoryLimit.amount,
        currentUsage: currentUsage,
        remainingBudget: remainingBudget,
        utilizationPercentage: categoryLimit.amount > 0 ? Math.round((currentUsage / categoryLimit.amount) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get budget info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// finance.controller.js - Fixed getBudgetAnalysis function
const getBudgetAnalysis = async (req, res) => {
  try {
     const financeId = req.user._id;
    const { from, to, startDate, endDate } = req.query;

    // Get settings with populated categories
    const settings = await Settings.findOne().populate('monthlyLimitByCategory.categoryId');
   
    if (!settings || !settings.monthlyLimitByCategory) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Build date filter
     const dateFilter = {};
    const actualStartDate = from || startDate;
    const actualEndDate = to || endDate;
    
    if (actualStartDate && actualEndDate) {
      dateFilter.submittedOn = {
        $gte: new Date(actualStartDate),
        $lte: new Date(actualEndDate)
      };
    }
    // Calculate used amounts for each category - FIXED ObjectId usage
    const categoryUsage = await Claim.aggregate([
      {
        $match: {
          financeId: new mongoose.Types.ObjectId(financeId),
          status: { $in: ['approved_by_finance', 'paid'] },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate employee usage for each category
    const employeeUsage = await Claim.aggregate([
      {
        $match: {
          financeId: new mongoose.Types.ObjectId(financeId),
          status: { $in: ['approved_by_finance', 'paid'] },
          ...dateFilter
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $group: {
          _id: {
            category: '$category',
            employee: '$employeeId'
          },
          totalAmount: { $sum: '$amount' },
          employeeName: { $first: '$employee.name' }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          employeeUsage: {
            $push: {
              employeeId: '$_id.employee',
              employeeName: '$employeeName',
              used: '$totalAmount'
            }
          }
        }
      }
    ]);

    // Merge limit data with usage data
    const budgetAnalysis = settings.monthlyLimitByCategory.map(limit => {
      const usage = categoryUsage.find(u =>
        u._id && limit.categoryId &&
        u._id.toString() === limit.categoryId._id.toString()
      );
      
      const empUsage = employeeUsage.find(u =>
        u._id && limit.categoryId &&
        u._id.toString() === limit.categoryId._id.toString()
      );
     
      const usedAmount = usage ? usage.totalAmount : 0;
      const remaining = Math.max(0, limit.amount - usedAmount);
      const extraUsed = Math.max(0, usedAmount - limit.amount);
      
      return {
        category: limit.categoryId.name,
        categoryId: limit.categoryId._id,
        limit: limit.amount,
        used: usedAmount,
        remaining: remaining,
        extraUsed: extraUsed,
        utilization: limit.amount > 0 ? Math.round((usedAmount / limit.amount) * 100) : 0,
        employeeUsage: empUsage ? empUsage.employeeUsage.map(emp => ({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          used: emp.used,
          percentage: limit.amount > 0 ? Math.round((emp.used / limit.amount) * 100) : 0,
          extraUsed: Math.max(0, emp.used - (limit.employeeLimits?.find(el => 
            el.employeeId.toString() === emp.employeeId.toString())?.amount || 0))
        })) : []
      };
    });

    res.json({
      success: true,
      data: budgetAnalysis
    });
  } catch (error) {
    console.error('Get budget analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const financeId = req.user._id;

    const claim = await Claim.findOne({
      _id: id,
      $or: [
        { financeId },
        { status: { $in: ['sent_to_finance', 'escalated_to_admin_by_finance'] } }
      ]
    })
    .populate('employeeId', 'name email')
    .populate('category', 'name')
    .populate('managerId', 'name email')
    .populate('adminId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found or not authorized' });
    }

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Reject claim - FIXED
const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const financeId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    if (claim.status !== 'sent_to_finance' && claim.status !== 'escalated_to_admin_by_finance') {
      return res.status(400).json({ success: false, error: 'Claim is not in a state that can be rejected by finance' });
    }

    const fromStatus = claim.status;
    claim.status = 'rejected_by_finance';
    claim.financeId = financeId;

    // Add history
    claim.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected_by_finance',
      comment
    });

    await claim.save();

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Rejected by Finance',
      message: `Your claim for ${claim.amount} has been rejected by finance department: ${comment}`,
      type: 'danger'
    });
   

    // Send real-time update
    sendToUser(claim.employeeId._id.toString(), {
      event: 'claim.updated',
      data: claim,
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

// In finance.controller.js - add this function
const escalateClaimToAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const financeId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for escalation' });
    }

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    if (claim.status !== 'sent_to_finance') {
      return res.status(400).json({ success: false, error: 'Claim is not in a state that can be escalated to admin' });
    }

    const fromStatus = claim.status;
    claim.status = 'escalated_to_admin_by_finance'; // FIXED: Correct status
    claim.financeId = financeId;

    // Add history
    claim.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'escalated',
      fromStatus,
      toStatus: 'escalated_to_admin_by_finance',
      comment
    });

    await claim.save();

    // Create notification for admin
    const User = require('../models/user.model'); // ADD THIS LINE
    const adminUsers = await User.find({ role: 'admin' });
    for (const admin of adminUsers) {
      await notificationService.createNotification({
        userId: admin._id,
        title: 'Claim Escalated to Admin by Finance',
        message: `Claim from ${claim.employeeId.name} for ${claim.amount} has been escalated by finance for approval: ${comment}`,
        type: 'warning'
      });
      
      
      // Send real-time notification to admin
      sendToUser(admin._id.toString(), {
        event: 'notification.new',
        data: adminNotification,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Escalate claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Don't forget to add escalateClaimToAdmin to module.exports
// Mark claim as paid
const payClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, paymentMethod, paymentDate } = req.body;
    const financeId = req.user._id;

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    if (claim.financeId.toString() !== financeId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to pay this claim' });
    }

    if (claim.status !== 'approved_by_finance') {
      return res.status(400).json({ success: false, error: 'Claim must be approved by finance before payment' });
    }

    const fromStatus = claim.status;
    claim.status = 'paid';
    claim.paymentDate = paymentDate || new Date();
    claim.paymentMethod = paymentMethod;

    // Add history
    claim.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'paid',
      fromStatus,
      toStatus: 'paid',
      comment: comment || `Claim paid via ${paymentMethod || 'unknown method'}`
    });

    await claim.save();

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Paid',
      message: `Your claim for ${claim.amount} has been paid${paymentMethod ? ' via ' + paymentMethod : ''}`,
      type: 'success'
    });
    

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Pay claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// finance.controller.js - Partial update for order approval
// Approve order - UPDATED
// finance.controller.js - Fix order approval logic
// Approve order - UPDATED to accept approved_by_manager status
const approveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const financeId = req.user._id;

    const order = await Order.findById(id)
      .populate('employeeId', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Allow both approved_by_manager and sent_to_finance statuses
    if (order.status !== 'approved_by_manager' && order.status !== 'sent_to_finance') {
      return res.status(400).json({ 
        success: false, 
        error: 'Order is not in a state that can be approved by finance. Current status: ' + order.status 
      });
    }

    const fromStatus = order.status;
    order.status = 'approved_by_finance';
    order.financeId = financeId;

    // Add history
    order.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'approved',
      fromStatus,
      toStatus: 'approved_by_finance',
      comment: comment || 'Order approved by finance'
    });

    await order.save();

    // Create notification for employee
    await notificationService.createNotification({
      userId: order.employeeId._id,
      title: 'Order Approved by Finance',
      message: `Your order for ${order.item} has been approved by finance department`,
      type: 'success'
    });
   

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// Reject order
const rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const financeId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }

    const order = await Order.findById(id)
      .populate('employeeId', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.financeId.toString() !== financeId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to reject this order' });
    }

    if (order.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Order is not in a state that can be rejected by finance' });
    }

    const fromStatus = order.status;
    order.status = 'rejected';

    // Add history
    order.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected',
      comment
    });

    await order.save();

    // Create notification for employee
   await notificationService.createNotification({
      userId: order.employeeId._id,
      title: 'Order Rejected by Finance',
      message: `Your order for ${order.item} has been rejected by finance department: ${comment}`,
      type: 'danger'
    });
   

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Alternative: Modify fulfillOrder to handle processing
const fulfillOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, action = 'fulfill' } = req.body; // Add action parameter
    const financeId = req.user._id;

    const order = await Order.findById(id)
      .populate('employeeId', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let newStatus, actionText, notificationMessage;

    if (action === 'process') {
      // Handle processing action
      if (order.status !== 'approved_by_finance') {
        return res.status(400).json({ 
          success: false, 
          error: 'Order must be approved by finance before processing' 
        });
      }
      newStatus = 'processing';
      actionText = 'processing';
      notificationMessage = `Your order for ${order.item} is now being processed`;
    } else {
      // Handle fulfillment action (original logic)
      if (order.status !== 'processing') {
        return res.status(400).json({ 
          success: false, 
          error: 'Order must be in processing status before fulfillment' 
        });
      }
      newStatus = 'fulfilled';
      actionText = 'fulfilled';
      notificationMessage = `Your order for ${order.item} has been fulfilled`;
    }

    const fromStatus = order.status;
    order.status = newStatus;

    // Add history
    order.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: actionText,
      fromStatus,
      toStatus: newStatus,
      comment: comment || `Order ${actionText} by finance`
    });

    await order.save();

    // Create notification
    await notificationService.createNotification({
      userId: order.employeeId._id,
      title: `Order ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      message: notificationMessage,
      type: 'info'
    });
   

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Order action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// controllers/finance.controller.js - Add new endpoints

// Get employee payment details
const getEmployeePaymentDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await User.findById(employeeId)
      .select('name email paymentDetails');
    
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    res.json({
      success: true,
      data: {
        name: employee.name,
        paymentDetails: employee.paymentDetails || {}
      }
    });
  } catch (error) {
    console.error('Get employee payment details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update employee payment details
const updateEmployeePaymentDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { paymentDetails } = req.body;
    
    const employee = await User.findByIdAndUpdate(
      employeeId,
      { paymentDetails },
      { new: true, runValidators: true }
    ).select('name email paymentDetails');
    
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    res.json({
      success: true,
      data: {
        name: employee.name,
        paymentDetails: employee.paymentDetails
      }
    });
  } catch (error) {
    console.error('Update employee payment details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// In admin.controller.js - getEscalatedClaims function
const getEscalatedClaims = async (req, res) => {
  try {
    const { status } = req.query;
    const adminId = req.user._id;

    console.log('Admin ID:', adminId);
    console.log('Status filter:', status);

    let query = {
      $or: [
        { status: 'escalated_to_admin' },
        { status: 'escalated_to_admin_by_finance' }
      ]
    };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    console.log('Final query:', JSON.stringify(query));

    const claims = await Claim.find(query)
      .populate('employeeId', 'name email department')
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .populate('category', 'name code')
      .sort({ createdAt: -1 });

    console.log('Found escalated claims:', claims.length);
    console.log('Claim statuses:', claims.map(c => c.status));

    res.json({
      success: true,
      data: claims
    });
  } catch (error) {
    console.error('Get escalated claims error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to fetch escalated claims',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
// Get finance user payment details (for receiving payments)
const getFinancePaymentDetails = async (req, res) => {
  try {
    // Find a finance user (you might want to adjust this logic)
    const financeUser = await User.findOne({ role: 'finance' })
      .select('name paymentDetails');
    
    if (!financeUser) {
      return res.status(404).json({ success: false, error: 'Finance user not found' });
    }
    
    res.json({
      success: true,
      data: {
        name: financeUser.name,
        paymentDetails: financeUser.paymentDetails || {}
      }
    });
  } catch (error) {
    console.error('Get finance payment details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const CabRequest = require('../models/cab.model');
const CabDriver = require('../models/cabdriver.model');

// Get cab requests for finance
const getCabRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const financeId = req.user._id;
    
    let query = {
      $or: [
        { financeId },
        { status: { $in: ['approved_by_manager', 'approved_by_admin'] } }
      ]
    };
    
    if (status) {
      query.status = status;
    }
    
    const cabRequests = await CabRequest.find(query)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email')
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: cabRequests });
  } catch (error) {
    console.error('Get cab requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign cab to request
const assignCabToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { cabDriverId, comment } = req.body;
    const financeId = req.user._id;
    
    const cabRequest = await CabRequest.findById(id)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    // Check if finance user is authorized
    if ((cabRequest.financeId && cabRequest.financeId.toString() !== financeId.toString()) &&
        (cabRequest.status !== 'approved_by_manager' && cabRequest.status !== 'approved_by_admin')) {
      return res.status(403).json({ success: false, error: 'Not authorized to assign cab to this request' });
    }
    
    const cabDriver = await CabDriver.findById(cabDriverId);
    if (!cabDriver) {
      return res.status(404).json({ success: false, error: 'Cab driver not found' });
    }
    
    if (!cabDriver.isAvailable) {
      return res.status(400).json({ success: false, error: 'Cab driver is not available' });
    }
    
    // Check if driver is available at the requested time
    const pickupTime = new Date(cabRequest.pickupTime);
    const dayOfWeek = pickupTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const availability = cabDriver.availabilitySchedule.find(
      a => a.day === dayOfWeek && a.shift === cabRequest.shift
    );
    
    if (!availability || !availability.available) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cab driver is not available during the requested time' 
      });
    }
    
    const fromStatus = cabRequest.status;
    cabRequest.status = 'cab_assigned';
    cabRequest.cabDriverId = cabDriverId;
    cabRequest.financeId = financeId;
    
    cabRequest.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'assigned_cab',
      fromStatus,
      toStatus: 'cab_assigned',
      comment: comment || `Assigned cab driver: ${cabDriver.name} (${cabDriver.carNumber})`
    });
    
    await cabRequest.save();
    
    // Update driver availability if it's a one-time urgent request
    if (cabRequest.requestType === 'urgent') {
      cabDriver.isAvailable = false;
      await cabDriver.save();
    }
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cab Assigned to Your Request',
      message: `Your cab request has been assigned. Driver: ${cabDriver.name}, Contact: ${cabDriver.contactNumber}, Car: ${cabDriver.carModel} (${cabDriver.carNumber})`,
      type: 'success'
    });
    
    sendToUser(cabRequest.employeeId._id.toString(), {
      event: 'cabRequest.updated',
      data: cabRequest,
      timestamp: new Date()
    });
    
    res.json({ success: true, data: cabRequest });
  } catch (error) {
    console.error('Assign cab error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get available cab drivers
const getAvailableCabDrivers = async (req, res) => {
  try {
    const { date, shift } = req.query;
    
    let query = { isAvailable: true };
    
    // If date and shift are provided, filter by availability schedule
    if (date && shift) {
      const requestDate = new Date(date);
      const dayOfWeek = requestDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      query['availabilitySchedule.day'] = dayOfWeek;
      query['availabilitySchedule.shift'] = shift;
      query['availabilitySchedule.available'] = true;
    }
    
    const cabDrivers = await CabDriver.find(query);
    
    res.json({ success: true, data: cabDrivers });
  } catch (error) {
    console.error('Get available cab drivers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve cab request (for daily services that need admin approval first)
const approveCabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const financeId = req.user._id;
    
    const cabRequest = await CabRequest.findById(id)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.status !== 'approved_by_admin') {
      return res.status(400).json({ 
        success: false, 
        error: 'Request must be approved by admin before finance can process it' 
      });
    }
    
    const fromStatus = cabRequest.status;
    cabRequest.status = 'approved_by_finance';
    cabRequest.financeId = financeId;
    
    cabRequest.history.push({
      byUser: financeId,
      byRole: 'finance',
      action: 'approved',
      fromStatus,
      toStatus: 'approved_by_finance',
      comment: comment || 'Cab request approved by finance'
    });
    
    await cabRequest.save();
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cab Request Approved by Finance',
      message: `Your daily cab service request has been approved by finance department`,
      type: 'success'
    });
    
    sendToUser(cabRequest.employeeId._id.toString(), {
      event: 'cabRequest.updated',
      data: cabRequest,
      timestamp: new Date()
    });
    
    res.json({ success: true, data: cabRequest });
  } catch (error) {
    console.error('Approve cab request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
module.exports = {
  getClaims,
  getOrders,
  approveClaim,
  rejectClaim,
  payClaim,
  approveOrder,
   escalateClaimToAdmin,
  rejectOrder,
  fulfillOrder,
  getDashboard,
  exportReports,
  exportBudgetReport,
  getBudgetAnalysis,
  getReportsAnalytics,
  getClaim,
  getFinancePaymentDetails,
  getEmployeePaymentDetails,
  updateEmployeePaymentDetails,
  getEscalatedClaims,
  getBudgetInfo,
  getCabRequests,
  assignCabToRequest,
  getAvailableCabDrivers,
  approveCabRequest
};