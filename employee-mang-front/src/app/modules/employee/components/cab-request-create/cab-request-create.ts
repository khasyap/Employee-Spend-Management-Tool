import { Component } from '@angular/core';
import { CabRequestCreateRequest } from '../../../../core/models/cab.model';
import { Api } from '../../../../core/services/api';
import { Auth } from '../../../../core/services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cab-request-create',
  standalone: false,
  templateUrl: './cab-request-create.html',
  styleUrls: ['./cab-request-create.css']
})
export class CabRequestCreate {
  request: CabRequestCreateRequest = {
    requestType: 'daily',
    description: '',
    pickupLocation: '',
    dropLocation: '',
    pickupTime: new Date(), // Use Date object
    shift: 'morning',
    isAirportTrip: false
  };

  minDate: string = '';
  pickupTimeString: string = '';
  returnTimeString: string = '';
  isLoading = false;
  error = '';
  success = '';

  constructor(
    private api: Api,
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set minimum date to current date/time in correct format
    const now = new Date();
    this.minDate = this.formatDateForInput(now);
    
    // Set default pickup time to next hour
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    this.pickupTimeString = this.formatDateForInput(nextHour);
  }

  // Convert Date to string for datetime-local input (YYYY-MM-DDTHH:mm)
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Convert string from input to Date object
  parseInputDate(dateString: string): Date {
    return new Date(dateString);
  }

  onSubmit(): void {
    // Check if form is valid
    if (!this.isFormValid()) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.success = '';

    // For daily service, set default locations if not provided
    if (this.request.requestType === 'daily') {
      if (!this.request.pickupLocation.trim()) {
        this.request.pickupLocation = 'Company Office';
      }
      if (!this.request.dropLocation.trim()) {
        this.request.dropLocation = 'Company Office';
      }
    }

    // Convert string dates to Date objects for API
    const apiRequest = {
      ...this.request,
      pickupTime: this.parseInputDate(this.pickupTimeString),
      returnTime: this.returnTimeString ? this.parseInputDate(this.returnTimeString) : undefined,
      flightDetails: this.request.isAirportTrip ? this.request.flightDetails : undefined
    };

    this.api.createCabRequest(apiRequest).subscribe({
      next: (response: any) => {
        this.success = 'Cab request submitted successfully!';
        this.isLoading = false;
        
        setTimeout(() => {
          this.router.navigate(['/employee/cab-requests']);
        }, 2000);
      },
      error: (error: any) => {
        this.error = error.message || 'Failed to submit cab request';
        this.isLoading = false;
      }
    });
  }

  onRequestTypeChange(): void {
    if (this.request.requestType === 'daily') {
      this.request.isAirportTrip = false;
      this.request.flightDetails = undefined;
    }
  }

  onAirportTripChange(): void {
    if (this.request.isAirportTrip) {
      if (!this.request.flightDetails) {
        this.request.flightDetails = {
          flightNumber: '',
          airline: ''
        };
      }
    } else {
      this.request.flightDetails = undefined;
    }
  }

  isFormValid(): boolean {
    if (!this.request.requestType) return false;
    if (!this.request.pickupLocation?.trim()) return false;
    if (!this.request.dropLocation?.trim()) return false;
    if (!this.pickupTimeString) return false;
    if (!this.request.description?.trim()) return false;
    
    if (this.request.requestType === 'daily' && !this.request.shift) return false;
    
    return true;
  }

  getMinReturnTime(): string {
    if (!this.pickupTimeString) return this.minDate;
    return this.pickupTimeString;
  }
}