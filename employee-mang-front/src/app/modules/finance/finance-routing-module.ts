import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceDashboard } from './components/finance-dashboard/finance-dashboard';
import { ValidateClaims } from './components/validate-claims/validate-claims';
import { BudgetAnalysis } from './components/budget-analysis/budget-analysis';
import { FinanceReports } from './components/finance-reports/finance-reports';
import { Payment } from './components/payment/payment';
import { Navbar } from './components/navbar/navbar';
import { Notificationat } from './components/notificationat/notificationat';
import { FinanceCabRequests } from './components/finance-cab-requests/finance-cab-requests';

const routes: Routes = [
 {
    path: '',
    component: Navbar,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: FinanceDashboard },
      {path:'notifications',component:Notificationat},
      { path: 'validate', component: ValidateClaims },
      {path:'cab',component:FinanceCabRequests},
      { path: 'budget-analysis', component: BudgetAnalysis },
      { path: 'finreports', component: FinanceReports },
      { path: 'payment/:id', component: Payment }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule { }
