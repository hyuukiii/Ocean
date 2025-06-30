package com.example.ocean.service;

import com.example.ocean.dto.response.TokenResponse;
import com.example.ocean.entity.User;
import com.example.ocean.entity.UserTokens;
import com.example.ocean.exception.ResourceNotFoundException;
import com.example.ocean.repository.UserRepository;
import com.example.ocean.repository.UserTokensRepository;
import com.example.ocean.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenService {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final UserTokensRepository userTokensRepository;

    @Value("${app.jwt.expiration}")
    private int jwtExpirationInMs;

    @Transactional
    public TokenResponse createTokens(String userId) {
        log.info("=== TokenService.createTokens 시작 ===");
        log.info("요청된 userId: {}", userId);

        // 모든 사용자 조회 (디버깅용)
        List<User> allUsers = userRepository.findAll();
        log.info("DB에 있는 모든 사용자:");
        for (User u : allUsers) {
            log.info("- userId: {}, userName: {}, provider: {}",
                    u.getUserId(), u.getUserName(), u.getProvider());
        }

        // userId로 사용자 찾기
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("사용자를 찾을 수 없습니다. userId: {}", userId);
                    return new ResourceNotFoundException("사용자를 찾을 수 없습니다. userId: " + userId);
                });

        log.info("사용자 찾기 성공: {}", user.getUserName());

        String accessToken = jwtTokenProvider.createToken(userId);
        String refreshToken = jwtTokenProvider.createRefreshToken();

        // 토큰 만료 시간 계산
        Date expiryDate = jwtTokenProvider.getExpirationDateFromToken(refreshToken);
        LocalDateTime tokenExpiresAt = expiryDate.toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();

        // 기존 토큰 삭제 (있다면)
        userTokensRepository.deleteByUserId(userId);

        // 새 토큰 저장
        UserTokens userTokens = UserTokens.builder()
                .user(user)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenExpiresTime(tokenExpiresAt)
                .build();

        userTokensRepository.save(userTokens);

        log.info("토큰 생성 완료 - accessToken 길이: {}", accessToken.length());

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn((long) (jwtExpirationInMs / 1000))
                .build();
    }

    @Transactional
    public TokenResponse refreshTokens(String refreshToken) {
        // 리프레시 토큰 유효성 검사
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 리프레시 토큰입니다.");
        }

        // 리프레시 토큰으로 사용자 찾기
        UserTokens userTokens = userTokensRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new ResourceNotFoundException("해당 리프레시 토큰을 가진 사용자가 없습니다."));

        User user = userTokens.getUser();

        // 이전 토큰 삭제
        userTokensRepository.delete(userTokens);

        // 새 토큰 생성
        return createTokens(user.getUserId());
    }

    // 로그아웃 시 토큰 무효화
    @Transactional
    public void logout(String userId) {
        // 해당 사용자의 모든 토큰 삭제
        userTokensRepository.deleteByUserId(userId);
        log.info("사용자 {} 의 모든 토큰이 삭제되었습니다.", userId);
    }

    // 만료된 토큰을 스케줄링으로 정리
    @Scheduled(cron = "0 0 0 * * ?") // 매일 자정에 실행
    public void cleanupExpiredTokens() {
        LocalDateTime now = LocalDateTime.now();
        List<UserTokens> expiredTokens = userTokensRepository.findByTokenExpiresTimeBefore(now);

        if (!expiredTokens.isEmpty()) {
            userTokensRepository.deleteAll(expiredTokens);
            log.info("만료된 토큰 {}개가 정리되었습니다.", expiredTokens.size());
        }
    }
}