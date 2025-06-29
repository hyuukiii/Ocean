@echo off
:: Ocean 서비스 빠른 시작
echo 🚀 Ocean 서비스를 시작합니다...
cd docker
docker-compose up -d
echo.
echo ✅ 시작 완료!
echo.
echo 📊 phpMyAdmin: http://localhost:8081
echo     - ID: ocean_user
echo     - PW: ocean_pass
echo.
echo 🔧 Jenkins: http://localhost:8090
echo.
pause