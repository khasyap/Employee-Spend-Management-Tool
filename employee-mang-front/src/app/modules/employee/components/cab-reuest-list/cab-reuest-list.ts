import { Component } from '@angular/core';
import { CabRequest } from '../../../../core/models/cab.model';
import { Api } from '../../../../core/services/api';
import { Auth } from '../../../../core/services/auth';
import { normalizeStatus } from '../../../../../utils/type-utils';
@Component({
  selector: 'app-cab-reuest-list',
  standalone: false,
  templateUrl: './cab-reuest-list.html',
  styleUrl: './cab-reuest-list.css'
})
export class CabReuestList {
cabRequests: CabRequest[] = [];
  isLoading = true;
  error = '';
  statusFilter = '';

  // Make utility function available to template
  normalizeStatus = normalizeStatus;

  constructor(private api: Api, private auth: Auth) {}

  ngOnInit(): void {
    this.loadCabRequests();
  }

  loadCabRequests(): void {
    this.isLoading = true;
    const params: any = {};
    if (this.statusFilter) {
      params.status = this.statusFilter;
    }

    this.api.getCabRequests(params).subscribe({
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
}