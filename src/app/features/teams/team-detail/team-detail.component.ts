import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink }   from '@angular/router';

@Component({
  selector:   'app-team-detail',
  standalone: true,
  imports:    [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto">
      <a routerLink="/teams" class="btn-ghost btn-sm mb-4 inline-flex">← Teams</a>
      <div class="card text-center py-16"><div class="text-5xl mb-3">👥</div><p class="text-slate-400">Team detail page</p></div>
    </div>
  `,
})
export class TeamDetailComponent {}
