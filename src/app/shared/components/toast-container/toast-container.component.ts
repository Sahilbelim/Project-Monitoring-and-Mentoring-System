import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

const ICONS: Record<string, string> = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

const COLORS: Record<string, string> = {
  success: 'border-emerald-500 bg-emerald-500/10',
  error:   'border-rose-500 bg-rose-500/10',
  warning: 'border-amber-500 bg-amber-500/10',
  info:    'border-indigo-500 bg-indigo-500/10',
};

@Component({
  selector:   'app-toast-container',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full" aria-live="polite">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-xl px-4 py-3 border-l-4 shadow-2xl backdrop-blur-xl text-sm font-medium text-white animate-slide-right"
          [class]="colors(toast.type)"
          role="alert">
          <span class="shrink-0 mt-0.5">{{ icon(toast.type) }}</span>
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastSvc.dismiss(toast.id)" class="text-slate-400 hover:text-white transition-colors ml-2 shrink-0">✕</button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(readonly toastSvc: ToastService) {}
  icon(type: string):   string { return ICONS[type]  ?? 'ℹ️'; }
  colors(type: string): string { return COLORS[type] ?? ''; }
}
