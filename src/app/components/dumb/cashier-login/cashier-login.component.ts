import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
          <p>Ingresa tus credenciales para acceder a la plataforma.</p>
        </div>

        <!-- Alerta de Error Clara y Visible -->
        <div class="error-banner" *ngIf="errorMessage">
          <app-icon name="alert" [size]="16"></app-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Formulario Limpio -->
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
                placeholder="Ingresa tu usuario"
                autocomplete="username"
                [disabled]="loading"
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
                [disabled]="loading"
              />
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading || !username || !password">
            <span *ngIf="loading" class="spinner"></span>
            <span>{{ loading ? 'Iniciando Sesión...' : 'Iniciar Sesión' }}</span>
          </button>
        </form>

        <div class="footer-note">
          <span>Emitta POS Cloud · Sistema Multi-Empresa Seguro</span>
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
      padding: 36px 36px 28px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .brand-header {
      text-align: center;
      margin-bottom: 24px;
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
    .error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.86rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
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
      margin-top: 22px;
      font-size: 0.78rem;
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
  private readonly cdr = inject(ChangeDetectorRef);

  @Output() loginSuccess = new EventEmitter<void>();

  username = '';
  password = '';
  loading = false;
  errorMessage: string | null = null;

  onSubmit(): void {
    if (!this.username || !this.password || this.loading) return;
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
    }, 3000);

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        clearTimeout(timeoutHandle);
        this.loading = false;
        if (res.success) {
          this.errorMessage = null;
          this.loginSuccess.emit();
        } else {
          this.errorMessage = res.error || 'Usuario o contraseña incorrecta.';
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
