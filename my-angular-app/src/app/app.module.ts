import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { MLPredictionComponent } from './ml-prediction/ml-prediction.component';
import { ReporteComponent } from './reporte/reporte.component';
import { AppRoutingModule } from './app-routing.module';
import { NgChartsModule } from 'ng2-charts';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TrainingMetricsComponent } from './training-metrics/training-metrics.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MLPredictionComponent,
    ReporteComponent,
    TrainingMetricsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule, // <-- Agrega FormsModule aquí
    HttpClientModule,
    AppRoutingModule, // <-- agrega esto
    NgChartsModule,
    UsuariosModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }