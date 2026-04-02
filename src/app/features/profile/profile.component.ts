import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { AuthService }  from '../../core/services/auth.service';
import { HttpClient }   from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { environment }  from '../../../environments/environment';

@Component({
  selector:   'app-profile',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 via-slate-800/60 to-violet-900/30
                   border border-indigo-500/20 p-6 animate-slide-up">
        <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div class="relative flex items-center gap-4">
          <div class="relative group cursor-pointer" (click)="triggerFileInput()">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
                         flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-xl shadow-indigo-500/30 overflow-hidden">
               @if (user()?.avatar) {
                 <img [src]="user()?.avatar" alt="Avatar" class="w-full h-full object-cover">
               } @else {
                 {{ userInitial() }}
               }
            </div>
            <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <i class='bx bxs-check-circle text-white text-xs'></i>
            </div>
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-white">{{ user()?.name ?? 'My Profile' }}</h1>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="badge-indigo badge text-xs">{{ user()?.role }}</span>
              <span class="text-slate-400 text-xs flex items-center gap-1">
                <i class='bx bx-envelope text-sm'></i> {{ user()?.email }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

        <!-- Profile avatar card -->
        <div class="card flex flex-col items-center text-center gap-4 animate-slide-up delay-1">
          <div class="relative group cursor-pointer" (click)="triggerFileInput()">
            <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
                         flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-indigo-500/20 overflow-hidden">
               @if (user()?.avatar) {
                 <img [src]="user()?.avatar" alt="Avatar" class="w-full h-full object-cover">
               } @else {
                 {{ userInitial() }}
               }
               <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <i class='bx bx-camera text-xl'></i>
               </div>
            </div>
            
            <div class="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-800
                         flex items-center justify-center shadow-md">
              <i class='bx bxs-check-circle text-white text-sm'></i>
            </div>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">{{ user()?.name ?? 'User Name' }}</h2>
            <p class="text-sm text-slate-400">{{ user()?.role ?? 'MEMBER' }}</p>
          </div>

          <!-- Quick stats -->
          <div class="w-full border-t border-slate-700/60 pt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p class="text-lg font-bold text-white">{{ profileStats()?.tasksAssigned ?? '—' }}</p>
              <p class="text-xs text-slate-500">Tasks</p>
            </div>
            <div>
              <p class="text-lg font-bold text-emerald-400">{{ profileStats()?.tasksCompleted ?? '—' }}</p>
              <p class="text-xs text-slate-500">Done</p>
            </div>
            <div>
              <p class="text-lg font-bold text-white">{{ profileStats()?.projects ?? '—' }}</p>
              <p class="text-xs text-slate-500">Projects</p>
            </div>
          </div>
          
          <input type="file" id="avatar-upload" class="hidden" accept="image/png, image/jpeg, image/webp" (change)="onFileSelected($event)">
          <button (click)="triggerFileInput()" class="btn-secondary w-full btn-sm gap-2">
            <i class='bx bx-image-add'></i> 
            {{ avatarFile ? 'File Selected: ' + avatarFile.name : 'Upload Photo' }}
          </button>
        </div>

        <!-- Edit form -->
        <div class="md:col-span-2 card space-y-5 animate-slide-up delay-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <i class='bx bxs-edit text-indigo-400'></i>
            </div>
            <h3 class="font-bold text-white">Account Information</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="label">Full Name</label>
              <div class="relative">
                <i class='bx bx-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                <input class="input pl-9" [(ngModel)]="form.name" placeholder="Your full name">
              </div>
            </div>
            <div class="sm:col-span-2">
              <label class="label">Email <span class="text-slate-500 normal-case font-normal">(cannot change)</span></label>
              <div class="relative">
                <i class='bx bx-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
                <input class="input pl-9 opacity-50 cursor-not-allowed" [value]="user()?.email ?? ''" disabled>
              </div>
            </div>
            <div>
              <label class="label">Phone</label>
              <div class="relative">
                <i class='bx bx-phone absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                <input class="input pl-9" [(ngModel)]="form.phone" placeholder="+91 98765 43210">
              </div>
            </div>
            <div>
              <label class="label">Location</label>
              <div class="relative">
                <i class='bx bx-map-pin absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                <input class="input pl-9" [(ngModel)]="form.location" placeholder="City, Country">
              </div>
            </div>
          </div>

          <div class="divider !my-0"></div>

          <!-- Change Password section -->
          <div>
            <h4 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <i class='bx bx-lock text-indigo-400'></i> Change Password
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="label">Current Password</label>
                <div class="relative">
                  <i class='bx bx-lock-open absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                  <input [type]="showPwd ? 'text' : 'password'" [(ngModel)]="form.currentPassword"
                         class="input pl-9 pr-10" placeholder="Current password">
                  <button type="button" (click)="showPwd = !showPwd"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <i class='bx text-lg' [class]="showPwd ? 'bx-hide' : 'bx-show'"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="label">New Password</label>
                <input type="password" [(ngModel)]="form.newPassword" class="input" placeholder="New password">
              </div>
              <div>
                <label class="label">Confirm New</label>
                <input type="password" [(ngModel)]="form.confirmPassword" class="input" placeholder="Repeat new password">
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 pt-1">
            <button (click)="saveProfile()" class="btn-primary flex-1 gap-2" [disabled]="saving()">
              @if (saving()) { <i class='bx bx-loader-alt animate-spin'></i> Saving… }
              @else { <i class='bx bx-save'></i> Save Changes }
            </button>
            <button (click)="resetForm()" class="btn-secondary gap-2">
              <i class='bx bx-reset'></i> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private auth  = inject(AuthService);
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  saving  = signal(false);
  showPwd = false;
  user   = computed(() => this.auth.currentUser());
  userInitial = computed(() => (this.auth.currentUser()?.name ?? 'U').charAt(0).toUpperCase());
  profileStats = signal<{ tasksAssigned: number; tasksCompleted: number; projects: number } | null>(null);

  form = { name: '', phone: '', location: '', currentPassword: '', newPassword: '', confirmPassword: '' };
  avatarFile: File | null = null;

  ngOnInit() {
    this.resetForm();
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>(`${environment.apiUrl}/users/me/stats`).subscribe({
      next: res => this.profileStats.set(res.data?.stats),
    });
  }

  resetForm() {
    const u = this.auth.currentUser();
    this.form = { name: u?.name ?? '', phone: u?.phone ?? '', location: (u as any)?.location ?? '', currentPassword: '', newPassword: '', confirmPassword: '' };
    this.avatarFile = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.toast.error('Avatar image must be less than 5MB');
        return;
      }
      this.avatarFile = file;
    }
  }

  triggerFileInput() {
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    fileInput?.click();
  }

  saveProfile() {
    if (this.saving()) return;
    this.saving.set(true);

    // 1. Check if we need to upload an avatar first
    if (this.avatarFile) {
      const formData = new FormData();
      formData.append('file', this.avatarFile);
      formData.append('context', 'avatar');

      this.http.post<any>(`${environment.apiUrl}/upload`, formData).subscribe({
        next: (res) => {
          this.avatarFile = null;
          this.updateProfileData(res.data?.file?.url); // Wait for upload, then update profile info
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? 'Failed to upload avatar');
        }
      });
    } else {
      // No avatar change, just update profile directly
      this.updateProfileData();
    }
  }

  private updateProfileData(avatarUrl?: string) {
    const body: any = {};
    if (this.form.name) body.name = this.form.name;
    if (this.form.phone) body.phone = this.form.phone;
    if (this.form.location !== undefined) body.location = this.form.location;
    if (avatarUrl) body.avatar = avatarUrl;
    
    // We only call the PATCH API if there is actually data to send
    if (Object.keys(body).length > 0) {
      this.http.patch<any>(`${environment.apiUrl}/users/me`, body).subscribe({
        next: (res) => {
          this.auth.currentUser.set(res.data.user); // Immediately update global state
          this.toast.success('Profile updated successfully!');
          this.checkAndSavePassword(); // After profile succeeds, try password
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? 'Failed to update profile');
        }
      });
    } else {
      this.checkAndSavePassword();
    }
  }

  private checkAndSavePassword() {
    if (!this.form.currentPassword && !this.form.newPassword) {
      this.saving.set(false);
      return; // No password change requested
    }

    if (!this.form.currentPassword || !this.form.newPassword) {
      this.saving.set(false);
      this.toast.error('Both current and new passwords are required');
      return;
    }

    if (this.form.newPassword !== this.form.confirmPassword) {
      this.saving.set(false);
      this.toast.error('New passwords do not match');
      return;
    }

    this.http.patch(`${environment.apiUrl}/users/me/password`, {
      currentPassword: this.form.currentPassword,
      newPassword: this.form.newPassword
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Password changed successfully!');
        this.form.currentPassword = '';
        this.form.newPassword = '';
        this.form.confirmPassword = '';
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to change password');
      }
    });
  }
}

