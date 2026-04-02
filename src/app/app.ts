import { Component, OnInit } from '@angular/core';
import { RouterOutlet }      from '@angular/router';
import { AuthService }       from './core/services/auth.service';
import { StorageService }    from './core/services/storage.service';

@Component({
  selector:    'app-root',
  standalone:  true,
  imports:     [RouterOutlet],
  template:    `<router-outlet />`,
})
export class App implements OnInit {
  constructor(private auth: AuthService, private storage: StorageService) {}

  ngOnInit(): void {
    // If we have a stored token on page load, fetch the current user
    if (this.storage.getToken() && !this.auth.currentUser()) {
      this.auth.getMe().subscribe({ error: () => {} });
    }
  }
}
