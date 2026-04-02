import { Component, signal, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../../core/services/auth.service';
import { ToastService }  from '../../../core/services/toast.service';

@Component({
  selector:   'app-reset-password',
  standalone: true,
  imports:    [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div class="w-full max-w-md animate-slide-up">
        <div class="card">
          <h2 class="text-2xl font-bold text-white mb-2">Set new password</h2>
          <p class="text-slate-400 text-sm mb-6">Enter your new password below.</p>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="label">New Password</label>
              <input type="password" formControlName="password" class="input" placeholder="Min 8 chars">
              @if (showError('password')) { <p class="form-error">⚠ Min 8 chars, uppercase, number, special char</p> }
            </div>
            <button type="submit" class="btn-primary w-full py-2.5" [disabled]="form.invalid || loading()">
              @if (loading()) { <span class="animate-spin">⟳</span> Saving... } @else { Update password }
            </button>
          </form>
          <a routerLink="/auth/login" class="block mt-4 text-center text-sm text-indigo-400 hover:text-indigo-300">← Back to login</a>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  form    = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)]],
  });

  showError(f: string): boolean { const c = this.form.get(f); return !!(c?.invalid && c.touched); }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    const token = window.location.pathname.split('/').pop() ?? '';
    this.auth.resetPassword(token, this.form.value.password!).subscribe({
      next: () => { this.loading.set(false); this.toast.success('Password updated! Please login.'); this.router.navigate(['/auth/login']); },
      error: () => { this.loading.set(false); this.toast.error('Reset link invalid or expired.'); },
    });
  }
}
