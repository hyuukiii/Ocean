package com.example.ocean.dto.response;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.time.LocalDateTime;

@Data
@Getter
@Builder
public class PlaceInfoResponse {
    // PLACE 테이블 정보
    private String placeNm;
    private String address;
    private String placeId;
    private Double lat;
    private Double lng;

    // EVENTS 테이블 정보
    private String title;
    private String description;
    private LocalDateTime startDatetime;
    private LocalDateTime endDatetime;

    // WORKSPACE_MEMBERS 테이블 정보
    private String createdBy; // 작성자 닉네임
    private String userImg; // 작성자 프로필 이미지

}