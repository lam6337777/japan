@echo off
chcp 65001 >nul
title Nihongo AI - Khoi dong
cd /d "%~dp0"

echo ============================================
echo   Nihongo AI - Khoi dong toan bo du an
echo ============================================
echo.

REM ---------- 1. Kiem tra Docker ----------
docker info >nul 2>&1
if errorlevel 1 (
    echo [LOI] Docker chua chay. Hay mo Docker Desktop, doi no khoi dong xong roi chay lai file nay.
    pause
    exit /b 1
)

REM ---------- 2. Cai dat lan dau (neu thieu) ----------
if not exist "chatbot\.venv\Scripts\python.exe" (
    echo [Lan dau] Tao moi truong Python cho chatbot...
    python -m venv chatbot\.venv
    chatbot\.venv\Scripts\python -m pip install -q -r chatbot\requirements.txt
)
if not exist "chatbot\.env" (
    copy chatbot\.env.example chatbot\.env >nul
    echo [CHU Y] Da tao chatbot\.env - hay dien DEEPSEEK_API_KEY vao file nay de chat voi AI.
)
if not exist "frontend\node_modules" (
    echo [Lan dau] Cai thu vien cho frontend...
    pushd frontend
    call npm install
    popd
)

REM ---------- 3. Database ----------
echo [1/4] Database PostgreSQL (cong 5433)...
docker compose up -d
echo.

REM ---------- 4. Cac service (moi cai 1 cua so) ----------
echo [2/4] Chatbot - Python FastAPI (cong 8000)
start "Nihongo - Chatbot" /D "%~dp0chatbot" cmd /k ".venv\Scripts\python -m uvicorn app.main:app --port 8000"

echo [3/4] Backend - Spring Boot (cong 8080)
start "Nihongo - Backend" /D "%~dp0backend" cmd /k ".\mvnw.cmd spring-boot:run"

echo [4/4] Frontend - Next.js (cong 3100)
start "Nihongo - Frontend" /D "%~dp0frontend" cmd /k "npm run dev"

REM ---------- 5. Cho backend san sang roi mo trinh duyet ----------
echo.
echo Dang cho backend khoi dong (khoang 20-40 giay)...
set /a tries=0
:wait
set /a tries+=1
curl -s -o nul http://localhost:8080/api/health && goto ready
if %tries% geq 90 goto ready
timeout /t 1 /nobreak >nul
goto wait

:ready
start "" http://localhost:3100
echo.
echo ============================================
echo   Da xong! Web: http://localhost:3100
echo   Tat toan bo: chay stop.bat
echo ============================================
timeout /t 5 >nul
