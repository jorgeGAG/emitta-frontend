import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CashierUser, LoginResponse } from '../models/auth.model';

const STORAGE_KEY = 'emitta_pos_cashier_session_v2';
const TOKEN_KEY = 'emitta_pos_cashier_jwt_token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  
  private readonly _token$ = new BehaviorSubject<string | null>(this.loadStoredToken());
  public readonly token$: Observable<string | null> = this._token$.asObservable();

  private readonly _currentUser$ = new BehaviorSubject<CashierUser | null>(this.loadStoredUser());
  public readonly currentUser$: Observable<CashierUser | null> = this._currentUser$.asObservable();
  public readonly isLoggedIn$: Observable<boolean> = this._currentUser$.pipe(map(u => !!u));

  public isLoggedInSync(): boolean {
    return !!this._currentUser$.getValue();
  }

  private loadStoredToken(): string | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token && this.isTokenExpired(token)) {
        this.clearSession();
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  private loadStoredUser(): CashierUser | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token && this.isTokenExpired(token)) {
        this.clearSession();
        return null;
      }
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public getToken(): string | null {
    const token = this._token$.getValue() || sessionStorage.getItem(TOKEN_KEY);
    if (token && this.isTokenExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  }

  public isTokenExpired(tokenStr: string | null): boolean {
    if (!tokenStr) return true;
    try {
      const parts = tokenStr.split('.');
      if (parts.length < 2) return true;
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const payload = JSON.parse(atob(base64));
      if (!payload.exp) return false;
      return Date.now() >= (payload.exp * 1000 - 10000);
    } catch {
      return true;
    }
  }

  public login(username: string, pass: string): Observable<{ success: boolean; error?: string }> {
    return this.http.post<LoginResponse>('/api/pos/auth/login', {
      username: (username || '').trim(),
      password: pass
    }).pipe(
      map(res => {
        if (res.success && res.user && res.token) {
          sessionStorage.setItem(TOKEN_KEY, res.token);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
          this._token$.next(res.token);
          this._currentUser$.next(res.user);
          return { success: true };
        }
        return { success: false, error: res.error || 'Credenciales inválidas' };
      }),
      catchError(err => {
        const msg = err.error?.error || (typeof err.error === 'string' ? err.error : 'Usuario no registrado o clave incorrecta.');
        return of({ success: false, error: msg });
      })
    );
  }

  public logout(): void {
    this.clearSession();
    this._token$.next(null);
    this._currentUser$.next(null);
  }

  private clearSession(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
