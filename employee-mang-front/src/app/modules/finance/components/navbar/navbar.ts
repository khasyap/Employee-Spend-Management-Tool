import { Component } from '@angular/core';
import { Auth } from '../../../../core/services/auth';
import { Realtime } from '../../../../core/services/realtime';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
   constructor(
      public authService: Auth,
      private realtimeService: Realtime
    ) {}
  
    ngOnInit() {
      // Initialize realtime connection if user is logged in
      if (this.authService.isLoggedIn()) {
        this.realtimeService.connect();
      }
    }
  
    logout() {
      this.authService.logout();
      this.realtimeService.disconnect();
      window.location.href = '/auth/login';
    }
  }
  
