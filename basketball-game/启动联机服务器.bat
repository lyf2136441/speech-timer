@echo off
cd /d "%~dp0server"
echo ===================================
echo   CBA篮球1v1 联机服务器
echo   端口: 3456
echo   局域网IP请查看下方
echo ===================================
echo.
ipconfig | findstr /i "IPv4"
echo.
echo 手机浏览器访问: http://你的IP:3456
echo.
node server.js
pause
