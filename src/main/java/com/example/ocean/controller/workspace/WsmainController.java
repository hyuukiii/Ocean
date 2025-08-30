package com.example.ocean.controller.workspace;

import com.example.ocean.security.oauth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WsmainController {

    @GetMapping("/wsmain")
    public String wsmain(@RequestParam String workspaceCd,
                         Model model,
                         @AuthenticationPrincipal UserPrincipal principal) {

        log.info("=== WSMAIN 페이지 접근: workspaceCd={}, userId={} ===",
                workspaceCd, principal != null ? principal.getId() : "null");

        if (principal == null) {
            return "redirect:/login";
        }

        model.addAttribute("workspaceCd", workspaceCd);
        model.addAttribute("userId", principal.getId());
        model.addAttribute("userName", principal.getName());

        return "workspace/wsmain";
    }
}
