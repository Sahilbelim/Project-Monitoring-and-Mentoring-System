import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

const base = environment.apiUrl;

export interface UserStats {
  userId: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  lateCompletions: number;
  avgResolutionHours: number;
  totalLoggedHours: number;
  // dashboard-friendly aliases populated by the component
  openTasks?: number;
  dueToday?: number;
  completedThisWeek?: number;
  activeProjects?: number;
}

export interface OrgOverview {
  projects: { total: number; active: number; completed: number };
  tasks: { total: number; done: number; overdue: number; completionRate: number };
  members: { total: number };
  departments: number;
  teams: number;
}

export interface TrendPoint { date: string; count: number; }

export interface ActivityEntry {
  _id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  description?: string;
  createdAt: string;
  actorId: { _id: string; name: string; email: string; avatar?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}

  /** Personal productivity stats for the logged-in user */
  getUserStats(): Observable<UserStats> {
    return this.http.get<any>(`${base}/analytics/users/me`).pipe(
      map(res => res.data ?? res)
    );
  }

  /** Org-wide overview (managers only) */
  getOrgOverview(): Observable<OrgOverview> {
    return this.http.get<any>(`${base}/analytics/overview`).pipe(
      map(res => res.data ?? res)
    );
  }

  /** Task completion trend for last N days */
  getCompletionTrend(days = 14): Observable<TrendPoint[]> {
    return this.http.get<any>(`${base}/analytics/completion-trend?days=${days}`).pipe(
      map(res => res.data?.trend ?? res.trend ?? [])
    );
  }

  /** Recent audit activity feed */
  getActivityFeed(limit = 8): Observable<ActivityEntry[]> {
    return this.http.get<any>(`${base}/analytics/activity?limit=${limit}&page=1`).pipe(
      map(res => res.data ?? [])
    );
  }

  /** Recent tasks assigned to me */
  getRecentTasks(limit = 8): Observable<any[]> {
    return this.http.get<any>(`${base}/tasks?limit=${limit}&sortBy=createdAt&sortOrder=desc`).pipe(
      map(res => res.data ?? [])
    );
  }

  /** Unread notification count */
  getUnreadCount(): Observable<number> {
    return this.http.get<any>(`${base}/notifications/unread-count`).pipe(
      map(res => res.data?.count ?? 0)
    );
  }

  /** Load all member-level data in parallel */
  loadMemberData() {
    return forkJoin({
      userStats:   this.getUserStats(),
      recentTasks: this.getRecentTasks(8),
      trend:       this.getCompletionTrend(14),
      unreadCount: this.getUnreadCount(),
    });
  }

  /** Load all manager-level data in parallel (includes loadMemberData) */
  loadManagerData() {
    return forkJoin({
      userStats:   this.getUserStats(),
      recentTasks: this.getRecentTasks(8),
      trend:       this.getCompletionTrend(14),
      unreadCount: this.getUnreadCount(),
      orgOverview: this.getOrgOverview(),
      activity:    this.getActivityFeed(8),
    });
  }
}
