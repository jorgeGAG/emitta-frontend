import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-cashier-login',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="login-page">
      <div class="login-card">
        <!-- Logo & Branding Limpio -->
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
          <span class="badge-tag">Facturación Electrónica · SRI Ecuador</span>
          <h2>Acceso al Sistema</h2>
          <p>Ingresa tu correo institucional y contraseña.</p>
        </div>

        <!-- Alerta de Error Clara y Visible -->
        <div class="error-banner" *ngIf="errorMessage">
          <app-icon name="alert" [size]="16"></app-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Formulario Seguro -->
        <form (ngSubmit)="onSubmit()" class="login-form">
          <!-- Campo: Correo Electrónico con Validación -->
          <div class="form-group">
            <label for="email">Correo Electrónico</label>
            <div class="input-wrapper" [class.input-error]="email && !isEmailValid">
              <span class="input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                placeholder="usuario@mitienda.com"
                autocomplete="email"
                [disabled]="loading"
              />
            </div>
            <span class="field-error" *ngIf="email && !isEmailValid">
              ⚠️ Ingresa un correo electrónico válido (ej: cajero@mitienda.com)
            </span>
          </div>

          <!-- Campo: Contraseña con Visibilidad Opcional -->
          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-wrapper" [class.input-error]="password && !isPasswordValid">
              <span class="input-icon"><app-icon name="lock" [size]="15"></app-icon></span>
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                name="password"
                [(ngModel)]="password"
                required
                minlength="6"
                placeholder="••••••••"
                autocomplete="current-password"
                [disabled]="loading"
              />
              <button
                type="button"
                class="btn-toggle-pass"
                (click)="showPassword = !showPassword"
                [title]="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                tabindex="-1"
              >
                <svg *ngIf="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg *ngIf="showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Botón de Envío -->
          <button type="submit" class="btn-primary" [disabled]="loading || !isFormValid">
            <span *ngIf="loading" class="spinner"></span>
            <span>{{ loading ? 'Iniciando Sesión...' : 'Iniciar Sesión' }}</span>
          </button>
        </form>

        <div class="footer-note">
          <span>Emitta POS Cloud · Acceso Protegido</span>
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
      padding: 34px 34px 26px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .brand-header {
      text-align: center;
      margin-bottom: 22px;
    }
    .logo-box {
      width: 50px;
      height: 50px;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px;
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
      font-size: 1.4rem;
      font-weight: 800;
      color: #0f172a;
    }
    .brand-header p {
      margin: 0;
      font-size: 0.84rem;
      color: #64748b;
    }
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-group label {
      font-size: 0.83rem;
      font-weight: 600;
      color: #334155;
    }
    .label-hint {
      font-size: 0.72rem;
      color: #64748b;
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
      pointer-events: none;
    }
    .input-wrapper input {
      width: 100%;
      padding: 10px 38px 10px 38px;
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
    .input-wrapper.input-error input {
      border-color: #f87171;
      background: #fffafa;
    }
    .btn-toggle-pass {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      border-radius: 4px;
    }
    .btn-toggle-pass:hover {
      color: #475569;
    }
    .field-error {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 500;
      margin-top: 2px;
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
      margin-top: 4px;
      transition: background 0.2s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .footer-note {
      text-align: center;
      margin-top: 22px;
      font-size: 0.74rem;
      color: #94a3b8;
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  @Output() loginSuccess = new EventEmitter<void>();

  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage: string | null = null;

  get isEmailValid(): boolean {
    if (!this.email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(this.email.trim());
  }

  get isPasswordValid(): boolean {
    return !!this.password && this.password.length >= 6;
  }

  get isFormValid(): boolean {
    return this.isEmailValid && this.isPasswordValid;
  }

  onSubmit(): void {
    if (!this.isFormValid || this.loading) return;
    this.loading = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    const timeoutHandle = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        if (!this.errorMessage) {
          this.errorMessage = 'Tiempo de espera agotado al autenticar.';
        }
        this.cdr.detectChanges();
      }
    }, 4000);

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        clearTimeout(timeoutHandle);
        this.loading = false;
        if (res.success) {
          this.errorMessage = null;
          this.loginSuccess.emit();
          this.router.navigate(['/pos']);
        } else {
          this.errorMessage = res.error || 'Correo o contraseña incorrecta.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        clearTimeout(timeoutHandle);
        this.loading = false;
        this.errorMessage = err.error?.error || 'Error de conexión con la base de datos.';
        this.cdr.detectChanges();
      }
    });
  }
}
