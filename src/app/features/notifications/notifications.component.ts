import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { ToastService }        from '../../core/services/toast.service';

type Tab = 'all' | 'unread';
type TypeFilter = 'all' | string;

const TYPE_CHIPS: Array<{ key: string; label: string; icon: string; color: string }> = [
  { key: 'all',                  label: 'All Types',      icon: 'bx-list-ul',           color: 'text-slate-400 bg-slate-700/50' },
  { key: 'task.assigned',        label: 'Assigned',       icon: 'bx-task',              color: 'text-indigo-400 bg-indigo-500/15' },
  { key: 'task.completed',       label: 'Completed',      icon: 'bxs-check-circle',     color: 'text-emerald-400 bg-emerald-500/15' },
  { key: 'task.commented',       label: 'Comments',       icon: 'bx-comment',           color: 'text-violet-400 bg-violet-500/15' },
  { key: 'task.mentioned',       label: 'Mentions',       icon: 'bx-at',               color: 'text-rose-400 bg-rose-500/15' },
  { key: 'message.received',     label: 'Messages',       icon: 'bx-chat',              color: 'text-blue-400 bg-blue-500/15' },
  { key: 'project.created',      label: 'Projects',       icon: 'bxs-folder',           color: 'text-amber-400 bg-amber-500/15' },
  { key: 'task.status_changed',  label: 'Status',         icon: 'bx-transfer',          color: 'text-orange-400 bg-orange-500/15' },
  { key: 'system',               label: 'System',         icon: 'bx-cog',              color: 'text-slate-400 bg-slate-500/15' },
];

