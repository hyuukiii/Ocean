package com.example.ocean.controller.workspace;

import com.example.ocean.domain.Workspace;
import com.example.ocean.domain.WorkspaceDept;
import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.service.WorkspaceService;
import com.example.ocean.security.oauth.UserPrincipal;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

// 페이지 렌더링 전용 컨트롤러 (HTML 응답)
@Slf4j
@Controller  // @RestController가 아닌 @Controller 사용
@RequiredArgsConstructor
public class WorkspacePageController {

    private final WorkspaceService workspaceService;

    @GetMapping("/workspace")
    public String workspaceListPage(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                    HttpServletRequest request,
                                    Authentication authentication,
                                    Model model) {

        // 임시 해결책: 쿠키에서 tempAccessToken 확인
        if (userPrincipal == null) {
            Cookie[] cookies = request.getCookies();
            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    if ("tempAccessToken".equals(cookie.getName())) {
                        // 토큰으로 사용자 정보 조회 (임시)
                        log.info("임시 토큰으로 사용자 조회 시도");
                        // TODO: JWT 토큰 파싱해서 userId 가져오기
                        break;
                    }
                }
            }
        }

        // 그래도 null이면 로그인 페이지로
        if (userPrincipal == null) {
            log.error("UserPrincipal is null - 로그인 페이지로 리다이렉트");
            return "redirect:/login";
        }

        try {
            log.info("=== Workspace 페이지 접근 ===");
            log.info("UserPrincipal ID: {}", userPrincipal.getId());
            log.info("Authentication Name: {}", userPrincipal.getName());

            String userId = userPrincipal.getId();
            log.info("사용자 ID로 워크스페이스 조회 시작: {}", userId);

            List<Workspace> workspaces = workspaceService.getWorkspacesByUserId(userId);
            log.info("조회된 워크스페이스 개수: {}", workspaces != null ? workspaces.size() : 0);


            model.addAttribute("workspaceList", workspaces != null ? workspaces : new ArrayList<>());
            //model.addAttribute("workspaceList", workspaces);

            return "workspace/workspace";

        } catch (Exception e) {
            log.error("워크스페이스 조회 중 오류", e);
            e.printStackTrace();

            // 빈 리스트로라도 페이지는 표시
            model.addAttribute("workspaceList", new ArrayList<>());
            model.addAttribute("error", "워크스페이스를 불러올 수 없습니다.");

            return "workspace/workspace";
        }
    }

    // create-workspace 페이지 보여주기
    @GetMapping("/workspace/create")
    public String createWorkspacePage(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                      Model model) {
        // 인증 확인
        if (userPrincipal == null) {
            log.error("인증되지 않은 사용자 - 로그인 페이지로 리다이렉트");
            return "redirect:/login";
        }

        log.info("워크스페이스 생성 페이지 접근 - 사용자: {}", userPrincipal.getName());

        // 필요한 경우 모델에 데이터 추가
        model.addAttribute("userId", userPrincipal.getId());
        model.addAttribute("userName", userPrincipal.getName());

        return "workspace/create-workspace";
    }

    /**
     * 워크스페이스 참가 페이지
     *
     * @param userPrincipal 인증된 사용자 정보
     * @param model 뷰에 전달할 모델
     * @return join-workspace 페이지
     */
    @GetMapping("/invitations/join")
    public String joinWorkspacePage(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                    Model model) {
        // 인증 확인
        if (userPrincipal == null) {
            log.error("인증되지 않은 사용자 - 로그인 페이지로 리다이렉트");
            return "redirect:/login";
        }

        log.info("워크스페이스 참가 페이지 접근 - 사용자: {}", userPrincipal.getName());

        // 필요한 경우 모델에 데이터 추가
        model.addAttribute("userId", userPrincipal.getId());
        model.addAttribute("userName", userPrincipal.getName());

        return "workspace/join-workspace";
    }

    @GetMapping("/oauth2-redirect.html")
    public String oauth2RedirectPage() {
        return "oauth2-redirect";  // templates/oauth2-redirect.html
    }


    /*
    @GetMapping("/login")
    public String loginPage() {
        return "login"; // templates/login.html
    }

    @GetMapping("/")
    public String indexPage() {
        return "main/index"; // templates/index.html
    }
    */

    @GetMapping("/workspace/{workspaceCd}")
    public String workspaceDetailPage(@PathVariable String workspaceCd,
                                      @AuthenticationPrincipal UserPrincipal userPrincipal,
                                      Model model) {
        if (userPrincipal == null) {
            return "redirect:/login";
        }

        WorkspaceMember member = workspaceService.findMemberByWorkspaceAndUser(workspaceCd, userPrincipal.getId());
        if (member.getUserNickname() == null || member.getUserNickname().isBlank()) {
            return "redirect:/workspace/set-profile?workspaceCd=" + workspaceCd;
        }

        Workspace workspace = workspaceService.findWorkspaceByCd(workspaceCd);
        if (workspace == null) {
            model.addAttribute("error", "해당 워크스페이스를 찾을 수 없습니다.");
            return "workspace/error";
        }

        List<WorkspaceMember> members = workspaceService.getWorkspaceMembers(workspaceCd);

        LocalDate endDate = LocalDate.ofInstant(workspace.getEndDate().toInstant(), ZoneId.systemDefault());
        LocalDate createdDate = LocalDate.ofInstant(workspace.getCreatedDate().toInstant(), ZoneId.systemDefault());

        long dday = ChronoUnit.DAYS.between(LocalDate.now(), endDate);
        dday = Math.max(dday, 0);

        long totalDays = ChronoUnit.DAYS.between(createdDate, endDate);
        long passedDays = ChronoUnit.DAYS.between(createdDate, LocalDate.now());
        int progressPercent = totalDays > 0 ? (int) ((double) passedDays / totalDays * 100) : 100;

        model.addAttribute("workspace", workspace);
        model.addAttribute("members", members);
        model.addAttribute("dday", dday);
        model.addAttribute("progressPercent", progressPercent);

        return "workspace/workspace-detail";
    }

    @GetMapping("/workspace/set-profile")
    public String setProfilePage(@RequestParam("workspaceCd") String workspaceCd,
                                 Model model) {
        List<WorkspaceDept> departments = workspaceService.getDepartments(workspaceCd);
        model.addAttribute("workspaceCd", workspaceCd);
        model.addAttribute("departments", departments);
        return "workspace/set-profile";
    }

}
