import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateInvoiceRequest, IdentificationType, InvoiceItem } from '../../../models/invoice.model';
import { AppIconComponent } from '../app-icon/app-icon.component';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../models/product.model';

@Component({
  selector: 'app-invoice-creator',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="card invoice-card">
      <div class="card-header">
        <div>
          <span class="eyebrow"><span class="dot"></span> EMISIÓN DE COMPROBANTES</span>
          <h2>Emitir Factura Electrónica</h2>
          <p class="section-desc">Genera y transmite facturas válidas según el esquema XML del SRI y firma digital XAdES-BES.</p>
        </div>
        <div class="quick-presets">
          <span class="preset-label">Cargar plantilla:</span>
          <button type="button" class="button secondary small" (click)="loadPreset('corporativo')">
            <app-icon name="building" [size]="13"></app-icon> Corporativa
          </button>
          <button type="button" class="button secondary small" (click)="loadPreset('persona')">
            <app-icon name="user" [size]="13"></app-icon> Persona Natural
          </button>
          <button type="button" class="button secondary small" (click)="loadPreset('final')">
            <app-icon name="users" [size]="13"></app-icon> Consumidor Final
          </button>
        </div>
      </div>

      <form (ngSubmit)="onSubmit()" #form="ngForm">
        <!-- 1. PUNTO DE EMISION -->
        <div class="form-section">
          <span class="section-title">1. PUNTO DE EMISIÓN FISCAL</span>
          <div class="grid-3">
            <label>
              RUC del Emisor
              <input
                type="text"
                [value]="issuerRuc || 'Empresa no registrada (Ir a Configuración Fiscal)'"
                readonly
                class="readonly-input"
                [style.color]="!issuerRuc ? '#94a3b8' : '#0f172a'"
                [style.font-style]="!issuerRuc ? 'italic' : 'normal'"
              />
            </label>
            <label>
              Establecimiento y Punto de Emisión
              <input
                type="text"
                [value]="pointOfIssueDisplay"
                readonly
                class="readonly-input"
                [style.color]="!isReadyToEmit ? '#94a3b8' : '#0f172a'"
                [style.font-style]="!isReadyToEmit ? 'italic' : 'normal'"
              />
            </label>
            <label>
              Ambiente SRI
              <select [(ngModel)]="environment" name="environment">
                <option value="TEST">PRUEBAS (Celcer TEST)</option>
                <option value="PRODUCTION" disabled>PRODUCCIÓN (Deshabilitado)</option>
              </select>
            </label>
          </div>
        </div>

        <!-- 2. DATOS DEL COMPRADOR -->
        <div class="form-section">
          <span class="section-title">2. DATOS DEL COMPRADOR</span>
          <div class="grid-4">
            <label>
              Tipo de Identificación
              <select [(ngModel)]="buyerType" name="buyerType" (change)="onBuyerTypeChange()">
                <option value="RUC">RUC (13 dígitos)</option>
                <option value="CEDULA">Cédula (10 dígitos)</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
              </select>
            </label>
            <label>
              Número de Identificación
              <input
                type="text"
                [(ngModel)]="buyerId"
                name="buyerId"
                required
                [placeholder]="buyerType === 'RUC' ? '1790012345001' : '1712345678'"
                [readonly]="buyerType === 'CONSUMIDOR_FINAL'"
              />
            </label>
            <label class="col-span-2">
              Razón Social / Nombres Completos
              <input type="text" [(ngModel)]="buyerName" name="buyerName" required placeholder="Nombre o Razón Social" />
            </label>
          </div>

          <div class="grid-2">
            <label>
              Correo Electrónico (Notificación RIDE)
              <input type="email" [(ngModel)]="buyerEmail" name="buyerEmail" placeholder="cliente@correo.ec" />
            </label>
            <label>
              Dirección Domiciliaria
              <input type="text" [(ngModel)]="buyerAddress" name="buyerAddress" placeholder="Quito, Ecuador" />
            </label>
          </div>
        </div>

        <!-- 3. ITEMS DINAMICOS -->
        <div class="form-section">
          <div class="section-header-flex">
            <span class="section-title">3. DETALLE DE PRODUCTOS O SERVICIOS</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <!-- Selector de productos del catálogo -->
              <select class="select-db-prod" (change)="onSelectProductFromDb($event)">
                <option value="">＋ Agregar Producto...</option>
                <option *ngFor="let p of availableProducts" [value]="p.id">
                  {{ p.sku }} - {{ p.name }} (\${{ p.unitPrice }} · {{ p.vatRate }}% IVA)
                </option>
              </select>
            </div>
          </div>

          <div class="table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 130px;">Código SKU</th>
                  <th>Descripción del Bien o Servicio</th>
                  <th style="width: 85px;" class="text-right">Cant.</th>
                  <th style="width: 120px;" class="text-right">Precio Unit. (\$)</th>
                  <th style="width: 100px;" class="text-right">Desc. (\$)</th>
                  <th style="width: 110px;">Tarifa IVA</th>
                  <th style="width: 110px;" class="text-right">Subtotal (\$)</th>
                  <th style="width: 45px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of items; let i = index">
                  <td>
                    <input type="text" [(ngModel)]="item.sku" [name]="'sku_' + i" required placeholder="SKU-01" />
                  </td>
                  <td>
                    <input type="text" [(ngModel)]="item.description" [name]="'desc_' + i" required placeholder="Descripción del producto" />
                  </td>
                  <td>
                    <input type="number" [(ngModel)]="item.quantity" [name]="'qty_' + i" (input)="recalculate()" min="1" step="1" required class="text-right" />
                  </td>
                  <td>
                    <input type="number" [(ngModel)]="item.unitPrice" [name]="'price_' + i" (input)="recalculate()" min="0.01" step="0.01" required class="text-right" />
                  </td>
                  <td>
                    <input type="number" [(ngModel)]="item.discount" [name]="'disc_' + i" (input)="recalculate()" min="0" step="0.01" class="text-right" />
                  </td>
                  <td>
                    <select [(ngModel)]="item.taxes[0].rate" [name]="'tax_' + i" (change)="onTaxChange(item)">
                      <option [value]="15">15% IVA</option>
                      <option [value]="0">0% IVA</option>
                    </select>
                  </td>
                  <td class="text-right font-bold">
                    \${{ getItemSubtotal(item) | number:'1.2-2' }}
                  </td>
                  <td class="text-center">
                    <button type="button" class="btn-del" (click)="removeItem(i)" [disabled]="items.length === 1" title="Quitar ítem">
                      <app-icon name="x" [size]="13"></app-icon>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. PAGO Y LIQUIDACIÓN -->
        <div class="form-section">
          <span class="section-title">4. FORMA DE PAGO Y LIQUIDACIÓN TRIBUTARIA</span>
          <div class="settlement-layout">
            <div class="payment-box">
              <label>
                Método de Pago Autorizado por el SRI
                <select [(ngModel)]="paymentMethod" name="paymentMethod">
                  <option value="20">20 - OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO (Transferencia / Tarjeta)</option>
                  <option value="01">01 - SIN UTILIZACIÓN DEL SISTEMA FINANCIERO (Efectivo)</option>
                  <option value="19">19 - TARJETA DE CRÉDITO</option>
                  <option value="16">16 - TARJETA DE DÉBITO</option>
                </select>
              </label>
            </div>

            <div class="totals-box">
              <div class="tot-line">
                <span>Subtotal 15% IVA:</span>
                <strong>\${{ subtotal15 | number:'1.2-2' }}</strong>
              </div>
              <div class="tot-line">
                <span>Subtotal 0% IVA:</span>
                <strong>\${{ subtotal0 | number:'1.2-2' }}</strong>
              </div>
              <div class="tot-line">
                <span>Descuento Total:</span>
                <span>-\${{ totalDiscount | number:'1.2-2' }}</span>
              </div>
              <div class="tot-line">
                <span>Subtotal sin Impuestos:</span>
                <strong>\${{ subtotalWithoutTax | number:'1.2-2' }}</strong>
              </div>
              <div class="tot-line iva-highlight">
                <span>IVA 15%:</span>
                <strong>\${{ ivaAmount | number:'1.2-2' }}</strong>
              </div>
              <div class="tot-line total-highlight">
                <span>VALOR TOTAL:</span>
                <span class="grand-total">\${{ totalAmount | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BANNER DE REINTENTO IDEMPOTENTE (HTTP 503 ADMISSION_SATURATED) -->
        <div *ngIf="admissionSaturated?.saturated" class="saturated-box">
          <div class="saturated-info">
            <span class="icon">⏳</span>
            <div>
              <strong>Saturación Temporal de Admisión (HTTP 503 / Backend SRI)</strong>
              <p>
                El servidor de staging está descongestionando la cola. Según la norma técnica oficial,
                se debe reintentar con la <strong>misma clave de idempotencia</strong> para evitar comprobantes duplicados.
              </p>
              <span class="key-badge">Idempotency-Key: {{ admissionSaturated?.idempotencyKey }}</span>
            </div>
          </div>
          <button
            type="button"
            class="btn-retry-idem"
            [disabled]="loading"
            (click)="onRetryInvoice()"
          >
            <span style="display: inline-flex; align-items: center; gap: 6px;">
              <app-icon *ngIf="!loading" name="refresh" [size]="14"></app-icon>
              {{ loading ? 'Reintentando...' : 'Reintentar con la Misma Clave' }}
            </span>
          </button>
        </div>

        <!-- BARRA DE ACCIÓN -->
        <div class="actions-footer">
          <button type="button" class="button secondary" (click)="resetForm()">
            Restablecer
          </button>

          <button
            type="submit"
            class="button"
            [disabled]="loading || !form.form.valid || totalAmount <= 0 || !isReadyToEmit"
          >
            <span *ngIf="loading" class="spinner"></span>
            <span style="display: inline-flex; align-items: center; gap: 6px;">
              <app-icon *ngIf="!loading && isReadyToEmit" name="zap" [size]="15"></app-icon>
              <app-icon *ngIf="!isReadyToEmit" name="alert" [size]="15"></app-icon>
              {{ !isReadyToEmit ? 'Configure la Empresa Primero para Emitir' : (loading ? 'Firmando y Transmitiendo al SRI...' : 'Emitir Factura Electrónica SRI') }}
            </span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .invoice-card {
      margin-bottom: 30px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 18px;
    }
    .card-header h2 {
      margin: 0 0 4px;
      font-size: 24px;
    }
    .section-desc {
      color: var(--text-intro);
      margin: 0;
      font-size: 14px;
    }
    .quick-presets {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .preset-label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }
    .form-section {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #2563eb;
      display: block;
      margin-bottom: 14px;
    }
    .section-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .btn-add-line {
      background: #eff5ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-add-line:hover {
      background: #2563eb;
      color: white;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 14px;
    }
    .col-span-2 {
      grid-column: span 2;
    }
    .readonly-input {
      background: #f1f5f9;
      color: #64748b;
      cursor: not-allowed;
    }
    .table-container {
      overflow-x: auto;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }
    .items-table th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 11px;
    }
    .items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .btn-del {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }
    .btn-del:hover:not(:disabled) {
      color: #ef4444;
    }
    .settlement-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .info-note {
      margin-top: 16px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      gap: 10px;
    }
    .note-icon {
      font-size: 18px;
    }
    .info-note p {
      margin: 0;
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .totals-box {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 16px 20px;
    }
    .tot-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
      color: #475569;
    }
    .tot-line.iva-highlight {
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
      margin-top: 4px;
      color: #10243a;
    }
    .tot-line.iva-highlight strong {
      color: #2563eb;
    }
    .tot-line.total-highlight {
      border-top: 2px solid #10243a;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 15px;
      font-weight: 700;
      color: #10243a;
    }
    .grand-total {
      font-size: 24px;
      color: #2563eb;
      font-weight: 800;
    }
    .saturated-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .saturated-info {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex: 1;
    }
    .saturated-info .icon {
      font-size: 24px;
    }
    .saturated-info strong {
      display: block;
      color: #854d0e;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .saturated-info p {
      margin: 0 0 6px;
      font-size: 12px;
      color: #713f12;
      line-height: 1.4;
    }
    .key-badge {
      display: inline-block;
      background: #fef9c3;
      border: 1px solid #fde047;
      color: #854d0e;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
    }
    .btn-retry-idem {
      background: #ca8a04;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-retry-idem:hover:not(:disabled) {
      background: #a16207;
    }
    .btn-retry-idem:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .actions-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--border-color);
    }
    .select-db-prod {
      padding: 8px 14px;
      border: 1px solid var(--primary-blue);
      border-radius: 6px;
      background: var(--blue-soft);
      color: var(--primary-blue);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      outline: none;
      transition: all 0.15s ease;
    }
    .select-db-prod:hover {
      background: #dbeafe;
      border-color: #1d4ed8;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @media (max-width: 850px) {
      .grid-3, .grid-4, .grid-2, .settlement-layout {
        grid-template-columns: 1fr;
      }
      .col-span-2 {
        grid-column: span 1;
      }
    }
  `]
})
export class InvoiceCreatorComponent implements OnInit {
  // RETO 4: Dumb Component puro
  @Input() loading: boolean | null = false;
  @Input() pointOfIssueId: string | null = null;
  @Input() activeEstablishmentCode: string = '';
  @Input() activePointOfIssueCode: string = '';
  @Input() issuerRuc: string = '';
  @Input() admissionSaturated: { saturated: boolean; retryAfter: number; idempotencyKey: string | null } | null = null;
  @Output() submitInvoice = new EventEmitter<CreateInvoiceRequest>();
  @Output() retryInvoice = new EventEmitter<void>();

  private readonly productService = inject(ProductService);
  private readonly cdr = inject(ChangeDetectorRef);
  availableProducts: Product[] = [];

  onRetryInvoice(): void {
    this.retryInvoice.emit();
  }

  get pointOfIssueDisplay(): string {
    if (this.activeEstablishmentCode && this.activePointOfIssueCode) {
      return `${this.activeEstablishmentCode}-${this.activePointOfIssueCode} (Punto de Emisión Fiscal)`;
    }
    return 'Sin caja activa (Configure la empresa)';
  }

  get isReadyToEmit(): boolean {
    return !!(this.issuerRuc && this.pointOfIssueId);
  }

  environment: 'TEST' | 'PRODUCTION' = 'TEST';

  buyerType: IdentificationType = 'CONSUMIDOR_FINAL';
  buyerId = '9999999999999';
  buyerName = 'CONSUMIDOR FINAL';
  buyerEmail = 'consumidor@sri.gob.ec';
  buyerAddress = 'Ecuador';

  items: InvoiceItem[] = [
    {
      sku: 'PROD-01',
      description: 'Producto o Servicio General',
      quantity: 1,
      unitPrice: 10.00,
      discount: 0,
      taxes: [{ taxCode: '2', percentageCode: '4', rate: 15 }]
    }
  ];

  paymentMethod = '20';

  subtotal15 = 0;
  subtotal0 = 0;
  totalDiscount = 0;
  subtotalWithoutTax = 0;
  ivaAmount = 0;
  totalAmount = 0;

  constructor() {
    this.recalculate();
  }

  ngOnInit(): void {
    this.productService.products$.subscribe(list => {
      this.availableProducts = list || [];
      this.cdr.detectChanges();
    });
    this.productService.loadProducts().subscribe(list => {
      this.availableProducts = list || [];
      this.cdr.detectChanges();
    });
  }

  onSelectProductFromDb(event: any): void {
    const prodId = event.target?.value;
    if (!prodId) return;
    const prod = this.availableProducts.find(p => p.id === prodId);
    if (!prod) return;

    // Si el primer item es el genérico por defecto, reemplazarlo
    if (this.items.length === 1 && this.items[0].sku === 'PROD-01' && this.items[0].description === 'Producto o Servicio General') {
      this.items[0] = {
        sku: prod.sku,
        description: prod.name,
        quantity: 1,
        unitPrice: prod.unitPrice,
        discount: 0,
        taxes: [{
          taxCode: '2',
          percentageCode: prod.vatRate === 15 ? '4' : '0',
          rate: prod.vatRate
        }]
      };
    } else {
      this.items.push({
        sku: prod.sku,
        description: prod.name,
        quantity: 1,
        unitPrice: prod.unitPrice,
        discount: 0,
        taxes: [{
          taxCode: '2',
          percentageCode: prod.vatRate === 15 ? '4' : '0',
          rate: prod.vatRate
        }]
      });
    }

    event.target.value = '';
    this.recalculate();
  }

  onBuyerTypeChange(): void {
    if (this.buyerType === 'CONSUMIDOR_FINAL') {
      this.buyerId = '9999999999999';
      this.buyerName = 'CONSUMIDOR FINAL';
      this.buyerAddress = 'Ecuador';
      this.buyerEmail = 'consumidorfinal@sri.gob.ec';
    } else if (this.buyerType === 'CEDULA') {
      this.buyerId = '1723456789';
      this.buyerName = 'ANDRES ESTEBAN MORENO';
    } else if (this.buyerType === 'RUC') {
      this.buyerId = '1790016919001';
      this.buyerName = 'CORPORACION FAVORITA C.A.';
    }
  }

  addItem(): void {
    this.items.push({
      sku: `PROD-${String(this.items.length + 1).padStart(2, '0')}`,
      description: 'Nuevo Producto o Servicio Fiscal',
      quantity: 1,
      unitPrice: 10.00,
      discount: 0,
      taxes: [{ taxCode: '2', percentageCode: '4', rate: 15 }]
    });
    this.recalculate();
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
      this.recalculate();
    }
  }

  onTaxChange(item: InvoiceItem): void {
    const rate = Number(item.taxes[0].rate);
    item.taxes[0].rate = rate;
    item.taxes[0].percentageCode = rate === 15 ? '4' : '0';
    this.recalculate();
  }

  getItemSubtotal(item: InvoiceItem): number {
    const raw = item.quantity * item.unitPrice - (item.discount || 0);
    return Math.max(0, Math.round(raw * 100) / 100);
  }

  recalculate(): void {
    let s15 = 0;
    let s0 = 0;
    let disc = 0;

    for (const item of this.items) {
      const line = this.getItemSubtotal(item);
      disc += Number(item.discount || 0);
      const rate = Number(item.taxes[0].rate);
      if (rate === 15) {
        s15 += line;
      } else {
        s0 += line;
      }
    }

    this.subtotal15 = Math.round(s15 * 100) / 100;
    this.subtotal0 = Math.round(s0 * 100) / 100;
    this.totalDiscount = Math.round(disc * 100) / 100;
    this.subtotalWithoutTax = Math.round((this.subtotal15 + this.subtotal0) * 100) / 100;
    this.ivaAmount = Math.round((this.subtotal15 * 0.15) * 100) / 100;
    this.totalAmount = Math.round((this.subtotalWithoutTax + this.ivaAmount) * 100) / 100;
  }

  loadPreset(type: 'corporativo' | 'persona' | 'final'): void {
    if (type === 'corporativo') {
      this.buyerType = 'RUC';
      this.buyerId = '1792146739001';
      this.buyerName = 'TIENDAS INDUSTRIALES ASOCIADAS TIA S.A.';
      this.buyerEmail = 'facturacion@tia.com.ec';
      this.buyerAddress = 'Guayaquil, Av. Carlos Julio Arosemena';
      this.items = [
        {
          sku: 'SRV-CLOUD-01',
          description: 'Suscripción Enterprise Servidor Emitta Dedicado',
          quantity: 1,
          unitPrice: 280.00,
          discount: 20.00,
          taxes: [{ taxCode: '2', percentageCode: '4', rate: 15 }]
        }
      ];
    } else if (type === 'persona') {
      this.buyerType = 'CEDULA';
      this.buyerId = '0928374651';
      this.buyerName = 'CARLOS ALBERTO ZAMBRANO LOOR';
      this.buyerEmail = 'czambrano@gmail.com';
      this.buyerAddress = 'Manta, Manabí';
      this.items = [
        {
          sku: 'REP-COMP-02',
          description: 'Mantenimiento Preventivo y Soporte de Hardware POS',
          quantity: 2,
          unitPrice: 35.00,
          discount: 0,
          taxes: [{ taxCode: '2', percentageCode: '4', rate: 15 }]
        }
      ];
    } else {
      this.buyerType = 'CONSUMIDOR_FINAL';
      this.onBuyerTypeChange();
      this.items = [
        {
          sku: 'SUM-TICK-05',
          description: 'Rollos de Papel Térmico para Impresión RIDE 80mm',
          quantity: 10,
          unitPrice: 1.50,
          discount: 0,
          taxes: [{ taxCode: '2', percentageCode: '4', rate: 15 }]
        }
      ];
    }
    this.recalculate();
  }

  resetForm(): void {
    this.clearForm();
  }

  clearForm(): void {
    this.buyerType = 'CONSUMIDOR_FINAL';
    this.buyerId = '9999999999999';
    this.buyerName = 'CONSUMIDOR FINAL';
    this.buyerEmail = '';
    this.buyerAddress = '';
    this.paymentMethod = '01';
    this.items = [
      {
        sku: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxes: [{ taxCode: '2', percentageCode: '4', rate: 15 }]
      }
    ];
    this.recalculate();
  }

  onSubmit(): void {
    this.recalculate();

    const request: CreateInvoiceRequest = {
      pointOfIssueId: this.pointOfIssueId || 'e45cb936-899e-4c17-93b3-3c753ce839ca',
      environment: this.environment,
      issuedAt: new Date().toISOString(),
      buyer: {
        identificationType: this.buyerType,
        identification: this.buyerId,
        name: this.buyerName,
        email: this.buyerEmail,
        address: this.buyerAddress
      },
      items: this.items.map(it => ({
        sku: it.sku,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount || 0,
        taxes: [
          {
            taxCode: '2',
            percentageCode: it.taxes[0].rate === 15 ? '4' : '0',
            rate: it.taxes[0].rate
          }
        ]
      })),
      payments: [
        {
          paymentMethod: this.paymentMethod,
          total: this.totalAmount
        }
      ],
      expectedTotal: this.totalAmount
    };

    this.submitInvoice.emit(request);
  }
}
