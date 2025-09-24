import { Component, OnInit } from '@angular/core';
import { Claim } from '../../../../core/models/claim.model';
import { Api } from '../../../../core/services/api';
import { Order } from '../../../../core/models/order.model';

@Component({
  selector: 'app-review-claims',
  standalone: false,
  templateUrl: './review-claims.html',
  styleUrl: './review-claims.css'
})
export class ReviewClaims implements OnInit {
 claims: Claim[] = [];
  orders: Order[] = [];
  filteredClaims: Claim[] = [];
  filteredOrders: Order[] = [];
  loading = false;
  activeTab: 'claims' | 'orders' = 'claims';
  claimsStatusFilter = '';
  ordersStatusFilter = '';
  selectedClaim: Claim | null = null;
  selectedOrder: Order | null = null;
  decisionComment = '';

  constructor(private apiService: Api) {}

  ngOnInit() {
    this.loadClaims();
  }

  switchTab(tab: 'claims' | 'orders') {
    this.activeTab = tab;
    if (tab === 'orders' && this.orders.length === 0) {
      this.loadOrders();
    }
  }

  loadClaims() {
    this.loading = true;
    this.apiService.get<Claim[]>('/manager/claims').subscribe({
      next: (response) => {
        this.claims = response.data;
        this.filteredClaims = this.claims;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading claims:', error);
        this.loading = false;
      }
    });
  }

  loadOrders() {
    this.loading = true;
    this.apiService.get<Order[]>('/manager/orders').subscribe({
      next: (response) => {
        this.orders = response.data;
        this.filteredOrders = this.orders;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      }
    });
  }

  filterClaims() {
    if (!this.claimsStatusFilter) {
      this.filteredClaims = this.claims;
    } else {
      this.filteredClaims = this.claims.filter(claim => claim.status === this.claimsStatusFilter);
    }
  }

  filterOrders() {
    if (!this.ordersStatusFilter) {
      this.filteredOrders = this.orders;
    } else {
      this.filteredOrders = this.orders.filter(order => order.status === this.ordersStatusFilter);
    }
  }

  selectClaim(claim: Claim) {
    this.selectedClaim = claim;
    this.selectedOrder = null;
  }

  selectOrder(order: Order) {
    this.selectedOrder = order;
    this.selectedClaim = null;
  }

  approveClaim() {
    if (!this.selectedClaim) return;
    
    this.loading = true;
    this.apiService.put(`/manager/claims/${this.selectedClaim._id}/approve`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadClaims();
        this.selectedClaim = null;
        this.decisionComment = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error approving claim:', error);
        this.loading = false;
      }
    });
  }

  rejectClaim() {
    if (!this.selectedClaim) return;
    
    this.loading = true;
    this.apiService.put(`/manager/claims/${this.selectedClaim._id}/reject`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadClaims();
        this.selectedClaim = null;
        this.decisionComment = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error rejecting claim:', error);
        this.loading = false;
      }
    });
  }

  approveOrder() {
    if (!this.selectedOrder) return;
    
    this.loading = true;
    this.apiService.put(`/manager/orders/${this.selectedOrder._id}/approve`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadOrders();
        this.selectedOrder = null;
        this.decisionComment = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error approving order:', error);
        this.loading = false;
      }
    });
  }

  rejectOrder() {
    if (!this.selectedOrder) return;
    
    this.loading = true;
    this.apiService.put(`/manager/orders/${this.selectedOrder._id}/reject`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadOrders();
        this.selectedOrder = null;
        this.decisionComment = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error rejecting order:', error);
        this.loading = false;
      }
    });
  }

// In your Angular components - update getStatusBadgeClass
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
    case 'direct_to_finance': // NEW
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
// Replace the getEmployeeName and getEmployeeDepartment methods with these:

// Safe access to employee details
getEmployeeName(item: any): string {
  if (item.employeeDetails && item.employeeDetails.name) {
    return item.employeeDetails.name;
  }
  if (item.employeeId && typeof item.employeeId === 'object' && item.employeeId.name) {
    return item.employeeId.name;
  }
  if (item.employee && typeof item.employee === 'object' && item.employee.name) {
    return item.employee.name;
  }
  return 'Unknown';
}

getEmployeeDepartment(item: any): string {
  if (item.employeeDetails && item.employeeDetails.department) {
    return item.employeeDetails.department;
  }
  if (item.employeeId && typeof item.employeeId === 'object' && item.employeeId.department) {
    return item.employeeId.department;
  }
  if (item.employee && typeof item.employee === 'object' && item.employee.department) {
    return item.employee.department;
  }
  return 'Unknown';
}

// Add this method for category name
getCategoryName(claim: any): string {
  if (claim.categoryDetails && claim.categoryDetails.name) {
    return claim.categoryDetails.name;
  }
  if (claim.category && typeof claim.category === 'object' && claim.category.name) {
    return claim.category.name;
  }
  return 'Unknown';
}
getVendorName(order: any): string {
  if (order.vendorDetails && order.vendorDetails.name) {
    return order.vendorDetails.name;
  }
  if (typeof order.vendor === 'object' && order.vendor.name) {
    return order.vendor.name;
  }
  // If vendor is just a string
  if (typeof order.vendor === 'string') {
    return order.vendor;
  }
  return 'Unknown';
}
}