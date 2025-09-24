import { Component } from '@angular/core';
import { Claim } from '../../../../core/models/claim.model';
import { Api } from '../../../../core/services/api';

@Component({
  selector: 'app-verify-claim',
  standalone: false,
  templateUrl: './verify-claim.html',
  styleUrl: './verify-claim.css'
})
export class VerifyClaim {
 claims: Claim[] = [];
  filteredClaims: Claim[] = [];
  selectedClaim: Claim | null = null;
  loading = false;
  processing = false;
  statusFilter = 'all';
  amountFilter = 'all';
  dateFilter = 'all';
  decisionComment = '';

  constructor(private apiService: Api) {}

  ngOnInit() {
    console.log('Admin escalated claims component initialized');
    this.loadEscalatedClaims();
  }

  loadEscalatedClaims() {
    this.loading = true;
    console.log('Loading escalated claims...');
    
    this.apiService.get<Claim[]>('/admin/escalated-claims').subscribe({
      next: (response) => {
        console.log('Response received:', response);
        if (response.success) {
          console.log('Claims data:', response.data);
          this.claims = response.data;
          this.filteredClaims = this.claims;
          console.log('Claims loaded successfully:', this.claims.length);
        } else {
          console.error('API response not successful:', response);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading escalated claims:', error);
        console.error('Error details:', error.message, error.status, error.url);
        this.loading = false;
      }
    });
  }

  filterClaims() {
    this.filteredClaims = this.claims.filter(claim => {
      // Status filter
      if (this.statusFilter !== 'all' && claim.status !== this.statusFilter) {
        return false;
      }

      // Amount filter
      if (this.amountFilter !== 'all') {
        if (this.amountFilter === 'high' && claim.amount <= 5000) return false;
        if (this.amountFilter === 'medium' && (claim.amount < 1000 || claim.amount > 5000)) return false;
        if (this.amountFilter === 'low' && claim.amount >= 1000) return false;
      }

      // Date filter
      if (this.dateFilter !== 'all') {
        const claimDate = new Date(claim.submittedOn);
        const today = new Date();
        
        if (this.dateFilter === 'today' && !this.isSameDay(claimDate, today)) return false;
        if (this.dateFilter === 'week' && !this.isSameWeek(claimDate, today)) return false;
        if (this.dateFilter === 'month' && !this.isSameMonth(claimDate, today)) return false;
      }

      return true;
    });
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  isSameWeek(date1: Date, date2: Date): boolean {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
    return diffDays <= 7;
  }

  isSameMonth(date1: Date, date2: Date): boolean {
    return date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  selectClaim(claim: Claim) {
    this.selectedClaim = claim;
    this.decisionComment = '';
  }

  getEscalationBadgeClass(status: string): string {
    return status === 'escalated_to_admin' ? 'bg-warning' : 'bg-danger';
  }

  getEmployeeName(claim: any): string {
    if (claim.employeeDetails && claim.employeeDetails.name) {
      return claim.employeeDetails.name;
    }
    if (claim.employeeId && typeof claim.employeeId === 'object' && claim.employeeId.name) {
      return claim.employeeId.name;
    }
    if (claim.employee && typeof claim.employee === 'object' && claim.employee.name) {
      return claim.employee.name;
    }
    return 'Unknown';
  }

  getEmployeeDepartment(claim: any): string {
    if (claim.employeeDetails && claim.employeeDetails.department) {
      return claim.employeeDetails.department;
    }
    if (claim.employeeId && typeof claim.employeeId === 'object' && claim.employeeId.department) {
      return claim.employeeId.department;
    }
    if (claim.employee && typeof claim.employee === 'object' && claim.employee.department) {
      return claim.employee.department;
    }
    return 'Unknown';
  }

  getManagerName(claim: any): string {
    if (claim.managerId && typeof claim.managerId === 'object' && claim.managerId.name) {
      return claim.managerId.name;
    }
    if (claim.manager && typeof claim.manager === 'object' && claim.manager.name) {
      return claim.manager.name;
    }
    return 'Unknown';
  }

  getFinanceName(claim: any): string {
    if (claim.financeId && typeof claim.financeId === 'object' && claim.financeId.name) {
      return claim.financeId.name;
    }
    if (claim.finance && typeof claim.finance === 'object' && claim.finance.name) {
      return claim.finance.name;
    }
    return 'Unknown';
  }

  getCategoryName(claim: any): string {
    if (claim.categoryDetails && claim.categoryDetails.name) {
      return claim.categoryDetails.name;
    }
    if (claim.category && typeof claim.category === 'object' && claim.category.name) {
      return claim.category.name;
    }
    return 'Unknown';
  }

  getEscalationDate(claim: any): Date {
    // Find the escalation event in history
    const escalationEvent = claim.history.find((h: any) => 
      h.toStatus === 'escalated_to_admin' || h.toStatus === 'escalated_to_admin_by_finance'
    );
    return escalationEvent ? escalationEvent.at : claim.updatedAt;
  }

  approveClaim() {
    if (!this.selectedClaim || !this.decisionComment.trim()) return;
    
    this.processing = true;
    this.apiService.put(`/admin/escalated-claims/${this.selectedClaim._id}/approve`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadEscalatedClaims();
        this.selectedClaim = null;
        this.decisionComment = '';
        this.processing = false;
      },
      error: (error) => {
        console.error('Error approving claim:', error);
        this.processing = false;
      }
    });
  }

  rejectClaim() {
    if (!this.selectedClaim || !this.decisionComment.trim()) return;
    
    this.processing = true;
    this.apiService.put(`/admin/escalated-claims/${this.selectedClaim._id}/reject`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadEscalatedClaims();
        this.selectedClaim = null;
        this.decisionComment = '';
        this.processing = false;
      },
      error: (error) => {
        console.error('Error rejecting claim:', error);
        this.processing = false;
      }
    });
  }

  returnToManager() {
    if (!this.selectedClaim || !this.decisionComment.trim()) return;
    
    this.processing = true;
    this.apiService.put(`/admin/escalated-claims/${this.selectedClaim._id}/return-to-manager`, {
      comment: this.decisionComment
    }).subscribe({
      next: (response) => {
        this.loadEscalatedClaims();
        this.selectedClaim = null;
        this.decisionComment = '';
        this.processing = false;
      },
      error: (error) => {
        console.error('Error returning claim to manager:', error);
        this.processing = false;
      }
    });
  }
}