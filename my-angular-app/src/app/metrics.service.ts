import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

export interface ServerMetrics {
  uptime_ms: number;
  uptime_readable: string;
  total_requests: number;
  error_count: number;
  success_count: number;
  success_rate: string;
  avg_response_time_ms: string;
  median_response_time_ms: string;
  p95_response_time_ms: string;
  p99_response_time_ms: string;
  requests_per_minute: string;
  requests_per_second: string;
}

export interface DatabaseMetrics {
  total_usuarios: number;
  total_archivos: number;
  total_predicciones: number;
  predicciones_hoy: number;
  predicciones_desercion: number;
  churn_rate: string;
}

export interface ModelMetrics {
  name: string;
  version: string;
  last_training: string;
  status: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
}

export interface SystemMetrics {
  server: ServerMetrics;
  endpoints: any[];
  database: DatabaseMetrics;
  model: ModelMetrics | null;
  risk_distribution: {
    high?: number;
    medium?: number;
    low?: number;
  };
  recent_activity: any[];
  timestamp: string;
}

export interface HealthStatus {
  status: string;
  uptime: string;
  database: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Obtener métricas del sistema
   */
  getMetrics(): Observable<SystemMetrics> {
    return this.http.get<SystemMetrics>(`${this.apiUrl}/metrics`);
  }

  /**
   * Obtener métricas con actualización automática
   */
  getMetricsAutoRefresh(intervalMs: number = 5000): Observable<SystemMetrics> {
    return interval(intervalMs).pipe(
      startWith(0),
      switchMap(() => this.getMetrics())
    );
  }

  /**
   * Health check del sistema
   */
  getHealthStatus(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.apiUrl}/health`);
  }

  /**
   * Resetear métricas
   */
  resetMetrics(): Observable<any> {
    return this.http.post(`${this.apiUrl}/metrics/reset`, {});
  }
}
