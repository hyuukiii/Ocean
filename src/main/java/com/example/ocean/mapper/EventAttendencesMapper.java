package com.example.ocean.mapper;

import com.example.ocean.dto.response.AttendeesInfo;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface EventAttendencesMapper {
    int insertEventAttendences (@Param("eventCd") String eventCd, @Param("userId") String userId);
    List<String> selectAttendence(@Param("eventCd") String eventCd);
    List<AttendeesInfo> selectAttendeesInfo(@Param("eventCd") String eventCd);
    int deleteAttendeesByEventCd(@Param("eventCd") String eventCd);

    //List<> selectUserNicknameByWorkspaceCd(@Param("workspaceCd") String workspaceCd);
}
