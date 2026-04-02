import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { RouterLink }    from '@angular/router';
import { environment }   from '../../../../environments/environment';
import { ToastService }  from '../../../core/services/toast.service';

interface Project {
  _id: string; name: string; description?: string; status?: string;
  priority?: string; deadline?: string; color?: string;
  members?: any[]; progress?: number;
}

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#10b981','#ef4444','#3b82f6'];
const STATUSES = ['planning','active','on_hold','completed','cancelled','archived'];
const PRIORITIES = ['low','medium','high','critical'];

@Component({
  selector:   'app-projects-list',
  standalone: true,
  imports:    [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Projects</h1>
          <p class="text-slate-400 text-sm mt-1">{{ projects().length }} projects</p>
        </div>
        <button (click)="openCreate()" class="btn-primary self-start">+ New Project</button>
      </div>

      <!-- Filter bar -->
      <div class="flex flex-wrap gap-2">
        <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()" class="input w-auto">
          <option value="">All statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ s | titlecase }}</option> }
        </select>
        <select [(ngModel)]="filterPriority" (ngModelChange)="applyFilter()" class="input w-auto">
          <option value="">All priorities</option>
          @for (p of priorities; track p) { <option [value]="p">{{ p | titlecase }}</option> }
        </select>
      </div>

      <!-- Create/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto">
          <div class="card w-full max-w-lg animate-slide-up space-y-4 my-4">
            <h3 class="text-lg font-semibold text-white">{{ editing() ? 'Edit' : 'Create' }} Project</h3>
            <div>
              <label class="label">Name *</label>
              <input type="text" [(ngModel)]="form.name" class="input" placeholder="Project name">
            </div>
            <div>
              <label class="label">Description</label>
              <textarea [(ngModel)]="form.description" class="input min-h-[80px]"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Priority</label>
                <select [(ngModel)]="form.priority" class="input">
                  @for (p of priorities; track p) { <option [value]="p">{{ p | titlecase }}</option> }
                </select>
              </div>
              <div>
                <label class="label">Deadline</label>
                <input type="date" [(ngModel)]="form.deadline" class="input">
              </div>
            </div>
            <div>
              <label class="label">Color</label>
              <div class="flex gap-2 flex-wrap">
                @for (c of colorOptions; track c) {
                  <button type="button" (click)="form.color = c"
                    class="w-8 h-8 rounded-full border-2 transition-all"
                    [style.background]="c"
                    [class]="form.color === c ? 'border-white scale-110' : 'border-transparent'">
                  </button>
                }
              </div>
            </div>
            <div class="flex gap-3 pt-1">
              <button (click)="showModal.set(false)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="save()" class="btn-primary flex-1" [disabled]="!form.name || saving()">
                @if (saving()) { <span class="animate-spin">⟳</span> } @else { {{ editing() ? 'Save' : 'Create' }} }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete confirm -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="card w-full max-w-sm text-center space-y-4 animate-slide-up">
            <div class="text-4xl">🗑️</div>
            <h3 class="text-lg font-semibold text-white">Delete "{{ deleteTarget()?.name }}"?</h3>
            <p class="text-sm text-slate-400">All tasks in this project will also be removed.</p>
            <div class="flex gap-3">
              <button (click)="deleteTarget.set(null)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="confirmDelete()" class="btn-danger flex-1" [disabled]="saving()">Delete</button>
            </div>
          </div>
        </div>
      }

      <!-- Projects grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton h-44 rounded-2xl"></div> }
        </div>
      } @else if (filtered().length === 0) {
        <div class="card text-center py-16">
          <div class="text-5xl mb-3">📋</div>
          <p class="text-white font-medium mb-1">No projects found</p>
          <button (click)="openCreate()" class="btn-primary mt-3">Create first project</button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (proj of filtered(); track proj._id) {
            <div class="card flex flex-col gap-3 group cursor-pointer"
                 [style.border-left]="'3px solid ' + (proj.color ?? '#6366f1')">
              <!-- Title row -->
              <div class="flex items-start gap-3">
                <div class="w-3 h-3 rounded-full mt-1.5 shrink-0" [style.background]="proj.color ?? '#6366f1'"></div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-white truncate">{{ proj.name }}</p>
                  @if (proj.description) {
                    <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">{{ proj.description }}</p>
                  }
                </div>
              </div>
              <!-- Meta -->
              <div class="flex flex-wrap gap-2">
                <span class="badge" [class]="statusColor(proj.status)">{{ proj.status ?? 'planning' }}</span>
                @if (proj.priority) {
                  <span class="badge" [class]="priorityColor(proj.priority)">{{ proj.priority }}</span>
                }
              </div>
              <!-- Progress bar -->
              <div>
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Progress</span><span>{{ proj.progress ?? 0 }}%</span>
                </div>
                <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500"
                       [style.width.%]="proj.progress ?? 0"
                       [style.background]="proj.color ?? '#6366f1'"></div>
                </div>
              </div>
              @if (proj.deadline) {
                <p class="text-xs text-slate-400">📅 Due: {{ proj.deadline | date:'MMM d, y' }}</p>
              }
              <!-- Actions -->
              <div class="flex gap-2 mt-auto pt-1 border-t border-slate-700/40">
                <a [routerLink]="['/projects', proj._id]" class="btn-ghost btn-sm text-xs flex-1 text-center">Tasks →</a>
                <button (click)="openEdit(proj)" class="btn-ghost btn-sm text-xs">Edit</button>
                <button (click)="changeStatus(proj)" class="btn-ghost btn-sm text-xs">Status</button>
                <button (click)="deleteTarget.set(proj)" class="btn-ghost btn-sm text-xs text-rose-400">Del</button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProjectsListComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  loading      = signal(true);
  saving       = signal(false);
  showModal    = signal(false);
  editing      = signal<Project | null>(null);
  deleteTarget = signal<Project | null>(null);
  projects     = signal<Project[]>([]);
  filtered     = signal<Project[]>([]);

  statuses      = STATUSES;
  priorities    = PRIORITIES;
  colorOptions  = COLORS;
  filterStatus   = '';
  filterPriority = '';

  form = { name: '', description: '', priority: 'medium', deadline: '', color: COLORS[0] };

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>(`${environment.apiUrl}/projects`).subscribe({
      next: r => { this.projects.set(r.data ?? []); this.applyFilter(); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilter() {
    this.filtered.set(this.projects().filter(p =>
      (!this.filterStatus   || p.status   === this.filterStatus) &&
      (!this.filterPriority || p.priority === this.filterPriority)
    ));
  }

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', priority: 'medium', deadline: '', color: COLORS[0] };
    this.showModal.set(true);
  }

  openEdit(p: Project) {
    this.editing.set(p);
    this.form = {
      name: p.name, description: p.description ?? '',
      priority: p.priority ?? 'medium',
      deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '',
      color: p.color ?? COLORS[0],
    };
    this.showModal.set(true);
  }

  save() {
    if (!this.form.name) return;
    this.saving.set(true);
    const body = {
      name: this.form.name,
      description: this.form.description || undefined,
      priority: this.form.priority,
      deadline: this.form.deadline || undefined,
      color: this.form.color,
    };
    const req = this.editing()
      ? this.http.patch<any>(`${environment.apiUrl}/projects/${this.editing()!._id}`, body)
      : this.http.post<any>(`${environment.apiUrl}/projects`, body);

    req.subscribe({
      next: r => {
        const proj = r.data?.project ?? r.data;
        if (this.editing()) {
          this.projects.update(ps => ps.map(p => p._id === proj._id ? proj : p));
          this.toast.success('Project updated');
        } else {
          this.projects.update(ps => [proj, ...ps]);
          this.toast.success('Project created');
        }
        this.applyFilter(); this.saving.set(false); this.showModal.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed'); },
    });
  }

  changeStatus(proj: Project) {
    const current = STATUSES.indexOf(proj.status ?? 'planning');
    const next    = STATUSES[(current + 1) % STATUSES.length];
    this.http.patch<any>(`${environment.apiUrl}/projects/${proj._id}/status`, { status: next }).subscribe({
      next: r => {
        const updated = r.data?.project ?? r.data;
        this.projects.update(ps => ps.map(p => p._id === updated._id ? updated : p));
        this.applyFilter(); this.toast.success(`Status → ${next}`);
      },
      error: err => this.toast.error(err?.error?.message ?? 'Failed'),
    });
  }

  confirmDelete() {
    const proj = this.deleteTarget();
    if (!proj) return;
    this.saving.set(true);
    this.http.delete(`${environment.apiUrl}/projects/${proj._id}`).subscribe({
      next: () => {
        this.projects.update(ps => ps.filter(p => p._id !== proj._id));
        this.applyFilter(); this.toast.success('Project deleted');
        this.deleteTarget.set(null); this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed'); },
    });
  }

  statusColor(s?: string): string {
    return { active:'badge-emerald', planning:'badge-indigo', on_hold:'badge-amber', completed:'badge-emerald', cancelled:'badge-rose', archived:'badge-slate' }[s ?? ''] ?? 'badge-slate';
  }
  priorityColor(p?: string): string {
    return { low:'badge-slate', medium:'badge-indigo', high:'badge-amber', critical:'badge-rose' }[p ?? ''] ?? 'badge-slate';
  }
}
