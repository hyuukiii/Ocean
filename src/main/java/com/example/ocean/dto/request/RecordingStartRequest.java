package com.example.ocean.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecordingStartRequest {
    private String roomId;
    private String workspaceId;
    private String recorderId;
}