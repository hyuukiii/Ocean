package com.example.ocean.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder

//프론트엔드에게 응답할 떄 전달하는 데이터
public class UserInfoResponse {
    private String userId;
    private String userName;
    private String userProfileImg;
    private String provider;
}
