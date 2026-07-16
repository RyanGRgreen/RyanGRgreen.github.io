@echo off
REM Same launcher with ASCII-only path for systems that mishandle Unicode .bat names
setlocal EnableExtensions
cd /d "%~dp0"

chcp 65001 >nul 2>&1
title Stick VERSUS Server
color 0A

echo ========================================
echo   Stick VERSUS  —  Windows one-click
echo ========================================
echo.

if not exist "serve.py" (
  echo [ERROR] serve.py not found.
  pause
  exit /b 1
)

set "PY="
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
  echo Install from https://www.python.org/downloads/
  echo Check "Add python.exe to PATH", then try again.
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
echo.
pause
endlocal
