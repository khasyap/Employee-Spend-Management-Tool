import { Component } from '@angular/core';
import { CancellationCreateRequest } from '../../../../core/models/cab.model';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../../../core/services/api';

@Component({
  selector: 'app-cab-cancellation',
  standalone: false,
  templateUrl: './cab-cancellation.html',
  styleUrl: './cab-cancellation.css'
})
export class CabCancellation {
 isLoading: boolean = false;
  cancellationRequest: any = {
    cabRequestId: '',
    date: '', // Use string instead of Date object
    reason: '',
    requestType: 'both'
  };

  minDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
  error = '';
  success = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api
  ) {}

ngOnInit(): void {
  // Temporary: Hardcode for testing
  const id = this.route.snapshot.paramMap.get('id');
  
  if (id) {
    this.cancellationRequest.cabRequestId = id;
  } else {
    // For testing only - remove this in production
    this.cancellationRequest.cabRequestId = 'TEST_ID_123';
    console.warn('Using test ID - remove this in production');
  }
  
  console.log('cabRequestId:', this.cancellationRequest.cabRequestId);
  
  this.cancellationRequest.date = new Date().toISOString().split('T')[0];
}

  onSubmit(): void {
    this.isLoading = true;
    this.error = '';
    this.success = '';

    console.log('Submitting cancellation:', this.cancellationRequest);

    // Validate all fields are filled
    if (!this.cancellationRequest.cabRequestId || 
        !this.cancellationRequest.date || 
        !this.cancellationRequest.reason || 
        !this.cancellationRequest.requestType) {
      this.error = 'Please fill in all required fields';
      this.isLoading = false;
      return;
    }

    this.api.createCancellationRequest(this.cancellationRequest).subscribe({
      next: (response) => {
        this.success = 'Cancellation request submitted successfully!';
        this.isLoading = false;
        
        // Redirect to detail page after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/cab/detail', this.cancellationRequest.cabRequestId]);
        }, 2000);
      },
      error: (error) => {
        this.error = error.message || 'Failed to submit cancellation request';
        this.isLoading = false;
        console.error('Cancellation error:', error);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/cab/detail', this.cancellationRequest.cabRequestId]);
  }
}