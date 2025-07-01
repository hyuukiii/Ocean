package com.example.ocean.controller;

import com.example.ocean.service.MeetingService;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    /**
     * 미팅 참가자 추가
     */
    @PostMapping("/{roomId}/participants")
    public ResponseEntity<Void> joinMeeting(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            meetingService.addParticipant(roomId, user.getId(), "PARTICIPANT");
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("미팅 참가 실패: roomId={}, userId={}", roomId, user.getId(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 미팅 종료
     */
    @PostMapping("/{roomId}/end")
    public ResponseEntity<Void> endMeeting(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // TODO: 호스트 권한 확인
            meetingService.endMeeting(roomId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("미팅 종료 실패: roomId={}", roomId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 미팅 상태 확인
     */
    @GetMapping("/{roomId}/status")
    public ResponseEntity<MeetingStatusResponse> getMeetingStatus(@PathVariable String roomId) {
        try {
            boolean isActive = meetingService.isMeetingActive(roomId);
            return ResponseEntity.ok(new MeetingStatusResponse(roomId, isActive));
        } catch (Exception e) {
            log.error("미팅 상태 조회 실패: roomId={}", roomId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 미팅 상태 응답 DTO
     */
    record MeetingStatusResponse(String roomId, boolean isActive) {}
}
