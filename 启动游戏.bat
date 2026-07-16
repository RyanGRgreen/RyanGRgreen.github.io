@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM Prefer UTF-8 console when available
chcp 65001 >nul 2>&1

title Stick VERSUS Server
color 0A

echo ========================================
echo   Stick VERSUS  —  Windows one-click
echo ========================================
echo.

if not exist "serve.py" (
  echo [ERROR] serve.py not found.
  echo Put this .bat in the game folder and try again.
  echo.
  pause
  exit /b 1
)

set "PY="
REM Windows Python Launcher first (most reliable)
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -c "import sys" >nul 2>&1
  if not errorlevel 1 set "PY=py -3"
)

if not defined PY (
  where python >nul 2>&1
  if not errorlevel 1 (
    python -c "import sys" >nul 2>&1
    if not errorlevel 1 set "PY=python"
  )
)

if not defined PY (
  where python3 >nul 2>&1
  if not errorlevel 1 (
    python3 -c "import sys" >nul 2>&1
    if not errorlevel 1 set "PY=python3"
  )
)

if not defined PY (
  echo [ERROR] Python 3 not found.
  echo.
  echo Install from https://www.python.org/downloads/
  echo IMPORTANT: check "Add python.exe to PATH"
  echo Then reopen this window and double-click again.
  echo.
  pause
  exit /b 1
)

echo Using: %PY%
echo URL:   http://127.0.0.1:9473/
echo.
echo  * Edit js / css / html  →  browser auto-reloads
echo  * Keep this window open while playing
echo  * Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

%PY% serve.py --port 9473
set "ERR=%ERRORLEVEL%"

echo.
if not "%ERR%"=="0" (
  echo Server exited with code %ERR%.
) else (
  echo Server stopped.
)
echo.
pause
endlocal
exit /b %ERR%
