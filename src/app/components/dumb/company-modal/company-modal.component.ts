import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../../services/company.service';
import { Company, SystemStatus } from '../../../models/company.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-company-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-card">
        <!-- Encabezado -->
        <div class="modal-header">
          <div class="title-wrap">
            <span class="icon-circle"><app-icon name="building" [size]="20"></app-icon></span>
            <div>
              <h3>Gestión Multi-Empresa & Base de Datos</h3>
              <p>Cambia de empresa emisora o conecta un nuevo cliente de facturación electrónica.</p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="close.emit()">✕</button>
        </div>

        <!-- Badge de Base de Datos -->
        <div class="db-status-bar" [class.atlas]="systemStatus?.isMongoAtlas">
          <div class="status-left">
            <span class="db-dot"></span>
            <strong>Base de Datos Conectada:</strong>
            <span>{{ systemStatus?.database || 'Consultando estado...' }}</span>
          </div>
          <span class="tag-badge">{{ systemStatus?.isMongoAtlas ? 'PRODUCCIÓN CLOUD' : 'MODO RESILIENTE' }}</span>
        </div>

        <!-- Contenido -->
        <div class="modal-body">
          <!-- Pestañas internas -->
          <div class="tabs-nav">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeSection === 'list'"
              (click)="activeSection = 'list'">
              Empresas Registradas ({{ companies.length }})
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeSection === 'new'"
              (click)="activeSection = 'new'">
              + Conectar Nueva Empresa (API Emitta)
            </button>
          </div>

          <!-- SECCIÓN: LISTADO DE EMPRESAS -->
          <div class="section-content" *ngIf="activeSection === 'list'">
            <div class="company-list">
              <div
                *ngFor="let comp of companies"
                class="company-item"
                [class.selected]="comp.id === activeCompany?.id"
                (click)="onSelectCompany(comp)">
                <div class="comp-info">
                  <div class="comp-title-row">
                    <h4>{{ comp.tradeName || comp.name }}</h4>
                    <span class="active-badge" *ngIf="comp.id === activeCompany?.id">EMPRESA ACTIVA</span>
                  </div>
                  <div class="comp-meta">
                    <span><strong>RUC:</strong> {{ comp.ruc }}</span>
                    <span>•</span>
                    <span><strong>Razón Social:</strong> {{ comp.legalName }}</span>
                  </div>
                  <div class="comp-address">
                    📍 {{ comp.mainAddress }}
                  </div>
                  <div class="comp-details" *ngIf="comp.establishments && comp.establishments.length">
                    <span>🏢 {{ comp.establishments.length }} Sucursal(es)</span>
                    <span *ngIf="comp.certificate">• 🔐 Firma: {{ comp.certificate.validTo }}</span>
                  </div>
                </div>
                <div class="comp-action">
                  <button
                    type="button"
                    class="btn-switch"
                    [disabled]="comp.id === activeCompany?.id || switching">
                    {{ comp.id === activeCompany?.id ? 'En uso' : 'Seleccionar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: CONECTAR NUEVA EMPRESA -->
          <div class="section-content" *ngIf="activeSection === 'new'">
            <form (ngSubmit)="onConnectNewCompany()" class="new-company-form">
              <div class="info-box">
                ℹ️ Ingresa las credenciales entregadas por Emitta para la nueva empresa. Al dar clic en <strong>"Conectar y Probar"</strong>, el sistema consultará al SRI en tiempo real y registrará el RUC y los establecimientos automáticamente en MongoDB.
              </div>

              <!-- Mensaje de Feedback -->
              <div class="alert success" *ngIf="successMessage">
                ✅ {{ successMessage }}
              </div>
              <div class="alert danger" *ngIf="errorMessage">
                ❌ {{ errorMessage }}
              </div>

              <div class="form-row">
                <label>Nombre Referencial de la Empresa</label>
                <input
                  type="text"
                  [(ngModel)]="newCompName"
                  name="newCompName"
                  placeholder="Ej: Distribuidora El Sol S.A.S."
                  required
                />
              </div>

              <div class="form-row">
                <label>Client ID (API Emitta OAuth2)</label>
                <input
                  type="text"
                  [(ngModel)]="newClientId"
                  name="newClientId"
                  placeholder="emitta_00000000-0000-0000-0000-000000000000"
                  required
                />
              </div>

              <div class="form-row">
                <label>Client Secret (API Emitta Clave Secreta)</label>
                <input
                  type="password"
                  [(ngModel)]="newClientSecret"
                  name="newClientSecret"
                  placeholder="Clave secreta asignada"
                  required
                />
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="connecting || !newClientId || !newClientSecret">
                  <span *ngIf="connecting" class="spinner"></span>
                  <span>{{ connecting ? 'Conectando con SRI / Emitta...' : 'Conectar y Probar con SRI' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(16, 36, 58, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--blue-soft);
      color: var(--primary-blue);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title-wrap h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .title-wrap p {
      margin: 2px 0 0 0;
      font-size: 0.85rem;
      color: var(--text-intro);
    }
    .btn-close {
      border: none;
      background: transparent;
      font-size: 1.3rem;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px 8px;
      border-radius: 4px;
    }
    .btn-close:hover {
      background: #f1f5f9;
    }
    .db-status-bar {
      background: #f8fafc;
      padding: 10px 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .status-left {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-intro);
    }
    .db-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #f59e0b;
    }
    .db-status-bar.atlas .db-dot {
      background: #10b981;
    }
    .tag-badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      background: #e2e8f0;
      color: #475569;
    }
    .db-status-bar.atlas .tag-badge {
      background: #d1fae5;
      color: #065f46;
    }
    .modal-body {
      padding: 20px 24px;
      overflow-y: auto;
    }
    .tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #f1f5f9;
      margin-bottom: 20px;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 8px 14px;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
    }
    .tab-btn.active {
      color: var(--primary-blue);
      border-bottom-color: var(--primary-blue);
    }
    .company-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .company-item {
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .company-item:hover {
      border-color: #93c5fd;
      background: #f8fafc;
    }
    .company-item.selected {
      border-color: var(--primary-blue);
      background: var(--blue-soft);
    }
    .comp-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .comp-title-row h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .active-badge {
      font-size: 0.68rem;
      font-weight: 800;
      background: #10b981;
      color: #ffffff;
      padding: 2px 7px;
      border-radius: 10px;
      letter-spacing: 0.5px;
    }
    .comp-meta {
      font-size: 0.84rem;
      color: var(--text-intro);
      margin: 4px 0;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .comp-address {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .comp-details {
      font-size: 0.8rem;
      color: var(--primary-blue);
      margin-top: 4px;
      font-weight: 600;
    }
    .btn-switch {
      background: #ffffff;
      border: 1px solid var(--border-color);
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      color: var(--text-main);
    }
    .company-item.selected .btn-switch {
      background: var(--primary-blue);
      color: #ffffff;
      border-color: var(--primary-blue);
    }
    .new-company-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-box {
      background: #f1f5f9;
      padding: 12px 14px;
      border-radius: 6px;
      font-size: 0.85rem;
      color: #334155;
      line-height: 1.45;
    }
    .form-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-row label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .form-row input {
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 9px 12px;
      font-size: 0.9rem;
      outline: none;
    }
    .form-row input:focus {
      border-color: var(--primary-blue);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    }
    .form-actions {
      margin-top: 8px;
    }
    .btn-primary {
      background: var(--primary-blue);
      color: #ffffff;
      border: none;
      padding: 11px 20px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert {
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.88rem;
      font-weight: 500;
    }
    .alert.success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .alert.danger {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CompanyModalComponent {
  private readonly companyService = inject(CompanyService);

  @Input() companies: Company[] = [];
  @Input() activeCompany: Company | null = null;
  @Input() systemStatus: SystemStatus | null = null;
  @Output() close = new EventEmitter<void>();

  activeSection: 'list' | 'new' = 'list';
  switching = false;
  connecting = false;

  newCompName = '';
  newClientId = '';
  newClientSecret = '';
  errorMessage = '';
  successMessage = '';

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onSelectCompany(comp: Company): void {
    if (comp.id === this.activeCompany?.id || this.switching) return;
    this.switching = true;
    this.companyService.switchCompany(comp.id).subscribe({
      next: (res) => {
        this.switching = false;
        if (res.success) {
          // Limpiar tokens anteriores en sesión para rotación limpia obligatoria
          try {
            sessionStorage.removeItem('emitta_api_token');
          } catch {}
          window.location.reload();
        }
      },
      error: () => {
        this.switching = false;
      }
    });
  }

  onConnectNewCompany(): void {
    if (!this.newClientId || !this.newClientSecret || this.connecting) return;
    this.connecting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyService.testAndConnectCompany({
      name: this.newCompName,
      clientId: this.newClientId,
      clientSecret: this.newClientSecret
    }).subscribe({
      next: (res) => {
        this.connecting = false;
        if (res.success && res.company) {
          this.successMessage = `¡Empresa '${res.company.legalName}' conectada con éxito y registrada en la base de datos!`;
          try {
            sessionStorage.removeItem('emitta_api_token');
          } catch {}
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      },
      error: (err) => {
        this.connecting = false;
        this.errorMessage = err.error?.error || 'No se pudo conectar con la API de Emitta. Verifica tus claves.';
      }
    });
  }
}
