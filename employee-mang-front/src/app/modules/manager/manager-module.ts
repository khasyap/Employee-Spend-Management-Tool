import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ManagerRoutingModule } from './manager-routing-module';
import { ManagerDashboard } from './components/manager-dashboard/manager-dashboard';
import { ReviewClaims } from './components/review-claims/review-claims';
import { Notifications } from './components/notifications/notifications';
import { Reports } from './components/reports/reports';
import { ApprovedBills } from './components/approved-bills/approved-bills';
import { RejectedBills } from './components/rejected-bills/rejected-bills';
import { PendingBills } from './components/pending-bills/pending-bills';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Navbar } from './components/navbar/navbar';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { ManagerCabRequests } from './components/manager-cab-requests/manager-cab-requests';


@NgModule({
  declarations: [
    ManagerDashboard,
    ReviewClaims,
    Notifications,
    Reports,
    ApprovedBills,
    RejectedBills,
    PendingBills,
    Navbar,
    ManagerCabRequests
  ],
  imports: [
    CommonModule,
    ManagerRoutingModule,
    ReactiveFormsModule,
    FormsModule,
NgxChartsModule
  ]
})
export class ManagerModule { }
