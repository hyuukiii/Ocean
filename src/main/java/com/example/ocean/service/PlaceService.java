package com.example.ocean.service;

import com.example.ocean.domain.Place;
import com.example.ocean.dto.response.PlaceInfoResponse;
import com.example.ocean.repository.PlaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlaceService {

    private final PlaceRepository repository;

    public PlaceService(PlaceRepository repository){
        this.repository = repository;
    }

    public int insertPlace(Place place){
        return repository.insertPlace(place);
    }

    public List<Place> findAll(){
        return repository.findAll();
    }

    // ⭐ PlaceMapper 대신 PlaceRepository 사용
    public List<Place> findByWorkspaceCd(String workspaceCd) {
        return repository.findByWorkspaceCd(workspaceCd);
    }

    @Transactional(readOnly = true)
    public List<PlaceInfoResponse> findPlaceInfoByWorkspace(String workspaceCd) {
        // Repository에 새로 추가한 DTO 반환 메서드를 호출.
        return repository.findPlaceInfoByWorkspaceCd(workspaceCd);
    }



}