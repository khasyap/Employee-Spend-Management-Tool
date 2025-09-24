import { Component, OnInit } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { NotificationService } from '../../../../core/services/notification';
import { AppNotification,  } from '../../../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: false,
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {
  notifications: AppNotification[] = [];
  loading = true;
  showUnreadOnly = true;

  constructor(
    private apiService: Api,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadNotifications();
    
    // Subscribe to real-time notifications
    this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
  }

  loadNotifications() {
    const endpoint = this.showUnreadOnly ? 
      '/manager/notifications?unread=true' : 
      '/manager/notifications';

    this.apiService.get<AppNotification[]>(endpoint).subscribe({
      next: (response) => {
        this.notifications = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.loading = false;
      }
    });
  }

  markAsRead(notification: AppNotification) {
    this.notificationService.markAsRead(notification._id);
  }

  markAllAsRead() {
    // Fix the template error by using a different approach
    const unreadNotifications = this.notifications.filter(n => !n.read);
    unreadNotifications.forEach(notification => {
      this.notificationService.markAsRead(notification._id);
    });
  }

  toggleFilter() {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.loading = true;
    this.loadNotifications();
  }

  getBadgeClass(type: string): string {
    switch (type) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'danger': return 'bg-danger';
      default: return 'bg-info';
    }
  }
  hasUnreadNotifications(): boolean {
  return this.notifications.some(notification => !notification.read);
}
}