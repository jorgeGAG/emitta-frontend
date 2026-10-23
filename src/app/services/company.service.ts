import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Company, SystemStatus } from '../models/company.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly http = inject(HttpClient);

  private readonly _activeCompany$ = new BehaviorSubject<Company | null>(null);
  public readonly activeCompany$: Observable<Company | null> = this._activeCompany$.asObservable();

  private readonly _systemStatus$ = new BehaviorSubject<SystemStatus | null>(null);
  public readonly systemStatus$: Observable<SystemStatus | null> = this._systemStatus$.asObservable();

  constructor() {
    this.refreshActiveCompany().subscribe({ error: () => {} });
    this.checkSystemStatus().subscribe({ error: () => {} });
  }

  public checkSystemStatus(): Observable<SystemStatus> {
    return this.http.get<SystemStatus>('/api/pos/system/status').pipe(
      tap(status => this._systemStatus$.next(status))
    );
  }

  public refreshActiveCompany(): Observable<Company> {
    return this.http.get<Company>('/api/pos/companies/active').pipe(
      tap(company => this._activeCompany$.next(company))
    );
  }

  public getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>('/api/pos/companies');
  }

  public switchCompany(companyId: string): Observable<{ success: boolean; company: Company }> {
    return this.http.post<{ success: boolean; company: Company }>('/api/pos/companies/switch', { companyId }).pipe(
      tap(res => {
        if (res.success && res.company) {
          this._activeCompany$.next(res.company);
        }
      })
    );
  }

  public testAndConnectCompany(payload: { name: string; clientId: string; clientSecret: string }): Observable<{ success: boolean; company: Company }> {
    return this.http.post<{ success: boolean; company: Company }>('/api/pos/companies/test-and-save', payload).pipe(
      tap(res => {
        if (res.success && res.company) {
          this._activeCompany$.next(res.company);
        }
      })
    );
  }
}
