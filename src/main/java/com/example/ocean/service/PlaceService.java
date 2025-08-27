package com.example.ocean.service;

import com.example.ocean.domain.Event;
import com.example.ocean.domain.Place;
import com.example.ocean.dto.response.PlaceInfoResponse;
import com.example.ocean.mapper.PlaceMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class PlaceService {

    private final PlaceMapper repository;

    public PlaceService(PlaceMapper repository){
        this.repository = repository;
    }

    public int insertPlace(Place place){
        return repository.insertPlace(place);
    }

    public List<Place> findAll(){
        return repository.findAll();
    }

    public List<Place> findByWorkspaceCd(String workspaceCd) {
        return repository.findByWorkspaceCd(workspaceCd);
    }

    @Transactional(readOnly = true)
    public List<PlaceInfoResponse> findPlaceInfoByWorkspace(String workspaceCd, String userId) {
        return repository.findPlaceInfoByWorkspaceCd(workspaceCd, userId);
    }

    @Transactional
    public int insertPlaceAndEvent(Event event, Place place) {
        // ⭐ EVENT_CD 생성 로직을 teamCalendarService와 동일하게 수정
        String newEventCd = "evnt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12); // [수정]
        event.setEventCd(newEventCd);

        int eventInsertResult = repository.insertEvent(event);
        if (eventInsertResult == 0) {
            throw new RuntimeException("이벤트 저장 실패");
        }

        place.setEvent_cd(newEventCd); // Place 도메인의 event_cd 필드는 그대로 유지

        int placeInsertResult = repository.insertPlace(place);
        if (placeInsertResult == 0) {
            throw new RuntimeException("장소 저장 실패");
        }
        return placeInsertResult;
    }

    // ⭐ 일정 수정 메서드 추가
    @Transactional
    public int updatePlaceAndEvent(Event event, Place place) {
        // 1. 이벤트 정보 업데이트
        int eventUpdateResult = repository.updateEvent(event);
        if (eventUpdateResult == 0) {
            // 이벤트가 없거나 업데이트에 실패하면 에러
            throw new RuntimeException("이벤트 업데이트 실패: eventCd=" + event.getEventCd());
        }

        // 2. 장소 정보 업데이트 또는 삽입/삭제
        boolean placeExists = repository.checkPlaceExistsByEventCd(event.getEventCd()) > 0;
        boolean newPlaceDataExists = place.getPlace_nm() != null && !place.getPlace_nm().isBlank() && place.getLat() != null;

        if (newPlaceDataExists) {
            if (placeExists) {
                repository.updatePlace(place); // 기존 장소 업데이트
            } else {
                repository.insertPlace(place); // 새로운 장소 삽입
            }
        } else if (placeExists) {
            repository.deletePlaceByEventCd(event.getEventCd()); // 장소 정보가 없어졌으면 기존 장소 삭제
        }

        // (참가자 정보는 이 페이지에서 직접 수정하지 않으므로 제외)
        // (파일 정보도 이 페이지에서 직접 수정하지 않으므로 제외)

        return eventUpdateResult; // 이벤트 업데이트 결과를 반환 (장소는 부수적으로 처리)
    }


    @Transactional(readOnly = true)
    public Event findEventByEventCd(String eventCd) {
        return repository.findEventByEventCd(eventCd);
    }

    @Transactional
    public int deletePlaceAndEventByEventCd(String eventCd) {
        int placeDeleteResult = repository.deletePlaceByEventCd(eventCd);

        int eventDeleteResult = repository.deleteEventByEventCd(eventCd);
        if (eventDeleteResult == 0) {
            throw new RuntimeException("이벤트 삭제 실패: event_cd=" + eventCd);
        }
        return eventDeleteResult;
    }
}