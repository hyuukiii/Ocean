package com.example.ocean.controller.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Arrays;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@Slf4j
@Controller
@RequestMapping("/api/auth")
public class OAuth2CallbackController {

    /**
     * OAuth2 콜백 처리
     * Spring Security OAuth2가 자동으로 처리하지만, 로깅을 위해 추가
     */
    @GetMapping("/login/oauth2/code/{provider}")
    public String handleCallback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            HttpServletRequest request,
            HttpServletResponse response) {

        log.info("OAuth2 콜백 수신 - Provider: {}", provider);
        log.info("세션 ID: {}", request.getSession().getId());
        log.info("쿠키: {}", Arrays.toString(request.getCookies()));

        // 세션 쿠키가 없으면 생성
        if (request.getCookies() == null ||
                Arrays.stream(request.getCookies()).noneMatch(c -> "JSESSIONID".equals(c.getName()))) {

            Cookie sessionCookie = new Cookie("JSESSIONID", request.getSession().getId());
            sessionCookie.setPath("/");
            sessionCookie.setHttpOnly(true);
            sessionCookie.setSecure(true);
            sessionCookie.setDomain("ocean-app.click");
            response.addCookie(sessionCookie);

            log.info("세션 쿠키 생성: {}", sessionCookie.getValue());
        }

        // Spring Security가 처리하도록 null 반환
        return null;
    }

    @GetMapping("/oauth2-debug")
    public ResponseEntity<Map<String, Object>> getOAuth2Debug(HttpServletRequest request, HttpServletResponse response) {
        log.info("=== OAuth2 디버그 정보 요청 ===");
        Map<String, Object> debugInfo = new HashMap<>();
        
        // 요청 정보
        debugInfo.put("remoteAddr", request.getRemoteAddr());
        debugInfo.put("userAgent", request.getHeader("User-Agent"));
        debugInfo.put("requestURL", request.getRequestURL().toString());
        debugInfo.put("queryString", request.getQueryString());
        
        // 쿠키 정보
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            Map<String, String> cookieInfo = Arrays.stream(cookies)
                .collect(Collectors.toMap(
                    Cookie::getName,
                    cookie -> {
                        if (cookie.getName().contains("token") || cookie.getName().contains("Token")) {
                            return cookie.getValue().substring(0, Math.min(10, cookie.getValue().length())) + "...";
                        } else {
                            return cookie.getValue();
                        }
                    }
                ));
            debugInfo.put("cookies", cookieInfo);
        } else {
            debugInfo.put("cookies", "No cookies found");
        }
        
        // 세션 정보
        debugInfo.put("sessionId", request.getSession(false) != null ? request.getSession().getId() : "No session");
        debugInfo.put("sessionNew", request.getSession(false) != null ? request.getSession().isNew() : "No session");
        
        // 헤더 정보
        Map<String, String> headers = new HashMap<>();
        request.getHeaderNames().asIterator().forEachRemaining(headerName -> 
            headers.put(headerName, request.getHeader(headerName))
        );
        debugInfo.put("headers", headers);
        
        log.info("디버그 정보: {}", debugInfo);
        return ResponseEntity.ok(debugInfo);
    }
    
    @GetMapping("/session-check")
    public ResponseEntity<Map<String, Object>> checkSession(HttpServletRequest request) {
        Map<String, Object> sessionInfo = new HashMap<>();
        
        if (request.getSession(false) != null) {
            sessionInfo.put("sessionExists", true);
            sessionInfo.put("sessionId", request.getSession().getId());
            sessionInfo.put("sessionNew", request.getSession().isNew());
            sessionInfo.put("sessionCreationTime", request.getSession().getCreationTime());
            sessionInfo.put("sessionLastAccessedTime", request.getSession().getLastAccessedTime());
            sessionInfo.put("maxInactiveInterval", request.getSession().getMaxInactiveInterval());
        } else {
            sessionInfo.put("sessionExists", false);
        }
        
        return ResponseEntity.ok(sessionInfo);
    }
}