import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  BillingMetrics,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  CreateInvoiceResult,
  DocumentView
} from '../models/invoice.model';
import { RideJob } from '../models/fiscal.model';

const INVOICES_STORAGE_KEY = 'emitta_pos_invoices_registry';

export interface AdmissionSaturatedState {
  saturated: boolean;
  retryAfter: number;
  idempotencyKey: string | null;
  lastRequest: CreateInvoiceRequest | null;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = API_CONFIG.baseUrl;

  // Estado Reactivo Privado (BehaviorSubject)
  private readonly _invoices$ = new BehaviorSubject<DocumentView[]>(this.loadStoredInvoices());
  private readonly _selectedInvoice$ = new BehaviorSubject<DocumentView | null>(null);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _metrics$ = new BehaviorSubject<BillingMetrics>({
    totalInvoices: 0,
    totalAmount: 0,
    authorizedCount: 0,
    pendingCount: 0,
    rejectedCount: 0
  });
  private readonly _backendConnected$ = new BehaviorSubject<boolean>(false);

  // Estado de Idempotencia y Saturación (Directiva Oficial SRI / Emitta)
  private readonly _admissionSaturated$ = new BehaviorSubject<AdmissionSaturatedState>({
    saturated: false,
    retryAfter: 0,
    idempotencyKey: null,
    lastRequest: null
  });

  // Flujos de Solo Lectura Públicos (Observable$)
  public readonly invoices$: Observable<DocumentView[]> = this._invoices$.asObservable();
  public readonly selectedInvoice$: Observable<DocumentView | null> = this._selectedInvoice$.asObservable();
  public readonly loading$: Observable<boolean> = this._loading$.asObservable();
  public readonly error$: Observable<string | null> = this._error$.asObservable();
  public readonly metrics$: Observable<BillingMetrics> = this._metrics$.asObservable();
  public readonly backendConnected$: Observable<boolean> = this._backendConnected$.asObservable();
  public readonly admissionSaturated$: Observable<AdmissionSaturatedState> = this._admissionSaturated$.asObservable();

  private token: string | null = sessionStorage.getItem('emitta_api_token') || null;
  private readonly _token$ = new BehaviorSubject<string | null>(this.token);
  public readonly token$: Observable<string | null> = this._token$.asObservable();
  private readonly _activePolling = new Set<string>();

  constructor() {
    this.recalculateMetrics(this._invoices$.getValue());
    this.checkHealth();
    this.authenticateAndLoadRealDocuments();
    this.loadInvoicesFromDatabase();
  }

  public getInvoicesSnapshot(): DocumentView[] {
    return this._invoices$.getValue();
  }

  public loadInvoicesFromDatabase(companyId?: string): void {
    const url = companyId ? `/api/pos/invoices?companyId=${encodeURIComponent(companyId)}` : '/api/pos/invoices';
    this.http.get<any[]>(url).pipe(
      tap(dbList => {
        if (Array.isArray(dbList)) {
          const mapped: DocumentView[] = dbList.map(inv => ({
            id: inv.documentId || inv.id,
            sequential: inv.invoiceNumber || '001-001-000000001',
            environment: 'TEST',
            status: inv.status || 'AUTHORIZED',
            issuedAt: inv.createdAt || inv.authorizationDate || new Date().toISOString(),
            accessKey: inv.accessKey || '',
            authorizedAt: inv.authorizationDate,
            buyer: {
              identificationType: 'CONSUMIDOR_FINAL',
              identification: inv.buyerRuc || '9999999999999',
              name: inv.buyerName || 'CONSUMIDOR FINAL',
              address: 'Ecuador',
              email: 'cliente@correo.com'
            },
            items: [],
            payments: [{ paymentMethod: '01', total: inv.total || 0 }],
            subtotal15: Math.round(((inv.total - (inv.taxAmount || 0))) * 100) / 100,
            subtotal0: 0,
            subtotalWithoutTax: Math.round(((inv.total - (inv.taxAmount || 0))) * 100) / 100,
            totalDiscount: 0,
            ivaAmount: inv.taxAmount || 0,
            total: inv.total || 0
          }));
          this._invoices$.next(mapped);
          this.recalculateMetrics(mapped);
        }
      }),
      catchError(() => of([]))
    ).subscribe();
  }

  private loadStoredInvoices(): DocumentView[] {
    return [];
  }

