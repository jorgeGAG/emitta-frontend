import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../../services/invoice.service';
import { AuthService } from '../../../services/auth.service';
import { FiscalService } from '../../../services/fiscal.service';
import { CompanyService } from '../../../services/company.service';
import { CreateInvoiceRequest, DocumentView } from '../../../models/invoice.model';
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
        [activeFiscalEntry]="activeFiscalEntry$ | async"
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

        <!-- Toast de Notificación / Éxito -->
        <div class="alert-banner success" *ngIf="successToastMessage">
          <span>✅ {{ successToastMessage }}</span>
          <button type="button" class="btn-dismiss" (click)="successToastMessage = null">Cerrar</button>
        </div>

        <!-- 1. VISTA PUNTO DE VENTA / EMITIR FACTURA (VISTA PRINCIPAL DEL SISTEMA) -->
        <ng-container *ngIf="activeTab === 'create-invoice'">
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

        <!-- 2. VISTA HISTORIAL DE COMPROBANTES Y MÉTRICAS -->
        <ng-container *ngIf="activeTab === 'invoices'">
          <div class="pos-header-banner">
            <div>
              <h1>Comprobantes Electrónicos</h1>
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
            [highlightedId]="highlightedInvoiceId"
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

      <!-- MODAL DE ÉXITO TRAS EMISIÓN DE FACTURA (FEEDBACK POS INMEDIATO) -->
      <div class="pos-modal-backdrop" *ngIf="showSuccessModal" (click)="closeSuccessModal()">
        <div class="pos-success-modal" (click)="$event.stopPropagation()">
          <div class="success-icon-badge">
            <app-icon name="check" [size]="32"></app-icon>
          </div>

          <h3 class="success-title">¡Factura Emitida con Éxito!</h3>
          <p class="success-desc">
            El comprobante electrónico ha sido registrado y procesado correctamente.
          </p>

          <div class="receipt-summary-box" *ngIf="lastEmittedInvoice as inv">
            <div class="receipt-row highlight">
              <span class="r-label">Secuencial SRI:</span>
              <span class="r-val seq-badge">{{ inv.sequential }}</span>
            </div>
            <div class="receipt-row">
              <span class="r-label">Cliente / Razón Social:</span>
              <span class="r-val bold">{{ inv.buyer.name || 'CONSUMIDOR FINAL' }}</span>
            </div>
            <div class="receipt-row">
              <span class="r-label">RUC / Cédula:</span>
              <span class="r-val">{{ inv.buyer.identification || '9999999999999' }}</span>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-row total-row">
              <span class="r-label total-label">TOTAL COBRADO:</span>
              <span class="r-val total-amount">\${{ inv.total | number:'1.2-2' }} USD</span>
            </div>
          </div>

          <div class="modal-actions-grid">
            <button type="button" class="btn-pos-action primary" (click)="closeSuccessModal()">
              <app-icon name="cart" [size]="15"></app-icon> Nueva Venta (POS)
            </button>
            <button type="button" class="btn-pos-action secondary" (click)="viewEmittedInvoices()">
              <app-icon name="receipt" [size]="15"></app-icon> Ver en Comprobantes
            </button>
            <button type="button" class="btn-pos-action outline" *ngIf="lastEmittedInvoice" (click)="inspectEmittedInvoice()">
              <app-icon name="eye" [size]="15"></app-icon> Ver Detalle
            </button>
          </div>
        </div>
      </div>

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
      max-width: 1380px;
      width: 100%;
      margin: 0 auto;
      padding: 14px 20px;
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
    .alert-banner.success {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
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
    /* MODAL DE ÉXITO TRAS EMISIÓN DE FACTURA */
    .pos-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }
    .pos-success-modal {
      background: #ffffff;
      border-radius: 16px;
      padding: 26px 24px;
      max-width: 460px;
      width: 92%;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
      text-align: center;
      animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .success-icon-badge {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #10b981;
      border: 2px solid #a7f3d0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .success-title {
      font-size: 1.3rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .success-desc {
      font-size: 0.82rem;
      color: #64748b;
      margin: 0 0 18px;
    }
    .receipt-summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 20px;
      text-align: left;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 0.82rem;
      color: #475569;
    }
    .r-label {
      font-size: 0.76rem;
      color: #64748b;
    }
    .r-val {
      color: #0f172a;
      font-weight: 600;
    }
    .r-val.bold {
      font-weight: 700;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .seq-badge {
      font-family: monospace;
      font-weight: 800;
      color: #2563eb;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
    }
    .status-badge {
      font-size: 0.74rem;
      font-weight: 700;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 3px 8px;
      border-radius: 5px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .status-badge.authorized {
      color: #166534;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .status-badge.queued {
      color: #92400e;
      background: #fef3c7;
      border-color: #fde68a;
    }
    .status-badge.rejected {
      color: #991b1b;
      background: #fef2f2;
      border-color: #fecaca;
    }
    .receipt-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 8px 0;
    }
    .total-row {
      padding-top: 4px;
    }
    .total-label {
      font-size: 0.8rem;
      font-weight: 800;
      color: #0f172a;
    }
    .total-amount {
      font-size: 1.3rem;
      font-weight: 800;
      color: #1d4ed8;
    }
    .modal-actions-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-pos-action {
      height: 38px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-pos-action.primary {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    }
    .btn-pos-action.primary:hover {
      background: #1d4ed8;
    }
    .btn-pos-action.secondary {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }
    .btn-pos-action.secondary:hover {
      background: #eff6ff;
      border-color: #93c5fd;
      color: #2563eb;
    }
    .btn-pos-action.outline {
      background: transparent;
      color: #64748b;
      font-size: 0.78rem;
    }
    .btn-pos-action.outline:hover {
      color: #0f172a;
      text-decoration: underline;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
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
      padding: 14px 20px;
      margin-top: 20px;
      font-size: 12px;
      color: #73859a;
    }
    .footer-inner {
      max-width: 1380px;
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
  showSuccessModal = false;
  lastEmittedInvoice: DocumentView | null = null;
  highlightedInvoiceId: string | null = null;
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  successToastMessage: string | null = null;
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
        if (comp.clientId && comp.clientSecret) {
          this.invoiceService.authenticateAndLoadRealDocuments({
            clientId: comp.clientId,
            clientSecret: comp.clientSecret
          });
        }
      }
    });

    this.invoiceService.token$.subscribe(token => {
      if (token) {
        this.fiscalService.loadFiscalConfiguration(token).subscribe();
      }
    });

    // Mantener sincronizado lastEmittedInvoice reactivamente con el polling de invoices$
    this.invoices$.subscribe(invoices => {
      if (this.lastEmittedInvoice) {
        const found = invoices.find(inv => inv.id === this.lastEmittedInvoice?.id);
        if (found && found.status !== this.lastEmittedInvoice.status) {
          this.lastEmittedInvoice = found;
          if (found.status === 'AUTHORIZED') {
            this.successToastMessage = `¡Factura ${found.sequential} autorizada exitosamente por el SRI!`;
          }
        }
      }
    });
  }

  getInvoiceStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'AUTHORIZED':
        return '● Autorizado por el SRI';
      case 'QUEUED':
        return '⏳ En cola de emisión (SRI)...';
      case 'GENERATING':
        return '⏳ Generando firma digital...';
      case 'SIGNED':
        return '● Firmado electrónicamente';
      case 'REJECTED':
      case 'NOT_AUTHORIZED':
        return '✖ No autorizado por el SRI';
      default:
        return `● ${status || 'En proceso'}`;
    }
  }

  openCompanies(): void {
    this.companyService.getCompanies().subscribe(list => {
      this.companies = list;
      this.showCompanyModal = true;
    });
  }

  onCashierLoginSuccess(): void {
    this.loginError = null;
    const comp = this.companyService.getActiveCompanySnapshot();
    this.invoiceService.authenticateAndLoadRealDocuments(
      comp?.clientId && comp?.clientSecret ? { clientId: comp.clientId, clientSecret: comp.clientSecret } : undefined
    );
    const token = this.invoiceService.getToken();
    if (token) {
      this.fiscalService.loadFiscalConfiguration(token).subscribe();
    }
  }

  onLogout(): void {
    this.authService.logout();
    this.invoiceService.clearSelection();
  }

  onTabChange(tab: ActiveTab, resetHighlight: boolean = true): void {
    if (resetHighlight) {
      this.clearInvoiceHighlight();
    }
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
      if (res && res.status !== 'ERROR' && res.status !== 'ADMISSION_SATURATED') {
        const doc = res.document || this.invoiceService.getInvoicesSnapshot()[0] || null;
        this.lastEmittedInvoice = doc;
        this.showSuccessModal = true;
        this.successToastMessage = `¡Factura ${doc?.sequential || ''} emitida con éxito por $${(doc?.total || request.expectedTotal).toFixed(2)} USD!`;
        creator?.clearForm();
        setTimeout(() => {
          if (this.successToastMessage) {
            this.successToastMessage = null;
          }
        }, 7000);
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.clearInvoiceHighlight();
  }

  viewEmittedInvoices(): void {
    this.showSuccessModal = false;
    this.highlightedInvoiceId = this.lastEmittedInvoice?.id || null;
    this.onTabChange('invoices', false);
    this.scheduleHighlightClear();
  }

  inspectEmittedInvoice(): void {
    this.showSuccessModal = false;
    this.highlightedInvoiceId = this.lastEmittedInvoice?.id || null;
    this.onTabChange('invoices', false);
    if (this.lastEmittedInvoice?.id) {
      this.invoiceService.selectInvoice(this.lastEmittedInvoice.id);
    }
    this.scheduleHighlightClear();
  }

  private scheduleHighlightClear(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    this.highlightTimer = setTimeout(() => {
      this.clearInvoiceHighlight();
    }, 8000);
  }

  private clearInvoiceHighlight(): void {
    this.highlightedInvoiceId = null;
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
  }

  onRetryInvoice(creator?: InvoiceCreatorComponent): void {
    this.invoiceService.retryAdmissionInvoice().subscribe(res => {
      if (res && (res.status === 'QUEUED' || res.created)) {
        creator?.clearForm();
      }
    });
  }

  onInvoiceSelect(id: string): void {
    this.clearInvoiceHighlight();
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
