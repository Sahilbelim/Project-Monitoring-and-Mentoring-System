import { Component, signal, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService }  from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector:   'app-accept-invite',
  standalone: true,
  imports:    [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div class="w-full max-w-md animate-slide-up">
        <div class="card">
          <div class="text-3xl mb-4">🎉</div>
          <h2 class="text-2xl font-bold text-white mb-2">You've been invited!</h2>
          <p class="text-slate-400 text-sm mb-6">Create your account to get started.</p>
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="label">Full Name</label>
              <input type="text" formControlName="name" class="input" placeholder="Jane Smith">
            </div>
            <div>
              <label class="label">Password</label>
              <input type="password" formControlName="password" class="input" placeholder="Min 8 chars">
            </div>
            <button type="submit" class="btn-primary w-full py-2.5" [disabled]="form.invalid || loading()">
              @if (loading()) { <span class="animate-spin">⟳</span> Creating... } @else { Create Account }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AcceptInviteComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  form    = this.fb.group({
    name:     ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.loading.set(true);
    this.auth.acceptInvite(token, this.form.value.name!, this.form.value.password!).subscribe({
      next: () => { this.loading.set(false); this.toast.success('Account created! Please login.'); this.router.navigate(['/auth/login']); },
      error: (err) => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Invite invalid or expired.'); },
    });
  }
}
