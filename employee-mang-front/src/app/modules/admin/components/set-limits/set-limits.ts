import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Category } from '../../../../core/models/category.model';
import { Api } from '../../../../core/services/api';
import { Settings } from '../../../../core/models/settings.model';
import { SettingsService } from '../../../../core/services/settings.service';
interface Employee {
  _id: string;
  name: string;
  email: string;
}
interface EmployeeLimit {
  employeeId: string;   // match `_id` from Employee
  amount: number;       // match form + settings
}

interface MonthlyLimit {
  categoryId: string;
  amount: number;
  employeeLimits?: EmployeeLimit[];
}

@Component({
  selector: 'app-set-limits',
  standalone: false,
  templateUrl: './set-limits.html',
  styleUrl: './set-limits.css'
})
export class SetLimits implements OnInit {
  settingsForm: FormGroup;
  categories: Category[] = [];
  employees: Employee[] = [];
  loading = false;  
  submitted = false;
  successMessage = '';
originalSettings: any = null;
  constructor(
    private formBuilder: FormBuilder,
    private apiService: Api,
    private settingsService: SettingsService
  ) {
    this.settingsForm = this.formBuilder.group({
    perClaimLimitByRole: this.formBuilder.group({
      employee: [0, [Validators.required, Validators.min(0)]],
      manager: [0, [Validators.required, Validators.min(0)]],
      finance: [0, [Validators.required, Validators.min(0)]]
    }),
    monthlyLimitByCategory: this.formBuilder.array([])
  });
  }

  ngOnInit() {
    this.loadSettings();
    this.loadCategories();
    this.loadEmployees();
  }
   get f() { 
    return this.settingsForm.controls; 
  }


  get monthlyLimits(): FormArray {
    return this.settingsForm.get('monthlyLimitByCategory') as FormArray;
  }



 loadSettings() {
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.originalSettings = JSON.parse(JSON.stringify(settings));
        this.populateForm(settings);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
      }
    });
  }
  loadCategories() {
    this.apiService.get<Category[]>('/admin/categories').subscribe({
      next: (response) => {
        if (response.success) {
          this.categories = response.data;
          this.initializeMonthlyLimits();
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }
 get availableCategories(): Category[] {
    const selectedCategoryIds = this.monthlyLimits.controls.map(
      control => control.get('categoryId')?.value
    ).filter(id => id);
    
    return this.categories.filter(
      category => !selectedCategoryIds.includes(category._id)
    );
  }

  loadEmployees() {
    this.apiService.get<Employee[]>('/admin/users?role=employee').subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      }
    });
  }
   addCategoryLimit(category: Category) {
    const categoryGroup = this.formBuilder.group({
      categoryId: [category._id, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      employeeLimits: this.formBuilder.array([])
    });
    
    this.monthlyLimits.push(categoryGroup);
  }
addNewCategoryLimit() {
    const categoryGroup = this.formBuilder.group({
      categoryId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      employeeLimits: this.formBuilder.array([])
    });
    
    this.monthlyLimits.push(categoryGroup);
  }
   removeCategoryLimit(index: number) {
    this.monthlyLimits.removeAt(index);
  }
  initializeMonthlyLimits() {
    if (this.categories.length > 0 && this.monthlyLimits.length === 0) {
      this.categories.forEach(category => {
        const categoryGroup = this.formBuilder.group({
          categoryId: [category._id, Validators.required],
          amount: [0, [Validators.required, Validators.min(0)]],
          employeeLimits: this.formBuilder.array([])
        });
        this.monthlyLimits.push(categoryGroup);
      });
    }
  }

  populateForm(settings: Settings) {
    if (!settings) return;

    // Set per claim limits
    if (settings.perClaimLimitByRole) {
      this.settingsForm.patchValue({
        perClaimLimitByRole: settings.perClaimLimitByRole
      });
    }

    // Clear existing monthly limits
    while (this.monthlyLimits.length !== 0) {
      this.monthlyLimits.removeAt(0);
    }

    // Add monthly limits from settings
    if (settings.monthlyLimitByCategory) {
      settings.monthlyLimitByCategory.forEach(limit => {
        const categoryGroup = this.formBuilder.group({
          categoryId: [limit.categoryId, Validators.required],
          amount: [limit.amount, [Validators.required, Validators.min(0)]],
          employeeLimits: this.formBuilder.array([])
        });

        // Add employee limits
        if (limit.employeeLimits && limit.employeeLimits.length > 0) {
          const employeeLimitsArray = categoryGroup.get('employeeLimits') as FormArray;
          limit.employeeLimits.forEach((empLimit: EmployeeLimit) => {
            employeeLimitsArray.push(this.formBuilder.group({
              employeeId: [empLimit.employeeId, Validators.required],
              amount: [empLimit.amount, [Validators.required, Validators.min(0)]]
            }));
          });
        }

        this.monthlyLimits.push(categoryGroup);
      });
    }
  }


  addEmployeeLimit(categoryIndex: number) {
    const employeeLimitsArray = this.employeeLimits(categoryIndex);
    employeeLimitsArray.push(this.formBuilder.group({
      employeeId: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]]
    }));
  }
 employeeLimits(categoryIndex: number): FormArray {
    return this.monthlyLimits.at(categoryIndex).get('employeeLimits') as FormArray;
  }
  removeEmployeeLimit(categoryIndex: number, employeeIndex: number) {
    const employeeLimitsArray = this.employeeLimits(categoryIndex);
    employeeLimitsArray.removeAt(employeeIndex);
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c._id === categoryId);
    return category ? category.name : 'Unknown Category';
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees.find(e => e._id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  }
 isCategoryAlreadySelected(categoryId: string, currentIndex: number): boolean {
    for (let i = 0; i < this.monthlyLimits.length; i++) {
      if (i !== currentIndex && this.monthlyLimits.at(i).get('categoryId')?.value === categoryId) {
        return true;
      }
    }
    return false;
  }
  onCategoryChange(index: number) {
    // You can add any logic needed when a category is selected
    console.log('Category changed:', this.monthlyLimits.at(index).get('categoryId')?.value);
  }

   cancelChanges() {
    if (this.originalSettings) {
      // Clear existing monthly limits
      while (this.monthlyLimits.length !== 0) {
        this.monthlyLimits.removeAt(0);
      }
      
      this.populateForm(this.originalSettings);
      this.successMessage = 'Changes reverted successfully.';
    }
  }
onSubmit() {
  this.submitted = true;
  this.successMessage = '';

  if (this.settingsForm.invalid) {
    const firstErrorElement = document.querySelector('.is-invalid');
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  this.loading = true;
  const settingsData = this.settingsForm.value;
  
  // Add debug logging
  console.log('Submitting settings data:', JSON.stringify(settingsData, null, 2));

  this.settingsService.updateSettings(settingsData).subscribe({
    next: (updatedSettings) => {
      this.loading = false;
      this.submitted = false;
      this.successMessage = 'Settings updated successfully!';
      
      this.originalSettings = JSON.parse(JSON.stringify(updatedSettings));
      this.populateForm(updatedSettings);
    },
    error: (error) => {
      this.loading = false;
      console.error('Error updating settings:', error);
      console.error('Error details:', error.message);
      this.successMessage = 'Error updating settings. Please try again.';
    }
  });
}
}