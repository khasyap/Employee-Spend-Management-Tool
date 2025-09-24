import { Component, OnDestroy, OnInit } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { Realtime } from '../../../../core/services/realtime';
import { NotificationService } from '../../../../core/services/notification';
interface DashboardData {
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  paidClaims: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  categoryAnalysis: any[];
  budgetStatus: any[];
  recentClaims: any[];
  recentOrders: any[];
  averageClaim: number;
  pendingOrders: number;
  processingOrders: number;
  fulfilledOrders: number;
  rejectedOrders: number;
  totalOrderAmount: number;
  escalatedClaims: number;
   escalatedAmount: number;
    directToFinanceClaims: number; // Add this property
  directToFinanceAmount: number; // A

}

@Component({
  selector: 'app-finance-dashboard',
  standalone: false,
  templateUrl: './finance-dashboard.html',
  styleUrl: './finance-dashboard.css'
})
export class FinanceDashboard implements OnInit , OnDestroy {
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
    this.loadNotificationsCount();
  }

  ngOnDestroy() {
    this.realtimeService.disconnect();
  }

  loadDashboardData() {
    this.loading = true;
    this.apiService.get<DashboardData>('/finance/dashboard').subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardData = response.data;
        } else {
          this.dashboardData = this.getFallbackData();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
        this.dashboardData = this.getFallbackData();
      }
    });
  }

  loadNotificationsCount() {
    this.notificationService.notifications$.subscribe(notifications => {
      this.unreadNotificationsCount = notifications.filter(n => !n.read).length;
    });
    
    // Load initial notifications
    this.notificationService.loadNotifications();
  }

  private getFallbackData(): DashboardData {
    return {
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
      paidClaims: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      categoryAnalysis: [],
      budgetStatus: [],
      recentClaims: [],
      recentOrders: [],
      averageClaim: 0,
      pendingOrders: 0,
      processingOrders: 0,
      fulfilledOrders: 0,
      rejectedOrders: 0,
      totalOrderAmount: 0,
      escalatedClaims: 0,
   escalatedAmount: 0,
    directToFinanceClaims: 0, // Add this
    directToFinanceAmount: 0 
    };
  }

 setupRealtimeUpdates() {
  this.realtimeService.connect();
  
  this.realtimeService.connection$.subscribe(status => {
    this.connectionStatus = status;
  });

  this.realtimeService.messages$.subscribe(message => {
    this.realtimeUpdates.unshift(message);
    if (this.realtimeUpdates.length > 5) {
      this.realtimeUpdates.pop();
    }
    
    // Refresh dashboard on relevant events
    if (message.event && [
      'claim.updated', 
      'payment.paid', 
      'order.updated', 
      'notification.new',
      'claim.direct_to_finance', // Add this
      'claim.escalated' // Add this
    ].includes(message.event)) {
      this.loadDashboardData();
      if (message.event === 'notification.new') {
        this.notificationService.loadNotifications();
      }
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
    case 'sent_to_finance':
    case 'direct_to_finance': // Add this
      return 'bg-warning';
    case 'approved_by_finance':
    case 'approved':
      return 'bg-success';
    case 'rejected_by_manager':
    case 'rejected_by_finance':
    case 'rejected':
      return 'bg-danger';
    case 'escalated_to_admin':
    case 'escalated_to_admin_by_finance': // Add this
      return 'bg-info';
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

  // Safe accessor methods
  getPendingClaims(): number { return this.dashboardData?.pendingClaims || 0; }
  getApprovedClaims(): number { return this.dashboardData?.approvedClaims || 0; }
  getRejectedClaims(): number { return this.dashboardData?.rejectedClaims || 0; }
  getPaidClaims(): number { return this.dashboardData?.paidClaims || 0; }
  getTotalAmount(): number { return this.dashboardData?.totalAmount || 0; }
  getPaidAmount(): number { return this.dashboardData?.paidAmount || 0; }
  getPendingAmount(): number { return this.dashboardData?.pendingAmount || 0; }
  getAverageClaim(): number { return this.dashboardData?.averageClaim || 0; }
  getBudgetStatus(): any[] { return this.dashboardData?.budgetStatus || []; }
  getRecentClaims(): any[] { return this.dashboardData?.recentClaims || []; }
  getRecentOrders(): any[] { return this.dashboardData?.recentOrders || []; }
  getCategoryAnalysis(): any[] { return this.dashboardData?.categoryAnalysis || []; }
  getPendingOrders(): number { return this.dashboardData?.pendingOrders || 0; }
  getProcessingOrders(): number { return this.dashboardData?.processingOrders || 0; }
  getFulfilledOrders(): number { return this.dashboardData?.fulfilledOrders || 0; }
  getRejectedOrders(): number { return this.dashboardData?.rejectedOrders || 0; }
  getTotalOrderAmount(): number { return this.dashboardData?.totalOrderAmount || 0; }
getEscalatedClaims(): number { return this.dashboardData?.escalatedClaims || 0; }
getEscalatedAmount(): number { return this.dashboardData?.escalatedAmount || 0; }
  getCategoryUsage(categoryId: string): number {
    if (!this.dashboardData?.categoryAnalysis) return 0;
    const category = this.dashboardData.categoryAnalysis.find((c: any) => c._id === categoryId);
    return category ? category.totalAmount : 0;
  }

  // Safe property access methods
  getEmployeeName(item: any): string {
    if (!item || !item.employeeId) return 'Unknown';
    if (typeof item.employeeId === 'string') return item.employeeId;
    return item.employeeId.name || 'Unknown';
  }
getDirectToFinanceClaims(): number {
  // You'll need to add this property to your DashboardData interface
  // and ensure the backend returns it
  return this.dashboardData?.directToFinanceClaims || 0;
}

getDirectToFinanceAmount(): number {
  return this.dashboardData?.directToFinanceAmount || 0;
}
  getCategoryName(item: any): string {
    if (!item || !item.category) return 'N/A';
    if (typeof item.category === 'string') return item.category;
    return item.category.name || 'N/A';
  }
}