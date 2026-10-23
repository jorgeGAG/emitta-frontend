export interface CashierUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'CAJERO' | 'SUPERVISOR';
  branchCode: string;   // '001'
  boxCode: string;      // '001'
  branchName: string;   // 'Sucursal Matriz'
}
