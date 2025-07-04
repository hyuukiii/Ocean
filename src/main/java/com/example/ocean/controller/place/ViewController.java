package com.example.ocean.controller.place;

import com.example.ocean.domain.Place;
import com.example.ocean.service.PlaceService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.stream.Collectors;


@Controller //뷰 반환 컨트롤러
public class ViewController {

    private final PlaceService service;
    private final ObjectMapper objectMapper;

    public ViewController(PlaceService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/places") // "/places" 경로로 GET 요청 처리 메소드
    public String getPlacesPage(Model model) {
        List<Place> places = service.findAll();
        List<String> placesJson = places.stream()
                .map(place -> {
                    try {
                        return objectMapper.writeValueAsString(place);
                    } catch (JsonProcessingException e) {
                        System.err.println("Error converting Place to JSON: " + e.getMessage());
                        return "{}"; // JSON 변환 실패 시 빈 객체 반환
                    }
                })
                .collect(Collectors.toList());

        model.addAttribute("places", places);
        model.addAttribute("placesJson", placesJson);

        return "meeting-place";
    }
}