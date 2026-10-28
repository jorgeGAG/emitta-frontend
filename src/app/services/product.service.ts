import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly _products$ = new BehaviorSubject<Product[]>([]);
  public readonly products$: Observable<Product[]> = this._products$.asObservable();

  constructor() {
    this.loadProducts();
  }

  public loadProducts(companyId?: string): Observable<Product[]> {
    const url = companyId ? `/api/pos/products?companyId=${encodeURIComponent(companyId)}` : '/api/pos/products';
    return this.http.get<Product[]>(url).pipe(
      tap(list => this._products$.next(list || [])),
      catchError(err => {
        console.warn('Error cargando productos de BD:', err);
        return of([]);
      })
    );
  }

  public saveProduct(product: Partial<Product>): Observable<{ success: boolean; product?: Product; error?: string }> {
    return this.http.post<{ success: boolean; product?: Product; error?: string }>('/api/pos/products', product).pipe(
      tap(res => {
        if (res.success && res.product) {
          const current = this._products$.value;
          const idx = current.findIndex(p => p.id === res.product!.id);
          if (idx >= 0) {
            current[idx] = res.product;
            this._products$.next([...current]);
          } else {
            this._products$.next([...current, res.product]);
          }
        }
      })
    );
  }

  public deleteProduct(productId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/pos/products/${productId}`).pipe(
      tap(res => {
        if (res.success) {
          const updated = this._products$.value.filter(p => p.id !== productId);
          this._products$.next(updated);
        }
      })
    );
  }
}
