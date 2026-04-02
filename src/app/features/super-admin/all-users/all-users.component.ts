import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-all-users', standalone: true, imports: [CommonModule], template: `<div class="space-y-6"><h1 class="text-2xl font-bold text-white">All Users</h1><div class="card text-center py-16"><div class="text-5xl mb-3">👥</div><p class="text-slate-400">All platform users — connect to platform API</p></div></div>` })
export class AllUsersComponent {}
