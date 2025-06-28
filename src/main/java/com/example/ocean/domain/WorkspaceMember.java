package com.example.ocean.domain;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class WorkspaceMember {
    private String workspaceCd;
    private String userId;
    private String userRole;
    private String userNickname;
    private String statusMsg;
    private String deptCd;
    private String deptNm;
    private String position;
    private String email;
    private String phoneNum;
    private String userImg;
    private String userState;
    private LocalDateTime joinedDate;
}