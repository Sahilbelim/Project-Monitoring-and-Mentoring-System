import { Component, signal, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../../core/services/auth.service';
import { ToastService }  from '../../../core/services/toast.service';

@Component({
  selector:   'app-login',
  standalone: true,
  imports:    [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex bg-slate-900">
      <!-- Left decorative panel -->
      <div class="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-900 relative overflow-hidden px-12">
        
        <!-- Animated Blobs -->
        <div class="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div class="absolute -bottom-20 -right-20 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px] animate-pulse" style="animation-delay: 2s"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]"></div>

        <div class="relative z-10 text-center max-w-lg">
          <!-- Logo Shield -->
          <div class="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-violet-600 
                      flex items-center justify-center text-white mx-auto mb-8 
                      shadow-[0_20px_50px_rgba(79,70,229,0.3)] ring-1 ring-white/20 relative group">
            <div class="absolute inset-0 bg-white/20 rounded-[2rem] scale-110 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <i class='bx bx-cube-alt text-5xl relative z-10'></i>
          </div>

          <h1 class="text-5xl font-black text-white mb-4 tracking-tighter">
            PMMS <span class="text-indigo-400">OS</span>
          </h1>
          <p class="text-slate-400 text-lg font-medium leading-relaxed mb-12">
            The next generation of <span class="text-white">Project Management</span> 
            designed for high-performance teams.
          </p>

          <div class="grid grid-cols-3 gap-4">
            @for (feature of features; track feature.label) {
              <div class="glass-card !p-5 text-center group hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-1 border border-white/5">
                <div class="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3 
                            text-2xl transition-transform duration-300 group-hover:scale-110" [class]="feature.color">
                  <i [class]="'bx ' + feature.bx"></i>
                </div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{{ feature.label }}</div>
              </div>
            }
          </div>
        </div>

        <!-- System Status Indicator -->
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">System Operational</span>
        </div>
      </div>

      <!-- Right login form -->
      <div class="flex-1 flex items-center justify-center px-6 py-12 bg-slate-900 lg:bg-transparent">
        <div class="w-full max-w-md animate-slide-up">
          <!-- Mobile logo -->
          <div class="lg:hidden text-center mb-10">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
              <i class='bx bx-cube-alt text-3xl'></i>
            </div>
            <h1 class="text-3xl font-black text-white tracking-tight">PMMS</h1>
            <p class="text-slate-500 text-sm">Sign in to your dashboard</p>
          </div>

          <div class="card relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-5">
              <i class='bx bx-lock-alt text-8xl text-white'></i>
            </div>

            <div class="relative z-10">
              <h2 class="text-2xl font-bold text-white mb-1">Welcome back</h2>
              <p class="text-slate-400 text-sm mb-8">Enter your credentials to continue</p>

              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
                <!-- Email -->
                <div class="space-y-1.5">
                  <label class="label">Work Email</label>
                  <div class="relative">
                    <i class='bx bx-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg'></i>
                    <input type="email" formControlName="email" class="input pl-11" placeholder="name@company.com"
                           [class.input-error]="showError('email')">
                  </div>
                  @if (showError('email')) {
                    <p class="form-error">⚠ Please enter a valid email</p>
                  }
                </div>

                <!-- Password -->
                <div class="space-y-1.5">
                  <label class="label">Security Password</label>
                  <div class="relative">
                    <i class='bx bx-lock-open-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg'></i>
                    <input [type]="showPwd() ? 'text' : 'password'" formControlName="password" class="input pl-11 pr-12" placeholder="••••••••"
                           [class.input-error]="showError('password')">
                    <button type="button" (click)="showPwd.update(v => !v)"
                            class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                      <i class='bx text-xl' [class]="showPwd() ? 'bx-hide' : 'bx-show'"></i>
                    </button>
                  </div>
                  @if (showError('password')) {
                    <p class="form-error">⚠ Password is required</p>
                  }
                </div>

                <!-- Row: Forgot password -->
                <div class="flex justify-end">
                  <a routerLink="/auth/forgot-password" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Forgot password?</a>
                </div>

                <!-- Submit -->
                <button type="submit" class="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-indigo-500/20" [disabled]="loading()">
                  @if (loading()) {
                    <div class="flex items-center justify-center gap-2">
                       <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                       Verifying...
                    </div>
                  } @else {
                    Authorize Access
                  }
                </button>
              </form>

              <div class="relative my-8">
                <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-800"></div></div>
                <div class="relative flex justify-center text-xs uppercase"><span class="bg-slate-900 lg:bg-[#1e293b] px-3 text-slate-500 font-bold tracking-widest">New here?</span></div>
              </div>

              <button routerLink="/auth/register" class="w-full py-3 rounded-xl border border-slate-700 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all">
                Create Platform Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  features = [
    { bx: 'bx-layer',               label: 'Projects',  color: 'text-blue-400' },
    { bx: 'bx-check-double',        label: 'Tasks',     color: 'text-emerald-400' },
    { bx: 'bx-bar-chart-alt-2',     label: 'Analytics', color: 'text-amber-400' },
    { bx: 'bx-message-square-dots', label: 'Chat',      color: 'text-indigo-400' },
    { bx: 'bx-box',                 label: 'Box',       color: 'text-violet-400' }, // Replaced window/building with Box as requested
    { bx: 'bx-target-lock',         label: 'Metrics',   color: 'text-rose-400' },
  ];


  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  loading  = signal(false);
  showPwd  = signal(false);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    this.auth.login(this.form.value as any).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res?.data?.partialToken) {
          this.router.navigate(['/auth/2fa-verify'], { state: { partialToken: res.data.partialToken } });
          return;
        }
        this.toast.success('Welcome back!');
        this.auth.redirectAfterLogin();
      },
      error: err => {
        this.loading.set(false);
        const status = err?.status;
        if (status === 401) this.toast.error('Invalid email or password');
        else if (status === 429) this.toast.error('Too many attempts. Please wait.');
        else this.toast.error('Login failed. Please try again.');
      },
    });
  }
}
