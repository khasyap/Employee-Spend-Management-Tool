import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../core/services/auth';

export const employeeGuard: CanActivateFn = (route, state) => {
 const authService = inject(Auth);
  const router = inject(Router);

  if (authService.hasRole('employee')) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
