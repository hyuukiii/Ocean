package com.example.ocean.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public Object handleGlobalException(Exception e, HttpServletRequest request) {
        log.error("===== 500 ERROR DETAILS =====");
        log.error("Request URL: {}", request.getRequestURL());
        log.error("Request Method: {}", request.getMethod());
        log.error("Query String: {}", request.getQueryString());
        log.error("Remote Address: {}", request.getRemoteAddr());
        log.error("User Principal: {}", request.getUserPrincipal());
        
        // Authentication 정보 로깅
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            log.error("Authentication Name: {}", auth.getName());
            log.error("Authentication Principal: {}", auth.getPrincipal());
            log.error("Is Authenticated: {}", auth.isAuthenticated());
        } else {
            log.error("No Authentication found in SecurityContext");
        }
        
        // 헤더 정보 로깅
        log.error("Authorization Header: {}", request.getHeader("Authorization"));
        log.error("Cookie Header: {}", request.getHeader("Cookie"));
        
        // 예외 상세 정보
        log.error("Exception Type: {}", e.getClass().getName());
        log.error("Exception Message: {}", e.getMessage());
        log.error("Stack Trace: ", e);
        
        // AJAX 요청인지 확인
        String acceptHeader = request.getHeader("Accept");
        String contentType = request.getHeader("Content-Type");
        boolean isAjax = acceptHeader != null && acceptHeader.contains("application/json");
        
        if (isAjax || (contentType != null && contentType.contains("multipart/form-data"))) {
            // AJAX 요청인 경우 JSON 응답
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
            errorResponse.put("error", "Internal Server Error");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("path", request.getRequestURI());
            errorResponse.put("timestamp", System.currentTimeMillis());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        } else {
            // 일반 요청인 경우 에러 페이지로 이동
            ModelAndView mav = new ModelAndView();
            mav.setViewName("error/500");
            mav.addObject("error", e.getMessage());
            mav.addObject("url", request.getRequestURL());
            mav.setStatus(HttpStatus.INTERNAL_SERVER_ERROR);
            return mav;
        }
    }

    @ExceptionHandler(AccessDeniedException.class)
    public Object handleAccessDeniedException(AccessDeniedException e, HttpServletRequest request) {
        log.error("===== ACCESS DENIED ERROR =====");
        log.error("Request URL: {}", request.getRequestURL());
        log.error("User Principal: {}", request.getUserPrincipal());
        log.error("Error Message: {}", e.getMessage());
        
        String acceptHeader = request.getHeader("Accept");
        boolean isAjax = acceptHeader != null && acceptHeader.contains("application/json");
        
        if (isAjax) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", HttpStatus.FORBIDDEN.value());
            errorResponse.put("error", "Access Denied");
            errorResponse.put("message", "접근 권한이 없습니다.");
            errorResponse.put("path", request.getRequestURI());
            
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
        } else {
            ModelAndView mav = new ModelAndView();
            mav.setViewName("error/403");
            mav.addObject("error", "접근 권한이 없습니다.");
            mav.setStatus(HttpStatus.FORBIDDEN);
            return mav;
        }
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public Object handleNoHandlerFoundException(NoHandlerFoundException e, HttpServletRequest request) {
        log.error("===== 404 NOT FOUND ERROR =====");
        log.error("Request URL: {}", request.getRequestURL());
        log.error("Error Message: {}", e.getMessage());
        
        String acceptHeader = request.getHeader("Accept");
        boolean isAjax = acceptHeader != null && acceptHeader.contains("application/json");
        
        if (isAjax) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", HttpStatus.NOT_FOUND.value());
            errorResponse.put("error", "Not Found");
            errorResponse.put("message", "요청한 페이지를 찾을 수 없습니다.");
            errorResponse.put("path", request.getRequestURI());
            
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        } else {
            ModelAndView mav = new ModelAndView();
            mav.setViewName("error/404");
            mav.addObject("error", "요청한 페이지를 찾을 수 없습니다.");
            mav.setStatus(HttpStatus.NOT_FOUND);
            return mav;
        }
    }

    @ExceptionHandler(RuntimeException.class)
    public Object handleRuntimeException(RuntimeException e, HttpServletRequest request) {
        log.error("===== RUNTIME ERROR DETAILS =====");
        log.error("Request URL: {}", request.getRequestURL());
        log.error("Request Parameters: {}", request.getParameterMap());
        log.error("Runtime Exception: ", e);
        
        // 특별히 프로필 설정 관련 에러인지 확인
        if (request.getRequestURI().contains("set-profile")) {
            log.error("Profile setup error detected!");
            log.error("WorkspaceCd from URL: {}", request.getRequestURI());
        }
        
        return handleGlobalException(e, request);
    }
}