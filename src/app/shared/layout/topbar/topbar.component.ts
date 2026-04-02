import { Component, output, computed, inject } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterLink }      from '@angular/router';
import { AuthService }     from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService }    from '../../../core/services/theme.service';

@Component({
  selector:   'app-topbar',
  standalone: true,
  imports:    [CommonModule, RouterLink],
  template: `
    <header class="sticky top-0 z-20 h-16 flex items-center gap-4 px-4 md:px-6 backdrop-blur-xl shadow-sm"
            [style]="'background:var(--topbar-bg);border-bottom:1px solid var(--border-default)'">

      <!-- Hamburger (mobile) -->
      <button (click)="menuToggle.emit()" class="btn-icon lg:hidden" style="color:var(--text-secondary)">
        <i class='bx bx-menu text-2xl'></i>
      </button>

      <!-- Breadcrumb / Title -->
      <div class="flex-1 hidden md:block">
        <p class="text-xs font-medium tracking-wide" style="color:var(--text-tertiary)">PMMS Platform</p>
      </div>

      <!-- Right actions -->
      <div class="flex items-center gap-1">

        <!-- Search (decorative button) -->
        <button class="btn-icon hidden sm:flex" style="color:var(--text-secondary)" title="Search">
          <i class='bx bx-search text-xl'></i>
        </button>

        <!-- Theme Toggle -->
        <!-- <button (click)="theme.toggle()" class="btn-icon transition-all duration-300"
                style="color:var(--text-secondary)"
                [title]="theme.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
          <i class='bx text-xl transition-transform duration-300'
             [class]="theme.isDark() ? 'bx-sun' : 'bx-moon'"
             [class.rotate-180]="!theme.isDark()"></i>
        </button> -->

        <!-- Theme Toggle -->
<button (click)="theme.toggle()"
        class="btn-icon transition-all duration-300 flex items-center justify-center"
        style="color:var(--text-secondary)"
        [title]="theme.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">

  <i class='bx text-xl transition-all duration-300 ease-in-out'
     [class]="theme.isDark() ? 'bxs-sun' : 'bxs-moon'"
     [style.transform]="theme.isDark() 
        ? 'rotate(0deg) scale(1.1)' 
        : 'rotate(270deg) scale(1)'">
  </i>

</button>

        <!-- Notification Bell -->
        <a routerLink="/notifications" class="relative btn-icon" style="color:var(--text-secondary)" title="Notifications">
          <i class='bx bxs-bell text-xl'></i>
          @if (unreadCount() > 0) {
            <span class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full
                          bg-rose-500 text-white text-[10px] font-bold
                          flex items-center justify-center px-1 shadow-lg shadow-rose-500/30
                          animate-scale-in"
                  style="ring:2px solid var(--topbar-bg)">
              {{ unreadCount() > 9 ? '9+' : unreadCount() }}
            </span>
          }
        </a>

        <!-- Divider -->
        <div class="w-px h-6 mx-1" style="background:var(--border-default)"></div>

        <!-- User avatar -->
        <a routerLink="/profile"
           class="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer group"
           style="hover:background:var(--bg-hover)">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                       flex items-center justify-center text-white text-xs font-bold
                       ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 transition-all shadow-md">
            {{ userInitial() }}
          </div>
          <div class="hidden md:block text-left">
            <div class="text-xs font-semibold leading-none" style="color:var(--text-primary)">{{ auth.currentUser()?.name }}</div>
            <div class="text-[10px] leading-none mt-0.5 flex items-center gap-1" style="color:var(--text-secondary)">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              {{ auth.currentUser()?.role }}
            </div>
          </div>
          <i class='bx bx-chevron-down text-sm hidden md:block' style="color:var(--text-tertiary)"></i>
        </a>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  menuToggle = output<void>();

  readonly auth     = inject(AuthService);
  readonly notifSvc = inject(NotificationService);
  readonly theme    = inject(ThemeService);

  unreadCount = computed(() => this.notifSvc.unreadCount());
  userInitial = computed(() => {
    const name = this.auth.currentUser()?.name ?? '?';
    return name.charAt(0).toUpperCase();
  });
}
