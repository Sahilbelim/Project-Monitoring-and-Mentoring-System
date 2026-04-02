import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector:   'app-project-detail',
  standalone: true,
  imports:    [CommonModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <a routerLink="/projects" class="btn-ghost btn-sm">← Projects</a>
      </div>
      <div class="card text-center py-20">
        <div class="text-5xl mb-4">📁</div>
        <h2 class="text-xl font-bold text-white">Project Detail</h2>
        <p class="text-slate-400 text-sm mt-2">Full project detail with tasks, members, and activity.</p>
      </div>
    </div>
  `,
})
export class ProjectDetailComponent {}
