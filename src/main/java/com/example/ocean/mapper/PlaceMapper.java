package com.example.ocean.mapper;

import com.example.ocean.domain.Event; // Event 도메인 추가
import com.example.ocean.domain.Place;
import com.example.ocean.dto.response.PlaceInfoResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PlaceMapper {

    int insertPlace(Place place);

    List<Place> findAll();

    List<Place> findByWorkspaceCd(@Param("workspaceCd") String workspaceCd);

    // ⭐ DTO 반환 메서드 수정: userId 파라미터 추가
    List<PlaceInfoResponse> findPlaceInfoByWorkspaceCd(
            @Param("workspaceCd") String workspaceCd,
            @Param("userId") String userId);

    // 이벤트 코드로 장소 정보 조회
    Place findPlaceByEventCd(@Param("eventCd") String eventCd);

    // 장소 정보 업데이트
    int updatePlace(Place place);

    // 이벤트 코드로 장소 정보가 존재하는지 확인 (0 또는 1 반환)
    int checkPlaceExistsByEventCd(@Param("eventCd") String eventCd);

    // 이벤트 코드로 장소 정보 삭제
    int deletePlaceByEventCd(@Param("eventCd") String eventCd);

    // ⭐ Event 관련 메서드 추가
    int insertEvent(Event event); // 이벤트 저장

    // ⭐ updateEvent 메서드 추가
    int updateEvent(Event event);

    Event findEventByEventCd(@Param("eventCd") String eventCd); // 이벤트 코드롤 이벤트 조회

    int deleteEventByEventCd(@Param("eventCd") String eventCd); // 이벤트 삭제

}