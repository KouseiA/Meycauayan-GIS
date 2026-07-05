@echo off
setlocal
cd /d "%~dp0"
for %%I in ("%~dp0.") do set "folder=%%~nxI"
start "" http://localhost/%folder%/
