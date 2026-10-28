import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentView } from '../../../models/invoice.model';
import { FiscalConfigurationEntry } from '../../../models/fiscal.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-ride-viewer-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  template: `
    <div class="modal-backdrop" *ngIf="invoice" (click)="close.emit()">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        <!-- BARRA SUPERIOR DE ACCIONES -->
        <div class="dialog-top-bar">
          <div class="top-title-group">
            <span class="badge" [class.success]="invoice.status === 'AUTHORIZED'">
              {{ invoice.status === 'AUTHORIZED' ? '✓ COMPROBANTE AUTORIZADO' : '⏳ COMPROBANTE EN PROCESO' }}
            </span>
            <span class="top-seq">{{ invoice.sequential }}</span>
          </div>

          <div class="top-actions">
            <button type="button" class="btn-dialog-close" (click)="close.emit()" title="Cerrar">
              <app-icon name="x" [size]="18"></app-icon>
            </button>
          </div>
        </div>

        <!-- CONTENEDOR DEL RIDE OFICIAL ECUADOR (Hoja de Factura Electrónica) -->
        <div class="ride-sheet" id="printable-ride">
          <!-- CABECERA RIDE -->
          <div class="ride-header-grid">
            <!-- COLUMNA IZQUIERDA: DATOS DEL EMISOR -->
            <div class="issuer-box">
              <div class="issuer-brand">
                <span class="emitta-logo">emitta</span>
                <span class="by-text">POS Fiscal</span>
              </div>
              <h3 class="issuer-legal-name">{{ resolvedIssuer.legalName }}</h3>
              <p class="issuer-trade-name" *ngIf="resolvedIssuer.tradeName">
                <strong>Nombre Comercial:</strong> {{ resolvedIssuer.tradeName }}
              </p>
              <p class="issuer-address">
                <strong>Dirección Matriz:</strong> {{ resolvedIssuer.mainAddress }}
              </p>
              <p class="issuer-address">
                <strong>Dirección Sucursal:</strong> Establecimiento {{ resolvedIssuer.establishmentCode }} - {{ resolvedIssuer.establishmentAddress }}
              </p>
              <div class="special-tax-flags">
                <span>OBLIGADO A LLEVAR CONTABILIDAD: <strong>NO</strong></span>
                <span>CONTRIBUYENTE RÉGIMEN GENERAL / RIMPE</span>
              </div>
            </div>

            <!-- COLUMNA DERECHA: CAJA FISCAL SRI -->
            <div class="fiscal-box">
              <div class="fiscal-title-row">
                <span class="ruc-title">R.U.C.: {{ resolvedIssuer.ruc }}</span>
                <span class="doc-title">FACTURA</span>
                <span class="doc-num">No. {{ invoice.sequential }}</span>
              </div>

              <div class="fiscal-meta">
                <div class="meta-row">
                  <span class="meta-lbl">NÚMERO DE AUTORIZACIÓN:</span>
                  <span class="meta-val code">{{ invoice.accessKey || 'PENDIENTE DE ASIGNACION SRI' }}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-lbl">FECHA Y HORA DE AUTORIZACIÓN:</span>
                  <span class="meta-val">{{ invoice.authorizedAt ? (invoice.authorizedAt | date:'dd/MM/yyyy HH:mm:ss') : 'EN TRÁMITE CELCER TEST' }}</span>
                </div>
                <div class="meta-row inline">
                  <div><span class="meta-lbl">AMBIENTE:</span> <strong>{{ invoice.environment === 'TEST' ? 'PRUEBAS' : 'PRODUCCIÓN' }}</strong></div>
                  <div><span class="meta-lbl">EMISIÓN:</span> <strong>NORMAL</strong></div>
                </div>
              </div>

              <!-- CLAVE DE ACCESO -->
              <div class="barcode-box">
                <span class="meta-lbl">CLAVE DE ACCESO:</span>
                <code class="barcode-digits">{{ invoice.accessKey || '0000000000000000000000000000000000000000000000000' }}</code>
              </div>
            </div>
          </div>

          <!-- DATOS DEL COMPRADOR -->
          <div class="buyer-box">
            <div class="buyer-grid">
              <div><strong>Razón Social / Nombres:</strong> {{ invoice.buyer.name }}</div>
              <div><strong>Identificación ({{ invoice.buyer.identificationType }}):</strong> {{ invoice.buyer.identification }}</div>
              <div><strong>Fecha de Emisión:</strong> {{ invoice.issuedAt | date:'dd/MM/yyyy' }}</div>
              <div><strong>Guía de Remisión:</strong> S/N</div>
              <div class="col-span-2"><strong>Dirección:</strong> {{ invoice.buyer.address || 'Quito, Ecuador' }}</div>
              <div class="col-span-2"><strong>Correo Electrónico:</strong> {{ invoice.buyer.email || 'N/A' }}</div>
            </div>
          </div>

          <!-- TABLA DE DETALLES DE PRODUCTOS / SERVICIOS -->
          <table class="ride-items-table">
            <thead>
              <tr>
                <th style="width: 100px;">Cod. Principal</th>
                <th style="width: 60px;" class="text-center">Cant.</th>
                <th>Descripción</th>
                <th style="width: 100px;" class="text-right">Precio Unit.</th>
                <th style="width: 90px;" class="text-right">Descuento</th>
                <th style="width: 110px;" class="text-right">Precio Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of invoice.items">
                <td><code>{{ it.sku }}</code></td>
                <td class="text-center">{{ it.quantity }}</td>
                <td>{{ it.description }}</td>
                <td class="text-right">\${{ it.unitPrice | number:'1.2-2' }}</td>
                <td class="text-right">\${{ (it.discount || 0) | number:'1.2-2' }}</td>
                <td class="text-right font-bold">\${{ it.subtotal || ((it.quantity * it.unitPrice) - (it.discount || 0)) | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- PIE CON FORMA DE PAGO E IMPUESTOS OFICIALES -->
          <div class="ride-footer-grid">
            <!-- FORMA DE PAGO E INFORMACION ADICIONAL -->
            <div class="additional-box">
              <div class="info-adicional-title">INFORMACIÓN ADICIONAL</div>
              <div class="adicional-content">
                <div><span>Plataforma:</span> Emitta Core API v1.0 (Ecuador)</div>
                <div><span>Documento Idempotente:</span> {{ invoice.id }}</div>
                <div><span>Tipo de Documento:</span> Factura Electrónica (01)</div>
              </div>

              <div class="info-adicional-title" style="margin-top: 14px;">FORMA DE PAGO</div>
              <table class="payment-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of invoice.payments">
                    <td>{{ getPaymentLabel(p.paymentMethod) }}</td>
                    <td class="text-right font-bold">\${{ p.total | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- CUADRO DE TOTALES SRI -->
            <div class="taxes-box">
              <table class="taxes-table">
                <tbody>
                  <tr>
                    <td>SUBTOTAL 15%:</td>
                    <td class="text-right">\${{ invoice.subtotal15 | number:'1.2-2' }}</td>
                  </tr>
                  <tr>
                    <td>SUBTOTAL 0%:</td>
                    <td class="text-right">\${{ invoice.subtotal0 | number:'1.2-2' }}</td>
                  </tr>
                  <tr>
                    <td>SUBTOTAL SIN IMPUESTOS:</td>
                    <td class="text-right">\${{ invoice.subtotalWithoutTax | number:'1.2-2' }}</td>
                  </tr>
                  <tr>
                    <td>TOTAL DESCUENTO:</td>
                    <td class="text-right">\${{ invoice.totalDiscount | number:'1.2-2' }}</td>
                  </tr>
                  <tr>
                    <td>IVA 15%:</td>
                    <td class="text-right font-bold">\${{ invoice.ivaAmount | number:'1.2-2' }}</td>
                  </tr>
                  <tr class="grand-total-row">
                    <td>VALOR TOTAL:</td>
                    <td class="text-right grand-total-cell">\${{ invoice.total | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(5px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 20px;
    }
    .modal-dialog {
      background: #18181b;
      border: 1px solid #303036;
      border-radius: 16px;
      width: 100%;
      max-width: 950px;
      max-height: 94vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .dialog-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      background: #121212;
      border-bottom: 1px solid #27272a;
      flex-wrap: wrap;
      gap: 12px;
    }
    .top-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .top-seq {
      font-size: 15px;
      font-weight: 700;
      color: #fafafa;
      font-family: var(--font-mono);
    }
    .top-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn-download-pdf, .btn-download-xml, .btn-print-ride {
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      min-height: auto;
      border-radius: 7px;
      cursor: pointer;
    }
    .btn-download-pdf {
      background: #2563eb;
      border: 1px solid #1d4ed8;
      color: white;
    }
    .btn-download-pdf:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-download-pdf:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .btn-download-xml {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
    }
    .btn-download-xml:hover {
      background: #10b981;
      color: white;
    }
    .btn-print-ride {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cbd5e1;
    }
    .btn-print-ride:hover {
      background: rgba(255, 255, 255, 0.18);
      color: white;
    }
    .btn-dialog-close {
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 18px;
      padding: 6px 10px;
      min-height: auto;
      cursor: pointer;
    }
    .btn-dialog-close:hover {
      color: white;
    }

    /* HOJA RIDE ESTILO ECUADOR */
    .ride-sheet {
      background: #ffffff;
      color: #0f172a;
      padding: 32px;
      overflow-y: auto;
      font-size: 12px;
      line-height: 1.4;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .ride-header-grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 20px;
      margin-bottom: 16px;
    }
    .issuer-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
    }
    .issuer-brand {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin-bottom: 10px;
    }
    .emitta-logo {
      font-size: 26px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.04em;
    }
    .by-text {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .issuer-legal-name {
      font-size: 13px;
      margin: 0 0 8px;
      color: #0f172a;
    }
    .issuer-trade-name, .issuer-address {
      font-size: 11px;
      color: #334155;
      margin: 4px 0;
    }
    .special-tax-flags {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .fiscal-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
    }
    .fiscal-title-row {
      display: flex;
      flex-direction: column;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .ruc-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 0.05em;
    }
    .doc-num {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .meta-row {
      margin-bottom: 6px;
    }
    .meta-row.inline {
      display: flex;
      justify-content: space-between;
    }
    .meta-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      display: block;
    }
    .meta-val {
      font-size: 11px;
      color: #0f172a;
    }
    .meta-val.code {
      font-family: var(--font-mono);
      font-size: 10px;
      word-break: break-all;
    }
    .barcode-box {
      margin-top: 10px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .barcode-digits {
      font-size: 11px;
      font-family: var(--font-mono);
      letter-spacing: 0.5px;
      color: #0f172a;
      background: #f8fafc;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      word-break: break-all;
      display: block;
    }
    .buyer-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .buyer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      font-size: 11px;
      color: #1e293b;
    }
    .col-span-2 {
      grid-column: span 2;
    }
    .ride-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #cbd5e1;
    }
    .ride-items-table th {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 700;
    }
    .ride-items-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      font-size: 11px;
      color: #0f172a;
    }
    .ride-footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .info-adicional-title {
      font-size: 10px;
      font-weight: 700;
      color: #1e3a8a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .adicional-content {
      font-size: 10px;
      color: #475569;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .payment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #cbd5e1;
    }
    .payment-table th, .payment-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      color: #334155;
    }
    .taxes-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }
    .taxes-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .taxes-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .grand-total-row td {
      background: #f8fafc;
      font-weight: 800;
      font-size: 13px;
      border-top: 2px solid #0f172a;
      color: #0f172a;
    }
    .grand-total-cell {
      color: #1e3a8a;
      font-size: 15px;
    }
  `]
})
export class RideViewerModalComponent {
  // RETO 4: Dumb Component puro
  @Input() invoice: DocumentView | null = null;
  @Input() fiscalEntries: FiscalConfigurationEntry[] | null = [];
  @Input() activeFiscalEntry: FiscalConfigurationEntry | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() downloadOfficialPdf = new EventEmitter<string>();
  @Output() downloadOfficialXml = new EventEmitter<string>();

  get resolvedIssuer(): {
    legalName: string;
    tradeName: string;
    ruc: string;
    mainAddress: string;
    establishmentCode: string;
    establishmentAddress: string;
  } {
    // 1. Obtener código del establecimiento de la factura
    let estCode = '001';
    if (this.invoice?.accessKey && this.invoice.accessKey.length === 49) {
      estCode = this.invoice.accessKey.substring(24, 27);
    } else if (this.invoice?.sequential && this.invoice.sequential.includes('-')) {
      estCode = this.invoice.sequential.split('-')[0];
    }

    // 2. Buscar datos del establecimiento correspondiente en fiscalEntries
    const match = this.fiscalEntries?.find(e => e.establishmentCode === estCode)
               || this.activeFiscalEntry
               || (this.fiscalEntries && this.fiscalEntries.length > 0 ? this.fiscalEntries[0] : null);

    return {
      legalName: match?.legalName || 'EMPRESA EMISORA',
      tradeName: match?.tradeName || 'PUNTO DE EMISIÓN',
      ruc: match?.ruc || (this.invoice?.accessKey && this.invoice.accessKey.length === 49 ? this.invoice.accessKey.substring(10, 23) : '9999999999999'),
      mainAddress: match?.mainAddress || 'Ecuador',
      establishmentCode: match?.establishmentCode || estCode,
      establishmentAddress: match?.establishmentAddress || match?.mainAddress || 'Matriz'
    };
  }

  downloadPdf(): void {
    if (!this.invoice) return;
    this.downloadOfficialPdf.emit(this.invoice.id);
  }

  downloadXml(): void {
    if (!this.invoice) return;
    this.downloadOfficialXml.emit(this.invoice.id);
  }

  printRide(): void {
    window.print();
  }

  getPaymentLabel(code: string): string {
    const map: Record<string, string> = {
      '01': '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO',
      '20': '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO',
      '19': '19 - TARJETA DE CREDITO',
      '16': '16 - TARJETA DE DEBITO'
    };
    return map[code] || '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO';
  }
}
