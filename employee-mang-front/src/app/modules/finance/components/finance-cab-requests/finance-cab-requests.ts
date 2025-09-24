import { Component } from '@angular/core';
import { CabDriver, CabRequest } from '../../../../core/models/cab.model';
import { Api } from '../../../../core/services/api';
import { 
  getEmployeeName, 
  normalizeStatus,
  getDriverName,
  getDriverContact,
  getDriverCarModel,
  getDriverCarNumber
} from '../../../../../utils/type-utils';

@Component({
  selector: 'app-finance-cab-requests',
  standalone: false,
  templateUrl: './finance-cab-requests.html',
  styleUrl: './finance-cab-requests.css'
})
export class FinanceCabRequests {
cabRequests: CabRequest[] = [];
  availableDrivers: CabDriver[] = [];
  selectedRequest: CabRequest | null = null;
  selectedDriver: string = '';
  isLoading = true;
  driversLoading = false;
  error = '';
  statusFilter = '';
  showAssignModal = false;

  // Make utility functions available to template
  getEmployeeName = getEmployeeName;
  normalizeStatus = normalizeStatus;
  getDriverName = getDriverName;
  getDriverContact = getDriverContact;
  getDriverCarModel = getDriverCarModel;
  getDriverCarNumber = getDriverCarNumber;

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

    this.api.getFinanceCabRequests(params).subscribe({
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

  openAssignModal(request: CabRequest): void {
    this.selectedRequest = request;
    this.selectedDriver = '';
    this.showAssignModal = true;
    this.loadAvailableDrivers(request);
  }

  loadAvailableDrivers(request: CabRequest): void {
    this.driversLoading = true;
    const params: any = {
      date: request.pickupTime,
      shift: request.shift
    };

    this.api.getAvailableCabDrivers(params).subscribe({
      next: (response: any) => {
        this.availableDrivers = response.data;
        this.driversLoading = false;
      },
      error: (error: any) => {
        this.error = error.message;
        this.driversLoading = false;
      }
    });
  }

  assignCab(): void {
    if (!this.selectedRequest || !this.selectedDriver) {
      return;
    }

    this.api.assignCabToRequest(this.selectedRequest._id, this.selectedDriver).subscribe({
      next: (response: any) => {
        this.showAssignModal = false;
        this.loadCabRequests();
      },
      error: (error: any) => {
        this.error = error.message;
      }
    });
  }

  approveRequest(request: CabRequest): void {
    if (confirm('Are you sure you want to approve this cab request?')) {
      this.api.approveFinanceCabRequest(request._id).subscribe({
        next: (response: any) => {
          this.loadCabRequests();
        },
        error: (error: any) => {
          this.error = error.message;
        }
      });
    }
  }
}