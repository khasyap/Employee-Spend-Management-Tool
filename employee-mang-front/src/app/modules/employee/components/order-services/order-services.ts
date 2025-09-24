import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Api } from '../../../../core/services/api';

@Component({
  selector: 'app-order-services',
  standalone: false,
  templateUrl: './order-services.html',
  styleUrl: './order-services.css'
})
export class OrderServices implements OnInit {
  orderForm: FormGroup;
  loading = false;
  submitted = false;
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private apiService: Api
  ) {
    this.orderForm = this.formBuilder.group({
      item: ['', Validators.required],
      vendor: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      description: ['']
    });
  }

  ngOnInit() {}

  get f() { return this.orderForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';

    if (this.orderForm.invalid) {
      return;
    }

    this.loading = true;

    this.apiService.post<any>('/employee/orders', this.orderForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        this.submitted = false;
        this.successMessage = 'Service order submitted successfully!';
        this.orderForm.reset();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error submitting order:', error);
      }
    });
  }
}