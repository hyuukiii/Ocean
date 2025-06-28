package com.example.ocean.controller.workspace;

import com.example.ocean.domain.Workspace;
import com.example.ocean.service.WorkspaceService;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

// 페이지 렌더링 전용 컨트롤러 (HTML 응답)

@Controller  // @RestController가 아닌 @Controller 사용
@RequiredArgsConstructor
public class WorkspacePageController {

    private final WorkspaceService workspaceService;

    @GetMapping("/workspace")  // 페이지 URL
    public String workspaceListPage(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                    Model model) {
        String userId = userPrincipal.getId();

        // 사용자의 워크스페이스 목록 조회
        List<Workspace> workspaces = workspaceService.getWorkspacesByUserId(userId);

        model.addAttribute("workspaceList", workspaces);
        return "workspace/workspace"; // templates/workspace/workspace.html
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
}
