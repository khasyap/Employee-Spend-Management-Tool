import { Component, OnDestroy, OnInit } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { Realtime } from '../../../../core/services/realtime';
interface UserCount {
  _id: string;
  count: number;
}


interface DashboardData {
  userCounts: UserCount[];
  totalUsers: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalAmount: number;
  paidAmount: number;
  monthlyAmount: number;
  statusAnalysis: any;
  recentClaims: any[];
  recentLogins: any[];
  averageClaim: number;
}
@Component({
  selector: 'app-admin-dashboard',
  standalone: false,
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit , OnDestroy {
  dashboardData: DashboardData | null = null;
  loading = true;
  realtimeUpdates: any[] = [];
  connectionStatus = false;

  constructor(
    private apiService: Api,
    private realtimeService: Realtime
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.setupRealtimeUpdates();
  }

  ngOnDestroy() {
    this.realtimeService.disconnect();
  }

 loadDashboardData() {
    this.loading = true;
    this.apiService.get<DashboardData>('/admin/dashboard').subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardData = response.data;
        } else {
          console.error('Failed to load dashboard data');
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

 getFallbackData(): DashboardData {
  return {
    userCounts: [],
    totalUsers: 0,
    totalClaims: 0,
    totalAmount: 0,
    paidAmount: 0,
    monthlyAmount: 0,
    statusAnalysis: {},
    recentClaims: [],
    recentLogins: [],
    averageClaim: 0,
    pendingClaims: 0,   // added
    approvedClaims: 0,  // added
    rejectedClaims: 0   // added
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
      
      if (message.event && ['claim.created', 'claim.updated', 'payment.paid'].includes(message.event)) {
        this.loadDashboardData();
      }
    });
  }

   getUserCount(role: string): number {
    if (!this.dashboardData?.userCounts) return 0;
    const roleData = this.dashboardData.userCounts.find(uc => uc._id === role);
    return roleData ? roleData.count : 0;
  }

  getStatusCount(status: string): number {
    if (!this.dashboardData?.statusAnalysis) return 0;
    return this.dashboardData.statusAnalysis[status] || 0;
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

  generateMiniChart(data: number[], maxHeight: number = 40): any[] {
    const maxValue = Math.max(...data);
    return data.map(value => ({
      height: maxValue > 0 ? (value / maxValue) * maxHeight : 0
    }));
  }

  // Safe access to employee name
  getEmployeeName(claim: any): string {
    if (!claim || !claim.employeeId) return 'Unknown';
    if (typeof claim.employeeId === 'string') return claim.employeeId;
    return claim.employeeId.name || 'Unknown';
  }

  // Safe access to category name
  getCategoryName(claim: any): string {
    if (!claim || !claim.category) return 'Unknown';
    if (typeof claim.category === 'string') return claim.category;
    return claim.category.name || 'Unknown';
  }
  
}