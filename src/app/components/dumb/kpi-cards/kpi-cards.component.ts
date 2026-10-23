import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingMetrics } from '../../../models/invoice.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="kpi-container" *ngIf="metrics">
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">TOTAL FACTURADO</span>
          <span class="kpi-icon"><app-icon name="dollar" [size]="18"></app-icon></span>
        </div>
        <div class="kpi-value">\${{ metrics.totalAmount | number:'1.2-2' }}</div>
        <div class="kpi-footer">
          <span class="positive">USD con IVA 15%</span>
          <span>Base imponible</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">COMPROBANTES TOTALES</span>
          <span class="kpi-icon"><app-icon name="file-text" [size]="18"></app-icon></span>
        </div>
        <div class="kpi-value">{{ metrics.totalInvoices }}</div>
        <div class="kpi-footer">
          <span>Establecimiento 001 - P.Emi 001</span>
        </div>
      </div>

      <div class="kpi-card success-card">
        <div class="kpi-header">
          <span class="kpi-title">AUTORIZADAS POR EL SRI</span>
          <span class="kpi-icon"><app-icon name="check" [size]="18"></app-icon></span>
        </div>
        <div class="kpi-value">{{ metrics.authorizedCount }}</div>
        <div class="kpi-footer">
          <span class="badge success">{{ getAuthorizedPercentage() }}% de éxito</span>
          <span>Clave de acceso y RIDE</span>
        </div>
      </div>

      <div class="kpi-card warning-card">
        <div class="kpi-header">
          <span class="kpi-title">EN COLA / ASÍNCRONO</span>
          <span class="kpi-icon"><app-icon name="clock" [size]="18"></app-icon></span>
        </div>
        <div class="kpi-value">{{ metrics.pendingCount }}</div>
        <div class="kpi-footer">
          <span class="badge warning">RabbitMQ + XAdES</span>
          <span>Procesamiento Outbox</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid var(--border-card);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 16px rgba(21, 49, 81, 0.03);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(21, 49, 81, 0.06);
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .kpi-icon {
      font-size: 16px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 800;
      color: #10243a;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    .kpi-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #73859a;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
    .positive {
      color: #2563eb;
      font-weight: 600;
    }
    .success-card {
      border-top: 3px solid #10b981;
    }
    .warning-card {
      border-top: 3px solid #f59e0b;
    }
  `]
})
export class KpiCardsComponent {
  // RETO 4: Dumb Component
  @Input() metrics: BillingMetrics | null = null;

  getAuthorizedPercentage(): number {
    if (!this.metrics || this.metrics.totalInvoices === 0) return 0;
    return Math.round((this.metrics.authorizedCount / this.metrics.totalInvoices) * 100);
  }
}
