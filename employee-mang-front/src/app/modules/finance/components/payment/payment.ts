import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Api } from '../../../../core/services/api';
import { ActivatedRoute, Router } from '@angular/router';
import { Claim } from '../../../../core/models/claim.model';
import * as QRCode from 'qrcode';



@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.html',
  styleUrls: ['./payment.css']

})
export class Payment implements OnInit {
  qrCodeImage: string = '';
paymentForm: FormGroup;
  claimId: string = '';
  claimDetails: any = null;
  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  selectedMethod: string = '';
  showUpiQr: boolean = false;
  upiQrValue: string = '';
  financeUser: any = null;
  loadingFinanceUser: boolean = false;
   employeePaymentDetails: any = null;
   loadingEmployeeDetails: boolean = false; 

  @ViewChild('qrcode', { static: false }) qrcodeElement!: ElementRef;

  paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' }
  ];

    // Default finance user details (fallback if API fails)
    defaultFinanceUser = {
      name: 'Finance Department',
      paymentDetails: {
        upiId: 'finance.department@upi',
        bankAccount: {
          accountNumber: '1234567890',
          bankName: 'Example Bank',
          ifscCode: 'EXMP0000123',
          accountHolderName: 'Finance Department'
        }
      }
    };

  constructor(
    private formBuilder: FormBuilder,
    private apiService: Api,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.paymentForm = this.formBuilder.group({
      paymentMethod: ['', Validators.required],
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      comment: ['']
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.claimId = params['id'];
      this.loadClaimDetails();
      this.loadFinanceUserDetails();
      this.loadClaimDetails();
    });

    // Watch for payment method changes
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      this.selectedMethod = method;
     if (method === 'upi' && this.getPaymentDetails()?.upiId) {
        setTimeout(() => this.generateQRCode(), 100);
      }
    });
  }
  

 ngAfterViewInit() {
    if (this.selectedMethod === 'upi' && this.getPaymentDetails()?.upiId) {
      setTimeout(() => this.generateQRCode(), 200);
    }
  }
   loadClaimDetails() {
    this.apiService.get<any>(`/finance/claims/${this.claimId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.claimDetails = response.data;
          // Load payment details after we have claim details
          this.loadFinanceUserDetails();
          this.loadEmployeePaymentDetails();
        } else {
          this.errorMessage = 'Failed to load claim details';
        }
      },
      error: (error) => {
        console.error('Error loading claim details:', error);
        this.errorMessage = 'Failed to load claim details';
      }
    });
  }

// In payment.ts - replace the loadFinanceUserDetails method
loadFinanceUserDetails() {
    this.loadingFinanceUser = true;
    
    this.apiService.get<any>('/finance/payment-details').subscribe({
      next: (response) => {
        this.loadingFinanceUser = false;
        if (response.success) {
          this.financeUser = response.data;
          
          if (this.selectedMethod === 'upi' && this.financeUser.paymentDetails?.upiId) {
            setTimeout(() => this.generateQRCode(), 100);
          }
        }
      },
      error: (error) => {
        this.loadingFinanceUser = false;
        console.error('Error loading finance user details:', error);
      }
    });
  }
  // Get finance user details, fallback to default if not available
  getFinanceUser() {
    return this.financeUser || this.defaultFinanceUser;
  }

  generateUpiQrValue(upiId: string, amount: number): string {
    // Format: upi://pay?pa=UPI_ID&pn=RECIPIENT_NAME&am=AMOUNT&cu=INR
    const recipientName = this.getFinanceUser()?.name || 'Finance Department';
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR`;
  }

async generateQRCode() {
    if (!this.qrcodeElement || this.selectedMethod !== 'upi') return;
    
    try {
      const paymentDetails = this.getPaymentDetails();
      if (!paymentDetails || !paymentDetails.upiId) return;
      
      const amount = this.claimDetails?.amount || 0;
      const recipientName = this.getRecipientName();
      const qrValue = `upi://pay?pa=${paymentDetails.upiId}&pn=${encodeURIComponent(recipientName)}&am=${amount}&cu=INR&tn=Claim ${this.claimId}`;
      
      this.qrcodeElement.nativeElement.innerHTML = '';
      
      await QRCode.toCanvas(this.qrcodeElement.nativeElement, qrValue, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      
      // Fallback to simple div representation
      this.qrcodeElement.nativeElement.innerHTML = `
        <div style="width:200px;height:200px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;">
          <div>QR Code Placeholder</div>
        </div>
      `;
    }
  }

  get f() { return this.paymentForm.controls; }
  getPaymentDetails() {
    // For paying the employee (when finance is sending money)
    if (this.selectedMethod === 'upi' || this.selectedMethod === 'bank_transfer') {
      return this.employeePaymentDetails?.paymentDetails;
    }
    
    // For receiving payment (when employee is paying finance)
    return this.financeUser?.paymentDetails;
  }

  getRecipientName() {
    if (this.selectedMethod === 'upi' || this.selectedMethod === 'bank_transfer') {
      return this.employeePaymentDetails?.name || 'Employee';
    }
    
    return this.financeUser?.name || 'Finance Department';
  }
 loadEmployeePaymentDetails() {
    if (!this.claimDetails || !this.claimDetails.employeeId) return;
    
    this.loadingEmployeeDetails = true;
    const employeeId = typeof this.claimDetails.employeeId === 'string' 
      ? this.claimDetails.employeeId 
      : this.claimDetails.employeeId._id;
    
    this.apiService.get<any>(`/finance/employee/${employeeId}/payment-details`).subscribe({
      next: (response) => {
        this.loadingEmployeeDetails = false;
        if (response.success) {
          this.employeePaymentDetails = response.data;
        }
      },
      error: (error) => {
        this.loadingEmployeeDetails = false;
        console.error('Error loading employee payment details:', error);
      }
    });
  }
  

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.paymentForm.invalid) {
      return;
    }

    this.loading = true;

    this.apiService.put<any>(`/finance/claims/${this.claimId}/pay`, this.paymentForm.value).subscribe({
      next: (response) => {
        if (response.success) {
          this.loading = false;
          this.submitted = false;
          this.successMessage = 'Payment processed successfully!';
          this.paymentForm.reset();
         
          // Redirect to validate claims after a delay
          setTimeout(() => {
            this.router.navigate(['/finance/validate']);
          }, 2000);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.message || 'Error processing payment. Please try again.';
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return 'bg-secondary';
      case 'approved_by_manager':
      case 'approved_by_finance':
      case 'sent_to_finance':
        return 'bg-success';
      case 'rejected_by_manager':
      case 'rejected_by_finance':
        return 'bg-danger';
      case 'escalated_to_admin':
        return 'bg-warning';
      case 'paid':
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  // Helper methods for safe property access
  getEmployeeName(claim: any): string {
    if (!claim || !claim.employeeId) return 'N/A';
    if (typeof claim.employeeId === 'string') return claim.employeeId;
    return claim.employeeId.name || 'N/A';
  }

  getCategoryName(claim: any): string {
    if (!claim || !claim.category) return 'N/A';
    if (typeof claim.category === 'string') return claim.category;
    return claim.category.name || 'N/A';
  }
}