FROM node:20-alpine

WORKDIR /app

# Python과 빌드 도구 설치 (MediaSoup 빌드용)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    linux-headers

# Python 심볼릭 링크 생성
RUN ln -sf python3 /usr/bin/python

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3001

# 실행
CMD ["node", "src/server.js"]