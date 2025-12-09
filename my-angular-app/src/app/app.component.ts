import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  constructor(
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    // Verificar si el usuario está logueado al iniciar la aplicación
  }

  get isLoggedIn(): boolean {
    return this.apiService.isAuthenticated;
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/']);
  }
}