import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { HttpClient }    from '@angular/common/http';
import { StorageService } from './storage.service';
import { environment }   from '../../../environments/environment';
import { io, Socket }    from 'socket.io-client';

export interface AppNotification {
  _id: string; title: string; body?: string; message?: string;
  type?: string; isRead: boolean; createdAt: string;
  resourceType?: string; resourceId?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly base = `${environment.apiUrl}/notifications`;

  /** All loaded notifications (newest first) */
  readonly notifications = signal<AppNotification[]>([]);

  /** Live unread count */
  readonly unreadCount   = computed(() => this.notifications().filter(n => !n.isRead).length);

  /** Loading indicator */
  readonly loading = signal(false);

  /** Whether there are more notifications to load */
  readonly hasMore = signal(false);

  /** Total count from server (for display purposes) */
  readonly total = signal(0);

  private http    = inject(HttpClient);
  private storage = inject(StorageService);
  private zone    = inject(NgZone);

  private socket: Socket | null = null;
  private socketConnected = false;
  private readonly pageSize = 30;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  /** Call once after login (from AppShell or AppComponent). */
  init() {
    this.load();
    this.connectSocket();
  }

  /** Disconnect socket on logout. */
  destroy() {
    this.socket?.disconnect();
    this.socket = null;
    this.socketConnected = false;
    this.notifications.set([]);
  }

  // ── Socket.IO ─────────────────────────────────────────────────────────────
  private connectSocket() {
    if (this.socketConnected) return;
    const token = this.storage.getToken();
    if (!token) return;

    this.socket = io(environment.wsUrl, {
      auth:         { token },
      transports:   ['websocket', 'polling'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      this.socketConnected = true;
    });

    this.socket.on('disconnect', () => {
      this.socketConnected = false;
    });

    // ── The key event ───────────────────────────────────────────────────────
    // Backend emits: emitToUser(recipientId, 'notification:new', { notification })
    this.socket.on('notification:new', (payload: { notification: AppNotification }) => {
      this.zone.run(() => {
        const notif = payload.notification;
        // Prepend to list (newest first), avoid duplicates
        this.notifications.update(ns => {
          if (ns.some(n => n._id === notif._id)) return ns;
          return [notif, ...ns];
        });
      });
    });

    // Handle notification read ack from another tab/device
    this.socket.on('notification:read', (data: { ids: string[] }) => {
      this.zone.run(() => {
        this.notifications.update(ns =>
          ns.map(n => data.ids.includes(n._id) ? { ...n, isRead: true } : n)
        );
      });
    });
  }

  // ── REST methods ──────────────────────────────────────────────────────────
  load(params: Record<string, string | number> = {}) {
    this.loading.set(true);
    this.http.get<any>(this.base, { params: { limit: String(this.pageSize), ...params } as any }).subscribe({
      next: res => {
        this.notifications.set(res.data ?? []);
        this.total.set(res.pagination?.total ?? (res.data ?? []).length);
        this.hasMore.set((res.data ?? []).length >= this.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore() {
    const last = this.notifications();
    if (!last.length || !this.hasMore()) return;
    const oldest = last[last.length - 1];
    this.loading.set(true);
    this.http.get<any>(this.base, {
      params: { limit: String(this.pageSize), before: oldest._id } as any,
    }).subscribe({
      next: res => {
        const more: AppNotification[] = res.data ?? [];
        this.notifications.update(ns => [...ns, ...more.filter(m => !ns.some(n => n._id === m._id))]);
        this.hasMore.set(more.length >= this.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markRead(ids: string[]) {
    this.http.patch(`${this.base}/mark-read`, { ids }).subscribe({
      next: () => this.notifications.update(ns =>
        ns.map(n => ids.includes(n._id) ? { ...n, isRead: true } : n)
      ),
    });
  }

  markAllRead() {
    this.http.patch(`${this.base}/mark-all-read`, {}).subscribe({
      next: () => this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true }))),
    });
  }

  delete(id: string) {
    // Optimistic remove
    this.notifications.update(ns => ns.filter(n => n._id !== id));
    this.http.delete(`${this.base}/${id}`).subscribe({
      error: () => this.load(), // revert on error by reloading
    });
  }

  deleteAll() {
    const ids = this.notifications().map(n => n._id);
    // Optimistic clear
    this.notifications.set([]);
    this.total.set(0);
    // Delete each from backend in parallel
    ids.forEach(id => this.http.delete(`${this.base}/${id}`).subscribe({ error: () => {} }));
  }

  /** Inject a notification directly (e.g. from another socket handler) */
  prependNew(notif: AppNotification) {
    this.notifications.update(ns => {
      if (ns.some(n => n._id === notif._id)) return ns;
      return [notif, ...ns];
    });
  }
}
