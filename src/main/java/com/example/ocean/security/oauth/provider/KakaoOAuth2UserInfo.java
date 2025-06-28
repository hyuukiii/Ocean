package com.example.ocean.security.oauth.provider;

import java.util.Map;

// 카카오 OAuth2 구현체
public class KakaoOAuth2UserInfo implements OAuth2UserInfo {
    private Map<String,Object> attributes;

    public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public String getId() {
        return String.valueOf(attributes.get("id")) ;
    }

    @Override
    public String getName() {
        Map<String,Object> properties = (Map<String, Object>) attributes.get("properties");
        if (properties == null) {
            return null;
        }
        return (String) properties.get("nickname");
    }

    @Override
    public String getEmail() {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        if (kakaoAccount == null) {
            return null;
        }
        return (String) kakaoAccount.get("email");
    }

    @Override
    public String getImageUrl() {
        Map<String,Object> properties =(Map<String, Object>) attributes.get("properties");
        if (properties == null) {
            return null;
        }
        return (String) properties.get("profile_image");
    }
}
