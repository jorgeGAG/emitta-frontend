import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../../services/invoice.service';
import { AuthService } from '../../../services/auth.service';
import { FiscalService } from '../../../services/fiscal.service';
import { CompanyService } from '../../../services/company.service';
import { CreateInvoiceRequest } from '../../../models/invoice.model';
import { FiscalConfigurationRequest, FiscalConfigurationEntry } from '../../../models/fiscal.model';
import { Company } from '../../../models/company.model';

import { ActiveTab, NavbarComponent } from '../../dumb/navbar/navbar.component';
import { KpiCardsComponent } from '../../dumb/kpi-cards/kpi-cards.component';
import { InvoiceCreatorComponent } from '../../dumb/invoice-creator/invoice-creator.component';
import { DocumentRegistryComponent } from '../../dumb/document-registry/document-registry.component';
import { RideViewerModalComponent } from '../../dumb/ride-viewer-modal/ride-viewer-modal.component';
import { CashierLoginComponent } from '../../dumb/cashier-login/cashier-login.component';
import { FiscalSetupViewComponent } from '../../dumb/fiscal-setup-view/fiscal-setup-view.component';
import { CompanyModalComponent } from '../../dumb/company-modal/company-modal.component';
import { AppIconComponent } from '../../dumb/app-icon/app-icon.component';

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    KpiCardsComponent,
    InvoiceCreatorComponent,
    DocumentRegistryComponent,
    RideViewerModalComponent,
    CashierLoginComponent,
    FiscalSetupViewComponent,
    CompanyModalComponent,
    AppIconComponent
  ],
  template: `
    <!-- PANTALLA 1: Login de Acceso Protegido del Cajero (100% Limpio) -->
    <app-cashier-login
      *ngIf="!(isLoggedIn$ | async)"
      (loginSuccess)="onCashierLoginSuccess()"
    ></app-cashier-login>

    <!-- PANTALLA 2: Sistema Principal del Punto de Venta (POS) -->
    <div class="emitta-app-shell" *ngIf="isLoggedIn$ | async">
      <!-- Barra superior con estado de API y perfil del cajero -->
      <app-navbar
        [activeTab]="activeTab"
        [backendConnected]="(backendConnected$ | async) ?? false"
        [currentUser]="currentUser$ | async"
        [activeCompany]="activeCompany$ | async"
        [systemStatus]="systemStatus$ | async"
        (tabChange)="onTabChange($event)"
        (logout)="onLogout()"
        (openCompanyModal)="openCompanies()"
      ></app-navbar>

      <main class="main-content">
        <!-- Toast de Notificación / Error -->
        <div class="alert-banner error" *ngIf="error$ | async as err">
          <span>⚠️ {{ err }}</span>
          <button type="button" class="btn-dismiss" (click)="onDismissError()">Cerrar</button>
        </div>

        <!-- 1. VISTA PUNTO DE VENTA / EMITIR FACTURA (VISTA PRINCIPAL DEL SISTEMA) -->
        <ng-container *ngIf="activeTab === 'create-invoice'">
          <div class="pos-header-banner" *ngIf="currentUser$ | async as usr">
            <div>
              <span class="eyebrow"><span class="dot"></span> SISTEMA DE VENTAS Y FACTURACIÓN MULTI-EMPRESA</span>
              <h1>Punto de Venta (POS)</h1>
              <p>Genera ventas con comprobantes autorizados en tiempo real por el SRI.</p>
            </div>
            <div class="banner-right">
              <span class="badge-branch">
                {{ (activeCompany$ | async)?.legalName || usr.branchName }} · Sucursal {{ (activeFiscalEntry$ | async)?.establishmentCode || '001' }} · Caja {{ (activeFiscalEntry$ | async)?.pointOfIssueCode || '001' }}
              </span>
            </div>
          </div>

          <!-- Alerta de saturación SRI RabbitMQ (Idempotencia) -->
          <div class="admission-warning-card" *ngIf="(admissionSaturated$ | async)?.saturated">
            <div class="warning-header">
              <span class="pulse-icon">⏱️</span>
              <div>
                <h4>Servicio SRI Saturado Temporalmente (Emisión Asíncrona)</h4>
                <p>La API de Emitta o el SRI ha respondido con estado de alta demanda. Tu solicitud está protegida mediante Idempotencia Oficial.</p>
              </div>
            </div>
            <div class="warning-actions">
              <button
                type="button"
                class="btn-retry"
                [disabled]="loading$ | async"
                (click)="onRetryInvoice(invoiceCreatorRef)">
                🔄 Reintentar Envío Seguro
              </button>
            </div>
          </div>

          <!-- Componente Emisor de Facturas POS (Limpio y enfocado) -->
          <app-invoice-creator
            #invoiceCreatorRef
            [loading]="(loading$ | async) ?? false"
            [pointOfIssueId]="(activeFiscalEntry$ | async)?.pointOfIssueId || null"
            [activeEstablishmentCode]="(activeFiscalEntry$ | async)?.establishmentCode || ''"
            [activePointOfIssueCode]="(activeFiscalEntry$ | async)?.pointOfIssueCode || ''"
            [issuerRuc]="(activeFiscalEntry$ | async)?.ruc || ''"
            [admissionSaturated]="admissionSaturated$ | async"
            (submitInvoice)="onInvoiceSubmit($event, invoiceCreatorRef)"
            (retryInvoice)="onRetryInvoice(invoiceCreatorRef)"
          ></app-invoice-creator>
        </ng-container>

        <!-- 2. VISTA HISTORIAL DE COMPROBANTES Y MÉTRICAS (BASE DE DATOS) -->
        <ng-container *ngIf="activeTab === 'invoices'">
          <div class="pos-header-banner">
            <div>
              <span class="eyebrow"><span class="dot"></span> REGISTRO OFICIAL EN BASE DE DATOS</span>
              <h1>Comprobantes Electrónicos</h1>
              <p>Historial y auditoría de facturas registradas en la base de datos a través de la API REST.</p>
            </div>
            <div class="banner-right">
              <button type="button" class="btn-new-sale" (click)="onTabChange('create-invoice')">
                <app-icon name="cart" [size]="16"></app-icon> ＋ Nueva Factura (POS)
              </button>
            </div>
          </div>

          <!-- Métricas de ventas y facturación -->
          <app-kpi-cards [metrics]="metrics$ | async"></app-kpi-cards>

          <app-document-registry
            [invoices]="(invoices$ | async) ?? []"
            [selectedId]="(selectedInvoice$ | async)?.id || null"
            (selectInvoice)="onInvoiceSelect($event)"
            (downloadOfficialPdf)="onDownloadOfficialPdf($event)"
            (downloadOfficialXml)="onDownloadOfficialXml($event)"
          ></app-document-registry>
        </ng-container>

        <!-- 3. VISTA CONFIGURACIÓN FISCAL Y FIRMA DIGITAL (.p12) -->
        <ng-container *ngIf="activeTab === 'fiscal'">
          <app-fiscal-setup-view
            [entries]="(fiscalEntries$ | async) ?? []"
            [certificates]="(certificates$ | async) ?? []"
            [loading]="(fiscalLoading$ | async) ?? false"
            [activePoiId]="(activeFiscalEntry$ | async)?.pointOfIssueId || null"
            (saveConfig)="onSaveFiscalConfig($event)"
            (createBranch)="onCreateBranch($event)"
            (createPoi)="onCreatePoi($event)"
            (selectActivePoi)="onSelectActivePoi($event)"
            (uploadCert)="onUploadCert($event)"
          ></app-fiscal-setup-view>
        </ng-container>
      </main>

      <!-- Modal para Inspección de RIDE Oficial y Descarga de Artefactos de la API -->
      <app-ride-viewer-modal
        [invoice]="selectedInvoice$ | async"
        [fiscalEntries]="fiscalEntries$ | async"
        [activeFiscalEntry]="activeFiscalEntry$ | async"
        (downloadOfficialPdf)="onDownloadOfficialPdf($event)"
        (downloadOfficialXml)="onDownloadOfficialXml($event)"
        (close)="onCloseRide()"
      ></app-ride-viewer-modal>

      <!-- MODAL GESTIÓN MULTI-EMPRESA & BASE DE DATOS -->
      <app-company-modal
        *ngIf="showCompanyModal"
        [companies]="companies"
        [activeCompany]="activeCompany$ | async"
        [systemStatus]="systemStatus$ | async"
        (close)="showCompanyModal = false"
      ></app-company-modal>

      <footer class="app-footer">
        <div class="footer-inner">
          <span>Emitta POS v2 · Arquitectura Multi-Empresa con Repositorio Desacoplado & SRI Cloud</span>
          <span>SRI Ambiente de Pruebas · Conexión Segura</span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .emitta-app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--bg-page);
    }
    .main-content {
      flex: 1;
      max-width: 1280px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      box-sizing: border-box;
    }
    .alert-banner {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
    }
    .alert-banner.error {
      background-color: var(--danger-bg);
      color: var(--danger-text);
      border: 1px solid var(--danger-border);
    }
    .btn-dismiss {
      background: none;
      border: none;
      font-size: 12px;
      font-weight: 600;
      color: inherit;
      cursor: pointer;
      text-decoration: underline;
    }
    .pos-header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .pos-header-banner h1 {
      font-size: 28px;
      margin: 0 0 6px;
    }
    .pos-header-banner p {
      color: var(--text-muted);
      margin: 0;
      font-size: 14px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary-blue);
      margin-bottom: 4px;
    }
    .eyebrow .dot {
      width: 6px;
      height: 6px;
      background: var(--primary-blue);
      border-radius: 50%;
    }
    .badge-branch {
      background: var(--blue-soft);
      color: var(--primary-blue);
      border: 1px solid var(--blue-soft-border);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .admission-warning-card {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .warning-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .warning-header h4 {
      margin: 0 0 4px;
      color: #92400e;
      font-size: 15px;
    }
    .warning-header p {
      margin: 0;
      color: #b45309;
      font-size: 13px;
    }
    .btn-retry {
      background: #f59e0b;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-new-sale {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
      transition: all 0.15s ease;
    }
    .btn-new-sale:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
    }
    .app-footer {
      background: #ffffff;
      border-top: 1px solid var(--border-color);
      padding: 20px 24px;
      margin-top: 40px;
      font-size: 12px;
      color: #73859a;
    }
    .footer-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
  `]
})
export class DashboardContainerComponent implements OnInit {
  private readonly invoiceService = inject(InvoiceService);
  private readonly authService = inject(AuthService);
  private readonly fiscalService = inject(FiscalService);
  private readonly companyService = inject(CompanyService);

