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
    <div class="pos-workspace">
      <!-- 1. BARRA SUPERIOR COMPACTA: METADATOS FISCALES & PLANTILLAS RÁPIDAS -->
      <div class="pos-top-bar">
        <div class="fiscal-chip">
          <span class="fiscal-pulse"></span>
          <span class="fiscal-info">
            <strong>Emisor:</strong> {{ issuerRuc || '0550249817001' }}
            <span class="sep">·</span>
            <strong>Pto. Emisión:</strong> {{ activeEstablishmentCode || '001' }}-{{ activePointOfIssueCode || '001' }}
            <span class="sep">·</span>
            <span class="env-tag">SRI Pruebas</span>
          </span>
        </div>

        <div class="quick-presets">
          <span class="preset-label">Plantilla rápida:</span>
          <button type="button" class="preset-pill" (click)="loadPreset('final')" title="Cargar Consumidor Final">
            <app-icon name="user" [size]="12"></app-icon> Consumidor Final
          </button>
          <button type="button" class="preset-pill" (click)="loadPreset('persona')" title="Cargar Persona Natural">
            <app-icon name="users" [size]="12"></app-icon> Persona Natural
          </button>
          <button type="button" class="preset-pill" (click)="loadPreset('corporativo')" title="Cargar Empresa con RUC">
            <app-icon name="building" [size]="12"></app-icon> Empresa (RUC)
          </button>
        </div>
      </div>

      <!-- 2. FORMULARIO EN GRID DE 2 COLUMNAS (ERGONÓMICO POS) -->
      <form (ngSubmit)="onSubmit()" #form="ngForm" class="pos-grid">
        
        <!-- COLUMNA IZQUIERDA: CLIENTE Y DETALLE DE PRODUCTOS (70% DEL ANCHO) -->
        <div class="pos-left-pane">
          
          <!-- SECCIÓN: DATOS DEL CLIENTE (COMPACTO) -->
          <div class="pos-panel customer-panel">
            <div class="panel-header">
              <span class="panel-badge">
                <app-icon name="user" [size]="13"></app-icon> DATOS DEL CLIENTE
              </span>
            </div>

            <div class="client-form-grid">
              <!-- Fila 1: Identificación y Nombre -->
              <div class="client-row-1">
                <div class="field-item">
                  <label>Tipo Identificación</label>
                  <select [(ngModel)]="buyerType" name="buyerType" (change)="onBuyerTypeChange()">
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                    <option value="CEDULA">Cédula (10)</option>
                    <option value="RUC">RUC (13)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div class="field-item">
                  <label>Identificación</label>
                  <input
                    type="text"
                    [(ngModel)]="buyerId"
                    name="buyerId"
                    required
                    [placeholder]="buyerType === 'RUC' ? '1790012345001' : '1712345678'"
                    [readonly]="buyerType === 'CONSUMIDOR_FINAL'"
                  />
                </div>

                <div class="field-item">
                  <label>Razón Social / Nombre Completo</label>
                  <input type="text" [(ngModel)]="buyerName" name="buyerName" required placeholder="Nombre del cliente o razón social" />
                </div>
              </div>

              <!-- Fila 2: Correo y Dirección -->
              <div class="client-row-2">
                <div class="field-item">
                  <label>Correo Electrónico (Notificación RIDE)</label>
                  <input type="email" [(ngModel)]="buyerEmail" name="buyerEmail" placeholder="cliente@correo.ec" />
                </div>

                <div class="field-item">
                  <label>Dirección Domiciliaria</label>
                  <input type="text" [(ngModel)]="buyerAddress" name="buyerAddress" placeholder="Quito, Ecuador" />
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: PRODUCTOS / SERVICIOS (CON SELECTOR RÁPIDO Y TABLA COMPACTA) -->
          <div class="pos-panel products-panel">
            <div class="panel-header-action">
              <span class="panel-badge">
                <app-icon name="cart" [size]="13"></app-icon> PRODUCTOS O SERVICIOS
              </span>
              
              <div class="table-top-tools">
                <select class="select-prod-btn" (change)="onSelectProductFromDb($event)">
                  <option value="">＋ Agregar Producto...</option>
                  <option *ngFor="let p of availableProducts" [value]="p.id">
                    {{ p.sku }} - {{ p.name }} (\${{ p.unitPrice }} · {{ p.vatRate }}% IVA)
                  </option>
                </select>
                <button type="button" class="btn-add-line-btn" (click)="addItem()" title="Agregar ítem manual">
                  ＋ Fila
                </button>
              </div>
            </div>

            <!-- Tabla de ítems con scroll interno para evitar desbordes -->
            <div class="table-scroll-container">
              <table class="pos-items-table">
                <thead>
                  <tr>
                    <th style="width: 105px;">SKU</th>
                    <th>Descripción</th>
                    <th style="width: 65px;" class="text-right">Cant.</th>
                    <th style="width: 95px;" class="text-right">Precio ($)</th>
                    <th style="width: 85px;" class="text-right">Desc. ($)</th>
                    <th style="width: 85px;">IVA</th>
                    <th style="width: 95px;" class="text-right">Subtotal</th>
                    <th style="width: 32px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of items; let i = index">
                    <td>
                      <input type="text" [(ngModel)]="item.sku" [name]="'sku_' + i" required placeholder="SKU" class="t-input" />
                    </td>
                    <td>
                      <input type="text" [(ngModel)]="item.description" [name]="'desc_' + i" required placeholder="Descripción del producto o servicio" class="t-input" />
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.quantity" [name]="'qty_' + i" (input)="recalculate()" min="1" step="1" required class="t-input text-right" />
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.unitPrice" [name]="'price_' + i" (input)="recalculate()" min="0.01" step="0.01" required class="t-input text-right" />
                    </td>
                    <td>
                      <input type="number" [(ngModel)]="item.discount" [name]="'disc_' + i" (input)="recalculate()" min="0" step="0.01" class="t-input text-right" />
                    </td>
                    <td>
                      <select [(ngModel)]="item.taxes[0].rate" [name]="'tax_' + i" (change)="onTaxChange(item)" class="t-select">
                        <option [value]="15">15%</option>
                        <option [value]="0">0%</option>
                      </select>
                    </td>
                    <td class="text-right subtotal-val">
                      \${{ getItemSubtotal(item) | number:'1.2-2' }}
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn-del-line" (click)="removeItem(i)" [disabled]="items.length === 1" title="Quitar ítem">
                        <app-icon name="x" [size]="12"></app-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: LIQUIDACIÓN, FORMA DE PAGO Y EMISIÓN (STICKY CHECKOUT) -->
        <div class="pos-right-pane">
          <div class="checkout-card">
            
            <!-- FORMA DE PAGO -->
            <div class="checkout-block">
              <label class="checkout-label">Forma de Pago Autorizada (SRI)</label>
              <select [(ngModel)]="paymentMethod" name="paymentMethod" class="checkout-input">
                <option value="01">01 - Efectivo</option>
                <option value="20">20 - Transferencia / Financiación</option>
                <option value="16">16 - Tarjeta de Débito</option>
                <option value="19">19 - Tarjeta de Crédito</option>
              </select>
            </div>

            <!-- DESGLOSE DE TOTALES -->
            <div class="breakdown-list">
              <div class="b-row">
                <span>Subtotal 15% IVA:</span>
                <strong>\${{ subtotal15 | number:'1.2-2' }}</strong>
              </div>
              <div class="b-row">
                <span>Subtotal 0% IVA:</span>
                <strong>\${{ subtotal0 | number:'1.2-2' }}</strong>
              </div>
              <div class="b-row" *ngIf="totalDiscount > 0">
                <span class="disc-text">Descuento:</span>
                <span class="disc-text">-\${{ totalDiscount | number:'1.2-2' }}</span>
              </div>
              <div class="b-row">
                <span>Subtotal sin impuestos:</span>
                <strong>\${{ subtotalWithoutTax | number:'1.2-2' }}</strong>
              </div>
              <div class="b-row iva-highlight">
                <span>IVA (15%):</span>
                <strong>\${{ ivaAmount | number:'1.2-2' }}</strong>
              </div>

              <!-- TOTAL DESTACADO -->
              <div class="grand-total-panel">
                <span class="gt-title">TOTAL A COBRAR</span>
                <span class="gt-value">\${{ totalAmount | number:'1.2-2' }}</span>
              </div>
            </div>

            <!-- BOTONES DE ACCIÓN -->
            <div class="checkout-buttons">
              <button
                type="submit"
                class="btn-emit-sri"
                [disabled]="loading || !form.form.valid || totalAmount <= 0 || !isReadyToEmit"
              >
                <span *ngIf="loading" class="spinner-icon"></span>
                <span *ngIf="!loading">
                  <app-icon name="zap" [size]="16"></app-icon>
                </span>
                <span>
                  {{ !isReadyToEmit ? 'Configure Empresa Primero' : (loading ? 'Transmitiendo al SRI...' : 'Emitir Factura Electrónica') }}
                </span>
              </button>

              <button type="button" class="btn-clean-form" (click)="resetForm()">
                Restablecer formulario
              </button>
            </div>

            <!-- AVISO DE SATURACIÓN 503 -->
            <div *ngIf="admissionSaturated?.saturated" class="sat-box-mini">
              <span>⏱️ SRI con alta demanda.</span>
              <button type="button" class="btn-retry-quick" (click)="onRetryInvoice()" [disabled]="loading">
                Reintentar
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .pos-workspace {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    /* 1. TOP BAR */
    .pos-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .fiscal-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: #475569;
    }

    .fiscal-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      flex-shrink: 0;
    }

    .fiscal-info strong {
      color: #0f172a;
    }

    .sep {
      color: #cbd5e1;
      margin: 0 4px;
    }

    .env-tag {
      background: #f1f5f9;
      color: #64748b;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .quick-presets {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .preset-label {
      font-size: 0.74rem;
      font-weight: 700;
      color: #64748b;
      margin-right: 2px;
    }

    .preset-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .preset-pill:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #2563eb;
    }

    /* 2. GRID 2 COLUMNAS POS */
    .pos-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 14px;
      align-items: start;
    }

    .pos-left-pane {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .pos-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }

    .panel-header, .panel-header-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .panel-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.73rem;
      font-weight: 800;
      letter-spacing: 0.4px;
      color: #2563eb;
      text-transform: uppercase;
    }

    /* CLIENT GRID PERFECTAMENTE ALINEADO */
    .client-form-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .client-row-1 {
      display: grid;
      grid-template-columns: 160px 175px 1fr;
      gap: 12px;
    }

    .client-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .field-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-item label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
      height: 15px;
    }

    .field-item input, .field-item select {
      height: 34px;
      padding: 4px 10px;
      font-size: 0.83rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      color: #0f172a;
      box-sizing: border-box;
    }

    .field-item input:focus, .field-item select:focus {
      border-color: #2563eb;
      outline: none;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
    }

    /* PRODUCTOS & TABLA */
    .table-top-tools {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .select-prod-btn {
      height: 31px;
      padding: 2px 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      font-size: 0.78rem;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      outline: none;
    }

    .select-prod-btn:hover {
      background: #dbeafe;
    }

    .btn-add-line-btn {
      height: 31px;
      padding: 2px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-add-line-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .table-scroll-container {
      max-height: 270px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #ffffff;
    }

    .pos-items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .pos-items-table th {
      position: sticky;
      top: 0;
      background: #f8fafc;
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      z-index: 2;
    }

    .pos-items-table td {
      padding: 5px 7px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .t-input {
      height: 29px;
      padding: 2px 6px;
      font-size: 0.8rem;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      width: 100%;
      box-sizing: border-box;
    }

    .t-input:focus {
      border-color: #2563eb;
      outline: none;
    }

    .t-select {
      height: 29px;
      padding: 2px 4px;
      font-size: 0.78rem;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
    }

    .subtotal-val {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
    }

    .btn-del-line {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 3px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-del-line:hover:not(:disabled) {
      background: #fee2e2;
      color: #ef4444;
    }

    /* COLUMNA DERECHA: CHECKOUT */
    .pos-right-pane {
      position: sticky;
      top: 76px;
    }

    .checkout-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .checkout-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .checkout-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin: 0;
    }

    .checkout-input {
      height: 34px;
      padding: 4px 8px;
      font-size: 0.8rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      color: #0f172a;
    }

    .breakdown-list {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .b-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      color: #475569;
    }

    .b-row strong {
      color: #0f172a;
    }

    .disc-text {
      color: #dc2626;
      font-weight: 600;
    }

    .iva-highlight {
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      color: #1e40af;
      font-weight: 700;
    }

    .grand-total-panel {
      margin-top: 6px;
      padding: 10px 12px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .gt-title {
      font-size: 0.75rem;
      font-weight: 800;
      color: #1e40af;
      letter-spacing: 0.4px;
    }

    .gt-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: #1d4ed8;
      letter-spacing: -0.5px;
    }

    .checkout-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-emit-sri {
      width: 100%;
      height: 44px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
      transition: all 0.15s ease;
    }

    .btn-emit-sri:hover:not(:disabled) {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
    }

    .btn-emit-sri:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-clean-form {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      padding: 4px;
    }

    .btn-clean-form:hover {
      color: #0f172a;
      text-decoration: underline;
    }

    .spinner-icon {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .sat-box-mini {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 0.74rem;
      color: #854d0e;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-retry-quick {
      background: #ca8a04;
      color: #ffffff;
      border: none;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1100px) {
      .pos-grid {
        grid-template-columns: 1fr;
      }
      .client-grid {
        grid-template-columns: 1fr 1fr;
      }
      .pos-right-pane {
        position: static;
      }
    }
  `]
})
export class InvoiceCreatorComponent implements OnInit {
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
      return `${this.activeEstablishmentCode}-${this.activePointOfIssueCode}`;
    }
    return '001-001';
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
      this.buyerAddress = 'Quito, Ecuador';
      this.buyerEmail = 'andres.moreno@gmail.com';
    } else if (this.buyerType === 'RUC') {
      this.buyerId = '1790016919001';
      this.buyerName = 'CORPORACION FAVORITA C.A.';
      this.buyerAddress = 'Quito, Av. Eloy Alfaro';
      this.buyerEmail = 'facturas@favorita.ec';
    }
    this.recalculate();
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
      this.buyerId = '9999999999999';
      this.buyerName = 'CONSUMIDOR FINAL';
      this.buyerEmail = 'consumidorfinal@sri.gob.ec';
      this.buyerAddress = 'Ecuador';
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
