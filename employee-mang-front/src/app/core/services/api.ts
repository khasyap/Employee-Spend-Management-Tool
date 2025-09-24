import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Auth } from './auth';
import { Router } from '@angular/router';
import { CabRequest, CabRequestCreateRequest, CancellationCreateRequest, CabDriver } from '../models/cab.model';
@Injectable({
  providedIn: 'root'
})
export class Api {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: Auth,
    private router: Router
  ) { }

 private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // In your api.ts - handleError function
private handleError(error: HttpErrorResponse) {
  console.error('API Error:', error);
  
  // Handle 401 Unauthorized errors
  if (error.status === 401) {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
    return throwError(() => new Error('Session expired. Please login again.'));
  }
  
  let errorMessage = 'An unexpected error occurred';
  
  // Handle 500 errors with specific messages
  if (error.status === 500) {
    // Check if it's the settings error
    if (error.error && error.error.error && error.error.error.includes('perClaimLimitByRole')) {
      errorMessage = 'System configuration error. Please contact administrator.';
    } else {
      errorMessage = 'Server error. Please try again later.';
    }
  } else if (error.error instanceof ErrorEvent) {
    // Client-side error
    errorMessage = `Client Error: ${error.error.message}`;
  } else {
    // Server-side error
    errorMessage = error.error?.error || error.error?.message || error.message;
  }
  
  return throwError(() => new Error(errorMessage));
}
  

  post<T>(endpoint: string, body: any): Observable<{ success: boolean; data: T }> {
    return this.http.post<{ success: boolean; data: T }>(
      `${this.apiUrl}${endpoint}`, 
      body, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  put<T>(endpoint: string, body: any): Observable<{ success: boolean; data: T }> {
    return this.http.put<{ success: boolean; data: T }>(
      `${this.apiUrl}${endpoint}`, 
      body, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  delete<T>(endpoint: string): Observable<{ success: boolean; data: T }> {
    return this.http.delete<{ success: boolean; data: T }>(
      `${this.apiUrl}${endpoint}`, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }
// api.ts - KEEP THIS AS IS (it's already correct)
postFormData<T>(endpoint: string, formData: FormData): Observable<{ success: boolean; data: T }> {
  const headers = this.getHeaders().delete('Content-Type');
  
  return this.http.post<{ success: boolean; data: T }>(
    `${this.apiUrl}${endpoint}`, 
    formData, 
    { headers }
  ).pipe(
    catchError(this.handleError.bind(this))
  );
}

// api.ts - Add this method for file downloads
downloadFile(endpoint: string, params?: any): Observable<Blob> {
  let httpParams = new HttpParams();
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
  }
  
  const options = { 
    params: httpParams, 
    headers: this.getHeaders(),
    responseType: 'blob' as 'json'
  };
  
  return this.http.get<Blob>(
    `${this.apiUrl}${endpoint}`, 
    options
  ).pipe(
    catchError(this.handleError.bind(this))
  );
}

// Keep the original get method unchanged
get<T>(endpoint: string, params?: any): Observable<{ success: boolean; data: T }> {
  let httpParams = new HttpParams();
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key]);
      }
    });
  }
  
  const options = { 
    params: httpParams, 
    headers: this.getHeaders() 
  };
  
   return this.http.get<any>(
    `${this.apiUrl}${endpoint}`, 
    options
  ).pipe(
    map(response => {
      // Handle different response structures
      if (response.success !== undefined && response.data !== undefined) {
        return response;
      } else {
        // If the response doesn't have the standard format, wrap it
        return { success: true, data: response };
      }
    }),
    catchError(this.handleError.bind(this))
  );
}
// Cab requests
createCabRequest(request: CabRequestCreateRequest): Observable<{ success: boolean; data: CabRequest }> {
  return this.post<CabRequest>('/employee/cab-requests', request);
}

getCabRequests(params?: any): Observable<{ success: boolean; data: CabRequest[] }> {
  return this.get<CabRequest[]>('/employee/cab-requests', params);
}


// In api.ts - ensure createCancellationRequest is properly implemented
createCancellationRequest(request: any): Observable<{ success: boolean; data: any }> {
  console.log('Sending cancellation request:', request);
  return this.post<any>('/employee/cab-requests/cancellation', request);
}

// Manager endpoints
getManagerCabRequests(params?: any): Observable<{ success: boolean; data: CabRequest[] }> {
  return this.get<CabRequest[]>('/manager/cab-requests', params);
}

approveCabRequest(id: string, comment?: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/manager/cab-requests/${id}/approve`, { comment });
}

rejectCabRequest(id: string, comment: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/manager/cab-requests/${id}/reject`, { comment });
}

approveCancellation(cabRequestId: string, cancellationId: string, comment?: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/manager/cab-requests/${cabRequestId}/cancellation/${cancellationId}/approve`, { comment });
}

// Finance endpoints
getFinanceCabRequests(params?: any): Observable<{ success: boolean; data: CabRequest[] }> {
  return this.get<CabRequest[]>('/finance/cab-requests', params);
}

getAvailableCabDrivers(params?: any): Observable<{ success: boolean; data: CabDriver[] }> {
  return this.get<CabDriver[]>('/finance/cab-drivers/available', params);
}

assignCabToRequest(id: string, cabDriverId: string, comment?: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/finance/cab-requests/${id}/assign`, { cabDriverId, comment });
}

approveFinanceCabRequest(id: string, comment?: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/finance/cab-requests/${id}/approve`, { comment });
}

// Admin endpoints
getAdminCabRequests(params?: any): Observable<{ success: boolean; data: CabRequest[] }> {
  return this.get<CabRequest[]>('/admin/cab-requests', params);
}

approveAdminCabRequest(id: string, comment?: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/admin/cab-requests/${id}/approve`, { comment });
}

rejectAdminCabRequest(id: string, comment: string): Observable<{ success: boolean; data: CabRequest }> {
  return this.put<CabRequest>(`/admin/cab-requests/${id}/reject`, { comment });
}
getCabRequest(id: string): Observable<any> {
  return this.get<any>(`/employee/cab-requests/${id}`);
}
}