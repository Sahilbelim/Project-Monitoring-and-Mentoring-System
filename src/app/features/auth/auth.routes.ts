import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',          loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: 'register',       loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent) },
  { path: 'forgot-password',loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password/:token', loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: '2fa-verify',     loadComponent: () => import('./two-factor/two-factor.component').then(m => m.TwoFactorComponent) },
  { path: 'accept-invite',  loadComponent: () => import('./accept-invite/accept-invite.component').then(m => m.AcceptInviteComponent) },
];
