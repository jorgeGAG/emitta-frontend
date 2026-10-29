import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentView } from '../../../models/invoice.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-document-registry',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="card registry-card">
      <div class="registry-header">
        <div>
          <h2>Registro de Comprobantes Electrónicos</h2>
          <p class="section-desc">Historial fiscal consolidado y estado en tiempo real del Web Service del SRI de Ecuador.</p>
        </div>

        <div class="filters-group">
          <div class="search-box">
            <span class="search-icon"><app-icon name="search" [size]="14"></app-icon></span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar por cliente, RUC o secuencial..."
              class="search-input"
            />
          </div>

          <div class="filter-pills">
            <button
              class="pill"
              [class.active]="filterStatus === 'ALL'"
              (click)="filterStatus = 'ALL'">
              Todos ({{ (invoices || []).length }})
            </button>
            <button
              class="pill"
              [class.active]="filterStatus === 'AUTHORIZED'"
              (click)="filterStatus = 'AUTHORIZED'">
              Autorizados
            </button>
            <button
              class="pill"
              [class.active]="filterStatus === 'PENDING'"
              (click)="filterStatus = 'PENDING'">
              En Proceso
            </button>
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="registry-table">
          <thead>
            <tr>
              <th style="width: 170px;">Secuencial / ID</th>
              <th>Cliente / Razón Social</th>
              <th style="width: 150px;">Fecha Emisión</th>
              <th style="width: 120px;" class="text-right">Total USD</th>
              <th style="width: 180px;">Estado Fiscal</th>
              <th>Clave de Acceso (49 dígitos SRI)</th>
              <th style="width: 120px;" class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let doc of filteredInvoices()"
              [class.row-selected]="doc.id === selectedId"
              [class.row-highlighted]="doc.id === highlightedId">
              <td>
                <div class="seq-group">
                  <div class="seq-badge-row">
                    <span class="seq-badge">{{ doc.sequential }}</span>
                    <span class="new-emitted-badge" *ngIf="doc.id === highlightedId">
                      <app-icon name="check" [size]="10"></app-icon> Recién emitida
                    </span>
                  </div>
                  <span class="uuid-label">{{ doc.id.slice(0, 8) }}...</span>
                </div>
              </td>
              <td>
                <div class="buyer-group">
                  <span class="buyer-title">{{ doc.buyer.name }}</span>
                  <span class="buyer-id">{{ doc.buyer.identificationType }}: {{ doc.buyer.identification }}</span>
                </div>
              </td>
              <td class="text-muted">
                {{ doc.issuedAt | date:'dd/MM/yyyy HH:mm' }}
              </td>
              <td class="text-right font-bold total-cell">
                \${{ doc.total | number:'1.2-2' }}
              </td>
              <td>
                <span class="status-pill" [ngClass]="getStatusPillClass(doc.status)">
                  <span class="status-dot"></span>
                  <span>{{ getStatusLabel(doc.status) }}</span>
                </span>
              </td>
              <td>
                <div class="key-container">
                  <code class="access-key-code" [title]="doc.accessKey">{{ doc.accessKey || 'Generando...' }}</code>
                  <button
                    *ngIf="doc.accessKey && doc.accessKey.length === 49"
                    type="button"
                    class="btn-copy"
                    (click)="copyKey(doc.accessKey)"
                    title="Copiar Clave de Acceso">
                    <app-icon name="copy" [size]="13"></app-icon>
                  </button>
                </div>
              </td>
              <td class="text-center">
                <div class="actions-group">
                  <button type="button" class="btn-table-action view" (click)="selectInvoice.emit(doc.id)" title="Ver detalle de la Factura (RIDE)">
                    <app-icon name="eye" [size]="13"></app-icon> Detalle
                  </button>
                  <button
                    type="button"
                    class="btn-table-action pdf"
                    [disabled]="doc.status !== 'AUTHORIZED'"
                    (click)="downloadOfficialPdf.emit(doc.id)"
                    title="Descargar PDF Oficial (RIDE)">
                    <app-icon name="pdf" [size]="13"></app-icon> PDF
                  </button>
                  <button
                    type="button"
                    class="btn-table-action xml"
                    [disabled]="doc.status !== 'AUTHORIZED'"
                    (click)="downloadOfficialXml.emit(doc.id)"
                    title="Descargar XML Autorizado por el SRI">
                    <app-icon name="xml" [size]="13"></app-icon> XML
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="filteredInvoices().length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-content">
                  <app-icon name="inbox" [size]="24" class="empty-icon"></app-icon>
                  <span>No se encontraron comprobantes con el filtro aplicado.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <span>Mostrando {{ filteredInvoices().length }} de {{ (invoices || []).length }} comprobantes registrados</span>
        <span *ngIf="copiedMessage" class="copy-toast">✓ {{ copiedMessage }}</span>
      </div>
    </div>
  `,
  styles: [`
    .registry-card {
      margin-bottom: 28px;
      background: #ffffff;
      border: 1px solid #dfe7f1;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(16, 36, 58, 0.03);
    }
    .registry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
      border-bottom: 1px solid #eef2f6;
      padding-bottom: 16px;
    }
    .registry-header h2 {
      color: #10243a;
      font-size: 20px;
      font-weight: 700;
      margin: 0;
    }
    .section-desc {
      color: #52677c;
      margin: 4px 0 0;
      font-size: 13px;
    }
    .filters-group {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .search-box {
      position: relative;
      min-width: 280px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: #73859a;
    }
    .search-input {
      padding-left: 36px;
      height: 38px;
      font-size: 13px;
      background: #fbfcfe;
      border: 1px solid #dfe7f1;
      border-radius: 8px;
      color: #10243a;
    }
    .search-input:focus {
      border-color: #2563eb;
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .filter-pills {
      display: flex;
      background: #f0f4f9;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #dfe7f1;
    }
    .pill {
      background: transparent;
      border: none;
      color: #52677c;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      min-height: auto;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pill.active {
      background: #ffffff;
      color: #2563eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .registry-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .registry-table th {
      background: #f8fafc;
      color: #52677c;
      font-weight: 600;
      font-size: 12px;
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .registry-table td {
      padding: 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #10243a;
    }
    .registry-table tr:hover {
      background: #fbfcfe;
    }
    .row-selected {
      background: #eff6ff !important;
      box-shadow: inset 4px 0 0 #2563eb;
    }
    .row-highlighted {
      background: #f0fdf4 !important;
      box-shadow: inset 4px 0 0 #10b981;
      animation: highlightPulse 1.8s ease-out;
    }
    .row-highlighted.row-selected {
      background: #eff6ff !important;
      box-shadow: inset 4px 0 0 #2563eb;
    }
    .seq-badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .new-emitted-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
      padding: 1px 7px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    @keyframes highlightPulse {
      0% {
        background-color: #bbf7d0;
      }
      100% {
        background-color: #f0fdf4;
      }
    }
    .seq-group {
      display: flex;
      flex-direction: column;
    }
    .seq-badge {
      font-weight: 700;
      color: #10243a;
      font-family: var(--font-mono);
    }
    .uuid-label {
      font-size: 11px;
      color: #73859a;
      font-family: var(--font-mono);
    }
    .buyer-group {
      display: flex;
      flex-direction: column;
    }
    .buyer-title {
      font-weight: 600;
      color: #10243a;
    }
    .buyer-id {
      font-size: 11px;
      color: #73859a;
      font-family: var(--font-mono);
    }
    .total-cell {
      color: #2563eb;
      font-size: 14px;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      width: fit-content;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-pill.authorized {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }
    .status-pill.authorized .status-dot {
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }
    .status-pill.signed {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }
    .status-pill.signed .status-dot {
      background: #3b82f6;
    }
    .status-pill.pending {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .status-pill.pending .status-dot {
      background: #f59e0b;
      animation: blink 1s infinite alternate;
    }
    @keyframes blink {
      from { opacity: 0.3; }
      to { opacity: 1; }
    }
    .status-pill.rejected {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .key-container {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .access-key-code {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #52677c;
      background: #f8fafc;
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;
    }
    .btn-copy {
      background: transparent;
      border: none;
      color: #73859a;
      cursor: pointer;
      font-size: 12px;
      padding: 2px 4px;
      min-height: auto;
    }
    .btn-copy:hover {
      color: #2563eb;
      transform: none;
    }
    .actions-group {
      display: inline-flex;
      gap: 6px;
    }
    .btn-table-action {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      min-height: auto;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-table-action.view {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
    }
    .btn-table-action.view:hover {
      background: #2563eb;
      color: white;
    }
    .btn-table-action.pdf {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
    }
    .btn-table-action.pdf:hover:not(:disabled) {
      background: #dc2626;
      color: white;
    }
    .btn-table-action.xml {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #059669;
    }
    .btn-table-action.xml:hover:not(:disabled) {
      background: #059669;
      color: white;
    }
    .btn-table-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #eef2f6;
      font-size: 12px;
      color: #73859a;
    }
    .copy-toast {
      color: #10b981;
      font-weight: 600;
    }
    .empty-row td {
      padding: 3rem 1rem;
      text-align: center;
    }
    .empty-content {
      color: #73859a;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class DocumentRegistryComponent {
  // RETO 4: Dumb Component puro conectado exclusivamente por @Input y @Output
  @Input() invoices: DocumentView[] | null = [];
  @Input() selectedId: string | null = null;
  @Input() highlightedId: string | null = null;
  @Output() selectInvoice = new EventEmitter<string>();
  @Output() downloadOfficialPdf = new EventEmitter<string>();
  @Output() downloadOfficialXml = new EventEmitter<string>();

  searchTerm = '';
  filterStatus: 'ALL' | 'AUTHORIZED' | 'PENDING' = 'ALL';
  copiedMessage = '';

  filteredInvoices(): DocumentView[] {
    if (!this.invoices) return [];
    return this.invoices.filter(doc => {
      // Filtro de texto
      const term = this.searchTerm.toLowerCase().trim();
      const matchText = !term ||
        doc.sequential.toLowerCase().includes(term) ||
        doc.buyer.name.toLowerCase().includes(term) ||
        doc.buyer.identification.includes(term) ||
        (doc.accessKey && doc.accessKey.includes(term));

      // Filtro de estado
      let matchStatus = true;
      if (this.filterStatus === 'AUTHORIZED') {
        matchStatus = doc.status === 'AUTHORIZED';
      } else if (this.filterStatus === 'PENDING') {
        matchStatus = doc.status !== 'AUTHORIZED' && doc.status !== 'NOT_AUTHORIZED';
      }

      return matchText && matchStatus;
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'Autorizada SRI',
      SIGNED: 'Firmada XAdES',
      GENERATING: 'Generando XML',
      QUEUED: 'En Cola RabbitMQ',
      NOT_AUTHORIZED: 'No Autorizada'
    };
    return map[status] || status;
  }

  getStatusPillClass(status: string): string {
    if (status === 'AUTHORIZED') return 'authorized';
    if (status === 'SIGNED') return 'signed';
    if (status === 'NOT_AUTHORIZED') return 'rejected';
    return 'pending';
  }

  copyKey(key: string): void {
    navigator.clipboard.writeText(key);
    this.copiedMessage = 'Clave de 49 dígitos copiada al portapapeles';
    setTimeout(() => {
      this.copiedMessage = '';
    }, 2500);
  }
}
