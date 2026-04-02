import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { HttpClient }   from '@angular/common/http';
import { environment }  from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { forkJoin, finalize } from 'rxjs';

interface OrgStats {
  members:     { active: number; limit: number };
  departments: number;
  teams:       number;
  projects:    number;
  tasks:       number;
  plan:        string;
}

interface OrgMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  departmentId?: { name: string };
}

@Component({
  selector:   'app-org-settings',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  styles: [`
    .tab-btn { @apply flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200; }
    .active-tab { @apply border-indigo-500 text-white bg-indigo-500/5; }
    .inactive-tab { @apply border-transparent text-slate-400 hover:text-white hover:bg-white/5; }
    .stat-card { @apply p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 flex flex-col items-center text-center; }
  `],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      
      <!-- Premium Header -->
      <div class="relative overflow-hidden rounded-2xl border p-8 hero-gradient-indigo">
        <div class="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div class="relative flex items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg">
              <i class='bx bxs-city text-3xl text-indigo-400'></i>
            </div>
            <div>
              <h1 class="text-3xl font-black text-white tracking-tight">{{ orgName() || 'Organization Settings' }}</h1>
              <p class="text-slate-400 flex items-center gap-1.5 mt-1">
                <span class="badge badge-indigo text-[10px] py-0.5">{{ stats()?.plan?.toUpperCase() || 'FREE' }} PLAN</span>
                <span class="text-slate-600">•</span>
                <span>Config and controls for your workspace</span>
              </p>
            </div>
          </div>
          <button (click)="loadAll()" class="btn-ghost btn-sm">
            <i class='bx bx-refresh text-lg'></i>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex flex-wrap border-b border-slate-800">
        @for (t of tabs; track t.key) {
          <button (click)="activeTab.set(t.key)" 
                  class="tab-btn" [class]="activeTab() === t.key ? 'active-tab' : 'inactive-tab'">
            <i class='bx' [class]="t.icon"></i>
            {{ t.label }}
          </button>
        }
      </div>

      <!-- ─── Tab: Overview ────────────────────────────────────────── -->
      @if (activeTab() === 'overview') {
        <div class="space-y-6 animate-fade-in">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="stat-card">
              <span class="text-2xl font-black text-white">{{ stats()?.members?.active || 0 }}</span>
              <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Active Members</span>
            </div>
            <div class="stat-card">
              <span class="text-2xl font-black text-white">{{ stats()?.projects || 0 }}</span>
              <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Projects</span>
            </div>
            <div class="stat-card">
              <span class="text-2xl font-black text-white">{{ stats()?.teams || 0 }}</span>
              <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Teams</span>
            </div>
            <div class="stat-card">
              <span class="text-2xl font-black text-white">{{ stats()?.tasks || 0 }}</span>
              <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Total Tasks</span>
            </div>
          </div>

          <div class="card p-6 bg-indigo-500/5 border-indigo-500/20">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-white flex items-center gap-2">
                <i class='bx bxs-info-circle text-indigo-400'></i> Plan Details
              </h3>
              <span class="text-2xl font-black text-indigo-400">{{ stats()?.plan?.toUpperCase() }}</span>
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Seat Usage</span>
                <span class="text-white font-medium">{{ stats()?.members?.active }}/{{ stats()?.members?.limit }}</span>
              </div>
              <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 transition-all duration-700" 
                     [style.width.%]="(stats()?.members?.active! / stats()?.members?.limit!) * 100"></div>
              </div>
              <p class="text-xs text-slate-500">Upgrade to Pro to increase member limits and unlock advanced features.</p>
            </div>
          </div>
        </div>
      }

      <!-- ─── Tab: General ─────────────────────────────────────────── -->
      @if (activeTab() === 'general') {
        <div class="space-y-6 animate-fade-in">
          <div class="card space-y-6">
            <h3 class="font-bold text-white flex items-center gap-2 mb-2">
              <i class='bx bx-edit-alt text-indigo-400'></i> Basic Information
            </h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div class="sm:col-span-2">
                <label class="label text-slate-300">Organization Name</label>
                <div class="relative">
                  <i class='bx bx-building absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
                  <input type="text" class="input pl-10" [(ngModel)]="orgName" placeholder="Enter org name">
                </div>
              </div>
              
              <div>
                <label class="label text-slate-300">Industry</label>
                <select class="input" [(ngModel)]="industry">
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label class="label text-slate-300">Organization Size</label>
                <select class="input" [(ngModel)]="orgSize">
                  <option value="1-10">1-10 members</option>
                  <option value="11-50">11-50 members</option>
                  <option value="51-200">51-200 members</option>
                  <option value="201-500">201-500 members</option>
                  <option value="500+">500+ members</option>
                </select>
              </div>

              <div>
                <label class="label text-slate-300">Timezone</label>
                <select class="input" [(ngModel)]="timezone">
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time (US)</option>
                  <option value="PST">Pacific Time (US)</option>
                  <option value="GMT">Greenwich Mean Time</option>
                  <option value="IST">India Standard Time</option>
                </select>
              </div>

              <div>
                <label class="label text-slate-300">Date Format</label>
                <select class="input" [(ngModel)]="dateFormat">
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-700/50">
              <button (click)="saveGeneral()" class="btn-primary w-full sm:w-auto px-10 gap-2" [disabled]="saving()">
                @if (saving()) { <i class='bx bx-loader-alt animate-spin'></i> Saving… }
                @else { <i class='bx bx-save'></i> Save Profile }
              </button>
            </div>
          </div>

          <!-- Feature Toggles -->
          <div class="card p-0 overflow-hidden">
            <div class="p-5 border-b border-slate-700/50 bg-slate-800/20">
              <h3 class="font-bold text-white">Feature Management</h3>
              <p class="text-xs text-slate-500 mt-1">Enable or disable core modules for your entire organization</p>
            </div>
            <div class="divide-y divide-slate-700/30">
              @for (feat of featureList(); track feat.key) {
                <div class="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-xl"
                         [class]="feat.color">
                      <i class='bx' [class]="feat.icon"></i>
                    </div>
                    <div>
                      <p class="text-sm font-bold text-white">{{ feat.label }}</p>
                      <p class="text-xs text-slate-500">{{ feat.desc }}</p>
                    </div>
                  </div>
                  <button (click)="toggleFeature(feat.key)" 
                          class="w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner"
                          [class]="features()[feat.key] ? 'bg-indigo-600' : 'bg-slate-700'">
                    <div class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow"
                         [class]="features()[feat.key] ? 'left-7' : 'left-1'"></div>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ─── Tab: Members ────────────────────────────────────────── -->
      @if (activeTab() === 'members') {
        <div class="space-y-4 animate-fade-in">
          <div class="flex items-center justify-between gap-4">
            <div class="relative flex-1">
              <i class='bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
              <input type="text" class="input pl-10" placeholder="Search members by name or email..."
                     [ngModel]="memberSearch()" (ngModelChange)="onSearchMembers($event)">
            </div>
          </div>

          <div class="card p-0 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead class="bg-slate-800/40 border-b border-slate-700/50">
                  <tr class="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                    <th class="px-5 py-3">Member</th>
                    <th class="px-5 py-3">Department</th>
                    <th class="px-5 py-3">Role</th>
                    <th class="px-5 py-3">Status</th>
                    <th class="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/20">
                  @if (membersLoading()) {
                    @for (s of [1,2,3,4,5]; track s) {
                      <tr><td colspan="5" class="px-5 py-4"><div class="skeleton h-6 rounded w-full"></div></td></tr>
                    }
                  } @else {
                    @for (m of members(); track m._id) {
                      <tr class="hover:bg-indigo-500/5 transition-colors group">
                        <td class="px-5 py-4">
                          <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-indigo-500/20 border border-slate-700 flex items-center justify-center font-bold text-slate-300 overflow-hidden">
                              @if (m.avatar) { <img [src]="m.avatar" class="w-full h-full object-cover"> }
                              @else { {{ (m.name[0] || 'U').toUpperCase() }} }
                            </div>
                            <div>
                              <p class="text-sm font-semibold text-white">{{ m.name }}</p>
                              <p class="text-xs text-slate-500">{{ m.email }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="px-5 py-4 text-xs text-slate-400">
                          {{ m.departmentId?.name || 'Unassigned' }}
                        </td>
                        <td class="px-5 py-4">
                          <select class="bg-transparent border border-slate-700/50 rounded-lg text-xs p-1 px-2 text-slate-300 outline-none hover:border-indigo-500 focus:bg-slate-800 transition-all"
                                  [ngModel]="m.role" (ngModelChange)="updateRole(m._id, $event)">
                            <option value="MEMBER">Member</option>
                            <option value="TEAM_LEADER">TL</option>
                            <option value="MANAGER">Manager</option>
                            <option value="HR">HR</option>
                            <option value="ORG_ADMIN">Admin</option>
                          </select>
                        </td>
                        <td class="px-5 py-4">
                          <span class="badge" [class]="m.isActive ? 'badge-emerald' : 'badge-slate'">
                            {{ m.isActive ? 'Active' : 'Deactivated' }}
                          </span>
                        </td>
                        <td class="px-5 py-4 text-right">
                          <button (click)="toggleMemberActivation(m)"
                                  class="p-2 rounded-lg transition-all"
                                  [class]="m.isActive ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'"
                                  [title]="m.isActive ? 'Deactivate' : 'Reactivate'">
                            <i class='bx' [class]="m.isActive ? 'bx-user-x' : 'bx-user-check'"></i>
                          </button>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 bg-slate-800/20 border-t border-slate-700/50 flex items-center justify-between">
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Showing {{ members().length }} members
              </p>
              <div class="flex gap-2">
                <button (click)="prevPage()" [disabled]="page() === 1" class="btn-ghost btn-xs">Prev</button>
                <span class="text-xs text-white bg-slate-700 px-2 py-1 rounded">Page {{ page() }}</span>
                <button (click)="nextPage()" class="btn-ghost btn-xs">Next</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ─── Tab: Danger Zone ────────────────────────────────────── -->
      @if (activeTab() === 'danger') {
        <div class="space-y-6 animate-fade-in">
          <div class="card border-rose-500/30 bg-rose-500/[0.03]">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500 text-2xl">
                <i class='bx bxs-error-alt'></i>
              </div>
              <div>
                <h3 class="font-black text-rose-500 text-lg uppercase tracking-tight">Danger Zone</h3>
                <p class="text-slate-500 text-xs">High impact actions that require caution</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all">
                <div class="flex items-start gap-4 mb-4">
                  <div class="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-xl shrink-0">
                    <i class='bx bx-transfer'></i>
                  </div>
                  <div>
                    <h4 class="font-bold text-white">Transfer Ownership</h4>
                    <p class="text-xs text-slate-400 mt-1">
                      Giving ownership to another user will revoke your administrative privileges. 
                      This process is immediate and irreversible.
                    </p>
                  </div>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <div class="relative flex-1">
                    <i class='bx bx-id-card absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
                    <input type="text" class="input pl-10 border-rose-500/30 focus:border-rose-500"
                           [(ngModel)]="newOwnerId" placeholder="User ID of the new owner">
                  </div>
                  <button (click)="transferOwnership()" [disabled]="!newOwnerId"
                          class="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-30">
                    Transfer Now
                  </button>
                </div>
              </div>

              <div class="p-6 rounded-2xl border border-rose-500/10 italic text-center">
                <p class="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  Additional danger zone controls are being migrated
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class OrgSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  // Stats
  stats = signal<OrgStats | null>(null);
  
  // General Info
  orgName        = signal('');
  industry       = signal('');
  orgSize        = signal('1-10');
  timezone       = signal('UTC');
  dateFormat     = signal('YYYY-MM-DD');
  
  // Features (reactive object)
  features = signal<Record<string, boolean>>({
    chat: true,
    notifications: true,
    mentoring: true,
    analytics: true
  });

  // Members
  members        = signal<OrgMember[]>([]);
  membersLoading = signal(false);
  memberSearch   = signal('');
  page           = signal(1);
  
  // State
  activeTab = signal('overview'); 
  saving    = signal(false);
  newOwnerId = '';

  tabs = [
    { key: 'overview', label: 'Overview',    icon: 'bx-grid-alt' },
    { key: 'general',  label: 'Configuration',icon: 'bxs-cog' },
    { key: 'members',  label: 'Members',     icon: 'bxs-user-detail' },
    { key: 'danger',   label: 'Danger Zone',  icon: 'bxs-error' },
  ];

  featureList = signal([
    { key: 'chat',     label: 'Real-time Chat',     desc: 'Messenger & group channels', icon: 'bx-chat',     color: 'text-emerald-400' },
    { key: 'notifs',   label: 'In-app Notifs',      desc: 'System & task notifications', icon: 'bx-bell',     color: 'text-amber-400' },
    { key: 'mentoring',label: 'Performance Review',  desc: 'Feedback & mentoring flow',   icon: 'bx-medal',    color: 'text-pink-400' },
    { key: 'analytics',label: 'Data Insights',       desc: 'Deep org-wide analytics',    icon: 'bx-bar-chart',color: 'text-orange-400' },
  ]);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll() {
    this.loadOrg();
    this.loadStats();
    this.loadMembers();
  }

  loadOrg() {
    this.http.get<any>(`${environment.apiUrl}/organizations`).subscribe({
      next: res => {
        const org = res.data?.org || {};
        this.orgName.set(org.name || '');
        this.industry.set(org.industry || 'Technology');
        this.orgSize.set(org.size || '1-10');
        this.timezone.set(org.settings?.timezone || 'UTC');
        this.dateFormat.set(org.settings?.dateFormat || 'YYYY-MM-DD');
        
        if (org.features) {
          this.features.set({ ...this.features(), ...org.features });
        }
      }
    });
  }

  loadStats() {
    this.http.get<any>(`${environment.apiUrl}/organizations/stats`).subscribe({
      next: res => this.stats.set(res.data?.stats)
    });
  }

  loadMembers() {
    this.membersLoading.set(true);
    const params = {
      page: this.page(),
      limit: 10,
      search: this.memberSearch()
    };
    this.http.get<any>(`${environment.apiUrl}/organizations/members`, { params })
      .pipe(finalize(() => this.membersLoading.set(false)))
      .subscribe({
        next: res => this.members.set(res.data || [])
      });
  }

  onSearchMembers(val: string) {
    this.memberSearch.set(val);
    this.page.set(1);
    this.loadMembers();
  }

  nextPage() { this.page.update(p => p + 1); this.loadMembers(); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.loadMembers(); } }

  saveGeneral() {
    this.saving.set(true);
    const body = {
      name: this.orgName(),
      industry: this.industry(),
      size: this.orgSize(),
      settings: {
        timezone: this.timezone(),
        dateFormat: this.dateFormat()
      }
    };
    this.http.patch(`${environment.apiUrl}/organizations`, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Settings updated!');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Failed to update settings');
      }
    });
  }

  toggleFeature(key: string) {
    // Optimistic UI
    const newVal = !this.features()[key];
    this.features.set({ ...this.features(), [key]: newVal });

    this.http.patch(`${environment.apiUrl}/organizations`, {
      features: { [key]: newVal }
    }).subscribe({
      error: () => {
        this.toast.error('Failed to toggle feature');
        // Rollback
        this.features.set({ ...this.features(), [key]: !newVal });
      }
    });
  }

  updateRole(userId: string, role: string) {
    this.http.patch(`${environment.apiUrl}/organizations/members/${userId}/role`, { role }).subscribe({
      next: () => {
        this.toast.success('Role updated');
        this.loadMembers(); // Refresh to ensure data consistency
      },
      error: err => this.toast.error(err?.error?.message || 'Failed to update role')
    });
  }

  toggleMemberActivation(member: OrgMember) {
    const action = member.isActive ? 'deactivate' : 'reactivate';
    this.http.patch(`${environment.apiUrl}/organizations/members/${member._id}/${action}`, {}).subscribe({
      next: () => {
        this.toast.success(`User ${action}d`);
        this.loadMembers();
      },
      error: err => this.toast.error(err?.error?.message || `Failed to ${action} user`)
    });
  }

  transferOwnership() {
    if (!confirm('Are you absolutely sure? You will lose ownership of this organization.')) return;
    
    this.http.post(`${environment.apiUrl}/organizations/transfer-ownership`, { newOwnerId: this.newOwnerId }).subscribe({
      next: () => this.toast.success('Ownership transferred!'),
      error: err => this.toast.error(err?.error?.message || 'Transfer failed')
    });
  }
}
