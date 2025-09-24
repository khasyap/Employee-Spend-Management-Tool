const User = require('../models/user.model');
const Category = require('../models/category.model');
const Settings = require('../models/settings.model');
const mongoose = require('mongoose');
const Claim = require('../models/claim.model'); // Add this import
const Notification = require('../models/notification.model'); // Add this import
const { sendToUser } = require('../services/ws.service');
 const notificationService = require('../services/notification')
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
const setDirectFinanceThreshold = async (req, res) => {
  try {
    const { threshold } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.directFinanceThreshold = threshold;

    await settings.save();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Set direct finance threshold error:', error);
    res.status(500).json({ success: false, error: 'Failed to set threshold' });
  }
};
// Get single escalated claim
const getEscalatedClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    console.log('Fetching escalated claim:', id);

    const claim = await Claim.findOne({
      _id: id,
      $or: [
        { status: 'escalated_to_admin' },
        { status: 'escalated_to_admin_by_finance' }
      ]
    })
    .populate('employeeId', 'name email department')
    .populate('managerId', 'name email')
    .populate('financeId', 'name email')
    .populate('category', 'name code')
    .populate('history.byUser', 'name email');

    if (!claim) {
      console.log('Escalated claim not found:', id);
      return res.status(404).json({ success: false, error: 'Escalated claim not found or not authorized' });
    }

    console.log('Found escalated claim:', claim._id);

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Get escalated claim error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to fetch escalated claim' 
    });
  }
};
// In admin.controller.js - update approveClaim function
const approveClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, overrideBudget = false } = req.body; // Add overrideBudget parameter
    const adminId = req.user._id;

    console.log('Admin approving claim:', id);

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .populate('category', 'name');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Check if claim is in correct state for admin approval
    if (claim.status !== 'escalated_to_admin' && claim.status !== 'escalated_to_admin_by_finance') {
      return res.status(400).json({ 
        success: false, 
        error: 'Claim is not in a state that can be approved by admin. Current status: ' + claim.status 
      });
    }

    // If claim was escalated due to budget constraints, check if admin is overriding
    if (claim.status === 'escalated_to_admin_by_finance' && !overrideBudget) {
      const settings = await Settings.findOne().populate('monthlyLimitByCategory.categoryId');
      const categoryLimit = settings.monthlyLimitByCategory.find(
        limit => limit.categoryId && limit.categoryId._id.toString() === claim.category._id.toString()
      );
      
      if (categoryLimit) {
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
              category: claim.category._id,
              status: { $in: ['approved_by_finance', 'paid', 'approved_by_admin'] },
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
        
        if (claim.amount > remainingBudget) {
          return res.status(400).json({
            success: false,
            error: 'Claim exceeds remaining budget. Use overrideBudget=true to approve anyway.',
            data: {
              claimAmount: claim.amount,
              remainingBudget: remainingBudget,
              category: claim.category.name
            }
          });
        }
      }
    }

    const fromStatus = claim.status;
    let newStatus;
    let actionText;
    let notificationMessage;

    // Determine next status based on who escalated
    if (fromStatus === 'escalated_to_admin') {
      // Escalated by manager - send to finance
      newStatus = 'sent_to_finance';
      actionText = 'approved by admin and sent to finance';
      notificationMessage = `Your claim for ${claim.amount} has been approved by admin and sent to finance`;
    } else {
      // Escalated by finance - approve directly (finance already approved, admin is final approval)
      newStatus = 'approved_by_finance';
      actionText = 'approved by admin';
      notificationMessage = `Your claim for ${claim.amount} has been approved by admin`;
    }

    claim.status = newStatus;
    claim.adminId = adminId;

    // Add history
    claim.history.push({
      byUser: adminId,
      byRole: 'admin',
      action: 'approved',
      fromStatus,
      toStatus: newStatus,
      comment: comment || `Claim ${actionText}${overrideBudget ? ' (budget override)' : ''}`
    });

    await claim.save();

    console.log('Claim approved by admin:', claim._id, 'New status:', newStatus);

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Approved by Admin',
      message: notificationMessage,
      type: 'success'
    });

    // Send real-time update to employee
    sendToUser(claim.employeeId._id.toString(), {
      event: 'claim.updated',
      data: claim,
      timestamp: new Date()
    });

    // Create notification for finance if sent to finance
    if (newStatus === 'sent_to_finance' && claim.financeId) {
      await notificationService.createNotification({
        userId: claim.financeId,
        title: 'New Claim for Review',
        message: `Claim from ${claim.employeeId.name} for ${claim.amount} requires finance approval after admin review`,
        type: 'info'
      });
      
      // Send real-time notification to finance
      sendToUser(claim.financeId.toString(), {
        event: 'notification.new',
        data: {
          title: 'New Claim',
          message: 'A claim requires your review'
        },
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Admin approve claim error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to approve claim' 
    });
  }
};
const rejectClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }

    console.log('Admin rejecting claim:', id);

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email')
      .populate('financeId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    if (claim.status !== 'escalated_to_admin' && claim.status !== 'escalated_to_admin_by_finance') {
      return res.status(400).json({ 
        success: false, 
        error: 'Claim is not in a state that can be rejected by admin. Current status: ' + claim.status 
      });
    }

    const fromStatus = claim.status;
    claim.status = 'rejected_by_admin';
    claim.adminId = adminId;

    // Add history
    claim.history.push({
      byUser: adminId,
      byRole: 'admin',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected_by_admin',
      comment
    });

    await claim.save();

    console.log('Claim rejected by admin:', claim._id);

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Rejected by Admin',
      message: `Your claim for ${claim.amount} has been rejected by admin: ${comment}`,
      type: 'danger'
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
    console.error('Admin reject claim error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to reject claim' 
    });
  }
};

const returnClaimToManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user._id;

    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for returning claim' });
    }

    console.log('Admin returning claim to manager:', id);

    const claim = await Claim.findById(id)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email');

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Only allow returning claims that were escalated by manager
    if (claim.status !== 'escalated_to_admin') {
      return res.status(400).json({ 
        success: false, 
        error: 'Claim is not in a state that can be returned to manager. Current status: ' + claim.status 
      });
    }

    const fromStatus = claim.status;
    claim.status = 'returned_to_manager';
    claim.adminId = adminId;

    // Add history
    claim.history.push({
      byUser: adminId,
      byRole: 'admin',
      action: 'returned',
      fromStatus,
      toStatus: 'returned_to_manager',
      comment
    });

    await claim.save();

    console.log('Claim returned to manager:', claim._id);

    // Create notification for manager
   await notificationService.createNotification({
      userId: claim.managerId._id,
      title: 'Claim Returned by Admin',
      message: `Claim from ${claim.employeeId.name} for ${claim.amount} has been returned by admin for review: ${comment}`,
      type: 'warning'
    });
   

    // Create notification for employee
    await notificationService.createNotification({
      userId: claim.employeeId._id,
      title: 'Claim Returned for Review',
      message: `Your claim for ${claim.amount} has been returned to your manager by admin for additional review`,
      type: 'info'
    });
    await employeeNotification.save();

    // Send real-time updates
    sendToUser(claim.managerId._id.toString(), {
      event: 'notification.new',
      data: managerNotification,
      timestamp: new Date()
    });

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
    console.error('Admin return claim error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to return claim to manager' 
    });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { unread } = req.query;
    const adminId = req.user._id;

    let query = { userId: adminId };
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
    console.error('Get admin notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to fetch notifications' 
    });
  }
};

// Mark admin notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: adminId },
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
    console.error('Mark admin notification as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to mark notification as read' 
    });
  }
};

// Mark all admin notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const adminId = req.user._id;

    const result = await Notification.updateMany(
      { userId: adminId, read: false },
      { read: true }
    );

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark all admin notifications as read error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to mark all notifications as read' 
    });
  }
};

//Get all users
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    let query = {};
    if (role) {
      query.role = role;
    }
    
    const users = await User.find(query)
      .select('-passwordHash')
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password field if present (should be updated separately)
    delete updateData.password;
    delete updateData.passwordHash;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

// Create user (only for admin)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, managerId, financeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // This will be hashed by the pre-save hook
      role,
      managerId: role === 'employee' ? managerId : null,
      financeId: role === 'employee' || role === 'manager' ? financeId : null
    });

    await user.save();

    // Remove password hash from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
};

