package com.example.ocean.mapper;

import com.example.ocean.domain.Place;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface PlaceMapper {
    List<Place> findByWorkspaceCd(@Param("workspaceCd") String workspaceCd);
}
