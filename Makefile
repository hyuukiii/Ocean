# 변수 정의
DOCKER_COMPOSE = cd docker && docker-compose
PROJECT_NAME = ocean

# 기본 명령어
.PHONY:
help:
	@echo "🌊 Ocean 프로젝트 명령어:"
	@echo "  make start       - 모든 서비스 시작"
	@echo "  make stop        - 모든 서비스 중지"
	@echo "  make restart     - 모든 서비스 재시작"
	@echo "  make reset-db    - DB만 초기화 (Jenkins 데이터 보존)"
	@echo "  make reset-all   - 모든 데이터 초기화 (⚠️  주의!)"
	@echo "  make backup      - Jenkins 백업"
	@echo "  make restore     - Jenkins 복원"
	@echo "  make status      - 컨테이너 상태 확인"
	@echo "  make mysql       - MySQL 접속"
	@echo "  make logs        - 로그 보기"
	@echo "  make update-db   - DB 스키마 업데이트"

# 서비스 시작
.PHONY: start
start:
	@echo "🚀 Ocean 서비스 시작 중..."
	@$(DOCKER_COMPOSE) up -d
	@echo "✅ Ocean 서비스 시작 완료!"
	@echo "📊 phpMyAdmin: http://localhost:8081"
	@echo "🔧 Jenkins: http://localhost:8090"

# 서비스 중지
.PHONY: stop
stop:
	@echo "🛑 Ocean 서비스 중지 중..."
	@$(DOCKER_COMPOSE) stop
	@echo "✅ Ocean 서비스 중지 완료!"

# 서비스 재시작
.PHONY: restart
restart: stop start

# DB만 초기화 (Jenkins 데이터는 보존)
.PHONY: reset-db
reset-db:
	@echo "🔄 MySQL 데이터만 초기화합니다..."
	@$(DOCKER_COMPOSE) rm -f -s ocean-mysql
	@docker volume rm docker_ocean_mysql_data || true
	@$(DOCKER_COMPOSE) up -d ocean-mysql
	@echo "⏳ MySQL 초기화 중... 잠시 기다려주세요..."
	@sleep 10
	@echo "✅ DB 초기화 완료. Jenkins 데이터는 보존되었습니다."

# 모든 데이터 초기화 (위험!)
.PHONY: reset-all
reset-all:
	@echo "⚠️  경고: 모든 데이터가 삭제됩니다!"
	@echo "Jenkins 설정, Job, 빌드 기록이 모두 사라집니다!"
	@echo "계속하려면 5초 내에 Ctrl+C로 취소하세요..."
	@sleep 5
	@$(DOCKER_COMPOSE) down -v
	@rm -rf ./docker/jenkins/jenkins_home/*
	@rm -rf ./docker/mysql/data/*
	@echo "✅ 모든 데이터가 초기화되었습니다."

# Jenkins 백업
.PHONY: backup
backup:
	@echo "💾 Jenkins 백업 중..."
	@mkdir -p ./backups
	@docker run --rm -v docker_jenkins_home:/jenkins_home -v $(shell pwd)/backups:/backup alpine tar czf /backup/jenkins_backup_$(shell date +%Y%m%d_%H%M%S).tar.gz -C / jenkins_home
	@echo "✅ 백업 완료: ./backups/"
	@ls -lh ./backups/jenkins_backup_*.tar.gz | tail -1

# Jenkins 복원
.PHONY: restore
restore:
	@echo "📥 Jenkins 복원"
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "❌ Error: BACKUP_FILE을 지정하세요"; \
		echo "사용법: make restore BACKUP_FILE=./backups/jenkins_backup_YYYYMMDD_HHMMSS.tar.gz"; \
		echo ""; \
		echo "사용 가능한 백업 파일:"; \
		ls -lh ./backups/jenkins_backup_*.tar.gz 2>/dev/null || echo "백업 파일이 없습니다."; \
		exit 1; \
	fi
	@echo "$(BACKUP_FILE)에서 복원 중..."
	@$(DOCKER_COMPOSE) stop ocean-jenkins
	@docker run --rm -v docker_jenkins_home:/jenkins_home -v $(shell pwd)/$(BACKUP_FILE):/backup/backup.tar.gz alpine sh -c "cd / && tar xzf /backup/backup.tar.gz"
	@$(DOCKER_COMPOSE) start ocean-jenkins
	@echo "✅ 복원 완료"

# 컨테이너 상태
.PHONY: status
status:
	@echo "📊 Ocean 컨테이너 상태:"
	@docker ps --filter "name=ocean" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# MySQL 접속
.PHONY: mysql
mysql:
	@echo "🔗 MySQL 접속 중..."
	@docker exec -it ocean-mysql mysql -uocean_user -pocean_pass ocean_db

# DB 스키마 업데이트
.PHONY: update-db
update-db:
	@echo "📊 DB 스키마 업데이트 중..."
	@if [ -f docker/mysql/updates/latest.sql ]; then \
		docker exec -i ocean-mysql mysql -uocean_user -pocean_pass ocean_db < docker/mysql/updates/latest.sql; \
		echo "✅ 업데이트 완료!"; \
	else \
		echo "⚠️  업데이트 파일이 없습니다: docker/mysql/updates/latest.sql"; \
		echo "📝 파일을 생성하거나 업데이트가 필요없다면 무시하세요."; \
	fi

# 로그 보기
.PHONY: logs
logs:
	@$(DOCKER_COMPOSE) logs -f

# 특정 서비스 로그 보기
.PHONY: logs-mysql
logs-mysql:
	@$(DOCKER_COMPOSE) logs -f ocean-mysql

.PHONY: logs-jenkins
logs-jenkins:
	@$(DOCKER_COMPOSE) logs -f ocean-jenkins

.PHONY: logs-phpmyadmin
logs-phpmyadmin:
	@$(DOCKER_COMPOSE) logs -f ocean-phpmyadmin

# 기존 reset 명령어 (안전하게 변경)
.PHONY: reset
reset:
	@echo "⚠️  'make reset'은 이제 DB만 초기화합니다."
	@echo "Jenkins 데이터는 보존됩니다."
	@echo ""
	@$(MAKE) reset-db
	@echo ""
	@echo "💡 모든 데이터를 삭제하려면 'make reset-all'을 사용하세요."

# fresh는 reset-db와 동일하게 동작
.PHONY: fresh
fresh: reset-db

# MySQL 쉘 (root 권한)
.PHONY: mysql-root
mysql-root:
	@echo "🔗 MySQL root로 접속 중..."
	@docker exec -it ocean-mysql mysql -uroot -proot1234 ocean_db

# 컨테이너 재시작
.PHONY: restart-mysql
restart-mysql:
	@echo "🔄 MySQL 재시작 중..."
	@$(DOCKER_COMPOSE) restart ocean-mysql

.PHONY: restart-jenkins
restart-jenkins:
	@echo "🔄 Jenkins 재시작 중..."
	@$(DOCKER_COMPOSE) restart ocean-jenkins

# 볼륨 확인
.PHONY: volumes
volumes:
	@echo "📦 Docker 볼륨 목록:"
	@docker volume ls | grep -E "(ocean|jenkins)"

# 네트워크 확인
.PHONY: network
network:
	@echo "🌐 Docker 네트워크 정보:"
	@docker network ls | grep ocean
	@echo ""
	@echo "네트워크 상세:"
	@docker network inspect docker_ocean-network || true