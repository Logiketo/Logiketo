@echo off
echo Starting Logiketo Platform...
echo.

echo Starting Backend Server...
start "Logiketo Backend" cmd /k "cd /d C:\Users\user\Desktop\David\Logiketo\backend && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Server...
start "Logiketo Frontend" cmd /k "cd /d C:\Users\user\Desktop\David\Logiketo\frontend && npm run dev"

echo.
echo Logiketo Platform is starting up!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul
