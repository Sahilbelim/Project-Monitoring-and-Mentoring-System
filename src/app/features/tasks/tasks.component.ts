import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { environment }   from '../../../environments/environment';
import { ToastService }  from '../../core/services/toast.service';
import { AuthService }   from '../../core/services/auth.service';

interface TaskSummary {
  _id: string; title: string; description?: string; status: string;
  priority?: string; assigneeIds?: any[]; dueDate?: string;
  projectId?: any; reporterId?: any;
}

interface TaskDetail extends TaskSummary {
  subtasks?: any[];
  blockedBy?: any[];
  blocks?: any[];
  timeLogs?: any[];
  loggedHours?: number;
  labels?: string[];
  storyPoints?: number;
  completedAt?: string;
  createdAt?: string;
}

interface ActivityItem {
  _id: string; type: string;
  actorId?: { _id: string; name: string; avatar?: string };
  actorName?: string;
  comment?: { text: string; editedAt?: string; isDeleted?: boolean };
  changes?: { field?: string; from?: any; to?: any };
  meta?: any; createdAt: string;
}

interface Project { _id: string; name: string; color?: string; }
interface User    { _id: string; name: string; email: string; avatar?: string; }

const STATUSES   = ['todo','in_progress','in_review','blocked','done','cancelled'];
const PRIORITIES = ['low','medium','high','critical'];
const API        = environment.apiUrl;

