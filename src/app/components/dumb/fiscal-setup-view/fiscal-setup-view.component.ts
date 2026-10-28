import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FiscalConfigurationEntry,
  FiscalConfigurationRequest,
  CertificateMetadata
} from '../../../models/fiscal.model';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-fiscal-setup-view',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  template: `
    <div class="fiscal-container">
      <!-- 1. ENCABEZADO PRINCIPAL -->
      <div class="header-box">
        <div>
          <span class="eyebrow"><span class="dot"></span> ADMINISTRACIÓN FISCAL & SRI</span>
          <h2>Estructura Empresarial y Firma Digital</h2>
          <p class="subtitle">
            Configure la empresa emisora, sus sucursales, cajas de venta y la firma electrónica PKCS#12 (XAdES-BES).
          </p>
        </div>
      </div>

      <!-- ALERTA DE ERROR SI EXISTE -->
      <div *ngIf="errorMessage" class="alert-box error">
        <span>⚠️ {{ errorMessage }}</span>
        <button type="button" class="btn-close" (click)="errorMessage = null">✕</button>
      </div>

      <!-- ======================================================= -->
      <!-- CASO A: NO HAY NINGUNA EMPRESA REGISTRADA (ESTADO CERO) -->
      <!-- ======================================================= -->
      <div *ngIf="!hasCompany" class="setup-wizard-card">
        <div class="wizard-header">
          <div class="icon-circle"><app-icon name="building" [size]="24"></app-icon></div>
          <div>
            <h3>Registro Inicial de la Empresa Emisora</h3>
            <p>
              No se ha registrado una empresa en el sistema. Complete la información oficial para habilitar
              la facturación electrónica ante el SRI.
            </p>
          </div>
        </div>

        <form (ngSubmit)="onSubmitInitialCompany()" class="wizard-form">
          <!-- PASO 1: DATOS DEL EMISOR -->
          <div class="form-section">
            <div class="section-title">
              <span class="step-num">1</span>
              <div>
                <h4>Datos Tributarios de la Empresa (Sujeto Pasivo)</h4>
                <p>Información legal registrada en el RUC del SRI.</p>
              </div>
            </div>

            <div class="grid-2">
              <div class="field-group">
                <label>RUC del Contribuyente (13 dígitos) <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="initRuc"
                  name="initRuc"
                  placeholder="Ej: 1792146739001"
                  maxlength="13"
                  required
                />
                <span class="field-hint">Debe ser un RUC válido de persona natural o jurídica.</span>
              </div>

              <div class="field-group">
                <label>Razón Social Oficial <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="initLegalName"
                  name="initLegalName"
                  placeholder="Ej: CORPORACIÓN FAVORITA S.A."
                  required
                />
                <span class="field-hint">Nombre legal registrado en la Superintendencia o SRI.</span>
              </div>
            </div>

            <div class="grid-2">
              <div class="field-group">
                <label>Nombre Comercial (Fantasía)</label>
                <input
                  type="text"
                  [(ngModel)]="initTradeName"
                  name="initTradeName"
                  placeholder="Ej: Supermercados Akí"
                />
                <span class="field-hint">Nombre de cara al público (opcional).</span>
              </div>

              <div class="field-group">
                <label>Dirección Matriz <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="initMainAddress"
                  name="initMainAddress"
                  placeholder="Ej: Av. Amazonas N24-196 y Luis Cordero, Quito"
                  required
                />
                <span class="field-hint">Dirección principal registrada ante el SRI.</span>
              </div>
            </div>
          </div>

          <!-- PASO 2: SUCURSAL / ESTABLECIMIENTO MATRIZ -->
          <div class="form-section">
            <div class="section-title">
              <span class="step-num">2</span>
              <div>
                <h4>Primer Establecimiento (Sucursal Matriz)</h4>
                <p>Los establecimientos se identifican por códigos de 3 dígitos (001, 002, etc.).</p>
              </div>
            </div>

            <div class="grid-3">
              <div class="field-group">
                <label>Código de Sucursal <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="initEstCode"
                  name="initEstCode"
                  placeholder="001"
                  maxlength="3"
                  required
                />
                <span class="field-hint">Generalmente 001 para la matriz.</span>
              </div>

              <div class="field-group">
                <label>Nombre de la Sucursal</label>
                <input
                  type="text"
                  [(ngModel)]="initEstName"
                  name="initEstName"
                  placeholder="Ej: Sucursal Centro - Matriz"
                />
                <span class="field-hint">Nombre identificativo del local.</span>
              </div>

              <div class="field-group">
                <label>Dirección del Local <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="initEstAddress"
                  name="initEstAddress"
                  placeholder="Ej: Av. Amazonas y Cordero"
                  required
                />
                <span class="field-hint">Ubicación física del establecimiento.</span>
              </div>
            </div>
          </div>

          <!-- PASO 3: CAJA DE VENTA INICIAL -->
          <div class="form-section">
            <div class="section-title">
              <span class="step-num">3</span>
              <div>
                <h4>Primera Caja de Venta (Punto de Emisión)</h4>
                <p>Las cajas dentro de un local emiten facturas secuenciales (001, 002, etc.).</p>
              </div>
            </div>

            <div class="grid-2">
              <div class="field-group">
                <label>Código de Caja <span class="req">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="initPoiCode"
                  name="initPoiCode"
                  placeholder="001"
                  maxlength="3"
                  required
                />
                <span class="field-hint">Código numérico de 3 dígitos (ej: 001).</span>
              </div>

              <div class="field-group">
                <label>Nombre / Identificador de la Caja</label>
                <input
                  type="text"
                  [(ngModel)]="initPoiName"
                  name="initPoiName"
                  placeholder="Ej: Caja Principal 01 - Facturación"
                />
                <span class="field-hint">Identificación interna de la caja.</span>
              </div>
            </div>
          </div>

          <!-- BOTÓN DE ENVÍO -->
          <div class="wizard-actions">
            <button
              type="submit"
              class="btn-primary"
              [disabled]="loading || !isInitFormValid"
            >
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon *ngIf="!loading" name="zap" [size]="16"></app-icon>
                {{ loading ? 'Registrando en SRI...' : 'Guardar y Activar Empresa' }}
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- ======================================================= -->
      <!-- CASO B: YA EXISTE UNA EMPRESA REGISTRADA               -->
      <!-- ======================================================= -->
      <div *ngIf="hasCompany" class="company-dashboard">
        <!-- 1. TARJETA RESUMEN DE LA EMPRESA (TAX PAYER) -->
        <div class="card company-card">
          <div class="company-card-header">
            <div class="company-brand">
              <div class="avatar-corp"><app-icon name="building" [size]="24"></app-icon></div>
              <div>
                <div class="corp-tags">
                  <span class="badge-active">EMISOR ACTIVO</span>
                  <span class="badge-env">SRI AMBIENTE PRUEBAS</span>
                </div>
                <h3>{{ companyInfo?.legalName }}</h3>
                <p class="corp-trade" *ngIf="companyInfo?.tradeName">{{ companyInfo?.tradeName }}</p>
              </div>
            </div>
            <div class="company-meta">
              <div class="meta-pill">
                <span class="lbl">RUC:</span>
                <strong>{{ companyInfo?.ruc }}</strong>
              </div>
              <div class="meta-pill">
                <span class="lbl">Dirección:</span>
                <span>{{ companyInfo?.mainAddress }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. PESTAÑAS SECUNDARIAS (SUCURSALES VS FIRMA ELECTRONICA) -->
        <div class="sub-tabs">
          <button
            type="button"
            class="sub-tab-btn"
            [class.active]="activeSubTab === 'branches'"
            (click)="activeSubTab = 'branches'"
          >
            <app-icon name="store" [size]="15"></app-icon> Sucursales y Cajas de Venta ({{ establishmentsCount }})
          </button>
          <button
            type="button"
            class="sub-tab-btn"
            [class.active]="activeSubTab === 'cert'"
            (click)="activeSubTab = 'cert'"
          >
            <app-icon name="shield-check" [size]="15"></app-icon> Firma Electrónica (.p12)
            <span class="dot-status" [class.green]="hasActiveCert" [class.amber]="!hasActiveCert"></span>
          </button>
        </div>

        <!-- VISTA SUCURSALES Y CAJAS -->
        <div *ngIf="activeSubTab === 'branches'" class="tab-content">
          <!-- Notificación de cambio de caja activa -->
          <div *ngIf="poiSelectedMessage" class="poi-toast-banner">
            <app-icon name="check" [size]="16"></app-icon>
            <span>{{ poiSelectedMessage }}</span>
          </div>

          <div class="content-toolbar">
            <p>
              Listado jerárquico de establecimientos y puntos de emisión autorizados para la empresa.
            </p>
            <div class="toolbar-actions">
              <button
                type="button"
                class="btn-outline small"
                (click)="toggleAddBranchForm()"
              >
                {{ showAddBranchForm ? '✕ Cancelar' : '＋ Nueva Sucursal' }}
              </button>
              <button
                type="button"
                class="btn-outline small"
                (click)="toggleAddPoiForm()"
              >
                {{ showAddPoiForm ? '✕ Cancelar' : '＋ Nueva Caja' }}
              </button>
            </div>
          </div>

          <!-- FORMULARIO DESPLEGABLE: AGREGAR NUEVA SUCURSAL -->
          <div *ngIf="showAddBranchForm" class="expandable-form-box">
            <h4>Registrar Nueva Sucursal / Establecimiento</h4>
            <form (ngSubmit)="onSubmitNewBranch()" class="simple-form">
              <div class="grid-3">
                <div class="field-group">
                  <label>Código Establecimiento (3 dígitos) <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="newBranchCode" name="newBranchCode" placeholder="002" maxlength="3" required />
                </div>
                <div class="field-group">
                  <label>Nombre de la Sucursal</label>
                  <input type="text" [(ngModel)]="newBranchName" name="newBranchName" placeholder="Ej: Sucursal Norte" />
                </div>
                <div class="field-group">
                  <label>Dirección del Local <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="newBranchAddress" name="newBranchAddress" placeholder="Ej: Av. 10 de Agosto" required />
                </div>
              </div>
              <div class="form-foot">
                <button type="submit" class="btn-primary small" [disabled]="loading || !newBranchCode || !newBranchAddress">
                  Guardar Sucursal
                </button>
              </div>
            </form>
          </div>

          <!-- FORMULARIO DESPLEGABLE: AGREGAR NUEVA CAJA -->
          <div *ngIf="showAddPoiForm" class="expandable-form-box">
            <h4>Registrar Nueva Caja (Punto de Emisión)</h4>
            <form (ngSubmit)="onSubmitNewPoi()" class="simple-form">
              <div class="grid-3">
                <div class="field-group">
                  <label>Sucursal Destino <span class="req">*</span></label>
                  <select [(ngModel)]="selectedEstablishmentIdForPoi" name="estId" required>
                    <option *ngFor="let est of establishmentsList" [value]="est.id">
                      {{ est.code }} - {{ est.name || est.address }}
                    </option>
                  </select>
                </div>
                <div class="field-group">
                  <label>Código de Caja (3 dígitos) <span class="req">*</span></label>
                  <input type="text" [(ngModel)]="newPoiCode" name="newPoiCode" placeholder="002" maxlength="3" required />
                </div>
                <div class="field-group">
                  <label>Nombre de la Caja</label>
                  <input type="text" [(ngModel)]="newPoiName" name="newPoiName" placeholder="Ej: Caja Rápida 02" />
                </div>
              </div>
              <div class="form-foot">
                <button type="submit" class="btn-primary small" [disabled]="loading || !newPoiCode || !selectedEstablishmentIdForPoi">
                  Guardar Caja
                </button>
              </div>
            </form>
          </div>

          <!-- ÁRBOL JERÁRQUICO DE SUCURSALES Y CAJAS -->
          <div class="hierarchy-grid">
            <div *ngFor="let est of establishmentsList" class="branch-card">
              <div class="branch-card-header">
                <div class="branch-title">
                  <span class="badge-code">Establecimiento {{ est.code }}</span>
                  <h5>{{ est.name || 'Sucursal ' + est.code }}</h5>
                </div>
                <span class="branch-addr">{{ est.address }}</span>
              </div>

              <div class="boxes-container">
                <div class="boxes-header">
                  <span>Cajas / Puntos de Emisión ({{ est.points.length }})</span>
                </div>

                <div class="boxes-list">
                  <div
                    *ngFor="let poi of est.points"
                    class="box-item"
                    [class.selected-for-pos]="poi.id === selectedActivePoiId"
                  >
                    <div class="box-info">
                      <span class="box-badge">Caja {{ poi.code }}</span>
                      <span class="box-name">{{ poi.name || 'Punto de Venta ' + poi.code }}</span>
                      <span *ngIf="poi.id === selectedActivePoiId" class="tag-active-pos">✓ ACTIVA EN POS</span>
                    </div>

                    <div class="box-actions">
                      <button
                        type="button"
                        class="btn-select-pos"
                        *ngIf="poi.id !== selectedActivePoiId"
                        (click)="onSelectPoiForPos(poi)"
                      >
                        Usar en este POS
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- VISTA FIRMA ELECTRÓNICA (.P12) -->
        <div *ngIf="activeSubTab === 'cert'" class="tab-content">
          <div class="card cert-card">
            <div class="cert-card-header">
              <div>
                <h4>Certificado Digital para Facturación SRI</h4>
                <p>Requerido por la normativa ecuatoriana para firmar documentos XML mediante XAdES-BES.</p>
              </div>
              <span class="cert-status-badge" [class.valid]="hasActiveCert" [class.missing]="!hasActiveCert">
                {{ hasActiveCert ? '✓ Certificado Operativo' : '⚠️ Firma Pendiente' }}
              </span>
            </div>

            <!-- DETALLES DEL CERTIFICADO SI EXISTE -->
            <div *ngIf="hasActiveCert" class="cert-active-view">
              <div class="cert-summary-grid">
                <div class="cert-prop cert-prop-fingerprint">
                  <span class="prop-lbl">Huella Criptográfica SHA-256</span>
                  <div class="fingerprint-wrapper">
                    <code class="prop-val fingerprint-code" [title]="activeCert?.fingerprint">{{ activeCert?.fingerprint }}</code>
                  </div>
                </div>
                <div class="cert-prop cert-prop-expiry">
                  <span class="prop-lbl">Fecha de Caducidad</span>
                  <span class="prop-val highlight">{{ activeCert?.validUntil | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="cert-prop cert-prop-security">
                  <span class="prop-lbl">Seguridad</span>
                  <span class="prop-val text-success">Cifrado Bóveda AES-256</span>
                </div>
              </div>
            </div>

            <!-- FORMULARIO DE CARGA / ACTUALIZACIÓN -->
            <div class="cert-upload-panel">
              <h5>{{ hasActiveCert ? 'Actualizar / Renovar Firma Electrónica' : 'Subir Archivo de Firma Electrónica (.p12)' }}</h5>
              <form (ngSubmit)="onUploadCert()" class="cert-form">
                <div class="grid-3">
                  <div class="field-group">
                    <label>Archivo (.p12 o .pfx) <span class="req">*</span></label>
                    <input type="file" (change)="onFileSelected($event)" accept=".p12,.pfx" required />
                  </div>
                  <div class="field-group">
                    <label>Contraseña del Certificado <span class="req">*</span></label>
                    <input type="password" [(ngModel)]="certPassword" name="certPassword" placeholder="••••••••" required />
                  </div>
                  <div class="field-group btn-end">
                    <button type="submit" class="btn-primary" [disabled]="loading || !selectedFile || !certPassword">
                      {{ loading ? 'Validando con CRL...' : '⬆️ Cargar Certificado' }}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fiscal-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 10px;
    }
    .header-box {
      margin-bottom: 24px;
    }
    .header-box h2 {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 0.05em;
    }
    .eyebrow .dot {
      width: 6px;
      height: 6px;
      background: #2563eb;
      border-radius: 50%;
    }
    .alert-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .alert-box.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: inherit;
    }

    /* WIZARD CARD (ESTADO CERO) */
    .setup-wizard-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 32px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
    }
    .wizard-header {
      display: flex;
      gap: 20px;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 28px;
    }
    .icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      border: 1px solid #bfdbfe;
    }
    .wizard-header h3 {
      font-size: 20px;
      margin: 0 0 4px;
      color: #0f172a;
    }
    .wizard-header p {
      color: #64748b;
      margin: 0;
      font-size: 14px;
    }
    .form-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 22px;
      margin-bottom: 22px;
    }
    .section-title {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 18px;
    }
    .step-num {
      width: 28px;
      height: 28px;
      background: #2563eb;
      color: #fff;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .section-title h4 {
      margin: 0;
      font-size: 15px;
      color: #1e293b;
    }
    .section-title p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }
    .field-group label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 18px;
      margin: 0;
      white-space: nowrap;
    }
    .req {
      color: #ef4444;
      font-weight: 700;
      display: inline;
    }
    .field-hint {
      font-size: 11px;
      color: #94a3b8;
      min-height: 16px;
      line-height: 1.3;
      margin-top: 2px;
    }
    input[type="text"], input[type="password"], select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font-size: 13px;
      color: #1e293b;
      outline: none;
      background: #ffffff;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    input[type="text"]:focus, input[type="password"]:focus, select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      align-items: start;
    }
    .wizard-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 14px;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-outline:hover {
      border-color: #2563eb;
      color: #2563eb;
    }
    .small {
      padding: 6px 12px;
      font-size: 12px;
    }

    /* VISTA DE EMPRESA EXISTENTE */
    .company-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .company-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;
      border-radius: 14px;
      padding: 26px 30px;
    }
    .company-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .company-brand {
      display: flex;
      gap: 18px;
      align-items: center;
    }
    .avatar-corp {
      width: 58px;
      height: 58px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    .corp-tags {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
    }
    .badge-active {
      background: #10b981;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      letter-spacing: 0.05em;
    }
    .badge-env {
      background: rgba(255, 255, 255, 0.15);
      color: #e2e8f0;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .company-brand h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
    }
    .corp-trade {
      color: #94a3b8;
      margin: 2px 0 0;
      font-size: 13px;
    }
    .company-meta {
      display: flex;
      gap: 20px;
      background: rgba(255, 255, 255, 0.06);
      padding: 12px 20px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .meta-pill {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-pill .lbl {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .meta-pill strong {
      font-size: 14px;
      color: #ffffff;
      letter-spacing: 0.05em;
    }
    .meta-pill span {
      font-size: 13px;
      color: #cbd5e1;
    }

    /* SUB-TABS */
    .sub-tabs {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
    }
    .sub-tab-btn {
      background: none;
      border: none;
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      padding: 12px 18px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .sub-tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
    }
    .dot-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-status.green { background: #10b981; }
    .dot-status.amber { background: #f59e0b; }

    /* CONTENIDO SUCURSALES */
    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .content-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .content-toolbar p {
      color: #64748b;
      font-size: 13px;
      margin: 0;
    }
    .toolbar-actions {
      display: flex;
      gap: 10px;
    }
    .expandable-form-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 20px;
    }
    .expandable-form-box h4 {
      margin: 0 0 16px;
      font-size: 15px;
      color: #1e293b;
    }
    .form-foot {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }

    /* ARBOL JERARQUICO */
    .hierarchy-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .branch-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .branch-card-header {
      background: #f8fafc;
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .branch-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-code {
      background: #e2e8f0;
      color: #334155;
      font-weight: 700;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: monospace;
    }
    .branch-title h5 {
      margin: 0;
      font-size: 15px;
      color: #0f172a;
    }
    .branch-addr {
      font-size: 13px;
      color: #64748b;
    }
    .boxes-container {
      padding: 16px 20px;
    }
    .boxes-header {
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .boxes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .box-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      transition: all 0.15s;
    }
    .box-item.selected-for-pos {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .box-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .box-badge {
      background: #0f172a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
    }
    .box-name {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }
    .poi-toast-banner {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .tag-active-pos {
      background: #10b981;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .btn-select-pos {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-select-pos:hover {
      border-color: #2563eb;
      color: #2563eb;
    }

    /* CARD DE FIRMA ELECTRONICA */
    .cert-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 26px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.03);
    }
    .cert-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 22px;
    }
    .cert-card-header h4 {
      margin: 0 0 4px;
      font-size: 17px;
      color: #0f172a;
    }
    .cert-card-header p {
      margin: 0;
      color: #64748b;
      font-size: 13px;
    }
    .cert-status-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 20px;
    }
    .cert-status-badge.valid {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .cert-status-badge.missing {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .cert-summary-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(180px, 1.2fr) minmax(150px, 1fr);
      gap: 28px;
      align-items: center;
      background: #f8fafc;
      padding: 18px 24px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .cert-prop {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }
    .fingerprint-wrapper {
      min-width: 0;
      overflow: hidden;
    }
    .fingerprint-code {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      background: #edf2f7;
      padding: 3px 8px;
      border-radius: 5px;
      border: 1px solid #e2e8f0;
      max-width: 100%;
    }
    .prop-lbl {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .prop-val {
      font-size: 13px;
      color: #1e293b;
      font-family: monospace;
    }
    .prop-val.highlight {
      font-family: inherit;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }
    .text-success {
      color: #16a34a;
    }
    .cert-upload-panel {
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
    }
    .cert-upload-panel h5 {
      margin: 0 0 16px;
      font-size: 14px;
      color: #334155;
    }
    .btn-end {
      display: flex;
      align-items: flex-end;
    }
    @media (max-width: 768px) {
      .grid-2, .grid-3 {
        grid-template-columns: 1fr;
      }
      .company-card-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class FiscalSetupViewComponent {
  @Input() entries: FiscalConfigurationEntry[] | null = [];
  @Input() certificates: CertificateMetadata[] | null = [];
  @Input() loading: boolean | null = false;
  @Input() activePoiId: string | null = null;

  @Output() saveConfig = new EventEmitter<FiscalConfigurationRequest>();
  @Output() createBranch = new EventEmitter<{ code: string; name?: string; address?: string }>();
  @Output() createPoi = new EventEmitter<{ establishmentId: string; code: string; name?: string }>();
  @Output() uploadCert = new EventEmitter<{ file: File; pass: string }>();
  @Output() selectActivePoi = new EventEmitter<FiscalConfigurationEntry>();

  errorMessage: string | null = null;
  poiSelectedMessage: string = '';
  activeSubTab: 'branches' | 'cert' = 'branches';

  // Formularios desplegables
  showAddBranchForm = false;
  showAddPoiForm = false;

  // Archivo de firma
  selectedFile: File | null = null;
  certPassword = '';

  // Formulario Inicial de Empresa (Campos vacíos por defecto)
  initRuc = '';
  initLegalName = '';
  initTradeName = '';
  initMainAddress = '';
  initEstCode = '001';
  initEstName = 'Sucursal Matriz';
  initEstAddress = '';
  initPoiCode = '001';
  initPoiName = 'Caja Principal 01';

  // Formulario para nueva sucursal (vacío)
  newBranchCode = '';
  newBranchName = '';
  newBranchAddress = '';

  // Formulario para nueva caja (vacío)
  selectedEstablishmentIdForPoi = '';
  newPoiCode = '';
  newPoiName = '';

  get hasCompany(): boolean {
    return !!(this.entries && this.entries.length > 0 && this.entries[0].ruc);
  }

  get companyInfo(): FiscalConfigurationEntry | null {
    return this.hasCompany ? this.entries![0] : null;
  }

  get hasActiveCert(): boolean {
    return !!(this.certificates && this.certificates.length > 0);
  }

  get activeCert(): CertificateMetadata | null {
    return this.hasActiveCert ? this.certificates![0] : null;
  }

  get isInitFormValid(): boolean {
    return (
      (this.initRuc || '').trim().length === 13 &&
      (this.initLegalName || '').trim().length > 0 &&
      (this.initMainAddress || '').trim().length > 0 &&
      (this.initEstCode || '').trim().length === 3 &&
      (this.initEstAddress || '').trim().length > 0 &&
      (this.initPoiCode || '').trim().length === 3
    );
  }

  get selectedActivePoiId(): string | null {
    if (this.activePoiId) return this.activePoiId;
    return this.entries && this.entries.length > 0 ? this.entries[0].pointOfIssueId || null : null;
  }

  get establishmentsCount(): number {
    return this.establishmentsList.length;
  }

  get establishmentsList(): Array<{
    id: string;
    code: string;
    name?: string;
    address: string;
    points: Array<{ id: string; code: string; name?: string }>;
  }> {
    if (!this.entries || this.entries.length === 0) return [];

    const map = new Map<string, {
      id: string;
      code: string;
      name?: string;
      address: string;
      points: Array<{ id: string; code: string; name?: string }>;
    }>();

    for (const e of this.entries) {
      const estId = e.establishmentId || 'default-est';
      if (!map.has(estId)) {
        map.set(estId, {
          id: estId,
          code: e.establishmentCode || '001',
          name: 'Sucursal ' + (e.establishmentCode || '001'),
          address: e.establishmentAddress || e.mainAddress || 'Dirección Matriz',
          points: []
        });
      }

      const est = map.get(estId)!;
      if (e.pointOfIssueId && !est.points.some(p => p.id === e.pointOfIssueId)) {
        est.points.push({
          id: e.pointOfIssueId,
          code: e.pointOfIssueCode || '001',
          name: 'Caja ' + (e.pointOfIssueCode || '001')
        });
      }
    }

    const list = Array.from(map.values());
    if (list.length > 0 && !this.selectedEstablishmentIdForPoi) {
      this.selectedEstablishmentIdForPoi = list[0].id;
    }
    return list;
  }

  toggleAddBranchForm(): void {
    this.showAddBranchForm = !this.showAddBranchForm;
    this.newBranchCode = '';
    this.newBranchName = '';
    this.newBranchAddress = '';
  }

  toggleAddPoiForm(): void {
    this.showAddPoiForm = !this.showAddPoiForm;
    this.newPoiCode = '';
    this.newPoiName = '';
    if (this.establishmentsList.length > 0) {
      this.selectedEstablishmentIdForPoi = this.establishmentsList[0].id;
    }
  }

  onSelectPoiForPos(poi: { id: string; code: string; name?: string }): void {
    const entry = this.entries?.find(e => e.pointOfIssueId === poi.id);
    if (entry) {
      this.poiSelectedMessage = `✓ Caja ${poi.code} activada exitosamente para el Punto de Venta (POS)`;
      setTimeout(() => this.poiSelectedMessage = '', 4000);
      this.selectActivePoi.emit(entry);
    }
  }

  onSubmitInitialCompany(): void {
    if (!this.isInitFormValid) {
      this.errorMessage = 'Por favor complete todos los campos obligatorios (*).';
      return;
    }

    const req: FiscalConfigurationRequest = {
      taxpayer: {
        ruc: this.initRuc.trim(),
        legalName: this.initLegalName.trim(),
        tradeName: this.initTradeName.trim() || undefined,
        mainAddress: this.initMainAddress.trim()
      },
      establishment: {
        code: this.initEstCode.trim(),
        name: this.initEstName.trim() || undefined,
        address: this.initEstAddress.trim()
      },
      pointOfIssue: {
        code: this.initPoiCode.trim(),
        name: this.initPoiName.trim() || undefined
      }
    };

    this.saveConfig.emit(req);
  }

  onSubmitNewBranch(): void {
    if (!this.newBranchCode || !this.newBranchAddress) return;
    this.createBranch.emit({
      code: this.newBranchCode.trim(),
      name: this.newBranchName.trim() || undefined,
      address: this.newBranchAddress.trim()
    });
    this.showAddBranchForm = false;
  }

  onSubmitNewPoi(): void {
    if (!this.newPoiCode || !this.selectedEstablishmentIdForPoi) return;
    this.createPoi.emit({
      establishmentId: this.selectedEstablishmentIdForPoi,
      code: this.newPoiCode.trim(),
      name: this.newPoiName.trim() || undefined
    });
    this.showAddPoiForm = false;
  }

  onFileSelected(evt: any): void {
    const file = evt.target.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onUploadCert(): void {
    if (!this.selectedFile || !this.certPassword) return;
    this.uploadCert.emit({
      file: this.selectedFile,
      pass: this.certPassword
    });
    this.certPassword = '';
  }
}
