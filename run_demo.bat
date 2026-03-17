
@echo off
setlocal

echo.
echo ============================================================
echo   ComplyAct Pinnacle Demo - Starter Script
echo ============================================================
echo.

:: Kill existing processes on ports 8000 and 3000 if they exist
echo Checking for existing processes on ports 8000 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

:: Start Backend
echo Launching Backend (FastAPI)...
start "ComplyAct-Backend" cmd /c "cd backend && venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --no-access-log"

:: Start Frontend
echo Launching Frontend (Next.js)...
start "ComplyAct-Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ------------------------------------------------------------
echo [SUCCESS] Servers are launching in separate windows.
echo.
echo Backend API : http://localhost:8000
echo Frontend UI  : http://localhost:3000
echo ------------------------------------------------------------
echo.
echo To STOP the demo: Close the 'ComplyAct-Backend' and 'ComplyAct-Frontend' windows.
echo.

pause
