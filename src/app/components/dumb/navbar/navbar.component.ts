import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashierUser } from '../../../models/auth.model';
import { Company, SystemStatus } from '../../../models/company.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

export type ActiveTab = 'home' | 'create-invoice' | 'invoices' | 'tenants' | 'fiscal' | 'system';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <header class="navbar-wrapper">
      <div class="wrap nav-inner">
        <!-- MARCA CON LOGO AZUL 'e' -->
        <a class="brand" (click)="tabChange.emit('create-invoice')">
          <span class="mark">e</span>
          <span class="brand-text">emitta</span>
          <span class="by">POS & FACTURACIÓN v2</span>
        </a>

        <!-- SELECTOR MULTI-EMPRESA (NUEVO) -->
        <div class="company-selector-btn" (click)="openCompanyModal.emit()" [title]="'Cambiar empresa emisora del SRI: ' + (activeCompany?.legalName || '')">
          <span class="comp-icon"><app-icon name="building" [size]="14"></app-icon></span>
          <div class="comp-text">
            <span class="comp-label">EMPRESA ACTIVA</span>
            <span class="comp-name">{{ activeCompany?.tradeName || activeCompany?.name || 'Cargando empresa...' }}</span>
          </div>
          <span class="comp-arrow">▾</span>
        </div>

        <!-- NAVEGACIÓN PRINCIPAL -->
        <nav class="nav-links">
          <button
            type="button"
            class="nav-link"
            [class.active]="activeTab === 'create-invoice'"
            (click)="tabChange.emit('create-invoice')">
            <app-icon name="cart" [size]="16"></app-icon> Punto de Venta (POS)
          </button>

          <button
            type="button"
            class="nav-link"
            [class.active]="activeTab === 'invoices'"
            (click)="tabChange.emit('invoices')">
            <app-icon name="receipt" [size]="16"></app-icon> Comprobantes SRI
          </button>

          <button
            type="button"
            class="nav-link"
            [class.active]="activeTab === 'fiscal'"
            (click)="tabChange.emit('fiscal')">
            <app-icon name="building" [size]="16"></app-icon> Configuración Fiscal
          </button>
        </nav>

        <!-- ESTADO DE BASE DE DATOS Y PERFIL DE CAJERO -->
        <div class="nav-actions">
          <!-- BADGE DE BASE DE DATOS (MONGODB ATLAS) -->
          <div
            class="db-badge"
            [class.mongo]="systemStatus?.isMongoAtlas"
            [title]="'Base de datos: ' + (systemStatus?.database || 'Local')">
            <span class="status-dot"></span>
            <span>{{ systemStatus?.isMongoAtlas ? 'MongoDB Atlas' : 'Modo Local' }}</span>
          </div>

          <!-- Perfil del Cajero activo -->
          <div class="cashier-pill" *ngIf="currentUser" [title]="currentUser.email">
            <span class="cashier-avatar"><app-icon name="user" [size]="15"></app-icon></span>
            <div class="cashier-meta">
              <span class="cashier-name">{{ currentUser.fullName }}</span>
              <span class="cashier-role">Caja {{ currentUser.boxCode }} · {{ currentUser.role }}</span>
            </div>
            <button type="button" class="btn-logout" (click)="logout.emit()" title="Cerrar turno de caja">
              <app-icon name="log-out" [size]="14"></app-icon> Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.02);
    }
    .nav-inner {
      height: 85px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 9px;
      cursor: pointer;
      text-decoration: none;
      flex-shrink: 0;
    }
    .mark {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--primary-blue);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-text {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--text-main);
    }
    .by {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-left: 2px;
    }

    /* Multi-Empresa Selector Pill */
    .company-selector-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      padding: 6px 14px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      max-width: 260px;
    }
    .company-selector-btn:hover {
      background: var(--blue-soft);
      border-color: #93c5fd;
    }
    .comp-icon {
      color: var(--primary-blue);
      display: flex;
      align-items: center;
    }
    .comp-text {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .comp-label {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .comp-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }
    .comp-arrow {
      color: var(--text-muted);
      font-size: 0.75rem;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 15px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-intro);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .nav-link:hover {
      background: #f1f5f9;
      color: var(--text-main);
    }
    .nav-link.active {
      background: var(--blue-soft);
      color: var(--primary-blue);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    /* DB Badge */
    .db-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 11px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .db-badge.mongo {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f59e0b;
    }
    .db-badge.mongo .status-dot {
      background: #10b981;
    }

    .cashier-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      padding: 5px 12px;
      border-radius: 20px;
    }
    .cashier-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #e2e8f0;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cashier-meta {
      display: flex;
      flex-direction: column;
    }
    .cashier-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.1;
    }
    .cashier-role {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .btn-logout {
      border: none;
      background: transparent;
      color: var(--danger-red);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      border-radius: 4px;
      margin-left: 4px;
    }
    .btn-logout:hover {
      background: var(--danger-bg);
    }
  `]
})
export class NavbarComponent {
  @Input() activeTab: ActiveTab = 'create-invoice';
  @Input() currentUser: CashierUser | null = null;
  @Input() activeCompany: Company | null = null;
  @Input() systemStatus: SystemStatus | null = null;
  @Input() backendConnected = true;

  @Output() tabChange = new EventEmitter<ActiveTab>();
  @Output() logout = new EventEmitter<void>();
  @Output() openCompanyModal = new EventEmitter<void>();
}
