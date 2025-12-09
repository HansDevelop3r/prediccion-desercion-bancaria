import { Component, OnInit } from '@angular/core';
import { UsuariosService, Usuario } from './usuarios.service';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  get tokenDebug(): string {
    return localStorage.getItem('token') || '';
  }
  usuarios: Usuario[] = [];
  usuarioForm: Usuario = { username: '', email: '', password: '' };
  editMode: boolean = false;
  selectedUserId: number | null = null;
  mensaje: string = '';
  mensajeTipo: 'success' | 'error' | 'info' = 'info';
  searchText: string = '';

  constructor(private usuariosService: UsuariosService, private apiService: ApiService) {}

  ngOnInit() {
    this.listarUsuarios();
  }

  get token(): string {
    return localStorage.getItem('token') || '';
  }

  usuariosFiltrados(): Usuario[] {
    if (!this.searchText) {
      return this.usuarios;
    }
    const search = this.searchText.toLowerCase();
    return this.usuarios.filter(u => 
      u.username.toLowerCase().includes(search) || 
      u.email.toLowerCase().includes(search)
    );
  }

  getMensajeClass(): string {
    return `mensaje mensaje-${this.mensajeTipo}`;
  }

  getMensajeIcon(): string {
    switch(this.mensajeTipo) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'info' = 'info') {
    this.mensaje = texto;
    this.mensajeTipo = tipo;
    setTimeout(() => {
      this.mensaje = '';
    }, 5000);
  }

  listarUsuarios() {
    if (!this.token) {
      this.mostrarMensaje('Debes iniciar sesión para ver los usuarios.', 'error');
      return;
    }
    this.usuariosService.getUsuarios(this.token).subscribe({
      next: (data) => {
        this.usuarios = data;
        if (data.length === 0) {
          this.mostrarMensaje('No hay usuarios registrados', 'info');
        }
      },
      error: (err) => {
        this.mostrarMensaje(`Error al listar usuarios: ${err?.error?.message || err?.message || 'Error desconocido'}`, 'error');
      }
    });
  }

  guardarUsuario() {
    if (this.editMode && this.selectedUserId) {
      this.usuariosService.editarUsuario(this.selectedUserId, this.usuarioForm, this.token).subscribe({
        next: () => {
          this.mostrarMensaje('Usuario actualizado exitosamente', 'success');
          this.cancelarEdicion();
          this.listarUsuarios();
        },
        error: (err) => {
          this.mostrarMensaje(err?.error?.message || 'Error al actualizar usuario', 'error');
        }
      });
    } else {
      const { username, email, password } = this.usuarioForm;
      if (!username || !email || !password) {
        this.mostrarMensaje('Todos los campos son obligatorios', 'error');
        return;
      }
      this.usuariosService.crearUsuario(this.usuarioForm).subscribe({
        next: () => {
          this.mostrarMensaje('Usuario creado exitosamente', 'success');
          this.usuarioForm = { username: '', email: '', password: '' };
          this.listarUsuarios();
        },
        error: (err) => {
          this.mostrarMensaje(err?.error?.message || 'Error al crear usuario', 'error');
        }
      });
    }
  }

  editarUsuario(usuario: Usuario) {
    this.editMode = true;
    this.selectedUserId = usuario.id!;
    this.usuarioForm = { username: usuario.username, email: usuario.email, password: '' };
    this.mostrarMensaje(`Editando usuario: ${usuario.username}`, 'info');
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.editMode = false;
    this.selectedUserId = null;
    this.usuarioForm = { username: '', email: '', password: '' };
    this.mostrarMensaje('Edición cancelada', 'info');
  }

  eliminarUsuario(id: number) {
    const usuario = this.usuarios.find(u => u.id === id);
    if (confirm(`¿Estás seguro que deseas eliminar al usuario "${usuario?.username}"?\n\nEsta acción no se puede deshacer.`)) {
      this.usuariosService.eliminarUsuario(id, this.token).subscribe({
        next: () => {
          this.mostrarMensaje('Usuario eliminado exitosamente', 'success');
          this.listarUsuarios();
        },
        error: (err) => {
          this.mostrarMensaje(err?.error?.message || 'Error al eliminar usuario', 'error');
        }
      });
    }
  }
}
