@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo 🔍 Ocean 프로젝트 문제 해결 도구
echo ================================
echo.

:: Docker 상태 확인
echo 1️⃣ Docker 상태 확인
echo --------------------
docker --version 2>nul
if errorlevel 1 (
    echo ❌ Docker가 설치되지 않았습니다!
    goto :docker_error
)

docker ps >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker가 실행되지 않았습니다!
    goto :docker_error
) else (
    echo ✅ Docker 정상 작동 중
)
echo.

:: 컨테이너 상태 확인
echo 2️⃣ 컨테이너 상태
echo ----------------
docker ps -a --filter "name=ocean" --format "table {{.Names}}\t{{.Status}}"
echo.

:: 포트 사용 확인
echo 3️⃣ 포트 사용 확인
echo -----------------
echo MySQL 포트 (3307):
netstat -an | findstr :3307
if errorlevel 1 (
    echo ✅ 포트 3307 사용 가능
) else (
    echo ⚠️  포트 3307이 사용 중입니다!
)

echo.
echo phpMyAdmin 포트 (8081):
netstat -an | findstr :8081
if errorlevel 1 (
    echo ✅ 포트 8081 사용 가능
) else (
    echo ⚠️  포트 8081이 사용 중입니다!
)
echo.

:: 볼륨 확인
echo 4️⃣ Docker 볼륨
echo --------------
docker volume ls | findstr "ocean mysql"
echo.

:: 최근 로그 확인
echo 5️⃣ 최근 에러 로그
echo -----------------
echo MySQL 최근 로그:
docker logs ocean-mysql --tail 5 2>&1 | findstr /i "error warning"
if errorlevel 1 echo 에러 없음
echo.

:: 해결 방법 제안
echo 💡 일반적인 해결 방법:
echo ----------------------
echo 1. Docker Desktop이 실행 중인지 확인
echo 2. 포트 충돌 시 다른 프로그램 종료
echo 3. ocean.bat에서 4번(reset-db) 실행
echo 4. 문제 지속 시 5번(reset-all) 실행
echo.

pause
exit /b 0

:docker_error
echo.
echo 🚨 Docker 설치/실행 필요!
echo ------------------------
echo 1. Docker Desktop 다운로드: https://www.docker.com/products/docker-desktop
echo 2. 설치 후 Docker Desktop 실행
echo 3. 시스템 트레이에서 Docker 아이콘 확인
echo.
pause
exit /b 1