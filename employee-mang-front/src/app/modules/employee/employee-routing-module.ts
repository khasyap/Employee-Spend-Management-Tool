import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmployeeDashboard } from './components/employee-dashboard/employee-dashboard';
import { RaiseClaim } from './components/raise-claim/raise-claim';
import { UploadBill } from './components/upload-bill/upload-bill';
import { OrderServices } from './components/order-services/order-services';
import { TrackClaims } from './components/track-claims/track-claims';
import { Navbar } from './components/navbar/navbar';
import { CabPath } from './components/cab-path/cab-path';
import { CabCancellation } from './components/cab-cancellation/cab-cancellation';
import { CabRequestCreate } from './components/cab-request-create/cab-request-create';
import { CabRequestDetail } from './components/cab-request-detail/cab-request-detail';
import { CabReuestList } from './components/cab-reuest-list/cab-reuest-list';

const routes: Routes = [
  {
    path: '',
    component: Navbar,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: EmployeeDashboard },
      { path: 'raise-claim', component: RaiseClaim },
      { path: 'upload-bill', component: UploadBill },

    {
  path: 'cab',
  component: CabPath,
  children: [
    { path: 'cancel/:id', component: CabCancellation }, // ✅ Make sure it has :id parameter
    { path: 'create', component: CabRequestCreate },
    { path: 'detail/:id', component: CabRequestDetail },
    { path: 'list', component: CabReuestList },
  ]
},

      { path: 'order-services', component: OrderServices },
      { path: 'track-claims', component: TrackClaims }
    ]
  }
];



@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmployeeRoutingModule { }
