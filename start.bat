@echo off
title ITDR 3-Layered Platform Server (SQL Server + Neo4j)
echo =======================================================================
echo          STANDARD CHARTERED - ITDR 3-LAYERED PLATFORM SERVER
echo =======================================================================
echo Database Layer : SQL Server (DESKTOP-DULJ3LT\SS2025NM db ITDR) ^& Neo4j Graph
echo API Layer      : Python FastAPI (uvicorn backend.app:app)
echo Frontend Layer : Lit + TypeScript Web Components
echo =======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verifying Python Environment...
python -c "import fastapi, pyodbc, uvicorn; print('Python dependencies verified!')"
if %ERRORLEVEL% NEQ 0 (
    echo [!] Installing required Python packages...
    pip install -r backend\requirements.txt
)

echo.
echo [2/3] Starting FastAPI Application Server on http://localhost:8001 ...
start "ITDR Backend API" python -m uvicorn backend.app:app --host 0.0.0.0 --port 8001 --reload

timeout /t 3 >nul

echo.
echo [3/3] Launching Web Browser at http://localhost:8001 ...
start http://localhost:8001

echo.
echo Server is running! Press Ctrl+C or close the backend window to stop.
pause
