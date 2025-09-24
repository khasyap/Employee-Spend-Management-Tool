const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const emailService = require('./email');
const { sendToUser } = require('./ws.service');

class NotificationService {
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Send real-time notification
      sendToUser(notification.userId.toString(), {
        event: 'notification.new',
        data: notification,
        timestamp: new Date()
      });

      // Send email notification (async - don't await)
      this.sendEmailNotification(notification).catch(error => {
        console.error('Email notification failed:', error);
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async sendEmailNotification(notification) {
    try {
      // Get user email
      const user = await User.findById(notification.userId);
      if (!user || !user.email) {
        console.log('User not found or no email address');
        return;
      }

      // Check if user has email notifications enabled (you can add this field to User model)
      // if (user.notificationSettings && !user.notificationSettings.email) {
      //   return;
      // }

      // Send email
      await emailService.sendNotificationEmail(user.email, notification);
      
      // Update notification with email status
      await Notification.findByIdAndUpdate(notification._id, {
        emailSent: true,
        emailSentAt: new Date()
      });

    } catch (error) {
      console.error('Failed to send email notification:', error);
      
      // Update notification with error
      await Notification.findByIdAndUpdate(notification._id, {
        emailError: error.message
      });
    }
  }

  async sendBulkNotifications(notificationsData) {
    const results = [];
    for (const data of notificationsData) {
      try {
        const notification = await this.createNotification(data);
        results.push({ success: true, data: notification });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }
}

module.exports = new NotificationService();