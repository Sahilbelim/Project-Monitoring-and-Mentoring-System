import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { User, Role, LoginRequest, RegisterRequest, AuthTokens } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiUrl}/auth`;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole        = computed(() => this.currentUser()?.role ?? null);

  constructor(
    private http:    HttpClient,
    private router:  Router,
    private storage: StorageService,
  ) {}

  login(data: LoginRequest): Observable<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    return this.http.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(`${this.base}/login`, data).pipe(
      tap(res => {
        this.storage.setToken(res.data.tokens.accessToken);
        this.storage.setRefresh(res.data.tokens.refreshToken);
        this.currentUser.set(res.data.user);
      }),
    );
  }

  register(data: RegisterRequest): Observable<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    return this.http.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(`${this.base}/register`, data).pipe(
      tap(res => {
        this.storage.setToken(res.data.tokens.accessToken);
        this.storage.setRefresh(res.data.tokens.refreshToken);
        this.currentUser.set(res.data.user);
      }),
    );
  }

  refreshToken(): Observable<ApiResponse<{ tokens: AuthTokens }>> {
    const refreshToken = this.storage.getRefresh();
    return this.http.post<ApiResponse<{ tokens: AuthTokens }>>(`${this.base}/refresh`, { refreshToken }).pipe(
      tap(res => {
        this.storage.setToken(res.data.tokens.accessToken);
        this.storage.setRefresh(res.data.tokens.refreshToken);
      }),
    );
  }

  getMe(): Observable<ApiResponse<{ user: User }>> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.base}/me`).pipe(
      tap(res => this.currentUser.set(res.data.user)),
    );
  }

  logout(): void {
    this.http.post(`${this.base}/logout`, {}).subscribe({
      complete: () => this._clearAndRedirect(),
      error:    () => this._clearAndRedirect(),
    });
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.base}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.patch(`${this.base}/reset-password/${token}`, { password });
  }

  verify2FA(partialToken: string, code: string) {
    return this.http.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(`${this.base}/2fa/verify`, { partialToken, code }).pipe(
      tap(res => {
        this.storage.setToken(res.data.tokens.accessToken);
        this.storage.setRefresh(res.data.tokens.refreshToken);
        this.currentUser.set(res.data.user);
      }),
    );
  }

  acceptInvite(token: string, name: string, password: string) {
    return this.http.post(`${this.base}/accept-invite`, { token, name, password });
  }

  resendVerification() {
    return this.http.post(`${this.base}/resend-verification`, {});
  }

  getSessions() {
    return this.http.get<ApiResponse<{ sessions: unknown[] }>>(`${this.base}/sessions`);
  }

  revokeSession(sessionId: string) {
    return this.http.delete(`${this.base}/sessions/${sessionId}`);
  }

  setup2FA() {
    return this.http.post(`${this.base}/2fa/setup`, {});
  }

  enable2FA(partialToken: string, code: string) {
    return this.http.post(`${this.base}/2fa/enable`, { partialToken, code });
  }

  disable2FA(partialToken: string, code: string) {
    return this.http.post(`${this.base}/2fa/disable`, { partialToken, code });
  }

  listInvites() {
    return this.http.get(`${this.base}/invites`);
  }

  inviteUser(email: string, role: string) {
    return this.http.post<ApiResponse<{ invite: unknown }>>(`${this.base}/invites`, { email, role });
  }

  revokeInvite(inviteId: string) {
    return this.http.delete(`${this.base}/invites/${inviteId}`);
  }

  redirectAfterLogin(): void {
    const role = this.userRole();
    if (role === Role.SUPER_ADMIN) {
      this.router.navigate(['/super-admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private _clearAndRedirect(): void {
    this.storage.clearAuth();
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }
}
