import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role }      from './core/models/user.model';

export const routes: Routes = [
  // ─── Auth (public) ──────────────────────────────────────────────────────────
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // ─── App Shell (authenticated) ──────────────────────────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      // Default redirect
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // ── Dashboard ──────────────────────────────────────────────────────────
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },

      // ── Tasks ─────────────────────────────────────────────────────────────
      { path: 'tasks', loadComponent: () => import('./features/tasks/tasks.component').then(m => m.TasksComponent) },

      // ── Projects (TEAM_LEADER+) ────────────────────────────────────────────
      {
        path: 'projects',
        canActivate: [roleGuard],
        data: { roles: [Role.TEAM_LEADER, Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN] },
        children: [
          { path: '', loadComponent: () => import('./features/projects/projects-list/projects-list.component').then(m => m.ProjectsListComponent) },
          { path: ':id', loadComponent: () => import('./features/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent) },
        ],
      },

      // ── Teams (MANAGER+) ─────────────────────────────────────────────────
      {
        path: 'teams',
        canActivate: [roleGuard],
        data: { roles: [Role.MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN] },
        children: [
          { path: '', loadComponent: () => import('./features/teams/teams-list/teams-list.component').then(m => m.TeamsListComponent) },
          { path: ':id', loadComponent: () => import('./features/teams/team-detail/team-detail.component').then(m => m.TeamDetailComponent) },
        ],
      },

      // ── Departments (HR+) ────────────────────────────────────────────────
      {
        path: 'departments',
        canActivate: [roleGuard],
        data: { roles: [Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN] },
        children: [
          { path: '', loadComponent: () => import('./features/departments/departments-list/departments-list.component').then(m => m.DepartmentsListComponent) },
          { path: ':id', loadComponent: () => import('./features/departments/department-detail/department-detail.component').then(m => m.DepartmentDetailComponent) },
        ],
      },

      // ── Chat ──────────────────────────────────────────────────────────────
      { path: 'chat', loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent) },

      // ── Notifications ─────────────────────────────────────────────────────
      { path: 'notifications', loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },

      // ── Analytics (MANAGER+) ──────────────────────────────────────────────
      {
        path: 'analytics',
        canActivate: [roleGuard],
        data: { roles: [Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN] },
        loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },

      // ── User Management (MANAGER+) ────────────────────────────────────────
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: [Role.MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN] },
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
      },

      // ── Org Settings (ORG_ADMIN) ──────────────────────────────────────────
      {
        path: 'org',
        canActivate: [roleGuard],
        data: { roles: [Role.ORG_ADMIN, Role.SUPER_ADMIN] },
        loadComponent: () => import('./features/org/org-settings/org-settings.component').then(m => m.OrgSettingsComponent),
      },

      // ── Profile ───────────────────────────────────────────────────────────
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
    ],
  },

  // ─── Super Admin Portal ─────────────────────────────────────────────────────
  {
    path: 'super-admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: [Role.SUPER_ADMIN] },
    loadComponent: () => import('./features/super-admin/super-admin-shell/super-admin-shell.component').then(m => m.SuperAdminShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/super-admin/super-admin-dashboard/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent) },
      { path: 'organizations', loadComponent: () => import('./features/super-admin/orgs-list/orgs-list.component').then(m => m.OrgsListComponent) },
      { path: 'users', loadComponent: () => import('./features/super-admin/all-users/all-users.component').then(m => m.AllUsersComponent) },
    ],
  },

  // ─── Fallback ───────────────────────────────────────────────────────────────
  { path: '**', redirectTo: 'auth/login' },
];
