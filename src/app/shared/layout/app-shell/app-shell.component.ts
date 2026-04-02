import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterOutlet }      from '@angular/router';
import { SidebarComponent }  from '../sidebar/sidebar.component';
import { TopbarComponent }   from '../topbar/topbar.component';
import { ToastContainerComponent }   from '../../components/toast-container/toast-container.component';
import { NotificationService }        from '../../../core/services/notification.service';
import { ThemeService }               from '../../../core/services/theme.service';

@Component({
  selector:    'app-shell',
  standalone:  true,
  imports:     [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastContainerComponent],

  template: `
    <div class="flex h-screen overflow-hidden" style="background:var(--bg-body)">
      <!-- Sidebar -->
      <app-sidebar [collapsed]="sidebarCollapsed()" (toggleCollapse)="sidebarCollapsed.update(v => !v)" />

      <!-- Overlay for mobile -->
      @if (!sidebarCollapsed() && isMobile()) {
        <div class="fixed inset-0 z-20 lg:hidden" style="background:var(--bg-overlay);backdrop-filter:blur(4px)"
             (click)="sidebarCollapsed.set(true)"></div>
      }

      <!-- Main area -->
      <div class="flex flex-col flex-1 overflow-hidden" [class.lg:ml-64]="!sidebarCollapsed()" [class.lg:ml-16]="sidebarCollapsed()">
        <app-topbar (menuToggle)="sidebarCollapsed.update(v => !v)" />

        <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-in">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Toast notifications -->
    <app-toast-container />
  `,
})
export class AppShellComponent implements OnInit {
  private notifSvc = inject(NotificationService);
  private theme    = inject(ThemeService); // ensures theme is initialized on boot
  sidebarCollapsed = signal(false);
  isMobile         = signal(window.innerWidth < 1024);

  ngOnInit() {
    // Boot real-time notifications + load unread count
    this.notifSvc.init();
  }
}
