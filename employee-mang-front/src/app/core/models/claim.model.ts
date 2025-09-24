export interface ClaimHistory {
  at: Date;
  byUser: string;
  byRole: string;
  action: string;
  fromStatus?: string;
  toStatus: string;
  comment?: string;
}

export interface Claim {
  _id: string;

  employeeId?: string | { _id: string; name: string; department?: string };
  managerId: string | { _id: string; name: string };
  financeId?: string | { _id: string; name: string };
   category: string | Category; // This should be the ID
  categoryDetails?: Category; // Added from GPT suggestion for populated object
  amount: number;
  currency: string;
  description: string;  
  billUrl?: string;
  status: 
    | 'submitted'
    | 'under_review'
    | 'approved_by_manager'
    | 'rejected_by_manager'
    | 'escalated_to_admin'
    | 'approved_by_admin'
    | 'rejected_by_admin'
    | 'returned_to_manager'
    | 'sent_to_finance'
    | 'direct_to_finance' // NEW
    | 'approved_by_finance'
    | 'rejected_by_finance'
    | 'escalated_to_admin_by_finance'
    | 'paid';
  history: ClaimHistory[];
  sla: {
    dueAt: Date;
    breached: boolean;
  };
  submittedOn: Date;
  createdAt: Date;
  updatedAt: Date;
   employeeDetails?: {
    name: string;
    department: string;
  };
  // Populated fields
  employee?: any;
  manager?: any;
  finance?: any;
}

export interface ClaimCreateRequest {
  category: string;
  amount: number;   
  description: string;
  bill?: File;
}

// You might need a Category interface if not already defined
export interface Category {
  _id: string;
  name: string;
  description?: string;
}
