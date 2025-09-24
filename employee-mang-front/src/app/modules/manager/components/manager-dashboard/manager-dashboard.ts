import { Component, OnDestroy, OnInit } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { Realtime } from '../../../../core/services/realtime';

import { AppNotification } from '../../../../core/models/notification.model';
import { NotificationService } from '../../../../core/services/notification';
interface DashboardData {
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalAmount: number;
  teamMembers: number;
  statusAnalysis: any;
  teamPerformance: any[];
  recentClaims: any[];
  averageClaim: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
}
@Component({
  selector: 'app-manager-dashboard',
  standalone: false,
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css'
})
export class ManagerDashboard implements OnInit , OnDestroy{
dashboardData: DashboardData | null = null;
  loading = true;
  realtimeUpdates: any[] = [];
  connectionStatus = false;
  unreadNotificationsCount = 0;

  constructor(
    private apiService: Api,
    private realtimeService: Realtime,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.setupRealtimeUpdates();
    this.loadNotifications();
    
    // Subscribe to notification updates
    this.notificationService.notifications$.subscribe((notifications: AppNotification[]) => {
  this.unreadNotificationsCount = notifications.filter(n => !n.read).length;
});
  }

  ngOnDestroy() {
    this.realtimeService.disconnect();
  }

  loadDashboardData() {
    this.loading = true;
    this.apiService.get<any>('/manager/dashboard').subscribe({
      next: (response) => {
        console.log('Manager dashboard response:', response);
        this.dashboardData = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
        this.dashboardData = this.getFallbackData();
      }
    });
  }

  loadNotifications() {
    this.notificationService.loadNotifications();
  }

  // Fallback data in case API fails
  private getFallbackData(): DashboardData {
    return {
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
      totalAmount: 0,
      teamMembers: 0,
      statusAnalysis: {
        pending: 0,
        approved: 0,
        rejected: 0,
        escalated: 0,
        sent_to_finance: 0
      },
      teamPerformance: [],
      recentClaims: [],
      averageClaim: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      pendingOrders: 0,
      approvedOrders: 0,
      rejectedOrders: 0
    };
  }

  setupRealtimeUpdates() {
    this.realtimeService.connect();
    
    this.realtimeService.connection$.subscribe(status => {
      this.connectionStatus = status;
      console.log('WebSocket connection status:', status);
    });

    this.realtimeService.messages$.subscribe(message => {
      console.log('Real-time message received:', message);
      this.realtimeUpdates.unshift(message);
      if (this.realtimeUpdates.length > 5) {
        this.realtimeUpdates.pop();
      }
      
      if (message.event && ['claim.created', 'claim.updated', 'claim.approved', 'claim.rejected', 'order.created', 'order.updated'].includes(message.event)) {
        this.loadDashboardData();
        this.loadNotifications();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'bg-secondary';
    
    switch (status.toLowerCase()) {
      case 'submitted':
      case 'under_review':
        return 'bg-secondary';
      case 'approved_by_manager':
      case 'approved_by_finance':
      case 'sent_to_finance':
      case 'approved':
        return 'bg-success';
      case 'rejected_by_manager':
      case 'rejected_by_finance':
      case 'rejected':
        return 'bg-danger';
      case 'escalated_to_admin':
      case 'escalated':
        return 'bg-warning';
      case 'paid':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  formatNumber(num: number): string {
    return num?.toLocaleString() || '0';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  getApprovalRate(employee: any): number {
    if (!employee || !employee.totalClaims || employee.totalClaims === 0) return 0;
    return Math.round((employee.approvedClaims / employee.totalClaims) * 100);
  }

  // Safe accessor methods for dashboard data
  getPendingClaims(): number {
    return this.dashboardData?.pendingClaims || 0;
  }

  getApprovedClaims(): number {
    return this.dashboardData?.approvedClaims || 0;
  }

  getRejectedClaims(): number {
    return this.dashboardData?.rejectedClaims || 0;
  }

  getTotalAmount(): number {
    return this.dashboardData?.totalAmount || 0;
  }

  getPendingAmount(): number {
    return this.dashboardData?.pendingAmount || 0;
  }

  getApprovedAmount(): number {
    return this.dashboardData?.approvedAmount || 0;
  }

  getRejectedAmount(): number {
    return this.dashboardData?.rejectedAmount || 0;
  }

  getTeamMembers(): number {
    return this.dashboardData?.teamMembers || 0;
  }

  getAverageClaim(): number {
    return this.dashboardData?.averageClaim || 0;
  }

  getStatusAnalysis(): any {
    return this.dashboardData?.statusAnalysis || {
      pending: 0,
      approved: 0,
      rejected: 0,
      escalated: 0,
      sent_to_finance: 0
    };
  }

  getTeamPerformance(): any[] {
    return this.dashboardData?.teamPerformance || [];
  }

  getRecentClaims(): any[] {
    return this.dashboardData?.recentClaims || [];
  }

  getPendingOrders(): number {
    return this.dashboardData?.pendingOrders || 0;
  }

  getApprovedOrders(): number {
    return this.dashboardData?.approvedOrders || 0;
  }

  getRejectedOrders(): number {
    return this.dashboardData?.rejectedOrders || 0;
  }
}
