import { Component, OnInit } from '@angular/core';
import { MLService, CustomerData, PredictionResult, ModelStatus, PredictionHistory, FileHistory } from '../ml.service';

@Component({
  selector: 'app-ml-prediction',
  templateUrl: './ml-prediction.component.html',
  styleUrls: ['./ml-prediction.component.css']
})
export class MLPredictionComponent implements OnInit {
  // Estados del componente
  activeTab: string = 'predict';
  activeHistoryTab: string = 'predictions';
  loading: boolean = false;
  modelStatus: ModelStatus | null = null;
  
  // Datos del cliente
  customerData: CustomerData = {
    ClienteID: '',
    edad: 0,
    sexo: '',
    estado_civil: '',
    nacionalidad: '',
    nivel_educativo: '',
    ingresos_mensuales: 0,
    ocupacion: '',
    nivel_riesgo_crediticio: '',
    tarjeta_credito: ''
  };

  // Resultados
  predictionResult: PredictionResult | null = null;
  predictionHistory: PredictionHistory[] = [];
  fileHistory: FileHistory[] = [];
  
  // Entrenamiento
  trainingResult: any = null;
  selectedFile: File | null = null;
  
  // Mensajes
  errorMessage: string = '';
  successMessage: string = '';

  // Validación
  validationErrors: string[] = [];
  isFormValid: boolean = false;

  // Opciones para selects
  sexOptions = ['M', 'F'];
  estadoCivilOptions = ['soltero', 'casado', 'viudo', 'divorciado'];
  nacionalidadOptions = ['peruana', 'extranjera'];
  nivelEducativoOptions = ['primaria', 'secundaria', 'tecnico', 'universitario', 'posgrado'];
  ocupacionOptions = ['empleado', 'independiente', 'jubilado', 'estudiante', 'desempleado'];
  riesgoCrediticioOptions = ['bajo', 'medio', 'alto'];
  tarjetaCreditoOptions = ['si', 'no'];

  constructor(private mlService: MLService) { }

  ngOnInit(): void {
    this.loadModelStatus();
    this.loadPredictionHistory();
    this.validateForm(); // Inicializar validación
  }

  

  /**
   * Cambiar tab activo
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  /**
   * Cargar estado del modelo
   */
  loadModelStatus(): void {
    this.mlService.getModelStatus().subscribe({
      next: (status) => {
        this.modelStatus = status;
        if (status.sample_data) {
          this.customerData = { ...status.sample_data };
        }
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar estado del modelo';
        console.error('Error:', error);
      }
    });
  }

  /**
   * Cargar historial de predicciones
   */
  loadPredictionHistory(): void {
    this.mlService.getPredictionHistory().subscribe({
      next: (response) => {
        this.predictionHistory = response.predictions;
        this.fileHistory = response.files;
      },
      error: (error) => {
        console.error('Error loading prediction history:', error);
      }
    });
  }

