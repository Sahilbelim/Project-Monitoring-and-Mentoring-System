import {
  Component, OnInit, OnDestroy, signal, computed, AfterViewInit
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { Subject }        from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of }             from 'rxjs';
import { AuthService }    from '../../core/services/auth.service';
import { Role }           from '../../core/models/user.model';
import {
  DashboardService,
  UserStats, OrgOverview, TrendPoint, ActivityEntry
} from './dashboard.service';

declare const gsap: any;

@Component({
  selector:   'app-dashboard',
  standalone: true,
  imports:    [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">

      <!-- ── Hero greeting ──────────────────────────────────────────── -->
      <div class="relative overflow-hidden rounded-2xl
                  bg-gradient-to-br from-indigo-900/40 via-slate-800/60 to-violet-900/40
                  border border-indigo-500/20 p-6">
        <div class="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none"></div>

        <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="animate-slide-up">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-2xl animate-float">{{ greetEmoji() }}</span>
              <h1 class="text-2xl font-black text-white">
                Good {{ timeOfDay() }}, <span class="text-gradient">{{ firstName() }}</span>!
              </h1>
            </div>
            <p class="text-slate-400 text-sm">Here's what's happening in your workspace today.</p>
          </div>
          <a routerLink="/tasks" class="btn-primary self-start animate-slide-up delay-2 shadow-indigo-500/30">
            <i class='bx bx-task text-lg'></i>
            My Tasks
          </a>
        </div>
      </div>

      <!-- ── Error banner ───────────────────────────────────────────── -->
      @if (error()) {
        <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-slide-up">
          <i class='bx bx-error-circle text-lg shrink-0'></i>
          <span class="text-sm">{{ error() }}</span>
          <button (click)="error.set(null)" class="ml-auto text-rose-400/60 hover:text-rose-400 transition-colors">
            <i class='bx bx-x text-xl'></i>
          </button>
        </div>
      }

      <!-- ── Personal stat cards ────────────────────────────────────── -->
      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="card !p-5">
              <div class="skeleton h-4 w-10 mb-3 rounded-lg"></div>
              <div class="skeleton h-8 w-16 mb-2 rounded-xl"></div>
              <div class="skeleton h-3 w-24 rounded-lg"></div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

          <!-- Open Tasks -->
          <div class="stat-card card-glow-indigo delay-1 animate-slide-up group cursor-default">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center
                          group-hover:bg-indigo-500/30 transition-colors">
                <i class='bx bx-task text-xl text-indigo-400'></i>
              </div>
              <span class="badge-indigo badge text-[10px]">Open</span>
            </div>
            <div>
              <div class="stat-value animate-count-up">{{ openTasks() }}</div>
              <div class="stat-label">Open Tasks</div>
            </div>
            <div class="text-xs text-indigo-400 flex items-center gap-1">
              <i class='bx bx-user-pin text-sm'></i> Assigned to me
            </div>
          </div>

          <!-- Overdue -->
          <div class="stat-card delay-2 animate-slide-up group cursor-default"
               [class]="overdueTasks() > 0 ? 'card-glow-rose' : 'card-glow-emerald'">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                   [class]="overdueTasks() > 0 ? 'bg-rose-500/20 group-hover:bg-rose-500/30' : 'bg-emerald-500/20 group-hover:bg-emerald-500/30'">
                <i class='bx text-xl' [class]="overdueTasks() > 0 ? 'bx-alarm text-rose-400' : 'bx-check-circle text-emerald-400'"></i>
              </div>
              <span class="badge text-[10px]" [class]="overdueTasks() > 0 ? 'badge-rose' : 'badge-emerald'">Overdue</span>
            </div>
            <div>
              <div class="stat-value animate-count-up" [class]="overdueTasks() > 0 ? 'text-rose-400' : 'text-white'">{{ overdueTasks() }}</div>
              <div class="stat-label">Overdue Tasks</div>
            </div>
            <div class="text-xs flex items-center gap-1" [class]="overdueTasks() > 0 ? 'text-rose-400' : 'text-emerald-400'">
              <i class='bx text-sm' [class]="overdueTasks() > 0 ? 'bx-time' : 'bx-smile'"></i>
              {{ overdueTasks() > 0 ? 'Needs attention' : 'All clear!' }}
            </div>
          </div>

          <!-- Completed -->
          <div class="stat-card card-glow-emerald delay-3 animate-slide-up group cursor-default">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center
                          group-hover:bg-emerald-500/30 transition-colors">
                <i class='bx bxs-check-shield text-xl text-emerald-400'></i>
              </div>
              <span class="badge-emerald badge text-[10px]">Done</span>
            </div>
            <div>
              <div class="stat-value text-emerald-400 animate-count-up">{{ userStats()?.completedTasks ?? 0 }}</div>
              <div class="stat-label">Total Completed</div>
            </div>
            <div class="text-xs text-emerald-400 flex items-center gap-1">
              <i class='bx bx-trending-up text-sm'></i>
              {{ userStats()?.completionRate ?? 0 }}% completion rate
            </div>
          </div>

          <!-- Avg Resolution -->
          <div class="stat-card card-glow-violet delay-4 animate-slide-up group cursor-default">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center
                          group-hover:bg-violet-500/30 transition-colors">
                <i class='bx bx-timer text-xl text-violet-400'></i>
              </div>
              <span class="badge-violet badge text-[10px]">Avg</span>
            </div>
            <div>
              <div class="stat-value animate-count-up">{{ userStats()?.avgResolutionHours ?? 0 }}</div>
              <div class="stat-label">Avg Resolution (h)</div>
            </div>
            <div class="text-xs text-violet-400 flex items-center gap-1">
              <i class='bx bx-log-in-circle text-sm'></i>
              {{ userStats()?.totalLoggedHours ?? 0 }}h logged total
            </div>
          </div>
        </div>
      }

      <!-- ── Org Overview (managers only) ───────────────────────────── -->
      @if (isManager()) {
        <div class="animate-slide-up delay-2">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <i class='bx bx-building-house text-orange-400 text-sm'></i>
            </div>
            <h2 class="font-bold text-white text-sm uppercase tracking-wider">Organisation Overview</h2>
          </div>

          @if (loading()) {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="card !p-4">
                  <div class="skeleton h-6 w-12 mb-1 rounded-lg mx-auto"></div>
                  <div class="skeleton h-3 w-16 rounded mx-auto"></div>
                </div>
              }
            </div>
          } @else if (orgOverview()) {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <!-- Total Tasks -->
              <div class="card !p-4 text-center group hover:border-indigo-500/40 transition-colors cursor-default">
                <div class="text-2xl font-black text-white mb-0.5 animate-count-up">{{ orgOverview()!.tasks.total }}</div>
                <div class="text-[11px] text-slate-400">Total Tasks</div>
              </div>
              <!-- Done Tasks -->
              <div class="card !p-4 text-center group hover:border-emerald-500/40 transition-colors cursor-default">
                <div class="text-2xl font-black text-emerald-400 mb-0.5 animate-count-up">{{ orgOverview()!.tasks.done }}</div>
                <div class="text-[11px] text-slate-400">Completed</div>
              </div>
              <!-- Overdue Tasks -->
              <div class="card !p-4 text-center group hover:border-rose-500/40 transition-colors cursor-default">
                <div class="text-2xl font-black mb-0.5 animate-count-up"
                     [class]="orgOverview()!.tasks.overdue > 0 ? 'text-rose-400' : 'text-slate-300'">
                  {{ orgOverview()!.tasks.overdue }}
                </div>
                <div class="text-[11px] text-slate-400">Overdue</div>
              </div>
              <!-- Active Projects -->
              <div class="card !p-4 text-center group hover:border-blue-500/40 transition-colors cursor-default">
                <div class="text-2xl font-black text-blue-400 mb-0.5 animate-count-up">{{ orgOverview()!.projects.active }}</div>
                <div class="text-[11px] text-slate-400">Active Projects</div>
              </div>
              <!-- Members -->
              <div class="card !p-4 text-center group hover:border-violet-500/40 transition-colors cursor-default">
                <div class="text-2xl font-black text-violet-400 mb-0.5 animate-count-up">{{ orgOverview()!.members.total }}</div>
                <div class="text-[11px] text-slate-400">Members</div>
              </div>
              <!-- Completion Rate -->
              <div class="card !p-4 text-center group hover:border-amber-500/40 transition-colors cursor-default">
                <div class="text-2xl font-black text-amber-400 mb-0.5">{{ orgOverview()!.tasks.completionRate }}<span class="text-sm">%</span></div>
                <div class="text-[11px] text-slate-400">Completion Rate</div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Main two-column layout ──────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Recent Tasks (left, 2 cols) -->
        <div class="lg:col-span-2 card animate-slide-up delay-2">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <i class='bx bx-task text-indigo-400'></i>
              </div>
              <h2 class="font-bold text-white">My Tasks</h2>
            </div>
            <a routerLink="/tasks" class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View all <i class='bx bx-right-arrow-alt'></i>
            </a>
          </div>

          @if (loading()) {
            <div class="space-y-2">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="flex items-center gap-3 p-3">
                  <div class="skeleton w-2.5 h-2.5 skeleton-circle"></div>
                  <div class="flex-1 space-y-1.5">
                    <div class="skeleton h-4 rounded-lg w-3/4"></div>
                    <div class="skeleton h-3 rounded-md w-1/3"></div>
                  </div>
                  <div class="skeleton h-5 w-16 rounded-full"></div>
                </div>
              }
            </div>
          } @else if (recentTasks().length === 0) {
            <div class="text-center py-10">
              <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <i class='bx bxs-check-circle text-4xl text-emerald-400'></i>
              </div>
              <p class="text-white font-medium">All clear!</p>
              <p class="text-slate-500 text-sm mt-1">No open tasks. Take a break! ☕</p>
            </div>
          } @else {
            <div class="space-y-1">
              @for (task of recentTasks(); track task._id; let i = $index) {
                <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer group"
                     [style.animation-delay]="(i * 50) + 'ms'" [class]="'animate-slide-up'">
                  <div class="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-slate-800 transition-transform group-hover:scale-125"
                       [class]="priorityDot(task.priority)"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-white truncate">{{ task.title }}</p>
                    <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <i class='bx bxs-folder text-[11px]'></i>
                      {{ task.project?.name ?? 'No project' }}
                      @if (task.dueDate) {
                        <span class="text-slate-600">·</span>
                        <i class='bx bx-calendar text-[11px]'></i>
                        <span [class]="isOverdue(task) ? 'text-rose-400' : 'text-slate-500'">
                          {{ task.dueDate | date:'MMM d' }}
                        </span>
                      }
                    </p>
                  </div>
                  <span class="badge shrink-0 text-[10px]" [class]="statusBadge(task.status)">
                    {{ task.status.replace('_', ' ') }}
                  </span>
                </div>
              }
            </div>
          }

          <!-- Completion Sparkline -->
          @if (!loading() && trendData().length > 0) {
            <div class="mt-5 pt-4 border-t border-white/5">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-500 flex items-center gap-1">
                  <i class='bx bx-line-chart text-indigo-400'></i>
                  Task completions — last 14 days
                </span>
                <span class="text-xs text-indigo-400 font-medium">
                  {{ trendTotal() }} completed
                </span>
              </div>
              <svg [attr.viewBox]="'0 0 ' + sparkW + ' ' + sparkH"
                   class="w-full h-10 overflow-visible" preserveAspectRatio="none">
                <!-- Area fill -->
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path [attr.d]="sparkArea()" fill="url(#sparkGrad)"/>
                <path [attr.d]="sparkLine()" fill="none" stroke="#6366f1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          }
        </div>

        <!-- Right column -->
        <div class="flex flex-col gap-6">

          <!-- Quick Actions -->
          <div class="card animate-slide-up delay-3">
            <div class="flex items-center gap-2 mb-5">
              <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <i class='bx bx-rocket text-violet-400'></i>
              </div>
              <h2 class="font-bold text-white">Quick Actions</h2>
            </div>
            <div class="space-y-1">
              <a routerLink="/tasks"
                 class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform">
                <i class='bx bx-task text-lg text-violet-400'></i>
                <span>View My Tasks</span>
              </a>
              <a routerLink="/chat"
                 class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform">
                <i class='bx bx-chat text-lg text-emerald-400'></i>
                <span>Open Chat</span>
              </a>
              <a routerLink="/notifications"
                 class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform relative">
                <i class='bx bxs-bell text-lg text-amber-400'></i>
                <span>Notifications</span>
                @if (unreadCount() > 0) {
                  <span class="ml-auto bg-rose-500 text-white text-[10px] font-bold
                               min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {{ unreadCount() > 99 ? '99+' : unreadCount() }}
                  </span>
                }
              </a>
              <a routerLink="/profile"
                 class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform">
                <i class='bx bxs-user-circle text-lg text-indigo-400'></i>
                <span>Edit Profile</span>
              </a>
              @if (isManager()) {
                <div class="divider !my-2"></div>
                <a routerLink="/projects"
                   class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform">
                  <i class='bx bxs-folder-open text-lg text-blue-400'></i>
                  <span>Projects</span>
                </a>
                <a routerLink="/analytics"
                   class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform">
                  <i class='bx bx-bar-chart-alt-2 text-lg text-orange-400'></i>
                  <span>Analytics</span>
                </a>
                <a routerLink="/users"
                   class="btn-ghost w-full justify-start gap-3 py-3 hover:translate-x-1 transition-transform">
                  <i class='bx bxs-user-detail text-lg text-rose-400'></i>
                  <span>Manage Users</span>
                </a>
              }
            </div>
          </div>

          <!-- My Productivity mini-card -->
          @if (!loading() && userStats()) {
            <div class="card animate-slide-up delay-4 border-indigo-500/20">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <i class='bx bx-user-check text-indigo-400'></i>
                </div>
                <h2 class="font-bold text-white text-sm">My Productivity</h2>
              </div>
              <!-- completion rate ring -->
              <div class="flex items-center gap-4 mb-4">
                <div class="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" stroke-width="3"
                            stroke-dasharray="100" stroke-linecap="round"
                            [attr.stroke-dashoffset]="100 - (userStats()?.completionRate ?? 0)"/>
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {{ userStats()?.completionRate ?? 0 }}%
                  </span>
                </div>
                <div class="text-sm text-slate-400 leading-relaxed">
                  <span class="text-white font-semibold">{{ userStats()?.completedTasks ?? 0 }}</span> of
                  <span class="text-white font-semibold">{{ userStats()?.totalTasks ?? 0 }}</span> tasks completed
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-center">
                <div class="rounded-xl bg-rose-500/10 p-2">
                  <div class="text-rose-400 font-bold">{{ userStats()?.overdueTasks ?? 0 }}</div>
                  <div class="text-[10px] text-slate-500">Overdue</div>
                </div>
                <div class="rounded-xl bg-violet-500/10 p-2">
                  <div class="text-violet-400 font-bold">{{ userStats()?.totalLoggedHours ?? 0 }}h</div>
                  <div class="text-[10px] text-slate-500">Logged Hours</div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ── Activity Feed (managers only) ───────────────────────────── -->
      @if (isManager()) {
        <div class="card animate-slide-up delay-3">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <i class='bx bx-history text-amber-400'></i>
              </div>
              <h2 class="font-bold text-white">Recent Activity</h2>
            </div>
            <a routerLink="/analytics" class="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
              Full report <i class='bx bx-right-arrow-alt'></i>
            </a>
          </div>

          @if (loading()) {
            <div class="space-y-3">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="flex items-start gap-3">
                  <div class="skeleton w-8 h-8 skeleton-circle shrink-0"></div>
                  <div class="flex-1 space-y-1.5 pt-1">
                    <div class="skeleton h-3 rounded-lg w-2/3"></div>
                    <div class="skeleton h-2.5 rounded w-1/4"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (activityFeed().length === 0) {
            <div class="text-center py-8">
              <i class='bx bx-history text-3xl text-slate-600 mb-2 block'></i>
              <p class="text-slate-500 text-sm">No recent activity</p>
            </div>
          } @else {
            <div class="space-y-1">
              @for (entry of activityFeed(); track entry._id; let i = $index) {
                <div class="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                     [style.animation-delay]="(i * 40) + 'ms'" class="animate-slide-up">
                  <!-- Avatar -->
                  <div class="w-8 h-8 rounded-full shrink-0 bg-slate-700 overflow-hidden flex items-center justify-center">
                    @if (entry.actorId?.avatar) {
                      <img [src]="entry.actorId!.avatar" [alt]="entry.actorId!.name" class="w-full h-full object-cover">
                    } @else {
                      <span class="text-xs font-bold text-slate-300">
                        {{ (entry.actorId?.name ?? 'U')[0].toUpperCase() }}
                      </span>
                    }
                  </div>
                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-slate-300 leading-snug">
                      <span class="font-medium text-white">{{ entry.actorId?.name ?? 'System' }}</span>
                      {{ formatAction(entry.action, entry.resourceType) }}
                    </p>
                    <p class="text-[11px] text-slate-600 mt-0.5">{{ relativeTime(entry.createdAt) }}</p>
                  </div>
                  <!-- Resource type pill -->
                  <span class="text-[10px] px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                        [class]="resourceBadge(entry.resourceType)">
                    {{ entry.resourceType }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

    </div>
  `,
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading     = signal(true);
  error       = signal<string | null>(null);
  userStats   = signal<UserStats | null>(null);
  orgOverview = signal<OrgOverview | null>(null);
  activityFeed = signal<ActivityEntry[]>([]);
  recentTasks = signal<any[]>([]);
  trendData   = signal<{ date: string; count: number }[]>([]);
  unreadCount = signal(0);

  // Sparkline dimensions
  readonly sparkW = 400;
  readonly sparkH = 40;

  constructor(
    private svc:  DashboardService,
    readonly auth: AuthService,
  ) {}

  firstName   = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? 'there');
  isManager   = computed(() => [Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN].includes(this.auth.userRole() as Role));
  timeOfDay   = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
  greetEmoji  = () => { const h = new Date().getHours(); return h < 12 ? '☀️' : h < 17 ? '🌤️' : '🌙'; };
  openTasks   = computed(() => {
    const s = this.userStats();
    return s ? (s.totalTasks - s.completedTasks) : 0;
  });
  overdueTasks = computed(() => this.userStats()?.overdueTasks ?? 0);
  trendTotal   = computed(() => this.trendData().reduce((acc, d) => acc + d.count, 0));

  ngOnInit(): void {
    if (this.isManager()) {
      this.svc.loadManagerData().pipe(
        takeUntil(this.destroy$),
        catchError(err => { this.error.set('Failed to load some dashboard data. Some widgets may be incomplete.'); return of(null); }),
      ).subscribe(data => {
        if (data) {
          this.userStats.set(data.userStats);
          this.recentTasks.set(data.recentTasks);
          this.trendData.set(data.trend);
          this.unreadCount.set(data.unreadCount);
          this.orgOverview.set(data.orgOverview);
          this.activityFeed.set(data.activity);
        }
        this.loading.set(false);
        this.runGsapCountUp();
      });
    } else {
      this.svc.loadMemberData().pipe(
        takeUntil(this.destroy$),
        catchError(err => { this.error.set('Failed to load dashboard data. Please refresh the page.'); return of(null); }),
      ).subscribe(data => {
        if (data) {
          this.userStats.set(data.userStats);
          this.recentTasks.set(data.recentTasks);
          this.trendData.set(data.trend);
          this.unreadCount.set(data.unreadCount);
        }
        this.loading.set(false);
        this.runGsapCountUp();
      });
    }
  }

  ngAfterViewInit() { this.runGsapEntrance(); }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ── Sparkline SVG helpers ──────────────────────────────────────────────────

  sparkLine(): string {
    const data = this.trendData();
    if (!data.length) return '';
    const max = Math.max(...data.map(d => d.count), 1);
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * this.sparkW;
      const y = this.sparkH - (d.count / max) * this.sparkH;
      return `${x},${y}`;
    });
    return `M ${pts.join(' L ')}`;
  }

  sparkArea(): string {
    const data = this.trendData();
    if (!data.length) return '';
    const max = Math.max(...data.map(d => d.count), 1);
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * this.sparkW;
      const y = this.sparkH - (d.count / max) * this.sparkH;
      return `${x},${y}`;
    });
    const first = `${0},${this.sparkH}`;
    const last  = `${this.sparkW},${this.sparkH}`;
    return `M ${first} L ${pts.join(' L ')} L ${last} Z`;
  }

  // ── Activity helpers ───────────────────────────────────────────────────────

  formatAction(action: string, resourceType: string): string {
    const map: Record<string, string> = {
      created:       'created a',
      updated:       'updated a',
      deleted:       'deleted a',
      status_change: 'changed the status of a',
      assigned:      'was assigned to a',
      commented:     'commented on a',
      logged_time:   'logged time on a',
    };
    return `${map[action] ?? action} ${resourceType.toLowerCase()}`;
  }

  relativeTime(iso: string): string {
    const diff  = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  resourceBadge(type: string): string {
    const isLight = document.documentElement.classList.contains('light');
    if (isLight) {
      const lightMap: Record<string, string> = {
        Task:    'bg-indigo-50 text-indigo-600',
        Project: 'bg-blue-50 text-blue-600',
        User:    'bg-violet-50 text-violet-600',
        Team:    'bg-teal-50 text-teal-600',
        Comment: 'bg-emerald-50 text-emerald-600',
      };
      return lightMap[type] ?? 'bg-slate-50 text-slate-600';
    }
    const map: Record<string, string> = {
      Task:    'bg-indigo-500/15 text-indigo-400',
      Project: 'bg-blue-500/15 text-blue-400',
      User:    'bg-violet-500/15 text-violet-400',
      Team:    'bg-amber-500/15 text-amber-400',
      Comment: 'bg-emerald-500/15 text-emerald-400',
    };
    return map[type] ?? 'bg-slate-500/15 text-slate-400';
  }

  isOverdue(task: any): boolean {
    return task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
  }

  // ── Task card helpers ──────────────────────────────────────────────────────

  priorityDot(priority: string): string {
    return ({
      critical: 'bg-rose-500 ring-rose-500/30',
      high:     'bg-orange-500 ring-orange-500/30',
      medium:   'bg-amber-500 ring-amber-500/30',
      low:      'bg-slate-500 ring-slate-500/30',
    } as any)[priority] ?? 'bg-slate-500 ring-slate-500/30';
  }

  statusBadge(status: string): string {
    return ({
      todo:        'badge-slate',
      in_progress: 'badge-indigo',
      in_review:   'badge-violet',
      blocked:     'badge-rose',
      done:        'badge-emerald',
      cancelled:   'badge-slate',
    } as any)[status] ?? 'badge-slate';
  }

  // ── GSAP animations ───────────────────────────────────────────────────────

  private runGsapEntrance() {
    try {
      import('gsap').then(({ gsap }) => {
        gsap.from('.stat-card', {
          y: 30, opacity: 0, duration: 0.6, stagger: 0.1,
          ease: 'power3.out', delay: 0.1,
        });
      }).catch(() => {});
    } catch (_) {}
  }

  private runGsapCountUp() {
    try {
      import('gsap').then(({ gsap }) => {
        const els = document.querySelectorAll('.animate-count-up');
        els.forEach(el => {
          const final = parseInt((el as HTMLElement).innerText, 10) || 0;
          const obj = { val: 0 };
          gsap.to(obj, {
            val: final, duration: 1.2, ease: 'power2.out',
            onUpdate: () => { (el as HTMLElement).innerText = Math.round(obj.val).toString(); },
          });
        });
      }).catch(() => {});
    } catch (_) {}
  }
}
