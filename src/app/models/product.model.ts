export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unitPrice: number;
  vatRate: number; // 15 o 0
  companyId?: string | null;
  isGlobal?: boolean;
}