  /**
   * Realizar predicción
   */
  predictChurn(): void {
    this.clearMessages();
    
    // Validar que todos los campos estén completos
    if (!this.mlService.areAllFieldsComplete(this.customerData)) {
      this.errorMessage = 'Por favor complete todos los campos antes de realizar la predicción';
      return;
    }
    
    // Validar datos
    const errors = this.mlService.validateCustomerData(this.customerData);
    if (errors.length > 0) {
      this.errorMessage = 'Errores de validación: ' + errors.join(', ');
      return;
    }

    this.loading = true;
    
    this.mlService.predictSingle(this.customerData).subscribe({
      next: (result) => {
        console.log('Prediction result received:', result);
        console.log('Tasa efectividad value:', result.tasa_efectividad);
        this.predictionResult = result;
        this.successMessage = 'Predicción realizada exitosamente';
        this.loadPredictionHistory(); // Actualizar historial
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al realizar predicción';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  /**
   * Entrenar modelo
   */
  trainModel(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Por favor seleccione un archivo CSV';
      return;
    }

    this.clearMessages();
    this.loading = true;
    
    this.mlService.trainModel(this.selectedFile).subscribe({
      next: (result) => {
        console.log('Training result received:', result);
        console.log('Feature importance:', result.feature_importance);
        console.log('Feature importance type:', typeof result.feature_importance);
        
        // Si feature_importance es un string, parsearlo
        if (typeof result.feature_importance === 'string') {
          try {
            result.feature_importance = JSON.parse(result.feature_importance);
          } catch (e) {
            console.error('Error parsing feature_importance:', e);
          }
        }
        
        this.trainingResult = result;
        this.successMessage = 'Modelo entrenado exitosamente';
        this.loadModelStatus(); // Actualizar estado del modelo
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al entrenar modelo';
        this.loading = false;
        console.error('Error:', error);
      }
    });
  }

  /**
   * Manejar selección de archivo
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        this.selectedFile = file;
        this.clearMessages();
      } else {
        this.errorMessage = 'Por favor seleccione un archivo CSV válido';
        this.selectedFile = null;
      }
    }
  }

  /**
   * Cargar datos de ejemplo
   */
  loadSampleData(): void {
    this.customerData = this.mlService.generateSampleCustomer();
    this.clearMessages();
    this.validateForm(); // Validar después de cargar datos
  }

  /**
   * Limpiar formulario
   */
  clearForm(): void {
    this.customerData = {
      ClienteID: '',
      edad: 0,
      sexo: '',
      estado_civil: '',
      nacionalidad: '',
      nivel_educativo: '',
      ingresos_mensuales: 0,
      ocupacion: '',
      nivel_riesgo_crediticio: '',
      tarjeta_credito: ''
    };
    this.predictionResult = null;
    this.clearMessages();
    this.validateForm(); // Validar después de limpiar formulario
  }

  /**
   * Limpiar mensajes
   */
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Formatear probabilidad
   */
  formatProbability(probability: number): string {
    return this.mlService.formatProbability(probability);
  }

  /**
   * Obtener color de riesgo
   */
  getRiskColor(riesgo: string): string {
    return this.mlService.getRiskColor(riesgo || '');
  }

  /**
   * Obtener las claves de un objeto (para *ngIf)
   */
  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  /**
   * Formatear nombre de característica para mostrar
   */
  formatFeatureName(key: string): string {
    const names: { [key: string]: string } = {
      'edad': 'Edad',
      'sexo': 'Sexo',
      'estado_civil': 'Estado Civil',
      'nacionalidad': 'Nacionalidad',
      'nivel_educativo': 'Nivel Educativo',
      'ingresos_mensuales': 'Ingresos Mensuales',
      'ocupacion': 'Ocupación',
      'nivel_riesgo_crediticio': 'Nivel de Riesgo Crediticio',
      'tarjeta_credito': 'Tarjeta de Crédito'
    };
    return names[key] || key;
  }

  /**
   * Obtener descripción de riesgo
   */
  getRiskDescription(riesgo: string): string {
    return this.mlService.getRiskDescription(riesgo || '');
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    return this.mlService.formatFileSize(bytes);
  }

  /**
   * Formatear fecha
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtener texto de predicción
   */
  getPredictionText(prediction: number): string {
    return prediction === 1 ? 'Sí' : 'No';
  }

  /**
   * Obtener clase CSS para predicción
   */
  getPredictionClass(prediction: number): string {
    return prediction === 1 ? 'prediction-positive' : 'prediction-negative';
  }

  /**
   * Validar formulario en tiempo real
   */
  validateForm(): void {
    this.validationErrors = this.mlService.validateCustomerData(this.customerData);
    this.isFormValid = this.mlService.areAllFieldsComplete(this.customerData) && this.validationErrors.length === 0;
  }

  /**
   * Evento cuando cambia cualquier campo
   */
  onFieldChange(): void {
    this.validateForm();
    this.errorMessage = '';
  }

  /**
   * Actualizar historial de predicciones
   */
  refreshHistory(): void {
    this.loadPredictionHistory();
    this.successMessage = 'Historial actualizado correctamente';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  /**
   * Generar recomendaciones personalizadas basadas en la predicción
   */
  generarRecomendaciones(result: PredictionResult, customerData: CustomerData): string[] {
    const recomendaciones: string[] = [];
    const riesgo = result.riesgo || '';
    const probabilidad = result.probabilidad_desercion;
    const factores = result.factores_riesgo || [];

    // Recomendaciones según nivel de riesgo
    if (riesgo === 'ALTO' || probabilidad > 0.7) {
      recomendaciones.push('🚨 **Acción Inmediata Requerida**: El cliente presenta alto riesgo de deserción. Se recomienda contacto directo del gerente de cuenta.');
      recomendaciones.push('💰 **Revisión de Beneficios**: Ofrecer tasas preferenciales o productos financieros exclusivos para retener al cliente.');
      recomendaciones.push('📞 **Seguimiento Prioritario**: Programar llamada telefónica en las próximas 48 horas para entender necesidades y preocupaciones.');
    } else if (riesgo === 'MEDIO' || probabilidad > 0.4) {
      recomendaciones.push('⚠️ **Monitoreo Activo**: Cliente en riesgo moderado. Implementar seguimiento mensual personalizado.');
      recomendaciones.push('🎁 **Incentivos**: Considerar ofertas de fidelización como cashback o puntos de recompensa.');
    } else {
      recomendaciones.push('✅ **Cliente Estable**: Bajo riesgo de deserción. Mantener comunicación regular y calidad de servicio.');
      recomendaciones.push('📧 **Marketing Proactivo**: Cliente ideal para campañas de venta cruzada de productos adicionales.');
    }

    // Recomendaciones según factores de riesgo específicos
    if (factores.some(f => f.toLowerCase().includes('ingreso'))) {
      recomendaciones.push('💵 **Asesoría Financiera**: Los ingresos son un factor de riesgo. Ofrecer productos ajustados a su capacidad de pago.');
      recomendaciones.push('📊 **Revisión de Línea de Crédito**: Considerar ajuste de límites para evitar sobreendeudamiento.');
    }

    if (factores.some(f => f.toLowerCase().includes('crediticio') || f.toLowerCase().includes('riesgo'))) {
      recomendaciones.push('🏦 **Educación Financiera**: Ofrecer talleres o asesoría sobre manejo de crédito y mejora de historial crediticio.');
      recomendaciones.push('📈 **Plan de Mejora**: Diseñar estrategia personalizada para que el cliente mejore su score crediticio.');
    }

    if (factores.some(f => f.toLowerCase().includes('historial'))) {
      recomendaciones.push('🔄 **Revisión de Relación Comercial**: El historial indica problemas previos. Evaluar refinanciación o reestructuración de deuda.');
    }

    if (factores.some(f => f.toLowerCase().includes('edad') || f.toLowerCase().includes('grupo etario'))) {
      if (customerData.edad < 30) {
        recomendaciones.push('🎓 **Productos para Jóvenes**: Ofrecer cuentas digitales, apps móviles y beneficios en entretenimiento.');
      } else if (customerData.edad > 60) {
        recomendaciones.push('👴 **Atención Especializada**: Ofrecer asesoría presencial y productos de inversión para jubilación.');
      }
    }

    if (factores.some(f => f.toLowerCase().includes('laboral') || f.toLowerCase().includes('ocupación'))) {
      recomendaciones.push('💼 **Estabilidad Laboral**: La situación laboral es un factor. Ofrecer seguros de desempleo o protección de pagos.');
    }

    // Recomendaciones según perfil del cliente
    if (customerData.ingresos_mensuales < 2000) {
      recomendaciones.push('🛡️ **Protección Financiera**: Cliente de ingresos bajos. Ofrecer microseguros y productos de ahorro accesibles.');
    } else if (customerData.ingresos_mensuales > 10000) {
      recomendaciones.push('💎 **Servicios Premium**: Cliente de altos ingresos. Asignar ejecutivo de banca privada y productos de inversión.');
    }

    if (customerData.nivel_educativo === 'primaria' || customerData.nivel_educativo === 'secundaria') {
      recomendaciones.push('📚 **Simplificación de Productos**: Ofrecer productos simples y fáciles de entender con atención personalizada.');
    }

    if (customerData.tarjeta_credito === 'no') {
      recomendaciones.push('💳 **Oferta de Tarjeta**: Cliente sin tarjeta de crédito. Ofrecer tarjeta básica para incrementar engagement.');
    }

    // Recomendaciones según estado civil
    if (customerData.estado_civil === 'casado') {
      recomendaciones.push('👨‍👩‍👧‍👦 **Productos Familiares**: Ofrecer cuentas conjuntas, seguros de vida y productos para educación de hijos.');
    } else if (customerData.estado_civil === 'soltero') {
      recomendaciones.push('🎯 **Productos Individuales**: Enfocarse en inversión personal, viajes y beneficios de estilo de vida.');
    }

    // Recomendación de acción según puntuación de riesgo
    if (result.riesgo_detalle?.puntuacion_total) {
      const puntuacion = result.riesgo_detalle.puntuacion_total;
      if (puntuacion >= 7) {
        recomendaciones.push('🔴 **Alerta Máxima (Puntuación: ' + puntuacion + '/10)**: Intervención inmediata del equipo de retención.');
      } else if (puntuacion >= 5) {
        recomendaciones.push('🟡 **Alerta Media (Puntuación: ' + puntuacion + '/10)**: Programar revisión de cuenta en los próximos 15 días.');
      } else {
        recomendaciones.push('🟢 **Estado Óptimo (Puntuación: ' + puntuacion + '/10)**: Cliente satisfecho. Buscar oportunidades de upselling.');
      }
    }

    return recomendaciones;
  }

  /**
   * Generar plan de mejora específico
   */
  generarPlanMejora(result: PredictionResult, customerData: CustomerData): string[] {
    const plan: string[] = [];
    const factores = result.factores_riesgo || [];

    plan.push('📋 **Plan de Acción para Reducir Riesgo de Deserción:**');
    plan.push('');

    // Mejoras según factores de riesgo
    if (factores.some(f => f.toLowerCase().includes('ingreso'))) {
      plan.push('1️⃣ **Mejorar Estabilidad Financiera**:');
      plan.push('   • Buscar aumento de ingresos o fuentes adicionales de ingreso');
      plan.push('   • Reducir gastos no esenciales en un 15-20%');
      plan.push('   • Crear fondo de emergencia equivalente a 3-6 meses de gastos');
    }

    if (factores.some(f => f.toLowerCase().includes('crediticio') || f.toLowerCase().includes('riesgo'))) {
      plan.push('2️⃣ **Mejorar Score Crediticio**:');
      plan.push('   • Pagar todas las deudas a tiempo (100% de pagos puntuales)');
      plan.push('   • Reducir uso de tarjetas de crédito por debajo del 30% del límite');
      plan.push('   • Evitar solicitar múltiples créditos en período corto');
      plan.push('   • Mantener cuentas antiguas abiertas para historial crediticio largo');
    }

    if (factores.some(f => f.toLowerCase().includes('historial'))) {
      plan.push('3️⃣ **Reconstruir Historial Bancario**:');
      plan.push('   • Mantener saldos positivos en cuenta corriente/ahorro');
      plan.push('   • Evitar sobregiros y cheques rechazados');
      plan.push('   • Realizar transacciones regulares para demostrar actividad');
    }

    if (factores.some(f => f.toLowerCase().includes('laboral'))) {
      plan.push('4️⃣ **Fortalecer Estabilidad Laboral**:');
      plan.push('   • Mantener empleo actual por al menos 1 año');
      plan.push('   • Considerar capacitación para mejor posición laboral');
      plan.push('   • Diversificar ingresos con trabajo freelance o inversiones');
    }

    if (customerData.nivel_educativo === 'primaria' || customerData.nivel_educativo === 'secundaria') {
      plan.push('5️⃣ **Educación Financiera**:');
      plan.push('   • Asistir a talleres de educación financiera del banco');
      plan.push('   • Leer sobre presupuesto y planificación financiera');
      plan.push('   • Usar apps de gestión financiera personal');
    }

    plan.push('');
    plan.push('⏱️ **Plazo Recomendado**: 3-6 meses para ver mejoras significativas');
    plan.push('📊 **Seguimiento**: Revisión mensual de progreso con ejecutivo de cuenta');

    return plan;
  }

  /**
   * Exportar recomendaciones a PDF
   */
  exportarRecomendacionesPDF(): void {
    if (!this.predictionResult) {
      this.errorMessage = 'No hay resultados de predicción para exportar';
      return;
    }

    const result = this.predictionResult; // Guardar referencia para evitar null checks

    import('jspdf').then(jsPDFModule => {
      import('jspdf-autotable').then(autoTableModule => {
        const jsPDF = jsPDFModule.default;
        const autoTable = autoTableModule.default;
        
        const doc = new jsPDF();
        let yPosition = 20;

        // Título
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Informe de Predicción y Recomendaciones', 14, yPosition);
        yPosition += 10;

        // Información del cliente
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Cliente: ${result.cliente_id}`, 14, yPosition);
        yPosition += 7;
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, yPosition);
        yPosition += 10;

        // Resultado de la predicción
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resultado de la Predicción', 14, yPosition);
        yPosition += 7;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Deserción Predicha: ${this.getPredictionText(result.desercion_predicha)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Probabilidad: ${this.formatProbability(result.probabilidad_desercion)}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Nivel de Riesgo: ${result.riesgo || 'N/A'}`, 14, yPosition);
        yPosition += 10;

        // Recomendaciones
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendaciones Personalizadas', 14, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const recomendaciones = this.generarRecomendaciones(result, this.customerData);
        recomendaciones.forEach((rec, index) => {
          const cleanRec = rec.replace(/\*\*/g, '').replace(/🚨|⚠️|✅|💰|📞|🎁|📧|💵|📊|🏦|📈|🔄|🎓|👴|💼|🛡️|💎|📚|💳|👨‍👩‍👧‍👦|🎯|🔴|🟡|🟢/g, '');
          const lines = doc.splitTextToSize(cleanRec, 180);
          
          if (yPosition + (lines.length * 5) > 280) {
            doc.addPage();
            yPosition = 20;
          }
          
          lines.forEach((line: string) => {
            doc.text(`${index + 1}. ${line}`, 14, yPosition);
            yPosition += 5;
          });
          yPosition += 2;
        });

        // Plan de mejora
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Plan de Mejora', 14, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const planMejora = this.generarPlanMejora(result, this.customerData);
        planMejora.forEach((paso) => {
          const cleanPaso = paso.replace(/\*\*/g, '').replace(/📋|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|⏱️|📊/g, '');
          const lines = doc.splitTextToSize(cleanPaso, 180);
          
          if (yPosition + (lines.length * 5) > 280) {
            doc.addPage();
            yPosition = 20;
          }
          
          lines.forEach((line: string) => {
            doc.text(line, 14, yPosition);
            yPosition += 5;
          });
        });

        // Guardar PDF
        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`recomendaciones_${result.cliente_id}_${fecha}.pdf`);
        
        this.successMessage = 'Recomendaciones exportadas a PDF correctamente';
        setTimeout(() => this.successMessage = '', 3000);
      });
    }).catch(error => {
      console.error('Error al cargar jsPDF:', error);
      this.errorMessage = 'Error al exportar PDF. Verifica que las librerías estén instaladas.';
    });
  }

  /**
   * Exportar recomendaciones por email (simulación)
   */
  exportarRecomendacionesEmail(): void {
    if (!this.predictionResult) {
      this.errorMessage = 'No hay resultados de predicción para enviar';
      return;
    }

    // En producción, aquí llamarías a un endpoint del backend para enviar el email
    const recomendaciones = this.generarRecomendaciones(this.predictionResult, this.customerData);
    const planMejora = this.generarPlanMejora(this.predictionResult, this.customerData);
    
    const contenido = `
Cliente: ${this.predictionResult.cliente_id}
Deserción Predicha: ${this.getPredictionText(this.predictionResult.desercion_predicha)}
Probabilidad: ${this.formatProbability(this.predictionResult.probabilidad_desercion)}
Nivel de Riesgo: ${this.predictionResult.riesgo || 'N/A'}

RECOMENDACIONES:
${recomendaciones.map((r, i) => `${i + 1}. ${r.replace(/\*\*/g, '')}`).join('\n')}

PLAN DE MEJORA:
${planMejora.join('\n')}
    `;

    // Simular envío de email (en producción, hacer POST al backend)
    console.log('Contenido del email:', contenido);
    
    this.successMessage = '📧 Simulación de envío de email completada. Ver consola para detalles.';
    setTimeout(() => this.successMessage = '', 5000);
    
    // Mostrar alerta con preview
    alert('Función de envío de email (simulación)\n\nEn producción, esto enviaría un email al cliente con las recomendaciones.\n\nVer consola del navegador para el contenido completo.');
  }
}
