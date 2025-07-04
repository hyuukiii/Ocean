package com.example.ocean.controller.place;

import com.example.ocean.dto.response.PlaceInfoResponse;
import com.example.ocean.service.PlaceService;
import com.example.ocean.service.WorkspaceService;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.stream.Collectors;
import java.util.List;

@Slf4j
@Controller
public class ViewController {

    private final PlaceService placeService;
    private final WorkspaceService workspaceService;
    private final ObjectMapper objectMapper;

    public ViewController(PlaceService placeService, WorkspaceService workspaceService, ObjectMapper objectMapper) {
        this.placeService = placeService;
        this.workspaceService = workspaceService;
        this.objectMapper = objectMapper;
    }


    @GetMapping("/workspaces/{workspaceCd}/meeting-place")
    public String getWorkspacePlacesPage(
            @PathVariable String workspaceCd,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            Model model) {

        // 1. 서비스에서 DTO 목록을 가져옵니다.
        List<PlaceInfoResponse> places = placeService.findPlaceInfoByWorkspace(workspaceCd);

        // 2. DTO 목록을 JSON 문자열 목록으로 직접 변환합니다.
        List<String> placesJson = places.stream()
                .map(place -> {
                    try {
                        // 주입된 objectMapper를 사용해 각 객체를 JSON 문자열로 만듭니다.
                        return objectMapper.writeValueAsString(place);
                    } catch (JsonProcessingException e) {
                        log.error("PlaceInfoResponse JSON 변환 오류", e);
                        return "{}"; // 오류 발생 시 빈 JSON 객체 반환
                    }
                })
                .collect(Collectors.toList());

        // 3. Model에 원본 DTO 목록과 JSON 문자열 목록을 모두 담습니다.
        model.addAttribute("places", places);
        model.addAttribute("placesJson", placesJson); // 새로 만든 JSON 리스트를 추가
        model.addAttribute("workspaceCd", workspaceCd);
        if (userPrincipal != null) {
            model.addAttribute("userId", userPrincipal.getId());
        }

        return "place/meeting-place";
    }
}