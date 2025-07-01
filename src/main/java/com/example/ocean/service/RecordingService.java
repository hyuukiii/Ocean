package com.example.ocean.service;

import com.example.ocean.entity.RecordingFile;
import com.example.ocean.repository.RecordingFileRepository;
import com.example.ocean.dto.RecordingDto;
import com.example.ocean.dto.request.RecordingStartRequest;
import com.example.ocean.dto.request.RecordingStopRequest;
import com.example.ocean.dto.request.RecordingFailRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.Duration;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecordingService {

    private final RecordingFileRepository recordingFileRepository;
    private final EntityManager entityManager;  // ⭐ EntityManager 추가

    @Value("${recording.storage.path:/var/ocean/recordings}")
    private String recordingStoragePath;

    /**
     * 녹화 시작
     */
    @Transactional
    public RecordingDto startRecording(RecordingStartRequest request) {
        try {
            // ⭐ 룸 존재 여부만 확인 (생성하지 않음)
            if (!isMeetingRoomExists(request.getRoomId())) {
                log.error("미팅룸이 존재하지 않음: roomId={}", request.getRoomId());
                throw new RuntimeException("미팅룸을 찾을 수 없습니다. 먼저 미팅을 시작해주세요.");
            }

            // 녹화 ID 생성
            String recordingId = generateRecordingId();

            // 파일 경로 생성
            String fileName = String.format("%s_%s.webm",
                    request.getRoomId(),
                    LocalDateTime.now().toString().replace(":", "-")
            );

            Path filePath = Paths.get(recordingStoragePath,
                    request.getWorkspaceId(),
                    request.getRoomId(),
                    fileName
            );

            // 녹화 정보 저장
            RecordingFile recording = RecordingFile.builder()
                    .recordingId(recordingId)
                    .roomCd(request.getRoomId())
                    .workspaceCd(request.getWorkspaceId())
                    .recorderId(request.getRecorderId())
                    .fileName(fileName)
                    .filePath(filePath.toString())
                    .recordingStatus("RECORDING")
                    .build();

            RecordingFile saved = recordingFileRepository.save(recording);

            log.info("녹화 시작: recordingId={}, roomId={}, userId={}",
                    recordingId, request.getRoomId(), request.getRecorderId());

            return toDto(saved);

        } catch (Exception e) {
            log.error("녹화 시작 실패", e);
            throw new RuntimeException("녹화 시작 실패: " + e.getMessage());
        }
    }

    /**
     * ⭐ 미팅룸 존재 여부만 확인 (생성하지 않음)
     */
    private boolean isMeetingRoomExists(String roomId) {
        String checkQuery = "SELECT COUNT(*) FROM MEETING_ROOMS WHERE ROOM_CD = :roomId AND STATUS = 'IN_PROGRESS'";
        Query query = entityManager.createNativeQuery(checkQuery);
        query.setParameter("roomId", roomId);
        Number count = (Number) query.getSingleResult();
        return count.intValue() > 0;
    }


    /**
     * 녹화 종료
     */
    @Transactional
    public RecordingDto stopRecording(String recordingId, RecordingStopRequest request) {
        try {
            RecordingFile recording = recordingFileRepository.findById(recordingId)
                    .orElseThrow(() -> new RuntimeException("녹화 정보를 찾을 수 없습니다"));

            // 녹화 정보 업데이트
            recording.setEndTime(LocalDateTime.now());
            recording.setRecordingStatus("COMPLETED");

            if (request.getFileSize() != null) {
                recording.setFileSize(request.getFileSize());
            }

            // 녹화 시간 계산
            if (recording.getStartTime() != null) {
                Duration duration = Duration.between(recording.getStartTime(), recording.getEndTime());
                recording.setDuration((int) duration.getSeconds());
            }

            RecordingFile updated = recordingFileRepository.save(recording);

            log.info("녹화 종료: recordingId={}, duration={}초",
                    recordingId, recording.getDuration());

            return toDto(updated);

        } catch (Exception e) {
            log.error("녹화 종료 실패", e);
            throw new RuntimeException("녹화 종료 실패: " + e.getMessage());
        }
    }

    /**
     * 녹화 실패 처리
     */
    @Transactional
    public void failRecording(String recordingId, RecordingFailRequest request) {
        try {
            RecordingFile recording = recordingFileRepository.findById(recordingId)
                    .orElseThrow(() -> new RuntimeException("녹화 정보를 찾을 수 없습니다"));

            recording.setRecordingStatus("FAILED");
            recording.setEndTime(LocalDateTime.now());

            recordingFileRepository.save(recording);

            log.error("녹화 실패: recordingId={}, reason={}", recordingId, request.getReason());

        } catch (Exception e) {
            log.error("녹화 실패 처리 중 오류", e);
        }
    }

    /**
     * 워크스페이스의 녹화 목록 조회
     */
    @Transactional(readOnly = true)
    public List<RecordingDto> getWorkspaceRecordings(String workspaceId) {
        List<RecordingFile> recordings = recordingFileRepository
                .findByWorkspaceCdOrderByCreatedDateDesc(workspaceId);

        return recordings.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * 회의실의 녹화 목록 조회
     */
    @Transactional(readOnly = true)
    public List<RecordingDto> getRoomRecordings(String roomId) {
        List<RecordingFile> recordings = recordingFileRepository
                .findByRoomCdOrderByCreatedDateDesc(roomId);

        return recordings.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * 녹화 파일 정보 조회
     */
    @Transactional(readOnly = true)
    public RecordingDto getRecording(String recordingId) {
        RecordingFile recording = recordingFileRepository.findById(recordingId)
                .orElseThrow(() -> new RuntimeException("녹화를 찾을 수 없습니다"));

        return toDto(recording);
    }

    /**
     * 녹화 ID 생성
     */
    private String generateRecordingId() {
        return "rec-" + UUID.randomUUID().toString();
    }

    /**
     * Entity to DTO 변환
     */
    private RecordingDto toDto(RecordingFile recording) {
        return RecordingDto.builder()
                .recordingId(recording.getRecordingId())
                .roomId(recording.getRoomCd())
                .workspaceId(recording.getWorkspaceCd())
                .recorderId(recording.getRecorderId())
                .fileName(recording.getFileName())
                .filePath(recording.getFilePath())
                .fileSize(recording.getFileSize())
                .duration(recording.getDuration())
                .status(recording.getRecordingStatus())
                .startTime(recording.getStartTime())
                .endTime(recording.getEndTime())
                .thumbnailPath(recording.getThumbnailPath())
                .createdDate(recording.getCreatedDate())
                .build();
    }
}
