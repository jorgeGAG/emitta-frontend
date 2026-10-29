import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege las rutas del sistema (/pos, etc.).
 * Si el usuario no ha iniciado sesión, lo redirige a /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedInSync()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Protege la página de /login.
 * Si el usuario ya está autenticado, lo redirige a /pos para no mostrar el formulario de nuevo.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedInSync()) {
    return router.createUrlTree(['/pos']);
  }

  return true;
};
