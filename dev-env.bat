@echo off
chcp 65001 >nul
echo.
echo 🔧 Ocean 개발 환경 설정
echo ========================
echo.

:: Java 버전 확인
echo ☕ Java 버전 확인:
java -version 2>&1 | findstr /i "version"
if errorlevel 1 (
    echo ❌ Java가 설치되지 않았습니다!
    echo 👉 Java 17 이상을 설치해주세요.
) else (
    echo ✅ Java 설치 확인
)
echo.

:: Docker 확인
echo 🐳 Docker 상태 확인:
docker --version 2>nul
if errorlevel 1 (
    echo ❌ Docker가 설치되지 않았습니다!
    echo 👉 Docker Desktop을 설치해주세요.
) else (
    echo ✅ Docker 설치 확인

    :: Docker 실행 확인
    docker ps >nul 2>&1
    if errorlevel 1 (
        echo ⚠️  Docker가 실행되지 않았습니다!
        echo 👉 Docker Desktop을 실행해주세요.
    ) else (
        echo ✅ Docker 실행 중
    )
)
echo.

:: MySQL 컨테이너 상태 확인
echo 📊 MySQL 컨테이너 상태:
docker ps --filter "name=ocean-mysql" --format "table {{.Names}}\t{{.Status}}"
echo.

:: 프로젝트 정보
echo 📁 프로젝트 정보:
echo - 프로젝트 경로: %cd%
echo - MySQL 포트: 3307
echo - phpMyAdmin: http://localhost:8081
echo - Jenkins: http://localhost:8090
echo.

echo 💡 팁:
echo - Spring Boot 실행: gradlew.bat bootRun
echo - MySQL 접속: ocean.bat 후 6번 선택
echo - 서비스 시작: quick-start.bat
echo.
pause