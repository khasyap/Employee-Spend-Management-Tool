import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Category } from '../../../../core/models/category.model';
import { Api } from '../../../../core/services/api';
import { ClaimCreateRequest } from '../../../../core/models/claim.model';
import { Router } from '@angular/router';
import { Auth } from '../../../../core/services/auth';
@Component({
  selector: 'app-raise-claim',
  standalone: false,
  templateUrl: './raise-claim.html',
  styleUrl: './raise-claim.css'
})
export class RaiseClaim implements OnInit {
 claimForm: FormGroup;
  categories: Category[] = [];
  loading = false;
  submitted = false;
  successMessage = '';
  selectedFile: File | null = null;
  errorMessage = '';
  ocrData: any = null;
  categoriesLoading = true;
  categoriesError = '';
  ocrLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private apiService: Api,
    private router: Router
  ) {
    this.claimForm = this.formBuilder.group({
      category: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      billDate: ['']
    });
  }
  // In your Angular components - update getManagerName method
getManagerName(claim: any): string {
  if (!claim || !claim.managerId) return 'N/A (Direct to Finance)';
  if (typeof claim.managerId === 'string') return claim.managerId;
  return claim.managerId.name || 'N/A';
}

  ngOnInit() {
    console.log('RaiseClaim Component Initialized');
    this.checkAuthentication();
    this.loadCategories();
    
    // Check if there's extracted data from upload bill
    const extractedData = localStorage.getItem('extractedBillData');
    if (extractedData) {
      this.ocrData = JSON.parse(extractedData);
      this.prefillForm();
      localStorage.removeItem('extractedBillData');
    }
  }
 prefillForm() {
    if (this.ocrData) {
      this.claimForm.patchValue({
        amount: this.ocrData.amount,
        description: `Expense at ${this.ocrData.vendor} on ${new Date(this.ocrData.date).toLocaleDateString()}`,
        billDate: this.formatDate(this.ocrData.date)
      });
    }
  }
  checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.categoriesError = 'Not authenticated. Please login first.';
      this.categoriesLoading = false;
      console.error('No JWT token found in localStorage');
    }
  }

  // raise-claim.ts - Fix the filter callback
loadCategories() {
  this.categoriesLoading = true;
  this.categoriesError = '';
  
  this.apiService.get<Category[]>('/employee/categories').subscribe({
    next: (response) => {
      if (response.success && response.data) {
        this.categories = response.data.filter((c: Category) => c.isActive); // Add type annotation
        if (this.categories.length === 0) {
          this.categoriesError = 'No active categories available. Please contact administrator.';
        }
      } else {
        this.categoriesError = 'Invalid response format from server';
      }
      this.categoriesLoading = false;
    },
    error: (error) => {
      this.categoriesError = error.message || 'Failed to load categories. Please try again.';
      this.categoriesLoading = false;
    }
  });
}
  get f() { 
    return this.claimForm.controls; 
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size must be less than 5MB';
        event.target.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Only JPG, PNG, and PDF files are allowed';
        event.target.value = '';
        return;
      }
      
      this.selectedFile = file;
      this.errorMessage = '';
      console.log('File selected:', file.name);
      
      // Extract OCR data from the bill
      this.extractOcrData(file);
    }
  }

  extractOcrData(file: File) {
    this.ocrLoading = true;
    const formData = new FormData();
    formData.append('file', file);
    
    this.apiService.postFormData<any>('/employee/ocr/extract', formData).subscribe({
      next: (response) => {
        this.ocrLoading = false;
        if (response.success) {
          this.ocrData = response.data;
          this.prefillForm();
        }
      },
      error: (error) => {
        this.ocrLoading = false;
        console.error('OCR extraction error:', error);
        this.errorMessage = 'Failed to extract data from bill. Please enter details manually.';
      }
    });
  }

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    console.log('Form submitted:', this.claimForm.value);
    console.log('Form valid:', this.claimForm.valid);

    if (this.claimForm.invalid) {
      console.log('Form is invalid. Errors:', this.claimForm.errors);
      Object.keys(this.claimForm.controls).forEach(key => {
        const control = this.claimForm.get(key);
        if (control?.errors) {
          console.log(`Control ${key} errors:`, control.errors);
        }
      });
      return;
    }

    this.loading = true;
    const formData = new FormData();
    
    // Add form data
    formData.append('category', this.claimForm.get('category')?.value);
    formData.append('amount', this.claimForm.get('amount')?.value);
    formData.append('description', this.claimForm.get('description')?.value);
    
    if (this.claimForm.get('billDate')?.value) {
      formData.append('billDate', this.claimForm.get('billDate')?.value);
    }
    
    // Add file if selected
    if (this.selectedFile) {
      formData.append('bill', this.selectedFile);
    }

    console.log('Submitting form data...');
    
    this.apiService.postFormData<any>('/employee/claims', formData).subscribe({
      next: (response) => {
        console.log('Claim submission successful:', response);
        this.loading = false;
        this.submitted = false;
        this.successMessage = 'Claim submitted successfully!';
        
        // Redirect to track claims after a short delay
        setTimeout(() => {
          this.router.navigate(['/employee/track-claims']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error submitting claim:', error);
        this.loading = false;
        this.errorMessage = error.message || 'Error submitting claim. Please try again.';
      }
    });
  }

  useOcrData() {
    if (this.ocrData) {
      console.log('Using OCR data:', this.ocrData);
      this.claimForm.patchValue({
        amount: this.ocrData.amount,
        description: `Expense at ${this.ocrData.vendor} on ${new Date(this.ocrData.date).toLocaleDateString()}`,
        billDate: this.formatDate(this.ocrData.date)
      });
    }
  }

  formatDate(date: Date): string {
    if (!date) return '';
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  reloadCategories() {
    console.log('Reloading categories...');
    this.loadCategories();
  }
}