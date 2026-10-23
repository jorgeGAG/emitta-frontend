export interface EstablishmentRef {
  code: string;
  name: string;
  address: string;
}

export interface CertificateInfo {
  subject: string;
  validTo: string;
  active: boolean;
}

export interface Company {
  id: string;
  name: string;
  ruc: string;
  legalName: string;
  tradeName: string;
  mainAddress: string;
  accountingObligation?: boolean;
  clientId: string;
  clientSecret: string;
  isActive: boolean;
  establishments: EstablishmentRef[];
  certificate?: CertificateInfo | null;
  createdAt?: string;
}

export interface SystemStatus {
  status: string;
  database: string;
  isMongoAtlas: boolean;
  serverTime: string;
}
