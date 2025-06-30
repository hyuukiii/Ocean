# 빌드 스테이지
FROM --platform=linux/amd64 eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app

# Gradle wrapper 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# 소스 코드 복사
COPY src src

# 실행 권한 부여
RUN chmod +x ./gradlew

# 애플리케이션 빌드
RUN ./gradlew bootJar

# 실행 스테이지
FROM --platform=linux/amd64 eclipse-temurin:17-jre-alpine
WORKDIR /app

# 필요한 패키지 설치
RUN apk add --no-cache curl

# 빌드된 JAR 파일 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 사용자 생성 (보안)
RUN addgroup -g 1000 ocean && \
    adduser -D -u 1000 -G ocean ocean && \
    chown -R ocean:ocean /app

USER ocean

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# 포트 노출
EXPOSE 8080

# 실행
ENTRYPOINT ["java", "-jar", "/app/app.jar"]