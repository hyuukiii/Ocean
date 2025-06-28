package com.example.ocean.dto.request;

import lombok.Getter;
import lombok.Setter;

/**
 * 사용자 프로필 업데이트 요청 DTO
 */
@Getter
@Setter
public class UserProfileUpdateRequest {
    private String nickName; // 닉네임
    private String phoneNumber; // 전화번호
    private String email;
    private String department; // 부서
    private String position; // 직급
}
