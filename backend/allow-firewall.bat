@echo off
echo ========================================
echo Adding Firewall Rule for Backend
echo ========================================
echo.
echo This will allow your phone to connect to the backend server.
echo.
echo Right-click this file and select "Run as administrator"
echo.
pause

netsh advfirewall firewall delete rule name="GST Backend API" 2>nul
netsh advfirewall firewall add rule name="GST Backend API" dir=in action=allow protocol=TCP localport=3000

echo.
echo ========================================
echo Firewall rule added successfully!
echo ========================================
echo.
echo Your phone can now connect to the backend.
echo.
pause
