import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FinanceRoutingModule } from './finance-routing-module';
import { FinanceDashboard } from './components/finance-dashboard/finance-dashboard';
import { ValidateClaims } from './components/validate-claims/validate-claims';
import { Payment } from './components/payment/payment';
import { FinanceReports } from './components/finance-reports/finance-reports';
import { ApprovedBills } from './components/approved-bills/approved-bills';
import { RejectedBills } from './components/rejected-bills/rejected-bills';
import { PendingBills } from './components/pending-bills/pending-bills';
import { BudgetAnalysis } from './components/budget-analysis/budget-analysis';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserDisplayPipe } from './components/user-display.pipe';
import { CategoryDisplayPipe } from './components/category-display.pipe';
import { Notificationat } from './components/notificationat/notificationat';
import { Navbar } from './components/navbar/navbar';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { FinanceCabRequests } from './components/finance-cab-requests/finance-cab-requests';


@NgModule({
  declarations: [
    FinanceDashboard,
    ValidateClaims,
    Payment,
    FinanceReports,
    ApprovedBills,
    RejectedBills,
    PendingBills,
    BudgetAnalysis,
    Notificationat,
    Navbar,
    FinanceCabRequests
  ],
  imports: [
    CommonModule,
    FinanceRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxChartsModule,
    
  ]
})
export class FinanceModule { }
