import { Component, OnInit } from '@angular/core';
import { MLService, ModelStatus } from '../ml.service';
import { Router } from '@angular/router';

interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  roc_auc?: number;
  feature_importance?: { [key: string]: number };
  confusion_matrix?: {
    true_positive: number;
    true_negative: number;
    false_positive: number;
    false_negative: number;
  };
  training_info?: {
    total_samples?: number;
    training_samples?: number;
    test_samples?: number;
    training_date?: string;
    csv_file?: string;
    trained_by?: string;
  };
}

@Component({
  selector: 'app-training-metrics',
  templateUrl: './training-metrics.component.html',
  styleUrls: ['./training-metrics.component.css']
})
export class TrainingMetricsComponent implements OnInit {
  metrics: ModelMetrics = {};
  modelStatus: ModelStatus | null = null;
  loading: boolean = false;
  error: string = '';
  featureImportanceArray: Array<{name: string, value: number, percentage: string}> = [];
  showDetails: boolean = false;
  modelTrained: boolean = false;

  constructor(
    private mlService: MLService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadModelMetrics();
  }

  loadModelMetrics(): void {
    this.loading = true;
    this.error = '';

    this.mlService.getModelStatus().subscribe({
      next: (response: ModelStatus) => {
        console.log('📊 Estado del modelo recibido:', response);
        this.modelStatus = response;
        this.modelTrained = response.model_trained;

        if (response.model_stats) {
          // Mapear ModelStats a ModelMetrics
          this.metrics = {
            accuracy: response.model_stats.accuracy,
            precision: (response.model_stats as any).precision,
            recall: (response.model_stats as any).recall,
            f1_score: (response.model_stats as any).f1_score,
            roc_auc: (response.model_stats as any).roc_auc,
            feature_importance: response.model_stats.feature_importance,
            training_info: {
              training_date: response.model_stats.training_date,
              csv_file: response.model_stats.csv_file,
              trained_by: response.model_stats.trained_by
            }
          };
          this.processFeatureImportance();
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Error cargando métricas:', err);
        this.error = 'No se pudieron cargar las métricas del modelo. Asegúrate de que el modelo esté entrenado.';
        this.loading = false;
      }
    });
  }

  processFeatureImportance(): void {
    if (this.metrics && this.metrics.feature_importance) {
      this.featureImportanceArray = Object.entries(this.metrics.feature_importance)
        .map(([name, value]) => ({
          name: this.formatFeatureName(name),
          value: value,
          percentage: (value * 100).toFixed(2) + '%'
        }))
        .sort((a, b) => b.value - a.value);
    }
  }

  formatFeatureName(name: string): string {
    const translations: { [key: string]: string } = {
      'edad': 'Edad',
      'sexo': 'Sexo',
      'estado_civil': 'Estado Civil',
      'nacionalidad': 'Nacionalidad',
      'nivel_educativo': 'Nivel Educativo',
      'ingresos_mensuales': 'Ingresos Mensuales',
      'ocupacion': 'Ocupación',
      'nivel_riesgo_crediticio': 'Riesgo Crediticio',
      'tarjeta_credito': 'Tarjeta de Crédito'
    };
    return translations[name] || name;
  }

  getMetricValue(metricName: string): number {
    return (this.metrics as any)[metricName] || 0;
  }

  getMetricClass(value: number, metricType: string): string {
    if (metricType === 'accuracy' || metricType === 'roc_auc') {
      if (value >= 0.90) return 'metric-excellent';
      if (value >= 0.80) return 'metric-good';
      if (value >= 0.70) return 'metric-fair';
      return 'metric-poor';
    }
    if (metricType === 'f1_score') {
      if (value >= 0.80) return 'metric-excellent';
      if (value >= 0.70) return 'metric-good';
      if (value >= 0.60) return 'metric-fair';
      return 'metric-poor';
    }
    // precision, recall
    if (value >= 0.85) return 'metric-excellent';
    if (value >= 0.75) return 'metric-good';
    if (value >= 0.65) return 'metric-fair';
    return 'metric-poor';
  }

  getMetricInterpretation(value: number, metricType: string): string {
    const interpretations: { [key: string]: { [key: string]: string } } = {
      'accuracy': {
        'excellent': 'Excelente precisión general del modelo',
        'good': 'Buena precisión, resultados confiables',
        'fair': 'Precisión aceptable, puede mejorar',
        'poor': 'Precisión baja, requiere mejoras'
      },
      'precision': {
        'excellent': 'Muy alta confiabilidad en predicciones positivas',
        'good': 'Alta confiabilidad en predicciones',
        'fair': 'Confiabilidad aceptable',
        'poor': 'Muchos falsos positivos'
      },
      'recall': {
        'excellent': 'Detecta casi todos los casos de fuga',
        'good': 'Detecta la mayoría de casos',
        'fair': 'Detecta cantidad aceptable',
        'poor': 'Pierde muchos casos de fuga'
      },
      'f1_score': {
        'excellent': 'Excelente balance entre precisión y recall',
        'good': 'Buen balance general',
        'fair': 'Balance aceptable',
        'poor': 'Balance pobre, requiere ajustes'
      },
      'roc_auc': {
        'excellent': 'Excelente capacidad de discriminación',
        'good': 'Buena capacidad de discriminación',
        'fair': 'Capacidad aceptable',
        'poor': 'Capacidad limitada'
      }
    };

    const metricClass = this.getMetricClass(value, metricType).replace('metric-', '');
    return interpretations[metricType]?.[metricClass] || '';
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  refreshMetrics(): void {
    this.loadModelMetrics();
  }

  goToTraining(): void {
    this.router.navigate(['/ml-prediction']);
  }

  getProgressBarWidth(value: number): string {
    return (value * 100).toFixed(0) + '%';
  }
}
