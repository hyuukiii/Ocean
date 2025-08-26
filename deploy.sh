#!/bin/bash


# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Ocean 프로젝트 배포 시작${NC}"

# 1. 코드 업데이트
echo -e "${YELLOW}📥 최신 코드 가져오기...${NC}"
git pull origin main

# 2. 환경 변수 확인
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 파일이 없습니다!${NC}"
    echo "샘플 .env 파일 생성..."
    cat > .env << EOF
DB_ROOT_PASSWORD=your_root_password
DB_PASSWORD=your_db_password
AWS_ACCESS_KEY=your_aws_key
AWS_SECRET_KEY=your_aws_secret
EOF
    echo -e "${YELLOW}⚠️  .env 파일을 수정해주세요!${NC}"
    exit 1
fi

# 3. Docker 이미지 빌드
echo -e "${YELLOW}🔨 Docker 이미지 빌드...${NC}"
docker-compose -f docker-compose.production.yml build

# 4. 기존 컨테이너 중지
echo -e "${YELLOW}⏹️  기존 서비스 중지...${NC}"
docker-compose -f docker-compose.production.yml down

# 5. 새 컨테이너 시작
echo -e "${YELLOW}▶️  새 서비스 시작...${NC}"
docker-compose -f docker-compose.production.yml up -d

# 6. 헬스체크
echo -e "${YELLOW}🏥 헬스체크 수행 중...${NC}"
sleep 30

if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Spring Boot 서버 정상${NC}"
else
    echo -e "${RED}❌ Spring Boot 서버 응답 없음${NC}"
fi

if curl -k -f https://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Media 서버 정상${NC}"
else
    echo -e "${RED}❌ Media 서버 응답 없음${NC}"
fi

# 7. 로그 확인
echo -e "${YELLOW}📋 최근 로그:${NC}"
docker-compose -f docker-compose.production.yml logs --tail=20

echo -e "${GREEN}🎉 배포 완료!${NC}"