@Component({
  selector:   'app-tasks',
  standalone: true,
  imports:    [CommonModule, FormsModule],
  template: `
    <!-- Outer wrapper — relative so the sidebar can be positioned within it -->
    <div class="relative flex h-full overflow-hidden">

      <!-- ── Main scroll area ─────────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto space-y-6 pr-0 transition-all duration-300"
           [class.pr-[480px]]="!!detailTask()">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white flex items-center gap-2">
              <i class='bx bx-task text-indigo-400'></i> Tasks
            </h1>
            <p class="text-slate-400 text-sm mt-0.5">{{ tasks().length }} tasks in your organisation</p>
          </div>
          <div class="flex gap-2">
            <div class="flex rounded-xl overflow-hidden border border-slate-700">
              <button (click)="view='list'"
                [class]="view==='list' ? 'bg-indigo-500 text-white' : 'text-slate-400'"
                class="px-3 py-1.5 text-sm transition-colors flex items-center gap-1">
                <i class='bx bx-list-ul'></i> List
              </button>
              <button (click)="view='kanban'"
                [class]="view==='kanban' ? 'bg-indigo-500 text-white' : 'text-slate-400'"
                class="px-3 py-1.5 text-sm transition-colors flex items-center gap-1">
                <i class='bx bx-grid-alt'></i> Kanban
              </button>
            </div>
            <button (click)="openCreate()" class="btn-primary">
              <i class='bx bx-plus text-lg'></i> New Task
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-2">
          <select [(ngModel)]="filterProject" (ngModelChange)="load()" class="input w-48">
            <option value="">All projects</option>
            @for (p of projects(); track p._id) { <option [value]="p._id">{{ p.name }}</option> }
          </select>
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()" class="input w-auto">
            <option value="">All statuses</option>
            @for (s of statuses; track s) { <option [value]="s">{{ s.replace('_',' ') }}</option> }
          </select>
          <select [(ngModel)]="filterPriority" (ngModelChange)="applyFilter()" class="input w-auto">
            <option value="">All priorities</option>
            @for (p of priorities; track p) { <option [value]="p">{{ p | titlecase }}</option> }
          </select>
          <div class="relative">
            <i class='bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
            <input type="text" [(ngModel)]="searchQ" (ngModelChange)="applyFilter()"
                   placeholder="Search tasks…" class="input pl-9 w-44">
          </div>
        </div>

        <!-- ── Create/Edit Modal ──────────────────────────────────────── -->
        @if (showModal()) {
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 overflow-y-auto"
               (click)="closeModal($event)">
            <div class="card w-full max-w-lg animate-slide-up space-y-4 my-4" (click)="$event.stopPropagation()">
              <h3 class="text-lg font-semibold text-white">{{ editing() ? 'Edit Task' : 'New Task' }}</h3>

              <div>
                <label class="label">Project *</label>
                <select [(ngModel)]="form.projectId" class="input" [disabled]="!!editing()">
                  <option value="">Select project...</option>
                  @for (p of projects(); track p._id) { <option [value]="p._id">{{ p.name }}</option> }
                </select>
              </div>
              <div>
                <label class="label">Title *</label>
                <input type="text" [(ngModel)]="form.title" class="input" placeholder="Task title">
              </div>
              <div>
                <label class="label">Description</label>
                <textarea [(ngModel)]="form.description" class="input min-h-[80px]" placeholder="Details..."></textarea>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label">Priority</label>
                  <select [(ngModel)]="form.priority" class="input">
                    @for (p of priorities; track p) { <option [value]="p">{{ p | titlecase }}</option> }
                  </select>
                </div>
                <div>
                  <label class="label">Due Date</label>
                  <input type="date" [(ngModel)]="form.dueDate" class="input">
                </div>
              </div>

              <div>
                <label class="label">
                  Assignees
                  <span class="text-slate-400 font-normal ml-1">({{ form.assigneeIds.length }} selected)</span>
                </label>
                <div class="max-h-40 overflow-y-auto space-y-0.5 border border-slate-700 rounded-xl p-2">
                  @if (orgUsers().length === 0) {
                    <p class="text-xs text-slate-500 p-2">No users loaded</p>
                  }
                  @for (user of orgUsers(); track user._id) {
                    <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                      <input type="checkbox" [checked]="form.assigneeIds.includes(user._id)"
                             (change)="toggleAssignee(user._id)" class="rounded text-indigo-500 accent-indigo-500">
                      <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500
                                  flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {{ user.name.charAt(0) }}
                      </div>
                      <span class="text-sm text-white flex-1">{{ user.name }}</span>
                      <span class="text-xs text-slate-400">{{ user.email }}</span>
                    </label>
                  }
                </div>
              </div>

              <div class="flex gap-3 pt-1">
                <button (click)="showModal.set(false)" class="btn-secondary flex-1">Cancel</button>
                <button (click)="save()" class="btn-primary flex-1"
                        [disabled]="!form.title || !form.projectId || saving()">
                  @if (saving()) { <span class="animate-spin inline-block">⟳</span> }
                  @else { {{ editing() ? 'Save' : 'Create' }} }
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
              <h3 class="text-lg font-semibold text-white">Delete "{{ deleteTarget()?.title }}"?</h3>
              <p class="text-slate-400 text-sm">This action cannot be undone.</p>
              <div class="flex gap-3">
                <button (click)="deleteTarget.set(null)" class="btn-secondary flex-1">Cancel</button>
                <button (click)="confirmDelete()" class="btn-danger flex-1" [disabled]="saving()">
                  @if (saving()) { <span class="animate-spin inline-block">⟳</span> } @else { Delete }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ── LIST VIEW ─────────────────────────────────────────────── -->
        @if (view === 'list') {
          @if (loading()) {
            <div class="space-y-2">
              @for (i of [1,2,3,4,5]; track i) { <div class="skeleton h-16 rounded-xl"></div> }
            </div>
          } @else if (filtered().length === 0) {
            <div class="card text-center py-16">
              <div class="text-5xl mb-3">✅</div>
              <p class="text-white font-medium">No tasks found</p>
              <button (click)="openCreate()" class="btn-primary mt-4">Create first task</button>
            </div>
          } @else {
            <div class="card !p-0 overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-700/40">
                  <tr>
                    <th class="text-left py-3 px-4 text-slate-400 font-medium">Task</th>
                    <th class="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">Status</th>
                    <th class="text-left py-3 px-4 text-slate-400 font-medium hidden lg:table-cell">Priority</th>
                    <th class="text-left py-3 px-4 text-slate-400 font-medium hidden lg:table-cell">Assignees</th>
                    <th class="text-left py-3 px-4 text-slate-400 font-medium hidden md:table-cell">Due</th>
                    <th class="py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/40">
                  @for (task of filtered(); track task._id) {
                    <tr class="hover:bg-white/5 transition-colors cursor-pointer"
                        [class.bg-indigo-500/5]="detailTask()?._id === task._id"
                        (click)="openDetail(task)">
                      <td class="py-3 px-4">
                        <p class="font-medium text-white">{{ task.title }}</p>
                        @if (task.description) {
                          <p class="text-xs text-slate-400 truncate max-w-xs">{{ task.description }}</p>
                        }
                      </td>
                      <td class="py-3 px-4 hidden md:table-cell" (click)="$event.stopPropagation()">
                        <select
                          class="text-xs rounded-lg px-2 py-1 border cursor-pointer transition-colors"
                          [class]="statusSelectClass(task.status)"
                          (change)="onStatusSelectChange(task, $event)">
                          @for (s of statuses; track s) {
                            <option [value]="s" class="bg-slate-800 text-white"
                                    [selected]="task.status === s">{{ statusLabel(s) }}</option>
                          }
                        </select>
                      </td>
                      <td class="py-3 px-4 hidden lg:table-cell">
                        <span class="badge text-xs" [class]="priorityColor(task.priority)">{{ task.priority ?? '—' }}</span>
                      </td>
                      <td class="py-3 px-4 hidden lg:table-cell">
                        <div class="flex -space-x-2">
                          @for (a of (task.assigneeIds ?? []).slice(0,3); track a) {
                            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500
                                        flex items-center justify-center text-white text-xs font-bold border-2 border-slate-800"
                                 [title]="a?.name ?? a">{{ (a?.name ?? '?').charAt(0) }}</div>
                          }
                          @if ((task.assigneeIds ?? []).length > 3) {
                            <div class="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs border-2 border-slate-800">
                              +{{ (task.assigneeIds ?? []).length - 3 }}
                            </div>
                          }
                        </div>
                      </td>
                      <td class="py-3 px-4 hidden md:table-cell">
                        <span class="text-xs" [class]="isOverdue(task) ? 'text-rose-400 font-medium' : 'text-slate-400'">
                          {{ task.dueDate ? (task.dueDate | date:'MMM d') : '—' }}
                          {{ isOverdue(task) ? '⚠️' : '' }}
                        </span>
                      </td>
                      <td class="py-3 px-4" (click)="$event.stopPropagation()">
                        <div class="flex gap-1">
                          <button (click)="openDetail(task)" class="btn-ghost btn-sm text-xs" title="View details">
                            <i class='bx bx-expand-alt text-sm'></i>
                          </button>
                          <button (click)="openEdit(task)" class="btn-ghost btn-sm text-xs">Edit</button>
                          <button (click)="deleteTarget.set(task)" class="btn-ghost btn-sm text-xs text-rose-400">Del</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        <!-- ── KANBAN VIEW ─────────────────────────────────────────────── -->
        @if (view === 'kanban') {
          <div class="flex gap-4 overflow-x-auto pb-4">
            @for (col of kanbanCols; track col.key) {
              <!-- Drop Zone Column -->
              <div class="shrink-0 w-72 flex flex-col gap-3"
                   (dragover)="onDragOver($event, col.key)"
                   (dragleave)="onDragLeave(col.key)"
                   (drop)="onDrop($event, col.key)">
                <!-- Column header -->
                <div class="flex items-center justify-between px-1">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" [class]="col.dotColor"></div>
                    <span class="text-sm font-medium text-white">{{ col.label }}</span>
                    <span class="text-xs text-slate-400 bg-slate-700/60 rounded-full px-2 py-0.5">{{ tasksForCol(col.key).length }}</span>
                  </div>
                </div>
                <!-- Drop Area -->
                <div class="space-y-2 min-h-[5rem] rounded-xl p-1 transition-all duration-150"
                     [class.bg-indigo-500/10]="dragOverCol() === col.key"
                     [class.ring-2]="dragOverCol() === col.key"
                     [class.ring-indigo-500/40]="dragOverCol() === col.key"
                     [class.ring-dashed]="dragOverCol() === col.key">
                  @if (dragOverCol() === col.key && tasksForCol(col.key).length === 0) {
                    <div class="flex items-center justify-center h-14 text-xs text-indigo-400 animate-pulse">
                      Drop here
                    </div>
                  }
                  @for (task of tasksForCol(col.key); track task._id) {
                    <div class="card !p-3 cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-0.5 transition-all border select-none"
                         [class.border-indigo-500/50]="detailTask()?._id === task._id"
                         [class.border-transparent]="detailTask()?._id !== task._id"
                         [class.opacity-50]="draggingId() === task._id"
                         [class.scale-95]="draggingId() === task._id"
                         draggable="true"
                         (dragstart)="onDragStart($event, task)"
                         (dragend)="onDragEnd()"
                         (click)="openDetail(task)">
                      <!-- Task title -->
                      <p class="text-sm font-medium text-white mb-2 line-clamp-2">{{ task.title }}</p>
                      <!-- Bottom row -->
                      <div class="flex items-center justify-between gap-2">
                        <span class="badge text-xs" [class]="priorityColor(task.priority)">{{ task.priority ?? 'low' }}</span>
                        @if ((task.assigneeIds ?? []).length) {
                          <div class="flex -space-x-1.5">
                            @for (a of (task.assigneeIds ?? []).slice(0,3); track a) {
                              <div class="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500
                                          border-2 border-slate-800 flex items-center justify-center text-white text-[9px] font-bold"
                                   [title]="a?.name ?? a">{{ (a?.name ?? '?').charAt(0) }}</div>
                            }
                          </div>
                        }
                      </div>
                      @if (task.dueDate) {
                        <p class="text-xs mt-1.5" [class]="isOverdue(task) ? 'text-rose-400' : 'text-slate-400'">
                          📅 {{ task.dueDate | date:'MMM d' }}{{ isOverdue(task) ? ' ⚠️' : '' }}
                        </p>
                      }
                      <!-- Card actions -->
                      <div class="flex gap-1 mt-2 pt-2 border-t border-slate-700/40" (click)="$event.stopPropagation()">
                        <button (click)="openEdit(task)" class="btn-ghost btn-sm text-[11px] flex-1">Edit</button>
                        <button (click)="deleteTarget.set(task)" class="btn-ghost btn-sm text-[11px] text-rose-400">Del</button>
                      </div>
                    </div>
                  }
                </div>
                <button (click)="quickCreate(col.key)"
                        class="btn-ghost text-xs text-slate-400 hover:text-white border border-dashed border-slate-700 hover:border-slate-500 py-2 rounded-xl transition-colors">
                  + Add task
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- ── TASK DETAIL SIDE PANEL ─────────────────────────────────────── -->
      @if (detailTask()) {
        <!-- Backdrop (only on mobile) -->
        <div class="fixed inset-0 bg-black/40 z-40 lg:hidden" (click)="detailTask.set(null)"></div>

        <!-- Panel: fixed right, below topbar (using CSS var or fixed calc) -->
        <div class="fixed right-0 top-0 h-full w-full max-w-[480px]
                    bg-slate-900 border-l border-slate-700/60 z-50 flex flex-col shadow-2xl
                    animate-slide-in-right"
             style="top: 64px; height: calc(100% - 64px);">

          <!-- Panel Header -->
          <div class="flex items-start gap-3 px-5 py-4 border-b border-slate-700/60 shrink-0 bg-slate-900">
            <div class="flex-1 min-w-0">
              <!-- Status + Priority pill row -->
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <span class="badge text-xs" [class]="priorityColor(detailTask()!.priority)">
                  {{ detailTask()!.priority ?? 'low' }}
                </span>
                <select class="bg-slate-800 text-xs border border-slate-600 rounded-lg px-2 py-1 text-white"
                        [value]="detailTask()!.status" (change)="changeStatus(detailTask()!, $event)">
                  @for (s of statuses; track s) { <option [value]="s" class="bg-slate-800">{{ s.replace('_',' ') }}</option> }
                </select>
                @if (detailLoading()) {
                  <span class="text-xs text-slate-500 animate-pulse">Loading details…</span>
                }
              </div>
              <h2 class="text-base font-bold text-white leading-snug">{{ detailTask()!.title }}</h2>
              @if (detailTask()!.description) {
                <p class="text-sm text-slate-400 mt-1.5 leading-relaxed">{{ detailTask()!.description }}</p>
              }
            </div>
            <div class="flex gap-1.5 shrink-0">
              <button (click)="openEdit(detailTask()!)" class="btn-ghost btn-sm text-xs">
                <i class='bx bx-edit-alt'></i>
              </button>
              <button (click)="detailTask.set(null)" class="btn-icon text-slate-400 hover:text-white text-lg leading-none">
                <i class='bx bx-x'></i>
              </button>
            </div>
          </div>

          <!-- Meta strip -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-3 border-b border-slate-700/40 text-xs shrink-0 bg-slate-900/80">
            <!-- Assignees -->
            <div>
              <p class="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Assignees</p>
              <div class="flex items-center gap-1 flex-wrap">
                @if ((detailTask()!.assigneeIds ?? []).length === 0) {
                  <span class="text-slate-400 italic">Unassigned</span>
                }
                @for (a of (detailTask()!.assigneeIds ?? []); track a) {
                  <div class="flex items-center gap-1 bg-slate-700/60 rounded-full pr-2 pl-0.5 py-0.5">
                    <div class="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500
                                flex items-center justify-center text-white text-[9px] font-bold">
                      {{ (a?.name ?? '?').charAt(0) }}
                    </div>
                    <span class="text-slate-300 text-[11px]">{{ a?.name ?? '?' }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Due date -->
            <div>
              <p class="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Due Date</p>
              @if (detailTask()!.dueDate) {
                <p [class]="isOverdue(detailTask()!) ? 'text-rose-400 font-medium' : 'text-white'">
                  {{ detailTask()!.dueDate | date:'MMM d, y' }}
                  {{ isOverdue(detailTask()!) ? '⚠️' : '' }}
                </p>
              } @else {
                <p class="text-slate-400 italic">Not set</p>
              }
            </div>

            <!-- Reporter -->
            @if (detailTask()!.reporterId) {
              <div>
                <p class="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Reporter</p>
                <p class="text-white">{{ detailTask()!.reporterId?.name ?? '—' }}</p>
              </div>
            }

            <!-- Project -->
            @if (detailTask()!.projectId) {
              <div>
                <p class="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Project</p>
                <p class="text-white">{{ detailTask()!.projectId?.name ?? '—' }}</p>
              </div>
            }

            <!-- Logged hours -->
            @if (detailLoggedHours()) {
              <div>
                <p class="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Logged Hours</p>
                <p class="text-violet-400 font-medium">{{ detailLoggedHours() | number:'1.1-1' }}h</p>
              </div>
            }

            <!-- Subtasks -->
            @if (detailSubtasks().length) {
              <div>
                <p class="text-slate-500 mb-1 uppercase tracking-wider text-[10px]">Subtasks</p>
                <p class="text-white">
                  {{ doneSubtasks() }} / {{ detailSubtasks().length }} done
                </p>
              </div>
            }
          </div>

          <!-- Subtasks mini list -->
          @if (detailSubtasks().length) {
            <div class="px-5 py-2 border-b border-slate-700/40 shrink-0 bg-slate-900/50">
              <p class="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Subtasks</p>
              <div class="space-y-1 max-h-24 overflow-y-auto">
                @for (sub of detailSubtasks(); track sub._id) {
                  <div class="flex items-center gap-2 text-xs">
                    <div class="w-2 h-2 rounded-full shrink-0" [class]="sub.status === 'done' ? 'bg-emerald-400' : 'bg-slate-500'"></div>
                    <span [class]="sub.status === 'done' ? 'line-through text-slate-500' : 'text-slate-300'" class="truncate">{{ sub.title }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Tabs -->
          <div class="flex border-b border-slate-700/60 shrink-0 bg-slate-900">
            <button (click)="detailTab='comments'"
                    class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5"
                    [class]="detailTab==='comments' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'">
              <i class='bx bx-comment-dots'></i> Comments
              @if (commentCount() > 0) {
                <span class="text-xs bg-indigo-500/20 text-indigo-300 rounded-full px-1.5">{{ commentCount() }}</span>
              }
            </button>
            <button (click)="switchTab('activity')"
                    class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5"
                    [class]="detailTab==='activity' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'">
              <i class='bx bx-history'></i> Activity
            </button>
          </div>

          <!-- Scrollable body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">

            <!-- COMMENTS TAB -->
            @if (detailTab === 'comments') {
              @if (activityLoading()) {
                <div class="space-y-3">
                  @for (i of [1,2,3]; track i) { <div class="skeleton h-14 rounded-xl"></div> }
                </div>
              } @else if (comments().length === 0) {
                <div class="text-center py-10">
                  <i class='bx bx-comment-dots text-4xl text-slate-600 block mb-2'></i>
                  <p class="text-slate-400 text-sm">No comments yet. Be the first!</p>
                </div>
              } @else {
                @for (c of comments(); track c._id) {
                  <div class="flex gap-3 group">
                    <!-- Avatar -->
                    <div class="w-8 h-8 rounded-full shrink-0 mt-0.5 overflow-hidden flex items-center justify-center"
                         [class]="c.actorId?.avatar ? '' : 'bg-gradient-to-br from-indigo-500 to-violet-500'">
                      @if (c.actorId?.avatar) {
                        <img [src]="c.actorId!.avatar" class="w-full h-full object-cover">
                      } @else {
                        <span class="text-xs font-bold text-white">{{ (c.actorId?.name ?? c.actorName ?? 'U')[0].toUpperCase() }}</span>
                      }
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span class="text-sm font-medium text-white">{{ c.actorId?.name ?? c.actorName ?? 'Unknown' }}</span>
                        <span class="text-xs text-slate-500">{{ c.createdAt | date:'MMM d, h:mm a' }}</span>
                        @if (c.type === 'comment_edited') {
                          <span class="text-xs text-slate-600">(edited)</span>
                        }
                      </div>

                      @if (c.comment?.isDeleted) {
                        <p class="text-sm text-slate-500 italic">[deleted]</p>
                      } @else if (editingComment()?._id === c._id) {
                        <div class="space-y-2">
                          <textarea [(ngModel)]="editCommentText" class="input text-sm min-h-[60px] w-full"></textarea>
                          <div class="flex gap-2">
                            <button (click)="saveEditComment(c)" class="btn-primary btn-sm text-xs" [disabled]="!editCommentText.trim()">Save</button>
                            <button (click)="editingComment.set(null)" class="btn-secondary btn-sm text-xs">Cancel</button>
                          </div>
                        </div>
                      } @else {
                        <p class="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{{ c.comment?.text }}</p>
                        <div class="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          @if (isMyActivity(c)) {
                            <button (click)="startEditComment(c)" class="text-xs text-slate-500 hover:text-indigo-400 transition-colors">Edit</button>
                            <button (click)="deleteComment(c)" class="text-xs text-slate-500 hover:text-rose-400 transition-colors">Delete</button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              }
            }

            <!-- ACTIVITY TAB -->
            @if (detailTab === 'activity') {
              @if (activityLoading()) {
                <div class="space-y-2">
                  @for (i of [1,2,3,4]; track i) { <div class="skeleton h-10 rounded-xl"></div> }
                </div>
              } @else if (activityLog().length === 0) {
                <div class="text-center py-10">
                  <i class='bx bx-history text-3xl text-slate-600 block mb-2'></i>
                  <p class="text-slate-400 text-sm">No activity recorded yet</p>
                </div>
              } @else {
                <div class="space-y-1">
                  @for (evt of activityLog(); track evt._id) {
                    <div class="flex items-start gap-3 py-2">
                      <!-- Type icon -->
                      <div class="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                           [class]="activityIconBg(evt.type)">
                        <i class='bx text-xs' [class]="activityIcon(evt.type)"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-slate-300 leading-snug">
                          <span class="font-medium text-white">{{ evt.actorId?.name ?? evt.actorName ?? 'System' }}</span>
                          {{ formatActivityType(evt.type, evt.changes) }}
                        </p>
                        <p class="text-xs text-slate-600 mt-0.5">{{ evt.createdAt | date:'MMM d, y · h:mm a' }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Comment input (always visible at bottom when on comments tab) -->
          @if (detailTab === 'comments') {
            <div class="px-4 py-3 border-t border-slate-700/60 shrink-0 bg-slate-900">
              <div class="flex gap-2 items-end">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500
                             flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1">
                  {{ myInitial() }}
                </div>
                <div class="flex-1">
                  <textarea [(ngModel)]="newComment" placeholder="Add a comment…"
                            rows="2" class="input w-full text-sm resize-none"
                            (keydown)="onCommentKey($event)"></textarea>
                  <p class="text-[10px] text-slate-600 mt-0.5">Enter to send · Shift+Enter for new line</p>
                </div>
                <button (click)="submitComment()" [disabled]="!newComment.trim() || commentSaving()"
                        class="btn-primary shrink-0 mb-5 text-sm px-3 py-2">
                  @if (commentSaving()) { <span class="animate-spin inline-block">⟳</span> }
                  @else { <i class='bx bxs-send'></i> }
                </button>
              </div>
            </div>
          }
        </div>
      }

    </div>
  `,
})
export class TasksComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);

  loading       = signal(true);
  saving        = signal(false);
  showModal     = signal(false);
  editing       = signal<TaskSummary | null>(null);
  deleteTarget  = signal<TaskSummary | null>(null);
  tasks         = signal<TaskSummary[]>([]);
  filtered      = signal<TaskSummary[]>([]);
  projects      = signal<Project[]>([]);
  orgUsers      = signal<User[]>([]);

  // Detail panel
  detailTask      = signal<TaskDetail | null>(null);
  detailLoading   = signal(false);
  detailTab       = 'comments';

  // Activity (used for BOTH comments tab and activity tab, filtered by type)
  activityLog     = signal<ActivityItem[]>([]);
  activityLoading = signal(false);

  newComment      = '';
  commentSaving   = signal(false);
  editingComment  = signal<ActivityItem | null>(null);
  editCommentText = '';

  view           = 'list';
  filterProject  = '';
  filterStatus   = '';
  filterPriority = '';
  searchQ        = '';
  statuses       = STATUSES;
  priorities     = PRIORITIES;

  form = { projectId: '', title: '', description: '', priority: 'medium', dueDate: '', assigneeIds: [] as string[] };

  kanbanCols = [
    { key: 'todo',       label: 'To Do',      dotColor: 'bg-slate-400' },
    { key: 'in_progress',label: 'In Progress', dotColor: 'bg-indigo-400' },
    { key: 'in_review',  label: 'In Review',   dotColor: 'bg-amber-400' },
    { key: 'blocked',    label: 'Blocked',     dotColor: 'bg-rose-400' },
    { key: 'done',       label: 'Done',        dotColor: 'bg-emerald-400' },
  ];

  myInitial   = computed(() => (this.auth.currentUser()?.name ?? 'U').charAt(0).toUpperCase());
  get myId(): string { return (this.auth.currentUser() as any)?._id ?? ''; }

  // Comments = activity items of type comment_added / comment_edited
  comments = computed(() =>
    this.activityLog().filter(a => ['comment_added', 'comment_edited'].includes(a.type))
  );
  commentCount = computed(() => this.comments().length);

  // For activity tab: everything except comments
  activityItems = computed(() =>
    this.activityLog().filter(a => !['comment_added', 'comment_edited', 'comment_deleted'].includes(a.type))
  );

  detailSubtasks = computed(() => (this.detailTask() as TaskDetail)?.subtasks ?? []);
  detailLoggedHours = computed(() => (this.detailTask() as TaskDetail)?.loggedHours ?? 0);
  doneSubtasks = computed(() => this.detailSubtasks().filter((s: any) => s.status === 'done').length);

  ngOnInit() {
    this.loadProjects();
    this.loadUsers();
    this.load();
  }

  loadProjects() {
    this.http.get<any>(`${API}/projects?limit=200`).subscribe({
      next: r => this.projects.set(r.data ?? []),
    });
  }

  loadUsers() {
    this.http.get<any>(`${API}/users?limit=200&isActive=true`).subscribe({
      next: r => this.orgUsers.set(r.data ?? []),
    });
  }

  load() {
    this.loading.set(true);
    const params: any = {};
    if (this.filterProject) params['projectId'] = this.filterProject;

    this.http.get<any>(`${API}/tasks`, { params }).subscribe({
      next: r => { this.tasks.set(r.data ?? []); this.applyFilter(); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilter() {
    const q = this.searchQ.toLowerCase();
    this.filtered.set(this.tasks().filter(t =>
      (!this.filterStatus   || t.status   === this.filterStatus) &&
      (!this.filterPriority || t.priority === this.filterPriority) &&
      (!q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    ));
  }

  tasksForCol(status: string): TaskSummary[] {
    return this.filtered().filter(t => t.status === status);
  }

  toggleAssignee(id: string) {
    this.form.assigneeIds = this.form.assigneeIds.includes(id)
      ? this.form.assigneeIds.filter(x => x !== id)
      : [...this.form.assigneeIds, id];
  }

  openCreate() {
    this.editing.set(null);
    this.form = { projectId: this.filterProject, title: '', description: '', priority: 'medium', dueDate: '', assigneeIds: [] };
    this.showModal.set(true);
  }

  quickCreate(_status: string) { this.openCreate(); }

  openEdit(t: TaskSummary) {
    this.editing.set(t);
    this.form = {
      projectId:   (t.projectId as any)?._id ?? t.projectId ?? '',
      title:       t.title,
      description: t.description ?? '',
      priority:    t.priority ?? 'medium',
      dueDate:     t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
      assigneeIds: (t.assigneeIds ?? []).map((a: any) => a?._id ?? a),
    };
    this.showModal.set(true);
  }

  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('fixed')) this.showModal.set(false);
  }

  save() {
    if (!this.form.title || !this.form.projectId) return;
    this.saving.set(true);
    const body: any = {
      title: this.form.title, description: this.form.description || undefined,
      priority: this.form.priority, dueDate: this.form.dueDate || undefined,
      assigneeIds: this.form.assigneeIds,
    };
    const req = this.editing()
      ? this.http.patch<any>(`${API}/tasks/${this.editing()!._id}`, body)
      : this.http.post<any>(`${API}/tasks`, { ...body, projectId: this.form.projectId });

    req.subscribe({
      next: r => {
        const task = r.data?.task ?? r.data;
        if (this.editing()) {
          this.tasks.update(ts => ts.map(t => t._id === task._id ? task : t));
          if (this.detailTask()?._id === task._id) this.detailTask.set(task);
          this.toast.success('Task updated');
        } else {
          this.tasks.update(ts => [task, ...ts]);
          this.toast.success('Task created');
        }
        this.applyFilter(); this.saving.set(false); this.showModal.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed'); },
    });
  }

  changeStatus(task: TaskSummary, e: Event) {
    const status = (e.target as HTMLSelectElement).value;
    this.http.patch<any>(`${API}/tasks/${task._id}/status`, { status }).subscribe({
      next: r => {
        const updated = r.data?.task ?? r.data;
        this.tasks.update(ts => ts.map(t => t._id === updated._id ? updated : t));
        if (this.detailTask()?._id === updated._id) this.detailTask.update(d => ({ ...d!, ...updated }));
        this.applyFilter(); this.toast.success(`Status → ${status}`);
      },
      error: err => this.toast.error(err?.error?.message ?? 'Cannot change status: ' + (err?.error?.message ?? 'Invalid transition')),
    });
  }

  confirmDelete() {
    const task = this.deleteTarget();
    if (!task) return;
    this.saving.set(true);
    this.http.delete(`${API}/tasks/${task._id}`).subscribe({
      next: () => {
        this.tasks.update(ts => ts.filter(t => t._id !== task._id));
        this.applyFilter(); this.toast.success('Task deleted');
        if (this.detailTask()?._id === task._id) this.detailTask.set(null);
        this.deleteTarget.set(null); this.saving.set(false);
      },
      error: err => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Failed'); },
    });
  }

  // ── Task Detail Panel ────────────────────────────────────────────────────────

  openDetail(task: TaskSummary) {
    // Set partial data immediately for instant feedback
    this.detailTask.set(task as TaskDetail);
    this.detailTab = 'comments';
    this.newComment = '';
    this.editingComment.set(null);
    this.activityLog.set([]);

    // Fetch full task detail from backend
    this.detailLoading.set(true);
    this.http.get<any>(`${API}/tasks/${task._id}`).subscribe({
      next: r => {
        const full = r.data?.task ?? r.data;
        this.detailTask.set(full);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });

    // Load activity (covers both comments + audit log)
    this.loadAllActivity(task._id);
  }

  // Loads ALL activity — the computed signals filter comments vs audit separately
  loadAllActivity(taskId: string) {
    this.activityLoading.set(true);
    this.http.get<any>(`${API}/tasks/${taskId}/activity?limit=50`).subscribe({
      next: r => {
        // Backend returns { data: [], pagination: {} } or just []
        const items: ActivityItem[] = r.data ?? [];
        // Sort oldest-first for chat-style display
        this.activityLog.set([...items].reverse());
        this.activityLoading.set(false);
      },
      error: () => this.activityLoading.set(false),
    });
  }

  switchTab(tab: string) {
    this.detailTab = tab;
    // If switching to activity and we have no data yet, reload
    if (tab === 'activity' && this.activityLog().length === 0 && this.detailTask()) {
      this.loadAllActivity(this.detailTask()!._id);
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────────

  submitComment() {
    const text = this.newComment.trim();
    const task = this.detailTask();
    if (!text || !task) return;
    this.commentSaving.set(true);

    this.http.post<any>(`${API}/tasks/${task._id}/comments`, { text }).subscribe({
      next: r => {
        // Backend returns the new ActivityItem
        const activity: ActivityItem = r.data?.activity ?? r.data;
        // Append optimistically — shape it if needed
        if (activity) {
          this.activityLog.update(log => [...log, {
            ...activity,
            actorId: activity.actorId ?? { _id: this.myId, name: this.auth.currentUser()?.name ?? '', avatar: undefined },
            comment: activity.comment ?? { text },
          }]);
        } else {
          // Fallback: build local comment entry
          const local: ActivityItem = {
            _id: Date.now().toString(), type: 'comment_added',
            actorId: { _id: this.myId, name: this.auth.currentUser()?.name ?? '' },
            comment: { text }, createdAt: new Date().toISOString(),
          };
          this.activityLog.update(log => [...log, local]);
        }
        this.newComment = '';
        this.commentSaving.set(false);
      },
      error: err => { this.commentSaving.set(false); this.toast.error(err?.error?.message ?? 'Failed to post comment'); },
    });
  }

  startEditComment(c: ActivityItem) {
    this.editingComment.set(c);
    this.editCommentText = c.comment?.text ?? '';
  }

  saveEditComment(c: ActivityItem) {
    const task = this.detailTask();
    if (!task) return;
    this.http.patch<any>(`${API}/tasks/${task._id}/comments/${c._id}`, { text: this.editCommentText }).subscribe({
      next: () => {
        this.activityLog.update(log => log.map(x => x._id === c._id
          ? { ...x, type: 'comment_edited', comment: { ...x.comment, text: this.editCommentText } }
          : x
        ));
        this.editingComment.set(null);
        this.toast.success('Comment updated');
      },
      error: err => this.toast.error(err?.error?.message ?? 'Failed'),
    });
  }

  deleteComment(c: ActivityItem) {
    const task = this.detailTask();
    if (!task) return;
    this.http.delete(`${API}/tasks/${task._id}/comments/${c._id}`).subscribe({
      next: () => {
        this.activityLog.update(log => log.map(x => x._id === c._id
          ? { ...x, type: 'comment_deleted', comment: { ...x.comment, isDeleted: true, text: '[deleted]' } }
          : x
        ));
        this.toast.success('Comment deleted');
      },
      error: err => this.toast.error(err?.error?.message ?? 'Failed'),
    });
  }

  onCommentKey(e: Event) {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) { e.preventDefault(); this.submitComment(); }
  }

  isMyActivity(a: ActivityItem): boolean {
    return (a.actorId?._id ?? null) === this.myId;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // ── Kanban drag-drop state ───────────────────────────────────────────────────
  draggingId  = signal<string | null>(null);
  draggingTask = signal<TaskSummary | null>(null);
  dragOverCol = signal<string | null>(null);

  onDragStart(event: DragEvent, task: TaskSummary) {
    this.draggingId.set(task._id);
    this.draggingTask.set(task);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', task._id);
  }

  onDragEnd() {
    this.draggingId.set(null);
    this.draggingTask.set(null);
    this.dragOverCol.set(null);
  }

  onDragOver(event: DragEvent, colKey: string) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (this.dragOverCol() !== colKey) this.dragOverCol.set(colKey);
  }

  onDragLeave(colKey: string) {
    if (this.dragOverCol() === colKey) this.dragOverCol.set(null);
  }

  onDrop(event: DragEvent, newStatus: string) {
    event.preventDefault();
    this.dragOverCol.set(null);
    const task = this.draggingTask();
    if (!task || task.status === newStatus) { this.onDragEnd(); return; }

    // Optimistically update UI immediately
    this.tasks.update(ts => ts.map(t =>
      t._id === task._id ? { ...t, status: newStatus } : t
    ));
    this.applyFilter();
    this.draggingId.set(null);
    this.draggingTask.set(null);

    // Persist to backend
    this.http.patch<any>(`${API}/tasks/${task._id}/status`, { status: newStatus }).subscribe({
      next: r => {
        const updated = r.data?.task ?? r.data;
        this.tasks.update(ts => ts.map(t => t._id === updated._id ? updated : t));
        if (this.detailTask()?._id === updated._id) this.detailTask.update(d => ({ ...d!, ...updated }));
        this.applyFilter();
        this.toast.success(`Moved to ${this.statusLabel(newStatus)}`);
      },
      error: err => {
        // Revert on error
        this.tasks.update(ts => ts.map(t => t._id === task._id ? { ...t, status: task.status } : t));
        this.applyFilter();
        this.toast.error(err?.error?.message ?? 'Cannot move task: invalid transition');
      },
    });
  }

  // ── Status select helpers ─────────────────────────────────────────────────────

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusSelectClass(status: string): string {
    const base = 'font-medium border-0 outline-none cursor-pointer rounded-lg px-2 py-1 text-xs ';
    return base + ({
      todo:        'bg-slate-700/80 text-slate-200',
      in_progress: 'bg-indigo-500/20 text-indigo-300',
      in_review:   'bg-amber-500/20 text-amber-300',
      blocked:     'bg-rose-500/20 text-rose-300',
      done:        'bg-emerald-500/20 text-emerald-300',
      cancelled:   'bg-slate-500/20 text-slate-400',
    } as any)[status] || 'bg-slate-700 text-slate-200';
  }

  /** Called by the list-view status <select> */
  onStatusSelectChange(task: TaskSummary, event: Event) {
    const newStatus = (event.target as HTMLSelectElement).value;
    if (newStatus === task.status) return;

    // Optimistically update in-memory
    this.tasks.update(ts => ts.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    this.applyFilter();

    this.http.patch<any>(`${API}/tasks/${task._id}/status`, { status: newStatus }).subscribe({
      next: r => {
        const updated = r.data?.task ?? r.data;
        this.tasks.update(ts => ts.map(t => t._id === updated._id ? updated : t));
        if (this.detailTask()?._id === updated._id) this.detailTask.update(d => ({ ...d!, ...updated }));
        this.applyFilter();
        this.toast.success(`Status → ${this.statusLabel(newStatus)}`);
      },
      error: err => {
        // Revert — restore old status
        this.tasks.update(ts => ts.map(t => t._id === task._id ? { ...t, status: task.status } : t));
        this.applyFilter();
        this.toast.error(err?.error?.message ?? 'Invalid status transition');
      },
    });
  }
  isOverdue(task: TaskSummary): boolean {
    return !!(task.dueDate && task.status !== 'done' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date());
  }

  priorityColor(p?: string): string {
    return ({ low:'badge-slate', medium:'badge-indigo', high:'badge-amber', critical:'badge-rose' } as any)[p ?? ''] ?? 'badge-slate';
  }

  formatActivityType(type: string, changes?: { field?: string; from?: any; to?: any }): string {
    const map: Record<string, string> = {
      created:           'created this task',
      updated:           'updated this task',
      status_changed:    changes ? `changed status from "${changes.from}" → "${changes.to}"` : 'changed status',
      priority_changed:  changes ? `changed priority from "${changes.from}" → "${changes.to}"` : 'changed priority',
      assignee_added:    'was assigned to this task',
      assignee_removed:  'was unassigned from this task',
      due_date_changed:  'updated the due date',
      label_changed:     'updated labels',
      time_logged:       'logged time',
      dependency_added:  'added a dependency',
      dependency_removed:'removed a dependency',
      completed:         'completed this task ✅',
      reopened:          'reopened this task',
      deleted:           'deleted this task',
      restored:          'restored this task',
      order_changed:     'moved this task',
    };
    return map[type] ?? type.replace(/_/g, ' ');
  }

  activityIcon(type: string): string {
    const map: Record<string, string> = {
      created: 'bx-plus-circle', updated: 'bx-edit', status_changed: 'bx-transfer-alt',
      priority_changed: 'bxs-flag', assignee_added: 'bx-user-plus', assignee_removed: 'bx-user-minus',
      due_date_changed: 'bx-calendar', time_logged: 'bx-timer', completed: 'bxs-check-circle',
      reopened: 'bx-refresh', deleted: 'bx-trash', dependency_added: 'bx-git-merge',
    };
    return map[type] ?? 'bx-circle';
  }

  activityIconBg(type: string): string {
    if (type === 'completed') return 'bg-emerald-500/20 text-emerald-400';
    if (type === 'deleted')   return 'bg-rose-500/20 text-rose-400';
    if (type === 'status_changed') return 'bg-amber-500/20 text-amber-400';
    if (type === 'assignee_added') return 'bg-violet-500/20 text-violet-400';
    return 'bg-indigo-500/15 text-indigo-400';
  }
}
