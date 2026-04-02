import { Component, signal, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService }   from '../../../core/services/auth.service';
import { ToastService }  from '../../../core/services/toast.service';

type Step = 0 | 1 | 2;

@Component({
  selector:   'app-register',
  standalone: true,
  imports:    [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div class="w-full max-w-lg animate-slide-up">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white mx-auto mb-4 shadow-xl ring-1 ring-white/10">
            <i class='bx bx-cube-alt text-3xl'></i>
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight">Create your organization</h1>
          <p class="text-slate-400 text-sm mt-1">Get your team started in minutes</p>
        </div>

        <!-- Step progress -->
        <div class="flex items-center gap-2 mb-8">
          @for (s of [0,1,2]; track s) {
            <div class="flex-1 h-1.5 rounded-full transition-all duration-300"
                 [class]="step() > s || step() === s ? 'bg-indigo-500' : 'bg-slate-700'"></div>
          }
        </div>
        <div class="flex justify-between text-xs text-slate-400 mb-6 -mt-4">
          <span [class.text-indigo-400]="step() >= 0">Organization</span>
          <span [class.text-indigo-400]="step() >= 1">Admin Account</span>
          <span [class.text-indigo-400]="step() >= 2">Confirm</span>
        </div>

        <div class="card">
          <form [formGroup]="form" (ngSubmit)="onFinalSubmit()" class="space-y-5">
            <!-- Step 0: Org info -->
            @if (step() === 0) {
              <div class="animate-fade-in space-y-4">
                <h3 class="text-lg font-semibold text-white">Organization details</h3>
                <div>
                  <label class="label">Organization Name *</label>
                  <input type="text" formControlName="organizationName" class="input" placeholder="Acme Corp">
                  @if (showError('organizationName')) { <p class="form-error">⚠ Required (min 2 chars)</p> }
                </div>
                <div>
                  <label class="label">Industry</label>
                  <select formControlName="industry" class="input">
                    <option value="">Select industry</option>
                    @for (ind of industries; track ind) { <option [value]="ind">{{ ind }}</option> }
                  </select>
                </div>
                <div>
                  <label class="label">Company Size</label>
                  <select formControlName="size" class="input">
                    <option value="">Select size</option>
                    @for (s of sizes; track s) { <option [value]="s">{{ s }}</option> }
                  </select>
                </div>
                <button type="button" (click)="nextStep()" class="btn-primary w-full py-2.5">Continue →</button>
              </div>
            }

            <!-- Step 1: Admin account -->
            @if (step() === 1) {
              <div class="animate-fade-in space-y-4">
                <h3 class="text-lg font-semibold text-white">Admin account</h3>
                <div>
                  <label class="label">Full Name *</label>
                  <input type="text" formControlName="name" class="input" placeholder="Jane Smith">
                  @if (showError('name')) { <p class="form-error">⚠ Required</p> }
                </div>
                <div>
                  <label class="label">Work Email *</label>
                  <input type="email" formControlName="email" class="input" placeholder="jane@company.com">
                  @if (showError('email')) { <p class="form-error">⚠ Valid email required</p> }
                </div>
                <div>
                  <label class="label">Password *</label>
                  <input type="password" formControlName="password" class="input" placeholder="Min 8 chars">
                  <!-- Strength bar -->
                  <div class="mt-1.5 h-1 rounded-full bg-slate-700 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-300"
                         [style.width.%]="pwdStrength() * 25"
                         [class]="pwdStrengthColor()"></div>
                  </div>
                  <p class="text-xs text-slate-400 mt-1">{{ pwdStrengthLabel() }}</p>
                  @if (showError('password')) { <p class="form-error">⚠ Min 8 chars, uppercase, number, special char</p> }
                </div>
                <div class="flex gap-3">
                  <button type="button" (click)="step.set(0)" class="btn-secondary flex-1">← Back</button>
                  <button type="button" (click)="nextStep()" class="btn-primary flex-1">Continue →</button>
                </div>
              </div>
            }

            <!-- Step 2: Confirm -->
            @if (step() === 2) {
              <div class="animate-fade-in space-y-4">
                <h3 class="text-lg font-semibold text-white">Confirmation</h3>
                <div class="glass-card !p-4 space-y-2 text-sm">
                  <div class="flex justify-between"><span class="text-slate-400">Organization</span><span class="text-white font-medium">{{ form.value.organizationName }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-400">Admin</span><span class="text-white font-medium">{{ form.value.name }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-400">Email</span><span class="text-white font-medium">{{ form.value.email }}</span></div>
                </div>
                <label class="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" formControlName="terms" class="mt-0.5 rounded bg-slate-700 border-slate-600 text-indigo-500">
                  <span>I agree to the <a href="#" class="text-indigo-400 hover:underline">Terms of Service</a> and <a href="#" class="text-indigo-400 hover:underline">Privacy Policy</a></span>
                </label>
                <div class="flex gap-3">
                  <button type="button" (click)="step.set(1)" class="btn-secondary flex-1">← Back</button>
                  <button type="submit" class="btn-primary flex-1 py-2.5" [disabled]="!form.value.terms || loading()">
                    @if (loading()) { <span class="animate-spin">⟳</span> Creating... } @else { Create Account }
                  </button>
                </div>
              </div>
            }
          </form>
        </div>
        <p class="text-center text-sm text-slate-400 mt-4">Already have an account? <a routerLink="/auth/login" class="text-indigo-400 hover:text-indigo-300">Sign in</a></p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  step    = signal<Step>(0);
  loading = signal(false);

  industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Other'];
  sizes      = ['1-10', '11-50', '51-200', '201-500', '500+'];

  form = this.fb.group({
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    industry: [''],
    size:     [''],
    name:     ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)]],
    terms:    [false],
  });

  pwdStrength = (): number => {
    const p = this.form.value.password ?? '';
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[@$!%*?&]/.test(p)) score++;
    return score;
  };

  pwdStrengthColor = () => ['bg-rose-500','bg-amber-500','bg-amber-400','bg-emerald-400','bg-emerald-500'][this.pwdStrength()];
  pwdStrengthLabel = () => ['Weak','Fair','Good','Strong','Very Strong'][this.pwdStrength()];

  showError(f: string): boolean { const c = this.form.get(f); return !!(c?.invalid && c.touched); }

  nextStep(): void {
    if (this.step() === 0) {
      this.form.get('organizationName')?.markAsTouched();
      if (this.form.get('organizationName')?.invalid) return;
      this.step.set(1);
    } else if (this.step() === 1) {
      ['name','email','password'].forEach(f => this.form.get(f)?.markAsTouched());
      if (['name','email','password'].some(f => this.form.get(f)?.invalid)) return;
      this.step.set(2);
    }
  }

  onFinalSubmit(): void {
    if (!this.form.value.terms) return;
    this.loading.set(true);
    const { terms, size, ...rest } = this.form.value as any;
    this.auth.register({ ...rest, size: size || undefined }).subscribe({
      next: () => { this.loading.set(false); this.toast.success('Organization created! Welcome! 🎉'); this.auth.redirectAfterLogin(); },
      error: err => { this.loading.set(false); this.toast.error(err?.error?.message ?? 'Registration failed'); },
    });
  }
}
