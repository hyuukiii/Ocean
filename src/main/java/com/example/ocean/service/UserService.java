package com.example.ocean.service;

import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.dto.request.UserOnboardingRequest;
import com.example.ocean.dto.request.UserProfileUpdateRequest;
import com.example.ocean.dto.response.UserProfileResponse;
import com.example.ocean.entity.User;
import com.example.ocean.exception.ResourceNotFoundException;
import com.example.ocean.mapper.WorkspaceMapper;
import com.example.ocean.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    //private final WorkspaceMemberRepository workspaceMemberRepository;

    //권지언 매퍼 추가
    private final WorkspaceMapper workspaceMapper;

    // 사용자 프로필 조회
    public UserProfileResponse getUserProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다."));

        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .userName(user.getUserName())
                .userProfileImg(user.getUserImg())
                .provider(user.getProvider().name())
                .isActive(user.getActiveState().equals("Y"))
                .createdAt(user.getCreatedDate())
                .build();
    }

}