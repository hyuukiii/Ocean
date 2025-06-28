package com.example.ocean.dto.response;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class UserProfileResponse {
    // User 테이블 정보
    private String userId;
    private String userName;
    private String userProfileImg;
    private String provider;
    private Boolean isActive;
    private LocalDateTime createdAt;

    // WorkspaceMember 테이블 정보
    private String workspaceCd;
    private String workspaceName;
    private String nickName;
    private String email;
    private String phoneNumber;
    private String department;
    private String position;
    private String userRole;
}

