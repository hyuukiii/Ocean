package com.example.ocean.repository;

import com.example.ocean.entity.Place;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface PlaceRepository {

    int insertPlace(Place place);

    List<Place> findAll();
}