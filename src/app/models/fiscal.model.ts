/**
 * Modelos oficiales para el módulo fiscal según la especificación OpenAPI de Emitta
 */

export interface CreateTaxpayerRequest {
  ruc: string;
  legalName: string;
  tradeName?: string;
  mainAddress: string;
}

export interface CreateEstablishmentRequest {
  code: string;       // ej. '001'
  name?: string;      // ej. 'Sucursal Matriz'
  address: string;
}

export interface CreatePointOfIssueRequest {
  code: string;       // ej. '001'
  name?: string;      // ej. 'Caja Principal 01'
}

export interface FiscalConfigurationRequest {
  taxpayer: CreateTaxpayerRequest;
  establishment: CreateEstablishmentRequest;
  pointOfIssue: CreatePointOfIssueRequest;
}

export interface FiscalConfigurationResult {
  taxpayerId: string;
  establishmentId: string;
  pointOfIssueId: string;
  environment: 'TEST' | 'PRODUCTION';
}

export interface FiscalConfigurationEntry {
  taxpayerId: string;
  ruc: string;
  legalName: string;
  tradeName?: string | null;
  mainAddress?: string | null;
  taxpayerStatus?: string;
  testEnabled?: boolean;
  productionEnabled?: boolean;
  establishmentId?: string | null;
  establishmentCode?: string | null;
  establishmentAddress?: string | null;
  establishmentStatus?: string | null;
  pointOfIssueId?: string | null;
  pointOfIssueCode?: string | null;
}

export interface CertificateMetadata {
  id: string;
  fingerprint: string;
  validFrom?: string;
  validUntil: string;
  subject?: string;
  issuer?: string;
  active?: boolean;
}

export interface RideJob {
  state: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'DEAD' | 'BLOCKED';
  attempts: number;
  nextAttemptAt?: string | null;
  failureCategory?: string | null;
}
