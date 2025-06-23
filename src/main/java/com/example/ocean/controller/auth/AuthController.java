package com.example.ocean.controller.auth;

import com.example.ocean.dto.request.TokenRefreshRequest;
import com.example.ocean.dto.response.MessageResponse;
import com.example.ocean.dto.response.TokenResponse;
import com.example.ocean.dto.response.UserInfoResponse;
import com.example.ocean.entity.User;
import com.example.ocean.exception.ResourceNotFoundException;
import com.example.ocean.repository.UserRepository;
import com.example.ocean.security.oauth.UserPrincipal;
import com.example.ocean.service.TokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final TokenService tokenService;
    private final UserRepository userRepository;

    @Value("${app.jwt.refresh-expiration}")
    private int refreshTokenValidityInMs;

    // OAuth2 로그인 엔드포인트 (프론트엔드에서 호출)
    @GetMapping("/oauth2/{provider}")
    public void redirectToAuth2Provider(@PathVariable String provider) {
        // SecurityConfig에서 설정한 경로(/oauth2/authorize/{provider})로 자동 리다이렉트
        // 시큐리티가 처리하므로 메서드 내용 구현 안 해도 됨
    }

    // 로그인 성공 후 사용자 정보 조회 - JWT 인증 기반
    @GetMapping("/me")
    public UserInfoResponse getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        // userPrincipal에서 사용자 정보 가져오기 (userId 사용)
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없음"));

        return UserInfoResponse.builder()
                .userId(user.getUserId())  // userCode → userId
                .userName(user.getUserName())
                .userProfileImg(user.getUserImg())  // getUserProfileImg → getUserImg
                .provider(user.getProvider().name())
                .build();
    }

    /**
     * 쿠키에서 리프레시 토큰을 읽어 새 액세스 토큰을 발급
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request) {
        try {
            // 쿠키에서 리프레시 토큰 읽기
            String refreshToken = null;
            Cookie[] cookies = request.getCookies();

            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("refreshToken".equals(cookie.getName())) {
                        refreshToken = cookie.getValue();
                        break;
                    }
                }
            }

            if (refreshToken == null || refreshToken.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("리프레시 토큰이 없습니다."));
            }

            // 토큰 갱신
            TokenResponse tokenResponse = tokenService.refreshTokens(refreshToken);

            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            log.error("토큰 갱신 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("토큰 갱신 실패: " + e.getMessage()));
        }
    }

    /**
     * 리프레시 토큰을 HttpOnly 쿠키로 설정
     */
    @PostMapping("/refresh-token-cookie")
    public ResponseEntity<?> setRefreshTokenCookie(
            @RequestBody Map<String, String> request,
            HttpServletResponse response) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken == null || refreshToken.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("리프레시 토큰이 필요합니다."));
            }

            // 개발/프로덕션 환경에 따라 쿠키 설정
            boolean isProduction = !request.getOrDefault("environment", "development").equals("development");

            Cookie cookie = new Cookie("refreshToken", refreshToken);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(refreshTokenValidityInMs / 1000);

            if (isProduction) {
                cookie.setSecure(true);
            }

            response.addCookie(cookie);

            return ResponseEntity.ok(new MessageResponse("리프레시 토큰 쿠키가 설정되었습니다."));
        } catch (Exception e) {
            log.error("리프레시 토큰 쿠키 설정 중 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("쿠키 설정 실패: " + e.getMessage()));
        }
    }

    /**
     * 로그아웃 - JWT 무효화
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            HttpServletRequest request,
            HttpServletResponse response) {
        try {
            // 토큰 무효화
            tokenService.logout(userPrincipal.getId());

            // 리프레시 토큰 쿠키 삭제
            Cookie cookie = new Cookie("refreshToken", null);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(0);
            response.addCookie(cookie);

            return ResponseEntity.ok(new MessageResponse("로그아웃 되었습니다."));
        } catch (Exception e) {
            log.error("로그아웃 중 오류", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("로그아웃 실패: " + e.getMessage()));
        }
    }
}
