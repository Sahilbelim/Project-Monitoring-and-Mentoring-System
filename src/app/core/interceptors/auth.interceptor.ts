import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';
import { AuthService }    from '../services/auth.service';
import { Router }         from '@angular/router';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const storage = inject(StorageService);
  const auth    = inject(AuthService);
  const router  = inject(Router);

  const token = storage.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/refresh')) {
        return handle401(req, next, storage, auth, router);
      }
      return throwError(() => err);
    }),
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  storage: StorageService,
  auth: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshSubject.pipe(
      filter((t): t is string => !!t),
      take(1),
      switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))),
    );
  }

  isRefreshing = true;
  refreshSubject.next(null);

  return auth.refreshToken().pipe(
    switchMap(res => {
      isRefreshing = false;
      const newToken = res.data.tokens.accessToken;
      refreshSubject.next(newToken);
      return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
    }),
    catchError(err => {
      isRefreshing = false;
      storage.clearAuth();
      auth.currentUser.set(null);
      router.navigate(['/auth/login']);
      return throwError(() => err) as Observable<HttpEvent<unknown>>;
    }),
  );
}
