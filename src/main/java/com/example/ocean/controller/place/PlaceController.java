
package com.example.ocean.controller.place;

import com.example.ocean.domain.Place;
import com.example.ocean.repository.PlaceRepository;
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

@Slf4j
@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceService service;
    private final WorkspaceService workspaceService;
    private PlaceRepository repository;
    private final ObjectMapper objectMapper;

    // 생성자 주입 방식 사용
    public PlaceController(PlaceService service, WorkspaceService workspaceService,
                           PlaceRepository repository, ObjectMapper objectMapper) {
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

    // 워크스페이스별 장소 조회
    @GetMapping("/workspace/{workspaceCd}")
    public ResponseEntity<List<Place>> getPlacesByWorkspace(
            @PathVariable String workspaceCd,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            log.info("워크스페이스별 장소 조회 요청: workspaceCd={}, userId={}",
                    workspaceCd, userPrincipal != null ? userPrincipal.getId() : "null");

            // 인증 확인
            if (userPrincipal == null) {
                log.error("인증되지 않은 사용자");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            // 워크스페이스 멤버인지 확인
            var member = workspaceService.findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());
            if (member == null) {
                log.error("워크스페이스 멤버가 아님: userId={}, workspaceCd={}",
                        userPrincipal.getId(), workspaceCd);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(null);
            }

            List<Place> places = service.findByWorkspaceCd(workspaceCd);
            log.info("워크스페이스별 장소 조회 성공: {} 개", places.size());
            return ResponseEntity.ok(places);

        } catch (Exception e) {
            log.error("워크스페이스별 장소 조회 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // 장소 생성 (워크스페이스 정보 포함)
    @PostMapping
    public ResponseEntity<String> createPlace(@RequestBody Place place,
                                              @AuthenticationPrincipal UserPrincipal userPrincipal) {
        try {
            // 인증 확인
            if (userPrincipal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
            }

            // workspace_cd가 있는 경우 멤버십 확인
            if (place.getWorkspace_cd() != null && !place.getWorkspace_cd().isEmpty()) {
                var member = workspaceService.findMemberByWorkspaceAndUser(
                        place.getWorkspace_cd(), userPrincipal.getId());
                if (member == null) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("해당 워크스페이스의 멤버가 아닙니다.");
                }
            }

            // 생성자 정보 설정
            place.setCreated_by(userPrincipal.getId());

            int result = service.insertPlace(place);
            if (result > 0) {
                log.info("장소 저장 성공: {} (워크스페이스: {})",
                        place.getPlace_nm(), place.getWorkspace_cd());
                return ResponseEntity.status(HttpStatus.CREATED).body("장소 저장 성공");
            } else {
                log.warn("장소 저장 실패: {}", place.getPlace_nm());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 저장 실패");
            }
        } catch (Exception e) {
            log.error("장소 저장 중 오류 발생: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("장소 저장 중 오류 발생: " + e.getMessage());
        }
    }

    // 워크스페이스별 장소 생성 (별도 엔드포인트)
    @PostMapping("/workspace/{workspaceCd}")
    public ResponseEntity<String> createPlaceInWorkspace(
            @PathVariable String workspaceCd,
            @RequestBody Place place,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        try {
            log.info("워크스페이스별 장소 생성 요청: workspaceCd={}, userId={}",
                    workspaceCd, userPrincipal != null ? userPrincipal.getId() : "null");

            // 인증 확인
            if (userPrincipal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
            }

            // 워크스페이스 멤버인지 확인
            var member = workspaceService.findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());
            if (member == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("해당 워크스페이스의 멤버가 아닙니다.");
            }

            // Place 객체에 워크스페이스 코드와 생성자 설정
            place.setWorkspace_cd(workspaceCd);
            place.setCreated_by(userPrincipal.getId());

            int result = service.insertPlace(place);
            if (result > 0) {
                log.info("워크스페이스 장소 저장 성공: {} (워크스페이스: {})",
                        place.getPlace_nm(), workspaceCd);
                return ResponseEntity.status(HttpStatus.CREATED).body("장소 저장 성공");
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 저장 실패");
            }
        } catch (Exception e) {
            log.error("워크스페이스 장소 저장 중 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("장소 저장 중 오류 발생: " + e.getMessage());
        }
    }
}