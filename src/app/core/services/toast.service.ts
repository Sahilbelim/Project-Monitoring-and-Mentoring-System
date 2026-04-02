import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:      string;
  type:    ToastType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(message: string, duration = 4000): void { this._add('success', message, duration); }
  error  (message: string, duration = 6000): void { this._add('error',   message, duration); }
  warning(message: string, duration = 5000): void { this._add('warning', message, duration); }
  info   (message: string, duration = 4000): void { this._add('info',    message, duration); }

  dismiss(id: string): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
  }

  private _add(type: ToastType, message: string, duration: number): void {
    const id = crypto.randomUUID();
    this.toasts.update(ts => [...ts, { id, type, message, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
