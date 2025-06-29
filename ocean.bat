@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: 색상 설정
set "BLUE=[94m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "RESET=[0m"

if "%1"=="" goto menu
goto %1

:menu
cls
echo.
echo %BLUE%🌊 Ocean 프로젝트 관리%RESET%
echo =====================================================
echo %GREEN%서비스 관리%RESET%
echo   1. start       - 모든 서비스 시작
echo   2. stop        - 모든 서비스 중지
echo   3. restart     - 모든 서비스 재시작
echo.
echo %YELLOW%데이터베이스%RESET%
echo   4. reset-db    - DB만 초기화 (Jenkins 데이터 보존)
echo   5. reset-all   - 모든 데이터 초기화 %RED%(⚠️  주의!)%RESET%
echo   6. mysql       - MySQL 접속
echo   7. mysql-root  - MySQL root 접속
echo   8. update-db   - DB 스키마 업데이트
echo.
echo %BLUE%Jenkins 백업/복원%RESET%
echo   9. backup      - Jenkins 백업
echo  10. restore     - Jenkins 복원
echo.
echo %GREEN%모니터링%RESET%
echo  11. status      - 컨테이너 상태 확인
echo  12. logs        - 전체 로그 보기
echo  13. logs-mysql  - MySQL 로그
echo  14. logs-jenkins - Jenkins 로그
echo.
echo %YELLOW%기타%RESET%
echo  15. volumes     - 볼륨 확인
echo  16. network     - 네트워크 확인
echo  17. exit        - 종료
echo =====================================================
set /p choice="선택하세요 (1-17): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto reset-db
if "%choice%"=="5" goto reset-all
if "%choice%"=="6" goto mysql
if "%choice%"=="7" goto mysql-root
if "%choice%"=="8" goto update-db
if "%choice%"=="9" goto backup
if "%choice%"=="10" goto restore
if "%choice%"=="11" goto status
if "%choice%"=="12" goto logs
if "%choice%"=="13" goto logs-mysql
if "%choice%"=="14" goto logs-jenkins
if "%choice%"=="15" goto volumes
if "%choice%"=="16" goto network
if "%choice%"=="17" goto exit
goto menu

:start
echo %GREEN%🚀 Ocean 서비스 시작 중...%RESET%
cd docker
docker-compose up -d
echo.
echo %GREEN%✅ Ocean 서비스 시작 완료!%RESET%
echo 📊 phpMyAdmin: http://localhost:8081
echo 🔧 Jenkins: http://localhost:8090
pause
goto menu

:stop
echo %YELLOW%🛑 Ocean 서비스 중지 중...%RESET%
cd docker
docker-compose stop
echo %GREEN%✅ Ocean 서비스 중지 완료!%RESET%
pause
goto menu

:restart
echo %YELLOW%🔄 서비스 재시작 중...%RESET%
call :stop
call :start
goto menu

:reset-db
echo %YELLOW%🔄 MySQL 데이터만 초기화합니다...%RESET%
cd docker
docker-compose rm -f -s ocean-mysql
docker volume rm docker_ocean_mysql_data 2>nul
docker-compose up -d ocean-mysql
echo %YELLOW%⏳ MySQL 초기화 중... 잠시 기다려주세요...%RESET%
timeout /t 10 /nobreak >nul
echo %GREEN%✅ DB 초기화 완료. Jenkins 데이터는 보존되었습니다.%RESET%
pause
goto menu

:reset-all
echo %RED%⚠️  경고: 모든 데이터가 삭제됩니다!%RESET%
echo Jenkins 설정, Job, 빌드 기록이 모두 사라집니다!
echo.
set /p confirm="정말로 계속하시겠습니까? (yes/no): "
if /i not "%confirm%"=="yes" goto menu
echo.
echo %RED%5초 후 시작됩니다. 취소하려면 Ctrl+C를 누르세요...%RESET%
timeout /t 5
cd docker
docker-compose down -v
if exist jenkins\jenkins_home rmdir /s /q jenkins\jenkins_home
if exist mysql\data rmdir /s /q mysql\data
echo %GREEN%✅ 모든 데이터가 초기화되었습니다.%RESET%
pause
goto menu

:mysql
echo %BLUE%🔗 MySQL 접속 중...%RESET%
docker exec -it ocean-mysql mysql -uocean_user -pocean_pass ocean_db
goto menu

:mysql-root
echo %BLUE%🔗 MySQL root로 접속 중...%RESET%
docker exec -it ocean-mysql mysql -uroot -proot1234 ocean_db
goto menu

:update-db
echo %BLUE%📊 DB 스키마 업데이트 중...%RESET%
if exist docker\mysql\updates\latest.sql (
    docker exec -i ocean-mysql mysql -uocean_user -pocean_pass ocean_db < docker\mysql\updates\latest.sql
    echo %GREEN%✅ 업데이트 완료!%RESET%
) else (
    echo %YELLOW%⚠️  업데이트 파일이 없습니다: docker\mysql\updates\latest.sql%RESET%
    echo 📝 파일을 생성하거나 업데이트가 필요없다면 무시하세요.
)
pause
goto menu

:backup
echo %BLUE%💾 Jenkins 백업 중...%RESET%
if not exist backups mkdir backups
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set backup_date=%datetime:~0,8%_%datetime:~8,6%
docker run --rm -v docker_jenkins_home:/jenkins_home -v %cd%\backups:/backup alpine tar czf /backup/jenkins_backup_%backup_date%.tar.gz -C / jenkins_home
echo %GREEN%✅ 백업 완료: .\backups\jenkins_backup_%backup_date%.tar.gz%RESET%
dir backups\jenkins_backup_*.tar.gz | findstr /i jenkins_backup_
pause
goto menu

:restore
echo %BLUE%📥 Jenkins 복원%RESET%
set /p backup_file="백업 파일 경로를 입력하세요 (예: .\backups\jenkins_backup_20240101_120000.tar.gz): "
if not exist "%backup_file%" (
    echo %RED%❌ Error: 파일을 찾을 수 없습니다%RESET%
    pause
    goto menu
)
echo %backup_file%에서 복원 중...
cd docker
docker-compose stop ocean-jenkins
docker run --rm -v docker_jenkins_home:/jenkins_home -v %cd%\..\%backup_file%:/backup/backup.tar.gz alpine sh -c "cd / && tar xzf /backup/backup.tar.gz"
docker-compose start ocean-jenkins
echo %GREEN%✅ 복원 완료%RESET%
pause
goto menu

:status
echo %BLUE%📊 Ocean 컨테이너 상태:%RESET%
docker ps --filter "name=ocean" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
pause
goto menu

:logs
echo %BLUE%📋 Docker 로그 확인 (종료: Ctrl+C)%RESET%
cd docker
docker-compose logs -f
goto menu

:logs-mysql
echo %BLUE%📋 MySQL 로그 (종료: Ctrl+C)%RESET%
cd docker
docker-compose logs -f ocean-mysql
goto menu

:logs-jenkins
echo %BLUE%📋 Jenkins 로그 (종료: Ctrl+C)%RESET%
cd docker
docker-compose logs -f ocean-jenkins
goto menu

:volumes
echo %BLUE%📦 Docker 볼륨 목록:%RESET%
docker volume ls | findstr /i "ocean jenkins"
pause
goto menu

:network
echo %BLUE%🌐 Docker 네트워크 정보:%RESET%
docker network ls | findstr ocean
echo.
echo 네트워크 상세:
docker network inspect docker_ocean-network 2>nul
pause
goto menu

:exit
exit /b 0