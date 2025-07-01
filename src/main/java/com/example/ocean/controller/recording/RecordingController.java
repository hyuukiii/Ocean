package com.example.ocean.controller.recording;

import com.example.ocean.dto.*;
import com.example.ocean.dto.request.RecordingFailRequest;
import com.example.ocean.dto.request.RecordingStartRequest;
import com.example.ocean.dto.request.RecordingStopRequest;
import com.example.ocean.service.RecordingService;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;


@Slf4j
@RestController
@RequestMapping("/api/recordings")
@RequiredArgsConstructor
public class RecordingController {

    private final RecordingService recordingService;

    /**
     * 녹화 시작 (미디어 서버에서 호출)
     */
    @PostMapping("/start")
    public ResponseEntity<RecordingDto> startRecording(@RequestBody RecordingStartRequest request) {
        log.info("녹화 시작 요청: roomId={}, recorderId={}",
                request.getRoomId(), request.getRecorderId());

        RecordingDto recording = recordingService.startRecording(request);

        return ResponseEntity.ok(recording);
    }

    /**
     * 녹화 종료 (미디어 서버에서 호출)
     */
    @PutMapping("/{recordingId}/stop")
    public ResponseEntity<RecordingDto> stopRecording(
            @PathVariable String recordingId,
            @RequestBody RecordingStopRequest request) {

        log.info("녹화 종료 요청: recordingId={}", recordingId);

        RecordingDto recording = recordingService.stopRecording(recordingId, request);

        return ResponseEntity.ok(recording);
    }

    /**
     * 녹화 실패 처리 (미디어 서버에서 호출)
     */
    @PutMapping("/{recordingId}/fail")
    public ResponseEntity<Void> failRecording(
            @PathVariable String recordingId,
            @RequestBody RecordingFailRequest request) {

        log.error("녹화 실패: recordingId={}, reason={}",
                recordingId, request.getReason());

        // ⭐ 수정된 부분: request 객체를 그대로 전달
        recordingService.failRecording(recordingId, request);

        return ResponseEntity.ok().build();
    }

    /**
     * 워크스페이스의 녹화 목록 조회
     */
    @GetMapping("/workspace/{workspaceId}")
    public ResponseEntity<List<RecordingDto>> getWorkspaceRecordings(
            @PathVariable String workspaceId,
            @AuthenticationPrincipal UserPrincipal user) {

        // TODO: 워크스페이스 접근 권한 확인

        List<RecordingDto> recordings = recordingService.getWorkspaceRecordings(workspaceId);

        return ResponseEntity.ok(recordings);
    }

    /**
     * 회의실의 녹화 목록 조회
     */
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<RecordingDto>> getRoomRecordings(
            @PathVariable String roomId,
            @AuthenticationPrincipal UserPrincipal user) {

        // TODO: 회의실 접근 권한 확인

        List<RecordingDto> recordings = recordingService.getRoomRecordings(roomId);

        return ResponseEntity.ok(recordings);
    }

    /**
     * 녹화 파일 다운로드
     */
    @GetMapping("/{recordingId}/download")
    public ResponseEntity<Resource> downloadRecording(
            @PathVariable String recordingId,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            RecordingDto recording = recordingService.getRecording(recordingId);

            // TODO: 다운로드 권한 확인

            Path filePath = Paths.get(recording.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("video/webm"))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + recording.getFileName() + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("녹화 파일 다운로드 실패", e);
            return ResponseEntity.internalServerError().build();
        }
    }


    /**
     * 녹화 파일 스트리밍
     */
    @GetMapping("/{recordingId}/stream")
    public ResponseEntity<Resource> streamRecording(
            @PathVariable String recordingId,
            @AuthenticationPrincipal UserPrincipal user) {

        try {
            RecordingDto recording = recordingService.getRecording(recordingId);

            // TODO: 스트리밍 권한 확인

            Path filePath = Paths.get(recording.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("video/webm"))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + recording.getFileName() + "\"")
                    .body(resource);

        } catch (Exception e) {
            log.error("녹화 파일 스트리밍 실패", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}