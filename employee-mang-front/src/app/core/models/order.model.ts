import { ClaimHistory } from "./claim.model";

export interface Order {
  _id: string;
  item: string;
  vendor: string;
  amount: number;
  status: string;
  description?: string;

  employeeId?: string | { _id: string; name: string; department?: string };
  managerId?: string | { _id: string; name: string };

  employeeDetails?: {
    name: string;
    department: string;
  };

  employee?: any;
  manager?: any;

  history?: ClaimHistory[];

  createdAt: Date;
  updatedAt: Date;
}
