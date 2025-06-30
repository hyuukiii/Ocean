package com.example.ocean.controller.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import jakarta.servlet.http.HttpServletRequest;

@Slf4j
@Controller
@RequestMapping("/oauth2")
// TODO : Spirng Secruity가 내부적으로 처리 해주기 떄문에
//  엔드포인트를'/api/'로 지정 하지 않는다.
public class OAuth2Controller {


    //OAuth2 인증 시작점
    @GetMapping("/authorize/{provider}")
    public String authorize(@PathVariable String provider, HttpServletRequest request) {
        log.info("OAuth2 인증 시작 - Provider: {}", provider);
        log.info("요청 URL: {}", request.getRequestURL());
        log.info("세션 ID: {}", request.getSession().getId());
        
        String redirectUrl = "/oauth2/authorization/" + provider;
        log.info("리다이렉트 URL: {}", redirectUrl);
        
        return "redirect:" + redirectUrl;
    }
}
