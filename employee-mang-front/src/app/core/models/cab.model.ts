export interface CabDriver {
  _id: string;
  name: string;
  contactNumber: string;
  alternateContact?: string;
  licenseNumber: string;
  carModel: string;
  carNumber: string;
  carColor?: string;
  capacity: number;
  isAvailable: boolean;
  currentLocation?: string;
  rating: number;
  totalTrips: number;
}

export interface CabRequest {
  _id: string;
  employeeId: string | { _id: string; name: string; email: string };
  managerId?: string | { _id: string; name: string; email: string };
  financeId?: string | { _id: string; name: string; email: string };
  adminId?: string | { _id: string; name: string; email: string };
  approvedBy?: string | { _id: string; name: string; email: string };
byUser: string | { _id: string; name: string; email: string };
  requestType: 'daily' | 'urgent';
  description: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: Date;
  returnTime?: Date;
  shift?: 'morning' | 'afternoon' | 'evening';
  isAirportTrip?: boolean;
  flightDetails?: {
    flightNumber: string;
    airline: string;
  };
  cabDriverId?: string | CabDriver;
  status: 
    | 'submitted'
    | 'under_review'
    | 'approved_by_manager'
    | 'rejected_by_manager'
    | 'approved_by_finance'
    | 'rejected_by_finance'
    | 'approved_by_admin'
    | 'rejected_by_admin'
    | 'cab_assigned'
    | 'completed'
    | 'cancelled';
  history: CabHistory[];
  cancellationRequests?: CancellationRequest[];
  createdAt: Date;
  updatedAt: Date;
  
  // Populated fields
  employee?: any;
  manager?: any;
  finance?: any;
  admin?: any;
  cabDriver?: CabDriver;
}

export interface CabHistory {
  at: Date;
  byUser: string | { _id: string; name: string; email: string };
  byRole: 'admin' | 'manager' | 'finance' | 'employee';
  action: string;
  fromStatus?: string;
  toStatus: string;
  comment?: string;
}

export interface CancellationRequest {
  date: Date;
  reason: string;
  requestType: 'no_pickup' | 'no_drop' | 'both';
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | { _id: string; name: string; email: string };
}

export interface CabRequestCreateRequest {
  requestType: 'daily' | 'urgent';
  description: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: Date | string;
  returnTime?: Date | string;
  shift?: 'morning' | 'afternoon' | 'evening';
  isAirportTrip?: boolean;
  flightDetails?: {
    flightNumber: string;
    airline: string;
  };
}

export interface CancellationCreateRequest {
  cabRequestId: string;
  date: string;
  reason: string;
  requestType: 'no_pickup' | 'no_drop' | 'both';
}