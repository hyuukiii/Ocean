@echo off
chcp 65001 >nul
setlocal

if "%1"=="" goto menu
goto %1

:menu
cls
echo.
echo ===== Ocean DB 관리 =====
echo 1. start  - DB 시작
echo 2. stop   - DB 중지
echo 3. reset  - DB 초기화
echo 4. status - 상태 확인
echo 5. mysql  - MySQL 접속
echo 6. logs   - 로그 보기
echo 7. exit   - 종료
echo ========================
set /p choice="선택하세요 (1-7): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto reset
if "%choice%"=="4" goto status
if "%choice%"=="5" goto mysql
if "%choice%"=="6" goto logs
if "%choice%"=="7" goto exit
goto menu

:start
echo [시작] Ocean DB 시작 중...
cd docker
docker-compose up -d
echo [완료] Ocean DB 시작 완료!
echo [정보] phpMyAdmin: http://localhost:8081
pause
goto menu

:stop
echo [중지] Ocean DB 중지 중...
cd docker
docker-compose stop
echo [완료] Ocean DB 중지 완료!
pause
goto menu

:reset
echo [초기화] Ocean DB 초기화 중...
cd docker
docker-compose down -v
docker-compose up -d
echo [완료] Ocean DB 초기화 완료!
pause
goto menu

:status
echo [상태] Ocean 컨테이너 상태:
docker ps --filter "name=ocean"
pause
goto menu

:mysql
echo [접속] MySQL 접속 중...
docker exec -it ocean-mysql mysql -uocean_user -pocean_pass ocean_db
goto menu

:logs
echo [로그] Docker 로그 확인 (종료: Ctrl+C)
cd docker
docker-compose logs -f
goto menu

:exit
exit /b 0