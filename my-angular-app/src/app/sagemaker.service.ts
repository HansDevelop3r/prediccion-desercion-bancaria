import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TrainingJobRequest {
  jobName: string;
  inputData: any;
}

export interface TrainingJobStatus {
  jobName: string;
  status: string;
}

export interface EndpointRequest {
  endpointName: string;
  modelName: string;
}

export interface PredictionRequest {
  endpointName: string;
  data: any;
}

export interface PredictionResponse {
  success: boolean;
  prediction: any;
}

export interface SageMakerEndpoint {
  EndpointName: string;
  EndpointArn: string;
  EndpointStatus: string;
  CreationTime: string;
  LastModifiedTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class SageMakerService {
  private apiUrl = 'http://localhost:3000/api/sagemaker';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Crear un trabajo de entrenamiento
   */
  createTrainingJob(request: TrainingJobRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/training-job`, request, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Obtener estado de trabajo de entrenamiento
   */
  getTrainingJobStatus(jobName: string): Observable<TrainingJobStatus> {
    return this.http.get<TrainingJobStatus>(`${this.apiUrl}/training-job/${jobName}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Crear un endpoint
   */
  createEndpoint(request: EndpointRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/endpoint`, request, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Hacer una predicción
   */
  predict(request: PredictionRequest): Observable<PredictionResponse> {
    return this.http.post<PredictionResponse>(`${this.apiUrl}/predict`, request, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Subir datos de entrenamiento
   */
  uploadTrainingData(fileName: string, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload-training-data`, {
      fileName,
      data
    }, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Listar endpoints disponibles
   */
  listEndpoints(): Observable<{success: boolean, endpoints: SageMakerEndpoint[]}> {
    return this.http.get<{success: boolean, endpoints: SageMakerEndpoint[]}>(`${this.apiUrl}/endpoints`, {
      headers: this.getAuthHeaders()
    });
  }
}
