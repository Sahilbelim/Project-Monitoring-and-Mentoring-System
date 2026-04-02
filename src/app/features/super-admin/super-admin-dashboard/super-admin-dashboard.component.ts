import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector:   'app-super-admin-dashboard',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 class="text-2xl font-bold text-white">Super Admin Dashboard</h1>
        <p class="text-slate-400 text-sm mt-1">Platform-wide overview</p>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card border border-rose-500/20"><div class="stat-value text-rose-400">—</div><div class="stat-label">Organizations</div></div>
        <div class="stat-card border border-rose-500/20"><div class="stat-value text-rose-400">—</div><div class="stat-label">Total Users</div></div>
        <div class="stat-card border border-rose-500/20"><div class="stat-value text-rose-400">—</div><div class="stat-label">Active Projects</div></div>
        <div class="stat-card border border-rose-500/20"><div class="stat-value text-emerald-400">✓</div><div class="stat-label">System Health</div></div>
      </div>
      <div class="card text-center py-12">
        <p class="text-slate-400">Connect to platform-level APIs for real data.</p>
      </div>
    </div>
  `,
})
export class SuperAdminDashboardComponent {}
