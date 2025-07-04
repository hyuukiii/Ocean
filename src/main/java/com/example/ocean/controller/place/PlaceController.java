package com.example.ocean.controller.place;


import com.example.ocean.domain.Place;
import com.example.ocean.repository.PlaceRepository;
import com.example.ocean.service.PlaceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
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
            // created_by는 서버에서 로그인된 사용자 정보로 채우는 것이 일반적.
            // 여기서는 예시를 위해 DTO에서 받은 값을 사용하거나, 직접 설정가능.
            // place.setCreated_by("현재_로그인된_사용자_ID"); // 예시

            int result = service.insertPlace(place);
            if (result > 0) {
                System.out.println("장소 저장 성공: " + place.getPlace_nm() + ", Lat: " + place.getLat() + ", Lng: " + place.getLng());
                return ResponseEntity.status(HttpStatus.CREATED).body("장소 저장 성공"); // 201 Created 반환
            } else {
                System.out.println("장소 저장 실패: " + place.getPlace_nm() + ", Lat: " + place.getLat() + ", Lng: " + place.getLng());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 저장 실패"); // 500 Internal Server Error 반환
            }
        } catch (Exception e) {
            System.err.println("장소 저장 중 오류 발생: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("장소 저장 중 오류 발생: " + e.getMessage()); // 500 Internal Server Error 반환
        }
    }

    // 워크스페이스 CD 별 장소조회
    @GetMapping("/workspace/{workspaceCd}")
    public ResponseEntity<List<Place>> getPlacesByWorkspace(@PathVariable String workspaceCd) {
        try {
            List<Place> places = service.findByWorkspaceCd(workspaceCd);
            return ResponseEntity.ok(places);
        } catch (Exception e) {
            System.err.println("워크스페이스별 장소 조회 중 오류: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }



//
//    @GetMapping("/map")
//    public String map(){
//        return"map";
//    }
//
//    @GetMapping("/list")
//    public String list(Model model){
//        List<Place> list = service.findAll();
//        model.addAttribute("list", list);
//        return "list";
//    }
//
//    @PostMapping("/save")
//    public ResponseEntity<String> savePlace(@RequestBody Place place){
//        int result = service.insertPlace(place);
//        if (result >0){
//            System.out.println(place.getPlace_name());
//            System.out.println(place.getLat());
//            System.out.println(place.getLng());
//            return ResponseEntity.ok("장소 저장 성공");
//        }else{
//            System.out.println(place.getPlace_name());
//            System.out.println(place.getLat());
//            System.out.println(place.getLng());
//            return ResponseEntity.status(500).body("장소 저장 실패");
//        }
//    }
//
//    @GetMapping("/search")
//    public String search(){
//        return "search";
//    }
//
//    @GetMapping("/places")
//    public String getPlaces(Model model) {
//        List<Place> places = repository.findAll();
//        List<String> placesJson = places.stream()
//                .map(place -> {
//                    try {
//                        // 자바 객체를 JSON 문자열로 변환
//                        return objectMapper.writeValueAsString(place);
//                    } catch (JsonProcessingException e) {
//                        // 예외 발생 시 빈 JSON 객체 반환 또는 로깅 처리
//                        // e.printStackTrace();
//                        return "{}";
//                    }
//                })
//                .collect(Collectors.toList());
//
//        // 5. 원본 객체 리스트와 JSON 문자열 리스트를 모두 모델에 추가합니다.
//        model.addAttribute("places", places);
//        model.addAttribute("placesJson", placesJson);
//
//        return "places";
//    }
}



