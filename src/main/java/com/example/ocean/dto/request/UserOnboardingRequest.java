package com.example.ocean.dto.request;

import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
public class UserOnboardingRequest {
    @NotBlank(message = "닉네임은 필수입니다")
    private String nickname;

    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;

    private String phoneNumber;
    private String department;
    private String position;
}
