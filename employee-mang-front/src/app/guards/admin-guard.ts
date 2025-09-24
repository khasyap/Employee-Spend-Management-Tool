import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../core/services/auth';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = (route, state) => {
 const authService = inject(Auth);
  const router = inject(Router);

  if (authService.hasRole('admin')) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};