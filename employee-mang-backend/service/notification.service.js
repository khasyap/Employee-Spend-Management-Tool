// services/notification.service.js
const Notification = require('../models/notification.model');

class NotificationService {
  static async createNotification(userId, title, message, type = 'info') {
    try {
      const notification = new Notification({
        userId,
        title,
        message,
        type
      });
      
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId, unreadOnly = false) {
    try {
      const query = { userId };
      if (unreadOnly) {
        query.read = false;
      }
      
      return await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId, userId) {
    try {
      return await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      return await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;