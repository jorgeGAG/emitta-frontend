import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { Company, SystemStatus } from '../../../models/company.model';

@Component({
  selector: 'app-cashier-login',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="login-page">
      <div class="login-card">
        <!-- Logo & Branding -->
        <div class="brand-header">
          <div class="logo-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span class="badge-tag">Punto de Venta · SRI Ecuador</span>
          <h2>Acceso al Sistema</h2>
          <p>Ingresa tus credenciales para iniciar turno de facturación.</p>
        </div>

        <!-- Indicador de Empresa Activa y Base de Datos -->
        <div class="company-select-card" (click)="openCompanyModal.emit()">
          <div class="company-card-info">
            <span class="comp-icon"><app-icon name="building" [size]="16"></app-icon></span>
            <div class="comp-text">
              <span class="comp-sub">EMPRESA EMISORA SRI</span>
              <strong class="comp-name">{{ activeCompany?.tradeName || activeCompany?.name || 'Emitta Facturación Cloud' }}</strong>
              <span class="comp-ruc">RUC: {{ activeCompany?.ruc || '1792345678001' }}</span>
            </div>
          </div>
          <button type="button" class="btn-change-comp" title="Cambiar empresa o conectar nueva">
            Cambiar ▾
          </button>
        </div>

        <!-- Badge de Base de Datos -->
        <div class="db-pill-login" [class.mongo]="systemStatus?.isMongoAtlas">
          <span class="dot"></span>
          <span>BD: {{ systemStatus?.database || 'Local Fallback' }}</span>
        </div>

        <!-- Error Alert -->
        <div class="error-banner" *ngIf="errorMessage">
          <app-icon name="alert" [size]="15"></app-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Formulario de Login Estándar -->
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="username">Usuario o Correo</label>
            <div class="input-wrapper">
              <span class="input-icon"><app-icon name="user" [size]="15"></app-icon></span>
              <input
                id="username"
                type="text"
                name="username"
                [(ngModel)]="username"
                required
                placeholder="Ej: cajero1 o admin"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-wrapper">
              <span class="input-icon"><app-icon name="lock" [size]="15"></app-icon></span>
              <input
                id="password"
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                placeholder="Ingresa tu contraseña"
                autocomplete="current-password"
              />
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading || !username || !password">
            <span *ngIf="loading" class="spinner"></span>
            <span>{{ loading ? 'Autenticando en BD...' : 'Iniciar Sesión' }}</span>
          </button>
        </form>

        <div class="footer-note">
          <span>Usuarios demo: <strong>cajero1</strong> (1234) | <strong>admin</strong> (1234)</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 10% 20%, #f1f5f9 0%, #e2e8f0 90%);
      padding: 20px;
    }
    .login-card {
      background: #ffffff;
      border-radius: 14px;
      padding: 32px 36px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .brand-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo-box {
      width: 52px;
      height: 52px;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }
    .badge-tag {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      color: #2563eb;
      background: #dbeafe;
      padding: 3px 10px;
      border-radius: 12px;
      margin-bottom: 8px;
    }
    .brand-header h2 {
      margin: 0 0 6px;
      font-size: 1.45rem;
      font-weight: 800;
      color: #0f172a;
    }
    .brand-header p {
      margin: 0;
      font-size: 0.86rem;
      color: #64748b;
    }

    /* Selector de Empresa en Login */
    .company-select-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      margin-bottom: 12px;
      transition: all 0.2s;
    }
    .company-select-card:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .company-card-info {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .comp-icon {
      color: #2563eb;
      display: flex;
    }
    .comp-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .comp-sub {
      font-size: 0.65rem;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .comp-name {
      font-size: 0.88rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .comp-ruc {
      font-size: 0.75rem;
      color: #64748b;
    }
    .btn-change-comp {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      padding: 5px 9px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #2563eb;
      cursor: pointer;
      flex-shrink: 0;
    }

    .db-pill-login {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.73rem;
      font-weight: 700;
      color: #92400e;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 3px 10px;
      margin-bottom: 18px;
    }
    .db-pill-login.mongo {
      color: #065f46;
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .db-pill-login .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f59e0b;
    }
    .db-pill-login.mongo .dot {
      background: #10b981;
    }

    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.84rem;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 0.83rem;
      font-weight: 600;
      color: #334155;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
    }
    .input-wrapper input {
      width: 100%;
      padding: 10px 12px 10px 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
    }
    .input-wrapper input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 11px;
      border-radius: 8px;
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 6px;
      transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .footer-note {
      text-align: center;
      margin-top: 20px;
      font-size: 0.78rem;
      color: #64748b;
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
export class CashierLoginComponent {
  @Input() errorMessage: string | null = null;
  @Input() activeCompany: Company | null = null;
  @Input() systemStatus: SystemStatus | null = null;
  @Output() loginSuccess = new EventEmitter<{ username: string; pass: string }>();
  @Output() openCompanyModal = new EventEmitter<void>();

  username = '';
  password = '';
  loading = false;

  onSubmit(): void {
    if (!this.username || !this.password) return;
    this.loading = true;
    this.loginSuccess.emit({
      username: this.username,
      pass: this.password
    });
    setTimeout(() => {
      this.loading = false;
    }, 1200);
  }
}
