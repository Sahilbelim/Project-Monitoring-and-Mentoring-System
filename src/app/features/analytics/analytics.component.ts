import { Component, OnInit, signal, computed, inject, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { HttpClient }   from '@angular/common/http';
import { environment }  from '../../../environments/environment';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Overview {
  projects: { total: number; active: number; completed: number };
  tasks:    { total: number; done: number; overdue: number; completionRate: number; inProgress?: number; todo?: number };
  members:  { total: number };
  departments: number; teams: number;
}
interface WorkloadItem  { name: string; email: string; taskCount: number; overdueCount: number; highPriorityCount: number; }
interface TrendItem     { date: string; count: number; }
interface VelocityItem  { year: number; week: number; count: number; storyPoints: number; }
interface TeamStat      { name: string; memberCount: number; tasks: { total: number; done: number; overdue: number; completionRate: number }; totalLoggedHours: number; }
interface ActivityItem  { action: string; actorId?: { name: string }; createdAt: string; resourceType?: string; }
interface PriorityItem  { priority: string; total: number; done: number; overdue: number; }
interface DeptStat              { name: string; color: string | null; memberCount: number; total: number; done: number; overdue: number; completionRate: number; }
interface ProjectProgressItem   { projectId: string; name: string; progress: number; deadline: string | null; status: string; color: string; }
interface UserRoleItem          { role: string; count: number; }
interface VerificationRoleItem  { role: string; verified: number; unverified: number; total: number; }
interface LoginActivityItem     { userId: string; name: string; loginCount: number; lastLoginAt: string | null; }
interface HeatmapItem           { date: string; count: number; }
interface TasksPerProjectItem   { projectId: string; name: string; count: number; }

// ── SVG Chart Helpers ─────────────────────────────────────────────────────────
function buildAreaPath(points: {x: number; y: number}[], w: number, h: number): string {
  if (!points.length) return '';
  const pts = points.map(p => `${p.x},${p.y}`).join(' L ');
  const last = points[points.length - 1];
  const first = points[0];
  return `M ${pts} L ${last.x},${h} L ${first.x},${h} Z`;
}

function buildLinePath(points: {x: number; y: number}[]): string {
  if (!points.length) return '';
  return 'M ' + points.map(p => `${p.x},${p.y}`).join(' L ');
}

function donutSegments(slices: {value: number; color: string}[], cx: number, cy: number, r: number, sw: number): string[] {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (!total) return [];
  const result: string[] = [];
  let startAngle = -90;
  for (const sl of slices) {
    const swept = (sl.value / total) * 360;
    const endAngle = startAngle + swept;
    const r1 = (Math.PI / 180) * startAngle;
    const r2 = (Math.PI / 180) * endAngle;
    const x1 = cx + r * Math.cos(r1);
    const y1 = cy + r * Math.sin(r1);
    const x2 = cx + r * Math.cos(r2);
    const y2 = cy + r * Math.sin(r2);
    const large = swept > 180 ? 1 : 0;
    result.push(`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
    startAngle = endAngle;
  }
  return result;
}

@Component({
  selector:   'app-analytics',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  styles: [`
    .chart-bar { transition: height 0.8s cubic-bezier(.4,0,.2,1); }
    .kpi-card { transition: transform 0.2s, box-shadow 0.2s; }
    .kpi-card:hover { transform: translateY(-2px); }
    .donut-segment { transition: stroke-dashoffset 1s cubic-bezier(.4,0,.2,1); }
  `],
  template: `
<div class="space-y-6 max-w-7xl mx-auto">

  <!-- ── Hero Header ──────────────────────────────────────────────────────── -->
  <div class="relative overflow-hidden rounded-2xl border p-6 hero-gradient-indigo">
    <div class="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 w-40 h-28 rounded-full bg-violet-500/10 blur-2xl pointer-events-none"></div>
    <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <i class='bx bx-bar-chart-alt-2 text-2xl text-indigo-400'></i>
          </div>
          <div>
            <h1 class="text-2xl font-black text-white">Analytics</h1>
            <p class="text-xs text-slate-400">Organisation-wide insights &amp; performance metrics</p>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <select [ngModel]="selectedTeamId()" (ngModelChange)="onTeamChange($event)"
                class="bg-slate-800/80 border border-slate-700 text-white text-sm rounded-xl px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition hover:border-slate-600">
          <option [value]="null">All Teams</option>
          @for (team of teamsList(); track team._id) {
            <option [value]="team._id">{{ team.name }}</option>
          }
        </select>
        <!-- Period selector -->
        <div class="flex gap-1 bg-slate-800/80 border border-slate-700 rounded-xl p-1">
          @for (d of [7, 14, 30]; track d) {
            <button (click)="trendDays = d; loadTrend()"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    [class]="trendDays === d ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'">
              {{ d }}d
            </button>
          }
        </div>
        <button (click)="loadAll()" [disabled]="loading()"
                class="btn-ghost btn-sm flex items-center gap-1.5"
                [class.opacity-50]="loading()">
          <i class='bx text-sm' [class]="loading() ? 'bx-loader-alt animate-spin' : 'bx-refresh'"></i> Refresh
        </button>
      </div>
    </div>
  </div>

  <!-- ── KPI Cards ─────────────────────────────────────────────────────────── -->
  @if (loading()) {
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      @for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-28 rounded-2xl"></div> }
    </div>
  } @else if (overview()) {
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

      <!-- Projects -->
      <div class="kpi-card relative overflow-hidden rounded-2xl p-5 border border-blue-500/20"
           style="background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(15,23,42,0.9))">
        <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-blue-500/10 blur-xl"></div>
        <i class='bx bxs-folder text-blue-400 text-2xl mb-2'></i>
        <p class="text-3xl font-black text-white">{{ overview()!.projects.total }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Projects</p>
        <div class="flex gap-1.5 mt-2">
          <span class="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">{{ overview()!.projects.active }} active</span>
          <span class="text-[10px] px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded-full">{{ overview()!.projects.completed }} done</span>
        </div>
      </div>

      <!-- Total Tasks -->
      <div class="kpi-card relative overflow-hidden rounded-2xl p-5 border border-indigo-500/20"
           style="background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(15,23,42,0.9))">
        <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-indigo-500/10 blur-xl"></div>
        <i class='bx bx-task text-indigo-400 text-2xl mb-2'></i>
        <p class="text-3xl font-black text-white">{{ overview()!.tasks.total }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Total Tasks</p>
        <div class="flex gap-1.5 mt-2">
          <span class="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">{{ overview()!.tasks.done }} done</span>
        </div>
      </div>

      <!-- Completion Rate -->
      <div class="kpi-card relative overflow-hidden rounded-2xl p-5 border"
           [class]="rateColor(overview()!.tasks.completionRate).border"
           [style]="rateColor(overview()!.tasks.completionRate).bg">
        <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl" [class]="rateColor(overview()!.tasks.completionRate).glow"></div>
        <i class='bx bxs-check-circle text-2xl mb-2' [class]="rateColor(overview()!.tasks.completionRate).icon"></i>
        <p class="text-3xl font-black" [class]="rateColor(overview()!.tasks.completionRate).text">{{ overview()!.tasks.completionRate }}%</p>
        <p class="text-xs text-slate-400 mt-0.5">Completion Rate</p>
        <!-- Mini progress bar -->
        <div class="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-1000"
               [class]="rateColor(overview()!.tasks.completionRate).bar"
               [style.width.%]="overview()!.tasks.completionRate"></div>
        </div>
      </div>

      <!-- Overdue -->
      <!-- <div class="kpi-card relative overflow-hidden rounded-2xl p-5 border"
           [class]="overview()!.tasks.overdue > 0 ? 'border-rose-500/20' : 'border-emerald-500/20'"
           [style]="overview()!.tasks.overdue > 0 ? 'background:linear-gradient(135deg, rgba(239,68,68,0.12), rgba(15,23,42,0.9))' : 'background:linear-gradient(135deg, rgba(16,185,129,0.08), rgba(15,23,42,0.9))'">
        <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-xl"
             [class]="overview()!.tasks.overdue > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10'"></div>
        <i class='bx bx-time-five text-2xl mb-2' [class]="overview()!.tasks.overdue > 0 ? 'text-rose-400' : 'text-emerald-400'"></i>
        <p class="text-3xl font-black" [class]="overview()!.tasks.overdue > 0 ? 'text-rose-400' : 'text-emerald-400'">
          {{ overview()!.tasks.overdue }}
        </p>
        <p class="text-xs text-slate-400 mt-0.5">Overdue Tasks</p>
        @if (overview()!.tasks.overdue === 0) {
          <p class="text-[10px] text-emerald-400 mt-2">✓ On track</p>
        }
      </div> -->

    <!-- Overdue -->
<div class="kpi-card relative overflow-hidden rounded-2xl p-5 border border-rose-500/20"
     style="background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(15,23,42,0.9))">

  <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-rose-500/10 blur-xl"></div>

  <i class='bx bx-time-five text-rose-400 text-2xl mb-2'></i>

  <p class="text-3xl font-black text-white">
    {{ overview()!.tasks.overdue }}
  </p>

  <p class="text-xs text-slate-400 mt-0.5">Overdue Tasks</p>

  @if (overview()!.tasks.overdue === 0) {
    <p class="text-[10px] text-emerald-400 mt-2">✓ On track</p>
  } @else {
    <p class="text-[10px] text-rose-400 mt-2">⚠ Needs attention</p>
  }

</div>

      <!-- Members -->
      <div class="kpi-card relative overflow-hidden rounded-2xl p-5 border border-violet-500/20"
           style="background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(15,23,42,0.9))">
        <div class="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl"></div>
        <i class='bx bxs-group text-violet-400 text-2xl mb-2'></i>
        <p class="text-3xl font-black text-white">{{ overview()!.members.total }}</p>
        <p class="text-xs text-slate-400 mt-0.5">Members</p>
        <div class="flex gap-1.5 mt-2">
          <span class="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded-full">{{ overview()!.teams }} teams</span>
          <span class="text-[10px] px-1.5 py-0.5 bg-slate-500/20 text-slate-400 rounded-full">{{ overview()!.departments }} depts</span>
        </div>
      </div>
    </div>
  }

  <!-- ── Row 2: Task Status Donut + Task Priority Bars ─────────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- 1. Task Status Distribution (Donut) -->
    <div class="card flex flex-col">
      <h3 class="font-bold text-white mb-1">Task Status Distribution</h3>
      <p class="text-xs text-slate-400 mb-4">Workflow health at a glance</p>
      @if (loading()) {
        <div class="skeleton h-48 rounded-xl flex-1"></div>
      } @else if (!overview()) {
        <div class="flex-1 flex items-center justify-center text-slate-500 text-sm">No data</div>
      } @else {
        <div class="flex flex-col items-center gap-4 flex-1">
          <div class="relative">
            <svg viewBox="0 0 160 160" class="w-36 h-36">
              @for (seg of donutSegs(); track $index) {
                <path [attr.d]="seg.path" [attr.stroke]="seg.color" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.9"/>
              }
              <text x="80" y="75" text-anchor="middle" fill="white" font-size="22" font-weight="800">{{ overview()!.tasks.completionRate }}%</text>
              <text x="80" y="93" text-anchor="middle" fill="#64748b" font-size="9">completed</text>
            </svg>
          </div>
          <div class="w-full space-y-2">
            @for (sl of statusSlices(); track sl.label) {
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="sl.color"></span>
                  <span class="text-xs text-slate-400">{{ sl.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" [style.width.%]="sl.pct" [style.background]="sl.color"></div>
                  </div>
                  <span class="text-xs text-white font-medium w-6 text-right">{{ sl.value }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- 2. Task Priority Distribution (Vertical Bars) -->
    <div class="lg:col-span-2 card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Task Priority Distribution</h3>
          <p class="text-xs text-slate-400 mt-0.5">Urgency pressure across tasks</p>
        </div>
        <span class="text-xs text-slate-500">{{ priorityTotal() }} tasks</span>
      </div>
      @if (priorityLoading()) {
        <div class="skeleton h-48 rounded-xl"></div>
      } @else if (priorities().length === 0) {
        <div class="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>
      } @else {
        <div class="flex items-end gap-3 h-48 px-4 relative">
          <div class="absolute bottom-6 left-4 right-4 h-px bg-slate-700/60"></div>
          @for (p of priorities(); track p.priority) {
            <div class="flex-1 flex flex-col items-center gap-1 group cursor-pointer relative">
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-xl">
                {{ p.priority || 'none' }}: <strong>{{ p.total }}</strong> total · {{ p.done }} done
                @if (p.overdue > 0) { · {{ p.overdue }} overdue }
              </div>
              <span class="text-[10px] text-white font-bold">{{ p.total }}</span>
              <div class="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden"
                   [style.height]="priorityBarH(p.total) + 'px'">
                <div class="absolute inset-0 rounded-t-lg" [style.background]="'linear-gradient(180deg, ' + priorityColor(p.priority) + ', ' + priorityColor(p.priority) + '99)'"></div>
                @if (p.overdue > 0) {
                  <div class="absolute bottom-0 left-0 right-0 bg-rose-500/80" [style.height]="(p.total ? (p.overdue/p.total)*100 : 0) + '%'"></div>
                }
              </div>
              <p class="text-[10px] text-slate-500 mt-1 capitalize">{{ p.priority || 'none' }}</p>
            </div>
          }
        </div>
        <div class="flex gap-4 mt-3 pt-2 border-t border-slate-700/40">
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-rose-500/80 rounded-full"></span>Overdue portion</div>
        </div>
      }
    </div>
  </div>

  <!-- ── Row 3: Tasks per Project + Assignee Workload ──────────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- 3. Tasks per Project (Horizontal Bar) -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Tasks per Project</h3>
          <p class="text-xs text-slate-400 mt-0.5">Which projects are overloaded</p>
        </div>
      </div>
      @if (tasksPerProjectLoading()) {
        <div class="space-y-3">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-8 rounded-lg"></div> }</div>
      } @else if (tasksPerProject().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bx-folder text-4xl mb-2 opacity-30'></i><p class="text-sm">No project data</p></div>
      } @else {
        <div class="space-y-3">
          @for (p of tasksPerProject(); track p.projectId; let i = $index) {
            <div class="group cursor-pointer relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-white truncate max-w-[70%]">{{ p.name }}</span>
                <span class="text-xs text-slate-400 font-bold">{{ p.count }}</span>
              </div>
              <div class="h-5 bg-slate-800/60 rounded-lg overflow-hidden relative">
                <div class="h-full rounded-lg transition-all duration-700"
                     [style.width.%]="tppMax() ? (p.count / tppMax()) * 100 : 0"
                     [style.background]="'linear-gradient(90deg, ' + teamGradient(i).replace('135deg','90deg') + ')'"></div>
              </div>
              <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-xl">
                {{ p.name }}: <strong>{{ p.count }}</strong> tasks
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- 4. Assignee Workload (Horizontal Bar) — reuses existing workload data -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Assignee Workload</h3>
          <p class="text-xs text-slate-400 mt-0.5">Detect overload & imbalance</p>
        </div>
        <span class="text-xs text-slate-500">{{ workload().length }} members</span>
      </div>
      @if (workloadLoading()) {
        <div class="space-y-3">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-8 rounded-lg"></div> }</div>
      } @else if (workload().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bxs-user-account text-4xl mb-2 opacity-30'></i><p class="text-sm">No workload data</p></div>
      } @else {
        <div class="space-y-3">
          @for (w of workload().slice(0,10); track w.name; let i = $index) {
            <div class="group cursor-pointer relative">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" [style.background]="memberColor(i)">{{ w.name.charAt(0).toUpperCase() }}</div>
                  <span class="text-xs text-white truncate max-w-[140px]">{{ w.name }}</span>
                </div>
                <span class="text-xs text-slate-400 font-bold">{{ w.taskCount }}</span>
              </div>
              <div class="h-5 bg-slate-800/60 rounded-lg overflow-hidden flex">
                @if (w.overdueCount > 0) {
                  <div class="h-full bg-rose-500 transition-all duration-700" [style.width.%]="workloadMax() ? (w.overdueCount / workloadMax()) * 100 : 0"></div>
                }
                @if (w.highPriorityCount > 0) {
                  <div class="h-full bg-amber-500 transition-all duration-700" [style.width.%]="workloadMax() ? (w.highPriorityCount / workloadMax()) * 100 : 0"></div>
                }
                <div class="h-full bg-indigo-500 transition-all duration-700" [style.width.%]="workloadMax() ? ((w.taskCount - w.overdueCount - w.highPriorityCount) / workloadMax()) * 100 : 0"></div>
              </div>
              <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-xl">
                {{ w.name }}: {{ w.taskCount }} tasks · {{ w.overdueCount }} overdue · {{ w.highPriorityCount }} high
              </div>
            </div>
          }
        </div>
        <div class="flex gap-4 mt-3 pt-2 border-t border-slate-700/40">
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-rose-500 rounded-full"></span>Overdue</div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-amber-500 rounded-full"></span>High</div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-indigo-500 rounded-full"></span>Normal</div>
        </div>
      }
    </div>
  </div>

  <!-- ── Row 3b: Project Progress + User Role Distribution ─────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- 5. Project Progress (Horizontal progress bars) -->
    <div class="lg:col-span-2 card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Project Progress</h3>
          <p class="text-xs text-slate-400 mt-0.5">Completion % across active projects</p>
        </div>
        <span class="text-xs text-slate-500">{{ projectProgress().length }} projects</span>
      </div>
      @if (projectProgressLoading()) {
        <div class="space-y-3">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-8 rounded-lg"></div> }</div>
      } @else if (projectProgress().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bx-folder text-4xl mb-2 opacity-30'></i><p class="text-sm">No projects</p></div>
      } @else {
        <div class="space-y-3">
          @for (p of projectProgress(); track p.projectId; let i = $index) {
            <div class="group cursor-pointer relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-white truncate max-w-[65%]">{{ p.name }}</span>
                <div class="flex items-center gap-2">
                  @if (p.deadline) {
                    <span class="text-[10px] text-slate-500">{{ formatDate(p.deadline) }}</span>
                  }
                  <span class="text-xs font-bold" [class]="rateColor(p.progress).text">{{ p.progress }}%</span>
                </div>
              </div>
              <div class="h-5 bg-slate-800/60 rounded-lg overflow-hidden relative">
                <div class="h-full rounded-lg transition-all duration-700"
                     [style.width.%]="p.progress"
                     [style.background]="'linear-gradient(90deg, ' + (p.color || '#6366f1') + ', ' + (p.color || '#6366f1') + '99)'">
                </div>
                <div class="absolute inset-0 hidden group-hover:flex items-center px-2">
                  <span class="text-[10px] text-white">{{ p.status }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- 6. User Role Distribution (Donut) -->
    <div class="card flex flex-col">
      <h3 class="font-bold text-white mb-1">User Roles</h3>
      <p class="text-xs text-slate-400 mb-4">Organisation member distribution</p>
      @if (userRolesLoading()) {
        <div class="skeleton h-48 rounded-xl flex-1"></div>
      } @else if (userRoles().length === 0) {
        <div class="flex-1 flex items-center justify-center text-slate-500 text-sm">No data</div>
      } @else {
        <div class="flex flex-col items-center gap-4 flex-1">
          <div class="relative">
            <svg viewBox="0 0 160 160" class="w-32 h-32">
              @for (seg of roleDonutSegs(); track $index) {
                <path [attr.d]="seg.path" [attr.stroke]="seg.color" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.9"/>
              }
              <text x="80" y="75" text-anchor="middle" fill="white" font-size="22" font-weight="800">{{ userRolesTotal() }}</text>
              <text x="80" y="93" text-anchor="middle" fill="#64748b" font-size="9">members</text>
            </svg>
          </div>
          <div class="w-full space-y-1.5">
            @for (r of userRoles(); track r.role; let i = $index) {
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="roleColor(i)"></span>
                  <span class="text-xs text-slate-400 capitalize">{{ r.role.replace('_',' ') | lowercase }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-14 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" [style.width.%]="userRolesTotal() ? (r.count / userRolesTotal()) * 100 : 0" [style.background]="roleColor(i)"></div>
                  </div>
                  <span class="text-xs text-white font-medium w-5 text-right">{{ r.count }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  </div>

  <!-- ── Row 3c: Verification by Role + Login Activity ─────────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- 7. Verification by Role (Stacked Horizontal Bars) -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Email Verification by Role</h3>
          <p class="text-xs text-slate-400 mt-0.5">Verified vs unverified count per role</p>
        </div>
      </div>
      @if (verificationLoading()) {
        <div class="space-y-3">@for (i of [1,2,3]; track i) { <div class="skeleton h-10 rounded-lg"></div> }</div>
      } @else if (verificationRoles().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bx-shield text-4xl mb-2 opacity-30'></i><p class="text-sm">No data</p></div>
      } @else {
        <div class="space-y-3">
          @for (rv of verificationRoles(); track rv.role) {
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-white capitalize">{{ rv.role.replace('_',' ') | lowercase }}</span>
                <span class="text-[10px] text-slate-400">{{ rv.verified }}/{{ rv.total }} verified</span>
              </div>
              <div class="h-5 bg-slate-800/60 rounded-lg overflow-hidden flex">
                <div class="h-full bg-emerald-500 transition-all duration-700 flex items-center justify-center"
                     [style.width.%]="rv.total ? (rv.verified / rv.total) * 100 : 0">
                  @if (rv.total && (rv.verified / rv.total) > 0.15) {
                    <span class="text-[9px] text-white font-bold">{{ rv.verified }}</span>
                  }
                </div>
                <div class="h-full bg-rose-500/70 transition-all duration-700 flex items-center justify-center"
                     [style.width.%]="rv.total ? (rv.unverified / rv.total) * 100 : 0">
                  @if (rv.total && (rv.unverified / rv.total) > 0.15) {
                    <span class="text-[9px] text-white font-bold">{{ rv.unverified }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
        <div class="flex gap-4 mt-3 pt-2 border-t border-slate-700/40">
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-emerald-500 rounded-full"></span>Verified</div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-rose-500/70 rounded-full"></span>Unverified</div>
        </div>
      }
    </div>

    <!-- 8. Login Activity (Horizontal Bars) -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Login Activity</h3>
          <p class="text-xs text-slate-400 mt-0.5">Most active users by login count</p>
        </div>
        <span class="text-xs text-slate-500">top {{ loginActivity().length }}</span>
      </div>
      @if (loginActivityLoading()) {
        <div class="space-y-3">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-8 rounded-lg"></div> }</div>
      } @else if (loginActivity().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bx-log-in text-4xl mb-2 opacity-30'></i><p class="text-sm">No login data</p></div>
      } @else {
        <div class="space-y-3">
          @for (u of loginActivity(); track u.userId; let i = $index) {
            <div class="group cursor-pointer relative">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" [style.background]="memberColor(i)">{{ u.name.charAt(0).toUpperCase() }}</div>
                  <span class="text-xs text-white truncate max-w-[130px]">{{ u.name }}</span>
                </div>
                <span class="text-xs font-bold text-slate-400">{{ u.loginCount }}</span>
              </div>
              <div class="h-5 bg-slate-800/60 rounded-lg overflow-hidden">
                <div class="h-full rounded-lg transition-all duration-700"
                     [style.width.%]="loginMax() ? (u.loginCount / loginMax()) * 100 : 0"
                     [style.background]="memberColor(i)">
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  </div>

  <!-- ── Row 3d: Team Member Count + Deadline Heatmap ─────────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- 9. Team Member Count (Vertical Bars) -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Team Size</h3>
          <p class="text-xs text-slate-400 mt-0.5">Members per team</p>
        </div>
        <span class="text-xs text-slate-500">{{ teams().length }} teams</span>
      </div>
      @if (teamsLoading()) {
        <div class="skeleton h-40 rounded-xl"></div>
      } @else if (teams().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bxs-group text-4xl mb-2 opacity-30'></i><p class="text-sm">No teams</p></div>
      } @else {
        <div class="flex items-end gap-2 h-40 px-2 relative">
          <div class="absolute bottom-6 left-2 right-2 h-px bg-slate-700/60"></div>
          @for (t of teams(); track t.name; let i = $index) {
            <div class="flex-1 flex flex-col items-center gap-1 group cursor-pointer relative">
              <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 border border-slate-700 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-xl">
                {{ t.name }}: <strong>{{ t.memberCount }}</strong> members
              </div>
              <span class="text-[10px] text-white font-bold">{{ t.memberCount }}</span>
              <div class="w-full rounded-t-lg transition-all duration-700"
                   [style.height]="teamBarH(t.memberCount) + 'px'"
                   [style.background]="teamGradient(i)">
              </div>
              <p class="text-[9px] text-slate-500 mt-1 truncate w-full text-center">{{ t.name }}</p>
            </div>
          }
        </div>
      }
    </div>

    <!-- 10. Deadline Heatmap (Calendar-style) -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Deadline Heatmap</h3>
          <p class="text-xs text-slate-400 mt-0.5">Tasks due by day (next 60 days)</p>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span class="w-3 h-3 rounded-sm bg-indigo-500/20"></span>
          <span class="w-3 h-3 rounded-sm bg-indigo-500/50"></span>
          <span class="w-3 h-3 rounded-sm bg-indigo-500"></span>
          <span>busy</span>
        </div>
      </div>
      @if (heatmapLoading()) {
        <div class="skeleton h-40 rounded-xl"></div>
      } @else if (heatmapCells().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500"><i class='bx bx-calendar text-4xl mb-2 opacity-30'></i><p class="text-sm">No upcoming deadlines</p></div>
      } @else {
        <div class="overflow-x-auto">
          <div class="flex gap-1" style="min-width:300px">
            @for (week of heatmapWeeks(); track $index) {
              <div class="flex flex-col gap-1">
                @for (cell of week; track cell.date) {
                  <div class="w-6 h-6 rounded-sm cursor-pointer group relative transition-all duration-200"
                       [style.background]="heatCellColor(cell.count)"
                       [title]="cell.date + ': ' + cell.count + ' tasks'">
                    @if (cell.count > 0) {
                      <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 border border-slate-700 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20 shadow-xl">
                        {{ cell.date | date:'MMM d' }}: {{ cell.count }}
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
          <div class="flex gap-3 mt-3 pt-2 border-t border-slate-700/40">
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-3 h-3 rounded-sm bg-slate-700/60"></span>0</div>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-3 h-3 rounded-sm bg-indigo-500/30"></span>1-2</div>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-3 h-3 rounded-sm bg-indigo-500/60"></span>3-5</div>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-3 h-3 rounded-sm bg-indigo-500"></span>6+</div>
          </div>
        </div>
      }
    </div>
  </div>

  <!-- ── Row 4: Member Workload + Recent Activity ───────────────────────── -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

    <!-- Member Workload -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Member Workload</h3>
          <p class="text-xs text-slate-400 mt-0.5">Active task distribution</p>
        </div>
        <span class="text-xs text-slate-500">{{ workload().length }} members</span>
      </div>
      @if (workloadLoading()) {
        <div class="space-y-3">@for (i of [1,2,3,4]; track i) { <div class="skeleton h-10 rounded-xl"></div> }</div>
      } @else if (workload().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500">
          <i class='bx bxs-user-account text-4xl mb-2 opacity-30'></i>
          <p class="text-sm">No active tasks assigned</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (w of workload(); track w.name; let i = $index) {
            <div class="flex items-center gap-3 group">
              <!-- Avatar -->
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                   [style.background]="memberColor(i)">
                {{ w.name.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm text-white truncate">{{ w.name }}</p>
                  <div class="flex items-center gap-1.5 ml-2 shrink-0">
                    @if (w.overdueCount > 0) {
                      <span class="text-[10px] px-1.5 py-0.5 bg-rose-500/15 text-rose-400 rounded-full">{{ w.overdueCount }} overdue</span>
                    }
                    @if (w.highPriorityCount > 0) {
                      <span class="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full">{{ w.highPriorityCount }} high</span>
                    }
                    <span class="text-xs font-bold text-white">{{ w.taskCount }}</span>
                  </div>
                </div>
                <!-- Segmented bar: shows overdue (red) + high priority (amber) + normal (blue) -->
                <div class="h-2 bg-slate-700/60 rounded-full overflow-hidden flex">
                  @if (w.overdueCount > 0) {
                    <div class="h-full bg-rose-500 transition-all duration-700"
                         [style.width.%]="workloadMax() ? (w.overdueCount / workloadMax()) * 100 : 0"></div>
                  }
                  @if (w.highPriorityCount > 0) {
                    <div class="h-full bg-amber-500 transition-all duration-700"
                         [style.width.%]="workloadMax() ? (w.highPriorityCount / workloadMax()) * 100 : 0"></div>
                  }
                  <div class="h-full bg-indigo-500 transition-all duration-700"
                       [style.width.%]="workloadMax() ? ((w.taskCount - w.overdueCount - w.highPriorityCount) / workloadMax()) * 100 : 0"></div>
                </div>
              </div>
            </div>
          }
        </div>
        <!-- Workload legend -->
        <div class="flex gap-4 mt-4 pt-3 border-t border-slate-700/40">
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-rose-500 rounded-full"></span>Overdue</div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-amber-500 rounded-full"></span>High priority</div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400"><span class="w-2 h-2 bg-indigo-500 rounded-full"></span>Normal</div>
        </div>
      }
    </div>

    <!-- Recent Activity Feed -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="font-bold text-white">Recent Activity</h3>
          <p class="text-xs text-slate-400 mt-0.5">Latest org-wide events</p>
        </div>
        <span class="text-xs text-slate-500">{{ activity().length }} events</span>
      </div>
      @if (activityLoading()) {
        <div class="space-y-2">@for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-11 rounded-xl"></div> }</div>
      } @else if (activity().length === 0) {
        <div class="flex flex-col items-center justify-center py-10 text-slate-500">
          <i class='bx bx-pulse text-4xl mb-2 opacity-30'></i>
          <p class="text-sm">No activity recorded yet</p>
        </div>
      } @else {
        <div class="space-y-0 divide-y divide-slate-700/30">
          @for (evt of activity(); track $index) {
            <div class="flex items-center gap-3 py-2.5">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                   [class]="activityBg(evt.resourceType)">
                <i class='bx text-base' [class]="activityIcon(evt.resourceType)"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-300 truncate">
                  <span class="text-white font-semibold">{{ evt.actorId?.name ?? 'System' }}</span>
                  <span class="text-slate-500"> · </span>{{ formatAction(evt.action) }}
                </p>
                <p class="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                  <i class='bx bx-time-five text-[10px]'></i>{{ timeAgo(evt.createdAt) }}
                  @if (evt.resourceType) { <span class="text-slate-700">·</span> {{ evt.resourceType }} }
                </p>
              </div>
            </div>
          }
        </div>
      }
    </div>
  </div>

</div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/analytics`;

  loading         = signal(true);
  trendLoading    = signal(true);
  velocityLoading = signal(true);
  workloadLoading = signal(true);
  teamsLoading    = signal(true);
  activityLoading = signal(true);

  overview = signal<Overview | null>(null);
  trend    = signal<TrendItem[]>([]);
  velocity = signal<VelocityItem[]>([]);
  workload = signal<WorkloadItem[]>([]);
  teams    = signal<TeamStat[]>([]);
  activity = signal<ActivityItem[]>([]);

  teamsList      = signal<any[]>([]);
  selectedTeamId = signal<string | null>(null);

  trendDays = 14;

  // New data signals
  creationLoading         = signal(true);
  priorityLoading         = signal(true);
  deptLoading             = signal(true);
  projectProgressLoading  = signal(true);
  userRolesLoading        = signal(true);
  verificationLoading     = signal(true);
  loginActivityLoading    = signal(true);
  heatmapLoading          = signal(true);
  tasksPerProjectLoading  = signal(true);

  creationTrend       = signal<TrendItem[]>([]);
  priorities          = signal<PriorityItem[]>([]);
  deptStats           = signal<DeptStat[]>([]);
  projectProgress     = signal<ProjectProgressItem[]>([]);
  userRoles           = signal<UserRoleItem[]>([]);
  verificationRoles   = signal<VerificationRoleItem[]>([]);
  loginActivity       = signal<LoginActivityItem[]>([]);
  heatmap             = signal<HeatmapItem[]>([]);
  tasksPerProject     = signal<TasksPerProjectItem[]>([]);

  // ── Computed helpers ──────────────────────────────────────────────────────
  trendMax   = computed(() => Math.max(...this.trend().map(t => t.count), 1));
  trendTotal = computed(() => this.trend().reduce((sum, t) => sum + t.count, 0));
  trendAvg   = computed(() => this.trend().length ? Math.round(this.trendTotal() / this.trend().length) : 0);

  velocityMax   = computed(() => Math.max(...this.velocity().map(v => v.count), 1));
  velocityTotal = computed(() => this.velocity().reduce((s, v) => s + v.count, 0));
  velocityAvg   = computed(() => {
    const vs = this.velocity();
    return vs.length ? Math.round(vs.reduce((s, v) => s + v.count, 0) / vs.length) : 0;
  });

  workloadMax = computed(() => Math.max(...this.workload().map(w => w.taskCount), 1));
  priorityMax = computed(() => Math.max(...this.priorities().map(p => p.total), 1));
  tppMax      = computed(() => Math.max(...this.tasksPerProject().map(p => p.count), 1));
  loginMax    = computed(() => Math.max(...this.loginActivity().map(u => u.loginCount), 1));

  // User role donut
  userRolesTotal = computed(() => this.userRoles().reduce((s, r) => s + r.count, 0));
  private readonly ROLE_COLORS = ['#6366f1','#8b5cf6','#14b8a6','#f59e0b','#ec4899','#10b981','#06b6d4'];
  roleColor(i: number): string { return this.ROLE_COLORS[i % this.ROLE_COLORS.length]; }

  roleDonutSegs = computed(() => {
    const slices = this.userRoles().map((r, i) => ({ value: r.count, color: this.roleColor(i) }));
    const paths = donutSegments(slices, 80, 80, 58, 22);
    return slices.map((sl, i) => ({ ...sl, path: paths[i] }));
  });

  // Team bar height helper (max = 120px, 24px label pool at bottom)
  private readonly TEAM_BAR_MAX_H = 120;
  teamsMemberMax = computed(() => Math.max(...this.teams().map(t => t.memberCount), 1));
  teamBarH(count: number): number {
    const max = this.teamsMemberMax();
    return max ? Math.max(4, (count / max) * this.TEAM_BAR_MAX_H) : 4;
  }

  // Priority bar height
  private readonly PRI_MAX_H = 140;
  priorityTotal = computed(() => this.priorities().reduce((s, p) => s + p.total, 0));
  priorityBarH(count: number): number {
    const max = this.priorityMax();
    return max ? Math.max(4, (count / max) * this.PRI_MAX_H) : 4;
  }

  // Heatmap: build 7-row week grid from heatmap signal
  heatmapCells = computed(() => this.heatmap());
  heatmapWeeks = computed(() => {
    const data = this.heatmap();
    if (!data.length) return [];
    const map = new Map(data.map(h => [h.date, h.count]));
    // Build 10-week window starting from today (Monday-aligned)
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Sunday of this week
    const weeks: { date: string; count: number }[][] = [];
    for (let w = 0; w < 10; w++) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const dateStr = day.toISOString().slice(0, 10);
        week.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
      }
      weeks.push(week);
    }
    return weeks;
  });

  heatCellColor(count: number): string {
    const isLight = document.documentElement.classList.contains('light');
    if (!count) return isLight ? 'rgba(0,0,0,0.05)' : 'rgba(30,41,59,0.6)';
    if (count <= 2) return 'rgba(99,102,241,0.3)';
    if (count <= 5) return 'rgba(99,102,241,0.6)';
    return '#6366f1';
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Health score: combination of completion rate and overdue ratio
  healthScore = computed(() => {
    const ov = this.overview();
    if (!ov || !ov.tasks.total) return 'N/A';
    const overdueRatio = ov.tasks.overdue / ov.tasks.total;
    const score = Math.max(0, Math.round(ov.tasks.completionRate - (overdueRatio * 30)));
    return score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';
  });

  // Dual-line chart: merge created + completed data
  mergedTrendDates = computed(() => {
    const created = this.creationTrend();
    const completed = this.trend();
    const dates = new Set([...created.map(c => c.date), ...completed.map(c => c.date)]);
    return Array.from(dates).sort();
  });

  private dualMax = computed(() => {
    const cMap = new Map(this.creationTrend().map(c => [c.date, c.count]));
    const dMap = new Map(this.trend().map(c => [c.date, c.count]));
    const dates = this.mergedTrendDates();
    let max = 1;
    for (const d of dates) max = Math.max(max, cMap.get(d) ?? 0, dMap.get(d) ?? 0);
    return max;
  });

  private dualPoints(data: TrendItem[]) {
    const dates = this.mergedTrendDates();
    if (!dates.length) return [];
    const map = new Map(data.map(c => [c.date, c.count]));
    const max = this.dualMax();
    const usableW = this.CHART_W - this.PAD_L - this.PAD_R;
    const usableH = this.CHART_H - this.PAD_B;
    return dates.map((d, i) => {
      const count = map.get(d) ?? 0;
      return {
        x: this.PAD_L + (i / Math.max(dates.length - 1, 1)) * usableW,
        y: usableH - (count / max) * (usableH - 8) + 4,
        count, label: d,
      };
    });
  }

  createdPts   = computed(() => this.dualPoints(this.creationTrend()));
  completedPts = computed(() => this.dualPoints(this.trend()));

  private buildArea(pts: {x:number;y:number}[]): string {
    if (!pts.length) return '';
    const h = this.CHART_H - this.PAD_B;
    return 'M ' + pts.map(p => `${p.x},${p.y}`).join(' L ') + ` L ${pts[pts.length-1].x},${h} L ${pts[0].x},${h} Z`;
  }
  private buildLine(pts: {x:number;y:number}[]): string {
    if (!pts.length) return '';
    return 'M ' + pts.map(p => `${p.x},${p.y}`).join(' L ');
  }

  createdAreaPath   = computed(() => this.buildArea(this.createdPts()));
  createdLinePath   = computed(() => this.buildLine(this.createdPts()));
  completedAreaPath = computed(() => this.buildArea(this.completedPts()));
  completedLinePath = computed(() => this.buildLine(this.completedPts()));

  dualYGuides = computed(() => {
    const max = this.dualMax();
    const usableH = this.CHART_H - this.PAD_B;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = Math.round((max / steps) * i);
      const pos = usableH - (val / max) * (usableH - 8) + 4;
      return { val, pos };
    }).reverse();
  });

  dualXLabels = computed(() => {
    const pts = this.createdPts();
    if (pts.length <= 1) return pts.map(p => ({ x: p.x, label: p.label }));
    const step = Math.max(1, Math.floor(pts.length / 7));
    return pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % step === 0)
              .map(p => ({ x: p.x, label: new Date(p.label).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) }));
  });

  // ── SVG chart computed ─────────────────────────────────────────────────────
  private readonly CHART_W = 600;
  private readonly CHART_H = 140;
  private readonly PAD_L   = 42;
  private readonly PAD_R   = 10;
  private readonly PAD_B   = 18;

  trendPoints = computed(() => {
    const pts = this.trend();
    if (!pts.length) return [];
    const max = this.trendMax();
    const usableW = this.CHART_W - this.PAD_L - this.PAD_R;
    const usableH = this.CHART_H - this.PAD_B;
    return pts.map((pt, i) => ({
      x: this.PAD_L + (i / Math.max(pts.length - 1, 1)) * usableW,
      y: usableH - (pt.count / max) * (usableH - 8) + 4,
      count: pt.count,
      label: pt.date,
    }));
  });

  trendAreaPath = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const h = this.CHART_H - this.PAD_B;
    const line = 'M ' + pts.map(p => `${p.x},${p.y}`).join(' L ');
    return `${line} L ${pts[pts.length - 1].x},${h} L ${pts[0].x},${h} Z`;
  });

  trendLinePath = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    return 'M ' + pts.map(p => `${p.x},${p.y}`).join(' L ');
  });

  yGuides = computed(() => {
    const max = this.trendMax();
    const usableH = this.CHART_H - this.PAD_B;
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = Math.round((max / steps) * i);
      const pos = usableH - (val / max) * (usableH - 8) + 4;
      return { val, pos };
    }).reverse();
  });

  xLabels = computed(() => {
    const pts = this.trendPoints();
    if (pts.length <= 1) return pts.map(p => ({ x: p.x, label: p.label }));
    // Show at most 7 labels
    const step = Math.max(1, Math.floor(pts.length / 7));
    return pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % step === 0)
              .map(p => ({ x: p.x, label: new Date(p.label).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) }));
  });

  // Task status donut slices
  statusSlices = computed(() => {
    const ov = this.overview();
    if (!ov) return [];
    const tot = ov.tasks.total || 1;
    const done = ov.tasks.done;
    const overdue = ov.tasks.overdue;
    const inProg = ov.tasks.inProgress ?? Math.round((tot - done - overdue) * 0.4);
    const todo = tot - done - overdue - inProg;
    return [
      { label: 'Done',        value: done,    color: '#10b981', pct: (done    / tot) * 100 },
      { label: 'In Progress', value: inProg,  color: '#6366f1', pct: (inProg  / tot) * 100 },
      { label: 'Todo',        value: todo,    color: '#64748b', pct: (todo    / tot) * 100 },
      { label: 'Overdue',     value: overdue, color: '#ef4444', pct: (overdue / tot) * 100 },
    ].filter(s => s.value > 0);
  });

  donutSegs = computed(() => {
    const slices = this.statusSlices();
    const paths = donutSegments(slices, 80, 80, 58, 22);
    return slices.map((sl, i) => ({ ...sl, path: paths[i] }));
  });

  // Velocity bar height helper (max bar = 152px, labels 24px at bottom)
  private readonly VEL_MAX_H = 152;
  velBarHeight(count: number): number {
    const max = this.velocityMax();
    return max ? Math.max(4, (count / max) * this.VEL_MAX_H) : 4;
  }

  velAvgLineBottom = computed(() => {
    const avg = this.velocityAvg();
    const max = this.velocityMax();
    // Offset: 24px for labels
    return 24 + (max ? (avg / max) * this.VEL_MAX_H : 0);
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() { this.loadTeams(); this.loadAll(); }

  onTeamChange(id: string | null) { this.selectedTeamId.set(id); this.loadAll(); }

  loadTeams() {
    this.http.get<any>(`${environment.apiUrl}/teams`).subscribe({
      next: r => this.teamsList.set(r.data ?? []),
    });
  }

  loadAll() {
    this.loading.set(true);
    const params: any = {};
    if (this.selectedTeamId()) params.teamId = this.selectedTeamId();

    this.http.get<any>(`${this.base}/overview`, { params }).subscribe({
      next: r  => { this.overview.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.loadTrend();
    this.http.get<any>(`${this.base}/velocity`, { params: { ...params, weeks: '8' } }).subscribe({
      next: r  => { this.velocity.set(r.data?.velocity ?? []); this.velocityLoading.set(false); },
      error: () => this.velocityLoading.set(false),
    });
    this.http.get<any>(`${this.base}/workload`, { params }).subscribe({
      next: r  => { this.workload.set(r.data?.workload ?? []); this.workloadLoading.set(false); },
      error: () => this.workloadLoading.set(false),
    });
    this.http.get<any>(`${this.base}/teams`).subscribe({
      next: r  => { this.teams.set(r.data?.teams ?? []); this.teamsLoading.set(false); },
      error: () => this.teamsLoading.set(false),
    });
    this.http.get<any>(`${this.base}/activity`, { params: { ...params, limit: '20' } }).subscribe({
      next: r  => { this.activity.set(r.data ?? []); this.activityLoading.set(false); },
      error: () => this.activityLoading.set(false),
    });
    // New endpoints
    this.creationLoading.set(true);
    this.priorityLoading.set(true);
    this.deptLoading.set(true);
    this.projectProgressLoading.set(true);
    this.userRolesLoading.set(true);
    this.verificationLoading.set(true);
    this.loginActivityLoading.set(true);
    this.heatmapLoading.set(true);
    this.tasksPerProjectLoading.set(true);

    this.http.get<any>(`${this.base}/creation-trend`, { params: { days: String(this.trendDays) } }).subscribe({
      next: r  => { this.creationTrend.set(r.data?.trend ?? []); this.creationLoading.set(false); },
      error: () => this.creationLoading.set(false),
    });
    this.http.get<any>(`${this.base}/priority-breakdown`).subscribe({
      next: r  => { this.priorities.set(r.data?.priorities ?? []); this.priorityLoading.set(false); },
      error: () => this.priorityLoading.set(false),
    });
    this.http.get<any>(`${this.base}/department-stats`).subscribe({
      next: r  => { this.deptStats.set(r.data?.departments ?? []); this.deptLoading.set(false); },
      error: () => this.deptLoading.set(false),
    });
    this.http.get<any>(`${this.base}/tasks-per-project`).subscribe({
      next: r  => { this.tasksPerProject.set(r.data?.projects ?? []); this.tasksPerProjectLoading.set(false); },
      error: () => this.tasksPerProjectLoading.set(false),
    });
    this.http.get<any>(`${this.base}/project-progress`).subscribe({
      next: r  => { this.projectProgress.set(r.data?.projects ?? []); this.projectProgressLoading.set(false); },
      error: () => this.projectProgressLoading.set(false),
    });
    this.http.get<any>(`${this.base}/user-role-distribution`).subscribe({
      next: r  => { this.userRoles.set(r.data?.roles ?? []); this.userRolesLoading.set(false); },
      error: () => this.userRolesLoading.set(false),
    });
    this.http.get<any>(`${this.base}/verification-by-role`).subscribe({
      next: r  => { this.verificationRoles.set(r.data?.roles ?? []); this.verificationLoading.set(false); },
      error: () => this.verificationLoading.set(false),
    });
    this.http.get<any>(`${this.base}/login-activity`).subscribe({
      next: r  => { this.loginActivity.set(r.data?.users ?? []); this.loginActivityLoading.set(false); },
      error: () => this.loginActivityLoading.set(false),
    });
    this.http.get<any>(`${this.base}/deadline-heatmap`).subscribe({
      next: r  => { this.heatmap.set(r.data?.heatmap ?? []); this.heatmapLoading.set(false); },
      error: () => this.heatmapLoading.set(false),
    });
  }

  loadTrend() {
    this.trendLoading.set(true);
    const params: any = { days: String(this.trendDays) };
    if (this.selectedTeamId()) params.teamId = this.selectedTeamId();
    this.http.get<any>(`${this.base}/completion-trend`, { params }).subscribe({
      next: r  => { this.trend.set(r.data?.trend ?? []); this.trendLoading.set(false); },
      error: () => this.trendLoading.set(false),
    });
  }

  // ── Colour helpers ─────────────────────────────────────────────────────────
  rateColor(rate: number): { text: string; bg: string; bar: string; icon: string; border: string; glow: string } {
    const isLight = document.documentElement.classList.contains('light');
    const darkBg = 'rgba(15,23,42,0.9)';
    
    if (rate >= 70) return {
      text: isLight ? 'text-emerald-600' : 'text-emerald-400',
      bg: isLight ? 'background:#ffffff' : `background:linear-gradient(135deg,rgba(16,185,129,0.12),${darkBg})`,
      bar: 'bg-emerald-500', icon: isLight ? 'text-emerald-600' : 'text-emerald-400',
      border: isLight ? 'border-emerald-200' : 'border-emerald-500/20',
      glow: 'bg-emerald-500/10'
    };
    if (rate >= 40) return {
      text: isLight ? 'text-amber-600' : 'text-amber-400',
      bg: isLight ? 'background:#ffffff' : `background:linear-gradient(135deg,rgba(245,158,11,0.12),${darkBg})`,
      bar: 'bg-amber-500', icon: isLight ? 'text-amber-600' : 'text-amber-400',
      border: isLight ? 'border-amber-200' : 'border-amber-500/20',
      glow: 'bg-amber-500/10'
    };
    return {
      text: isLight ? 'text-rose-600' : 'text-rose-400',
      bg: isLight ? 'background:#ffffff' : `background:linear-gradient(135deg,rgba(239,68,68,0.12),${darkBg})`,
      bar: 'bg-rose-500', icon: isLight ? 'text-rose-600' : 'text-rose-400',
      border: isLight ? 'border-rose-200' : 'border-rose-500/20',
      glow: 'bg-rose-500/10'
    };
  }

  private readonly TEAM_GRADIENTS = [
    'linear-gradient(135deg,#14b8a6,#0d9488)',
    'linear-gradient(135deg,#6366f1,#4f46e5)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#ec4899,#db2777)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#10b981,#059669)',
  ];
  teamGradient(i: number): string { return this.TEAM_GRADIENTS[i % this.TEAM_GRADIENTS.length]; }

  private readonly MEMBER_COLORS = [
    'linear-gradient(135deg,#6366f1,#4f46e5)', 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#ec4899,#db2777)', 'linear-gradient(135deg,#14b8a6,#0d9488)',
    'linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#10b981,#059669)',
  ];
  memberColor(i: number): string { return this.MEMBER_COLORS[i % this.MEMBER_COLORS.length]; }

  priorityColor(priority: string): string {
    return { urgent: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' }[priority] ?? '#64748b';
  }

  private readonly DEPT_GRADIENTS = [
    'linear-gradient(135deg,#06b6d4,#0891b2)',
    'linear-gradient(135deg,#6366f1,#4f46e5)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#ec4899,#db2777)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#10b981,#059669)',
  ];
  deptGradient(i: number): string { return this.DEPT_GRADIENTS[i % this.DEPT_GRADIENTS.length]; }

  activityIcon(type?: string): string {
    return { Task:'bx-task', Project:'bx-folder', Team:'bxs-group', User:'bx-user', Department:'bx-building' }[type ?? ''] ?? 'bx-pulse';
  }

  activityBg(type?: string): string {
    const isLight = document.documentElement.classList.contains('light');
    if (isLight) {
      return { Task:'bg-indigo-50 text-indigo-600', Project:'bg-blue-50 text-blue-600',
               Team:'bg-teal-50 text-teal-600', User:'bg-violet-50 text-violet-600',
               Department:'bg-amber-50 text-amber-600' }[type ?? ''] ?? 'bg-slate-50 text-slate-600';
    }
    return { Task:'bg-indigo-500/15 text-indigo-400', Project:'bg-blue-500/15 text-blue-400',
             Team:'bg-teal-500/15 text-teal-400', User:'bg-violet-500/15 text-violet-400',
             Department:'bg-amber-500/15 text-amber-400' }[type ?? ''] ?? 'bg-slate-500/15 text-slate-400';
  }

  formatAction(action: string): string { return action?.replace(/[._]/g, ' ') ?? 'performed action'; }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
