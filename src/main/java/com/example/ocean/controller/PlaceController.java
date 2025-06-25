package com.example.ocean.controller;


import com.example.ocean.entity.Place;
import com.example.ocean.repository.PlaceRepository;
import com.example.ocean.service.PlaceService;
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

    public PlaceController(PlaceService service){
        this.service = service;
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
        List<Place> places = repository.findAll()
                .stream()
                .map(place -> new Place(
                        place.getPlace_name(),
                        place.getPlace_id(),
                        place.getAddress_name(),
                        place.getLat(),
                        place.getLng(),
                        place.getCreated_at()
                        ))
                .collect(Collectors.toList());

        model.addAttribute("places", places);
        return "places";
    }
}



