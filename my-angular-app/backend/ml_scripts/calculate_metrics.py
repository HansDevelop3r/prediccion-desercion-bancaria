"""
Script para calcular y mostrar métricas del modelo ML
Incluye: Accuracy, Precision, Recall, F1-Score, ROC-AUC, Matriz de Confusión
"""

import json
import sys
import numpy as np
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    roc_curve
)
import joblib
import os

def calculate_model_metrics(model_path, X_test, y_test):
    """
    Calcula todas las métricas del modelo
    
    Args:
        model_path: Ruta al modelo entrenado (.pkl)
        X_test: Datos de prueba (features)
        y_test: Etiquetas reales de prueba
    
    Returns:
        dict: Diccionario con todas las métricas
    """
    try:
        # Cargar modelo
        model = joblib.load(model_path)
        
        # Realizar predicciones
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
        
        # Calcular métricas básicas
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Calcular ROC-AUC si hay probabilidades
        roc_auc = roc_auc_score(y_test, y_proba) if y_proba is not None else None
        
        # Matriz de confusión
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
        
        # Calcular métricas adicionales
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        sensitivity = recall  # Recall = Sensitivity = TPR
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0  # False Positive Rate
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0  # False Negative Rate
        
        # Crear diccionario de métricas
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc) if roc_auc is not None else None,
            'confusion_matrix': {
                'true_negative': int(tn),
                'false_positive': int(fp),
                'false_negative': int(fn),
                'true_positive': int(tp)
            },
            'additional_metrics': {
                'specificity': float(specificity),
                'sensitivity': float(sensitivity),
                'false_positive_rate': float(fpr),
                'false_negative_rate': float(fnr)
            },
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }
        
        return metrics
        
    except Exception as e:
        return {
            'error': str(e),
            'traceback': str(sys.exc_info())
        }

def display_metrics(metrics):
    """
    Muestra las métricas de forma visual en consola
    """
    print("\n" + "="*70)
    print(" 📊 MÉTRICAS DEL MODELO ML - PERFORMANCE REPORT")
    print("="*70 + "\n")
    
    if 'error' in metrics:
        print(f"❌ Error: {metrics['error']}")
        return
    
    # Métricas principales
    print("📈 MÉTRICAS PRINCIPALES:")
    print("-" * 70)
    print(f"   Accuracy  (Exactitud):        {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.2f}%)")
    print(f"   Precision (Precisión):        {metrics['precision']:.4f} ({metrics['precision']*100:.2f}%)")
    print(f"   Recall    (Sensibilidad):     {metrics['recall']:.4f} ({metrics['recall']*100:.2f}%)")
    print(f"   F1-Score  (Promedio Armónico):{metrics['f1_score']:.4f} ({metrics['f1_score']*100:.2f}%)")
    
    if metrics['roc_auc']:
        print(f"   ROC-AUC   (Área bajo curva):  {metrics['roc_auc']:.4f} ({metrics['roc_auc']*100:.2f}%)")
    
    # Matriz de confusión
    cm = metrics['confusion_matrix']
    print(f"\n🔍 MATRIZ DE CONFUSIÓN:")
    print("-" * 70)
    print(f"                      Predicción Negativa   Predicción Positiva")
    print(f"   Real Negativa      {cm['true_negative']:>8}            {cm['false_positive']:>8}")
    print(f"   Real Positiva      {cm['false_negative']:>8}            {cm['true_positive']:>8}")
    print()
    print(f"   True Negatives (TN):  {cm['true_negative']:>5} ✅ Correctamente clasificados como NO deserción")
    print(f"   False Positives (FP): {cm['false_positive']:>5} ⚠️  Incorrectamente clasificados como deserción")
    print(f"   False Negatives (FN): {cm['false_negative']:>5} ⚠️  Deserción no detectada")
    print(f"   True Positives (TP):  {cm['true_positive']:>5} ✅ Correctamente clasificados como deserción")
    
    # Métricas adicionales
    add = metrics['additional_metrics']
    print(f"\n📊 MÉTRICAS ADICIONALES:")
    print("-" * 70)
    print(f"   Specificity (Especificidad):  {add['specificity']:.4f} ({add['specificity']*100:.2f}%)")
    print(f"   False Positive Rate (FPR):    {add['false_positive_rate']:.4f} ({add['false_positive_rate']*100:.2f}%)")
    print(f"   False Negative Rate (FNR):    {add['false_negative_rate']:.4f} ({add['false_negative_rate']*100:.2f}%)")
    
    # Interpretación
    print(f"\n💡 INTERPRETACIÓN:")
    print("-" * 70)
    
    # Accuracy
    if metrics['accuracy'] >= 0.95:
        print("   ✅ Accuracy: EXCELENTE - El modelo es muy preciso")
    elif metrics['accuracy'] >= 0.85:
        print("   ✅ Accuracy: BUENO - Rendimiento aceptable")
    elif metrics['accuracy'] >= 0.75:
        print("   ⚠️  Accuracy: REGULAR - Considerar mejoras")
    else:
        print("   ❌ Accuracy: BAJO - Requiere reentrenamiento")
    
    # Precision
    if metrics['precision'] >= 0.90:
        print("   ✅ Precision: ALTA - Pocos falsos positivos")
    elif metrics['precision'] >= 0.75:
        print("   ⚠️  Precision: MODERADA - Algunos falsos positivos")
    else:
        print("   ❌ Precision: BAJA - Muchos falsos positivos")
    
    # Recall
    if metrics['recall'] >= 0.90:
        print("   ✅ Recall: ALTO - Detecta la mayoría de casos de deserción")
    elif metrics['recall'] >= 0.75:
        print("   ⚠️  Recall: MODERADO - Algunos casos no detectados")
    else:
        print("   ❌ Recall: BAJO - Muchos casos de deserción no detectados")
    
    # F1-Score
    if metrics['f1_score'] >= 0.90:
        print("   ✅ F1-Score: EXCELENTE - Buen balance precision/recall")
    elif metrics['f1_score'] >= 0.75:
        print("   ⚠️  F1-Score: BUENO - Balance aceptable")
    else:
        print("   ❌ F1-Score: BAJO - Desbalance entre precision y recall")
    
    # ROC-AUC
    if metrics['roc_auc']:
        if metrics['roc_auc'] >= 0.95:
            print("   ✅ ROC-AUC: EXCELENTE - Discriminación perfecta")
        elif metrics['roc_auc'] >= 0.85:
            print("   ✅ ROC-AUC: BUENO - Buena capacidad de discriminación")
        elif metrics['roc_auc'] >= 0.75:
            print("   ⚠️  ROC-AUC: ACEPTABLE - Discriminación moderada")
        else:
            print("   ❌ ROC-AUC: BAJO - Poca capacidad de discriminación")
    
    # Recomendaciones
    print(f"\n💭 RECOMENDACIONES:")
    print("-" * 70)
    
    if metrics['precision'] > 0.85 and metrics['recall'] < 0.75:
        print("   • El modelo es muy preciso pero no detecta todos los casos")
        print("   • Considerar ajustar el threshold para aumentar recall")
        print("   • Analizar características de los falsos negativos")
    
    if metrics['recall'] > 0.85 and metrics['precision'] < 0.75:
        print("   • El modelo detecta muchos casos pero tiene falsos positivos")
        print("   • Considerar aumentar threshold para reducir FP")
        print("   • Revisar features que causan confusión")
    
    if metrics['accuracy'] < 0.80:
        print("   • Recolectar más datos de entrenamiento")
        print("   • Realizar feature engineering")
        print("   • Probar diferentes algoritmos o hiperparámetros")
    
    if cm['false_negative'] > cm['false_positive'] * 2:
        print("   • Muchos casos de deserción no detectados (FN alto)")
        print("   • Esto puede resultar en pérdida de clientes")
        print("   • Priorizar recall sobre precision")
    
    if cm['false_positive'] > cm['false_negative'] * 2:
        print("   • Muchas falsas alarmas (FP alto)")
        print("   • Puede causar fatiga de alertas")
        print("   • Priorizar precision sobre recall")
    
    print("\n" + "="*70 + "\n")

