package com.example.ocean.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "WORKSPACE_MEMBERS")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(WorkspaceMemberId.class)
public class WorkspaceMember {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "WORKSPACE_CD", referencedColumnName = "WORKSPACE_CD")
    private Workspace workspace;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", referencedColumnName = "USER_ID")
    private User user;

    @Column(name = "USER_NICKNAME", length = 50)
    private String userNickname;

    @Column(name = "USER_ROLE", length = 10)
    @Builder.Default
    private String userRole = "MEMBER";

    @Column(name = "STATUS_MSG", length = 100)
    private String statusMsg;

    @Column(name = "DEPT_CD", length = 10)
    private String deptCd;

    @Column(name= "DEPT_NM", length = 10)
    private String deptNm;

    @Column(name = "POSITION", length = 30)
    private String position;

    @Column(name = "EMAIL", length = 255)
    private String email;

    @Column(name = "PHONE_NUM", length = 20)
    private String phoneNum;

    @Column(name = "ACTIVE_STATE", length = 1)
    @Builder.Default
    private String activeState = "Y";

    @Column(name = "FAVORITE", length = 1)
    @Builder.Default
    private String favorite = "N";

    @Column(name = "JOINED_DATE", updatable = false)
    private LocalDateTime joinedDate;

    @Column(name = "ENTRANCE_DATE")
    private LocalDateTime entranceDate;

    @Column(name = "QUIT_DATE")
    private LocalDateTime quitDate;

    @PrePersist
    protected void onCreate() {
        joinedDate = LocalDateTime.now();
        entranceDate = LocalDateTime.now();
    }
}
