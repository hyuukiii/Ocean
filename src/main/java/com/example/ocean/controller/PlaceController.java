package com.example.ocean.controller;


import com.example.ocean.entity.Place;
import com.example.ocean.repository.PlaceRepository;
import com.example.ocean.service.PlaceService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.stream.Collectors;

@Controller
public class PlaceController {

   @Autowired
    private final PlaceService service;
    @Autowired
    private PlaceRepository repository;
    @Autowired
    private final ObjectMapper objectMapper;

    public PlaceController(PlaceService service, ObjectMapper objectMapper){
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/map")
    public String map(){
        return"map";
    }

    @GetMapping("/list")
    public String list(Model model){
        List<Place> list = service.findAll();
        model.addAttribute("list", list);
        return "list";
    }

    @PostMapping("/save")
    public ResponseEntity<String> savePlace(@RequestBody Place place){
        int result = service.insertPlace(place);
        if (result >0){
            System.out.println(place.getPlace_name());
            System.out.println(place.getLat());
            System.out.println(place.getLng());
            return ResponseEntity.ok("장소 저장 성공");
        }else{
            System.out.println(place.getPlace_name());
            System.out.println(place.getLat());
            System.out.println(place.getLng());
            return ResponseEntity.status(500).body("장소 저장 실패");
        }
    }

    @GetMapping("/search")
    public String search(){
        return "search";
    }

    @GetMapping("/places")
    public String getPlaces(Model model) {
        List<Place> places = repository.findAll();
        List<String> placesJson = places.stream()
                .map(place -> {
                    try {
                        // 자바 객체를 JSON 문자열로 변환
                        return objectMapper.writeValueAsString(place);
                    } catch (JsonProcessingException e) {
                        // 예외 발생 시 빈 JSON 객체 반환 또는 로깅 처리
                        // e.printStackTrace();
                        return "{}";
                    }
                })
                .collect(Collectors.toList());

        // 5. 원본 객체 리스트와 JSON 문자열 리스트를 모두 모델에 추가합니다.
        model.addAttribute("places", places);
        model.addAttribute("placesJson", placesJson);

        return "places";
    }
}



