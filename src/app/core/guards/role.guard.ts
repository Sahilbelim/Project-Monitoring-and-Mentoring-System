import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const requiredRoles: Role[] = route.data?.['roles'] ?? [];

  if (!requiredRoles.length) return true;

  const userRole = auth.userRole();
  if (userRole && requiredRoles.includes(userRole)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
