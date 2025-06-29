package com.example.ocean.security.oauth;

import com.example.ocean.dto.response.TokenResponse;
import com.example.ocean.entity.User;
import com.example.ocean.security.jwt.JwtTokenProvider;
import com.example.ocean.service.TokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenService tokenService;

    @Value("${app.frontend.url:https://ocean-app.click}")
    private String frontendUrl;

    @Value("${app.jwt.refresh-expiration}")
    private int refreshTokenValidityInMs;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                         HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {

        log.info("=== OAuth2 인증 성공 처리 시작 ===");
        log.info("클라이언트 IP: {}", request.getRemoteAddr());
        log.info("User-Agent: {}", request.getHeader("User-Agent"));

        // Response가 이미 커밋되었는지 확인
            if (response.isCommitted()) {
            log.warn("Response가 이미 커밋되어 리다이렉트할 수 없습니다.");
                return;
            }

        try {
            // 토큰 생성 및 리다이렉트 URL 구성
            String targetUrl = determineTargetUrl(request, response, authentication);

            log.info("최종 리다이렉트 URL: {}", targetUrl);

            // 인증 속성 정리
            clearAuthenticationAttributes(request);

            // 리다이렉트 실행
            getRedirectStrategy().sendRedirect(request, response, targetUrl);

        } catch (Exception e) {
            log.error("OAuth2 인증 성공 처리 중 오류", e);
            response.sendRedirect(frontendUrl + "/login?error=authentication_failed");
        }
    }

    @Override
    protected String determineTargetUrl(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) {
        try {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            String userId = userPrincipal.getId();

            log.info("=== OAuth2 인증 성공 ===");
            log.info("UserPrincipal ID: {}", userId);

            // DB 트랜잭션 대기
            Thread.sleep(1000);

            // 토큰 생성
            TokenResponse tokenResponse = tokenService.createTokens(userId);
            log.info("토큰 생성 완료 - 액세스 토큰 길이: {}", tokenResponse.getAccessToken().length());

            // 리프레시 토큰 쿠키 설정
            addRefreshTokenCookie(response, tokenResponse.getRefreshToken());

            // 액세스 토큰도 임시 쿠키로 설정
            Cookie tempTokenCookie = new Cookie("tempAccessToken", tokenResponse.getAccessToken());
            tempTokenCookie.setPath("/");
            tempTokenCookie.setMaxAge(300); // 5분으로 연장
            tempTokenCookie.setHttpOnly(false); // JavaScript에서 읽을 수 있도록
            
            // 보안 설정
            String serverName = request.getServerName();
            if (!serverName.equals("localhost") && !serverName.equals("127.0.0.1")) {
                tempTokenCookie.setSecure(true);
                // SameSite 속성 설정 - 크로스 도메인 쿠키 허용
                response.setHeader("Set-Cookie", String.format("%s=%s; Path=%s; Max-Age=%d; HttpOnly=%s; Secure=%s; SameSite=None", 
                    tempTokenCookie.getName(), 
                    tempTokenCookie.getValue(), 
                    tempTokenCookie.getPath(), 
                    tempTokenCookie.getMaxAge(), 
                    false, 
                    true));
            } else {
                response.addCookie(tempTokenCookie);
            }
            
            log.info("임시 액세스 토큰 쿠키 설정 완료 (SameSite=None, Secure=true)");

            /*
             // 토큰을 URL 파라미터로 전달하도록 수정
            String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/oauth2-redirect.html")
                    .queryParam("token", tokenResponse.getAccessToken())
                    .build().toUriString();
            */


            String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/oauth2-redirect.html")
                    .queryParam("token", tokenResponse.getAccessToken())
                    .queryParam("userName", URLEncoder.encode(userPrincipal.getUsername(), "UTF-8"))
                    .build().toUriString();


            log.info("리다이렉트 URL: {}", redirectUrl);

            return redirectUrl;

        } catch (Exception e) {
            log.error("OAuth2 성공 핸들러 오류", e);
            return frontendUrl + "/login?error=authentication_failed";
        }
    }

    private void addRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        // SameSite=None, Secure=true 설정을 위해 헤더 직접 설정
        response.setHeader("Set-Cookie", String.format("refreshToken=%s; Path=/; Max-Age=%d; HttpOnly=true; Secure=true; SameSite=None", 
            refreshToken, 
            refreshTokenValidityInMs / 1000));
            
        log.info("리프레시 토큰 쿠키 설정 완료 (SameSite=None, Secure=true)");
        }
    }