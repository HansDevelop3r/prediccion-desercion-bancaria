@echo off
chcp 65001 > nul
cls

echo.
echo ═══════════════════════════════════════════════════════════════
echo     📊 SISTEMA DE MÉTRICAS - ML PREDICTION PLATFORM
echo ═══════════════════════════════════════════════════════════════
echo.

:MENU
echo Seleccione una opción:
echo.
echo  [1] 📊 Ver métricas de Base de Datos
echo  [2] 🌐 Ver métricas del Backend (API)
echo  [3] 🔍 Health Check del sistema
echo  [4] 📈 Ver todas las métricas
echo  [5] 🔄 Métricas en tiempo real (actualización continua)
echo  [0] ❌ Salir
echo.
set /p opcion="Ingrese su opción: "

if "%opcion%"=="1" goto DB_METRICS
if "%opcion%"=="2" goto API_METRICS
if "%opcion%"=="3" goto HEALTH_CHECK
if "%opcion%"=="4" goto ALL_METRICS
if "%opcion%"=="5" goto REAL_TIME
if "%opcion%"=="0" goto END
goto MENU

:DB_METRICS
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo           📊 MÉTRICAS DE BASE DE DATOS
echo ═══════════════════════════════════════════════════════════════
echo.
cd /d "%~dp0backend"
node check-db-performance.js
echo.
pause
cls
goto MENU

:API_METRICS
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo           🌐 MÉTRICAS DEL BACKEND (API)
echo ═══════════════════════════════════════════════════════════════
echo.
echo Consultando http://localhost:3000/api/metrics...
echo.
curl -s http://localhost:3000/api/metrics | node -e "const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(JSON.stringify(data, null, 2));"
if errorlevel 1 (
    echo.
    echo ❌ Error: No se pudo conectar al backend.
    echo    Asegúrate de que el servidor esté corriendo en el puerto 3000.
)
echo.
pause
cls
goto MENU

:HEALTH_CHECK
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo           🔍 HEALTH CHECK DEL SISTEMA
echo ═══════════════════════════════════════════════════════════════
echo.
echo Verificando estado del sistema...
echo.

REM Check Backend
echo [Backend] Verificando puerto 3000...
netstat -an | findstr ":3000" > nul
if %errorlevel%==0 (
    echo   ✅ Backend: RUNNING
) else (
    echo   ❌ Backend: NOT RUNNING
)

REM Check Frontend
echo [Frontend] Verificando puerto 4200...
netstat -an | findstr ":4200" > nul
if %errorlevel%==0 (
    echo   ✅ Frontend: RUNNING
) else (
    echo   ❌ Frontend: NOT RUNNING
)

REM Check Database
echo [Database] Verificando MySQL...
sc query MySQL80 > nul 2>&1
if %errorlevel%==0 (
    echo   ✅ MySQL: INSTALLED
) else (
    echo   ⚠️  MySQL: Service not found
)

REM API Health Check
echo.
echo [API Health] Consultando /api/health...
curl -s http://localhost:3000/api/health | node -e "try { const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log('  ✅ API Status:', data.status); console.log('  ⏱️  Uptime:', data.uptime); } catch(e) { console.log('  ❌ API not responding'); }"

echo.
pause
cls
goto MENU

:ALL_METRICS
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo           📈 TODAS LAS MÉTRICAS DEL SISTEMA
echo ═══════════════════════════════════════════════════════════════
echo.

echo [1/2] Consultando métricas de Base de Datos...
echo.
cd /d "%~dp0backend"
node check-db-performance.js

echo.
echo ─────────────────────────────────────────────────────────────
echo.
echo [2/2] Consultando métricas del Backend...
echo.
curl -s http://localhost:3000/api/metrics | node -e "try { const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log('📊 SERVER METRICS:'); console.log('  Uptime:', data.server.uptime_readable); console.log('  Total Requests:', data.server.total_requests); console.log('  Success Rate:', data.server.success_rate); console.log('  Avg Response Time:', data.server.avg_response_time_ms, 'ms'); } catch(e) { console.log('❌ Backend not responding'); }"

echo.
echo ═══════════════════════════════════════════════════════════════
echo.
pause
cls
goto MENU

:REAL_TIME
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo      🔄 MÉTRICAS EN TIEMPO REAL (Actualización cada 5s)
echo      Presione Ctrl+C para detener
echo ═══════════════════════════════════════════════════════════════
echo.

:LOOP
cls
echo.
echo ═══════════════════════════════════════════════════════════════
echo      🔄 MÉTRICAS EN TIEMPO REAL - %date% %time%
echo ═══════════════════════════════════════════════════════════════
echo.

curl -s http://localhost:3000/api/metrics | node -e "try { const d = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log('📊 SERVER:'); console.log('  Uptime:', d.server.uptime_readable); console.log('  Requests:', d.server.total_requests, '| Errors:', d.server.error_count); console.log('  Avg Time:', d.server.avg_response_time_ms, 'ms'); console.log(''); console.log('💾 DATABASE:'); console.log('  Usuarios:', d.database.total_usuarios); console.log('  Archivos:', d.database.total_archivos); console.log('  Predicciones:', d.database.total_predicciones); console.log('  Hoy:', d.database.predicciones_hoy); console.log(''); console.log('⚠️  RISK DISTRIBUTION:'); console.log('  🔴 High:', d.risk_distribution.high || 0); console.log('  🟡 Medium:', d.risk_distribution.medium || 0); console.log('  🟢 Low:', d.risk_distribution.low || 0); } catch(e) { console.log('❌ Error connecting to backend'); }"

echo.
echo Próxima actualización en 5 segundos...
timeout /t 5 /nobreak > nul
goto LOOP

:END
echo.
echo Saliendo...
exit /b 0
