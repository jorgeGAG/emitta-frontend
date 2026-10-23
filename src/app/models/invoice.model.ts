export type IdentificationType = 'RUC' | 'CEDULA' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';

export interface Buyer {
  identificationType: IdentificationType;
  identification: string;
  name: string;
  email?: string;
  address?: string;
  phone?: string;
}

export interface Tax {
  taxCode: string;        // '2' para IVA
  percentageCode: string; // '4' para 15% IVA Ecuador, '0' para 0%
  rate: number;           // 15.0 o 0.0
}

export interface InvoiceItem {
  id?: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxes: Tax[];
  subtotal?: number;
}

export interface InvoicePayment {
  paymentMethod: string;  // '01' Efectivo, '20' Otros con utilización del sistema financiero
  total: number;
  term?: number;
  unitTime?: string;
}

export interface CreateInvoiceRequest {
  pointOfIssueId: string;
  environment: 'TEST' | 'PRODUCTION';
  issuedAt: string;
  customerId?: string;
  buyer: Buyer;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  expectedTotal: number;
}

export interface CreateInvoiceResponse {
  id: string;
  status: string;
  total: number;
  created: boolean;
}

export interface DocumentView {
  id: string;
  status: 'QUEUED' | 'GENERATING' | 'SIGNED' | 'AUTHORIZED' | 'NOT_AUTHORIZED' | string;
  accessKey?: string;
  sequential: string;
  environment: 'TEST' | 'PRODUCTION' | string;
  issuedAt: string;
  authorizedAt?: string;
  buyer: Buyer;
  buyerName?: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  subtotal15: number;
  subtotal0: number;
  subtotalWithoutTax: number;
  totalDiscount: number;
  ivaAmount: number;
  total: number;
}

export interface BillingMetrics {
  totalInvoices: number;
  totalAmount: number;
  authorizedCount: number;
  pendingCount: number;
  rejectedCount: number;
  lastIssuedAt?: string;
}
