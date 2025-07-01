package com.example.ocean.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordingDto {
    private String recordingId;
    private String roomId;
    private String workspaceId;
    private String recorderId;
    private String fileName;
    private String filePath;
    private Long fileSize;
    private Integer duration;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String thumbnailPath;
    private LocalDateTime createdDate;
}
