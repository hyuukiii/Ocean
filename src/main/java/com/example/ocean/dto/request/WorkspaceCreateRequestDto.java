package com.example.ocean.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class WorkspaceCreateRequestDto {
    private String workspaceName;
    private String endDate;
    private String description;
    private List<String> departments;
}
