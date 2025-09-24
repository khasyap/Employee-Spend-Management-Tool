import { Component, OnDestroy, OnInit } from '@angular/core';
import { Api } from '../../../../core/services/api';
import { Auth } from '../../../../core/services/auth';
import { Realtime } from '../../../../core/services/realtime';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
interface UserCount {
  _id: string;
  count: number;
}
interface DashboardData {
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalAmount: number;
    approvedByManager: number; // Add this
  approvedByFinance: number; // Add this
  monthlyAmount: number;
  averageClaim: number;
  statusAnalysis: any;
  recentClaims: any[];
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  recentOrders: any[];
  totalOrderAmount: number; // Add this
  monthlyOrderAmount: number; // Add this
}



@Component({
  selector: 'app-employee-dashboard',
  standalone: false,
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboard implements OnInit ,OnDestroy{
    dashboardData: DashboardData | null = null;
  loading = true;
  realtimeUpdates: any[] = [];
  connectionStatus = false;

  constructor(
    private apiService: Api,
    private authService: Auth,
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
    this.apiService.get<DashboardData>('/employee/dashboard').subscribe({
      next: (response) => {
        this.dashboardData = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
      }
    });
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
      
      // Refresh dashboard data on relevant events
      if (message.event && [
        'claim.created', 'claim.updated', 'payment.paid', 
        'order.created', 'order.updated'
      ].includes(message.event)) {
        this.loadDashboardData();
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return 'bg-secondary';
      case 'approved_by_manager':
      case 'approved_by_finance':
      case 'sent_to_finance':
        return 'bg-success';
      case 'rejected_by_manager':
      case 'rejected_by_finance':
        return 'bg-danger';
      case 'escalated_to_admin':
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
}