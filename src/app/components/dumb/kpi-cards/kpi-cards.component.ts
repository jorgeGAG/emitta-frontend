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
        <div class="kpi-top">
          <span class="kpi-title">TOTAL FACTURADO</span>
          <span class="kpi-icon"><app-icon name="dollar" [size]="14"></app-icon></span>
        </div>
        <div class="kpi-main">
          <span class="kpi-value">\${{ metrics.totalAmount | number:'1.2-2' }}</span>
          <span class="kpi-sub">USD con IVA</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-title">TOTAL COMPROBANTES</span>
          <span class="kpi-icon"><app-icon name="receipt" [size]="14"></app-icon></span>
        </div>
        <div class="kpi-main">
          <span class="kpi-value">{{ metrics.totalInvoices }}</span>
          <span class="kpi-sub">Emitidos</span>
        </div>
      </div>

      <div class="kpi-card success-accent">
        <div class="kpi-top">
          <span class="kpi-title">AUTORIZADAS SRI</span>
          <span class="kpi-icon success-icon"><app-icon name="check" [size]="14"></app-icon></span>
        </div>
        <div class="kpi-main">
          <span class="kpi-value">{{ metrics.authorizedCount }}</span>
          <span class="kpi-sub success-pill">{{ getAuthorizedPercentage() }}% éxito</span>
        </div>
      </div>

      <div class="kpi-card warning-accent">
        <div class="kpi-top">
          <span class="kpi-title">EN PROCESO SRI</span>
          <span class="kpi-icon warning-icon"><app-icon name="clock" [size]="14"></app-icon></span>
        </div>
        <div class="kpi-main">
          <span class="kpi-value">{{ metrics.pendingCount }}</span>
          <span class="kpi-sub" [class.warning-pill]="metrics.pendingCount > 0">
            {{ metrics.pendingCount === 0 ? 'Sin cola' : 'En cola' }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
      transition: all 0.15s ease;
    }

    .kpi-card:hover {
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.06);
      border-color: #cbd5e1;
    }

    .kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-title {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #64748b;
      text-transform: uppercase;
    }

    .kpi-icon {
      color: #94a3b8;
      display: flex;
      align-items: center;
    }

    .kpi-main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .kpi-value {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .kpi-sub {
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
    }

    .success-accent {
      border-left: 3px solid #10b981;
    }

    .success-icon {
      color: #10b981;
    }

    .success-pill {
      background: #f0fdf4;
      color: #166534;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.68rem;
      border: 1px solid #dcfce7;
      font-weight: 700;
    }

    .warning-accent {
      border-left: 3px solid #f59e0b;
    }

    .warning-icon {
      color: #f59e0b;
    }

    .warning-pill {
      background: #fefce8;
      color: #854d0e;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.68rem;
      border: 1px solid #fef08a;
      font-weight: 700;
    }

    @media (max-width: 900px) {
      .kpi-container {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class KpiCardsComponent {
  @Input() metrics: BillingMetrics | null = null;

  getAuthorizedPercentage(): number {
    if (!this.metrics || this.metrics.totalInvoices === 0) return 0;
    return Math.round((this.metrics.authorizedCount / this.metrics.totalInvoices) * 100);
  }
}
