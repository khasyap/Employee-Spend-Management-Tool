import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Api } from './api'; // Your existing Api service
import { Settings } from '../models/settings.model'; // Your Settings interface

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(private apiService: Api) { }

  // Get settings
  getSettings(): Observable<Settings> {
    return this.apiService.get<Settings>('/admin/settings').pipe(
      map(response => response.data)
    );
  }

  // Update settings
  updateSettings(settings: Partial<Settings>): Observable<Settings> {
    return this.apiService.put<Settings>('/admin/limits', settings).pipe(
      map(response => response.data)
    );
  }

  // Get only per claim limits
  getPerClaimLimits(): Observable<any> {
    return this.getSettings().pipe(
      map(settings => settings.perClaimLimitByRole)
    );
  }

  // Get only monthly limits
  getMonthlyLimits(): Observable<any[]> {
    return this.getSettings().pipe(
      map(settings => settings.monthlyLimitByCategory || [])
    );
  }
}