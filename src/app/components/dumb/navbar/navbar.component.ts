import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashierUser } from '../../../models/auth.model';
import { Company, SystemStatus } from '../../../models/company.model';
import { FiscalConfigurationEntry } from '../../../models/fiscal.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

export type ActiveTab = 'home' | 'create-invoice' | 'invoices' | 'tenants' | 'fiscal' | 'system';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <header class="navbar-wrapper">
      <div class="nav-container">
        <!-- 1. IDENTIDAD DE LA EMPRESA (MARCA PRINCIPAL) -->
        <div class="brand-zone">
          <div
            class="company-card"
            [class.interactive]="isSuperAdmin"
            (click)="onCompanyClick()"
            [title]="isSuperAdmin ? 'Clic para cambiar de empresa (Modo Superadmin)' : (activeCompany?.legalName || 'Empresa Emisora')">
            <div class="company-icon-box">
              <app-icon name="building" [size]="18"></app-icon>
            </div>
            <div class="company-info">
              <div class="company-name-row">
                <span class="company-title">
                  {{ activeFiscalEntry?.tradeName || activeFiscalEntry?.legalName || activeCompany?.tradeName || activeCompany?.legalName || 'Comercio Ecuador (Jorge Ante)' }}
                </span>
                <span *ngIf="isSuperAdmin" class="switch-badge" title="Cambiar empresa">
                  Cambiar ▾
                </span>
              </div>
              <span class="company-sub">
                RUC: {{ activeFiscalEntry?.ruc || activeCompany?.ruc || '0550249817001' }}
                <span class="sub-dot">·</span>
                {{ activeFiscalEntry?.establishmentCode ? ('Sucursal ' + activeFiscalEntry?.establishmentCode) : 'Matriz 001' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. NAVEGACIÓN PRINCIPAL (TABS SEGMENTADOS MODERNOS) -->
        <nav class="nav-segmented">
          <button
            type="button"
            class="segmented-btn"
            [class.active]="activeTab === 'create-invoice'"
            (click)="tabChange.emit('create-invoice')">
            <app-icon name="cart" [size]="16"></app-icon>
            <span>Punto de Venta</span>
          </button>

          <button
            type="button"
            class="segmented-btn"
            [class.active]="activeTab === 'invoices'"
            (click)="tabChange.emit('invoices')">
            <app-icon name="receipt" [size]="16"></app-icon>
            <span>Comprobantes SRI</span>
          </button>

          <button
            *ngIf="canManageFiscal"
            type="button"
            class="segmented-btn"
            [class.active]="activeTab === 'fiscal'"
            (click)="tabChange.emit('fiscal')">
            <app-icon name="building" [size]="16"></app-icon>
            <span>Configuración Fiscal</span>
          </button>
        </nav>

        <!-- 3. ACCIONES & PERFIL DE USUARIO -->
        <div class="user-actions-zone">
          <!-- Indicador de conexión en tiempo real con la API Oficial de Facturación SRI -->
          <div
            class="live-status-indicator"
            [class.offline]="!backendConnected"
            [title]="backendConnected ? 'Conexión activa con la API oficial de Facturación Electrónica (SRI)' : 'Sin conexión con la API oficial del SRI'">
            <span class="pulse-dot" [class.dot-offline]="!backendConnected"></span>
            <span class="status-label">{{ backendConnected ? 'API SRI Conectada' : 'API Desconectada' }}</span>
          </div>

          <div class="nav-divider"></div>

          <!-- Perfil de Usuario Elegante -->
          <div class="user-profile-badge" *ngIf="currentUser" [title]="currentUser.email">
            <div class="user-avatar">
              {{ getUserInitials() }}
            </div>
            <div class="user-details">
              <span class="user-name">{{ currentUser.fullName }}</span>
              <span class="user-role-pill" [ngClass]="getRoleBadgeClass()">
                {{ getRoleLabel() }}
              </span>
            </div>
          </div>

          <!-- Botón de Salir Moderno -->
          <button
            type="button"
            class="btn-logout-modern"
            (click)="logout.emit()"
            title="Cerrar sesión segura">
            <app-icon name="log-out" [size]="15"></app-icon>
            <span class="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .nav-container {
      max-width: 1400px;
      width: 100%;
      height: 66px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    /* 1. ZONA DE MARCA / EMPRESA EMISORA */
    .brand-zone {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .company-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 10px;
      border-radius: 10px;
      transition: all 0.2s ease;
      user-select: none;
    }

    .company-card.interactive {
      cursor: pointer;
    }

    .company-card.interactive:hover {
      background: #f8fafc;
    }

    .company-card.interactive:hover .switch-badge {
      background: #dbeafe;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .company-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
      flex-shrink: 0;
    }

    .company-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      line-height: 1.15;
    }

    .company-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .company-title {
      font-size: 0.96rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
      max-width: 240px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .switch-badge {
      font-size: 0.65rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      letter-spacing: 0.2px;
      transition: all 0.2s ease;
    }

    .company-sub {
      font-size: 0.73rem;
      font-weight: 500;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sub-dot {
      color: #94a3b8;
    }

    /* 2. NAVEGACIÓN SEGMENTADA CENTRAL */
    .nav-segmented {
      display: flex;
      align-items: center;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
      gap: 4px;
    }

    .segmented-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 15px;
      border-radius: 7px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
    }

    .segmented-btn:hover:not(.active) {
      color: #0f172a;
      background: rgba(255, 255, 255, 0.6);
    }

    .segmented-btn.active {
      background: #ffffff;
      color: #2563eb;
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    /* 3. ACCIONES & PERFIL */
    .user-actions-zone {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .live-status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #f0fdf4;
      border: 1px solid #dcfce7;
      border-radius: 14px;
      cursor: help;
      transition: all 0.2s ease;
    }

    .live-status-indicator.offline {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
    }

    .pulse-dot.dot-offline {
      background: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
    }

    .status-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #166534;
      letter-spacing: 0.2px;
    }

    .live-status-indicator.offline .status-label {
      color: #991b1b;
    }

    .nav-divider {
      width: 1px;
      height: 24px;
      background: #e2e8f0;
    }

    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cbd5e1;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 1px;
      line-height: 1.1;
    }

    .user-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: #0f172a;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role-pill {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 4px;
      width: fit-content;
    }

    .role-superadmin {
      background: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
    }

    .role-admin {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    .role-cashier {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }

    .role-default {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .btn-logout-modern {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn-logout-modern:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }

    @media (max-width: 900px) {
      .company-title {
        max-width: 150px;
      }
      .segmented-btn span {
        display: none;
      }
      .logout-text {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  @Input() activeTab: ActiveTab = 'create-invoice';
  @Input() currentUser: CashierUser | null = null;
  @Input() activeCompany: Company | null = null;
  @Input() activeFiscalEntry: FiscalConfigurationEntry | null = null;
  @Input() systemStatus: SystemStatus | null = null;
  @Input() backendConnected = true;

  @Output() tabChange = new EventEmitter<ActiveTab>();
  @Output() logout = new EventEmitter<void>();
  @Output() openCompanyModal = new EventEmitter<void>();

  get isSuperAdmin(): boolean {
    return this.currentUser?.role === 'SUPERADMIN';
  }

  get canManageFiscal(): boolean {
    return (
      this.currentUser?.role === 'SUPERADMIN' ||
      this.currentUser?.role === 'ADMIN_EMPRESA' ||
      this.currentUser?.role === 'SUPERVISOR'
    );
  }

  onCompanyClick(): void {
    if (this.isSuperAdmin) {
      this.openCompanyModal.emit();
    }
  }

  getUserInitials(): string {
    if (!this.currentUser?.fullName) return 'U';
    const parts = this.currentUser.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  getRoleBadgeClass(): string {
    switch (this.currentUser?.role) {
      case 'SUPERADMIN':
        return 'role-superadmin';
      case 'ADMIN_EMPRESA':
        return 'role-admin';
      case 'CAJERO':
        return 'role-cashier';
      default:
        return 'role-default';
    }
  }

  getRoleLabel(): string {
    switch (this.currentUser?.role) {
      case 'SUPERADMIN':
        return 'Superadmin';
      case 'ADMIN_EMPRESA':
        return 'Admin';
      case 'CAJERO':
        return `Caja ${this.currentUser?.boxCode || '01'}`;
      default:
        return this.currentUser?.role || 'Usuario';
    }
  }
}
