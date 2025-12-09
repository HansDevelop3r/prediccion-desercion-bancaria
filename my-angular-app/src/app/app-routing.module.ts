import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
// import { UploadComponent } from './upload/upload.component'; // Deshabilitado
import { MLPredictionComponent } from './ml-prediction/ml-prediction.component';
import { AuthGuard } from './auth.guard';

import { UsuariosComponent } from './usuarios/usuarios.component';
import { ReporteComponent } from './reporte/reporte.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  // { path: 'upload', component: UploadComponent, canActivate: [AuthGuard] }, // Ruta deshabilitada
  { path: 'ml-prediction', component: MLPredictionComponent, canActivate: [AuthGuard] },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [AuthGuard] },
  { path: 'reporte', component: ReporteComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }