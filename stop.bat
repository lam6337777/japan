@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang tat Nihongo AI...

REM Dong 3 cua so service (va cac tien trinh con: java, node, python)
taskkill /FI "WINDOWTITLE eq Nihongo - Chatbot*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Nihongo - Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Nihongo - Frontend*" /T /F >nul 2>&1

REM Phong khi service duoc chay bang cach khac: giai phong cac cong
for %%P in (8000 8080 3100) do (
    for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do taskkill /PID %%I /T /F >nul 2>&1
)

REM Dung database (du lieu van duoc giu lai)
docker compose stop

echo Da tat xong.
timeout /t 3 >nul
