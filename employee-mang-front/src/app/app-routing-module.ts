import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { employeeGuard } from './guards/employee-guard';
import { managerGuard } from './guards/manager-guard';
import { financeGuard } from './guards/finance-guard';

const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { 
    path: 'auth', 
    loadChildren: () => import('./modules/auth/auth-module').then(m => m.AuthModule) 
  },
  { 
    path: 'admin', 
    canActivate: [authGuard, adminGuard],
    loadChildren: () => import('./modules/admin/admin-module').then(m => m.AdminModule) 
  },
  { 
    path: 'employee', 
    canActivate: [authGuard, employeeGuard],
    loadChildren: () => import('./modules/employee/employee-module').then(m => m.EmployeeModule) 
  },
  { 
    path: 'manager', 
    canActivate: [authGuard, managerGuard],
    loadChildren: () => import('./modules/manager/manager-module').then(m => m.ManagerModule) 
  },
  { 
    path: 'finance', 
    canActivate: [authGuard, financeGuard],
    loadChildren: () => import('./modules/finance/finance-module').then(m => m.FinanceModule) 
  },
  { path: '**', redirectTo: '/auth/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
