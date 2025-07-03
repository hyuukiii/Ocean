package com.example.ocean.service;

import com.example.ocean.domain.Place;
import com.example.ocean.mapper.PlaceMapper;
import com.example.ocean.repository.PlaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlaceService {

    private final PlaceRepository repository;
    private PlaceMapper placeMapper;

    public PlaceService(PlaceRepository repository){
        this.repository = repository;
    }

    public int insertPlace(Place place){
        return repository.insertPlace(place);
    }

    public List<Place> findAll(){
        return repository.findAll();
    }

    public List<Place> findByWorkspaceCd(String workspaceCd) {
        return placeMapper.findByWorkspaceCd(workspaceCd);
    }

}