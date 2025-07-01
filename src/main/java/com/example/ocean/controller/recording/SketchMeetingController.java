package com.example.ocean.controller.recording;

import com.example.ocean.service.MeetingService;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.view.RedirectView;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class SketchMeetingController {

    @Value("${media.server.url:https://localhost:3001}")
    private String mediaServerUrl;

    private final MeetingService meetingService;  // ⭐ MeetingService 주입

    /**
     * 스케치 회의 시작 (워크스페이스 파라미터 포함)
     */
    @GetMapping("/sketch")
    public RedirectView startSketchMeeting(
            @RequestParam(required = false) String workspaceCd,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // 사용자 인증 확인
            if (user == null) {
                log.warn("인증되지 않은 사용자의 스케치 회의 접근 시도");
                return new RedirectView("/login");
            }

            // 워크스페이스 CD가 없으면 기본값 사용
            if (workspaceCd == null || workspaceCd.isEmpty()) {
                workspaceCd = "sketch-default";
                log.info("워크스페이스 CD가 없어 기본값 사용: {}", workspaceCd);
            }

            // 고유한 룸 ID 생성 (스케치 회의용)
            String roomId = "sketch-" + LocalDateTime.now().toString().replace(":", "-")
                    + "-" + UUID.randomUUID().toString().substring(0, 8);

            // ⭐ DB에 미팅룸 생성
            try {
                meetingService.createMeetingRoom(
                        roomId,
                        "스케치 회의 - " + user.getName(),
                        workspaceCd,
                        user.getId(),
                        "sketch"
                );
                log.info("스케치 미팅룸 생성 성공: roomId={}", roomId);
            } catch (Exception e) {
                log.error("스케치 미팅룸 생성 실패", e);
                // 실패해도 일단 진행 (미디어 서버에서 처리)
            }

            // URL 파라미터 구성
            StringBuilder urlBuilder = new StringBuilder(mediaServerUrl);
            urlBuilder.append("/ocean-video-chat-complete.html");
            urlBuilder.append("?roomId=").append(URLEncoder.encode(roomId, StandardCharsets.UTF_8));
            urlBuilder.append("&workspaceId=").append(URLEncoder.encode(workspaceCd, StandardCharsets.UTF_8));
            urlBuilder.append("&peerId=").append(URLEncoder.encode(user.getId(), StandardCharsets.UTF_8));
            urlBuilder.append("&displayName=").append(URLEncoder.encode(user.getName(), StandardCharsets.UTF_8));
            urlBuilder.append("&meetingType=sketch");

            String redirectUrl = urlBuilder.toString();

            log.info("스케치 회의 시작 - 사용자: {}, 룸ID: {}, 워크스페이스CD: {}, 리다이렉트: {}",
                    user.getName(), roomId, workspaceCd, redirectUrl);

            // 미디어 서버로 리다이렉트
            return new RedirectView(redirectUrl);

        } catch (Exception e) {
            log.error("스케치 회의 시작 중 오류", e);
            return new RedirectView("/error");
        }
    }

    /**
     * 스케치 회의 참가 (초대 링크)
     */
    @GetMapping("/sketch/join")
    public RedirectView joinSketchMeeting(
            @RequestParam String roomId,
            @RequestParam(required = false) String workspaceCd,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // 사용자 인증 확인
            if (user == null) {
                log.warn("인증되지 않은 사용자의 스케치 회의 참가 시도");
                return new RedirectView("/login");
            }

            // ⭐ 미팅룸 활성 상태 확인
            if (!meetingService.isMeetingActive(roomId)) {
                log.warn("비활성 미팅룸 참가 시도: roomId={}", roomId);
                return new RedirectView("/error?message=meeting-not-found");
            }

            // ⭐ 참가자로 추가
            try {
                meetingService.addParticipant(roomId, user.getId(), "PARTICIPANT");
                log.info("미팅 참가자 추가: roomId={}, userId={}", roomId, user.getId());
            } catch (Exception e) {
                log.error("참가자 추가 실패", e);
                // 실패해도 일단 진행
            }

            // URL 파라미터 구성
            StringBuilder urlBuilder = new StringBuilder(mediaServerUrl);
            urlBuilder.append("/ocean-video-chat-complete.html");
            urlBuilder.append("?roomId=").append(URLEncoder.encode(roomId, StandardCharsets.UTF_8));

            if (workspaceCd != null) {
                urlBuilder.append("&workspaceId=").append(URLEncoder.encode(workspaceCd, StandardCharsets.UTF_8));
            }

            urlBuilder.append("&peerId=").append(URLEncoder.encode(user.getId(), StandardCharsets.UTF_8));
            urlBuilder.append("&displayName=").append(URLEncoder.encode(user.getName(), StandardCharsets.UTF_8));
            urlBuilder.append("&meetingType=sketch");

            String redirectUrl = urlBuilder.toString();

            log.info("스케치 회의 참가 - 사용자: {}, 룸ID: {}", user.getName(), roomId);

            return new RedirectView(redirectUrl);

        } catch (Exception e) {
            log.error("스케치 회의 참가 중 오류", e);
            return new RedirectView("/error");
        }
    }
}