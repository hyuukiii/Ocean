package com.example.ocean.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Slf4j
@Controller
public class LoginController {

    /**
     * 로그인 페이지를 보여줍니다.
     * 
     * @return 로그인 페이지 템플릿
     */
    @GetMapping("/login")
    public String loginPage() {
        log.info("로그인 페이지 접속");
        return "login";
    }
} 