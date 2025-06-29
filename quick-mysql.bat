@echo off
:: MySQL 빠른 접속
echo 🔗 MySQL 접속 중...
echo.
echo 사용자: ocean_user
echo 비밀번호: ocean_pass (자동 입력됨)
echo.
docker exec -it ocean-mysql mysql -uocean_user -pocean_pass ocean_db