  import { Injectable } from '@angular/core';
  import { BehaviorSubject } from 'rxjs';
  import { Api } from './api';
  import { AppNotification } from '../models/notification.model';
  @Injectable({
    providedIn: 'root'
  })
  export class NotificationService {
    
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    constructor(private apiService: Api) {}
  loadNotifications(unreadOnly: boolean = true) {
    const endpoint = unreadOnly ? 
      '/finance/notifications?unread=true' : 
      '/finance/notifications';

    this.apiService.get<AppNotification[]>(endpoint).subscribe({
      next: (response) => {
        this.notificationsSubject.next(response.data);
      },
      error: (error) => {
        console.error('Error loading finance notifications:', error);
      }
    });
  }

  markAsRead(notificationId: string) {
    this.apiService.put<any>(`/finance/notifications/${notificationId}/read`, {}).subscribe({
      next: () => {
        const notifications = this.notificationsSubject.value.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(notifications);
      },
      error: (error) => {
        console.error('Error marking finance notification as read:', error);
      }
    });
  }


    addNotification(notification: AppNotification) {
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    }
  }
