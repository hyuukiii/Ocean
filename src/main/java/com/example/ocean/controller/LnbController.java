package com.example.ocean.controller;

import com.example.ocean.domain.Place;
import com.example.ocean.domain.Workspace;
import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.security.oauth.UserPrincipal;
import com.example.ocean.service.PlaceService;
import com.example.ocean.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class LnbController {

    @Autowired
    private final WorkspaceService workspaceService;

    @Autowired
    private final PlaceService placeService;

    @GetMapping("/wsmain")
    public String WsMain(@RequestParam(required = false) String workspaceCd,
                         @AuthenticationPrincipal UserPrincipal userPrincipal,
                         Model model) {

        // 인증 확인
        if (userPrincipal == null) {
            log.error("인증되지 않은 사용자 - 로그인 페이지로 리다이렉트");
            return "redirect:/login";
        }

        // workspaceCd가 없으면 워크스페이스 목록으로 리다이렉트
        if (workspaceCd == null || workspaceCd.isEmpty()) {
            log.warn("workspaceCd가 없음 - 워크스페이스 목록으로 리다이렉트");
            return "redirect:/workspace";
        }

        try {
            // 워크스페이스 정보 조회
            Workspace workspace = workspaceService.findWorkspaceByCd(workspaceCd);
            if (workspace == null) {
                log.error("워크스페이스를 찾을 수 없음: {}", workspaceCd);
                return "redirect:/workspace";
            }

            // 사용자가 해당 워크스페이스의 멤버인지 확인
            WorkspaceMember member = workspaceService
                    .findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());

            if (member == null) {
                log.error("사용자가 워크스페이스 멤버가 아님: userId={}, workspaceCd={}",
                        userPrincipal.getId(), workspaceCd);
                return "redirect:/workspace";
            }

            // 모델에 필요한 데이터 추가
            model.addAttribute("workspace", workspace);
            model.addAttribute("workspaceCd", workspaceCd);
            model.addAttribute("member", member);
            model.addAttribute("userId", userPrincipal.getId());
            model.addAttribute("userName", userPrincipal.getName());

            log.info("워크스페이스 메인 페이지 접근: workspaceCd={}, userId={}",
                    workspaceCd, userPrincipal.getId());

            return "/workspace/wsmain";

        } catch (Exception e) {
            log.error("워크스페이스 메인 페이지 로드 중 오류", e);
            return "redirect:/workspace";
        }
    }


    @GetMapping("/meeting-place")
    public String meetingPlace(@RequestParam(required = false) String workspaceCd,
                               @AuthenticationPrincipal UserPrincipal userPrincipal,
                               Model model) {

        log.info("=== meeting-place 요청 시작 ===");
        log.info("workspaceCd: {}", workspaceCd);
        log.info("userPrincipal: {}", userPrincipal != null ? userPrincipal.getId() : "null");

        // 인증 확인
        if (userPrincipal == null) {
            log.error("인증되지 않은 사용자 - 로그인 페이지로 리다이렉트");
            return "redirect:/login";
        }

        // workspaceCd가 없으면 워크스페이스 목록으로 리다이렉트
        if (workspaceCd == null || workspaceCd.isEmpty()) {
            log.warn("workspaceCd가 없음 - 워크스페이스 목록으로 리다이렉트");
            return "redirect:/workspace";
        }

        try {
            // 워크스페이스 정보 조회
            Workspace workspace = workspaceService.findWorkspaceByCd(workspaceCd);
            if (workspace == null) {
                log.error("워크스페이스를 찾을 수 없음: {}", workspaceCd);
                return "redirect:/workspace";
            }
            log.info("워크스페이스 조회 성공: {}", workspace.getWorkspaceNm());

            // 사용자가 해당 워크스페이스의 멤버인지 확인
            WorkspaceMember member = workspaceService
                    .findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());

            if (member == null) {
                log.error("사용자가 워크스페이스 멤버가 아님: userId={}, workspaceCd={}",
                        userPrincipal.getId(), workspaceCd);
                return "redirect:/workspace";
            }
            log.info("워크스페이스 멤버 확인 완료");

            // 해당 워크스페이스의 장소 목록 조회
            List<Place> places = placeService.findByWorkspaceCd(workspaceCd);
            log.info("장소 목록 조회 완료: {} 개", places.size());

            // 모델에 데이터 추가
            model.addAttribute("workspaceCd", workspaceCd);
            model.addAttribute("workspace", workspace);
            model.addAttribute("places", places);
            model.addAttribute("userId", userPrincipal.getId());

            log.info("미팅 장소 페이지로 이동: workspaceCd={}, userId={}, places count={}",
                    workspaceCd, userPrincipal.getId(), places.size());

            return "place/meeting-place";

        } catch (Exception e) {
            log.error("미팅 장소 페이지 로드 중 오류", e);
            return "redirect:/workspace";
        }
    }

}
