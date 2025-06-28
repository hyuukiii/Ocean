package com.example.ocean.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_TOKENS")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserTokens {

    @Id
    @Column(name = "TOKEN_ID", length = 100)
    @GeneratedValue(strategy = GenerationType.UUID)
    private String tokenId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @Column(name = "ACCESS_TOKEN", length = 500)
    private String accessToken;

    @Column(name = "REFRESH_TOKEN", length = 500)
    private String refreshToken;

    @Column(name = "TOKEN_EXPIRES_TIME")
    private LocalDateTime tokenExpiresTime;

    @Column(name = "CREATED_DATE", updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "MODIFY")
    private LocalDateTime modify;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        modify = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        modify = LocalDateTime.now();
    }
}