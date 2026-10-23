import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  FiscalConfigurationEntry,
  FiscalConfigurationRequest,
  FiscalConfigurationResult,
  CertificateMetadata
} from '../models/fiscal.model';

@Injectable({
  providedIn: 'root'
})
export class FiscalService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = API_CONFIG.baseUrl;

  private readonly _fiscalEntries$ = new BehaviorSubject<FiscalConfigurationEntry[]>([]);
  private readonly _activeEntry$ = new BehaviorSubject<FiscalConfigurationEntry | null>(null);
  private readonly _certificates$ = new BehaviorSubject<CertificateMetadata[]>([]);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  public readonly fiscalEntries$ = this._fiscalEntries$.asObservable();
  public readonly activeEntry$ = this._activeEntry$.asObservable();
  public readonly certificates$ = this._certificates$.asObservable();
  public readonly loading$ = this._loading$.asObservable();
  public readonly error$ = this._error$.asObservable();

  private getAuthHeaders(token: string | null): HttpHeaders {
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Cache-Control': 'no-store'
    });
  }

  /**
   * Consulta los puntos de emisión y datos fiscales oficiales: GET /api/v1/fiscal-configuration
   */
  public loadFiscalConfiguration(token: string | null): Observable<FiscalConfigurationEntry[]> {
    if (!token) return of([]);
    this._loading$.next(true);

    const headers = this.getAuthHeaders(token);
    return this.http.get<FiscalConfigurationEntry[]>(`${this.apiBase}/fiscal-configuration?limit=50&offset=0`, { headers }).pipe(
      tap(entries => {
        this._loading$.next(false);
        this._fiscalEntries$.next(entries);
        if (entries && entries.length > 0) {
          const savedPoiId = localStorage.getItem('emitta_active_poi_id');
          const current = this._activeEntry$.getValue();
          const targetPoiId = current?.pointOfIssueId || savedPoiId;
          const match = targetPoiId ? entries.find(e => e.pointOfIssueId === targetPoiId) : null;
          const chosen = match || entries[0];

          this._activeEntry$.next(chosen);
          // Cargar certificados del emisor activo
          if (chosen.taxpayerId) {
            this.loadCertificates(token, chosen.taxpayerId);
          }
        }
      }),
      catchError(err => {
        this._loading$.next(false);
        console.warn('No se pudo cargar fiscal-configuration:', err?.message);
        return of([]);
      })
    );
  }

  /**
   * Selecciona una caja o punto de emisión activo
   */
  public selectActiveEntry(entry: FiscalConfigurationEntry): void {
    this._activeEntry$.next(entry);
    try {
      if (entry.pointOfIssueId) {
        localStorage.setItem('emitta_active_poi_id', entry.pointOfIssueId);
      }
    } catch {}
  }

  public getTaxpayerId(): string {
    const active = this._activeEntry$.getValue();
    if (active?.taxpayerId) return active.taxpayerId;
    const entries = this._fiscalEntries$.getValue();
    if (entries && entries.length > 0 && entries[0].taxpayerId) {
      return entries[0].taxpayerId;
    }
    return '';
  }

  /**
   * Registra emisor, establecimiento y caja: POST /api/v1/fiscal-configuration
   */
  public saveFiscalConfiguration(
    token: string | null,
    request: FiscalConfigurationRequest
  ): Observable<FiscalConfigurationResult | null> {
    if (!token) return of(null);
    this._loading$.next(true);
    this._error$.next(null);

    const headers = this.getAuthHeaders(token).set('Content-Type', 'application/json');
    return this.http.post<FiscalConfigurationResult>(`${this.apiBase}/fiscal-configuration`, request, { headers }).pipe(
      tap(result => {
        this._loading$.next(false);
        // Recargar la lista para reflejar los nuevos datos
        this.loadFiscalConfiguration(token).subscribe();
      }),
      catchError(err => {
        this._loading$.next(false);
        const msg = err?.error?.detail || err?.message || 'Error al guardar la configuración fiscal';
        this._error$.next(msg);
        return of(null);
      })
    );
  }

  /**
   * Crea un establecimiento / sucursal adicional: POST /api/v1/taxpayers/{taxpayerId}/establishments
   */
  public createEstablishment(
    token: string | null,
    taxpayerId: string,
    req: { code: string; name?: string; address?: string }
  ): Observable<any> {
    if (!token || !taxpayerId) return of(null);
    this._loading$.next(true);
    const headers = this.getAuthHeaders(token).set('Content-Type', 'application/json');
    return this.http.post(`${this.apiBase}/taxpayers/${taxpayerId}/establishments`, req, { headers }).pipe(
      tap(() => {
        this._loading$.next(false);
        this.loadFiscalConfiguration(token).subscribe();
      }),
      catchError(err => {
        this._loading$.next(false);
        const msg = err?.error?.detail || err?.message || 'Error al crear la sucursal';
        this._error$.next(msg);
        return of(null);
      })
    );
  }

  /**
   * Crea un punto de emisión / caja adicional: POST /api/v1/establishments/{establishmentId}/points-of-issue
   */
  public createPointOfIssue(
    token: string | null,
    establishmentId: string,
    req: { code: string; name?: string }
  ): Observable<any> {
    if (!token || !establishmentId) return of(null);
    this._loading$.next(true);
    const headers = this.getAuthHeaders(token).set('Content-Type', 'application/json');
    return this.http.post(`${this.apiBase}/establishments/${establishmentId}/points-of-issue`, req, { headers }).pipe(
      tap(() => {
        this._loading$.next(false);
        this.loadFiscalConfiguration(token).subscribe();
      }),
      catchError(err => {
        this._loading$.next(false);
        const msg = err?.error?.detail || err?.message || 'Error al crear la caja';
        this._error$.next(msg);
        return of(null);
      })
    );
  }

  /**
   * Consulta los metadatos de certificados del contribuyente: GET /api/v1/taxpayers/{id}/certificates
   */
  public loadCertificates(token: string | null, taxpayerId: string): void {
    if (!token || !taxpayerId) return;

    const headers = this.getAuthHeaders(token);
    this.http.get<CertificateMetadata[]>(`${this.apiBase}/taxpayers/${taxpayerId}/certificates`, { headers }).pipe(
      tap(certs => {
        this._certificates$.next(certs || []);
      }),
      catchError(err => {
        console.warn('Certificados no disponibles:', err?.message);
        this._certificates$.next([]);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Carga un certificado digital .p12 por HTTPS: POST /api/v1/taxpayers/{id}/certificates
   */
  public uploadCertificate(
    token: string | null,
    taxpayerId: string,
    formData: FormData
  ): Observable<any> {
    if (!token || !taxpayerId) return of(null);
    this._loading$.next(true);
    this._error$.next(null);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<any>(`${this.apiBase}/taxpayers/${taxpayerId}/certificates`, formData, { headers }).pipe(
      tap(() => {
        this._loading$.next(false);
        this.loadCertificates(token, taxpayerId);
      }),
      catchError(err => {
        this._loading$.next(false);
        const msg = err?.error?.detail || err?.message || 'Error al validar el certificado .p12';
        this._error$.next(msg);
        return of(null);
      })
    );
  }
}
