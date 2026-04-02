import { Component, computed, input, output, inject } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService }   from '../../../core/services/auth.service';
import { ThemeService }  from '../../../core/services/theme.service';
import { Role }          from '../../../core/models/user.model';

interface NavItem { bxIcon: string; label: string; path: string; roles: Role[]; color?: string; }

const NAV_ITEMS: NavItem[] = [
  { bxIcon: 'bxs-dashboard',          label: 'Dashboard',    path: '/dashboard',    roles: [],       color: 'text-indigo-500' },
  { bxIcon: 'bx-task',                label: 'My Tasks',     path: '/tasks',        roles: [],       color: 'text-violet-500' },
  { bxIcon: 'bxs-folder-open',        label: 'Projects',     path: '/projects',     roles: [Role.TEAM_LEADER, Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN], color: 'text-blue-500' },
  { bxIcon: 'bxs-group',              label: 'Teams',        path: '/teams',        roles: [Role.MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN], color: 'text-cyan-500' },
  { bxIcon: 'bxs-building-house',     label: 'Departments',  path: '/departments',  roles: [Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN], color: 'text-teal-500' },
  { bxIcon: 'bx-chat',                label: 'Chat',         path: '/chat',         roles: [],       color: 'text-emerald-500' },
  { bxIcon: 'bxs-bell',               label: 'Notifications',path: '/notifications',roles: [],       color: 'text-amber-500' },
  { bxIcon: 'bx-bar-chart-alt-2',     label: 'Analytics',    path: '/analytics',    roles: [Role.MANAGER, Role.HR, Role.ORG_ADMIN, Role.SUPER_ADMIN], color: 'text-orange-500' },
  { bxIcon: 'bxs-user-detail',        label: 'Users',        path: '/users',        roles: [Role.MANAGER, Role.ORG_ADMIN, Role.SUPER_ADMIN], color: 'text-rose-500' },
  { bxIcon: 'bxs-cog',               label: 'Org Settings', path: '/org',          roles: [Role.ORG_ADMIN, Role.SUPER_ADMIN], color: 'text-slate-500' },
];

@Component({
  selector:   'app-sidebar',
  standalone: true,
  imports:    [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 shadow-2xl backdrop-blur-xl"
           [style.background]="'var(--sidebar-bg)'"
           style="border-right:1px solid var(--border-default)"
           [class.w-64]="!collapsed()"
           [class.w-16]="collapsed()"
           [class.-translate-x-full]="collapsed() && isMobile">

      <!-- Decorative top gradient bar -->
      <div class="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-80"></div>

      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-4 h-16 shrink-0" style="border-bottom:1px solid var(--border-default)">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                     flex items-center justify-center text-white font-black text-base shrink-0
                     shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/30">
          <i class='bx bx-cube-alt text-xl'></i>
        </div>
        @if (!collapsed()) {
          <div class="animate-fade-in">
            <span class="font-black text-xl text-gradient tracking-tight">PMMS</span>
            <p class="text-[10px] leading-none mt-0.5" style="color:var(--text-tertiary)">Project Management</p>
          </div>
        }
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">

        <!-- Section label -->
        @if (!collapsed()) {
          <p class="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest mb-1" style="color:var(--text-tertiary)">
            Workspace
          </p>
        }

        @for (item of visibleNav(); track item.path; let i = $index) {
          <a [routerLink]="item.path"
             routerLinkActive="nav-link-active"
             [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
             class="nav-link group"
             [class.justify-center]="collapsed()"
             [title]="collapsed() ? item.label : ''"
             [style.animation-delay]="(i * 40) + 'ms'"
             [class.animate-slide-in-left]="true">

            <!-- Icon with glow on active -->
            <i class='bx text-xl shrink-0 transition-transform duration-200 group-hover:scale-110'
               [class]="item.bxIcon + ' ' + (item.color ?? '')"></i>

            @if (!collapsed()) {
              <span class="animate-fade-in flex-1">{{ item.label }}</span>

              <!-- Active indicator dot -->
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-0 transition-opacity duration-200
                            group-[.nav-link-active]:opacity-100 shrink-0"></span>
            }
          </a>
        }

        @if (isSuperAdmin()) {
          <div class="divider my-2"></div>
          <a routerLink="/super-admin" routerLinkActive="nav-link-active"
             class="nav-link text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
             [class.justify-center]="collapsed()">
            <i class='bx bxs-shield-alt-2 text-xl text-rose-500'></i>
            @if (!collapsed()) { <span class="animate-fade-in">Super Admin</span> }
          </a>
        }
      </nav>

      <!-- User footer -->
      <div class="p-3 shrink-0" style="border-top:1px solid var(--border-default)">
        <div class="flex items-center gap-3 px-1 py-1" [class.justify-center]="collapsed()">
          <!-- Avatar with online ring -->
          <div class="relative shrink-0">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                         flex items-center justify-center text-white text-xs font-bold shadow-md">
              {{ userInitial() }}
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500" style="border:2px solid var(--sidebar-bg)"></div>
          </div>
          @if (!collapsed()) {
            <div class="flex-1 min-w-0 animate-fade-in">
              <div class="text-sm font-semibold truncate" style="color:var(--text-primary)">{{ auth.currentUser()?.name }}</div>
              <div class="text-[11px] truncate flex items-center gap-1" style="color:var(--text-tertiary)">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                {{ auth.currentUser()?.role }}
              </div>
            </div>
            <button (click)="auth.logout()" class="btn-icon hover:text-rose-400 transition-colors" style="color:var(--text-tertiary)" title="Sign out">
              <i class='bx bx-log-out-circle text-xl'></i>
            </button>
          }
        </div>
      </div>

      <!-- Collapse toggle -->
      <button (click)="toggleCollapse.emit()"
              class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                     flex items-center justify-center
                     hover:bg-indigo-600 hover:border-indigo-500 hover:text-white
                     transition-all duration-200 shadow-lg z-10"
              [style]="'background:var(--bg-elevated);border:1px solid var(--border-strong);color:var(--text-secondary)'">
        <i class='bx text-sm font-bold text-indigo-500' [class]="collapsed() ? 'bx-chevron-right' : 'bx-chevron-left'"></i>
      </button>
    </aside>
  `,
})
export class SidebarComponent {
  collapsed      = input.required<boolean>();
  toggleCollapse = output<void>();
  isMobile       = window.innerWidth < 1024;

  constructor(readonly auth: AuthService) {}

  private themeSvc = inject(ThemeService);

  visibleNav = computed(() => {
    const role = this.auth.userRole();
    return NAV_ITEMS.filter(item => item.roles.length === 0 || (role && item.roles.includes(role)));
  });

  isSuperAdmin = computed(() => this.auth.userRole() === Role.SUPER_ADMIN);
  userInitial  = computed(() => (this.auth.currentUser()?.name ?? '?').charAt(0).toUpperCase());
}
