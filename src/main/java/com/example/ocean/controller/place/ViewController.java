package com.example.ocean.controller.place;

import com.example.ocean.domain.Place;
import com.example.ocean.service.PlaceService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.stream.Collectors;


@Controller //뷰 반환 컨트롤러
public class ViewController {

    private final PlaceService service;
    private final ObjectMapper objectMapper;

    public ViewController(PlaceService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/meeting-place")
    public String showMeetingPlacePage() {
        // Spring Boot의 view resolver가
        // "resources/templates/" 폴더 아래의
        // "place/meeting-place.html" 파일을 찾아서 반환합니다.
        return "place/meeting-place";
    }
}