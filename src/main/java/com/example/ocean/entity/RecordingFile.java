package com.example.ocean.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "RECORDING_FILES")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordingFile {

    @Id
    @Column(name = "RECORDING_ID", length = 100)
    private String recordingId;

    @Column(name = "ROOM_CD", nullable = false, length = 100)
    private String roomCd;

    @Column(name = "WORKSPACE_CD", nullable = false, length = 100)
    private String workspaceCd;

    @Column(name = "RECORDER_ID", nullable = false, length = 50)
    private String recorderId;

    @Column(name = "FILE_NM", nullable = false, length = 255)
    private String fileName;

    @Column(name = "FILE_PATH", nullable = false, length = 500)
    private String filePath;

    @Column(name = "FILE_SIZE")
    private Long fileSize;

    @Column(name = "DURATION")
    private Integer duration;

    @Column(name = "RECORDING_STATUS", length = 20)
    @Builder.Default
    private String recordingStatus = "RECORDING";

    @Column(name = "START_TIME")
    private LocalDateTime startTime;

    @Column(name = "END_TIME")
    private LocalDateTime endTime;

    @Column(name = "THUMBNAIL_PATH", length = 500)
    private String thumbnailPath;

    @Column(name = "CREATED_DATE", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "MODIFY")
    private LocalDateTime modify;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        modify = LocalDateTime.now();
        startTime = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        modify = LocalDateTime.now();
    }

    // 연관 관계 (필요시)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "RECORDER_ID", insertable = false, updatable = false)
    private User recorder;

    // 녹화 상태 enum
    public enum RecordingStatus {
        RECORDING("녹화중"),
        COMPLETED("완료"),
        FAILED("실패"),
        PROCESSING("처리중");

        private final String description;

        RecordingStatus(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}
