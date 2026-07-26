@echo off
REM 启动前端开发服务器
cd /d "%~dp0web"
echo 启动 New API 前端开发服务器...
call bun run dev -- --host 0.0.0.0 --port 5173
pause
