package com.example.ocean.mapper;

import com.example.ocean.domain.Event;
import com.example.ocean.dto.request.EventUpdateRequest;
import com.example.ocean.dto.response.CalendarResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TeamEventMapper {
    List<CalendarResponse> selectTeamEvents(@Param("workspaceCd") String workspaceCd);
    Event selectTeamEventDetail(@Param("eventCd") String eventCd);
    int insertTeamEvent(Event event);
    int updateTeamEvent(EventUpdateRequest eventUpdateRequest);
    int deleteTeamEvent(@Param("eventCd") String eventCd, @Param("userId") String userId);
}
