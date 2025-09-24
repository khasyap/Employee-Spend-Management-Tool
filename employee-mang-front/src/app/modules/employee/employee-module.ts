import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmployeeRoutingModule } from './employee-routing-module';
import { EmployeeDashboard } from './components/employee-dashboard/employee-dashboard';
import { RaiseClaim } from './components/raise-claim/raise-claim';
import { UploadBill } from './components/upload-bill/upload-bill';
import { OrderServices } from './components/order-services/order-services';
import { TrackClaims } from './components/track-claims/track-claims';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Navbar } from './components/navbar/navbar';
import { CabReuestList } from './components/cab-reuest-list/cab-reuest-list';
import { CabRequestCreate } from './components/cab-request-create/cab-request-create';
import { CabRequestDetail } from './components/cab-request-detail/cab-request-detail';
import { CabCancellation } from './components/cab-cancellation/cab-cancellation';
import { CabPath } from './components/cab-path/cab-path';


@NgModule({
  declarations: [
    EmployeeDashboard,
    RaiseClaim,
    UploadBill,
    OrderServices,
    TrackClaims,
    Navbar,
    CabReuestList,
    CabRequestCreate,
    CabRequestDetail,
    CabCancellation,
    CabPath
  ],
  imports: [
    CommonModule,
    EmployeeRoutingModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class EmployeeModule { }
