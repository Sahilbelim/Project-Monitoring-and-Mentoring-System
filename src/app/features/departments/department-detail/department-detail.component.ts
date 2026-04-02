import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { environment }    from '../../../../environments/environment';
import { ToastService }   from '../../../core/services/toast.service';
import { AuthService }    from '../../../core/services/auth.service';
import { Role }           from '../../../core/models/user.model';

interface Member { _id: string; name: string; email: string; avatar?: string; role?: string; }
interface Team   {
  _id: string; name: string; description?: string; color?: string; isActive?: boolean;
  leadId?: Member; memberIds?: string[];
}
interface Stats  {
  memberCount: number; teamCount: number; projectCount: number;
  projectsByStatus: Record<string, number>;
}
interface Department {
  _id: string; name: string; description?: string; color?: string; budget?: number;
  headId?: Member | null; memberIds?: Member[]; teams?: Team[]; isActive?: boolean;
}

const API = environment.apiUrl;

@Component({
  selector:   'app-department-detail',
  standalone: true,
  imports:    [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 max-w-5xl mx-auto">

      <!-- Back -->
      <a routerLink="/departments" class="btn-ghost btn-sm inline-flex items-center gap-1.5">
        <i class='bx bx-left-arrow-alt'></i> Departments
      </a>

      @if (loading()) {
        <!-- Skeleton -->
        <div class="card">
          <div class="skeleton h-8 w-48 mb-3 rounded-xl"></div>
          <div class="skeleton h-4 w-72 rounded-lg mb-6"></div>
          <div class="grid grid-cols-3 gap-4">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton h-20 rounded-xl"></div>
            }
          </div>
        </div>
      } @else if (!dept()) {
        <div class="card text-center py-16">
          <div class="text-5xl mb-3">🏢</div>
          <p class="text-white font-medium">Department not found</p>
          <a routerLink="/departments" class="btn-primary mt-4 mx-auto">Back to list</a>
        </div>
      } @else {

        <!-- ── Hero ─────────────────────────────────────────────────── -->
        <div class="relative overflow-hidden rounded-2xl border p-6
                    bg-gradient-to-br from-slate-800/70 to-slate-900/70"
             [style.border-color]="(dept()!.color ?? '#6366f1') + '40'">
          <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20"
               [style.background]="dept()!.color ?? '#6366f1'"></div>
          <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0"
                   [style.background]="'linear-gradient(135deg, ' + (dept()!.color ?? '#6366f1') + ', ' + (dept()!.color ?? '#6366f1') + '80)'">
                {{ dept()!.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h1 class="text-2xl font-black text-white">{{ dept()!.name }}</h1>
                @if (dept()!.description) {
                  <p class="text-slate-400 text-sm mt-0.5">{{ dept()!.description }}</p>
                }
                @if (!dept()!.isActive) {
                  <span class="badge badge-slate text-[10px] mt-1">Inactive</span>
                }
              </div>
            </div>
            @if (dept()!.headId) {
              <div class="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 shrink-0">
                <div class="w-8 h-8 rounded-full bg-indigo-500/20 overflow-hidden flex items-center justify-center">
                  @if (dept()!.headId!.avatar) {
                    <img [src]="dept()!.headId!.avatar" class="w-full h-full object-cover">
                  } @else {
                    <span class="text-xs font-bold text-indigo-400">{{ dept()!.headId!.name[0] }}</span>
                  }
                </div>
                <div>
                  <p class="text-[10px] text-slate-500">Department Head</p>
                  <p class="text-sm font-semibold text-white">{{ dept()!.headId!.name }}</p>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Stats Cards ───────────────────────────────────────────── -->
        @if (stats()) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="card !p-4 text-center">
              <div class="text-2xl font-black text-white animate-count-up">{{ stats()!.memberCount }}</div>
              <div class="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                <i class='bx bxs-group text-indigo-400'></i> Members
              </div>
            </div>
            <div class="card !p-4 text-center">
              <div class="text-2xl font-black text-violet-400 animate-count-up">{{ stats()!.teamCount }}</div>
              <div class="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                <i class='bx bxs-network-chart text-violet-400'></i> Teams
              </div>
            </div>
            <div class="card !p-4 text-center">
              <div class="text-2xl font-black text-blue-400 animate-count-up">{{ stats()!.projectCount }}</div>
              <div class="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                <i class='bx bxs-folder-open text-blue-400'></i> Projects
              </div>
            </div>
            <div class="card !p-4 text-center">
              <div class="text-2xl font-black text-emerald-400">
                {{ stats()!.projectsByStatus['active'] || 0 }}
              </div>
              <div class="text-xs text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                <i class='bx bx-run text-emerald-400'></i> Active Projects
              </div>
            </div>
          </div>

          <!-- Project status breakdown -->
          @if (stats()!.projectCount > 0) {
            <div class="card">
              <h3 class="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                <i class='bx bx-bar-chart-alt-2 text-amber-400'></i> Projects by Status
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                @for (entry of projectStatusEntries(); track entry.key) {
                  <div class="rounded-xl p-3 text-center" [class]="statusBg(entry.key)">
                    <div class="text-lg font-bold" [class]="statusColor(entry.key)">{{ entry.value }}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5 capitalize">{{ entry.key.replace('_', ' ') }}</div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- ── Teams in this Department ──────────────────────────────── -->
        <div class="card">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white flex items-center gap-2">
              <i class='bx bxs-network-chart text-violet-400'></i> Teams
              <span class="badge badge-violet text-[10px]">{{ teams().length }}</span>
            </h2>
            @if (canManage()) {
              <a routerLink="/teams" class="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                Manage Teams <i class='bx bx-right-arrow-alt'></i>
              </a>
            }
          </div>

          @if (teams().length === 0) {
            <div class="text-center py-8">
              <i class='bx bxs-network-chart text-3xl text-slate-600 block mb-2'></i>
              <p class="text-slate-400 text-sm">No teams assigned to this department yet.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              @for (team of teams(); track team._id) {
                <div class="flex items-start gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 transition-colors">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                       [style.background]="(team.color ?? '#6366f1') + '30'"
                       [style.color]="team.color ?? '#6366f1'">
                    {{ team.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-white truncate">{{ team.name }}</p>
                    @if (team.leadId) {
                      <p class="text-xs text-slate-500 mt-0.5">
                        Lead: <span class="text-slate-300">{{ team.leadId.name }}</span>
                      </p>
                    }
                    @if (team.description) {
                      <p class="text-xs text-slate-500 mt-0.5 truncate">{{ team.description }}</p>
                    }
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class="text-[10px] text-slate-500">{{ team.memberIds?.length ?? 0 }} members</span>
                    @if (!team.isActive) {
                      <span class="badge badge-slate text-[9px]">Inactive</span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── Members ───────────────────────────────────────────────── -->
        <div class="card">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white flex items-center gap-2">
              <i class='bx bxs-group text-indigo-400'></i> Members
              <span class="badge badge-indigo text-[10px]">{{ members().length }}</span>
            </h2>
          </div>

          @if (members().length === 0) {
            <div class="text-center py-8">
              <i class='bx bxs-group text-3xl text-slate-600 block mb-2'></i>
              <p class="text-slate-400 text-sm">No members in this department.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              @for (member of members(); track member._id) {
                <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <div class="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    @if (member.avatar) {
                      <img [src]="member.avatar" [alt]="member.name" class="w-full h-full object-cover">
                    } @else {
                      <span class="text-sm font-bold text-slate-300">{{ member.name[0].toUpperCase() }}</span>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ member.name }}</p>
                    <p class="text-xs text-slate-500 truncate">{{ member.email }}</p>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    @if (dept()?.headId && isHead(member._id)) {
                      <span class="badge badge-indigo text-[9px]">Head</span>
                    }
                    @if (member.role) {
                      <span class="badge badge-slate text-[9px]">{{ member.role }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

      }
    </div>
  `,
})
export class DepartmentDetailComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  dept    = signal<Department | null>(null);
  stats   = signal<Stats | null>(null);

  canManage = computed(() => [Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(this.auth.userRole() as Role));
  teams     = computed(() => this.dept()?.teams ?? []);
  members   = computed(() => (this.dept()?.memberIds ?? []) as Member[]);

  projectStatusEntries = computed(() => {
    const s = this.stats();
    if (!s?.projectsByStatus) return [];
    return Object.entries(s.projectsByStatus).map(([key, value]) => ({ key, value }));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.load(id);
  }

  private load(id: string) {
    this.loading.set(true);
    this.http.get<any>(`${API}/departments/${id}`).subscribe({
      next: r => {
        this.dept.set(r.data?.department ?? r.data);
        this.loading.set(false);
        this.loadStats(id);
      },
      error: () => {
        this.toast.error('Failed to load department');
        this.loading.set(false);
      },
    });
  }

  private loadStats(id: string) {
    this.http.get<any>(`${API}/departments/${id}/stats`).subscribe({
      next: r => this.stats.set(r.data?.stats ?? r.data),
      error: () => {},
    });
  }

  isHead(userId: string): boolean {
    const h = this.dept()?.headId;
    if (!h) return false;
    return (h as any)?._id === userId || (h as any) === userId;
  }

  statusBg(status: string): string {
    return ({
      active:    'bg-emerald-500/10',
      completed: 'bg-blue-500/10',
      cancelled: 'bg-slate-500/10',
      archived:  'bg-slate-500/10',
      planning:  'bg-amber-500/10',
      on_hold:   'bg-orange-500/10',
    } as any)[status] ?? 'bg-slate-500/10';
  }

  statusColor(status: string): string {
    return ({
      active:    'text-emerald-400',
      completed: 'text-blue-400',
      cancelled: 'text-slate-400',
      archived:  'text-slate-400',
      planning:  'text-amber-400',
      on_hold:   'text-orange-400',
    } as any)[status] ?? 'text-slate-400';
  }
}
