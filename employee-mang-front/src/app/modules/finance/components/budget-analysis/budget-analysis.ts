import { Component, OnInit } from '@angular/core';
import { Api } from '../../../../core/services/api';
// interface BudgetAnalysiss {
//   category: string;
//   limit: number;
//   used: number;
//   remaining: number;
// }
interface BudgetAnalysiss {
  period: {
    month: number;
    year: number;
    startDate: Date;
    endDate: Date;
  };
  budgetAnalysis: {
    name: string;
    spent: number;  
    budget: number;
    percentage: number;
  }[];
  totals: {
    spent: number;
    budget: number;
    percentage: number;
  };
}
interface BudgetAnalysisItem {
  category: string;
  categoryId: string;
  limit: number;
  used: number;
  remaining: number;
  extraUsed: number;
  utilization: number;
  employeeUsage: EmployeeUsage[];
}

interface EmployeeUsage {
  employeeId: string;
  employeeName: string;
  used: number;
  percentage: number;
  extraUsed: number;
}
@Component({
  selector: 'app-budget-analysis',
  standalone: false,
  templateUrl: './budget-analysis.html',
  styleUrl: './budget-analysis.css'
})
export class BudgetAnalysis implements OnInit {
 budgetData: BudgetAnalysisItem[] = [];
  loading = true;
  fromDate: string = '';
  toDate: string = '';
  selectedCategory: string = '';

  constructor(private apiService: Api) {}

  ngOnInit() {
    this.loadBudgetAnalysis();
  }

// In budget-analysis.ts - update the loadBudgetAnalysis method
loadBudgetAnalysis() {
  this.loading = true;
  let endpoint = '/finance/budget-analysis';
  const params: any = {};

  if (this.fromDate) {
    params.from = this.fromDate;
  }
  if (this.toDate) {
    params.to = this.toDate;
  }
  if (this.selectedCategory) {
    params.category = this.selectedCategory;
  }

  console.log('API Request:', { endpoint, params });

  this.apiService.get<BudgetAnalysisItem[]>(endpoint, params).subscribe({
    next: (response) => {
      console.log('API Response:', response);
      if (response.success) {
        this.budgetData = response.data;
        console.log('Budget Data:', this.budgetData);
      } else {
        console.error('Failed to load budget analysis:', response);
        this.budgetData = [];
      }
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading budget analysis:', error);
      this.loading = false;
      this.budgetData = [];
    }
  });
}
  getTotalLimit(): number {
    return this.budgetData.reduce((sum, item) => sum + (item.limit || 0), 0);
  }

  getTotalUsed(): number {
    return this.budgetData.reduce((sum, item) => sum + (item.used || 0), 0);
  }

  getTotalRemaining(): number {
    return this.budgetData.reduce((sum, item) => sum + (item.remaining || 0), 0);
  }

  getTotalExtraUsed(): number {
    return this.budgetData.reduce((sum, item) => sum + (item.extraUsed || 0), 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  getUsagePercentage(used: number, limit: number): number {
    return limit > 0 ? Math.round((used / limit) * 100) : 0;
  }

  getProgressBarClass(percentage: number): string {
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-success';
  }

  onFilter() {
    this.loadBudgetAnalysis();
  }

  resetFilter() {
    this.fromDate = '';
    this.toDate = '';
    this.selectedCategory = '';
    this.loadBudgetAnalysis();
  }

  hasEmployeeUsage(): boolean {
    return this.budgetData.some(item => item.employeeUsage && item.employeeUsage.length > 0);
  }
}