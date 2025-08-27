package com.example.ocean.mapper;


import com.example.ocean.domain.Place;
import com.example.ocean.dto.request.EventUpdateRequest;
import com.example.ocean.domain.Event;
import com.example.ocean.dto.response.MailInfo;
import com.example.ocean.dto.response.CalendarResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface CalendarEventMapper {
    List<CalendarResponse> selectPersonalCalendar(@Param("userId") String userId, @Param("workspaceCd") String workspaceCd);
    int insertPersonalEvent(Event event);
    Event selectPersonalEvent(@Param("eventCd")String eventCd);
    int updatePersonalEvent(EventUpdateRequest event);
    int deletePersonalEvent(@Param("eventCd")String eventCd);

    List<String> selectTodayAlarm();
    MailInfo selectMailInfo(@Param("eventCd") String eventCd);


    //
    List<Place> findAll2 ();
}
