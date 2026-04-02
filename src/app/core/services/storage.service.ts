import { Injectable } from '@angular/core';

const TOKEN_KEY   = 'pmms_token';
const REFRESH_KEY = 'pmms_refresh';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getToken():   string | null { return localStorage.getItem(TOKEN_KEY);   }
  getRefresh(): string | null { return localStorage.getItem(REFRESH_KEY); }

  setToken(token: string):   void { localStorage.setItem(TOKEN_KEY,   token); }
  setRefresh(token: string): void { localStorage.setItem(REFRESH_KEY, token); }

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}
