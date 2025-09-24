// Individual employee limit
export interface EmployeeLimit {
  employeeId: string;   // corresponds to Employee._id
  amount: number; 
  employee?: any;       // monthly limit for that employee
}

// Monthly limit by category
// Update the MonthlyLimit interface to include budget validation
export interface MonthlyLimit {
  categoryId: string;
  amount: number;
  category?: any;
  employeeLimits?: EmployeeLimit[];
  // Add these for budget tracking
  usedAmount?: number;
  remainingAmount?: number;
  isOverBudget?: boolean;
}
// Main settings model
export interface Settings {
  _id: string;
  perClaimLimitByRole: {
    employee: number;
    manager: number;
    finance: number;
  };
  monthlyLimitByCategory: MonthlyLimit[];
  createdAt: Date;
  updatedAt: Date;
}
