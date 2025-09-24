import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';


@Injectable({
  providedIn: 'root'
})
export class Realtime {
    private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();
  private connectionSubject = new Subject<boolean>();
  public connection$ = this.connectionSubject.asObservable();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: any;

  constructor(private authService: Auth) {}

  connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No authentication token available');
      this.connectionSubject.next(false);
      return;
    }

    try {
      // Use the correct WebSocket URL format with token
      const wsUrl = `${environment.wsUrl.replace('http', 'ws')}/api/stream?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.connectionSubject.next(true);
        this.reconnectAttempts = 0;
        clearInterval(this.reconnectInterval);
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.connectionSubject.next(false);
        this.socket = null;

        // Attempt to reconnect after a delay if it wasn't a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(3000 * this.reconnectAttempts, 15000);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          
          this.reconnectInterval = setTimeout(() => this.connect(), delay);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionSubject.next(false);
      };

      // Send heartbeat every 25 seconds
      setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);

    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      this.connectionSubject.next(false);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Normal closure');
      this.socket = null;
    }
    this.connectionSubject.next(false);
    clearInterval(this.reconnectInterval);
  }

  send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  getConnectionStatus(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}