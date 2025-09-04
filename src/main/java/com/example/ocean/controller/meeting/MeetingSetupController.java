package com.example.ocean.controller.meeting;

import com.example.ocean.dto.ActiveMeetingDto;
import com.example.ocean.dto.request.MeetingCreateRequest;
import com.example.ocean.dto.response.MeetingCreateResponse;
import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.security.oauth.UserPrincipal;
import com.example.ocean.service.MeetingService;
import com.example.ocean.service.WorkspaceService;
import com.example.ocean.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 회의 준비 페이지 컨트롤러
 *
 * @author Ocean Team
 * @since 2025.07.07
 */
@Slf4j
@Controller
@RequestMapping("/meeting")
@RequiredArgsConstructor
public class MeetingSetupController {

    private final MeetingService meetingService;
    private final WorkspaceService workspaceService;
    private final EmailService emailService;

    @Value("${media.server.url:https://localhost:3001}")
    private String mediaServerUrl;

    @Value("${app.frontend.url:http://localhost:8080}")
    private String frontendUrl;  // 클래스 상단에 추가

    /**
     * 회의 준비 페이지 표시
     *
     * @param workspaceCd 워크스페이스 코드
     * @param model       Spring MVC Model
     * @param user        인증된 사용자 정보
     * @return 회의 준비 페이지 뷰
     */
    @GetMapping("/setup")
    public String showSetupPage(
            @RequestParam String workspaceCd,
            Model model,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // 워크스페이스 검증
            if (!workspaceService.hasAccess(workspaceCd, user.getId())) {
                log.warn("워크스페이스 접근 권한 없음: userId={}, workspaceCd={}",
                        user.getId(), workspaceCd);
                return "redirect:/error?message=access-denied";
            }

            // 워크스페이스 정보 조회
            String workspaceName = workspaceService.getWorkspaceName(workspaceCd);

            // 워크스페이스 멤버 목록 조회
            List<WorkspaceMember> members = workspaceService.getActiveMembers(workspaceCd);  // ✅ 타입 변경

            // 사용자 회의 설정 조회 (있으면)
            var preferences = meetingService.getUserPreferences(user.getId());

            // 모델에 데이터 추가
            model.addAttribute("workspaceCd", workspaceCd);
            model.addAttribute("workspaceName", workspaceName);
            model.addAttribute("members", members);
            model.addAttribute("currentUserId", user.getId());
            model.addAttribute("mediaServerUrl", mediaServerUrl);

            if (preferences != null) {
                model.addAttribute("preferences", preferences);
            }

            log.info("회의 준비 페이지 접속: userId={}, workspaceCd={}",
                    user.getId(), workspaceCd);

            return "meeting/meeting-setup";

        } catch (Exception e) {
            log.error("회의 준비 페이지 로드 실패", e);
            return "redirect:/error";
        }
    }

    /**
     * 회의 생성 API
     *
     * @param request 회의 생성 요청 데이터
     * @param user    인증된 사용자 정보
     * @return 생성된 회의 정보
     */
    @PostMapping("/create")
    @ResponseBody
    public MeetingCreateResponse createMeeting(
            @RequestBody MeetingCreateRequest request,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // 워크스페이스 접근 권한 확인
            if (!workspaceService.hasAccess(request.getWorkspaceCd(), user.getId())) {
                throw new SecurityException("워크스페이스 접근 권한이 없습니다.");
            }

            // 회의 타이틀 생성
            String title = (request.getTitle() != null && !request.getTitle().isEmpty())
                    ? request.getTitle()
                    : user.getName() + "님의 회의";

            // 회의 룸 ID 생성
            String roomId = generateRoomId(request.getMeetingType());

            // 미팅룸 DB 저장
            meetingService.createMeetingRoom(
                    roomId,
                    title,
                    request.getWorkspaceCd(),
                    user.getId(),
                    request.getMeetingType()
            );

            // 워크스페이스 멤버 정보 조회 (프로필 이미지 포함)
            WorkspaceMember member = workspaceService.findMemberByWorkspaceAndUser(
                    request.getWorkspaceCd(),
                    user.getId()
            );

            // 참가 URL 생성 (프로필 이미지 포함)
            String joinUrl = buildJoinUrl(roomId, title, request.getWorkspaceCd(), user, member);

            /* 초대된 멤버들에게 이메일 발송
            if (request.getInvitedMembers() != null && !request.getInvitedMembers().isEmpty()) {
                emailService.sendMeetingInvitations(
                        request.getInvitedMembers(),
                        title,
                        joinUrl,
                        user.getName()
                );
            }
            */

            log.info("회의 생성 완료: roomId={}, title={}, creator={}",
                    roomId, title, user.getId());

            return MeetingCreateResponse.builder()
                    .success(true)
                    .roomId(roomId)
                    .joinUrl(joinUrl)
                    .displayName(member != null && member.getUserNickname() != null
                            ? member.getUserNickname()
                            : user.getName())
                    .userProfileImg(member != null ? member.getUserImg() : null)  // 프로필 이미지 추가
                    .build();

        } catch (Exception e) {
            log.error("회의 생성 실패", e);
            return MeetingCreateResponse.builder()
                    .success(false)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    /**
     * 빠른 회의 시작 (설정 페이지 건너뛰기)
     * MeetingSetupController.java의 일부
     */
    @PostMapping("/quick-start")
    @ResponseBody
    public MeetingCreateResponse quickStart(
            @RequestParam String workspaceCd,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // 워크스페이스 멤버 정보 조회 (프로필 이미지 포함)
            WorkspaceMember member = workspaceService.findMemberByWorkspaceAndUser(
                    workspaceCd,
                    user.getId()
            );

            // 기본 설정으로 회의 생성
            MeetingCreateRequest request = MeetingCreateRequest.builder()
                    .title("빠른 회의 - " + user.getName())
                    .workspaceCd(workspaceCd)
                    .meetingType("sketch")
                    .duration(60)
                    .muteOnJoin(true)
                    .build();

            // createMeeting 메서드가 이미 member 정보를 조회하므로 그대로 호출
            return createMeeting(request, user);

        } catch (Exception e) {
            log.error("빠른 회의 시작 실패", e);

            return MeetingCreateResponse.builder()
                    .success(false)
                    .errorMessage("회의를 시작할 수 없습니다.")
                    .build();
        }
    }

    /**
     * 회의 룸 ID 생성
     */
    private String generateRoomId(String meetingType) {
        String prefix = meetingType != null ? meetingType : "meeting";
        String timestamp = LocalDateTime.now().toString()
                .replace(":", "-")
                .replace(".", "-");
        String uuid = UUID.randomUUID().toString().substring(0, 8);

        return String.format("%s-%s-%s", prefix, timestamp, uuid);
    }

    /**
     * 회의 목록 페이지 표시
     */
    @GetMapping("/list")
    public String showMeetingList(
            @RequestParam String workspaceCd,
            Model model,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            // 워크스페이스 접근 권한 확인
            if (!workspaceService.hasAccess(workspaceCd, user.getId())) {
                log.warn("워크스페이스 접근 권한 없음: userId={}, workspaceCd={}",
                        user.getId(), workspaceCd);
                return "redirect:/error?message=access-denied";
            }

            // 워크스페이스 정보 조회
            String workspaceName = workspaceService.getWorkspaceName(workspaceCd);

            // 진행 중인 회의 목록 조회
            List<ActiveMeetingDto> activeMeetings = meetingService.getActiveMeetings(workspaceCd);

            // 모델에 데이터 추가
            model.addAttribute("workspaceCd", workspaceCd);
            model.addAttribute("workspaceName", workspaceName);
            model.addAttribute("activeMeetings", activeMeetings);
            model.addAttribute("currentUserId", user.getId());

            log.info("회의 목록 페이지 접속: userId={}, workspaceCd={}",
                    user.getId(), workspaceCd);

            return "meeting/list";

        } catch (Exception e) {
            log.error("회의 목록 페이지 로드 실패", e);
            return "redirect:/error";
        }
    }

    /**
     * 회의 참가 URL 생성 (프로필 이미지 포함)
     */
    private String buildJoinUrl(String roomId, String title, String workspaceCd,
                                UserPrincipal user, WorkspaceMember member) {
        try {
            String userProfileImg = "";
            if (member != null && member.getUserImg() != null && !member.getUserImg().isEmpty()) {
                String imagePath = member.getUserImg();

                log.info("=== 프로필 이미지 URL 생성 디버깅 ===");
                log.info("원본 이미지 경로: {}", imagePath);
                log.info("frontendUrl 값: {}", frontendUrl);

                if (!imagePath.startsWith("http")) {
                    // 상대 경로인 경우 Spring Boot 서버의 절대 URL로 변환
                    userProfileImg = frontendUrl + (imagePath.startsWith("/") ? imagePath : "/" + imagePath);
                    log.info("절대 경로로 변환됨: {}", userProfileImg);
                } else {
                    userProfileImg = imagePath;
                    log.info("이미 절대 경로임: {}", userProfileImg);
                }
            } else {
                log.info("멤버 또는 프로필 이미지가 없음 - member: {}, userImg: {}",
                        member != null ? "있음" : "없음",
                        member != null && member.getUserImg() != null ? member.getUserImg() : "null");
            }

            // URL 인코딩 전 최종 값 확인
            log.info("URL 인코딩 전 userProfileImg: {}", userProfileImg);

            String encodedRoomId = URLEncoder.encode(roomId, StandardCharsets.UTF_8);
            String encodedTitle = URLEncoder.encode(title != null ? title : "회의", StandardCharsets.UTF_8);
            String encodedUserId = URLEncoder.encode(user.getId(), StandardCharsets.UTF_8);
            String encodedDisplayName = URLEncoder.encode(user.getName(), StandardCharsets.UTF_8);
            String encodedProfileImg = URLEncoder.encode(userProfileImg, StandardCharsets.UTF_8);
            String encodedWorkspaceCd = URLEncoder.encode(workspaceCd, StandardCharsets.UTF_8);

            log.info("URL 인코딩 후 userProfileImg: {}", encodedProfileImg);

            String finalUrl = String.format(
                    "%s/ocean-video-chat-complete.html?roomId=%s&meetingTitle=%s&peerId=%s&displayName=%s&userProfileImg=%s&workspaceId=%s",
                    mediaServerUrl, encodedRoomId, encodedTitle, encodedUserId,
                    encodedDisplayName, encodedProfileImg, encodedWorkspaceCd
            );

            log.info("최종 생성된 URL의 userProfileImg 파라미터 확인: {}", encodedProfileImg);

            return finalUrl;

        } catch (Exception e) {
            log.error("URL 인코딩 실패", e);
            return String.format("%s/ocean-video-chat-complete.html?roomId=%s&meetingTitle=%s",
                    mediaServerUrl, roomId, title != null ? title : "회의");
        }
    }
}