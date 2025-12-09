import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private apiUrl = 'http://localhost:3000/api/ml/predictions';

  constructor(private http: HttpClient) {}

  obtenerDatosReporte(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);
    
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    return this.http.get(`${this.apiUrl}/history`, { headers, params });
  }

  exportarExcel(predicciones: any[], archivos: any[], fechaInicio?: string, fechaFin?: string): void {
    const wb = XLSX.utils.book_new();
    
    // Hoja de predicciones
    const predData = predicciones.map(p => ({
      'ID': p.id,
      'Fecha': new Date(p.fecha_prediccion).toLocaleString('es-ES'),
      'Cliente ID': p.datos_cliente?.ClienteID || 'N/A',
      'Edad': p.datos_cliente?.edad || '',
      'Ingresos': p.datos_cliente?.ingresos_mensuales || '',
      'Riesgo Crediticio': p.datos_cliente?.nivel_riesgo_crediticio || '',
      'Predicción': p.prediccion === 1 ? 'Sí' : 'No',
      'Probabilidad': (p.probabilidad * 100).toFixed(2) + '%'
    }));
    
    const wsPred = XLSX.utils.json_to_sheet(predData);
    XLSX.utils.book_append_sheet(wb, wsPred, 'Predicciones');
    
    // Hoja de archivos
    const archData = archivos.map(a => ({
      'ID': a.id,
      'Fecha': new Date(a.fecha_carga).toLocaleString('es-ES'),
      'Nombre': a.nombre,
      'Descripción': a.descripcion || '',
      'Usuario': a.usuario || '',
      'Tamaño': this.formatFileSize(a.tamano || 0),
      'Tipo': a.tipo_archivo || ''
    }));
    
    const wsArch = XLSX.utils.json_to_sheet(archData);
    XLSX.utils.book_append_sheet(wb, wsArch, 'Archivos');
    
    // Hoja de resumen
    const resumenData = [
      { 'Métrica': 'Total Predicciones', 'Valor': predicciones.length },
      { 'Métrica': 'Total Archivos', 'Valor': archivos.length },
      { 'Métrica': 'Fecha Inicio', 'Valor': fechaInicio || 'Todas' },
      { 'Métrica': 'Fecha Fin', 'Valor': fechaFin || 'Todas' },
      { 'Métrica': 'Fecha Generación', 'Valor': new Date().toLocaleString('es-ES') }
    ];
    
    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_ml_${fecha}.xlsx`);
  }

  exportarPDF(predicciones: any[], archivos: any[], fechaInicio?: string, fechaFin?: string): void {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Machine Learning', 14, 22);
    
    // Información del reporte
    doc.setFontSize(11);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 32);
    
    if (fechaInicio && fechaFin) {
      doc.text(`Período: ${fechaInicio} a ${fechaFin}`, 14, 38);
    }
    
    // Resumen
    doc.setFontSize(12);
    doc.text(`Total Predicciones: ${predicciones.length}`, 14, 48);
    doc.text(`Total Archivos: ${archivos.length}`, 14, 54);
    
    // Tabla de predicciones
    doc.setFontSize(14);
    doc.text('Predicciones (últimas 20)', 14, 64);
    
    autoTable(doc, {
      startY: 68,
      head: [['Fecha', 'Cliente', 'Predicción', 'Probabilidad']],
      body: predicciones.slice(0, 20).map(p => [
        new Date(p.fecha_prediccion).toLocaleDateString('es-ES'),
        p.datos_cliente?.ClienteID || 'N/A',
        p.prediccion === 1 ? 'Sí' : 'No',
        (p.probabilidad * 100).toFixed(2) + '%'
      ]),
      theme: 'striped',
      styles: { fontSize: 9 }
    });
    
    // Tabla de archivos
    const finalY = (doc as any).lastAutoTable.finalY || 68;
    doc.setFontSize(14);
    doc.text('Archivos Cargados (últimos 10)', 14, finalY + 10);
    
    autoTable(doc, {
      startY: finalY + 14,
      head: [['Fecha', 'Nombre', 'Usuario', 'Tamaño']],
      body: archivos.slice(0, 10).map(a => [
        new Date(a.fecha_carga).toLocaleDateString('es-ES'),
        a.nombre,
        a.usuario || '',
        this.formatFileSize(a.tamano || 0)
      ]),
      theme: 'striped',
      styles: { fontSize: 9 }
    });
    
    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`reporte_ml_${fecha}.pdf`);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
