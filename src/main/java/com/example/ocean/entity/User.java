package com.example.ocean.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USERS")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "USER_ID", length = 50)
    private String userId;  // 소셜 로그인 ID가 PK

    @Column(name = "PROVIDER", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Provider provider;

    @Column(name = "USER_NM", nullable = false, length = 50)
    private String userName;

    @Column(name = "USER_IMG", length = 255)
    private String userImg;

    @Column(name = "LANGUAGE_SETTING", length = 10)
    @Builder.Default
    private String languageSetting = "ko";

    @Column(name = "ACTIVE_STATE", length = 1)
    @Builder.Default
    private String activeState = "Y";

    @Column(name = "CREATED_DATE", updatable = false)
    private LocalDateTime createdDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }

    // Provider Enum
    public enum Provider {
        GOOGLE, KAKAO
    }
}