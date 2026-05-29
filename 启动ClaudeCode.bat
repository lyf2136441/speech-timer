@echo off
echo 正在启动 DeepSeek 兼容代理...
start "DeepSeek-Proxy" /MIN cmd /c "cd /d %~dp0 && node deepseek-proxy.js"
timeout /t 2 /nobreak >nul
echo 代理已启动 (http://localhost:8787)
echo.
echo 现在可以输入 claude 启动 Claude Code
echo 所有窗口都能正常使用了
echo.