// admin.controller.js - Fixed getDashboard function
const getDashboard = async (req, res) => {
  try {
    // Get counts for different user roles
    const userCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get total claims count and analysis
    const Claim = require('../models/claim.model');
    const claims = await Claim.find()
      .populate('employeeId', 'name')
      .populate('category', 'name');
    
    const claimCount = claims.length;
    
    // System-wide status analysis - FIXED to include all statuses
    const statusAnalysis = {
      submitted: claims.filter(c => c.status === 'submitted').length,
      under_review: claims.filter(c => c.status === 'under_review').length,
      approved_by_manager: claims.filter(c => c.status === 'approved_by_manager').length,
      rejected_by_manager: claims.filter(c => c.status === 'rejected_by_manager').length,
      escalated_to_admin: claims.filter(c => c.status === 'escalated_to_admin').length,
      sent_to_finance: claims.filter(c => c.status === 'sent_to_finance').length,
      approved_by_finance: claims.filter(c => c.status === 'approved_by_finance').length,
      rejected_by_finance: claims.filter(c => c.status === 'rejected_by_finance').length,
      paid: claims.filter(c => c.status === 'paid').length
    };

    // Financial analysis
    const totalAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
    const paidAmount = claims.filter(c => c.status === 'paid').reduce((sum, claim) => sum + claim.amount, 0);

    // Monthly analysis
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyClaims = claims.filter(claim => {
      const claimDate = new Date(claim.submittedOn);
      return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
    });
    const monthlyAmount = monthlyClaims.reduce((sum, claim) => sum + claim.amount, 0);

    // Recent activities
    const recentClaims = await Claim.find()
      .populate('employeeId', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent login activity
    const LoginHistory = require('../models/loginHistory.model');
    const recentLogins = await LoginHistory.find()
      .populate('userId', 'name email role')
      .sort({ loginTime: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        userCounts,
        totalUsers: await User.countDocuments(),
        totalClaims: claimCount,
        totalAmount,
        paidAmount,
        monthlyAmount,
        statusAnalysis,
        recentClaims: recentClaims.map(claim => ({
          _id: claim._id,
          employeeId: claim.employeeId,
          category: claim.category,
          amount: claim.amount,
          status: claim.status,
          submittedOn: claim.submittedOn
        })),
        recentLogins: recentLogins.map(login => ({
          _id: login._id,
          userId: login.userId,
          email: login.email,
          success: login.success,
          loginTime: login.loginTime,
          ipAddress: login.ipAddress
        })),
        averageClaim: claimCount > 0 ? totalAmount / claimCount : 0
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
};
// Get login history
const getLoginHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, email, success } = req.query;
    
    let query = {};
    if (email) query.email = { $regex: email, $options: 'i' };
    if (success !== undefined) query.success = success === 'true';
    
    const loginHistory = await LoginHistory.find(query)
      .populate('userId', 'name email role')
      .sort({ loginTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await LoginHistory.countDocuments(query);
    
    res.json({
      success: true,
      data: loginHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get login history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch login history' });
  }
};

// Get security dashboard
const getSecurityDashboard = async (req, res) => {
  try {
    // Last 30 days login statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const loginStats = await LoginHistory.aggregate([
      {
        $match: {
          loginTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$loginTime" } },
            success: "$success"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);
    
    // Failed login attempts by IP
    const failedByIP = await LoginHistory.aggregate([
      {
        $match: {
          success: false,
          loginTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: "$ipAddress",
          attempts: { $sum: 1 },
          lastAttempt: { $max: "$loginTime" }
        }
      },
      {
        $sort: { attempts: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Successful logins by user
    const successfulLogins = await LoginHistory.aggregate([
      {
        $match: {
          success: true,
          loginTime: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          lastLogin: { $max: "$loginTime" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.json({
      success: true,
      data: {
        loginStats,
        failedByIP,
        successfulLogins: successfulLogins.map(item => ({
          userName: item.user[0]?.name || 'Unknown',
          email: item.user[0]?.email || 'Unknown',
          count: item.count,
          lastLogin: item.lastLogin
        })),
        totalLogins: await LoginHistory.countDocuments(),
        failedLogins: await LoginHistory.countDocuments({ success: false }),
        successfulLoginsCount: await LoginHistory.countDocuments({ success: true })
      }
    });
  } catch (error) {
    console.error('Get security dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security data' });
  }
};

const setLimits = async (req, res) => {
  try {
    const { perClaimLimitByRole, monthlyLimitByCategory, directFinanceThreshold } = req.body;

    console.log('Received settings data:', JSON.stringify(req.body, null, 2));

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      console.log('Created new settings document');
    }

    // Update per claim limits
    if (perClaimLimitByRole) {
      settings.perClaimLimitByRole = {
        ...settings.perClaimLimitByRole,
        ...perClaimLimitByRole
      };
      console.log('Updated per claim limits:', settings.perClaimLimitByRole);
    }

    // Update direct finance threshold
    if (directFinanceThreshold !== undefined) {
      settings.directFinanceThreshold = directFinanceThreshold;
      console.log('Updated direct finance threshold:', settings.directFinanceThreshold);
    }

    // Update monthly limits by category
    if (monthlyLimitByCategory && Array.isArray(monthlyLimitByCategory)) {
      // Clear existing monthly limits
      settings.monthlyLimitByCategory = [];
      
      // Add new monthly limits
      monthlyLimitByCategory.forEach((categoryLimit, index) => {
        console.log(`Processing category limit ${index}:`, categoryLimit);
        
        const monthlyLimit = {
          categoryId: categoryLimit.categoryId,
          amount: categoryLimit.amount,
          employeeLimits: []
        };

        // Add employee limits if they exist
        if (categoryLimit.employeeLimits && Array.isArray(categoryLimit.employeeLimits)) {
          categoryLimit.employeeLimits.forEach((empLimit, empIndex) => {
            console.log(`Processing employee limit ${empIndex} for category ${index}:`, empLimit);
            
            monthlyLimit.employeeLimits.push({
              employeeId: empLimit.employeeId,
              amount: empLimit.amount
            });
          });
        }

        settings.monthlyLimitByCategory.push(monthlyLimit);
      });
      
      console.log('Final monthly limits:', settings.monthlyLimitByCategory);
    }

    // Save the settings
    await settings.save();
    console.log('Settings saved successfully');

    // Return the saved settings with populated data
    const populatedSettings = await Settings.findOne()
      .populate('monthlyLimitByCategory.categoryId', 'name code')
      .populate('monthlyLimitByCategory.employeeLimits.employeeId', 'name email');

    res.json({
      success: true,
      data: populatedSettings
    });

  } catch (error) {
    console.error('Set limits error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to set limits. Please check the server logs for details.'
    });
  }
};
// Category CRUD operations
const createCategory = async (req, res) => {
  try {
    const { name, code } = req.body;

    const category = new Category({
      name,
      code,
      isActive: true
    });

    await category.save();

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};
// Add this function to your admin.controller.js
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne()
      .populate('monthlyLimitByCategory.categoryId', 'name code')
      .populate('monthlyLimitByCategory.employeeLimits.employeeId', 'name email');

    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = new Settings();
      await defaultSettings.save();
      return res.json({
        success: true,
        data: defaultSettings
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch settings' 
    });
  }
};
const CabRequest = require('../models/cab.model');

// Get cab requests for admin (daily services that need approval)
const getCabRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const adminId = req.user._id;
    
    let query = { status: 'approved_by_manager' }; // Daily services that need admin approval
    
    if (status) {
      query.status = status;
    }
    
    const cabRequests = await CabRequest.find(query)
      .populate('employeeId', 'name email department')
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: cabRequests });
  } catch (error) {
    console.error('Get cab requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve cab request (for daily services)
const approveCabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user._id;
    
    const cabRequest = await CabRequest.findById(id)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.status !== 'approved_by_manager') {
      return res.status(400).json({ 
        success: false, 
        error: 'Request is not in a state that can be approved by admin' 
      });
    }
    
    const fromStatus = cabRequest.status;
    cabRequest.status = 'approved_by_admin';
    cabRequest.adminId = adminId;
    
    cabRequest.history.push({
      byUser: adminId,
      byRole: 'admin',
      action: 'approved',
      fromStatus,
      toStatus: 'approved_by_admin',
      comment: comment || 'Cab request approved by admin'
    });
    
    await cabRequest.save();
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cab Request Approved by Admin',
      message: `Your daily cab service request has been approved by admin and sent to finance for cab assignment`,
      type: 'success'
    });
    
    // Notify finance
    if (cabRequest.financeId) {
      await notificationService.createNotification({
        userId: cabRequest.financeId,
        title: 'Daily Cab Request Needs Assignment',
        message: `Daily cab request from ${cabRequest.employeeId.name} requires cab assignment`,
        type: 'info'
      });
      
      sendToUser(cabRequest.financeId.toString(), {
        event: 'notification.new',
        data: {
          title: 'Daily Cab Request',
          message: 'Daily cab request requires assignment',
          type: 'info'
        },
        timestamp: new Date()
      });
    }
    
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

// Reject cab request (for daily services)
const rejectCabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const adminId = req.user._id;
    
    if (!comment) {
      return res.status(400).json({ success: false, error: 'Comment is required for rejection' });
    }
    
    const cabRequest = await CabRequest.findById(id)
      .populate('employeeId', 'name email');
    
    if (!cabRequest) {
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.status !== 'approved_by_manager') {
      return res.status(400).json({ 
        success: false, 
        error: 'Request is not in a state that can be rejected by admin' 
      });
    }
    
    const fromStatus = cabRequest.status;
    cabRequest.status = 'rejected_by_admin';
    cabRequest.adminId = adminId;
    
    cabRequest.history.push({
      byUser: adminId,
      byRole: 'admin',
      action: 'rejected',
      fromStatus,
      toStatus: 'rejected_by_admin',
      comment
    });
    
    await cabRequest.save();
    
    // Notify employee
    await notificationService.createNotification({
      userId: cabRequest.employeeId._id,
      title: 'Cab Request Rejected by Admin',
      message: `Your daily cab service request has been rejected by admin: ${comment}`,
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
module.exports = {
  createUser,
  getDashboard,
  setLimits,
  createCategory,
  getCategories,
    getLoginHistory,
  getSecurityDashboard,
  getUsers,
  updateUser,
  getEscalatedClaims,
  getEscalatedClaim,
  approveClaim,
  rejectClaim,
  returnClaimToManager,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  setDirectFinanceThreshold,
 getSettings,
 getCabRequests,
 approveCabRequest,
 rejectCabRequest
};