package com.example.ocean.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Slf4j
@Controller
public class CustomErrorController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request, HttpServletResponse response, Model model) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        Object error = request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);
        Object message = request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
        Object requestUri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        
        log.error("===== ERROR CONTROLLER INVOKED =====");
        log.error("Status Code: {}", status);
        log.error("Request URI: {}", requestUri);
        log.error("Error Message: {}", message);
        log.error("User Principal: {}", request.getUserPrincipal());
        log.error("Session ID: {}", request.getSession(false) != null ? request.getSession().getId() : "No session");
        
        if (error instanceof Exception) {
            log.error("Exception Details:", (Exception) error);
        }
        
        Integer statusCode = 500;
        if (status != null) {
            statusCode = Integer.valueOf(status.toString());
        }
        
        model.addAttribute("statusCode", statusCode);
        model.addAttribute("errorMessage", message != null ? message.toString() : "Unknown error");
        model.addAttribute("requestUri", requestUri != null ? requestUri.toString() : "Unknown");
        
        if (statusCode == HttpStatus.NOT_FOUND.value()) {
            return "error/404";
        } else if (statusCode == HttpStatus.FORBIDDEN.value()) {
            return "error/403";
        } else if (statusCode == HttpStatus.UNAUTHORIZED.value()) {
            return "redirect:/login";
        }
        
        // 500 에러의 경우
        if (error instanceof Exception) {
            Exception ex = (Exception) error;
            model.addAttribute("exception", ex.getClass().getSimpleName());
            model.addAttribute("exceptionMessage", ex.getMessage());
            
            // 스택 트레이스 추가 (개발 환경에서만 표시하도록 조건 추가 가능)
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            ex.printStackTrace(pw);
            model.addAttribute("trace", sw.toString());
        }
        
        return "error/500";
    }
}