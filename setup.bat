@echo off
setlocal
cd /d "%~dp0"
echo Installing server dependencies...
cd server && call npm install
if errorlevel 1 goto failed
cd ..\admin && echo Installing admin dependencies... && call npm install
if errorlevel 1 goto failed
cd ..\client && echo Installing client dependencies... && call npm install
if errorlevel 1 goto failed
cd ..
echo.
echo Dependencies installed. Follow INSTALL_AND_RUN.md to create .env files and start MongoDB/API/admin/client.
pause
exit /b 0
:failed
echo Installation failed. Check the npm error above.
pause
exit /b 1
