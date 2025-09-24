import { Component } from '@angular/core';
import { Api } from '../../../../core/services/api';

import { BehaviorSubject } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification';
import { AppNotification } from '../../../../core/models/notification.model';
import { Auth } from '../../../../core/services/auth';


@Component({
  selector: 'app-notificationat',
  standalone: false,
  templateUrl: './notificationat.html',
  styleUrl: './notificationat.css'
})
export class Notificationat {
 notifications: AppNotification[] = [];
  loading = true;
  showUnreadOnly = true;

  constructor(
    private apiService: Api,
    private notificationService: NotificationService,
    private authService: Auth
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
      '/finance/notifications?unread=true' : 
      '/finance/notifications';

    this.loading = true;
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
  this.apiService.put<any>(`/finance/notifications/${notification._id}/read`, {}).subscribe({
    next: () => {
      // Update local state
      this.notifications = this.notifications.map(n => 
        n._id === notification._id ? { ...n, read: true } : n
      );
    },
    error: (error) => {
      console.error('Error marking notification as read:', error);
    }
  });
}


  toggleFilter() {
    this.showUnreadOnly = !this.showUnreadOnly;
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