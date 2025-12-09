import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Usuario {
  id?: number;
  username: string;
  email: string;
  password?: string;
  fecha_creacion?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = '/api/usuarios';

  constructor(private http: HttpClient) {}

  getUsuarios(token: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  crearUsuario(usuario: Usuario): Observable<any> {
    return this.http.post('/api/auth/register', usuario);
  }

  editarUsuario(id: number, usuario: Usuario, token: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, usuario, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }

  eliminarUsuario(id: number, token: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }
}