def save_metrics_to_file(metrics, output_path='ml_models/metrics_report.json'):
    """
    Guarda las métricas en un archivo JSON
    """
    try:
        # Crear directorio si no existe
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(metrics, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Métricas guardadas en: {output_path}")
        return True
    except Exception as e:
        print(f"❌ Error al guardar métricas: {e}")
        return False

# Ejemplo de uso
if __name__ == "__main__":
    print("\n🤖 SISTEMA DE EVALUACIÓN DE MODELO ML")
    print("="*70)
    
    # Verificar si se proporcionó un archivo de modelo
    if len(sys.argv) > 1:
        model_path = sys.argv[1]
    else:
        model_path = 'ml_models/model.pkl'
    
    print(f"📂 Buscando modelo en: {model_path}")
    
    if not os.path.exists(model_path):
        print(f"\n❌ Error: No se encontró el modelo en {model_path}")
        print("\nPara usar este script:")
        print("  python calculate_metrics.py [ruta_al_modelo.pkl]")
        print("\nEjemplo:")
        print("  python calculate_metrics.py ml_models/model.pkl")
        sys.exit(1)
    
    print(f"✅ Modelo encontrado\n")
    print("⚠️  NOTA: Este script requiere datos de prueba (X_test, y_test)")
    print("   Para obtener métricas reales, ejecutar durante el entrenamiento")
    print("   o proporcionar un conjunto de datos de prueba.\n")
    
    # Aquí normalmente cargarías X_test y y_test
    # Por ahora mostramos un ejemplo de formato de salida
    
    example_metrics = {
        'accuracy': 0.9500,
        'precision': 0.9250,
        'recall': 0.8830,
        'f1_score': 0.9035,
        'roc_auc': 0.9421,
        'confusion_matrix': {
            'true_negative': 1850,
            'false_positive': 75,
            'false_negative': 120,
            'true_positive': 955
        },
        'additional_metrics': {
            'specificity': 0.9610,
            'sensitivity': 0.8883,
            'false_positive_rate': 0.0390,
            'false_negative_rate': 0.1117
        },
        'classification_report': {
            '0': {'precision': 0.9391, 'recall': 0.9610, 'f1-score': 0.9499},
            '1': {'precision': 0.9272, 'recall': 0.8883, 'f1-score': 0.9073}
        }
    }
    
    print("📊 MOSTRANDO MÉTRICAS DE EJEMPLO:")
    print("   (Para métricas reales, integrar con el proceso de entrenamiento)\n")
    
    display_metrics(example_metrics)
    save_metrics_to_file(example_metrics)
