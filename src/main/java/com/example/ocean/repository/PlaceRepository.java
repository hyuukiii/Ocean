package com.example.ocean.repository;

import com.example.ocean.domain.Place;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PlaceRepository {

    int insertPlace(Place place);

    List<Place> findAll();

    List<Place> findByWorkspaceCd(@Param("workspaceCd") String workspaceCd);

}