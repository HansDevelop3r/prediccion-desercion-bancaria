import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface CustomerData {
  ClienteID?: string;
  edad: number;
  sexo: string;
  estado_civil: string;
  nacionalidad: string;
  nivel_educativo: string;
  ingresos_mensuales: number;
  ocupacion: string;
  nivel_riesgo_crediticio: string;
  tarjeta_credito: string;
}

export interface PredictionResult {
  desercion_predicha: number;
  probabilidad_desercion: number;
  confianza: number;
  tasa_efectividad: number;
  riesgo: string;
  riesgo_original?: string;
  riesgo_detalle?: {
    puntuacion_total: number;
    factores_analizados: number;
  };
  factores_riesgo?: string[];
  cliente_id: string;
}

export interface ModelStats {
  accuracy: number;
  feature_importance: { [key: string]: number };
  training_date: string;
  csv_file: string;
  trained_by: string;
}

export interface ModelStatus {
  model_trained: boolean;
  model_stats: ModelStats | null;
  sample_data: CustomerData;
}

export interface PredictionHistory {
  id: number;
  datos_cliente: CustomerData;
  prediccion: number;
  probabilidad: number;
  fecha_prediccion: string;
}

export interface FileHistory {
  id: number;
  nombre: string;
  descripcion: string;
  usuario: string;
  fecha_carga: string;
  tamano: number;
  tipo_archivo: string;
}

