import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, UserCreateRequest } from '../../../../core/models/user.model';
import { Api } from '../../../../core/services/api';


@Component({
  selector: 'app-manage-users',
  standalone: false,
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css'
})
export class ManageUsers implements OnInit {
userForm: FormGroup;
  users: User[] = [];
  managers: User[] = [];
  financeUsers: User[] = [];
  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private apiService: Api
  ) {
    this.userForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['employee', Validators.required],
      managerId: [''],
      financeId: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadManagers();
    this.loadFinanceUsers();
    
    // Watch role changes to update form validation
    this.userForm.get('role')?.valueChanges.subscribe(role => {
      this.updateFormValidation(role);
    });
  }

  updateFormValidation(role: string) {
    const managerIdControl = this.userForm.get('managerId');
    const financeIdControl = this.userForm.get('financeId');
    
    if (role === 'employee') {
      managerIdControl?.setValidators([Validators.required]);
      financeIdControl?.setValidators([Validators.required]);
    } else if (role === 'manager') {
      managerIdControl?.clearValidators();
      financeIdControl?.setValidators([Validators.required]);
    } else {
      managerIdControl?.clearValidators();
      financeIdControl?.clearValidators();
    }
    
    managerIdControl?.updateValueAndValidity();
    financeIdControl?.updateValueAndValidity();
  }

  loadUsers() {
    this.apiService.get<User[]>('/admin/users').subscribe({
      next: (response) => {
        this.users = response.data || [];
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Failed to load users: ' + error.message;
        this.users = [];
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  loadManagers() {
    this.apiService.get<User[]>('/admin/users?role=manager').subscribe({
      next: (response) => {
        this.managers = response.data || [];
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.managers = [];
      }
    });
  }

  loadFinanceUsers() {
    this.apiService.get<User[]>('/admin/users?role=finance').subscribe({
      next: (response) => {
        this.financeUsers = response.data || [];
      },
      error: (error) => {
        console.error('Error loading finance users:', error);
        this.financeUsers = [];
      }
    });
  }

  get f() { return this.userForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.userForm.invalid) {
      return;
    }

    this.loading = true;
    const userData: UserCreateRequest = this.userForm.value;

    this.apiService.post<User>('/admin/users', userData).subscribe({
      next: (response) => {
        this.loading = false;
        this.submitted = false;
        this.userForm.reset({ role: 'employee' });
        this.successMessage = 'User created successfully!';
        this.loadUsers(); // Reload the user list
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error creating user:', error);
        this.errorMessage = 'Error creating user: ' + error.message;
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  toggleUserStatus(user: User) {
    const update = { isActive: !user.isActive };
    this.apiService.put<User>(`/admin/users/${user._id}`, update).subscribe({
      next: (response) => {
        // Update the user in the local array instead of reloading all users
        const index = this.users.findIndex(u => u._id === user._id);
        if (index !== -1) {
          this.users[index].isActive = response.data.isActive;
        }
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.errorMessage = 'Error updating user: ' + error.message;
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }
}