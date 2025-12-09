#!/usr/bin/env python3
"""
Script para analizar dataset CSV y generar métricas descriptivas y de ML
"""

import pandas as pd
import numpy as np
import json
import sys
import os
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    roc_auc_score, confusion_matrix, classification_report
)
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

class DatasetAnalyzer:
    def __init__(self):
        self.df = None
        self.metrics = {}
        
    def load_data(self, csv_path):
        """Cargar CSV"""
        try:
            self.df = pd.read_csv(csv_path, low_memory=False)
            print(f"[INFO] Archivo cargado: {len(self.df)} registros")
            return True
        except Exception as e:
            print(f"[ERROR] No se pudo cargar el archivo: {str(e)}")
            return False
    
    def analyze(self):
        """Analizar dataset completo"""
        if self.df is None:
            return None
        
        try:
            # Métricas básicas del dataset
            total_records = len(self.df)
            
            # Analizar columna de fuga/deserción
            fuga_col = None
            for col in ['fuga', 'desercion', 'churn', 'cliente_activo']:
                if col in self.df.columns:
                    fuga_col = col
                    break
            
            if fuga_col:
                if fuga_col == 'cliente_activo':
                    # Invertir (0 = activo, 1 = fugó)
                    fuga_values = (self.df[fuga_col] == 0).astype(int)
                else:
                    fuga_values = self.df[fuga_col].astype(int)
                
                fuga_count = fuga_values.sum()
                no_fuga_count = total_records - fuga_count
                fuga_percentage = (fuga_count / total_records * 100) if total_records > 0 else 0
            else:
                fuga_count = 0
                no_fuga_count = total_records
                fuga_percentage = 0
            
            # Análisis demográfico
            demographic_analysis = {}
            
            # Edad
            if 'edad' in self.df.columns:
                demographic_analysis['edad'] = {
                    'promedio': float(self.df['edad'].mean()),
                    'mediana': float(self.df['edad'].median()),
                    'minimo': int(self.df['edad'].min()),
                    'maximo': int(self.df['edad'].max()),
                    'desviacion_std': float(self.df['edad'].std())
                }
            
            # Ingresos
            if 'ingresos_mensuales' in self.df.columns:
                demographic_analysis['ingresos_mensuales'] = {
                    'promedio': float(self.df['ingresos_mensuales'].mean()),
                    'mediana': float(self.df['ingresos_mensuales'].median()),
                    'minimo': float(self.df['ingresos_mensuales'].min()),
                    'maximo': float(self.df['ingresos_mensuales'].max()),
                    'desviacion_std': float(self.df['ingresos_mensuales'].std())
                }
            
            # Análisis por categorías
            categorical_analysis = {}
            categorical_columns = ['sexo', 'estado_civil', 'nacionalidad', 
                                 'nivel_educativo', 'ocupacion', 
                                 'nivel_riesgo_crediticio', 'tarjeta_credito']
            
            for col in categorical_columns:
                if col in self.df.columns:
                    value_counts = self.df[col].value_counts().to_dict()
                    categorical_analysis[col] = {
                        'distribucion': value_counts,
                        'categorias_unicas': int(self.df[col].nunique())
                    }
                    
                    # Tasa de fuga por categoría
                    if fuga_col:
                        fuga_by_category = {}
                        for category in self.df[col].unique():
                            mask = self.df[col] == category
                            total_cat = mask.sum()
                            if fuga_col == 'cliente_activo':
                                fuga_cat = ((self.df[mask][fuga_col] == 0).sum())
                            else:
                                fuga_cat = self.df[mask][fuga_col].sum()
                            fuga_rate = (fuga_cat / total_cat * 100) if total_cat > 0 else 0
                            fuga_by_category[str(category)] = {
                                'total': int(total_cat),
                                'con_fuga': int(fuga_cat),
                                'tasa_fuga': float(fuga_rate)
                            }
                        categorical_analysis[col]['tasa_fuga_por_categoria'] = fuga_by_category
            
            # Análisis de calidad de datos
            quality_analysis = {
                'registros_completos': int(self.df.dropna().shape[0]),
                'registros_con_nulos': int(self.df.isnull().any(axis=1).sum()),
                'columnas_totales': len(self.df.columns),
                'valores_nulos_por_columna': {}
            }
            
            for col in self.df.columns:
                null_count = int(self.df[col].isnull().sum())
                if null_count > 0:
                    quality_analysis['valores_nulos_por_columna'][col] = {
                        'nulos': null_count,
                        'porcentaje': float((null_count / total_records) * 100)
                    }
            
            # Segmentación de clientes (si hay fuga)
            segmentation = {}
            if fuga_col:
                # Por edad
                if 'edad' in self.df.columns:
                    bins = [0, 25, 35, 45, 55, 65, 100]
                    labels = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+']
                    self.df['edad_grupo'] = pd.cut(self.df['edad'], bins=bins, labels=labels)
                    
                    age_segment = {}
                    for age_group in labels:
                        mask = self.df['edad_grupo'] == age_group
                        total = mask.sum()
                        if total > 0:
                            if fuga_col == 'cliente_activo':
                                fuga_segment = (self.df[mask][fuga_col] == 0).sum()
                            else:
                                fuga_segment = self.df[mask][fuga_col].sum()
                            age_segment[age_group] = {
                                'total': int(total),
                                'con_fuga': int(fuga_segment),
                                'tasa_fuga': float((fuga_segment / total) * 100)
                            }
                    segmentation['por_edad'] = age_segment
                
                # Por ingresos
                if 'ingresos_mensuales' in self.df.columns:
                    income_bins = [0, 2000, 5000, 10000, 20000, float('inf')]
                    income_labels = ['Bajo', 'Medio-Bajo', 'Medio', 'Medio-Alto', 'Alto']
                    self.df['ingreso_grupo'] = pd.cut(self.df['ingresos_mensuales'], 
                                                       bins=income_bins, 
                                                       labels=income_labels)
                    
                    income_segment = {}
                    for income_group in income_labels:
                        mask = self.df['ingreso_grupo'] == income_group
                        total = mask.sum()
                        if total > 0:
                            if fuga_col == 'cliente_activo':
                                fuga_segment = (self.df[mask][fuga_col] == 0).sum()
                            else:
                                fuga_segment = self.df[mask][fuga_col].sum()
                            income_segment[income_group] = {
                                'total': int(total),
                                'con_fuga': int(fuga_segment),
                                'tasa_fuga': float((fuga_segment / total) * 100)
                            }
                    segmentation['por_ingresos'] = income_segment
            
            # Construir métricas finales
            self.metrics = {
                'resumen_general': {
                    'total_registros': total_records,
                    'clientes_con_fuga': fuga_count,
                    'clientes_sin_fuga': no_fuga_count,
                    'porcentaje_fuga': float(fuga_percentage),
                    'columna_fuga_detectada': fuga_col or 'No detectada'
                },
                'analisis_demografico': demographic_analysis,
                'analisis_categorico': categorical_analysis,
                'calidad_datos': quality_analysis,
                'segmentacion': segmentation,
                'metadata': {
                    'fecha_analisis': datetime.now().isoformat(),
                    'columnas_disponibles': list(self.df.columns)
                }
            }
            
            # Agregar métricas de ML
            ml_metrics = self.calculate_ml_metrics()
            if ml_metrics:
                self.metrics['metricas_ml'] = ml_metrics
                print("[SUCCESS] Métricas ML agregadas al análisis")
            else:
                print("[WARNING] Métricas ML no disponibles")
            
            return self.metrics
            
        except Exception as e:
            print(f"[ERROR] Error en análisis: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def calculate_ml_metrics(self):
        """Entrenar modelo rápido y calcular métricas de ML"""
        if self.df is None:
            return None
        
        try:
            print("\n[ML] Calculando métricas de Machine Learning...")
            
            # Detectar columna de fuga
            fuga_col = None
            for col in ['fuga', 'desercion', 'churn', 'cliente_activo']:
                if col in self.df.columns:
                    fuga_col = col
                    break
            
            if not fuga_col:
                print("[WARNING] No se encontró columna de fuga. Métricas ML no disponibles.")
                return None
            
            # Preparar datos
            df_ml = self.df.copy()
            
            # Variable objetivo
            if fuga_col == 'cliente_activo':
                y = (df_ml[fuga_col] == 0).astype(int)
            else:
                y = df_ml[fuga_col].astype(int)
            
            # Features
            feature_columns = ['edad', 'sexo', 'estado_civil', 'nacionalidad',
                             'nivel_educativo', 'ingresos_mensuales', 'ocupacion',
                             'nivel_riesgo_crediticio', 'tarjeta_credito']
            
            # Verificar que existan las columnas
            available_features = [col for col in feature_columns if col in df_ml.columns]
            if len(available_features) < 5:
                print(f"[WARNING] Pocas features disponibles ({len(available_features)}). Métricas ML no confiables.")
                return None
            
            X = df_ml[available_features].copy()
            
            # Codificar variables categóricas
            encoders = {}
            categorical_columns = ['sexo', 'estado_civil', 'nacionalidad', 
                                 'nivel_educativo', 'ocupacion', 
                                 'nivel_riesgo_crediticio', 'tarjeta_credito']
            
            for col in categorical_columns:
                if col in X.columns:
                    encoders[col] = LabelEncoder()
                    X[col] = encoders[col].fit_transform(X[col].astype(str))
            
            # Escalar features numéricas
            scaler = StandardScaler()
            numerical_features = ['edad', 'ingresos_mensuales']
            for col in numerical_features:
                if col in X.columns:
                    X[col] = scaler.fit_transform(X[[col]])
            
            # Dividir datos
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            print(f"[ML] Entrenando modelo con {len(X_train)} registros de entrenamiento...")
            
            # Entrenar modelo XGBoost (configuración rápida)
            model = xgb.XGBClassifier(
                n_estimators=50,      # Más árboles que la versión ultra-rápida
                max_depth=4,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                verbosity=0,
                n_jobs=-1,
                eval_metric='logloss'
            )
            
            model.fit(X_train, y_train)
            
            print("[ML] Modelo entrenado. Calculando métricas...")
            
            # Predicciones
            y_pred = model.predict(X_test)
            y_proba = model.predict_proba(X_test)[:, 1]
            
            # Métricas básicas
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, zero_division=0)
            recall = recall_score(y_test, y_pred, zero_division=0)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            
            # ROC-AUC (solo si hay ambas clases)
            try:
                roc_auc = roc_auc_score(y_test, y_proba)
            except:
                roc_auc = 0.0
            
            # Matriz de confusión
            cm = confusion_matrix(y_test, y_pred)
            if cm.size == 4:
                tn, fp, fn, tp = cm.ravel()
            else:
                tn, fp, fn, tp = 0, 0, 0, 0
            
            # Métricas adicionales
            specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
            sensitivity = recall
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
            fnr = fn / (fn + tp) if (fn + tp) > 0 else 0
            
            # Classification report
            class_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            
            # Feature importance
            feature_importance = dict(zip(available_features, model.feature_importances_.tolist()))
            
            # Métricas por clase
            metrics_by_class = {
                '0': {
                    'precision': float(class_report['0']['precision']),
                    'recall': float(class_report['0']['recall']),
                    'f1-score': float(class_report['0']['f1-score']),
                    'support': int(class_report['0']['support'])
                },
                '1': {
                    'precision': float(class_report['1']['precision']),
                    'recall': float(class_report['1']['recall']),
                    'f1-score': float(class_report['1']['f1-score']),
                    'support': int(class_report['1']['support'])
                }
            }
            
            ml_metrics = {
                'metricas_principales': {
                    'accuracy': float(accuracy),
                    'precision': float(precision),
                    'recall': float(recall),
                    'f1_score': float(f1),
                    'roc_auc': float(roc_auc)
                },
                'matriz_confusion': {
                    'true_negative': int(tn),
                    'false_positive': int(fp),
                    'false_negative': int(fn),
                    'true_positive': int(tp),
                    'visual': {
                        'predicho_no_fuga': {
                            'real_no_fuga': int(tn),
                            'real_fuga': int(fn)
                        },
                        'predicho_fuga': {
                            'real_no_fuga': int(fp),
                            'real_fuga': int(tp)
                        }
                    }
                },
                'metricas_avanzadas': {
                    'specificity': float(specificity),
                    'sensitivity': float(sensitivity),
                    'false_positive_rate': float(fpr),
                    'false_negative_rate': float(fnr),
                    'balanced_accuracy': float((sensitivity + specificity) / 2)
                },
                'metricas_por_clase': metrics_by_class,
                'feature_importance': feature_importance,
                'datos_entrenamiento': {
                    'total_train': len(X_train),
                    'total_test': len(X_test),
                    'features_utilizadas': available_features,
                    'fuga_train': int(y_train.sum()),
                    'fuga_test': int(y_test.sum()),
                    'balance_train': {
                        'no_fuga': int((y_train == 0).sum()),
                        'fuga': int((y_train == 1).sum())
                    },
                    'balance_test': {
                        'no_fuga': int((y_test == 0).sum()),
                        'fuga': int((y_test == 1).sum())
                    }
                },
                'interpretacion': self._generate_interpretation(accuracy, precision, recall, f1, roc_auc)
            }
            
            print(f"[ML] Métricas calculadas - Accuracy: {accuracy*100:.2f}%, F1-Score: {f1*100:.2f}%")
            
            return ml_metrics
            
        except Exception as e:
            print(f"[ERROR] Error calculando métricas ML: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def _generate_interpretation(self, accuracy, precision, recall, f1, roc_auc):
        """Generar interpretación de las métricas"""
        interpretation = {
            'accuracy': self._interpret_metric(accuracy, 'accuracy'),
            'precision': self._interpret_metric(precision, 'precision'),
            'recall': self._interpret_metric(recall, 'recall'),
            'f1_score': self._interpret_metric(f1, 'f1'),
            'roc_auc': self._interpret_metric(roc_auc, 'roc_auc'),
            'resumen_general': ''
        }
        
        # Resumen general
        if accuracy >= 0.85 and f1 >= 0.70:
            interpretation['resumen_general'] = "Excelente: El modelo tiene alto rendimiento general y buen balance."
        elif accuracy >= 0.75 and f1 >= 0.60:
            interpretation['resumen_general'] = "Bueno: El modelo tiene rendimiento aceptable. Se puede mejorar."
        elif accuracy >= 0.65:
            interpretation['resumen_general'] = "Regular: El modelo necesita mejoras significativas."
        else:
            interpretation['resumen_general'] = "Pobre: El modelo requiere revisión completa del dataset y features."
        
        return interpretation
    
    def _interpret_metric(self, value, metric_type):
        """Interpretar una métrica específica"""
        interpretations = {
            'accuracy': {
                0.90: "Excelente precisión general",
                0.80: "Buena precisión general",
                0.70: "Precisión aceptable",
                0.60: "Precisión regular, necesita mejoras",
                0.0: "Precisión insuficiente"
            },
            'precision': {
                0.90: "Muy alta confiabilidad en predicciones positivas",
                0.80: "Alta confiabilidad en predicciones positivas",
                0.70: "Confiabilidad aceptable",
                0.60: "Muchos falsos positivos",
                0.0: "Demasiados falsos positivos"
            },
            'recall': {
                0.90: "Detecta casi todos los casos de fuga",
                0.80: "Detecta la mayoría de casos de fuga",
                0.70: "Detecta cantidad aceptable de fugas",
                0.60: "Pierde muchos casos de fuga",
                0.0: "No detecta adecuadamente los casos de fuga"
            },
            'f1': {
                0.85: "Excelente balance entre precisión y recall",
                0.75: "Buen balance general",
                0.65: "Balance aceptable",
                0.50: "Balance pobre, ajustar threshold",
                0.0: "Balance muy pobre"
            },
            'roc_auc': {
                0.90: "Excelente capacidad de discriminación",
                0.80: "Buena capacidad de discriminación",
                0.70: "Capacidad aceptable",
                0.60: "Capacidad limitada",
                0.0: "Capacidad muy limitada o aleatoria"
            }
        }
        
        thresholds = sorted(interpretations[metric_type].keys(), reverse=True)
        for threshold in thresholds:
            if value >= threshold:
                return interpretations[metric_type][threshold]
        
        return interpretations[metric_type][0.0]
    
    def save_metrics(self, output_path):
        """Guardar métricas en JSON"""
        try:
            # Convertir métricas a tipos nativos de Python para JSON
            metrics_serializable = self._convert_to_native_types(self.metrics)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(metrics_serializable, f, indent=2, ensure_ascii=False)
            print(f"[INFO] Métricas guardadas en: {output_path}")
            return True
        except Exception as e:
            print(f"[ERROR] No se pudo guardar métricas: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _convert_to_native_types(self, obj):
        """Convertir tipos de NumPy/Pandas a tipos nativos de Python"""
        if isinstance(obj, dict):
            return {key: self._convert_to_native_types(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_native_types(item) for item in obj]
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        else:
            return obj
    
    def print_summary(self):
        """Imprimir resumen en consola"""
        if not self.metrics:
            return
        
        resumen = self.metrics['resumen_general']
        print("\n" + "="*60)
        print("RESUMEN DEL DATASET")
        print("="*60)
        print(f"Total de registros: {resumen['total_registros']:,}")
        print(f"Clientes con fuga: {resumen['clientes_con_fuga']:,} ({resumen['porcentaje_fuga']:.2f}%)")
        print(f"Clientes sin fuga: {resumen['clientes_sin_fuga']:,}")
        print("="*60)
        
        if 'analisis_demografico' in self.metrics:
            demo = self.metrics['analisis_demografico']
            print("\nANALISIS DEMOGRAFICO:")
            if 'edad' in demo:
                print(f"  Edad promedio: {demo['edad']['promedio']:.1f} años")
                print(f"  Rango de edad: {demo['edad']['minimo']}-{demo['edad']['maximo']}")
            if 'ingresos_mensuales' in demo:
                print(f"  Ingreso promedio: ${demo['ingresos_mensuales']['promedio']:,.2f}")
        
        print("\n" + "="*60)

def main():
    if len(sys.argv) < 2:
        print("Uso: python analyze_dataset.py <csv_path> [output_json]")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'dataset_metrics.json'
    
    analyzer = DatasetAnalyzer()
    
    if not analyzer.load_data(csv_path):
        sys.exit(1)
    
    metrics = analyzer.analyze()
    
    if metrics:
        analyzer.print_summary()
        analyzer.save_metrics(output_path)
        
        # Convertir a tipos nativos y luego imprimir JSON
        metrics_serializable = analyzer._convert_to_native_types(metrics)
        print("\n[JSON_OUTPUT]")
        print(json.dumps(metrics_serializable, indent=2, ensure_ascii=False))
    else:
        print("[ERROR] No se pudieron generar métricas")
        sys.exit(1)

if __name__ == '__main__':
    main()
