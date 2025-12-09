import { Injectable } from '@angular/core';
import { ApiService, Usuario } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private apiService: ApiService) {}

  get username(): string {
    const user = this.apiService.currentUser;
    return user ? user.username : '';
  }

  get currentUser(): Usuario | null {
    return this.apiService.currentUser;
  }

  get isAuthenticated(): boolean {
    return this.apiService.isAuthenticated;
  }

  login(username: string, password: string) {
    return this.apiService.login(username, password);
  }

  logout() {
    this.apiService.logout();
  }
}
