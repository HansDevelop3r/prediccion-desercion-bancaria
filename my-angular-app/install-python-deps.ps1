# Script para instalar dependencias de Python para XGBoost
Write-Host "Instalando dependencias de Python para XGBoost..." -ForegroundColor Yellow

# Verificar si Python está instalado
try {
    $pythonVersion = python --version
    Write-Host "Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python no está instalado. Por favor, instale Python primero." -ForegroundColor Red
    exit 1
}

# Instalar dependencias
Write-Host "Instalando pandas..." -ForegroundColor Yellow
pip install pandas==2.0.3

Write-Host "Instalando numpy..." -ForegroundColor Yellow
pip install numpy==1.24.3

Write-Host "Instalando scikit-learn..." -ForegroundColor Yellow
pip install scikit-learn==1.3.0

Write-Host "Instalando XGBoost..." -ForegroundColor Yellow
pip install xgboost==1.7.6

Write-Host "Instalando matplotlib..." -ForegroundColor Yellow
pip install matplotlib==3.7.2

Write-Host "Instalando seaborn..." -ForegroundColor Yellow
pip install seaborn==0.12.2

Write-Host "Instalando joblib..." -ForegroundColor Yellow
pip install joblib==1.3.2

Write-Host "Todas las dependencias se instalaron correctamente!" -ForegroundColor Green
Write-Host "Ahora puedes ejecutar la aplicación con: .\start.ps1" -ForegroundColor Cyan
