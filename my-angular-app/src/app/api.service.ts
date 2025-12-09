import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface Usuario {
  id: number;
  username: string;
  email: string;
}

export interface ArchivoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  username: string; // ← Cambiar de 'usuario' a 'username' para coincidir con el backend
  fecha_carga: string;
  tamaño: number;
  tipo_archivo: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: Usuario;
}

export interface EstadisticasCarga {
  fecha: string;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<Usuario | null>(null);

  constructor(private http: HttpClient) {
    // Recuperar token del localStorage al inicializar
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token) {
      this.tokenSubject.next(token);
    }
    
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }

  get currentUser(): Usuario | null {
    return this.userSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenSubject.value;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Autenticación
  login(username: string, password: string): Observable<LoginResponse> {
    return new Observable(observer => {
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
        .subscribe({
          next: (response) => {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            this.tokenSubject.next(response.token);
            this.userSubject.next(response.user);
            observer.next(response);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
    });
  }

  register(username: string, password: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, { username, password, email });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  // Gestión de archivos
  uploadFile(file: File, descripcion: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('descripcion', descripcion);

    return this.http.post(`${this.apiUrl}/files/upload`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  getFiles(): Observable<ArchivoResponse[]> {
    return this.http.get<ArchivoResponse[]>(`${this.apiUrl}/files`, {
      headers: this.getAuthHeaders()
    });
  }

  deleteFile(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/files/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Estadísticas
  getUploadStatsByDate(): Observable<EstadisticasCarga[]> {
    return this.http.get<EstadisticasCarga[]>(`${this.apiUrl}/stats/uploads-by-date`, {
      headers: this.getAuthHeaders()
    });
  }
}
