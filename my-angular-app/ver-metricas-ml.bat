@echo off
chcp 65001 >nul
color 0A
title Métricas del Modelo ML

echo.
echo ═══════════════════════════════════════════════════════════════════
echo    📊 MÉTRICAS DEL MODELO ML - SISTEMA DE PREDICCIÓN DE DESERCIÓN
echo ═══════════════════════════════════════════════════════════════════
echo.
echo    Este script muestra las métricas de rendimiento del modelo ML:
echo    • Accuracy (Exactitud)
echo    • Precision (Precisión)
echo    • Recall (Sensibilidad)
echo    • F1-Score (Balance)
echo    • ROC-AUC (Discriminación)
echo    • Matriz de Confusión
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0backend"

:MENU
echo.
echo 📋 OPCIONES DISPONIBLES:
echo.
echo    [1] Ver métricas guardadas (rápido)
echo    [2] Calcular métricas actuales (requiere modelo entrenado)
echo    [3] Ver métricas desde API REST (/api/ml/metrics)
echo    [4] Ver todas las métricas del sistema
echo    [5] Comparar métricas históricas
echo    [0] Salir
echo.
set /p option="Seleccione una opción [0-5]: "

if "%option%"=="1" goto SAVED_METRICS
if "%option%"=="2" goto CALCULATE_METRICS
if "%option%"=="3" goto API_METRICS
if "%option%"=="4" goto ALL_METRICS
if "%option%"=="5" goto COMPARE_METRICS
if "%option%"=="0" goto END

echo ❌ Opción inválida
timeout /t 2 >nul
cls
goto MENU

:SAVED_METRICS
cls
echo.
echo 📂 Cargando métricas guardadas...
echo.
node get_ml_metrics.js
goto PAUSE_MENU

:CALCULATE_METRICS
cls
echo.
echo 🔄 Calculando métricas del modelo...
echo.
echo ⚠️  NOTA: Esto requiere que el modelo esté entrenado
echo.
python ml_scripts\calculate_metrics.py
if errorlevel 1 (
    echo.
    echo ❌ Error al calcular métricas
    echo.
    echo 💡 Posibles causas:
    echo    • Python no está instalado o no está en PATH
    echo    • Faltan librerías: pip install scikit-learn joblib numpy
    echo    • El modelo no ha sido entrenado
    echo.
) else (
    echo.
    echo ✅ Cálculo completado
)
goto PAUSE_MENU

:API_METRICS
cls
echo.
echo 🌐 Obteniendo métricas desde API...
echo.
curl -s http://localhost:3000/api/ml/metrics 2>nul
if errorlevel 1 (
    echo ❌ No se pudo conectar con el servidor
    echo    Asegúrese de que el backend esté ejecutándose en puerto 3000
) else (
    echo.
    echo ✅ Métricas obtenidas desde API
)
goto PAUSE_MENU

:ALL_METRICS
cls
echo.
echo 📊 MÉTRICAS COMPLETAS DEL SISTEMA
echo.
echo ───────────────────────────────────────────────────────────────────
echo 1. MÉTRICAS DEL MODELO ML
echo ───────────────────────────────────────────────────────────────────
node get_ml_metrics.js

echo.
echo ───────────────────────────────────────────────────────────────────
echo 2. MÉTRICAS DE BASE DE DATOS
echo ───────────────────────────────────────────────────────────────────
node check-db-performance.js

echo.
echo ───────────────────────────────────────────────────────────────────
echo 3. MÉTRICAS DEL SERVIDOR
echo ───────────────────────────────────────────────────────────────────
curl -s http://localhost:3000/api/metrics 2>nul
if errorlevel 1 (
    echo ❌ Servidor no disponible
)

goto PAUSE_MENU

:COMPARE_METRICS
cls
echo.
echo 📈 COMPARACIÓN DE MÉTRICAS HISTÓRICAS
echo.
echo Buscando archivos de métricas históricos...
echo.

if exist "ml_models\metrics_report.json" (
    echo ✅ Archivo actual encontrado: metrics_report.json
    echo.
    node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('ml_models/metrics_report.json','utf8')); console.log('Accuracy: '+(m.accuracy*100).toFixed(2)+'%%'); console.log('F1-Score: '+(m.f1_score*100).toFixed(2)+'%%'); console.log('ROC-AUC: '+(m.roc_auc*100).toFixed(2)+'%%');"
) else (
    echo ⚠️  No se encontró archivo de métricas actual
)

echo.
echo 💡 Para habilitar comparación histórica:
echo    1. Entrenar el modelo periódicamente
echo    2. Guardar métricas con timestamp
echo    3. Usar get_ml_metrics.js para comparar versiones
echo.

goto PAUSE_MENU

:PAUSE_MENU
echo.
echo ═══════════════════════════════════════════════════════════════════
echo.
set /p continue="¿Desea ver otra métrica? (S/N): "
if /i "%continue%"=="S" (
    cls
    goto MENU
)
goto END

:END
echo.
echo ═══════════════════════════════════════════════════════════════════
echo    ✅ Script de métricas ML finalizado
echo ═══════════════════════════════════════════════════════════════════
echo.
timeout /t 2 >nul
exit /b 0
