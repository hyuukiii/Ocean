package com.example.ocean.security.oauth.provider;

import java.util.Map;
import java.util.Objects;

// Google OAuth2 구현체
public class GoogleOAuth2UserInfo implements OAuth2UserInfo {
    private Map<String, Object> attributes;

    public GoogleOAuth2UserInfo(Map<String, Object> attributes) {

        this.attributes = attributes;
    }

    @Override
    public String getId() {
        return (String) attributes.get("sub");
    }

    @Override
    public String getName() {
        return (String) attributes.get("name") ;
    }

    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }

    @Override
    public String getImageUrl() {
        return (String) attributes.get("picture");
    }
}
