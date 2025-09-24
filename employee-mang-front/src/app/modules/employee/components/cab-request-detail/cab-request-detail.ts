import { Component } from '@angular/core';
import { CabRequest } from '../../../../core/models/cab.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../../../core/services/api';
import { 
   getEmployeeName, 
  getManagerName, 
  normalizeStatus,
  getDriverName,
  getDriverContact,
  getDriverAlternateContact,
  getDriverCarModel,
  getDriverCarNumber,
  getDriverLicenseNumber,
  getDriverCapacity,
  getDriverRating,
  getDriverCarColor,
  getDriverCurrentLocation,
  getDriverTotalTrips,
  replaceUnderscores
} from '../../../../../utils/type-utils';
@Component({
  selector: 'app-cab-request-detail',
  standalone: false,
  templateUrl: './cab-request-detail.html',
  styleUrl: './cab-request-detail.css'
})
export class CabRequestDetail {
cabRequest: CabRequest | null = null;
  isLoading = true;
  error = '';

getDriverCapacity = getDriverCapacity;
  // Make utility functions available to template
  getEmployeeName = getEmployeeName;
  getManagerName = getManagerName;
  normalizeStatus = normalizeStatus;
  getDriverName = getDriverName;
  getDriverContact = getDriverContact;
  getDriverCarModel = getDriverCarModel;
  getDriverCarNumber = getDriverCarNumber;
 replaceUnderscores = replaceUnderscores; 

getDriverAlternateContact = getDriverAlternateContact;

getDriverLicenseNumber = getDriverLicenseNumber;

getDriverRating = getDriverRating;
getDriverCarColor = getDriverCarColor;
getDriverCurrentLocation = getDriverCurrentLocation;
getDriverTotalTrips = getDriverTotalTrips;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api
  ) {}

  ngOnInit(): void {
    this.loadCabRequest();
  }

 loadCabRequest(): void {
  const id = this.route.snapshot.paramMap.get('id');
  console.log('Loading cab request with ID:', id);
  
  if (!id) {
    this.error = 'Invalid request ID';
    this.isLoading = false;
    return;
  }

  this.api.getCabRequest(id).subscribe({
    next: (response: any) => {
      console.log('API Response:', response);
      if (response.success && response.data) {
        this.cabRequest = response.data;
        console.log('Cab request loaded successfully:', this.cabRequest);
        
        // Debug: Check the cab driver data structure
        // if (this.cabRequest.cabDriverId) {
        //   console.log('Cab Driver Data:', this.cabRequest.cabDriverId);
        //   console.log('Cab Driver Name:', this.cabRequest.cabDriverId.name);
        //   console.log('Cab Driver Contact:', this.cabRequest.cabDriverId.contactNumber);
        // }
      } else {
        this.error = 'Cab request not found';
        console.log('Cab request not found in response');
      }
      this.isLoading = false;
    },
    error: (error: any) => {
      console.error('Error loading cab request:', error);
      this.error = error.message || 'Failed to load cab request';
      this.isLoading = false;
    }
  });
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

  canRequestCancellation(): boolean {
    return this.cabRequest?.status === 'cab_assigned';
  }

  // Retry loading if there was an error
  retryLoad(): void {
    this.isLoading = true;
    this.error = '';
    this.loadCabRequest();
  }
}