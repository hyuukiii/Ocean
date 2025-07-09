package com.example.ocean.controller.recording;

import com.example.ocean.security.oauth.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PathValidationController {

    @PostMapping("/validate-path")
    public ResponseEntity<Map<String, Object>> validatePath(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserPrincipal user) {

        String path = request.get("path");
        Map<String, Object> response = new HashMap<>();

        try {
            // 1. 기본 검증
            if (path == null || path.trim().isEmpty()) {
                response.put("valid", false);
                response.put("reason", "경로가 비어있습니다");
                return ResponseEntity.ok(response);
            }

            path = path.trim();

            // 2. 보안 검증 - 위험한 경로 차단 (Desktop은 제외)
            if (isDangerousPath(path)) {
                response.put("valid", false);
                response.put("reason", "시스템 경로는 사용할 수 없습니다");
                return ResponseEntity.ok(response);
            }

            // 3. 경로 존재 여부 확인
            Path dirPath = Paths.get(path).normalize();
            File directory = dirPath.toFile();

            if (!directory.exists()) {
                // 디렉토리가 없으면 생성 시도
                try {
                    boolean created = directory.mkdirs();
                    if (created) {
                        response.put("valid", true);
                        response.put("reason", "새 디렉토리가 생성되었습니다");
                    } else {
                        response.put("valid", false);
                        response.put("reason", "디렉토리를 생성할 수 없습니다. 경로를 확인해주세요");
                    }
                } catch (SecurityException e) {
                    response.put("valid", false);
                    response.put("reason", "디렉토리 생성 권한이 없습니다");
                }
            } else if (!directory.isDirectory()) {
                response.put("valid", false);
                response.put("reason", "파일이 아닌 디렉토리 경로를 입력해주세요");
            } else if (!directory.canWrite()) {
                response.put("valid", false);
                response.put("reason", "해당 디렉토리에 쓰기 권한이 없습니다");
            } else {
                response.put("valid", true);
                response.put("reason", "사용 가능한 경로입니다");
            }

            // 4. 사용자별 경로 저장 (선택사항)
            if (response.get("valid").equals(true)) {
                saveUserRecordingPath(user.getId(), path);
            }

            response.put("path", path);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("valid", false);
            response.put("reason", "경로 검증 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    private boolean isDangerousPath(String path) {
        // 시스템 경로 차단 (Desktop은 허용)
        List<String> dangerousPaths = Arrays.asList(
                "/System", "/Windows", "/etc", "/bin", "/usr/bin",
                "/sbin", "/usr/sbin", "/boot", "/dev", "/proc",
                "C:\\Windows", "C:\\Program Files", "/Applications/",
                "/Library/System", "/private/etc", "/private/var"
        );

        String normalizedPath = path.toLowerCase();

        // 정확한 경로 매칭 (Desktop은 허용)
        return dangerousPaths.stream()
                .anyMatch(dangerous -> normalizedPath.equals(dangerous.toLowerCase()) ||
                        normalizedPath.startsWith(dangerous.toLowerCase() + "/") ||
                        normalizedPath.startsWith(dangerous.toLowerCase() + "\\"));
    }

    private void saveUserRecordingPath(String userId, String path) {
        // TODO: DB에 사용자별 기본 녹화 경로 저장
        // user_preferences 테이블에 recording_path 필드 추가 필요
        System.out.println("사용자 " + userId + "의 녹화 경로 저장: " + path);
    }
}
