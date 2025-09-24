import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerDashboard } from './components/manager-dashboard/manager-dashboard';
import { ReviewClaims } from './components/review-claims/review-claims';
import { Notifications } from './components/notifications/notifications';
import { Reports } from './components/reports/reports';
import { Navbar } from './components/navbar/navbar';
import { ManagerCabRequests } from './components/manager-cab-requests/manager-cab-requests';

const routes: Routes = [
{
    path: '',
    component: Navbar,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ManagerDashboard },
      { path: 'review', component: ReviewClaims },
      {path:'cab',component:ManagerCabRequests},
      { path: 'notifications', component: Notifications },
      { path: 'reports', component: Reports }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule { }
