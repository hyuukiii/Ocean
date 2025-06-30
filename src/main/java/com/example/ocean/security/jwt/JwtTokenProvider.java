package com.example.ocean.security.jwt;

import org.springframework.beans.factory.annotation.Value;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Slf4j // 로깅을 위한 어노테이션
@Component // 스프링 빈으로 등록
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private int jwtExpirationInMs;

    @Value("${app.jwt.refresh-expiration}")
    private int jwtRefreshExpirationInMs;

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // email → userId로 변경
    public String createToken(String userId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationInMs);

        return Jwts.builder()
                .setSubject(userId)  // userId를 subject로 저장
                .setIssuedAt(new Date())
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }

    public String createRefreshToken() {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtRefreshExpirationInMs);

        return Jwts.builder()
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }

    public Date getExpirationDateFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getExpiration();
    }

    public String createToken(Authentication authentication) {
        String userId = authentication.getName();  // userId 사용
        return createToken(userId);
    }

    // getEmailFromToken → getUserIdFromToken으로 변경
    public String getUserIdFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    // 기존 메서드명도 지원 (하위 호환성)
    @Deprecated
    public String getEmailFromToken(String token) {
        log.warn("getEmailFromToken() is deprecated. Use getUserIdFromToken() instead.");
        return getUserIdFromToken(token);
    }

    // JwtAuthenticationFilter에서 사용하는 메서드 추가
    public String getUsernameFromToken(String token) {
        return getUserIdFromToken(token);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (SecurityException ex) {
            log.error("잘못된 JWT 서명입니다.");
        } catch (MalformedJwtException ex) {
            log.error("잘못된 JWT 토큰입니다.");
        } catch (ExpiredJwtException ex) {
            log.error("만료된 JWT 토큰입니다.");
        } catch (UnsupportedJwtException ex) {
            log.error("지원되지 않는 토큰입니다.");
        } catch (IllegalArgumentException ex) {
            log.error("JWT 토큰이 비어있습니다.");
        }
        return false;
    }
}