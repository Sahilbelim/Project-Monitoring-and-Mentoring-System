import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'pmms_theme';

  readonly theme = signal<Theme>(this.getInitial());

  readonly isDark = () => this.theme() === 'dark';

  constructor() {
    // Apply theme class whenever it changes
    effect(() => {
      const t = this.theme();
      const root = document.documentElement;
      root.classList.toggle('dark', t === 'dark');
      root.classList.toggle('light', t === 'light');
      localStorage.setItem(this.STORAGE_KEY, t);
    });
  }

  toggle(): void {
    this.theme.set(this.isDark() ? 'light' : 'dark');
  }

  private getInitial(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    // Default to dark
    return 'dark';
  }
}
