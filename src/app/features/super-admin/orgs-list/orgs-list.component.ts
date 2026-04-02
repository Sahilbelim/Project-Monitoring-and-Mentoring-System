import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { HttpClient }   from '@angular/common/http';
import { environment }  from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
import { finalize }     from 'rxjs';

interface Organization {
  _id: string;
  name: string;
  industry: string;
  size: string;
  isActive: boolean;
  createdAt: string;
  plan?: string; // from subscription
  subscription?: { plan: string };
  ownerId?: { _id: string; name: string; email: string; avatar?: string };
}

@Component({
  selector: 'app-orgs-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <i class='bx bxs-city text-indigo-500'></i> All Organizations
          </h1>
          <p class="text-slate-400 text-sm mt-1">Platform-wide organization management</p>
        </div>
        
        <div class="relative w-full sm:w-64">
          <i class='bx bx-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500'></i>
          <input type="text" class="input pl-10 bg-slate-800/50 border-slate-700 w-full" 
                 placeholder="Search organizations..."
                 [ngModel]="searchQuery()" (ngModelChange)="onSearch($event)">
        </div>
      </div>

      <!-- Data Table -->
      <div class="card p-0 overflow-hidden border-slate-700/50 shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-800/60 border-b border-slate-700/50">
              <tr class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                <th class="px-5 py-4">Organization</th>
                <th class="px-5 py-4">Owner</th>
                <th class="px-5 py-4">Plan & Size</th>
                <th class="px-5 py-4">Created</th>
                <th class="px-5 py-4">Status</th>
                <th class="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/30">
              @if (loading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <tr>
                    <td colspan="6" class="px-5 py-4">
                      <div class="skeleton h-8 w-full rounded-md opacity-20"></div>
                    </td>
                  </tr>
                }
              } @else if (orgs().length === 0) {
                <tr>
                  <td colspan="6" class="px-5 py-12 text-center text-slate-500">
                    <i class='bx bx-buildings text-4xl mb-2 opacity-50'></i>
                    <p>No organizations found matching your criteria.</p>
                  </td>
                </tr>
              } @else {
                @for (org of orgs(); track org._id) {
                  <tr class="hover:bg-indigo-500/5 transition-colors group">
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center shrink-0">
                          <span class="text-indigo-400 font-bold text-lg">{{ org.name.charAt(0).toUpperCase() }}</span>
                        </div>
                        <div>
                          <p class="font-bold text-white text-sm truncate max-w-[150px]" [title]="org.name">{{ org.name }}</p>
                          <p class="text-xs text-slate-500 flex items-center gap-1">
                            <i class='bx bx-briefcase'></i> {{ org.industry || 'Unknown' }}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      @if (org.ownerId) {
                        <div class="flex items-center gap-2">
                          <div class="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                            @if (org.ownerId.avatar) {
                              <img [src]="org.ownerId.avatar" class="w-full h-full object-cover">
                            } @else {
                              <span class="text-xs font-bold">{{ org.ownerId.name.charAt(0).toUpperCase() }}</span>
                            }
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-medium text-slate-300 truncate max-w-[120px]">{{ org.ownerId.name }}</p>
                            <p class="text-[10px] text-slate-500 truncate max-w-[120px]">{{ org.ownerId.email }}</p>
                          </div>
                        </div>
                      } @else {
                        <span class="text-xs text-slate-500 italic">No Owner</span>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex flex-col gap-1 items-start">
                        <span class="badge text-[10px]" 
                              [class.badge-indigo]="org.subscription?.plan === 'pro'"
                              [class.badge-amber]="org.subscription?.plan === 'enterprise'"
                              [class.badge-slate]="!org.subscription?.plan || org.subscription?.plan === 'free'">
                          {{ (org.subscription?.plan || 'Free') | uppercase }}
                        </span>
                        <span class="text-xs text-slate-500 flex items-center gap-1">
                          <i class='bx bx-group'></i> {{ org.size || '1-10' }}
                        </span>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-400">
                      {{ org.createdAt | date:'mediumDate' }}
                    </td>
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-1.5">
                        <div class="w-2 h-2 rounded-full" [class]="org.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'"></div>
                        <span class="text-xs font-medium" [class]="org.isActive ? 'text-emerald-400' : 'text-rose-400'">
                          {{ org.isActive ? 'Active' : 'Suspended' }}
                        </span>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-right">
                      <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <!-- In a real app, you might have an 'edit' or 'impersonate' button here -->
                         <button (click)="toggleOrgStatus(org)" 
                                 class="p-2 rounded-lg transition-colors border"
                                 [class]="org.isActive ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10' : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'"
                                 [title]="org.isActive ? 'Suspend Organization' : 'Reactivate Organization'">
                           <i class='bx' [class]="org.isActive ? 'bx-block' : 'bx-check-circle'"></i>
                         </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="p-4 bg-slate-800/40 border-t border-slate-700/50 flex items-center justify-between">
          <p class="text-xs text-slate-500 font-medium tracking-wide">
            Total of <span class="text-white font-bold">{{ total() }}</span> organizations
          </p>
          
          @if (totalPages() > 1) {
            <div class="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button (click)="changePage(page() - 1)" [disabled]="page() === 1" 
                      class="px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-30 hover:bg-slate-800 text-white">
                 <i class='bx bx-chevron-left '></i>
              </button>
              <div class="px-3 py-1 text-xs font-medium text-slate-400 flex items-center">
                {{ page() }} / {{ totalPages() }}
              </div>
              <button (click)="changePage(page() + 1)" [disabled]="page() === totalPages()"
                      class="px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-30 hover:bg-slate-800 text-white">
                 <i class='bx bx-chevron-right'></i>
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class OrgsListComponent implements OnInit {
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  orgs       = signal<Organization[]>([]);
  loading    = signal(true);
  searchQuery = signal('');
  
  page       = signal(1);
  totalPages = signal(1);
  total      = signal(0);

  // Debounce timer
  private searchTimeout: any;

  ngOnInit() {
    this.loadOrgs();
  }

  loadOrgs() {
    this.loading.set(true);
    const params: any = {
      page: this.page(),
      limit: 10,
    };
    
    if (this.searchQuery().trim()) {
      params.search = this.searchQuery().trim();
    }

    this.http.get<any>(`${environment.apiUrl}/org/all`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res: any) => {
          this.orgs.set(res.data || []);
          this.totalPages.set(res.pagination?.totalPages || 1);
          this.total.set(res.pagination?.total || 0);
        },
        error: () => this.toast.error('Failed to load organizations')
      });
  }

  onSearch(val: string) {
    this.searchQuery.set(val);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page.set(1);
      this.loadOrgs();
    }, 400); // 400ms debounce
  }

  changePage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadOrgs();
  }

  toggleOrgStatus(org: Organization) {
    const action = org.isActive ? 'suspend' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${org.name}?`)) return;
    
    this.http.patch<any>(`${environment.apiUrl}/org/${org._id}/status`, { isActive: !org.isActive }).subscribe({
      next: () => {

        this.toast.success(`Organization ${org.isActive ? 'suspended' : 'reactivated'}`);
        // Optimistic update
        this.orgs.update(list => list.map(o => o._id === org._id ? { ...o, isActive: !org.isActive } : o));
      },
      error: () => this.toast.error(`Failed to ${action} organization`)
    });
  }
}
