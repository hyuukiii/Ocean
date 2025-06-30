package com.example.ocean.security.oauth;

import com.example.ocean.entity.User;
import com.example.ocean.repository.UserRepository;
import com.example.ocean.security.oauth.provider.OAuth2UserInfo;
import com.example.ocean.security.oauth.provider.OAuth2UserInfoFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    private final UserRepository userRepository;
    //private final WorkspaceRepository workspaceRepository;
    //private final WorkspaceMemberRepository workspaceMemberRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        log.info("OAuth2 로그인 시도: {}", userRequest.getClientRegistration().getRegistrationId());

        try {
            OAuth2User oAuth2User = super.loadUser(userRequest);
            return processOAuth2User(userRequest, oAuth2User);
        } catch (Exception e) {
            log.error("OAuth2 로그인 실패", e);
            throw new OAuth2AuthenticationException("OAuth2 로그인 처리 중 오류 발생: " + e.getMessage());
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        User.Provider provider = User.Provider.valueOf(registrationId.toUpperCase());

        OAuth2UserInfo oAuth2UserInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(
                registrationId, oAuth2User.getAttributes()
        );

        // 소셜 ID와 제공자로 사용자 조회
        User user = userRepository.findByUserIdAndProvider(oAuth2UserInfo.getId(), provider)
                .map(existingUser -> updateUser(existingUser, oAuth2UserInfo))
                .orElseGet(() -> createUser(oAuth2UserInfo, provider));

        return UserPrincipal.create(user, oAuth2User.getAttributes());
    }

    private User createUser(OAuth2UserInfo oAuth2UserInfo, User.Provider provider) {
        log.info("=== 새 사용자 생성 시작 ===");
        log.info("OAuth2 ID: {}", oAuth2UserInfo.getId());
        log.info("Provider: {}", provider);

        // 사용자 생성
        User user = User.builder()
                .userId(oAuth2UserInfo.getId())  // 소셜 ID가 PK
                .userName(oAuth2UserInfo.getName())
                .userImg(oAuth2UserInfo.getImageUrl())
                .provider(provider)
                .activeState("Y")
                .build();

        User savedUser = userRepository.save(user);
        userRepository.flush(); // 즉시 DB에 반영

        log.info("사용자 저장 완료 - userId: {}, userName: {}",
                savedUser.getUserId(), savedUser.getUserName());

        // 개인 워크스페이스 자동 생성 (선택사항)
        //createPersonalWorkspace(savedUser, oAuth2UserInfo);

        // 다시 한번 확인
        boolean exists = userRepository.existsByUserId(savedUser.getUserId());
        log.info("사용자 존재 확인: {}", exists);

        return savedUser;
    }

    private User updateUser(User user, OAuth2UserInfo oAuth2UserInfo) {
        log.info("기존 사용자 업데이트 - userId: {}", user.getUserId());

        user.setUserName(oAuth2UserInfo.getName());
        user.setUserImg(oAuth2UserInfo.getImageUrl());

        User savedUser = userRepository.save(user);
        userRepository.flush(); // 즉시 DB에 반영

        return savedUser;
    }

    /*
    private void createPersonalWorkspace(User user, OAuth2UserInfo oAuth2UserInfo) {
        // 개인 워크스페이스 생성
        Workspace workspace = Workspace.builder()
                .workspaceNm(user.getUserName() + "의 워크스페이스")
                .activeState("Y")
                .build();

        Workspace savedWorkspace = workspaceRepository.save(workspace);

        // 워크스페이스 멤버로 추가
        WorkspaceMember member = WorkspaceMember.builder()
                .workspace(savedWorkspace)
                .user(user)
                .userNickname(user.getUserName())
                .userRole("ADMIN")
                .email(oAuth2UserInfo.getEmail())  // 이메일이 있다면 저장
                .activeState("Y")
                .build();

        workspaceMemberRepository.save(member);
    }

     */
}