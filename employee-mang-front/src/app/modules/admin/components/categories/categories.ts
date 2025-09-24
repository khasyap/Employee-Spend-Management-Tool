import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Category } from '../../../../core/models/category.model';
import { Api } from '../../../../core/services/api';

@Component({
  selector: 'app-categories',
  standalone: false,
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories implements OnInit{
  categoryForm: FormGroup;
  categories: Category[] = [];
  loading = false;
  submitted = false;
  successMessage = '';
  editingCategory: Category | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private apiService: Api
  ) {
    this.categoryForm = this.formBuilder.group({
      name: ['', Validators.required],
      code: ['', [Validators.required, Validators.maxLength(3)]]
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.apiService.get<Category[]>('/admin/categories').subscribe({
      next: (response) => {
        this.categories = response.data;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  get f() { return this.categoryForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';

    if (this.categoryForm.invalid) {
      return;
    }

    this.loading = true;

    if (this.editingCategory) {
      this.updateCategory();
    } else {
      this.createCategory();
    }
  }

  createCategory() {
    this.apiService.post<Category>('/admin/categories', this.categoryForm.value).subscribe({
      next: (response) => {
        this.handleSuccess('Category created successfully!');
        this.categories.push(response.data);
      },
      error: (error) => {
        this.handleError(error, 'Error creating category');
      }
    });
  }

  updateCategory() {
    if (!this.editingCategory) return;

    this.apiService.put<Category>(`/admin/categories/${this.editingCategory._id}`, this.categoryForm.value).subscribe({
      next: (response) => {
        this.handleSuccess('Category updated successfully!');
        const index = this.categories.findIndex(c => c._id === this.editingCategory!._id);
        if (index !== -1) {
          this.categories[index] = response.data;
        }
      },
      error: (error) => {
        this.handleError(error, 'Error updating category');
      }
    });
  }

  editCategory(category: Category) {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      code: category.code
    });
  }

  cancelEdit() {
    this.editingCategory = null;
    this.categoryForm.reset();
    this.submitted = false;
  }

  toggleCategoryStatus(category: Category) {
    const update = { isActive: !category.isActive };
    this.apiService.put<Category>(`/admin/categories/${category._id}`, update).subscribe({
      next: (response) => {
        category.isActive = response.data.isActive;
      },
      error: (error) => {
        console.error('Error updating category:', error);
      }
    });
  }

  private handleSuccess(message: string) {
    this.loading = false;
    this.submitted = false;
    this.successMessage = message;
    this.categoryForm.reset();
    this.editingCategory = null;
  }

  private handleError(error: any, defaultMessage: string) {
    this.loading = false;
    console.error(defaultMessage, error);
  }
}