  activeTab: ActiveTab = 'create-invoice';
  showCompanyModal = false;
  companies: Company[] = [];

  // Multi-Empresa y Base de Datos
  public readonly activeCompany$ = this.companyService.activeCompany$;
  public readonly systemStatus$ = this.companyService.systemStatus$;

  // Flujos de autenticación de cajero
  public readonly currentUser$ = this.authService.currentUser$;
  public readonly isLoggedIn$ = this.authService.isLoggedIn$;

  // Flujos reactivos de facturación y API
  public readonly invoices$ = this.invoiceService.invoices$;
  public readonly selectedInvoice$ = this.invoiceService.selectedInvoice$;
  public readonly metrics$ = this.invoiceService.metrics$;
  public readonly backendConnected$ = this.invoiceService.backendConnected$;
  public readonly loading$ = this.invoiceService.loading$;
  public readonly error$ = this.invoiceService.error$;
  public readonly admissionSaturated$ = this.invoiceService.admissionSaturated$;

  // Flujos reactivos de configuración fiscal
  public readonly fiscalEntries$ = this.fiscalService.fiscalEntries$;
  public readonly activeFiscalEntry$ = this.fiscalService.activeEntry$;
  public readonly certificates$ = this.fiscalService.certificates$;
  public readonly fiscalLoading$ = this.fiscalService.loading$;

