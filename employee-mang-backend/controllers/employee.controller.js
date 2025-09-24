const Claim = require('../models/claim.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { parseBill } = require('../utils/ocr');
const mongoose = require('mongoose');
const { broadcastMessage, sendToUser } = require('../services/ws.service');
const path = require('path'); 
const fs = require('fs'); 
const CabRequest = require('../models/cab.model');
const CabDriver = require('../models/cabdriver.model');
 const notificationService = require('../services/notification')
const getDashboard = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const claims = await Claim.find({ employeeId })
      .populate('category', 'name')
      .sort({ submittedOn: -1 });

    const orders = await Order.find({ employeeId })
      .sort({ createdAt: -1 });

    
    const totalClaims = claims.length;
    const pendingClaims = claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
    const approvedByManager = claims.filter(c => c.status === 'approved_by_manager').length;
    const approvedByFinance = claims.filter(c => c.status === 'approved_by_finance').length;
    const approvedClaims = approvedByManager + approvedByFinance; // Total approved
    const rejectedClaims = claims.filter(c => c.status.includes('rejected')).length;
    const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0);
    const totalOrderAmount = orders.reduce((sum, o) => sum + o.amount, 0);

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

    const statusAnalysis = {
      submitted: claims.filter(c => c.status === 'submitted').length,
      under_review: claims.filter(c => c.status === 'under_review').length,
      approved_by_manager: approvedByManager,
      approved_by_finance: approvedByFinance,
      rejected: claims.filter(c => c.status.includes('rejected')).length,
      paid: claims.filter(c => c.status.includes('paid')).length
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyClaims = claims.filter(claim => {
      const claimDate = new Date(claim.submittedOn);
      return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
    });
    
    const monthlyOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    const monthlyAmount = monthlyClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const monthlyOrderAmount = monthlyOrders.reduce((sum, order) => sum + order.amount, 0);

    const recentClaims = await Claim.find({ employeeId })
      .populate('category', 'name')
      .sort({ submittedOn: -1 })
      .limit(5);

    const recentOrders = await Order.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalClaims,
        pendingClaims,
       approvedClaims, // Total approved (manager + finance)
        approvedByManager, // Individual count
        approvedByFinance, 
        rejectedClaims,
        totalAmount,
        pendingAmount,
        approvedAmount,
        rejectedAmount,
        monthlyAmount,
        statusAnalysis,
        recentClaims,
        recentOrders,
        averageClaim: totalClaims > 0 ? totalAmount / totalClaims : 0,
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'submitted').length,
        approvedOrders: orders.filter(o => o.status === 'approved').length,
        rejectedOrders: orders.filter(o => o.status === 'rejected').length,
        totalOrderAmount,
        monthlyOrderAmount
      }
    });
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// In employee.controller.js - update createClaim function
const createClaim = async (req, res) => {
  try {
    const { category, amount, description, billDate } = req.body;
    const employeeId = req.user._id;

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    // Get settings to check direct finance threshold
    const Settings = require('../models/settings.model');
    const settings = await Settings.findOne();
    const directFinanceThreshold = settings?.directFinanceThreshold || 1000; // Default $1000

    let status = 'submitted'; // Default status
    let managerId = employee.managerId;
    let financeId = employee.financeId;

    // If amount is below threshold, send directly to finance
    if (parseFloat(amount) <= directFinanceThreshold) {
      status = 'direct_to_finance';
      console.log(`Claim ${amount} <= ${directFinanceThreshold}, sending directly to finance`);
      
      // For direct-to-finance claims, we don't need managerId
      managerId = null;
    } else {
      // For regular claims, ensure we have a manager
      if (!managerId) {
        const managers = await User.find({ role: 'manager' }).limit(1);
        if (managers.length > 0) {
          managerId = managers[0]._id;
          // Update employee with managerId for future claims
          employee.managerId = managerId;
          await employee.save();
        } else {
          return res.status(500).json({ success: false, error: 'No manager available to assign claim' });
        }
      }
    }

    let billUrl;
    if (req.file) billUrl = `/uploads/${req.file.filename}`;

    const claim = new Claim({
      employeeId,
      managerId, // This can be null for direct-to-finance claims
      financeId,
      category,
      amount: parseFloat(amount),
      description,
      billUrl,
      billDate: billDate || new Date(),
      status,
      history: [{
        byUser: employeeId,
        byRole: 'employee',
        action: status === 'direct_to_finance' ? 'submitted_direct_to_finance' : 'submitted',
        fromStatus: null,
        toStatus: status,
        comment: status === 'direct_to_finance' 
          ? `Claim submitted directly to finance (amount <= ${directFinanceThreshold})` 
          : 'Claim submitted by employee'
      }]
    });

    await claim.save();
    await claim.populate('category', 'name code');
    await claim.populate('employeeId', 'name email');
    
    if (claim.managerId) {
      await claim.populate('managerId', 'name email');
    }

    // Create notification based on destination
    if (status === 'direct_to_finance') {
      // Notify finance directly
      if (financeId) {
        await notificationService.createNotification({
          userId: financeId,
          title: 'New Direct Claim',
          message: `Employee ${employee.name} submitted a direct claim for ${amount} (below ${directFinanceThreshold} threshold)`,
          type: 'info'
        });

        // Send real-time notification to finance
        sendToUser(financeId.toString(), {
          event: 'notification.new',
          data: {
            title: 'New Direct Claim',
            message: `Employee ${employee.name} submitted a direct claim for ${amount}`,
            type: 'info'
          },
          timestamp: new Date()
        });
      }
    } else {
      // Notify manager as usual
      if (managerId) {
        await notificationService.createNotification({
          userId: managerId,
          title: 'New Claim Submitted',
          message: `Employee ${employee.name} submitted a new claim for ${amount}`,
          type: 'info'
        });

        // Send real-time notification to manager
        sendToUser(managerId.toString(), {
          event: 'notification.new',
          data: {
            title: 'New Claim Submitted',
            message: `Employee ${employee.name} submitted a new claim for ${amount}`,
            type: 'info'
          },
          timestamp: new Date()
        });
      }
    }

    // Broadcast realtime update
    broadcastMessage({
      event: 'claim.updated',
      data: claim,
      timestamp: new Date()
    });

    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// Get all claims for employee
const getClaims = async (req, res) => {
  try {
    const { status } = req.query;
    const employeeId = req.user._id;

    let query = { employeeId };
    if (status) query.status = status;

    const claims = await Claim.find(query)
      .populate({
        path: 'category',
        select: 'name code',
        model: 'Category'
      })
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .sort({ createdAt: -1 });

    // Ensure categoryDetails is properly set
    const claimsWithCategoryDetails = claims.map(claim => {
      const claimObj = claim.toObject();
      // If category is populated, set categoryDetails
      if (claimObj.category) {
        claimObj.categoryDetails = claimObj.category;
      }
      return claimObj;
    });

    res.json({ success: true, data: claimsWithCategoryDetails });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single claim
const getClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user._id;

    const claim = await Claim.findOne({ _id: id, employeeId })
      .populate('category', 'name code')
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .populate('history.byUser', 'name email');

    if (!claim) return res.status(404).json({ success: false, error: 'Claim not found' });

    res.json({ success: true, data: claim });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// In employee.controller.js - createOrder function
const createOrder = async (req, res) => {
  try {
    const { item, vendor, amount, description } = req.body;
    const employeeId = req.user._id;

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    const order = new Order({
      employeeId,
      managerId: employee.managerId,
      financeId: employee.financeId, // Add financeId assignment
      item,
      vendor,
      amount: parseFloat(amount),
      description: description || '',
      status: 'submitted',
      history: [{
        byUser: employeeId,
        byRole: 'employee',
        action: 'submitted',
        fromStatus: null,
        toStatus: 'submitted',
        comment: 'Order submitted by employee'
      }]
    });

    await order.save();
    await order.populate('employeeId', 'name email');
    await order.populate('managerId', 'name email');
    await order.populate('financeId', 'name email');

    // Create notification for manager
    const notification = new Notification({
      userId: employee.managerId,
      title: 'New Order Request',
      message: `Employee ${employee.name} submitted a new order for ${item} from ${vendor}`,
      type: 'info'
    });
    await notification.save();

    // Broadcast realtime update
    broadcastMessage({
      event: 'order.created',
      data: order,
      timestamp: new Date()
    });

    // Send specific notification to manager
    sendToUser(employee.managerId.toString(), {
      event: 'notification.new',
      data: notification,
      timestamp: new Date()
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// OCR extraction endpoint
const extractOcrData = async (req, res) => {
  let filePath;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileName = req.file.originalname;
    
    // Validate file type
    const ext = path.extname(fileName).toLowerCase();
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf', '.tiff'];
    
    if (!allowedTypes.includes(ext)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported file format. Please upload JPG, PNG, PDF, or TIFF files.' 
      });
    }

    // Check file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        success: false, 
        error: 'File size exceeds 5MB limit.' 
      });
    }

    const ocrResult = await parseBill(filePath, fileName, true);

    res.json({ success: true, data: ocrResult });
    
  } catch (error) {
    console.error('OCR extraction error:', error);
    
    let errorMessage = 'Failed to process the document';
    if (error.message.includes('Tesseract')) {
      errorMessage = 'OCR processing failed. Please ensure the document is clear and readable.';
    } else if (error.message.includes('PDF')) {
      errorMessage = 'PDF processing failed. The document may be corrupted or password protected.';
    }
    
    res.status(500).json({ success: false, error: errorMessage });
    
  } finally {
    // Clean up the uploaded file after processing
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Could not clean up file:', cleanupError.message);
      }
    }
  }
};
// Get orders for employee
const getOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const employeeId = req.user._id;

    let query = { employeeId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('employeeId', 'name email')
      .populate('managerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// add to top of file if not already:
// const { parseBill } = require('../utils/ocr');
// const fs = require('fs');
// ...

const processQrCode = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ success: false, error: 'No QR data provided' });
    }

    // If client sent rawText, try to parse it server-side
    let parsed = qrData;
    if (qrData.rawText && typeof qrData.rawText === 'string') {
      // attempt to parse JSON from rawText
      try {
        const maybeJson = JSON.parse(qrData.rawText);
        parsed = maybeJson;
      } catch (e) {
        // Not JSON - try to parse key=value pairs or some known format
        // Example: amount=123&date=2024-01-01&vendor=Acme
        const text = qrData.rawText;
        const obj = {};
        if (text.includes('&') || text.includes('=')) {
          text.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k && v) obj[k.trim()] = v.trim();
          });
          parsed = obj;
        } else {
          // fallback: pass raw text back
          parsed = { rawText: qrData.rawText };
        }
      }
    }

    // Validate parsed structure - require amount, date, vendor ideally
    if (!parsed.amount || !parsed.date || !parsed.vendor) {
      // If we have rawText only, return that and let client show a message
      if (parsed.rawText) {
        return res.status(200).json({
          success: true,
          data: {
            amount: 0,
            date: new Date(),
            vendor: parsed.rawText,
            confidence: 0.6,
            rawText: parsed.rawText
          }
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Invalid QR code data structure. Expected amount, date and vendor.'
      });
    }

    // Build a normalized result
    const result = {
      amount: parseFloat(parsed.amount),
      date: new Date(parsed.date),
      vendor: parsed.vendor,
      confidence: 0.95,
      rawText: parsed.rawText || null
    };

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('QR processing error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Create cab request
const createCabRequest = async (req, res) => {
  try {
    const {
      requestType,
      description,
      pickupLocation,
      dropLocation,
      pickupTime,
      returnTime,
      shift,
      isAirportTrip,
      flightDetails
    } = req.body;
    
    const employeeId = req.user._id;
    const employee = await User.findById(employeeId);
    
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    
    // For daily service, set default locations to company
    let finalPickupLocation = pickupLocation;
    let finalDropLocation = dropLocation;
    
    if (requestType === 'daily') {
      if (!pickupLocation) finalPickupLocation = 'Company Office';
      if (!dropLocation) finalDropLocation = 'Company Office';
    }
    
    const cabRequest = new CabRequest({
      employeeId,
      managerId: employee.managerId,
      financeId: employee.financeId,
      requestType,
      description,
      pickupLocation: finalPickupLocation,
      dropLocation: finalDropLocation,
      pickupTime: new Date(pickupTime),
      returnTime: returnTime ? new Date(returnTime) : undefined,
      shift,
      isAirportTrip: isAirportTrip || false,
      flightDetails,
      status: 'submitted',
      history: [{
        byUser: employeeId,
        byRole: 'employee',
        action: 'submitted',
        fromStatus: null,
        toStatus: 'submitted',
        comment: 'Cab request submitted by employee'
      }]
    });
    
    await cabRequest.save();
    await cabRequest.populate('employeeId', 'name email');
    
    // Notify manager
    if (employee.managerId) {
      await notificationService.createNotification({
        userId: employee.managerId,
        title: 'New Cab Request',
        message: `Employee ${employee.name} submitted a new cab request for ${requestType} service`,
        type: 'info'
      });
      
      sendToUser(employee.managerId.toString(), {
        event: 'notification.new',
        data: {
          title: 'New Cab Request',
          message: `Employee ${employee.name} submitted a new cab request`,
          type: 'info'
        },
        timestamp: new Date()
      });
    }
    
    res.status(201).json({ success: true, data: cabRequest });
  } catch (error) {
    console.error('Create cab request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get cab requests for employee
const getCabRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const employeeId = req.user._id;
    
    let query = { employeeId };
    if (status) query.status = status;
    
    const cabRequests = await CabRequest.find(query)
      .populate('managerId', 'name email')
      .populate('financeId', 'name email')
      .populate('cabDriverId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: cabRequests });
  } catch (error) {
    console.error('Get cab requests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single cab request - Ensure proper population
// Get single cab request - Ensure proper population
const getCabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user._id;
    
    console.log('Fetching cab request:', id, 'for employee:', employeeId);
    
    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid cab request ID' });
    }
    
    const cabRequest = await CabRequest.findOne({ 
      _id: id, 
      employeeId: employeeId 
    })
    .populate('managerId', 'name email')
    .populate('financeId', 'name email')
    .populate({
      path: 'cabDriverId',
      select: 'name contactNumber alternateContact licenseNumber carModel carNumber carColor capacity currentLocation rating totalTrips'
    })
    .populate('history.byUser', 'name email')
    .populate('cancellationRequests.approvedBy', 'name email');
    
    if (!cabRequest) {
      console.log('Cab request not found or not authorized:', id);
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    // Convert cabDriverId to cabDriver for frontend consistency
    const cabRequestObj = cabRequest.toObject();
    if (cabRequestObj.cabDriverId) {
      cabRequestObj.cabDriver = cabRequestObj.cabDriverId;
      delete cabRequestObj.cabDriverId;
    }
    
    console.log('Cab request found with driver:', cabRequestObj.cabDriver);
    res.json({ success: true, data: cabRequestObj });
  } catch (error) {
    console.error('Get cab request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// Create cancellation request
// Create cancellation request
const createCancellationRequest = async (req, res) => {
  try {
    console.log('=== CANCELLATION REQUEST RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user._id, req.user.name);
    console.log('Headers:', req.headers);
    
    const { cabRequestId, date, reason, requestType } = req.body;
    const employeeId = req.user._id;
    
    // Validate required fields with detailed error messages
    if (!cabRequestId) {
      console.log('Missing cabRequestId');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: cabRequestId' 
      });
    }
    
    if (!date) {
      console.log('Missing date');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: date' 
      });
    }
    
    if (!reason) {
      console.log('Missing reason');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: reason' 
      });
    }
    
    if (!requestType) {
      console.log('Missing requestType');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: requestType' 
      });
    }
    
    console.log('All fields present, proceeding with cancellation...');
    
    // Rest of your cancellation logic...
    const cabRequest = await CabRequest.findOne({ _id: cabRequestId, employeeId });
    
    if (!cabRequest) {
      console.log('Cab request not found:', cabRequestId);
      return res.status(404).json({ success: false, error: 'Cab request not found' });
    }
    
    if (cabRequest.status !== 'cab_assigned') {
      console.log('Invalid status for cancellation:', cabRequest.status);
      return res.status(400).json({ 
        success: false, 
        error: 'Cancellation can only be requested for assigned cab services' 
      });
    }
    
    if (!cabRequest.cancellationRequests) {
      cabRequest.cancellationRequests = [];
    }
    
    // Add the cancellation request
    cabRequest.cancellationRequests.push({
      date: new Date(date),
      reason,
      requestType,
      status: 'pending'
    });
    
    // Add to history
    cabRequest.history.push({
      at: new Date(),
      byUser: employeeId,
      byRole: 'employee',
      action: 'cancellation_requested',
      fromStatus: cabRequest.status,
      toStatus: cabRequest.status,
      comment: `Cancellation requested: ${reason}`
    });
    
    await cabRequest.save();
    console.log('Cancellation saved successfully');
    
    res.json({ success: true, data: cabRequest });
    
  } catch (error) {
    console.error('Create cancellation request error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
module.exports = {
  createClaim,
  getClaims,
  getClaim,
  createOrder,
  getOrders,
  getDashboard,
  extractOcrData,
  processQrCode,
  createCabRequest,
  getCabRequest,
  getCabRequests,
  createCancellationRequest
};