import { Component, signal, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink }   from '@angular/router';
import { AuthService }  from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector:   'app-forgot-password',
  standalone: true,
  imports:    [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div class="w-full max-w-md animate-slide-up">
        <div class="card text-center">
          @if (!sent()) {
            <div class="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 mx-auto mb-6 shadow-xl ring-1 ring-white/10">
              <i class='bx bx-key text-3xl'></i>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
            <p class="text-slate-400 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <input type="email" formControlName="email" class="input text-center" placeholder="you@company.com">
              <button type="submit" class="btn-primary w-full py-2.5" [disabled]="loading()">
                @if (loading()) { <span class="animate-spin">⟳</span> Sending... } @else { Send reset link }
              </button>
            </form>
          } @else {
            <div class="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-xl animate-bounce">
              <i class='bx bx-envelope text-3xl'></i>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p class="text-slate-400 text-sm">We've sent a password reset link to your email address.</p>
          }
          <a routerLink="/auth/login" class="block mt-6 text-sm text-indigo-400 hover:text-indigo-300">← Back to login</a>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  form    = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  sent    = signal(false);

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.forgotPassword(this.form.value.email!).subscribe({
      next:  () => { this.loading.set(false); this.sent.set(true); },
      error: () => { this.loading.set(false); this.sent.set(true); },
    });
  }
}
