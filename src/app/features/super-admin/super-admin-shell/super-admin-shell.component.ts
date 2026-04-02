import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector:   'app-super-admin-shell',
  standalone: true,
  imports:    [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-slate-900 overflow-hidden">
      <!-- Rose-accented sidebar -->
      <aside class="fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-slate-900 border-r border-rose-900/30 shadow-2xl">
        <div class="flex items-center gap-3 px-4 py-5 border-b border-rose-900/30">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <div>
            <span class="font-bold text-sm text-white">SUPER ADMIN</span>
            <span class="block text-[10px] text-rose-400">Platform Control</span>
          </div>
        </div>
        <nav class="flex-1 py-4 px-2 space-y-1">
          <a routerLink="/super-admin" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="bg-rose-500/10 text-rose-300 border border-rose-500/20" class="nav-link">🏠 Dashboard</a>
          <a routerLink="/super-admin/organizations" routerLinkActive="bg-rose-500/10 text-rose-300 border border-rose-500/20" class="nav-link">🏢 Organizations</a>
          <a routerLink="/super-admin/users" routerLinkActive="bg-rose-500/10 text-rose-300 border border-rose-500/20" class="nav-link">👥 All Users</a>
        </nav>
        <div class="p-3 border-t border-rose-900/30">
          <a routerLink="/" class="btn-ghost w-full justify-start text-xs">← Exit Super Admin</a>
        </div>
      </aside>
      <div class="flex-1 ml-64 overflow-y-auto p-8 animate-fade-in">
        <router-outlet />
      </div>
    </div>
  `,
})
export class SuperAdminShellComponent {}
