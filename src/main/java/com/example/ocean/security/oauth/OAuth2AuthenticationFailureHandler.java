package com.example.ocean.security.oauth;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
// TODO : 로그인 실패 시 처리하는 핸들러
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {
    
    // app.frontend.url 값이 없으면 http://localhost:8080 로 설정
    @Value("${app.frontend.url:https://ocean-app.click}")
    private String frontendUrl;
    
    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        log.error("OAuth2 인증 실패: {}", exception.getMessage(), exception);
        log.info("클라이언트 IP: {}", request.getRemoteAddr());
        log.info("User-Agent: {}", request.getHeader("User-Agent"));
        
        // 세션 정보 로깅
        HttpSession session = request.getSession(false);
        if (session != null) {
            log.info("세션 ID: {}", session.getId());
            log.info("세션 생성 시간: {}", session.getCreationTime());
            log.info("세션 신규 여부: {}", session.isNew());
        } else {
            log.warn("세션이 존재하지 않음");
            // 세션 생성
            session = request.getSession(true);
            log.info("새 세션 생성됨: {}", session.getId());
        }
        
        // 세션 쿠키 설정
        addSessionCookie(request, response, session);

        // 오류 정보 추출
        String errorCode = "unknown_error";
        String errorMessage = exception.getMessage();

        if (exception instanceof OAuth2AuthenticationException) {
            OAuth2AuthenticationException oauth2Exception = (OAuth2AuthenticationException) exception;
            OAuth2Error oauth2Error = oauth2Exception.getError();
            errorCode = oauth2Error.getErrorCode();
            errorMessage = oauth2Error.getDescription() != null ?
                    oauth2Error.getDescription() : oauth2Error.getErrorCode();
            
            log.error("OAuth2 에러 코드: {}", errorCode);
            log.error("OAuth2 에러 메시지: {}", errorMessage);
        }

        // URL 인코딩 처리 (공백 제거)
        String encodedMessage = URLEncoder.encode(errorMessage.trim(), StandardCharsets.UTF_8);

        // 리다이렉트 URL 생성
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/oauth2/redirect")
                .queryParam("error", errorCode)
                .queryParam("message", encodedMessage)
                .build()
                .encode()  // URL 인코딩
                .toUriString();

        log.debug("인증 실패 후 리다이렉트 URL: {}", targetUrl);

        // 디버그 정보를 쿠키로 설정
        Cookie debugCookie = new Cookie("oauth2_error", errorCode);
        debugCookie.setPath("/");
        debugCookie.setMaxAge(300); // 5분
        debugCookie.setHttpOnly(false);
        response.addCookie(debugCookie);

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
    
    /**
     * 세션 ID를 쿠키로 설정하는 메서드
     */
    private void addSessionCookie(HttpServletRequest request, HttpServletResponse response, HttpSession session) {
        if (session == null) {
            log.warn("세션이 null이므로 세션 쿠키를 설정할 수 없습니다.");
            return;
        }
        
        String sessionId = session.getId();
        
        // 기존 JSESSIONID 쿠키 확인
        Cookie[] cookies = request.getCookies();
        boolean hasSessionCookie = false;
        
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("JSESSIONID".equals(cookie.getName())) {
                    hasSessionCookie = true;
                    log.debug("기존 JSESSIONID 쿠키 발견: {}", cookie.getValue());
                    break;
                }
            }
        }
        
        // 세션 쿠키 설정
        Cookie sessionCookie = new Cookie("JSESSIONID", sessionId);
        sessionCookie.setPath("/");
        sessionCookie.setHttpOnly(true);
        sessionCookie.setMaxAge(3600); // 1시간
        
        // 프로덕션 환경에서는 secure=true로 설정
        String serverName = request.getServerName();
        if (serverName != null && !serverName.contains("localhost") && !serverName.contains("127.0.0.1")) {
            sessionCookie.setSecure(true);
            // SameSite=None 설정 (크로스 도메인 쿠키 허용)
            response.setHeader("Set-Cookie", String.format("%s=%s; Path=%s; Max-Age=%d; HttpOnly=true; Secure=true; SameSite=None", 
                sessionCookie.getName(), 
                sessionCookie.getValue(), 
                sessionCookie.getPath(),
                sessionCookie.getMaxAge()));
        } else {
            response.addCookie(sessionCookie);
        }
        
        log.info("세션 쿠키 설정 완료 - 세션 ID: {}, 기존 쿠키 있음: {}", sessionId, hasSessionCookie);
    }
}