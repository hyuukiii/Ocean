package com.example.ocean.security.oauth.provider;


// 소셜로그인 구현체를 받는 인터페이스
public interface OAuth2UserInfo {
    String getId();
    String getName();
    String getEmail();
    String getImageUrl();
}
