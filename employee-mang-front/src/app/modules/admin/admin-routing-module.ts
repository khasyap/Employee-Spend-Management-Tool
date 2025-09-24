import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { ManageUsers } from './components/manage-users/manage-users';
import { SetLimits } from './components/set-limits/set-limits';
import { Categories } from './components/categories/categories';
import { Navbar } from './components/navbar/navbar';
import { VerifyClaim } from './components/verify-claim/verify-claim';
import { AdminCabRequests } from './components/admin-cab-requests/admin-cab-requests';

const routes: Routes = [
   {
    path: '',
    component: Navbar,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboard },
      {path:'manage',component:VerifyClaim},
      {path:'cab',component:AdminCabRequests},
      { path: 'manage-users', component: ManageUsers },
      { path: 'set-limits', component: SetLimits },
      { path: 'categories', component: Categories }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
