import { Component, OnInit } from '@angular/core';
import { Claim } from '../../../../core/models/claim.model';
import { Api } from '../../../../core/services/api';
import { Category } from '../../../../core/models/category.model';

interface Order {
  _id: string;
  item: string;
  vendor: string;
  amount: number;
  status: string;
    description?: string;
  createdAt: Date;
  updatedAt: Date;
}
interface StatusFlow {
  [key: string]: number;
}

interface StepFlow {
  [key: string]: number;
}

interface StatusMap {
  [key: string]: string;
}

interface StepMap {
  [key: string]: string;
}
@Component({
  selector: 'app-track-claims',
  standalone: false,
  templateUrl: './track-claims.html',
  styleUrl: './track-claims.css'
})
export class TrackClaims implements OnInit {
claims: Claim[] = [];
  orders: Order[] = [];
  filteredClaims: Claim[] = [];
  filteredOrders: Order[] = [];
  categories: Category[] = [];
  loading = false;
  categoriesLoading = false;
  activeTab: 'claims' | 'orders' = 'claims';
  claimsStatusFilter = '';
  ordersStatusFilter = '';

  private statusFlow: { claim: StatusFlow; order: StatusFlow } = {
    claim: {
      'submitted': 1,
      'under_review': 2,
      'approved_by_manager': 3,
      'rejected_by_manager': 3,
      'escalated_to_admin': 3,
      'approved_by_admin': 3,
      'rejected_by_admin': 3,
      'returned_to_manager': 2,
      'sent_to_finance': 4,
      'direct_to_finance': 4, // NEW: Direct to finance status
      'approved_by_finance': 5,
      'rejected_by_finance': 5,
      'escalated_to_admin_by_finance': 5,
      'paid': 6
    },
    order: {
      'submitted': 1,
      'under_review': 2,
      'approved': 3,
      'rejected': 3,
      'processing': 4,
      'fulfilled': 5
    }
  };

  private stepFlow: { claim: StepFlow; order: StepFlow } = {
    claim: {
     'submitted': 1,
      'manager_review': 2,
      'admin_review': 3, // NEW: Admin review step
      'finance_review': 4,
      'payment_processing': 5,
      'paid': 6
    },
    order: {
      'submitted': 1,
      'manager_review': 2,
      'finance_approval': 3,
      'processing': 4,
      'fulfilled': 5
    }
  };

  constructor(private apiService: Api) {}

  ngOnInit() {
    this.loadCategories();
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
    this.activeTab = 'claims';
    this.apiService.get<Claim[]>('/employee/claims').subscribe({
      next: (response) => {
        this.claims = response.data;
        this.filteredClaims = this.claims;
        this.loading = false;
        console.log('Claims loaded:', this.claims);
      },
      error: (error) => {
        console.error('Error loading claims:', error);
        this.loading = false;
      }
    });
  }

  loadOrders() {
    this.loading = true;
    this.apiService.get<Order[]>('/employee/orders').subscribe({
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

  loadCategories() {
    this.categoriesLoading = true;
    this.apiService.get<Category[]>('/employee/categories').subscribe({
      next: (response) => {
        this.categories = response.data;
        this.categoriesLoading = false;
        console.log('Categories loaded:', this.categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.categoriesLoading = false;
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

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return 'bg-secondary';
      case 'approved_by_manager':
      case 'approved_by_finance':
      case 'sent_to_finance':
      case 'approved':
      case 'direct_to_finance': // NEW: Direct to finance badge
        return 'bg-success';
      case 'rejected_by_manager':
      case 'rejected_by_finance':
      case 'rejected':
        return 'bg-danger';
      case 'escalated_to_admin':
      case 'escalated_to_admin_by_finance':
      case 'returned_to_manager':
        return 'bg-warning';
      case 'paid':
      case 'fulfilled':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }
  // Get category name with proper fallback logic
  getCategoryName(claim: Claim): string {
    // First try: Check if categoryDetails is populated with name
    if (claim.categoryDetails && claim.categoryDetails.name) {
      return claim.categoryDetails.name;
    }
    
    // Second try: Check if category is a populated object with name
    if (claim.category && typeof claim.category === 'object' && 'name' in claim.category) {
      return (claim.category as any).name;
    }
    
    // Third try: If category is just an ID, look it up in our categories array
    if (claim.category && typeof claim.category === 'string' && this.categories.length > 0) {
      const category = this.categories.find(c => c._id === claim.category);
      if (category) {
        return category.name;
      }
    }
    
    // Final fallback
    return 'Loading category...';
  }

  getFlowSteps(type: 'claim' | 'order', status: string): any[] {
    const baseSteps = [
      { name: 'Submitted', status: 'submitted', icon: 'fa-paper-plane' },
      { name: 'Manager Review', status: 'manager_review', icon: 'fa-user-tie' }
    ];

    if (type === 'claim') {
      const claimSteps = [
        ...baseSteps,
        { name: 'Finance Review', status: 'finance_review', icon: 'fa-money-check-alt' },
        { name: 'Payment Processing', status: 'payment_processing', icon: 'fa-credit-card' },
        { name: 'Paid', status: 'paid', icon: 'fa-check-circle' }
      ];

      return claimSteps.map(step => ({
        ...step,
        active: this.isStepActive(status, step.status, type),
        completed: this.isStepCompleted(status, step.status, type),
        statusClass: this.getStepStatusClass(status, step.status, type)
      }));
    } else {
      const orderSteps = [
        ...baseSteps,
        { name: 'Finance Approval', status: 'finance_approval', icon: 'fa-money-check-alt' },
        { name: 'Processing', status: 'processing', icon: 'fa-cogs' },
        { name: 'Fulfilled', status: 'fulfilled', icon: 'fa-check-circle' }
      ];

      return orderSteps.map(step => ({
        ...step,
        active: this.isStepActive(status, step.status, type),
        completed: this.isStepCompleted(status, step.status, type),
        statusClass: this.getStepStatusClass(status, step.status, type)
      }));
    }
  }

  isStepActive(currentStatus: string, step: string, type: 'claim' | 'order'): boolean {
    const currentStep = this.statusFlow[type][currentStatus] || 0;
    const targetStep = this.stepFlow[type][step] || 0;
    return currentStep >= targetStep;
  }

  isStepCompleted(currentStatus: string, step: string, type: 'claim' | 'order'): boolean {
    const currentStep = this.statusFlow[type][currentStatus] || 0;
    const targetStep = this.stepFlow[type][step] || 0;
    return currentStep > targetStep;
  }

  getStepStatusClass(currentStatus: string, step: string, type: 'claim' | 'order'): string {
    if (!this.isStepActive(currentStatus, step, type)) return '';

  // Handle direct_to_finance status - skip manager and admin review
    if (currentStatus === 'direct_to_finance') {
      if (step === 'submitted') return 'completed';
      if (step === 'manager_review') return 'skipped';
      if (step === 'admin_review') return 'skipped';
      if (step === 'finance_review') return 'pending';
    }
    
    // Handle escalated_to_admin status - skip manager review
    if (currentStatus === 'escalated_to_admin') {
      if (step === 'submitted') return 'completed';
      if (step === 'manager_review') return 'skipped';
      if (step === 'admin_review') return 'pending';
    }
    
    // Handle returned_to_manager status - go back to manager review
    if (currentStatus === 'returned_to_manager') {
      if (step === 'submitted') return 'completed';
      if (step === 'manager_review') return 'pending';
      if (step === 'admin_review') return 'skipped';
    }

    if (currentStatus.includes('rejected')) return 'rejected';
    if (currentStatus.includes('approved')) return 'approved';
    if (currentStatus === 'paid' || currentStatus === 'fulfilled') return 'completed';
    if (currentStatus === 'escalated_to_admin' || currentStatus === 'escalated_to_admin_by_finance') return 'pending';
    return 'pending';
  }

  getOverallProgress(status: string, type: 'claim' | 'order'): number {
    const maxSteps = type === 'claim' ? 6 : 5;
    const currentStep = this.statusFlow[type][status] || 0;
    return Math.round((currentStep / maxSteps) * 100);
  }

  getProgressBarClass(status: string): string {
    if (status.includes('rejected')) return 'bg-danger';
    if (status.includes('approved')) return 'bg-success';
    if (status === 'paid' || status === 'fulfilled') return 'bg-primary';
     if (status === 'escalated_to_admin' || status === 'escalated_to_admin_by_finance' || status === 'returned_to_manager') return 'bg-warning';
    if (status === 'direct_to_finance') return 'bg-info'; // NEW: Direct to finance progress bar
    return 'bg-info';
  }
}