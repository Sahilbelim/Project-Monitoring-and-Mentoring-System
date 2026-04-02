import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { environment }   from '../../../../environments/environment';
import { ToastService }  from '../../../core/services/toast.service';

interface Team { _id: string; name: string; description?: string; leaderId?: any; memberIds?: any[]; departmentId?: any; }
interface Department { _id: string; name: string; }

@Component({
  selector:   'app-teams-list',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Teams</h1>
          <p class="text-slate-400 text-sm mt-1">{{ teams().length }} teams</p>
        </div>
        <button (click)="openCreate()" class="btn-primary">+ New Team</button>
      </div>

      <!-- Create / Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div class="card w-full max-w-md animate-slide-up space-y-4">
            <h3 class="text-lg font-semibold text-white">{{ editing() ? 'Edit' : 'Create' }} Team</h3>
            <div>
              <label class="label">Team Name *</label>
              <input type="text" [(ngModel)]="form.name" class="input" placeholder="Frontend Team">
            </div>
            <div>
              <label class="label">Department *</label>
              <select [(ngModel)]="form.departmentId" class="input">
                <option value="">Select department...</option>
                @for (d of departments(); track d._id) { <option [value]="d._id">{{ d.name }}</option> }
              </select>
            </div>
            <div>
              <label class="label">Description</label>
              <textarea [(ngModel)]="form.description" class="input min-h-[80px]" placeholder="Team purpose..."></textarea>
            </div>
            <div class="flex gap-3 pt-1">
              <button (click)="showModal.set(false)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="save()" class="btn-primary flex-1" [disabled]="!form.name || !form.departmentId || saving()">
                @if (saving()) { <span class="animate-spin">⟳</span> } @else { {{ editing() ? 'Save' : 'Create' }} }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Add Members Modal -->
      @if (membersTarget()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="card w-full max-w-lg animate-slide-up space-y-4">
            <h3 class="text-lg font-semibold text-white">Members — {{ membersTarget()?.name }}</h3>
            <p class="text-sm text-slate-400">Enter user IDs to add or remove.</p>
            <div>
              <label class="label">Add User IDs (comma-separated)</label>
              <input type="text" [(ngModel)]="memberAdd" class="input" placeholder="userId1,userId2">
            </div>
            <div>
              <label class="label">Remove User IDs (comma-separated)</label>
              <input type="text" [(ngModel)]="memberRemove" class="input" placeholder="userId1">
            </div>
            <div class="flex gap-3">
              <button (click)="membersTarget.set(null)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="updateMembers()" class="btn-primary flex-1" [disabled]="saving()">Update Members</button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirm -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="card w-full max-w-sm text-center space-y-4 animate-slide-up">
            <div class="text-4xl">🗑️</div>
            <h3 class="text-lg font-semibold text-white">Delete "{{ deleteTarget()?.name }}"?</h3>
            <div class="flex gap-3">
              <button (click)="deleteTarget.set(null)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="confirmDelete()" class="btn-danger flex-1" [disabled]="saving()">Delete</button>
            </div>
          </div>
        </div>
      }

      <!-- Teams grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (i of [1,2,3,4]; track i) { <div class="skeleton h-36 rounded-2xl"></div> }
        </div>
      } @else if (teams().length === 0) {
        <div class="card text-center py-16">
          <div class="text-5xl mb-3">👥</div>
          <p class="text-white font-medium mb-1">No teams yet</p>
          <p class="text-slate-400 text-sm">Create a team to organize your members.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (team of teams(); track team._id) {
            <div class="card flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500
                              flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {{ team.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-semibold text-white">{{ team.name }}</p>
                    <p class="text-xs text-slate-400">{{ (team.memberIds ?? []).length }} members</p>
                  </div>
                </div>
                <div class="flex gap-1 shrink-0 flex-wrap justify-end">
                  <button (click)="openEdit(team)" class="btn-ghost btn-sm text-xs">Edit</button>
                  <button (click)="membersTarget.set(team); memberAdd=''; memberRemove=''" class="btn-ghost btn-sm text-xs">Members</button>
                  <button (click)="deleteTarget.set(team)" class="btn-ghost btn-sm text-xs text-rose-400 hover:text-rose-300">Delete</button>
                </div>
              </div>
              @if (team.description) {
                <p class="text-sm text-slate-400">{{ team.description }}</p>
              }
              @if (team.leaderId) {
                <div class="text-xs text-slate-400">
                  🏷️ Leader: <span class="text-white font-medium">{{ team.leaderId?.name ?? team.leaderId }}</span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TeamsListComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  loading       = signal(true);
  saving        = signal(false);
  showModal     = signal(false);
  editing       = signal<Team | null>(null);
  deleteTarget  = signal<Team | null>(null);
  membersTarget = signal<Team | null>(null);
  teams         = signal<Team[]>([]);
  departments   = signal<Department[]>([]);
  form          = { name: '', description: '', departmentId: '' };
  memberAdd     = '';
  memberRemove  = '';

  ngOnInit() { this.load(); this.loadDepartments(); }

  loadDepartments() {
    this.http.get<any>(`${environment.apiUrl}/departments`).subscribe({
      next: r => this.departments.set(r.data ?? []),
    });
  }

  load() {
    this.http.get<any>(`${environment.apiUrl}/teams`).subscribe({
      next: r => { this.teams.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() { this.editing.set(null); this.form = { name: '', description: '', departmentId: '' }; this.showModal.set(true); }
  openEdit(t: Team) { this.editing.set(t); this.form = { name: t.name, description: t.description ?? '', departmentId: (t.departmentId as any)?._id ?? t.departmentId ?? '' }; this.showModal.set(true); }

  save() {
    if (!this.form.name) return;
    this.saving.set(true);
    const body = { name: this.form.name, description: this.form.description || undefined, departmentId: this.form.departmentId || undefined };
    const req = this.editing()
      ? this.http.patch<any>(`${environment.apiUrl}/teams/${this.editing()!._id}`, body)
      : this.http.post<any>(`${environment.apiUrl}/teams`, body);

    req.subscribe({
      next: r => {
        const team = r.data?.team ?? r.data;
        if (this.editing()) {
          this.teams.update(ts => ts.map(t => t._id === team._id ? team : t));
          this.toast.success('Team updated');
        } else {
          this.teams.update(ts => [team, ...ts]);
          this.toast.success('Team created');
        }
        this.saving.set(false); this.showModal.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed'); },
    });
  }

  updateMembers() {
    const team = this.membersTarget();
    if (!team) return;
    const add    = this.memberAdd.split(',').map(s => s.trim()).filter(Boolean);
    const remove = this.memberRemove.split(',').map(s => s.trim()).filter(Boolean);
    if (!add.length && !remove.length) return;

    this.saving.set(true);
    this.http.patch<any>(`${environment.apiUrl}/teams/${team._id}/members`, { add, remove }).subscribe({
      next: r => {
        const updated = r.data?.team ?? r.data;
        this.teams.update(ts => ts.map(t => t._id === updated._id ? updated : t));
        this.toast.success('Members updated'); this.membersTarget.set(null); this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed to update members'); },
    });
  }

  confirmDelete() {
    const team = this.deleteTarget();
    if (!team) return;
    this.saving.set(true);
    this.http.delete(`${environment.apiUrl}/teams/${team._id}`).subscribe({
      next: () => {
        this.teams.update(ts => ts.filter(t => t._id !== team._id));
        this.toast.success('Team deleted'); this.deleteTarget.set(null); this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed'); },
    });
  }
}