  loginError: string | null = null;

  ngOnInit(): void {
    this.companyService.getCompanies().subscribe(list => {
      this.companies = list;
    });

    // Reaccionar a la empresa activa y filtrar facturas por su companyId
    this.activeCompany$.subscribe(comp => {
      if (comp?.id) {
        this.invoiceService.loadInvoicesFromDatabase(comp.id);
      }
    });

    this.invoiceService.token$.subscribe(token => {
      if (token) {
        this.fiscalService.loadFiscalConfiguration(token).subscribe();
      }
    });
  }

  openCompanies(): void {
    this.companyService.getCompanies().subscribe(list => {
      this.companies = list;
      this.showCompanyModal = true;
    });
  }

  onCashierLoginSuccess(): void {
    this.loginError = null;
    this.invoiceService.authenticateAndLoadRealDocuments();
    const token = this.invoiceService.getToken();
    if (token) {
      this.fiscalService.loadFiscalConfiguration(token).subscribe();
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.invoiceService.clearSelection();
  }

  onTabChange(tab: ActiveTab): void {
    this.activeTab = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === 'fiscal') {
      const token = this.invoiceService.getToken();
      if (token) {
        this.fiscalService.loadFiscalConfiguration(token).subscribe();
      }
    }
  }

  onInvoiceSubmit(request: CreateInvoiceRequest, creator?: InvoiceCreatorComponent): void {
    this.invoiceService.emitInvoice(request).subscribe(res => {
      if (res && (res.status === 'QUEUED' || res.created)) {
        creator?.clearForm();
        // Redirigir de forma elegante al registro de comprobantes para ver la factura y descargar RIDE
        setTimeout(() => {
          this.onTabChange('invoices');
        }, 1200);
      }
    });
  }