@Injectable({
  providedIn: 'root'
})
export class MLService {
  private apiUrl = 'http://localhost:3000/api/ml';
  
  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Entrenar modelo XGBoost con archivo CSV
   */
  trainModel(csvFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    return this.http.post(`${this.apiUrl}/train`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Analizar dataset CSV y generar métricas
   */
  analyzeDataset(csvFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    return this.http.post(`${this.apiUrl}/analyze-dataset`, formData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Realizar predicción individual
   */
  predictSingle(customerData: CustomerData): Observable<PredictionResult> {
    return this.http.post<PredictionResult>(`${this.apiUrl}/predict`, customerData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtener estado del modelo
   */
  getModelStatus(): Observable<ModelStatus> {
    return this.http.get<ModelStatus>(`${this.apiUrl}/model/status`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtener historial de predicciones
   */
  getPredictionHistory(): Observable<{ predictions: PredictionHistory[], files: FileHistory[] }> {
    return this.http.get<{ predictions: PredictionHistory[], files: FileHistory[] }>(`${this.apiUrl}/predictions/history`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtener datos de muestra para pruebas
   */
  getSampleData(): Observable<{ sample_data: CustomerData }> {
    return this.http.get<{ sample_data: CustomerData }>(`${this.apiUrl}/sample-data`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Validar datos del cliente
   */
  validateCustomerData(data: CustomerData): string[] {
    const errors: string[] = [];

    // Validar que todos los campos estén presentes y no vacíos
    if (!data.edad || data.edad <= 0) {
      errors.push('La edad es requerida y debe ser mayor a 0');
    } else if (data.edad < 18 || data.edad > 100) {
      errors.push('La edad debe estar entre 18 y 100 años');
    }

    if (!data.sexo || data.sexo.trim() === '') {
      errors.push('El sexo es requerido');
    } else if (!['m', 'f', 'masculino', 'femenino', 'male', 'female'].includes(data.sexo.toLowerCase())) {
      errors.push('El sexo debe ser M, F, masculino, femenino, male o female');
    }

    if (!data.estado_civil || data.estado_civil.trim() === '') {
      errors.push('El estado civil es requerido');
    }

    if (!data.nacionalidad || data.nacionalidad.trim() === '') {
      errors.push('La nacionalidad es requerida');
    }

    if (!data.nivel_educativo || data.nivel_educativo.trim() === '') {
      errors.push('El nivel educativo es requerido');
    }

    if (!data.ingresos_mensuales || data.ingresos_mensuales <= 0) {
      errors.push('Los ingresos mensuales son requeridos y deben ser positivos');
    }

    if (!data.ocupacion || data.ocupacion.trim() === '') {
      errors.push('La ocupación es requerida');
    }

    if (!data.nivel_riesgo_crediticio || data.nivel_riesgo_crediticio.trim() === '') {
      errors.push('El nivel de riesgo crediticio es requerido');
    } else if (!['bajo', 'medio', 'alto'].includes(data.nivel_riesgo_crediticio.toLowerCase())) {
      errors.push('El nivel de riesgo crediticio debe ser bajo, medio o alto');
    }

    if (!data.tarjeta_credito || data.tarjeta_credito.trim() === '') {
      errors.push('La información de tarjeta de crédito es requerida');
    } else if (!['si', 'no', 'sí'].includes(data.tarjeta_credito.toLowerCase())) {
      errors.push('La tarjeta de crédito debe ser si o no');
    }

    return errors;
  }

  /**
   * Verificar si todos los campos están completos
   */
  areAllFieldsComplete(data: CustomerData): boolean {
    return !!(
      data.edad && data.edad > 0 &&
      data.sexo && data.sexo.trim() !== '' &&
      data.estado_civil && data.estado_civil.trim() !== '' &&
      data.nacionalidad && data.nacionalidad.trim() !== '' &&
      data.nivel_educativo && data.nivel_educativo.trim() !== '' &&
      data.ingresos_mensuales && data.ingresos_mensuales > 0 &&
      data.ocupacion && data.ocupacion.trim() !== '' &&
      data.nivel_riesgo_crediticio && data.nivel_riesgo_crediticio.trim() !== '' &&
      data.tarjeta_credito && data.tarjeta_credito.trim() !== ''
    );
  }

  /**
   * Formatear probabilidad como porcentaje
   */
  formatProbability(probability: number): string {
    if (probability === undefined || probability === null || isNaN(probability)) {
      console.warn('formatProbability received invalid value:', probability);
      return '0.0%';
    }
    
    // Ensure probability is a number
    const numProbability = Number(probability);
    if (isNaN(numProbability)) {
      console.warn('formatProbability could not convert to number:', probability);
      return '0.0%';
    }
    
    return `${(numProbability * 100).toFixed(1)}%`;
  }

  /**
   * Obtener color basado en el riesgo
   */
  getRiskColor(riesgo: string): string {
    if (!riesgo) {
      return '#9E9E9E'; // Gris por defecto si riesgo es undefined/null
    }
    
    switch (riesgo.toLowerCase()) {
      case 'bajo':
        return '#4CAF50'; // Verde
      case 'medio':
        return '#FF9800'; // Naranja
      case 'alto':
        return '#F44336'; // Rojo
      default:
        return '#9E9E9E'; // Gris
    }
  }

  /**
   * Obtener descripción del nivel de riesgo
   */
  getRiskDescription(riesgo: string): string {
    switch (riesgo?.toLowerCase()) {
      case 'bajo':
        return 'Cliente con bajo riesgo de deserción';
      case 'medio':
        return 'Cliente con riesgo moderado de deserción';
      case 'alto':
        return 'Cliente con alto riesgo de deserción';
      default:
        return 'Nivel de riesgo no determinado';
    }
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  generateSampleCustomer(): CustomerData {
    const samples = [
      {
        ClienteID: 'CLI001',
        edad: 35,
        sexo: 'M',
        estado_civil: 'casado',
        nacionalidad: 'peruana',
        nivel_educativo: 'universitario',
        ingresos_mensuales: 3500,
        ocupacion: 'empleado',
        nivel_riesgo_crediticio: 'medio',
        tarjeta_credito: 'si'
      },
      {
        ClienteID: 'CLI002',
        edad: 28,
        sexo: 'F',
        estado_civil: 'soltero',
        nacionalidad: 'peruana',
        nivel_educativo: 'tecnico',
        ingresos_mensuales: 2800,
        ocupacion: 'independiente',
        nivel_riesgo_crediticio: 'bajo',
        tarjeta_credito: 'no'
      },
      {
        ClienteID: 'CLI003',
        edad: 45,
        sexo: 'M',
        estado_civil: 'divorciado',
        nacionalidad: 'peruana',
        nivel_educativo: 'secundaria',
        ingresos_mensuales: 2200,
        ocupacion: 'empleado',
        nivel_riesgo_crediticio: 'alto',
        tarjeta_credito: 'si'
      }
    ];

    return samples[Math.floor(Math.random() * samples.length)];
  }
}
