package com.example.ocean.controller.user;

import com.example.ocean.dto.response.UserProfileResponse;
import com.example.ocean.security.oauth.UserPrincipal;
import com.example.ocean.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    // 기본 사용자 정보 조회 ( 로그인한 사용자의 기본 정보)
    @GetMapping("/profile")
    public UserProfileResponse getProfile(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return userService.getUserProfile(userPrincipal.getId());
    }

    /*
     // 추가 고려: 로그아웃, 회원탈퇴 등 순수 User 관련 기능
    @PostMapping("/logout")
    public void logout() {
     // 로그아웃 처리
    }

    @DeleteMapping("/account")
    public void deleteAccount(@AuthenticationPrincipal UserPrincipal userPrincipal) {
     // 회원 탈퇴 처리
    }
     */

}