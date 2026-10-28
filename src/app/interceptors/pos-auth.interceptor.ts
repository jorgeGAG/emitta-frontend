import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor HTTP de Angular: Adjunta el token JWT del Cajero / Usuario
 * en la cabecera Authorization: Bearer <token> para todas las peticiones a /api/pos/*
 */
export const posAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && req.url.startsWith('/api/pos')) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
