import { Routes } from '@angular/router';
import { CashierLoginComponent } from './components/dumb/cashier-login/cashier-login.component';
import { DashboardContainerComponent } from './components/smart/dashboard-container/dashboard-container.component';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: CashierLoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'pos',
    component: DashboardContainerComponent,
    canActivate: [authGuard]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'pos'
  },
  {
    path: '**',
    redirectTo: 'pos'
  }
];
