package com.example.ocean.service;

import com.example.ocean.domain.MentionNotification;
import com.example.ocean.mapper.MentionNotificationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MentionService {
    private final MentionNotificationMapper mentionNotificationMapper;

    public List<MentionNotification> selectUserNoti(String userId) {
        return mentionNotificationMapper.selectUserNoti(userId);
    }

    public void updateAllUserNoti(String userId) {
        mentionNotificationMapper.updateAllNoti(userId);
    }

    public void updateUserNoti(String notiCd) {
        mentionNotificationMapper.updateNoti(notiCd);
    }
}
