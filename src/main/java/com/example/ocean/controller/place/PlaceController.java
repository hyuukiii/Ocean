package com.example.ocean.controller.place;


import com.example.ocean.domain.Place;
import com.example.ocean.repository.PlaceRepository;
import com.example.ocean.service.PlaceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceService service;
    private PlaceRepository repository;
    private final ObjectMapper objectMapper;

    // 생성자 주입 방식 사용
    public PlaceController(PlaceService service, PlaceRepository repository, ObjectMapper objectMapper){
        this.service = service;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<Place>> getAllPlaces() { // ResponseEntity<List<Place>> 반환
        List<Place> places = service.findAll();
        return ResponseEntity.ok(places); // 200 OK와 함께 장소 목록 반환
    }

    @PostMapping
    public ResponseEntity<String> createPlace(@RequestBody Place place) { // savePlace -> createPlace로 변경, 경로 제거
        try {
            // created_by는 서버에서 로그인된 사용자 정보로 채우는 것이 일반적입니다.
            // 여기서는 예시를 위해 DTO에서 받은 값을 사용하거나, 직접 설정할 수 있습니다.
            // place.setCreated_by("현재_로그인된_사용자_ID"); // 예시

            int result = service.insertPlace(place);
            if (result > 0) {
                System.out.println("장소 저장 성공: " + place.getPlace_name() + ", Lat: " + place.getLat() + ", Lng: " + place.getLng());
                return ResponseEntity.status(HttpStatus.CREATED).body("장소 저장 성공"); // 201 Created 반환
            } else {
                System.out.println("장소 저장 실패: " + place.getPlace_name() + ", Lat: " + place.getLat() + ", Lng: " + place.getLng());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 저장 실패"); // 500 Internal Server Error 반환
            }
        } catch (Exception e) {
            System.err.println("장소 저장 중 오류 발생: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 저장 중 오류 발생: " + e.getMessage()); // 500 Internal Server Error 반환
        }
    }

}



