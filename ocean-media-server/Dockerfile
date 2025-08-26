FROM node:20-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3001

# 서버 헬스 체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('https').get('https://localhost:3001/health', {rejectUnauthorized: false}, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 실행
CMD ["node", "src/server.js"]