  private persistInvoices(invoices: DocumentView[]): void {
    // Sincronizar automáticamente en la Base de Datos (MongoDB)
    const latest = invoices[0];
    if (latest && latest.id) {
      this.http.post('/api/pos/invoices', {
        documentId: latest.id,
        invoiceNumber: latest.sequential,
        buyerRuc: latest.buyer?.identification || '9999999999999',
        buyerName: latest.buyer?.name || 'CONSUMIDOR FINAL',
        total: latest.total,
        taxAmount: latest.ivaAmount,
        status: latest.status,
        accessKey: latest.accessKey,
        authorizationDate: latest.authorizedAt || new Date().toISOString(),
        itemsCount: latest.items?.length || 1,
        items: latest.items || []
      }).subscribe({ error: () => {} });
    }
  }

  public isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      return Date.now() >= (payload.exp * 1000 - 30000);
    } catch {
      return true;
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = sessionStorage.getItem('emitta_api_token') || null;
    }
    if (this.isTokenExpired(this.token)) {
      this.token = null;
      try { sessionStorage.removeItem('emitta_api_token'); } catch {}
      this.authenticateAndLoadRealDocuments();
      return null;
    }
    return this.token;
  }


  /**
   * Comprueba conectividad con la API Oficial de Emitta / SRI
   */
  public checkHealth(): void {
    if (this.token && !this.isTokenExpired(this.token)) {
      this._backendConnected$.next(true);
      return;
    }

    this.http.get<{ status: string }>('/actuator/health').pipe(
      tap(res => {
        this._backendConnected$.next(res?.status === 'UP');
      }),
      catchError(() => {
        const hasValidToken = !this.isTokenExpired(this.token);
        this._backendConnected$.next(hasValidToken);
        return of({ status: hasValidToken ? 'UP' : 'DOWN' });
      })
    ).subscribe();
  }

  /**
   * Autentica el cliente API de forma real mediante POST /api/v1/auth/token
   * utilizando las credenciales dinámicas de la empresa o de API_CONFIG
   */
  public authenticateAndLoadRealDocuments(customCredentials?: { clientId?: string; clientSecret?: string }): void {
    const clientId = customCredentials?.clientId || API_CONFIG.clientId;
    const clientSecret = customCredentials?.clientSecret || API_CONFIG.clientSecret;

    if (!clientId || clientId === 'AUTO' || !clientSecret || clientSecret === 'AUTO') {
      return;
    }

    const credentials = { clientId, clientSecret };

    this.http.post<{ accessToken: string }>(`${this.apiBase}/auth/token`, credentials).pipe(
      tap(res => {
        this.token = res.accessToken;
        this._token$.next(res.accessToken);
        try { sessionStorage.setItem('emitta_api_token', res.accessToken); } catch {}
        this._backendConnected$.next(true);
        this.loadRealDocumentsFromBackend();
      }),
      catchError(err => {
        console.error('Error autenticando con la API real:', err);
        this._backendConnected$.next(false);
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Sincroniza el estado fiscal oficial de los documentos registrados: GET /api/v1/documents/{id}
   */
  public loadRealDocumentsFromBackend(): void {
    const activeToken = this.getToken();
    if (!activeToken) return;

    const currentInvoices = this._invoices$.getValue();
    for (const inv of currentInvoices) {
      this.pollRealDocumentStatus(inv.id);
    }
  }

  /**
   * Emite una factura electrónica enviándola directamente a la API Spring Boot (POST /api/v1/invoices)
   * Cumple con la directiva oficial de reintentos idempotentes ante saturación 503.
   */
  public emitInvoice(request: CreateInvoiceRequest, keyOverride?: string): Observable<CreateInvoiceResult> {
    this._loading$.next(true);
    this._error$.next(null);

    const idempotencyKey = keyOverride || `pos-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const activeToken = this.getToken();

    const idTypeMap: Record<string, string> = {
      'RUC': '04',
      'CEDULA': '05',
      'PASAPORTE': '06',
      'CONSUMIDOR_FINAL': '07'
    };

    const apiPayload = {
      ...request,
      buyer: {
        ...request.buyer,
        identificationType: idTypeMap[request.buyer.identificationType] || request.buyer.identificationType
      }
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'Authorization': activeToken ? `Bearer ${activeToken}` : ''
    });

    return this.http.post<CreateInvoiceResponse>(`${this.apiBase}/invoices`, apiPayload, { headers }).pipe(
      map(response => {
        this._loading$.next(false);
        // Limpiar estado de saturación ya que la petición fue admitida exitosamente
        this._admissionSaturated$.next({
          saturated: false,
          retryAfter: 0,
          idempotencyKey: null,
          lastRequest: null
        });

        const newDoc = this.buildDocumentViewFromRequest(request, response.id, response.status);
        this.addInvoiceInmutably(newDoc);
        this.pollRealDocumentStatus(response.id);

        return {
          ...response,
          document: newDoc
        };
      }),
      catchError((err: HttpErrorResponse) => {
        this._loading$.next(false);
        const isSaturated = err.status === 503 || err?.error?.code === 'ADMISSION_SATURATED';
        const retryAfterSeconds = Number(err.headers?.get('Retry-After') || 2);

        if (isSaturated) {
          // Registrar clave y petición idéntica para permitir reintento legal sin duplicación
          this._admissionSaturated$.next({
            saturated: true,
            retryAfter: retryAfterSeconds,
            idempotencyKey,
            lastRequest: request
          });
        }

        const errMsg = err?.error?.detail || err?.message || 'Error al conectar con la API de Emitta';
        this._error$.next(errMsg);
        return of({
          id: '',
          status: isSaturated ? 'ADMISSION_SATURATED' : 'ERROR',
          total: request.expectedTotal,
          created: false,
          error: errMsg
        });
      })
    );
  }

  /**
   * Reintenta la emisión de la factura satura utilizando EXACTAMENTE la misma Idempotency-Key
   * y la misma petición, como lo exige la normativa oficial del SRI / Emitta.
   */
  public retryAdmissionInvoice(): Observable<CreateInvoiceResult> {
    const current = this._admissionSaturated$.getValue();
    if (!current.lastRequest || !current.idempotencyKey) {
      return of({
        id: '',
        status: 'ERROR',
        total: 0,
        created: false,
        error: 'No hay petición pendiente de reintento'
      });
    }
    return this.emitInvoice(current.lastRequest, current.idempotencyKey);
  }

  /**
   * Consulta el estado real del documento en la API: GET /api/v1/documents/{documentId}
   * Implementa polling reactivo progresivo hasta que la factura alcanza un estado final
   * ('AUTHORIZED', 'REJECTED' o 'FAILED'), evitando que el usuario deba recargar la página manualmente.
   */
  public pollRealDocumentStatus(documentId: string, maxAttempts = 20, intervalMs = 3000): void {
    const activeToken = this.getToken();
    if (!activeToken || !documentId) return;
    if (this._activePolling.has(documentId)) return;

    this._activePolling.add(documentId);
    let attempts = 0;
    const terminalStatuses = ['AUTHORIZED', 'REJECTED', 'FAILED', 'NOT_AUTHORIZED'];

    const checkStatus = () => {
      attempts++;
      const currentToken = this.getToken();
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${currentToken}`,
        'Cache-Control': 'no-store'
      });

      this.http.get<any>(`${this.apiBase}/documents/${documentId}`, { headers }).pipe(
        tap(res => {
          if (res && res.status) {
            let realSequential = undefined;
            if (res.accessKey && res.accessKey.length === 49) {
              const est = res.accessKey.substring(24, 27);
              const pto = res.accessKey.substring(27, 30);
              const sec = res.accessKey.substring(30, 39);
              realSequential = `${est}-${pto}-${sec}`;
            }

            this.updateInvoiceInmutably(documentId, {
              status: res.status,
              accessKey: res.accessKey || (res.status === 'QUEUED' ? 'En cola de procesamiento RabbitMQ' : res.accessKey),
              authorizedAt: res.authorizedAt,
              ...(realSequential ? { sequential: realSequential } : {})
            });

            // Si aún está en proceso asíncrono (QUEUED, SIGNED, SUBMITTED) y quedan reintentos:
            if (!terminalStatuses.includes(res.status) && attempts < maxAttempts) {
              setTimeout(() => checkStatus(), intervalMs);
            } else {
              this._activePolling.delete(documentId);
            }
          } else {
            this._activePolling.delete(documentId);
          }
        }),
        catchError(() => {
          this._activePolling.delete(documentId);
          return of(null);
        })
      ).subscribe();
    };

    checkStatus();
  }

  /**
   * Descarga los artefactos oficiales de la API:
   * GET /api/v1/documents/{documentId}/artifacts/authorized-xml
   * GET /api/v1/documents/{documentId}/artifacts/ride-pdf
   */
  public downloadOfficialArtifact(documentId: string, type: 'authorized-xml' | 'ride-pdf'): Observable<boolean> {
    const activeToken = this.getToken();
    if (!activeToken || !documentId) return of(false);

    this._loading$.next(true);
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${activeToken}`
    });

    return this.http.get(`${this.apiBase}/documents/${documentId}/artifacts/${type}`, {
      headers,
      responseType: 'blob'
    }).pipe(
      map(blob => {
        this._loading$.next(false);
        const extension = type === 'authorized-xml' ? 'xml' : 'pdf';
        const filename = `factura-${documentId.substring(0, 8)}.${extension}`;
        
        // Disparar descarga nativa del navegador:
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return true;
      }),
      catchError(err => {
        this._loading$.next(false);
        const status = err?.status;
        if (status === 409) {
          this._error$.next('El comprobante aún está en procesamiento y no ha sido autorizado por el SRI.');
        } else if (status === 404) {
          this._error$.next('El archivo aún no está generado en el servidor de Emitta.');
        } else {
          this._error$.next('No se pudo descargar el archivo oficial desde la API.');
        }
        return of(false);
      })
    );
  }

  /**
   * Consulta el trabajo de renderizado de RIDE: GET /api/v1/documents/{id}/ride-job
   */
  public getRideJob(documentId: string): Observable<RideJob | null> {
    const activeToken = this.getToken();
    if (!activeToken || !documentId) return of(null);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${activeToken}`
    });

    return this.http.get<RideJob>(`${this.apiBase}/documents/${documentId}/ride-job`, { headers }).pipe(
      catchError(() => of(null))
    );
  }

  public selectInvoice(id: string): void {
    const match = this._invoices$.getValue().find(inv => inv.id === id);
    if (match) {
      this._selectedInvoice$.next(match);
    }
  }

  public clearSelection(): void {
    this._selectedInvoice$.next(null);
  }

  public clearError(): void {
    this._error$.next(null);
  }

  public removeInvoice(id: string): void {
    const current = this._invoices$.getValue();
    const updated = current.filter(i => i.id !== id);
    this._invoices$.next(updated);
    this.persistInvoices(updated);
    this.recalculateMetrics(updated);
    if (this._selectedInvoice$.getValue()?.id === id) {
      this._selectedInvoice$.next(null);
    }
  }

  private addInvoiceInmutably(newDoc: DocumentView): void {
    const current = this._invoices$.getValue();
    const updatedList = [newDoc, ...current];
    this._invoices$.next(updatedList);
    this.persistInvoices(updatedList);
    this.recalculateMetrics(updatedList);
  }

  private updateInvoiceInmutably(id: string, patch: Partial<DocumentView>): void {
    const current = this._invoices$.getValue();
    const updatedList = current.map(inv => inv.id === id ? { ...inv, ...patch } : inv);
    this._invoices$.next(updatedList);
    this.persistInvoices(updatedList);
    this.recalculateMetrics(updatedList);

    const selected = this._selectedInvoice$.getValue();
    if (selected && selected.id === id) {
      this._selectedInvoice$.next({ ...selected, ...patch });
    }
  }

  private buildDocumentViewFromRequest(request: CreateInvoiceRequest, id: string, status: string): DocumentView {
    const currentDocs = this._invoices$.getValue();
    const nextSeqNum = 106 + currentDocs.length;
    const seqStr = `001-001-${String(nextSeqNum).padStart(9, '0')}`;

    let subtotal15 = 0;
    let subtotal0 = 0;
    let totalDiscount = 0;

    const items = request.items.map(it => {
      const lineSub = Math.round((it.quantity * it.unitPrice - it.discount) * 100) / 100;
      totalDiscount += it.discount || 0;
      const has15 = it.taxes.some(t => t.rate === 15 || t.percentageCode === '4');
      if (has15) {
        subtotal15 += lineSub;
      } else {
        subtotal0 += lineSub;
      }
      return {
        ...it,
        subtotal: lineSub
      };
    });

    const ivaAmount = Math.round((subtotal15 * 0.15) * 100) / 100;
    const subtotalWithoutTax = Math.round((subtotal15 + subtotal0) * 100) / 100;
    const total = Math.round((subtotalWithoutTax + ivaAmount) * 100) / 100;

    return {
      id,
      sequential: seqStr,
      environment: request.environment,
      status,
      issuedAt: request.issuedAt || new Date().toISOString(),
      accessKey: 'PROCESANDO EN COLA RABBITMQ...',
      buyer: request.buyer,
      items,
      payments: request.payments,
      subtotal15: Math.round(subtotal15 * 100) / 100,
      subtotal0: Math.round(subtotal0 * 100) / 100,
      subtotalWithoutTax,
      totalDiscount,
      ivaAmount,
      total
    };
  }

  private recalculateMetrics(list: DocumentView[]): void {
    const totalInvoices = list.length;
    const totalAmount = list.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const authorizedCount = list.filter(i => i.status === 'AUTHORIZED').length;
    const pendingCount = list.filter(i => i.status === 'QUEUED' || i.status === 'GENERATED' || i.status === 'SIGNED' || i.status === 'TRANSMITTED').length;
    const rejectedCount = list.filter(i => i.status === 'REJECTED' || i.status === 'NOT_AUTHORIZED').length;

    this._metrics$.next({
      totalInvoices,
      totalAmount: Math.round(totalAmount * 100) / 100,
      authorizedCount,
      pendingCount,
      rejectedCount
    });
  }
}
