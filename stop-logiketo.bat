@echo off
echo Stopping Logiketo Platform...
echo.

echo Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul

echo.
echo Logiketo Platform stopped!
echo.
echo Press any key to close this window...
pause > nul
