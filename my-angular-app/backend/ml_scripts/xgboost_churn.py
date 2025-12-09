#!/usr/bin/env python3
"""
Script para entrenamiento y predicción de deserción de clientes usando XGBoost
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import xgboost as xgb
import pickle
import json
import sys
import os
import time
import warnings
warnings.filterwarnings('ignore')

class CustomerChurnPredictor:
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = []
        # Usar ruta absoluta relativa al script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_dir = os.path.join(script_dir, 'ml_models')
        os.makedirs(self.model_dir, exist_ok=True)
        print(f"[INFO] Directorio de modelos: {self.model_dir}")
        
    def load_and_preprocess_data(self, csv_path):
        """
        Cargar y preprocesar los datos del CSV con datos REALES de fuga
        """
        try:
            # Cargar datos
            df = pd.read_csv(csv_path, low_memory=False)
            
            # Verificar que las columnas esperadas existan (incluyendo 'fuga')
            expected_columns = [
                'ClienteID', 'edad', 'sexo', 'estado_civil', 'nacionalidad',
                'nivel_educativo', 'ingresos_mensuales', 'ocupacion', 
                'nivel_riesgo_crediticio', 'tarjeta_credito', 'fuga'
            ]
            
            missing_columns = [col for col in expected_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Columnas faltantes en el CSV: {missing_columns}")
            
            # Limpiar datos (eliminar filas con valores nulos en columnas críticas)
            df = df.dropna(subset=expected_columns)
            
            # Renombrar columna 'fuga' a 'desercion' para consistencia interna
            df['desercion'] = df['fuga'].astype(int)
            
            # Información sobre los datos reales
            total_rows = len(df)
            fuga_count = df['desercion'].sum()
            fuga_percentage = (fuga_count / total_rows * 100) if total_rows > 0 else 0
            
            print(f"[INFO] Datos reales cargados:")
            print(f"   Total clientes: {total_rows}")
            print(f"   Clientes con fuga: {fuga_count} ({fuga_percentage:.2f}%)")
            print(f"   Clientes sin fuga: {total_rows - fuga_count} ({100-fuga_percentage:.2f}%)")
            
            return df
            
        except Exception as e:
            print(f"Error al cargar datos: {str(e)}")
            return None
    
    def encode_categorical_features(self, df):
        """
        Codificar variables categóricas
        """
        categorical_columns = ['sexo', 'estado_civil', 'nacionalidad', 'nivel_educativo', 
                              'ocupacion', 'nivel_riesgo_crediticio', 'tarjeta_credito']
        
        df_encoded = df.copy()
        
        for col in categorical_columns:
            if col in df.columns:
                if col not in self.encoders:
                    self.encoders[col] = LabelEncoder()
                    df_encoded[col] = self.encoders[col].fit_transform(df[col].astype(str))
                else:
                    df_encoded[col] = self.encoders[col].transform(df[col].astype(str))
        
        return df_encoded
    
    def train_model(self, csv_path):
        """
        Entrenar el modelo XGBoost - versión optimizada
        """
        try:
            start_time = time.time()
            print(f"Iniciando entrenamiento con archivo: {csv_path}")
            
            # Cargar y preprocesar datos
            df = self.load_and_preprocess_data(csv_path)
            if df is None:
                return False
            
            print(f"Datos cargados: {len(df)} filas")
            
            # Codificar variables categóricas
            df_encoded = self.encode_categorical_features(df)
            print("Variables categóricas codificadas")
            
            # Preparar features y target
            feature_columns = ['edad', 'sexo', 'estado_civil', 'nacionalidad',
                             'nivel_educativo', 'ingresos_mensuales', 'ocupacion',
                             'nivel_riesgo_crediticio', 'tarjeta_credito']
            
            X = df_encoded[feature_columns]
            y = df_encoded['desercion']
            
            self.feature_columns = feature_columns
            
            # Dividir datos
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Escalar características numéricas
            numerical_features = ['edad', 'ingresos_mensuales']
            X_train_scaled = X_train.copy()
            X_test_scaled = X_test.copy()
            
            X_train_scaled[numerical_features] = self.scaler.fit_transform(X_train[numerical_features])
            X_test_scaled[numerical_features] = self.scaler.transform(X_test[numerical_features])
            
            print("Datos escalados, iniciando entrenamiento...")
            
            # Entrenar modelo XGBoost con configuración ultra-optimizada
            self.model = xgb.XGBClassifier(
                n_estimators=20,   # Muy reducido para velocidad
                max_depth=3,       # Muy reducido para velocidad
                learning_rate=0.3, # Aumentado para compensar menos estimadores
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                verbosity=0,       # Sin output verboso
                n_jobs=1          # Un solo hilo para evitar overhead
            )
            
            self.model.fit(X_train_scaled, y_train)
            print("Modelo entrenado")
            
            # Evaluar modelo con métricas completas
            from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
            
            y_pred = self.model.predict(X_test_scaled)
            y_proba = self.model.predict_proba(X_test_scaled)[:, 1]
            
            # Calcular métricas principales
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, zero_division=0)
            recall = recall_score(y_test, y_pred, zero_division=0)
            f1 = f1_score(y_test, y_pred, zero_division=0)
            roc_auc = roc_auc_score(y_test, y_proba)
            
            # Matriz de confusión
            cm = confusion_matrix(y_test, y_pred)
            tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
            
            # Calcular métricas adicionales
            specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
            
            # Obtener classification report
            class_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            
            # Crear diccionario de métricas completo
            metrics = {
                'accuracy': float(accuracy),
                'precision': float(precision),
                'recall': float(recall),
                'f1_score': float(f1),
                'roc_auc': float(roc_auc),
                'confusion_matrix': {
                    'true_negative': int(tn),
                    'false_positive': int(fp),
                    'false_negative': int(fn),
                    'true_positive': int(tp)
                },
                'additional_metrics': {
                    'specificity': float(specificity),
                    'sensitivity': float(recall),
                    'false_positive_rate': float(fp / (fp + tn)) if (fp + tn) > 0 else 0,
                    'false_negative_rate': float(fn / (fn + tp)) if (fn + tp) > 0 else 0
                },
                'classification_report': {
                    '0': {
                        'precision': float(class_report['0']['precision']),
                        'recall': float(class_report['0']['recall']),
                        'f1-score': float(class_report['0']['f1-score'])
                    },
                    '1': {
                        'precision': float(class_report['1']['precision']),
                        'recall': float(class_report['1']['recall']),
                        'f1-score': float(class_report['1']['f1-score'])
                    }
                },
                'training_time': float(time.time() - start_time),
                'data_size': len(df),
                'test_size': len(y_test),
                'feature_importance': dict(zip(feature_columns, self.model.feature_importances_.tolist()))
            }
            
            print(f"[DEBUG] Feature importance generated: {metrics['feature_importance']}")
            
            # Guardar métricas en archivo JSON
            metrics_path = os.path.join(self.model_dir, 'metrics_report.json')
            with open(metrics_path, 'w', encoding='utf-8') as f:
                json.dump(metrics, f, indent=2, ensure_ascii=False)
            print(f"Metricas guardadas en: {metrics_path}")
            
            # Guardar modelo y encoders
            self.save_model()
            print("Modelo guardado")
            
            training_time = time.time() - start_time
            print(f"Entrenamiento completado en {training_time:.2f} segundos")
            print(f"\n[METRICAS DEL MODELO]")
            print(f"   Accuracy:  {accuracy*100:.2f}%")
            print(f"   Precision: {precision*100:.2f}%")
            print(f"   Recall:    {recall*100:.2f}%")
            print(f"   F1-Score:  {f1*100:.2f}%")
            print(f"   ROC-AUC:   {roc_auc*100:.2f}%")
            
            # Retornar métricas
            return metrics
            
        except Exception as e:
            print(f"Error al entrenar modelo: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def predict_single(self, customer_data):
        """
        Realizar predicción para un cliente individual
        """
        try:
            if self.model is None:
                self.load_model()
            
            # Crear DataFrame con los datos del cliente
            df = pd.DataFrame([customer_data])
            
            # Codificar variables categóricas
            df_encoded = self.encode_categorical_features(df)
            
            # Preparar features
            X = df_encoded[self.feature_columns]
            
            # Escalar características numéricas
            numerical_features = ['edad', 'ingresos_mensuales']
            X_scaled = X.copy()
            X_scaled[numerical_features] = self.scaler.transform(X[numerical_features])
            
            # Realizar predicción
            prediction = self.model.predict(X_scaled)[0]
            probability = self.model.predict_proba(X_scaled)[0][1]
            
            return {
                'desercion_predicha': int(prediction),
                'probabilidad_desercion': float(probability),
                'riesgo': 'Alto' if probability > 0.7 else 'Medio' if probability > 0.4 else 'Bajo'
            }
            
        except Exception as e:
            print(f"Error al predecir: {str(e)}")
            return None
    
    def save_model(self):
        """
        Guardar modelo y encoders - versión optimizada
        """
        try:
            # Guardar modelo
            with open(f'{self.model_dir}/xgboost_model.pkl', 'wb') as f:
                pickle.dump(self.model, f)
            
            # Guardar encoders
            with open(f'{self.model_dir}/encoders.pkl', 'wb') as f:
                pickle.dump(self.encoders, f)
            
            # Guardar scaler
            with open(f'{self.model_dir}/scaler.pkl', 'wb') as f:
                pickle.dump(self.scaler, f)
            
            # Guardar feature columns
            with open(f'{self.model_dir}/feature_columns.pkl', 'wb') as f:
                pickle.dump(self.feature_columns, f)
                
        except Exception as e:
            print(f"Error al guardar modelo: {str(e)}")
            raise
    
    def load_model(self):
        """
        Cargar modelo y encoders - versión optimizada
        """
        try:
            with open(f'{self.model_dir}/xgboost_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            
            with open(f'{self.model_dir}/encoders.pkl', 'rb') as f:
                self.encoders = pickle.load(f)
            
            with open(f'{self.model_dir}/scaler.pkl', 'rb') as f:
                self.scaler = pickle.load(f)
            
            with open(f'{self.model_dir}/feature_columns.pkl', 'rb') as f:
                self.feature_columns = pickle.load(f)
            
            return True
        except FileNotFoundError:
            print("Archivos del modelo no encontrados")
            return False
        except Exception as e:
            print(f"Error al cargar modelo: {str(e)}")
            return False

def main():
    if len(sys.argv) < 2:
        print("Uso: python xgboost_churn.py <comando> [argumentos]")
        sys.exit(1)
    
    predictor = CustomerChurnPredictor()
    command = sys.argv[1]
    
    if command == 'train':
        if len(sys.argv) < 3:
            print("Uso: python xgboost_churn.py train <csv_path>")
            sys.exit(1)
        
        csv_path = sys.argv[2]
        result = predictor.train_model(csv_path)
        
        if result:
            print(json.dumps(result, indent=2))
        else:
            print("Error en el entrenamiento")
            sys.exit(1)
    
    elif command == 'predict':
        if len(sys.argv) < 3:
            print("Uso: python xgboost_churn.py predict <json_data>")
            sys.exit(1)
        
        customer_data = json.loads(sys.argv[2])
        result = predictor.predict_single(customer_data)
        
        if result:
            print(json.dumps(result, indent=2))
        else:
            print("Error en la predicción")
            sys.exit(1)
    
    else:
        print("Comando no reconocido. Usa 'train' o 'predict'")
        sys.exit(1)

if __name__ == '__main__':
    main()
