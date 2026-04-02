import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { RouterLink }     from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { environment }    from '../../../../environments/environment';
import { ToastService }   from '../../../core/services/toast.service';
import { AuthService }    from '../../../core/services/auth.service';
import { Role }           from '../../../core/models/user.model';

interface Member { _id: string; name: string; email: string; avatar?: string; role?: string; }
interface Team   { _id: string; name: string; description?: string; leadId?: Member; memberIds?: string[]; color?: string; isActive?: boolean; }
interface Department {
  _id: string; name: string; description?: string; color?: string; budget?: number;
  headId?: Member | null; memberIds?: Member[]; isActive?: boolean;
  memberCount?: number;
}

const API = environment.apiUrl;

@Component({
  selector:   'app-departments-list',
  standalone: true,
  imports:    [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6 max-w-6xl mx-auto">

      <!-- ── Header ─────────────────────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-2">
            <i class='bx bx-building-house text-indigo-400'></i> Departments
          </h1>
          <p class="text-slate-400 text-sm mt-0.5">
            {{ departments().length }} department{{ departments().length !== 1 ? 's' : '' }} in your organisation
          </p>
        </div>
        @if (canManage()) {
          <button (click)="openCreate()" class="btn-primary self-start">
            <i class='bx bx-plus text-lg'></i> New Department
          </button>
        }
      </div>

      <!-- ── Create / Edit Modal ────────────────────────────────────── -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
             (click)="closeModal($event)">
          <div class="card w-full max-w-lg animate-slide-up space-y-4" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 mb-1">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                   [style.background]="form.color + '30'">
                <i class='bx bx-building-house text-xl' [style.color]="form.color"></i>
              </div>
              <h3 class="text-lg font-semibold text-white">{{ editing() ? 'Edit' : 'Create' }} Department</h3>
            </div>

            <!-- Name -->
            <div>
              <label class="label">Name *</label>
              <input type="text" [(ngModel)]="form.name" class="input" placeholder="e.g. Engineering">
            </div>

            <!-- Description -->
            <div>
              <label class="label">Description</label>
              <textarea [(ngModel)]="form.description" class="input min-h-[80px]"
                        placeholder="What does this department do?"></textarea>
            </div>

            <!-- Color -->
            <div>
              <label class="label">Colour</label>
              <div class="flex items-center gap-3">
                <input type="color" [(ngModel)]="form.color" class="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0">
                <div class="flex gap-2 flex-wrap">
                  @for (c of presetColors; track c) {
                    <button (click)="form.color = c" class="w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-slate-800 transition-all hover:scale-110"
                            [style.background]="c" [class]="form.color === c ? 'ring-white' : 'ring-transparent'"></button>
                  }
                </div>
              </div>
            </div>

            <!-- Department Head (only when editing) -->
            @if (editing() && orgUsers().length) {
              <div>
                <label class="label">Department Head</label>
                <select [(ngModel)]="form.headId" class="input">
                  <option value="">— None —</option>
                  @for (u of orgUsers(); track u._id) {
                    <option [value]="u._id">{{ u.name }} ({{ u.email }})</option>
                  }
                </select>
              </div>
            }

            <!-- Budget -->
            <div>
              <label class="label">Budget (optional)</label>
              <input type="number" [(ngModel)]="form.budget" class="input" placeholder="0" min="0">
            </div>

            <div class="flex gap-3 pt-1">
              <button (click)="showModal.set(false)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="save()" class="btn-primary flex-1" [disabled]="!form.name.trim() || saving()">
                @if (saving()) { <span class="animate-spin inline-block">⟳</span> }
                @else { {{ editing() ? 'Save Changes' : 'Create' }} }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Manage Members Modal ────────────────────────────────────── -->
      @if (manageDept()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
             (click)="manageDept.set(null)">
          <div class="card w-full max-w-2xl animate-slide-up" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center"
                     [style.background]="(manageDept()!.color ?? '#6366f1') + '25'">
                  <i class='bx bxs-group text-indigo-400'></i>
                </div>
                <div>
                  <h3 class="text-base font-semibold text-white">Manage Members</h3>
                  <p class="text-xs text-slate-400">{{ manageDept()!.name }}</p>
                </div>
              </div>
              <button (click)="manageDept.set(null)" class="btn-ghost btn-sm">
                <i class='bx bx-x text-xl'></i>
              </button>
            </div>

            <!-- Set Head -->
            @if (canManage() && orgUsers().length) {
              <div class="mb-4">
                <label class="label">Department Head</label>
                <div class="flex gap-2">
                  <select [(ngModel)]="headIdInput" class="input flex-1">
                    <option value="">— Remove head —</option>
                    @for (u of currentDeptMembers(); track u._id) {
                      <option [value]="u._id">{{ u.name }}</option>
                    }
                  </select>
                  <button (click)="saveHead()" class="btn-primary shrink-0" [disabled]="saving()">Set</button>
                </div>
              </div>
              <div class="divider !my-3"></div>
            }

            <!-- Current Members -->
            <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">
              Current Members ({{ currentDeptMembers().length }})
            </p>
            <div class="space-y-1 max-h-48 overflow-y-auto mb-4">
              @if (currentDeptMembers().length === 0) {
                <p class="text-sm text-slate-500 italic py-2">No members yet.</p>
              }
              @for (member of currentDeptMembers(); track member._id) {
                <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    @if (member.avatar) {
                      <img [src]="member.avatar" [alt]="member.name" class="w-full h-full object-cover">
                    } @else {
                      <span class="text-xs font-bold text-slate-300">{{ member.name[0].toUpperCase() }}</span>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ member.name }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ member.email }}</p>
                  </div>
                  @if (isHead(member._id)) {
                    <span class="badge badge-indigo text-[10px] shrink-0">Head</span>
                  }
                  @if (canManage() && !isHead(member._id)) {
                    <button (click)="removeMember(member._id)" class="btn-ghost btn-sm text-rose-400 hover:text-rose-300 shrink-0" [disabled]="saving()">
                      <i class='bx bx-x'></i>
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Add Members -->
            @if (canManage() && availableToAdd().length) {
              <div class="divider !my-3"></div>
              <p class="text-xs text-slate-500 uppercase tracking-wider mb-2">Add Members</p>
              <div class="flex gap-2 mb-2">
                <input type="text" [(ngModel)]="memberSearch" placeholder="Search by name..." class="input flex-1 !py-2 text-sm">
              </div>
              <div class="space-y-1 max-h-36 overflow-y-auto">
                @for (u of filteredAvailable(); track u._id) {
                  <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                      <span class="text-xs font-bold text-slate-300">{{ u.name[0].toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-white truncate">{{ u.name }}</p>
                      <p class="text-xs text-slate-500 truncate">{{ u.email }}</p>
                    </div>
                    <button (click)="addMember(u._id)" class="btn-primary btn-sm text-xs shrink-0" [disabled]="saving()">Add</button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- ── Delete Confirm ──────────────────────────────────────────── -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="card w-full max-w-sm animate-slide-up text-center space-y-4">
            <div class="text-4xl">🗑️</div>
            <h3 class="text-lg font-semibold text-white">Delete "{{ deleteTarget()?.name }}"?</h3>
            <p class="text-sm text-slate-400">This cannot be undone. Teams and projects must be removed first.</p>
            <div class="flex gap-3">
              <button (click)="deleteTarget.set(null)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="confirmDelete()" class="btn-danger flex-1" [disabled]="saving()">
                @if (saving()) { <span class="animate-spin inline-block">⟳</span> } @else { Delete }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Department Cards Grid ───────────────────────────────────── -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton h-48 rounded-2xl"></div>
          }
        </div>
      } @else if (departments().length === 0) {
        <div class="card text-center py-16">
          <div class="text-5xl mb-3">🏢</div>
          <p class="text-white font-medium mb-1">No departments yet</p>
          <p class="text-slate-400 text-sm">Create your first department to organise teams and members.</p>
          @if (canManage()) {
            <button (click)="openCreate()" class="btn-primary mt-4 mx-auto">+ New Department</button>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (dept of departments(); track dept._id) {
            <div class="card flex flex-col gap-4 hover:border-indigo-500/30 transition-all duration-200 group">

              <!-- Card Header -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg"
                       [style.background]="'linear-gradient(135deg, ' + (dept.color ?? '#6366f1') + ', ' + (dept.color ?? '#6366f1') + '90)'">
                    {{ dept.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <a [routerLink]="['/departments', dept._id]"
                       class="font-semibold text-white hover:text-indigo-300 transition-colors leading-tight block">
                      {{ dept.name }}
                    </a>
                    @if (!dept.isActive) {
                      <span class="badge badge-slate text-[9px]">Inactive</span>
                    }
                  </div>
                </div>
                @if (canManage()) {
                  <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="openEdit(dept)" class="btn-ghost btn-sm text-xs" title="Edit">
                      <i class='bx bx-edit-alt'></i>
                    </button>
                    <button (click)="deleteTarget.set(dept)" class="btn-ghost btn-sm text-xs text-rose-400 hover:text-rose-300" title="Delete">
                      <i class='bx bx-trash'></i>
                    </button>
                  </div>
                }
              </div>

              <!-- Description -->
              @if (dept.description) {
                <p class="text-sm text-slate-400 leading-relaxed -mt-1 line-clamp-2">{{ dept.description }}</p>
              }

              <!-- Head -->
              @if (dept.headId) {
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    @if (dept.headId.avatar) {
                      <img [src]="dept.headId.avatar" class="w-full h-full object-cover">
                    } @else {
                      <span class="text-[10px] font-bold text-indigo-400">{{ dept.headId.name[0] }}</span>
                    }
                  </div>
                  <span class="text-xs text-slate-400">Head: <span class="text-white font-medium">{{ dept.headId.name }}</span></span>
                </div>
              }

              <!-- Stats row -->
              <div class="flex items-center gap-3 pt-1 border-t border-white/5">
                <div class="flex items-center gap-1.5 text-xs text-slate-400">
                  <i class='bx bxs-group text-indigo-400 text-sm'></i>
                  <span><strong class="text-white">{{ dept.memberIds?.length ?? 0 }}</strong> members</span>
                </div>
                <div class="flex-1"></div>
                @if (canManage()) {
                  <button (click)="openManageMembers(dept)"
                          class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    <i class='bx bx-user-plus'></i> Manage
                  </button>
                }
                <a [routerLink]="['/departments', dept._id]"
                   class="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors">
                  Details <i class='bx bx-right-arrow-alt'></i>
                </a>
              </div>

              <!-- Member Avatars -->
              @if (dept.memberIds && dept.memberIds.length > 0) {
                <div class="flex items-center -space-x-2">
                  @for (m of dept.memberIds!.slice(0, 6); track m._id) {
                    <div class="w-7 h-7 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center overflow-hidden"
                         [title]="m.name">
                      @if (m.avatar) {
                        <img [src]="m.avatar" [alt]="m.name" class="w-full h-full object-cover">
                      } @else {
                        <span class="text-[10px] font-bold text-slate-300">{{ m.name[0].toUpperCase() }}</span>
                      }
                    </div>
                  }
                  @if ((dept.memberIds!.length) > 6) {
                    <div class="w-7 h-7 rounded-full border-2 border-slate-800 bg-slate-700
                                flex items-center justify-center text-[10px] text-slate-400 font-medium">
                      +{{ dept.memberIds!.length - 6 }}
                    </div>
                  }
                </div>
              }

            </div>
          }
        </div>
      }

    </div>
  `,
})
export class DepartmentsListComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);

  loading      = signal(true);
  saving       = signal(false);
  showModal    = signal(false);
  editing      = signal<Department | null>(null);
  deleteTarget = signal<Department | null>(null);
  manageDept   = signal<Department | null>(null);
  departments  = signal<Department[]>([]);
  orgUsers     = signal<Member[]>([]);

  // Manage members state
  headIdInput  = '';
  memberSearch = '';

  // Create/edit form
  form = { name: '', description: '', color: '#6366f1', headId: '', budget: 0 };

  presetColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

  canManage    = computed(() => [Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(this.auth.userRole() as Role));

  currentDeptMembers = computed<Member[]>(() => {
    const d = this.manageDept();
    if (!d) return [];
    return (d.memberIds ?? []) as Member[];
  });

  availableToAdd = computed<Member[]>(() => {
    const current = new Set((this.currentDeptMembers()).map(m => m._id));
    return this.orgUsers().filter(u => !current.has(u._id));
  });

  filteredAvailable = computed<Member[]>(() => {
    const q = this.memberSearch.toLowerCase().trim();
    if (!q) return this.availableToAdd();
    return this.availableToAdd().filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.load();
    this.loadOrgUsers();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  load() {
    this.loading.set(true);
    this.http.get<any>(`${API}/departments?limit=100`).subscribe({
      next: r => {
        this.departments.set(r.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load departments');
        this.loading.set(false);
      },
    });
  }

  loadOrgUsers() {
    this.http.get<any>(`${API}/users?limit=200&isActive=true`).subscribe({
      next: r => this.orgUsers.set(r.data ?? []),
      error: () => {},
    });
  }

  // Re-fetch a single department to get fresh member list
  private refreshDept(id: string) {
    this.http.get<any>(`${API}/departments/${id}`).subscribe({
      next: r => {
        const updated = r.data?.department ?? r.data;
        this.departments.update(ds => ds.map(d => d._id === id ? { ...d, ...updated } : d));
        if (this.manageDept()?._id === id) this.manageDept.set({ ...this.manageDept()!, ...updated });
      },
      error: () => {},
    });
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', color: '#6366f1', headId: '', budget: 0 };
    this.showModal.set(true);
  }

  openEdit(dept: Department) {
    this.editing.set(dept);
    this.form = {
      name:        dept.name,
      description: dept.description ?? '',
      color:       dept.color ?? '#6366f1',
      headId:      (dept.headId as any)?._id ?? dept.headId ?? '',
      budget:      dept.budget ?? 0,
    };
    this.showModal.set(true);
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) this.showModal.set(false);
  }

  openManageMembers(dept: Department) {
    // Reload fresh dept detail to get populated memberIds
    this.http.get<any>(`${API}/departments/${dept._id}`).subscribe({
      next: r => {
        const fresh = r.data?.department ?? r.data;
        this.manageDept.set({ ...dept, ...fresh });
        this.headIdInput = (fresh.headId as any)?._id ?? fresh.headId ?? '';
        this.memberSearch = '';
      },
      error: () => this.manageDept.set(dept),
    });
  }

  isHead(userId: string): boolean {
    const d = this.manageDept();
    if (!d?.headId) return false;
    return (d.headId as any)?._id === userId || String(d.headId) === userId;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  save() {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    const body: any = {
      name:        this.form.name.trim(),
      description: this.form.description || undefined,
      color:       this.form.color,
    };
    if (this.form.budget) body.budget = this.form.budget;
    if (this.editing() && this.form.headId) body.headId = this.form.headId;

    const req = this.editing()
      ? this.http.patch<any>(`${API}/departments/${this.editing()!._id}`, body)
      : this.http.post<any>(`${API}/departments`, body);

    req.subscribe({
      next: r => {
        const dept = r.data?.department ?? r.data;
        if (this.editing()) {
          this.departments.update(ds => ds.map(d => d._id === dept._id ? dept : d));
          this.toast.success('Department updated');
        } else {
          this.departments.update(ds => [dept, ...ds]);
          this.toast.success('Department created');
        }
        this.saving.set(false);
        this.showModal.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to save'); },
    });
  }

  confirmDelete() {
    const dept = this.deleteTarget();
    if (!dept) return;
    this.saving.set(true);
    this.http.delete(`${API}/departments/${dept._id}`).subscribe({
      next: () => {
        this.departments.update(ds => ds.filter(d => d._id !== dept._id));
        this.toast.success('Department deleted');
        this.deleteTarget.set(null);
        this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to delete'); },
    });
  }

  // ── Member Management ─────────────────────────────────────────────────────────

  addMember(userId: string) {
    const dept = this.manageDept();
    if (!dept) return;
    this.saving.set(true);
    this.http.patch<any>(`${API}/departments/${dept._id}/members`, { add: [userId] }).subscribe({
      next: r => {
        const updated = r.data?.department ?? r.data;
        this.manageDept.set({ ...dept, ...updated });
        this.departments.update(ds => ds.map(d => d._id === dept._id ? { ...d, ...updated } : d));
        this.toast.success('Member added');
        this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to add member'); },
    });
  }

  removeMember(userId: string) {
    const dept = this.manageDept();
    if (!dept) return;
    this.saving.set(true);
    this.http.patch<any>(`${API}/departments/${dept._id}/members`, { remove: [userId] }).subscribe({
      next: r => {
        const updated = r.data?.department ?? r.data;
        this.manageDept.set({ ...dept, ...updated });
        this.departments.update(ds => ds.map(d => d._id === dept._id ? { ...d, ...updated } : d));
        this.toast.success('Member removed');
        this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to remove member'); },
    });
  }

  saveHead() {
    const dept = this.manageDept();
    if (!dept) return;
    this.saving.set(true);
    this.http.patch<any>(`${API}/departments/${dept._id}/head`, { headId: this.headIdInput || null }).subscribe({
      next: r => {
        const updated = r.data?.department ?? r.data;
        this.manageDept.set({ ...dept, ...updated });
        this.departments.update(ds => ds.map(d => d._id === dept._id ? { ...d, ...updated } : d));
        this.toast.success('Department head updated');
        this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to set head'); },
    });
  }
}
