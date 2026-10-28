export type UserRole = 'SUPERADMIN' | 'ADMIN_EMPRESA' | 'CAJERO' | 'SUPERVISOR';

export interface CashierUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  branchCode: string;   // '001'
  boxCode: string;      // '001'
  branchName: string;   // 'Sucursal Matriz'
  companyId?: string | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: CashierUser;
  error?: string;
}