@Component({
  selector:   'app-notifications',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <div class="space-y-5 max-w-3xl mx-auto">

      <!-- ── Hero Header ─────────────────────────────────────────────────── -->
      <div class="relative overflow-hidden rounded-2xl border p-6 animate-slide-up hero-gradient-amber">
        <div class="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-40 h-20 rounded-full bg-orange-500/10 blur-2xl pointer-events-none"></div>

        <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <i class='bx bxs-bell text-2xl text-amber-400'></i>
              </div>
              <div>
                <h1 class="text-2xl font-black text-white">Notifications</h1>
                <!-- Live status pill -->
                <p class="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  @if (svc.unreadCount() > 0) {
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span class="relative inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
                    </span>
                    <span class="text-amber-300 font-semibold">{{ svc.unreadCount() }} unread</span>
                    <span class="text-slate-600">·</span>
                    <span>{{ svc.total() }} total</span>
                  } @else {
                    <i class='bx bxs-check-circle text-emerald-400'></i>
                    <span class="text-emerald-300">All caught up!</span>
                    <span class="text-slate-600">·</span>
                    {{ svc.total() }} total
                  }
                </p>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-2 flex-wrap">
            @if (svc.unreadCount() > 0) {
              <button (click)="svc.markAllRead()"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all border border-amber-500/20">
                <i class='bx bx-check-double text-sm'></i> Mark all read
              </button>
            }
            @if (svc.notifications().length > 0) {
              <button (click)="confirmClearAll()"
                      class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20">
                <i class='bx bx-trash text-sm'></i> Clear all
              </button>
            }
            <button (click)="svc.load()" [disabled]="svc.loading()"
                    class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700/60"
                    [class.opacity-50]="svc.loading()">
              <i class='bx text-sm' [class]="svc.loading() ? 'bx-loader-alt animate-spin' : 'bx-refresh'"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- ── Tab + Type filter bar ─────────────────────────────────────── -->
      <div class="space-y-3">
        <!-- Read/Unread tabs -->
        <div class="flex gap-0 border-b border-slate-700/60">
          <button (click)="tab.set('all')"
                  class="px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200"
                  [class]="tab()==='all' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'">
            <i class='bx bx-list-ul mr-1.5'></i>All
          </button>
          <button (click)="tab.set('unread')"
                  class="px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2"
                  [class]="tab()==='unread' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-white'">
            <i class='bx bx-bell text-sm'></i>Unread
            @if (svc.unreadCount() > 0) {
              <span class="bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {{ svc.unreadCount() > 9 ? '9+' : svc.unreadCount() }}
              </span>
            }
          </button>
        </div>

        <!-- Type filter chips (horizontal scroll) -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          @for (chip of typeChips; track chip.key) {
            <button (click)="typeFilter.set(chip.key)"
                    class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150"
                    [class]="typeFilter() === chip.key
                      ? chip.color + ' border-current/40 scale-105 shadow-sm'
                      : 'text-slate-500 bg-transparent border-slate-700 hover:border-slate-600 hover:text-slate-300'">
              <i class='bx text-sm' [class]="chip.icon"></i>
              {{ chip.label }}
            </button>
          }
        </div>
      </div>

      <!-- ── Loading skeletons ──────────────────────────────────────────── -->
      @if (svc.loading() && svc.notifications().length === 0) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-start gap-3 p-4 card !py-3">
              <div class="skeleton w-2 h-2 rounded-full mt-2 shrink-0"></div>
              <div class="skeleton w-10 h-10 rounded-xl shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-3/4 rounded"></div>
                <div class="skeleton h-3 w-1/2 rounded"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Empty state ────────────────────────────────────────────────── -->
      @if (!svc.loading() && displayed().length === 0) {
        <div class="card text-center py-16 animate-scale-in">
          <div class="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <i class='bx bxs-bell-off text-4xl text-amber-400/60'></i>
          </div>
          <p class="text-white font-semibold text-lg mb-1">
            {{ tab() === 'unread' ? 'All caught up!' : typeFilter() !== 'all' ? 'No ' + activeChipLabel() + ' notifications' : 'No notifications yet' }}
          </p>
          <p class="text-slate-400 text-sm">
            {{ tab() === 'unread' ? 'You have no unread notifications.' : 'New activity will appear here.' }}
          </p>
          @if (typeFilter() !== 'all') {
            <button (click)="typeFilter.set('all')" class="btn-ghost btn-sm mt-4">Clear filter</button>
          }
        </div>
      }

      <!-- ── Notification list ──────────────────────────────────────────── -->
      @if (displayed().length > 0) {
        <div class="space-y-2">
          @for (n of displayed(); track n._id; let i = $index) {
            <div class="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 card !py-3 cursor-pointer
                         hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-150 group border"
                 [class.border-amber-500\/20]="!n.isRead"
                 [class.bg-amber-500\/5]="!n.isRead"
                 [class.border-transparent]="n.isRead"
                 [style.animation-delay]="(i * 30) + 'ms'"
                 [class]="'animate-slide-up'"
                 (click)="markOne(n)">

              <!-- Unread pulse dot -->
              <div class="w-2 h-2 rounded-full mt-2.5 shrink-0 transition-all"
                   [class]="n.isRead ? 'bg-slate-700' : 'bg-amber-400 shadow-sm shadow-amber-400/40 animate-pulse'"></div>

              <!-- Type icon badge -->
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                   [class]="typeColor(n.type)">
                <i class='bx text-xl' [class]="typeBxIcon(n.type)"></i>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-white leading-snug">{{ n.title }}</p>
                @if (n.body || n.message) {
                  <p class="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                    {{ n.body || n.message }}
                  </p>
                }
                <!-- Meta row: time + type badge -->
                <div class="flex items-center gap-2 mt-1.5">
                  <p class="text-xs text-slate-500 flex items-center gap-1">
                    <i class='bx bx-time-five text-xs'></i>
                    {{ timeAgo(n.createdAt) }}
                  </p>
                  @if (n.type) {
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-current/20"
                          [class]="typeColor(n.type)">
                      {{ typeLabelShort(n.type) }}
                    </span>
                  }
                </div>
              </div>

              <!-- Right column: New badge + delete -->
              <div class="flex flex-col items-end gap-2 shrink-0">
                @if (!n.isRead) {
                  <span class="badge text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">NEW</span>
                }
                <button (click)="remove(n._id, $event)"
                        class="btn-icon p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Dismiss">
                  <i class='bx bx-x text-lg'></i>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- ── Load more ──────────────────────────────────────────────── -->
        @if (svc.hasMore()) {
          <div class="text-center pt-2">
            <button (click)="svc.loadMore()" [disabled]="svc.loading()"
                    class="btn-secondary btn-sm gap-2 min-w-[160px]">
              @if (svc.loading()) {
                <i class='bx bx-loader-alt animate-spin'></i> Loading…
              } @else {
                <i class='bx bx-chevron-down'></i> Load more
              }
            </button>
          </div>
        }

        <!-- Subtle count footer -->
        <p class="text-center text-xs text-slate-600 pb-2">
          Showing {{ displayed().length }} of {{ svc.total() }}
        </p>
      }

      <!-- ── Confirm clear-all modal ─────────────────────────────────── -->
      @if (showClearConfirm()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             (click)="showClearConfirm.set(false)">
          <div class="card w-full max-w-sm text-center space-y-4 animate-slide-up" (click)="$event.stopPropagation()">
            <div class="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
              <i class='bx bx-trash text-3xl text-rose-400'></i>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">Clear all notifications?</h3>
              <p class="text-slate-400 text-sm mt-1">This will permanently remove all {{ svc.notifications().length }} notifications.</p>
            </div>
            <div class="flex gap-3">
              <button (click)="showClearConfirm.set(false)" class="btn-secondary flex-1">Cancel</button>
              <button (click)="clearAll()" class="btn-danger flex-1">Clear all</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  readonly svc = inject(NotificationService);
  private readonly toast = inject(ToastService);

  tab        = signal<Tab>('all');
  typeFilter = signal<TypeFilter>('all');
  showClearConfirm = signal(false);
  typeChips  = TYPE_CHIPS;

  // Computed: filter by tab + type chip
  displayed = computed(() => {
    let list = this.svc.notifications();
    if (this.tab() === 'unread') list = list.filter(n => !n.isRead);
    if (this.typeFilter() !== 'all') list = list.filter(n => n.type === this.typeFilter());
    return list;
  });

  activeChipLabel = computed(() => TYPE_CHIPS.find(c => c.key === this.typeFilter())?.label ?? '');

  ngOnInit() { this.svc.load(); }

  markOne(n: AppNotification) { if (!n.isRead) this.svc.markRead([n._id]); }

  remove(id: string, e: Event) { e.stopPropagation(); this.svc.delete(id); }

  confirmClearAll() { this.showClearConfirm.set(true); }

  clearAll() {
    this.svc.deleteAll();
    this.showClearConfirm.set(false);
    this.toast.success('All notifications cleared');
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  typeBxIcon(type?: string): string {
    return ({
      'task.assigned':        'bx-task',
      'task.completed':       'bxs-check-circle',
      'task.overdue':         'bx-error',
      'task.deadline_near':   'bx-time-five',
      'task.commented':       'bx-comment',
      'task.status_changed':  'bx-transfer',
      'task.mentioned':       'bx-at',
      'project.created':      'bxs-folder-plus',
      'project.status_changed':'bxs-folder',
      'project.member_added': 'bx-user-plus',
      'comment.reply':        'bx-reply',
      'comment.reaction':     'bx-happy',
      'mention':              'bx-at',
      'message':              'bx-chat',
      'message.received':     'bx-chat',
      'system':               'bx-cog',
    } as any)[type ?? ''] ?? 'bxs-bell';
  }

  typeColor(type?: string): string {
    return ({
      'task.assigned':        'bg-indigo-500/20 text-indigo-400',
      'task.completed':       'bg-emerald-500/20 text-emerald-400',
      'task.overdue':         'bg-rose-500/20 text-rose-400',
      'task.deadline_near':   'bg-amber-500/20 text-amber-400',
      'task.commented':       'bg-violet-500/20 text-violet-400',
      'task.status_changed':  'bg-orange-500/20 text-orange-400',
      'task.mentioned':       'bg-rose-500/20 text-rose-400',
      'project.created':      'bg-blue-500/20 text-blue-400',
      'project.status_changed':'bg-blue-500/15 text-blue-300',
      'project.member_added': 'bg-teal-500/20 text-teal-400',
      'comment.reply':        'bg-violet-500/15 text-violet-300',
      'comment.reaction':     'bg-pink-500/20 text-pink-400',
      'mention':              'bg-rose-500/20 text-rose-400',
      'message':              'bg-violet-500/20 text-violet-400',
      'message.received':     'bg-violet-500/20 text-violet-400',
      'system':               'bg-slate-500/20 text-slate-400',
    } as any)[type ?? ''] ?? 'bg-amber-500/20 text-amber-400';
  }

  typeLabelShort(type: string): string {
    return ({
      'task.assigned':        'Assigned',
      'task.completed':       'Done',
      'task.overdue':         'Overdue',
      'task.deadline_near':   'Due Soon',
      'task.commented':       'Comment',
      'task.status_changed':  'Status',
      'task.mentioned':       'Mention',
      'project.created':      'Project',
      'project.status_changed':'Project',
      'project.member_added': 'Project',
      'comment.reply':        'Reply',
      'comment.reaction':     'Reaction',
      'mention':              'Mention',
      'message':              'Message',
      'message.received':     'Message',
      'system':               'System',
    } as any)[type] ?? type.replace(/[._]/g, ' ');
  }

  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60)  return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
