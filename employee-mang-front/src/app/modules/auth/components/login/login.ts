import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
   loginForm: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: Auth
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.login(this.f['email'].value, this.f['password'].value)
      .subscribe({
        next: () => {
          this.redirectBasedOnRole();
        },
        error: (error) => {
          this.error = error.message || 'Login failed. Please try again.';
          this.loading = false;
          console.error('Login error:', error);
        }
      });
  }

  private redirectBasedOnRole() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
    
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      switch (user.role) {
        case 'admin':
          this.router.navigate(['/admin']);
          break;
        case 'manager':
          this.router.navigate(['/manager']);
          break;
        case 'finance':
          this.router.navigate(['/finance']);
          break;
        case 'employee':
          this.router.navigate(['/employee']);
          break;
        default:
          this.router.navigate(['/auth/login']);
      }
    }
  }
}