import { Component, OnInit, signal, inject, computed, AfterViewInit } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { AuthService }   from '../../core/services/auth.service';
import { environment }   from '../../../environments/environment';
import { ToastService }  from '../../core/services/toast.service';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN:  'badge-rose', ORG_ADMIN: 'badge-violet', MANAGER: 'badge-indigo',
  HR: 'badge-amber', TEAM_LEADER: 'badge-cyan', MEMBER: 'badge-slate',
};

@Component({
  selector:   'app-users',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- Header -->
      <div class="relative overflow-hidden rounded-2xl border p-6 animate-slide-up hero-gradient-rose">
        <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl pointer-events-none"></div>
        <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <i class='bx bxs-user-detail text-2xl text-rose-400'></i>
              </div>
              <h1 class="text-2xl font-black text-white">User Management</h1>
            </div>
            <p class="text-slate-400 text-sm">{{ users().length }} members in your organisation</p>
          </div>
          <button (click)="openModal()" class="btn-primary self-start gap-2">
            <i class='bx bx-user-plus text-lg'></i> Add Member
          </button>
        </div>
      </div>

      <!-- Search / Filter bar -->
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <i class='bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg'></i>
          <input type="text" placeholder="Search by name or email…" class="input pl-10"
                 (input)="search($event)">
        </div>
        <select class="input sm:w-48" (change)="filterRole($event)">
          <option value="">All roles</option>
          @for (r of roles; track r) { <option [value]="r">{{ r }}</option> }
        </select>
      </div>

      <!-- Add Member Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div class="card w-full max-w-md animate-slide-up space-y-4 relative overflow-hidden">
            <!-- Top accent -->
            <div class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-violet-500"></div>

            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <i class='bx bx-user-plus text-xl text-rose-400'></i>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Add Team Member</h3>
                <p class="text-xs text-slate-400">They can log in with these credentials.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="sm:col-span-2">
                <label class="label">Full Name *</label>
                <div class="relative">
                  <i class='bx bx-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                  <input type="text" [(ngModel)]="form.name" class="input pl-9" placeholder="Jane Smith">
                </div>
              </div>
              <div class="sm:col-span-2">
                <label class="label">Email *</label>
                <div class="relative">
                  <i class='bx bx-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                  <input type="email" [(ngModel)]="form.email" class="input pl-9" placeholder="jane@company.com">
                </div>
              </div>
              <div>
                <label class="label">Password *</label>
                <div class="relative">
                  <i class='bx bx-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                  <input [type]="showPwd ? 'text' : 'password'" [(ngModel)]="form.password" class="input pl-9 pr-10" placeholder="Min 8 chars">
                  <button type="button" (click)="showPwd = !showPwd"
                          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    <i class='bx text-lg' [class]="showPwd ? 'bx-hide' : 'bx-show'"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="label">Role</label>
                <div class="relative">
                  <i class='bx bx-shield absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'></i>
                  <select [(ngModel)]="form.role" class="input pl-9">
                    @for (r of roles; track r) { <option [value]="r">{{ r }}</option> }
                  </select>
                </div>
              </div>
            </div>

            <div class="flex gap-3 pt-1">
              <button (click)="closeModal()" class="btn-secondary flex-1">Cancel</button>
              <button (click)="addMember()" class="btn-primary flex-1 gap-2"
                      [disabled]="!form.name || !form.email || !form.password || saving()">
                @if (saving()) { <i class='bx bx-loader-alt animate-spin'></i> Creating… }
                @else { <i class='bx bx-user-plus'></i> Create Account }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Loading skeletons -->
      @if (loading()) {
        <div class="card !p-0 overflow-hidden">
          <div class="bg-slate-700/30 h-12 px-4 flex items-center gap-4">
            @for (i of [1,2,3,4]; track i) { <div class="skeleton h-4 rounded-md" [style.width]="(6 + i*2) + 'rem'"></div> }
          </div>
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="flex items-center gap-4 px-4 py-3 border-b border-slate-700/40 last:border-0">
              <div class="skeleton-circle w-9 h-9 skeleton shrink-0"></div>
              <div class="flex-1 space-y-1.5">
                <div class="skeleton h-4 rounded-md w-40"></div>
                <div class="skeleton h-3 rounded-md w-56"></div>
              </div>
              <div class="skeleton h-5 w-20 rounded-full hidden md:block"></div>
              <div class="skeleton h-5 w-16 rounded-full hidden lg:block"></div>
              <div class="skeleton h-7 w-24 rounded-xl"></div>
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="card text-center py-16 animate-scale-in">
          <div class="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
            <i class='bx bxs-user-x text-4xl text-rose-400/60'></i>
          </div>
          <p class="text-white font-semibold mb-1">No users found</p>
          <p class="text-slate-400 text-sm">Add your first team member to get started.</p>
          <button (click)="openModal()" class="btn-primary mt-4 gap-2">
            <i class='bx bx-user-plus'></i> Add Member
          </button>
        </div>
      } @else {
        <!-- Desktop table -->
        <div class="card !p-0 overflow-hidden animate-slide-up hidden sm:block">
          <table class="w-full text-sm">
            <thead class="bg-slate-700/40 border-b border-slate-700/60">
              <tr>
                <th class="text-left py-3 px-4 text-slate-400 font-semibold">Member</th>
                <th class="text-left py-3 px-4 text-slate-400 font-semibold hidden md:table-cell">Role</th>
                <th class="text-left py-3 px-4 text-slate-400 font-semibold hidden lg:table-cell">Status</th>
                <th class="text-left py-3 px-4 text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/30">
              @for (user of filtered(); track user._id; let i = $index) {
                <tr class="hover:bg-white/5 transition-colors"
                    [style.animation-delay]="(i * 30) + 'ms'" [class]="'animate-fade-in'">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                                   flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md">
                        {{ user.name?.charAt(0) ?? '?' }}
                      </div>
                      <div>
                        <p class="font-semibold text-white">{{ user.name }}</p>
                        <p class="text-xs text-slate-400 flex items-center gap-1">
                          <i class='bx bx-envelope text-xs'></i> {{ user.email }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 hidden md:table-cell">
                    <span class="badge text-xs" [class]="roleColor(user.role)">{{ user.role }}</span>
                  </td>
                  <td class="py-3 px-4 hidden lg:table-cell">
                    <span class="badge text-xs flex items-center gap-1 w-fit" [class]="user.isActive ? 'badge-emerald' : 'badge-slate'">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="user.isActive ? 'bg-emerald-400' : 'bg-slate-500'"></span>
                      {{ user.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <button (click)="deactivate(user)"
                            class="btn-ghost btn-sm gap-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            [disabled]="!user.isActive">
                      <i class='bx bx-block text-sm'></i>
                      <span class="hidden md:inline">Deactivate</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile card list -->
        <div class="sm:hidden space-y-3 animate-slide-up">
          @for (user of filtered(); track user._id) {
            <div class="card !p-4 flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                           flex items-center justify-center text-sm font-bold text-white shrink-0">
                {{ user.name?.charAt(0) ?? '?' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-white">{{ user.name }}</p>
                <p class="text-xs text-slate-400 truncate">{{ user.email }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="badge text-[10px]" [class]="roleColor(user.role)">{{ user.role }}</span>
                  <span class="badge text-[10px]" [class]="user.isActive ? 'badge-emerald' : 'badge-slate'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>
              <button (click)="deactivate(user)" [disabled]="!user.isActive"
                      class="btn-icon text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 shrink-0">
                <i class='bx bx-block text-lg'></i>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  loading   = signal(true);
  saving    = signal(false);
  showModal = signal(false);
  users     = signal<any[]>([]);
  filtered  = signal<any[]>([]);

  roles    = ['MEMBER', 'TEAM_LEADER', 'MANAGER', 'HR', 'ORG_ADMIN'];
  showPwd  = false;
  form     = { name: '', email: '', password: '', role: 'MEMBER' };

  private _search = '';
  private _role   = '';

  constructor(private http: HttpClient, private toast: ToastService) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/users`).subscribe({
      next: res => { this.users.set(res.data ?? []); this.apply(); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openModal():  void { this.form = { name: '', email: '', password: '', role: 'MEMBER' }; this.showPwd = false; this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); }
  search(e: Event):     void { this._search = (e.target as HTMLInputElement).value.toLowerCase(); this.apply(); }
  filterRole(e: Event): void { this._role   = (e.target as HTMLSelectElement).value; this.apply(); }

  apply(): void {
    this.filtered.set(this.users().filter(u =>
      (!this._search || u.name?.toLowerCase().includes(this._search) || u.email?.toLowerCase().includes(this._search)) &&
      (!this._role   || u.role === this._role)
    ));
  }

  addMember(): void {
    if (!this.form.name || !this.form.email || !this.form.password) return;
    this.saving.set(true);
    this.http.post<any>(`${environment.apiUrl}/users`, {
      name: this.form.name.trim(), email: this.form.email.trim(),
      password: this.form.password, role: this.form.role,
    }).subscribe({
      next: res => {
        this.saving.set(false);
        const newUser = res.data?.user ?? res.data ?? res;
        this.users.update(us => [newUser, ...us]);
        this.apply(); this.closeModal();
        this.toast.success(`${this.form.name} added!`);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to create member'); },
    });
  }

  deactivate(user: any): void {
    this.http.patch(`${environment.apiUrl}/users/${user._id}/deactivate`, {}).subscribe({
      next: () => {
        this.toast.success(`${user.name} deactivated.`);
        this.users.update(us => us.map(u => u._id === user._id ? { ...u, isActive: false } : u));
        this.apply();
      },
      error: err => this.toast.error(err?.error?.message ?? 'Failed to deactivate'),
    });
  }

  roleColor(role: string): string { return ROLE_COLORS[role] ?? 'badge-slate'; }
}
