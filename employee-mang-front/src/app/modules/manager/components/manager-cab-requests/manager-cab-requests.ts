import { Component } from '@angular/core';
import { CabRequest } from '../../../../core/models/cab.model';
import { Api } from '../../../../core/services/api';
import { 
  getEmployeeName, 
  normalizeStatus 
} from '../../../../../utils/type-utils';
@Component({
  selector: 'app-manager-cab-requests',
  standalone: false,
  templateUrl: './manager-cab-requests.html',
  styleUrl: './manager-cab-requests.css'
})
export class ManagerCabRequests {
cabRequests: CabRequest[] = [];
  isLoading = true;
  error = '';
  statusFilter = '';

  // Make utility functions available to template
  getEmployeeName = getEmployeeName;
  normalizeStatus = normalizeStatus;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.loadCabRequests();
  }

  loadCabRequests(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.statusFilter) {
      params.status = this.statusFilter;
    }

    this.api.getManagerCabRequests(params).subscribe({
      next: (response: any) => {
        this.cabRequests = response.data;
        this.isLoading = false;
      },
      error: (error: any) => {
        this.error = error.message;
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.loadCabRequests();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return 'status-pending';
      case 'approved_by_manager':
      case 'approved_by_finance':
      case 'approved_by_admin':
        return 'status-approved';
      case 'cab_assigned':
        return 'status-assigned';
      case 'completed':
        return 'status-completed';
      case 'rejected_by_manager':
      case 'rejected_by_finance':
      case 'rejected_by_admin':
        return 'status-rejected';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  approveRequest(request: CabRequest): void {
    if (confirm('Are you sure you want to approve this cab request?')) {
      this.api.approveCabRequest(request._id).subscribe({
        next: (response: any) => {
          this.loadCabRequests();
        },
        error: (error: any) => {
          this.error = error.message;
        }
      });
    }
  }

  rejectRequest(request: CabRequest): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.api.rejectCabRequest(request._id, reason).subscribe({
        next: (response: any) => {
          this.loadCabRequests();
        },
        error: (error: any) => {
          this.error = error.message;
        }
      });
    }
  }

  // Add this method to handle text normalization in template
  normalizeText(text: string): string {
    return text.replace(/_/g, ' ');
  }
}