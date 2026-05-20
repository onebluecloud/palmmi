@echo off
set "HTML=%~dp0palmtag-visual-direction.html"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if not exist "%HTML%" (
  echo PalmTag page not found:
  echo %HTML%
  pause
  exit /b 1
)

if exist "%CHROME%" (
  start "" "%CHROME%" --new-window "%HTML%"
  exit /b 0
)

if exist "%EDGE%" (
  start "" "%EDGE%" --new-window "%HTML%"
  exit /b 0
)

start "" "%HTML%"
