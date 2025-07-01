package com.example.ocean.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MeetingService {

    private final EntityManager entityManager;

    /**
     * 미팅룸 생성
     */
    @Transactional
    public void createMeetingRoom(String roomId, String roomName, String workspaceId, String hostId, String meetingType) {
        try {
            // 1. 룸 중복 체크
            if (isMeetingRoomExists(roomId)) {
                log.info("미팅룸이 이미 존재함: roomId={}", roomId);
                return;
            }

            // 2. 워크스페이스 존재 확인
            if (!isWorkspaceExists(workspaceId)) {
                log.error("워크스페이스가 존재하지 않음: workspaceId={}", workspaceId);
                throw new RuntimeException("워크스페이스를 찾을 수 없습니다: " + workspaceId);
            }

            // 3. 사용자 존재 확인
            if (!isUserExists(hostId)) {
                log.error("사용자가 존재하지 않음: userId={}", hostId);
                throw new RuntimeException("사용자를 찾을 수 없습니다: " + hostId);
            }

            // 4. 미팅룸 생성
            String insertQuery = """
                INSERT INTO MEETING_ROOMS (
                    ROOM_CD, 
                    ROOM_NM, 
                    WORKSPACE_CD, 
                    HOST_ID,
                    STATUS, 
                    RECORDING_ENABLE, 
                    ACTUAL_START_TIME,
                    DESCRIPTION
                ) VALUES (
                    :roomId, 
                    :roomName, 
                    :workspaceId, 
                    :hostId,
                    'IN_PROGRESS', 
                    'Y', 
                    NOW(),
                    :description
                )
            """;

            Query query = entityManager.createNativeQuery(insertQuery);
            query.setParameter("roomId", roomId);
            query.setParameter("roomName", roomName != null ? roomName : "회의실-" + roomId);
            query.setParameter("workspaceId", workspaceId);
            query.setParameter("hostId", hostId);
            query.setParameter("description", meetingType + " 회의");

            query.executeUpdate();

            log.info("미팅룸 생성 완료: roomId={}, workspaceId={}, hostId={}, type={}",
                    roomId, workspaceId, hostId, meetingType);

            // 5. 호스트를 참가자로 추가
            addParticipant(roomId, hostId, "HOST");

        } catch (Exception e) {
            log.error("미팅룸 생성 실패: roomId={}", roomId, e);
            throw new RuntimeException("미팅룸 생성 실패: " + e.getMessage());
        }
    }

    /**
     * 미팅 참가자 추가
     */
    @Transactional
    public void addParticipant(String roomId, String userId, String role) {
        try {
            // 이미 참가자인지 확인
            String checkQuery = """
                SELECT COUNT(*) FROM MEETING_PARTICIPANTS 
                WHERE ROOM_CD = :roomId AND USER_ID = :userId
            """;

            Query query = entityManager.createNativeQuery(checkQuery);
            query.setParameter("roomId", roomId);
            query.setParameter("userId", userId);

            Number count = (Number) query.getSingleResult();

            if (count.intValue() > 0) {
                log.info("이미 참가 중인 사용자: roomId={}, userId={}", roomId, userId);
                return;
            }

            // 참가자 추가
            String insertQuery = """
                INSERT INTO MEETING_PARTICIPANTS (
                    ROOM_CD, 
                    USER_ID, 
                    ROLE,
                    ACTIVE_STATE
                ) VALUES (
                    :roomId, 
                    :userId, 
                    :role,
                    'Y'
                )
            """;

            Query insertQueryObj = entityManager.createNativeQuery(insertQuery);
            insertQueryObj.setParameter("roomId", roomId);
            insertQueryObj.setParameter("userId", userId);
            insertQueryObj.setParameter("role", role != null ? role : "PARTICIPANT");

            insertQueryObj.executeUpdate();

            log.info("참가자 추가 완료: roomId={}, userId={}, role={}", roomId, userId, role);

        } catch (Exception e) {
            log.error("참가자 추가 실패: roomId={}, userId={}", roomId, userId, e);
            throw new RuntimeException("참가자 추가 실패: " + e.getMessage());
        }
    }

    /**
     * 미팅룸 종료
     */
    @Transactional
    public void endMeeting(String roomId) {
        try {
            String updateQuery = """
                UPDATE MEETING_ROOMS 
                SET STATUS = 'ENDED', 
                    ACTUAL_END_TIME = NOW() 
                WHERE ROOM_CD = :roomId
            """;

            Query query = entityManager.createNativeQuery(updateQuery);
            query.setParameter("roomId", roomId);

            int updated = query.executeUpdate();

            if (updated > 0) {
                log.info("미팅룸 종료: roomId={}", roomId);
            } else {
                log.warn("종료할 미팅룸을 찾을 수 없음: roomId={}", roomId);
            }

        } catch (Exception e) {
            log.error("미팅룸 종료 실패: roomId={}", roomId, e);
            throw new RuntimeException("미팅룸 종료 실패: " + e.getMessage());
        }
    }

    /**
     * 미팅룸 존재 여부 확인
     */
    private boolean isMeetingRoomExists(String roomId) {
        String query = "SELECT COUNT(*) FROM MEETING_ROOMS WHERE ROOM_CD = :roomId";
        Query queryObj = entityManager.createNativeQuery(query);
        queryObj.setParameter("roomId", roomId);
        Number count = (Number) queryObj.getSingleResult();
        return count.intValue() > 0;
    }

    /**
     * 워크스페이스 존재 여부 확인
     */
    private boolean isWorkspaceExists(String workspaceId) {
        String query = "SELECT COUNT(*) FROM WORKSPACE WHERE WORKSPACE_CD = :workspaceId";
        Query queryObj = entityManager.createNativeQuery(query);
        queryObj.setParameter("workspaceId", workspaceId);
        Number count = (Number) queryObj.getSingleResult();
        return count.intValue() > 0;
    }

    /**
     * 사용자 존재 여부 확인
     */
    private boolean isUserExists(String userId) {
        String query = "SELECT COUNT(*) FROM USERS WHERE USER_ID = :userId";
        Query queryObj = entityManager.createNativeQuery(query);
        queryObj.setParameter("userId", userId);
        Number count = (Number) queryObj.getSingleResult();
        return count.intValue() > 0;
    }

    /**
     * 미팅룸 정보 조회
     */
    public boolean isMeetingActive(String roomId) {
        String query = """
            SELECT COUNT(*) FROM MEETING_ROOMS 
            WHERE ROOM_CD = :roomId AND STATUS = 'IN_PROGRESS'
        """;
        Query queryObj = entityManager.createNativeQuery(query);
        queryObj.setParameter("roomId", roomId);
        Number count = (Number) queryObj.getSingleResult();
        return count.intValue() > 0;
    }
}
