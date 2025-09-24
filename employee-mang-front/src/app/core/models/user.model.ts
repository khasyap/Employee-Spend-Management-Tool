export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'finance' | 'employee';
  managerId?: string;
  financeId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'finance' | 'employee';
  managerId?: string;
  financeId?: string;
}