@echo off
setlocal
cd /d "%~dp0"
for %%I in ("%~dp0.") do set "folder=%%~nxI"

echo ========================================================
echo   Starting Ngrok Tunnel for Meycauayan GIS (Port 80)
echo ========================================================
echo.

start "ngrok" ngrok http 80

echo Waiting for tunnel to initialize...
timeout /t 3 /nobreak >nul

for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -ErrorAction SilentlyContinue).tunnels[0].public_url"') do set "NGROK_URL=%%a"

if not "%NGROK_URL%"=="" (
    echo.
    echo --------------------------------------------------------
    echo  Public Web URL:   %NGROK_URL%/%folder%/
    echo  Admin Panel:      %NGROK_URL%/%folder%/admin.html
    echo  Ngrok Dashboard:  http://127.0.0.1:4040
    echo --------------------------------------------------------
    echo.
    start "" "%NGROK_URL%/%folder%/"
) else (
    echo Unable to retrieve ngrok public URL automatically.
    echo Please check http://127.0.0.1:4040 in your browser.
)
pause
