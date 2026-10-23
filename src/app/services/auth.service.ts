import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { CashierUser } from '../models/auth.model';

const STORAGE_KEY = 'emitta_pos_cashier_session_v2';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _currentUser$ = new BehaviorSubject<CashierUser | null>(this.loadStoredUser());

  public readonly currentUser$: Observable<CashierUser | null> = this._currentUser$.asObservable();
  public readonly isLoggedIn$: Observable<boolean> = this._currentUser$.pipe(map(u => !!u));

  private loadStoredUser(): CashierUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public login(username: string, pass: string): Observable<{ success: boolean; error?: string }> {
    return this.http.post<{ success: boolean; user?: CashierUser; error?: string }>('/api/pos/auth/login', {
      username: (username || '').trim(),
      password: pass
    }).pipe(
      map(res => {
        if (res.success && res.user) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
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
    sessionStorage.removeItem(STORAGE_KEY);
    this._currentUser$.next(null);
  }
}
