package com.example.ocean.mapper;

import com.example.ocean.domain.MentionNotification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MentionNotificationMapper {
    int insertMentionNotification(MentionNotification notification);
    List<MentionNotification> selectUserNoti(@Param("usreId") String userId);
    int updateAllNoti(@Param("usreId") String userId);
    int updateNoti(@Param("notiCd")String notiCd);
}
