import { Component } from '@angular/core';
import { Auth } from './core/services/auth';
import { Realtime } from './core/services/realtime';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  protected title = 'employee-mang-front';
  
}
