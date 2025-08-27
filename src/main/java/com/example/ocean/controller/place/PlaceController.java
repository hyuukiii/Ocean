package com.example.ocean.controller.place;

import com.example.ocean.domain.Event;
import com.example.ocean.domain.Place;
import com.example.ocean.dto.response.PlaceInfoResponse;
import com.example.ocean.mapper.PlaceMapper;
import com.example.ocean.service.PlaceService;
import com.example.ocean.service.WorkspaceService;
import com.example.ocean.security.oauth.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceService service;
    private final WorkspaceService workspaceService;
    private final PlaceMapper repository;
    private final ObjectMapper objectMapper;

    public PlaceController(PlaceService service, WorkspaceService workspaceService,
                           PlaceMapper repository, ObjectMapper objectMapper) {
        this.service = service;
        this.workspaceService = workspaceService;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<Place>> getAllPlaces() {
        List<Place> places = service.findAll();
        return ResponseEntity.ok(places);
    }

    @GetMapping("/workspace/{workspaceCd}")
    public ResponseEntity<List<PlaceInfoResponse>> getPlacesByWorkspace(
            @PathVariable String workspaceCd,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            log.info("워크스페이스별 장소 조회 요청: workspaceCd={}, userId={}",
                    workspaceCd, userPrincipal != null ? userPrincipal.getId() : "null");

            if (userPrincipal == null) {
                log.error("인증되지 않은 사용자");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            var member = workspaceService.findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());
            if (member == null) {
                log.error("워크스페이스 멤버가 아님: userId={}, workspaceCd={}",
                        userPrincipal.getId(), workspaceCd);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(null);
            }

            List<PlaceInfoResponse> places = service.findPlaceInfoByWorkspace(workspaceCd, userPrincipal.getId());
            log.info("워크스페이스별 장소 조회 성공: {} 개", places.size());
            return ResponseEntity.ok(places);

        } catch (Exception e) {
            log.error("워크스페이스별 장소 조회 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/workspace/{workspaceCd}/event")
    public ResponseEntity<String> createPlaceAndEventInWorkspace(
            @PathVariable String workspaceCd,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        try {
            log.info("워크스페이스 장소 및 이벤트 생성 요청: workspaceCd={}, userId={}",
                    workspaceCd, userPrincipal != null ? userPrincipal.getId() : "null");

            if (userPrincipal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
            }

            var member = workspaceService.findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());
            if (member == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("해당 워크스페이스의 멤버가 아닙니다.");
            }

            String title = (String) payload.get("title");
            String description = (String) payload.get("description");

            LocalDateTime startDatetime = null;
            LocalDateTime endDatetime = null;
            try {
                if (payload.get("startDatetime") != null) {
                    startDatetime = LocalDateTime.parse((String) payload.get("startDatetime"));
                }
                if (payload.get("endDatetime") != null) {
                    endDatetime = LocalDateTime.parse((String) payload.get("endDatetime"));
                }
            } catch (java.time.format.DateTimeParseException e) {
                log.error("날짜/시간 파싱 오류: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("날짜/시간 형식이 올바르지 않습니다.");
            }

            String placeNm = (String) payload.get("placeNm"); // [수정] place_nm -> placeNm
            String placeId = (String) payload.get("placeId"); // [수정] place_id -> placeId
            String address = (String) payload.get("address");

            Double lat = null;
            Double lng = null;
            if (payload.get("lat") instanceof Number) {
                lat = ((Number) payload.get("lat")).doubleValue();
            }
            if (payload.get("lng") instanceof Number) {
                lng = ((Number) payload.get("lng")).doubleValue();
            }

            // ⭐ 추가된 필드들 가져오기
            String color = (String) payload.get("color");
            String progressStatus = (String) payload.get("progressStatus");
            String priority = (String) payload.get("priority");


            Event event = Event.builder()
                    .workspaceCd(workspaceCd)
                    .userId(userPrincipal.getId())
                    .title(title)
                    .description(description)
                    .startDatetime(startDatetime)
                    .endDatetime(endDatetime)
                    .color(color) // ⭐ color 설정
                    .isShared("1")
                    .progressStatus(progressStatus) // ⭐ progressStatus 설정
                    .priority(priority) // ⭐ priority 설정
                    .notifyTime(0) // PlaceService에서 notifyTime이 필수이므로 기본값 설정 (필요에 따라 변경)
                    .build();

            Place place = new Place();
            place.setWorkspace_cd(workspaceCd);
            place.setPlace_nm(placeNm);
            place.setPlace_id(placeId);
            place.setAddress(address);
            place.setLat(lat);
            place.setLng(lng);

            int result = service.insertPlaceAndEvent(event, place);

            if (result > 0) {
                log.info("워크스페이스 장소 및 이벤트 저장 성공: {} (워크스페이스: {})",
                        placeNm, workspaceCd);
                return ResponseEntity.status(HttpStatus.CREATED).body("장소 및 이벤트 저장 성공");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 및 이벤트 저장 실패");
            }
        } catch (Exception e) {
            log.error("워크스페이스 장소 및 이벤트 저장 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("장소 및 이벤트 저장 중 오류 발생: " + e.getMessage());
        }
    }

    // ⭐ 일정 수정 엔드포인트 추가
    @PutMapping("/{eventCd}")
    public ResponseEntity<String> updatePlaceAndEvent(
            @PathVariable String eventCd,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            log.info("장소 및 이벤트 수정 요청: eventCd={}, userId={}",
                    eventCd, userPrincipal != null ? userPrincipal.getId() : "null");

            if (userPrincipal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
            }

            // 권한 확인: 이벤트를 생성한 사용자인지
            Event existingEvent = service.findEventByEventCd(eventCd);
            if (existingEvent == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("해당 이벤트를 찾을 수 없습니다.");
            }
            if (!existingEvent.getUserId().equals(userPrincipal.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("해당 이벤트를 수정할 권한이 없습니다.");
            }

            // Payload에서 업데이트할 Event 데이터 추출
            String title = (String) payload.get("title");
            String description = (String) payload.get("description");
            LocalDateTime startDatetime = null;
            LocalDateTime endDatetime = null;
            try {
                if (payload.get("startDatetime") != null) {
                    startDatetime = LocalDateTime.parse((String) payload.get("startDatetime"));
                }
                if (payload.get("endDatetime") != null) {
                    endDatetime = LocalDateTime.parse((String) payload.get("endDatetime"));
                }
            } catch (java.time.format.DateTimeParseException e) {
                log.error("날짜/시간 파싱 오류: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("날짜/시간 형식이 올바르지 않습니다.");
            }
            String color = (String) payload.get("color");
            String progressStatus = (String) payload.get("progressStatus");
            String priority = (String) payload.get("priority");

            // Payload에서 업데이트할 Place 데이터 추출 (선택적)
            String placeNm = (String) payload.get("placeNm");
            String placeId = (String) payload.get("placeId");
            String address = (String) payload.get("address");
            Double lat = null;
            Double lng = null;
            if (payload.get("lat") instanceof Number) {
                lat = ((Number) payload.get("lat")).doubleValue();
            }
            if (payload.get("lng") instanceof Number) {
                lng = ((Number) payload.get("lng")).doubleValue();
            }

            // Event 객체 업데이트
            Event updatedEvent = Event.builder()
                    .eventCd(eventCd)
                    .title(title)
                    .description(description)
                    .startDatetime(startDatetime)
                    .endDatetime(endDatetime)
                    .color(color)
                    .isShared("1") // 항상 '1'로 유지
                    .progressStatus(progressStatus)
                    .priority(priority)
                    .notifyTime(existingEvent.getNotifyTime()) // 알림 시간은 기존 이벤트에서 가져오거나 필요시 업데이트
                    .build();

            // Place 객체 업데이트 또는 생성
            Place updatedPlace = new Place();
            updatedPlace.setEvent_cd(eventCd); // 이벤트 코드 연결
            updatedPlace.setWorkspace_cd(existingEvent.getWorkspaceCd()); // 기존 이벤트의 워크스페이스 코드 사용
            updatedPlace.setPlace_nm(placeNm);
            updatedPlace.setPlace_id(placeId);
            updatedPlace.setAddress(address);
            updatedPlace.setLat(lat);
            updatedPlace.setLng(lng);


            int result = service.updatePlaceAndEvent(updatedEvent, updatedPlace);

            if (result > 0) {
                log.info("장소 및 이벤트 수정 성공: eventCd={}", eventCd);
                return ResponseEntity.ok("장소 및 이벤트 수정 성공");
            } else {
                log.warn("장소 및 이벤트 수정 실패: eventCd={}", eventCd);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 및 이벤트 수정 실패");
            }

        } catch (Exception e) {
            log.error("장소 및 이벤트 수정 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("장소 및 이벤트 수정 중 오류 발생: " + e.getMessage());
        }
    }

    @DeleteMapping("/{eventCd}")
    public ResponseEntity<String> deletePlaceAndEvent(
            @PathVariable String eventCd,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            log.info("장소 및 이벤트 삭제 요청: eventCd={}, userId={}",
                    eventCd, userPrincipal != null ? userPrincipal.getId() : "null");

            if (userPrincipal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
            }

            Event event = service.findEventByEventCd(eventCd);
            if (event == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("해당 이벤트를 찾을 수 없습니다.");
            }
            if (!event.getUserId().equals(userPrincipal.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("해당 이벤트를 삭제할 권한이 없습니다.");
            }

            int result = service.deletePlaceAndEventByEventCd(eventCd);
            if (result > 0) {
                log.info("장소 및 이벤트 삭제 성공: eventCd={}", eventCd);
                return ResponseEntity.ok("장소 및 이벤트 삭제 성공");
            } else {
                log.warn("장소 및 이벤트 삭제 실패: eventCd={}", eventCd);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 및 이벤트 삭제 실패");
            }
        } catch (Exception e) {
            log.error("장소 및 이벤트 삭제 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("장소 및 이벤트 삭제 중 오류 발생: " + e.getMessage());
        }
    }
}