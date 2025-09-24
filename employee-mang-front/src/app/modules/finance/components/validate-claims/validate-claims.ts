import { Component, OnInit } from '@angular/core';
import { Claim } from '../../../../core/models/claim.model';
import { Api } from '../../../../core/services/api';
import { Order } from '../../../../core/models/order.model';
import { Realtime } from '../../../../core/services/realtime';
import { Category } from '../../../../core/models/category.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-validate-claims',
  standalone: false,
  templateUrl: './validate-claims.html',
  styleUrl: './validate-claims.css'
})
export class ValidateClaims implements OnInit {
claims: Claim[] = [];
  orders: Order[] = [];
  filteredClaims: Claim[] = [];
  filteredOrders: Order[] = [];
  loading = true;

  // Default filters
  statusFilter = 'sent_to_finance';
  orderStatusFilter = 'approved_by_manager';
 budgetInfo: any = null;
  budgetLoading = false;
  selectedClaim: Claim | null = null;
  selectedOrder: Order | null = null;
  actionComment = '';
  activeTab: 'claims' | 'orders' = 'claims';

  constructor(
    private apiService: Api,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadClaims();
  }

  switchTab(tab: 'claims' | 'orders') {
    this.activeTab = tab;
    if (tab === 'orders' && this.orders.length === 0) {
      this.loadOrders();
    }
  }

  // ------------------- LOADERS -------------------
  loadClaims() {
    this.loading = true;
    this.apiService.get<Claim[]>('/finance/claims').subscribe({
      next: (response) => {
        if (response.success) {
          this.claims = response.data;
          this.filteredClaims = this.claims;
          console.log('Claims loaded:', this.claims);
        } else {
          console.error('Failed to load claims:', response);
        }
        this.loading = false;
        this.applyStatusFilter();
      },
      error: (error) => {
        console.error('Error loading claims:', error);
        this.loading = false;
      }
    });
  }

  loadOrders() {
    this.loading = true;
    this.apiService.get<Order[]>('/finance/orders').subscribe({
      next: (response) => {
        if (response.success) {
          this.orders = response.data;
          this.filteredOrders = this.orders;
          console.log('Orders loaded:', this.orders);
        } else {
          console.error('Failed to load orders:', response);
        }
        this.loading = false;
        this.applyOrderStatusFilter();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      }
    });
  }

  // ------------------- FILTERS -------------------
  onStatusFilterChange() {
    this.applyStatusFilter();
  }

  onOrderStatusFilterChange() {
    this.applyOrderStatusFilter();
  }

  applyStatusFilter() {
    if (!this.statusFilter || this.statusFilter === 'all') {
      this.filteredClaims = this.claims;
    } else {
      this.filteredClaims = this.claims.filter(claim => claim.status === this.statusFilter);
    }
  }

  applyOrderStatusFilter() {
    if (!this.orderStatusFilter || this.orderStatusFilter === 'all') {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(order => order.status === this.orderStatusFilter);
    }
  }

  // ------------------- SELECT -------------------
  selectClaim(claim: Claim) {
    this.selectedClaim = { ...claim }; // clone
    this.selectedOrder = null;
    this.loadBudgetInfo(claim);
  }

  selectOrder(order: Order) {
    this.selectedOrder = { ...order }; // clone
    this.selectedClaim = null;
     this.actionComment = '';
    
  }
  
  loadBudgetInfo(claim: Claim) {
    this.budgetLoading = true;
    const categoryId = typeof claim.category === 'string' ? claim.category : claim.category._id;
    
    this.apiService.get<any>(`/finance/budget-info/${categoryId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.budgetInfo = response.data;
        }
        this.budgetLoading = false;
      },
      error: (error) => {
        console.error('Error loading budget info:', error);
        this.budgetLoading = false;
      }
    });
  }

  // ------------------- CLAIM ACTIONS -------------------
  approveClaim() {
    if (!this.selectedClaim) return;

    this.apiService.put<any>(`/finance/claims/${this.selectedClaim._id}/approve`, {
      comment: this.actionComment
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadClaims();
          this.selectedClaim = null;
          this.actionComment = '';
        }
      },
      error: (error) => {
        console.error('Error approving claim:', error);
      }
    });
  }

  rejectClaim() {
    if (!this.selectedClaim) return;

    this.apiService.put<any>(`/finance/claims/${this.selectedClaim._id}/reject`, {
      comment: this.actionComment
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadClaims();
          this.selectedClaim = null;
          this.actionComment = '';
        }
      },
      error: (error) => {
        console.error('Error rejecting claim:', error);
      }
    });
  }

  markAsPaid() {
    if (!this.selectedClaim) return;

    // Only navigate if finance has already approved
    if (this.selectedClaim.status === 'approved_by_finance') {
      this.router.navigate(['/finance/payment', this.selectedClaim._id]);
    }
  }

  // ------------------- ORDER ACTIONS -------------------
 approveOrder() {
    if (!this.selectedOrder) return;

    this.apiService.put<any>(`/finance/orders/${this.selectedOrder._id}/approve`, {
      comment: this.actionComment
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadOrders();
          this.selectedOrder = null;
          this.actionComment = '';
        }
      },
      error: (error) => {
        console.error('Error approving order:', error);
      }
    });
  }
// validate-claims.ts - Updated processOrder method
processOrder() {
  if (!this.selectedOrder) return;

  // Use the fulfill endpoint but specify it's for processing
  this.apiService.put<any>(`/finance/orders/${this.selectedOrder._id}/fulfill`, {
    comment: this.actionComment,
    action: 'process' // Add action parameter
  }).subscribe({
    next: (response) => {
      if (response.success) {
        this.loadOrders();
        this.selectedOrder = null;
        this.actionComment = '';
      }
    },
    error: (error) => {
      console.error('Error processing order:', error);
      alert('Error processing order: ' + error.message);
    }
  });
}

  rejectOrder() {
    if (!this.selectedOrder) return;

    this.apiService.put<any>(`/finance/orders/${this.selectedOrder._id}/reject`, {
      comment: this.actionComment
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadOrders();
          this.selectedOrder = null;
          this.actionComment = '';
        }
      },
      error: (error) => {
        console.error('Error rejecting order:', error);
      }
    });
  }

  fulfillOrder() {
    if (!this.selectedOrder) return;

    this.apiService.put<any>(`/finance/orders/${this.selectedOrder._id}/fulfill`, {
      comment: this.actionComment
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadOrders();
          this.selectedOrder = null;
          this.actionComment = '';
        }
      },
      error: (error) => {
        console.error('Error fulfilling order:', error);
      }
    });
  }

  // ------------------- HELPERS -------------------
// Update the status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return 'bg-secondary';
      case 'approved_by_manager':
        return 'bg-success';
      case 'rejected_by_manager':
        return 'bg-danger';
      case 'escalated_to_admin':
        return 'bg-warning';
      case 'sent_to_finance':
      case 'direct_to_finance': // NEW - same as sent_to_finance
        return 'bg-info';
      case 'approved_by_finance':
        return 'bg-success';
      case 'rejected_by_finance':
        return 'bg-danger';
      case 'paid':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }
  getEmployeeName(item: any): string {
    if (!item || !item.employeeId) return 'N/A';
    if (typeof item.employeeId === 'string') return item.employeeId;
    return item.employeeId.name || 'N/A';
  }

  getManagerName(item: any): string {
    if (!item || !item.managerId) return 'N/A';
    if (typeof item.managerId === 'string') return item.managerId;
    return item.managerId.name || 'N/A';
  }

  getCategoryName(item: any): string {
    if (!item || !item.category) return 'N/A';
    if (typeof item.category === 'string') return item.category;
    return item.category.name || 'N/A';
  }
  showActionButtons(claim: any): boolean {
    return claim.status === 'sent_to_finance' || 
           claim.status === 'direct_to_finance' || 
           claim.status === 'escalated_to_admin_by_finance';
  }

}