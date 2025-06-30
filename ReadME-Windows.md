# Ocean 프로젝트 - Windows 사용자 가이드

## 🚀 빠른 시작

### 1. 필수 프로그램 설치
- **Java 17 이상** - [다운로드](https://adoptium.net/)
- **Docker Desktop** - [다운로드](https://www.docker.com/products/docker-desktop)

### 2. Docker Desktop 실행
- 설치 후 Docker Desktop을 실행하고 시스템 트레이에서 고래 아이콘 확인

### 3. Ocean 서비스 시작
```batch
# 방법 1: 빠른 시작
quick-start.bat

# 방법 2: 메뉴 사용
ocean.bat
→ 1번 선택 (start)
```

## 📋 주요 배치 파일

|         파일명          |     설명      |    용도     |
|:--------------------:|:-----------:|:---------:|
|     `ocean.bat`      |  메인 관리 도구   | 전체 기능 관리  |
|  `quick-start.bat`   |    빠른 시작    | 서비스 즉시 실행 |
|  `quick-mysql.bat`   | MySQL 빠른 접속 |  DB 작업 시  |
|    `dev-env.bat`     |  개발 환경 확인   | 환경 설정 검증  |
| `jenkins-backup.bat` | Jenkins 백업  |  정기 백업용   |
|  `troubleshoot.bat`  |  문제 해결 도구   |   오류 진단   |

## 🔧 자주 사용하는 명령

### 서비스 관리
```batch
# 시작
ocean.bat → 1

# 중지
ocean.bat → 2

# 재시작
ocean.bat → 3
```

### 데이터베이스
```batch
# MySQL 접속
ocean.bat → 6
# 또는
quick-mysql.bat

# DB 초기화 (데이터 삭제)
ocean.bat → 4
```

### 로그 확인
```batch
# 전체 로그
ocean.bat → 12

# MySQL 로그만
ocean.bat → 13
```

## 🌐 접속 정보

|     서비스     |          URL          |              계정 정보               |
|:-----------:|:---------------------:|:--------------------------------:|
| phpMyAdmin  | http://localhost:8081 | ID: ocean_user<br>PW: ocean_pass |
|   Jenkins   | http://localhost:8090 |             초기 설정 필요             |
| Spring Boot | http://localhost:8080 |                -                 |
|    MySQL    |    localhost:3307     | ID: ocean_user<br>PW: ocean_pass |

## ❗ 문제 해결

### Docker 관련 오류
1. Docker Desktop이 실행 중인지 확인
2. `troubleshoot.bat` 실행하여 진단

### 포트 충돌
- 3307, 8080, 8081, 8090 포트가 다른 프로그램에서 사용 중인지 확인
- `netstat -an | findstr :포트번호`로 확인

### DB 접속 오류
```batch
# DB 재시작
ocean.bat → 4 (reset-db)

# 전체 초기화 (최후 수단)
ocean.bat → 5 (reset-all)
```

## 💡 개발 팁

### Spring Boot 실행
```batch
# 프로젝트 루트에서
gradlew.bat bootRun
```

### 프로젝트 빌드
```batch  
./gradlew bootRun --args='--spring.profiles.active=local'
```

### 테스트 실행
```batch
gradlew.bat test
```

## 📁 폴더 구조
```
ocean/
├── docker/           # Docker 설정 파일
├── backups/         # Jenkins 백업 파일
├── src/             # 소스 코드
├── ocean.bat        # 메인 관리 도구
├── quick-start.bat  # 빠른 시작
└── ...             # 기타 배치 파일
```

## 🔐 보안 정보
- 프로덕션 환경에서는 비밀번호 변경 필수
- application-local.properties 파일은 Git에 커밋하지 않기
- 백업 파일은 안전한 곳에 보관

## 📞 도움말
문제 발생 시:
1. `troubleshoot.bat` 실행
2. `ocean.bat` → 12번으로 로그 확인
3. 팀 리더에게 문의