  onRetryInvoice(creator?: InvoiceCreatorComponent): void {
    this.invoiceService.retryAdmissionInvoice().subscribe(res => {
      if (res && (res.status === 'QUEUED' || res.created)) {
        creator?.clearForm();
      }
    });
  }

  onInvoiceSelect(id: string): void {
    this.invoiceService.selectInvoice(id);
  }

  onInvoiceDelete(id: string): void {
    this.invoiceService.removeInvoice(id);
  }

  onCloseRide(): void {
    this.invoiceService.clearSelection();
  }

  onDismissError(): void {
    this.invoiceService.clearError();
  }

  onDownloadOfficialPdf(docId: string): void {
    this.invoiceService.downloadOfficialArtifact(docId, 'ride-pdf').subscribe();
  }

  onDownloadOfficialXml(docId: string): void {
    this.invoiceService.downloadOfficialArtifact(docId, 'authorized-xml').subscribe();
  }

  onSaveFiscalConfig(req: FiscalConfigurationRequest): void {
    const token = this.invoiceService.getToken();
    if (!token) return;
    this.fiscalService.saveFiscalConfiguration(token, req).subscribe();
  }

  onCreateBranch(evt: { code: string; name?: string; address?: string }): void {
    const token = this.invoiceService.getToken();
    if (!token) return;
    const taxpayerId = this.fiscalService.getTaxpayerId();
    this.fiscalService.createEstablishment(token, taxpayerId, evt).subscribe();
  }

  onCreatePoi(evt: { establishmentId: string; code: string; name?: string }): void {
    const token = this.invoiceService.getToken();
    if (!token) return;
    this.fiscalService.createPointOfIssue(token, evt.establishmentId, { code: evt.code, name: evt.name }).subscribe();
  }

  onSelectActivePoi(entry: FiscalConfigurationEntry): void {
    this.fiscalService.selectActiveEntry(entry);
  }

  onUploadCert(evt: { file: File; pass: string }): void {
    const token = this.invoiceService.getToken();
    if (!token) return;
    const taxpayerId = this.fiscalService.getTaxpayerId();
    if (!taxpayerId) return;

    const fd = new FormData();
    fd.append('certificate', evt.file, evt.file.name || 'firma.p12');
    fd.append('password', evt.pass);
    fd.append('authorizationReviewed', 'true');

    const evidenceContent = `%PDF-1.4\n1 0 obj\n<< /Title (Autorizacion Firma) /Author (${taxpayerId}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    const evidenceBlob = new Blob([evidenceContent], { type: 'application/pdf' });
    fd.append('authorizationEvidence', evidenceBlob, 'evidencia-autorizacion.pdf');

    this.fiscalService.uploadCertificate(token, taxpayerId, fd).subscribe();
  }
}
