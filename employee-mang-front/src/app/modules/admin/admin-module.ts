import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing-module';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { ManageUsers } from './components/manage-users/manage-users';
import { SetLimits } from './components/set-limits/set-limits';
import { Categories } from './components/categories/categories';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Navbar } from './components/navbar/navbar';
import { Notification } from './components/notification/notification';
import { VerifyClaim } from './components/verify-claim/verify-claim';
import { AdminCabRequests } from './components/admin-cab-requests/admin-cab-requests';


@NgModule({
  declarations: [
    AdminDashboard,
    ManageUsers,
    SetLimits,
    Categories,
    Navbar,
    Notification,
    VerifyClaim,
    AdminCabRequests
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class AdminModule { }
