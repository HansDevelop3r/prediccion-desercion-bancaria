import { Component, OnInit } from '@angular/core';
import { ReporteService } from './reporte.service';

@Component({
  selector: 'app-reporte',
  templateUrl: './reporte.component.html',
  styleUrls: ['./reporte.component.css']
})
export class ReporteComponent implements OnInit {
  predicciones: any[] = [];
  archivos: any[] = [];
  loading = false;
  error = '';
  success = '';
  fechaInicio: string = '';
  fechaFin: string = '';

  constructor(private reporteService: ReporteService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';
    
    console.log('🔍 Cargando datos con filtros:', {
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin
    });
    
    this.reporteService.obtenerDatosReporte(this.fechaInicio, this.fechaFin).subscribe({
      next: (data) => {
        this.predicciones = data.predictions || [];
        this.archivos = data.files || [];
        this.loading = false;
        
        // Mostrar mensaje informativo
        if (this.fechaInicio || this.fechaFin) {
          console.log(`✅ Filtro aplicado: ${this.predicciones.length} predicciones, ${this.archivos.length} archivos`);
        }
      },
      error: (err) => {
        this.error = 'Error al cargar datos: ' + (err.error?.message || err.message);
        this.loading = false;
        console.error('❌ Error cargando datos:', err);
      }
    });
  }

  exportarExcel(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    
    this.reporteService.exportarExcel(this.predicciones, this.archivos, this.fechaInicio, this.fechaFin);
    
    this.success = 'Excel generado exitosamente';
    this.loading = false;
    setTimeout(() => this.success = '', 3000);
  }

  exportarPDF(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    
    try {
      this.reporteService.exportarPDF(this.predicciones, this.archivos, this.fechaInicio, this.fechaFin);
      this.success = 'PDF generado exitosamente';
      this.loading = false;
      setTimeout(() => this.success = '', 3000);
    } catch (err: any) {
      this.error = 'Error al generar PDF: ' + err.message;
      this.loading = false;
    }
  }

  filtrar(): void {
    this.cargarDatos();
  }

  limpiarFiltros(): void {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cargarDatos();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
