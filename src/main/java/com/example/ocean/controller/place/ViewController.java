package com.example.ocean.controller.place;

import com.example.ocean.domain.Place;
import com.example.ocean.service.PlaceService;
import com.example.ocean.service.WorkspaceService;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    // 기존 /places 엔드포인트는 유지 (하위 호환성을 위해)
    @GetMapping("/places")
    public String getPlacesPage(@RequestParam(required = false) String workspaceCd,
                                @AuthenticationPrincipal UserPrincipal userPrincipal,
                                Model model) {

        // workspaceCd가 있으면 meeting-place로 리다이렉트
        if (workspaceCd != null && !workspaceCd.isEmpty()) {
            return "redirect:/meeting-place?workspaceCd=" + workspaceCd;
        }

        // workspaceCd가 없으면 전체 장소 목록 조회 (기존 로직)
        List<Place> places = placeService.findAll();
        List<String> placesJson = places.stream()
                .map(place -> {
                    try {
                        return objectMapper.writeValueAsString(place);
                    } catch (JsonProcessingException e) {
                        log.error("Error converting Place to JSON: {}", e.getMessage());
                        return "{}";
                    }
                })
                .collect(Collectors.toList());

        model.addAttribute("places", places);
        model.addAttribute("placesJson", placesJson);

        return "place/meeting-place";
    }
}