package com.example.ocean.domain;

import lombok.Data;

import java.sql.Timestamp;

@Data
public class Workspace {
    private String workspaceCd;
    private String workspaceNm;
    private String workspaceImg;
    private String inviteCd;
    private String activeState;
    private Timestamp createdDate;
    private Timestamp endDate;
    private Integer favorite;
    private Timestamp entranceDate;
}
