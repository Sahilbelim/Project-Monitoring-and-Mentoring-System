import { Component, signal, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService }  from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector:   'app-two-factor',
  standalone: true,
  imports:    [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div class="w-full max-w-sm animate-slide-up">
        <div class="card text-center">
          <div class="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-6 shadow-xl">
            <i class='bx bx-shield-quarter text-3xl'></i>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Two-Factor Authentication</h2>
          <p class="text-slate-400 text-sm mb-6">Enter the 6-digit code from your authenticator app.</p>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <input type="text" formControlName="code" class="input text-center text-2xl tracking-widest" placeholder="000000" maxlength="6">
            <button type="submit" class="btn-primary w-full py-2.5" [disabled]="loading()">
              @if (loading()) { <span class="animate-spin">⟳</span> Verifying... } @else { Verify }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class TwoFactorComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  form    = this.fb.group({ code: ['', [Validators.required, Validators.minLength(6)]] });
  private partialToken = (history.state as any)?.partialToken ?? '';

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.verify2FA(this.partialToken, this.form.value.code!).subscribe({
      next: () => { this.loading.set(false); this.toast.success('Verified! Welcome back.'); this.auth.redirectAfterLogin(); },
      error: () => { this.loading.set(false); this.toast.error('Invalid or expired code.'); },
    });
  }
}
