package com.example.ocean.controller.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.Map;

@Slf4j
@Controller
@RequestMapping("/oauth2")
public class OAuth2RedirectController {

    @Value("${app.frontend.url:https://ocean-app.click}")
    private String frontendUrl;

    /**
     * OAuth2 인증 후 리다이렉트 페이지를 처리
     * 이 페이지는 인증 성공 후 토큰을 받아 로컬 스토리지에 저장하고
     * 메인 페이지로 리다이렉트
     *
     * @return OAuth2 리다이렉트 페이지
     */
    @GetMapping("/redirect")
    public String handleRedirect(@RequestParam Map<String, String> params,
                                 HttpServletRequest request,
                                 HttpServletResponse response,
                                 Model model) {
        try {
            log.info("=== OAuth2 리다이렉트 처리 시작 ===");
            log.info("요청 URL: {}", request.getRequestURL());
            log.info("쿼리 파라미터: {}", params);
            log.info("클라이언트 IP: {}", request.getRemoteAddr());
            log.info("User-Agent: {}", request.getHeader("User-Agent"));
            log.info("Referer: {}", request.getHeader("Referer"));

            // 세션 정보 로깅
            log.info("세션 ID: {}", request.getSession().getId());
            log.info("세션 신규 여부: {}", request.getSession().isNew());

            // 쿠키 정보 로깅
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                log.info("쿠키 정보:");
                for (Cookie cookie : cookies) {
                    String value = cookie.getName().contains("token") ? 
                        cookie.getValue().substring(0, Math.min(10, cookie.getValue().length())) + "..." : 
                        cookie.getValue();
                    log.info("  - {}: {}", cookie.getName(), value);
                }
            } else {
                log.info("쿠키 없음");
            }

            // 토큰 유무 확인
            if (params.containsKey("token")) {
                log.info("토큰 발견: 길이 = {}", params.get("token").length());
                
                // 토큰 정보를 모델에 추가하여 템플릿에서 사용
                model.addAttribute("token", params.get("token"));
                model.addAttribute("tokenLength", params.get("token").length());
                
                // 토큰을 쿠키로도 설정 (백업)
                Cookie tempTokenCookie = new Cookie("tempAccessToken", params.get("token"));
                tempTokenCookie.setPath("/");
                tempTokenCookie.setMaxAge(300); // 5분
                tempTokenCookie.setHttpOnly(false); // JavaScript에서 읽을 수 있도록
                
                // 보안 설정
                String serverName = request.getServerName();
                if (!serverName.equals("localhost") && !serverName.equals("127.0.0.1")) {
                    tempTokenCookie.setSecure(true);
                    // SameSite=None 설정 (크로스 도메인 쿠키 허용)
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
                
                log.info("임시 토큰 쿠키 설정 완료");
            } else {
                log.warn("토큰이 없습니다!");
                model.addAttribute("error", "토큰이 없습니다");
            }

            // 에러 확인
            if (params.containsKey("error")) {
                log.error("OAuth2 리다이렉트 에러: {}", params.get("error"));
                if (params.containsKey("message")) {
                    log.error("에러 메시지: {}", params.get("message"));
                }
                model.addAttribute("error", params.get("error"));
                model.addAttribute("errorMessage", params.get("message"));
            }

            // 디버그 모드 설정
            model.addAttribute("debug", true);
            model.addAttribute("requestInfo", Map.of(
                "url", request.getRequestURL().toString(),
                "ip", request.getRemoteAddr(),
                "userAgent", request.getHeader("User-Agent"),
                "sessionId", request.getSession().getId()
            ));

            // 헤더 정보 로깅
            log.debug("Accept 헤더: {}", request.getHeader("Accept"));
            log.debug("User-Agent: {}", request.getHeader("User-Agent"));

            // 응답 상태 확인
            log.info("응답 상태 설정 전 isCommitted: {}", response.isCommitted());

            return "oauth2-redirect";

        } catch (Exception e) {
            log.error("OAuth2 리다이렉트 처리 중 예외 발생", e);
            throw new RuntimeException("OAuth2 리다이렉트 처리 실패", e);
        }
    }
}