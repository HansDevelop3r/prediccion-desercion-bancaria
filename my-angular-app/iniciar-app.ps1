# Script para iniciar backend y frontend
Write-Host "🚀 Iniciando aplicación completa..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
Write-Host "📁 Directorio actual: $currentDir" -ForegroundColor Yellow

# Verificar que existe el directorio backend
if (Test-Path "backend") {
    Write-Host "✅ Directorio backend encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Directorio backend no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar que existe package.json del frontend
if (Test-Path "package.json") {
    Write-Host "✅ Package.json del frontend encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Package.json del frontend no encontrado" -ForegroundColor Red
    exit 1
}

# Terminar procesos de Node.js existentes
Write-Host "🧹 Terminando procesos existentes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Iniciar backend
Write-Host "🔧 Iniciando backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir\backend'; Write-Host '🚀 Iniciando servidor backend...' -ForegroundColor Green; node server.js"

# Esperar un poco para que el backend se inicie
Start-Sleep -Seconds 5

# Verificar que el backend esté corriendo
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body '{"username":"test","password":"test"}' -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend está respondiendo" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Backend aún no está listo, pero continuando..." -ForegroundColor Yellow
}

# Iniciar frontend
Write-Host "🎨 Iniciando frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$currentDir'; Write-Host '🚀 Iniciando servidor Angular...' -ForegroundColor Green; ng serve"

Write-Host "✅ Aplicación iniciada!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "👤 Usuario: admin" -ForegroundColor White
Write-Host "🔑 Contraseña: admin123" -ForegroundColor White

Write-Host "`n⏳ Esperando a que los servidores se inicien completamente..." -ForegroundColor Yellow
Write-Host "📱 Abre tu navegador en http://localhost:4200 cuando esté listo" -ForegroundColor Green
