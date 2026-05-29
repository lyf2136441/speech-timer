@echo off
chcp 65001 >nul
cd /d "C:\Users\Lenovo\Desktop\小助手\金属屑识别"
echo.
echo =======================================================
echo   Iron Scrap Detection - Web App Launcher
echo =======================================================
echo.
echo Starting web server...
echo Open in browser: http://127.0.0.1:5000
echo Press Ctrl+C to stop
echo.
python web_app.py
pause
