@echo off
REM 设置环境变量
for /f "tokens=*" %%a in ('powershell "[Environment]::GetEnvironmentVariable('Path','Machine')"') do set MACHINE_PATH=%%a
for /f "tokens=*" %%a in ('powershell "[Environment]::GetEnvironmentVariable('Path','User')"') do set USER_PATH=%%a
set PATH=%MACHINE_PATH%;%USER_PATH%

REM 启动后端
echo 启动 New API 后端...
cd /d "%~dp0"
go run main.go
