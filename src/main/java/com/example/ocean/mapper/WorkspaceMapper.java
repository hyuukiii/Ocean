package com.example.ocean.mapper;

import com.example.ocean.domain.Workspace;
import com.example.ocean.domain.WorkspaceDept;
import com.example.ocean.domain.WorkspaceMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

@Mapper
public interface WorkspaceMapper {

    // 사용자 ID로 참여 중인 모든 워크스페이스 조회
    List<Workspace> findWorkspacesByUserId(@Param("userId") String userId);

    // 워크스페이스에 사용자 추가
    void addUserToWorkspace(@Param("userId") String userId,
                            @Param("workspaceCd") String workspaceCd,
                            @Param("userRole") String userRole,
                            @Param("activeState") String activeState);

    // 초대 코드로 워크스페이스 정보 조회
    Workspace findWorkspaceByInviteCd(@Param("inviteCd") String inviteCd);

    // 워크스페이스 사용자 프로필 정보 삽입
    void insertUserProfile(@Param("workspaceCd") String workspaceCd,
                           @Param("userId") String userId,
                           @Param("userNickname") String userNickname,
                           @Param("statusMsg") String statusMsg,
                           @Param("email") String email,
                           @Param("phoneNum") String phoneNum,
                           @Param("userRole") String userRole);

    // 워크스페이스 멤버 프로필 정보 업데이트
    void updateUserProfile(@Param("workspaceCd") String workspaceCd,
                           @Param("userId") String userId,
                           @Param("userNickname") String userNickname,
                           @Param("statusMsg") String statusMsg,
                           @Param("email") String email,
                           @Param("phoneNum") String phoneNum,
                           @Param("userRole") String userRole);


    // 워크스페이스 멤버 부서 및 직급 정보 업데이트
    void updateUserDeptAndPosition(@Param("workspaceCd") String workspaceCd,
                                     @Param("userId") String userId,
                                     @Param("deptCd") String deptCd,
                                     @Param("position") String position
    );

    // 워크스페이스 멤버 이미지 업데이트
    void updateProfileImageOnly(@Param("workspaceCd") String workspaceCd,
                                @Param("userId") String userId,
                                @Param("userImg") String userImg);


    // 초대 코드로 워크스페이스 조회
    Workspace findByInviteCode(String inviteCd);

    // 특정 유저의 중복 초대 요청 개수 확인
    int countInvitation(@Param("workspaceCd") String workspaceCd,
                        @Param("invitedUserId") String invitedUserId);

    // 초대 요청 삽입
    void insertInvitation(@Param("workspaceCd") String workspaceCd,
                          @Param("invitedUserId") String invitedUserId,
                          @Param("inviteCd") String inviteCd);

    // 초대 수락/거절 상태 업데이트
    void updateInvitationStatus(@Param("workspaceCd") String workspaceCd,
                                @Param("invitedUserId") String invitedUserId,
                                @Param("status") String status);

    // 워크스페이스 멤버로 등록
    void insertWorkspaceMember(@Param("workspaceCd") String workspaceCd,
                               @Param("userId") String userId);

    // 초대 거절 처리
    void rejectInvitation(@Param("workspaceCd") String workspaceCd,
                          @Param("invitedUserId") String invitedUserId);

    // 워크스페이스 코드로 워크스페이스 정보 조회
    Workspace findWorkspaceByCd(@Param("workspaceCd") String workspaceCd);

    // 워크스페이스 정보 삽입
    void insertWorkspace(Workspace workspace);

    // 워크스페이스 부서 정보 삽입
    void insertDepartment(WorkspaceDept dept);

    // 워크스페이스 멤버 정보 삽입
    void insertMember(WorkspaceMember member);

    // 부서 번호 중 가장 큰 번호 조회 (부서 코드 생성용)
    Integer findGlobalMaxDeptNumber();

    // 워크스페이스 코드로 부서 목록 조회
    List<WorkspaceDept> selectDepartmentsByWorkspace(@Param("workspaceCd") String workspaceCd);

    // 즐겨찾기 상태 업데이트
    void updateFavorite(@Param("userId") String userId,
                        @Param("workspaceCd") String workspaceCd,
                        @Param("favorite") int favorite);

    // 입장 시각 업데이트
    void updateEntranceTime(@Param("workspaceCd") String workspaceCd,
                            @Param("userId") String userId,
                            @Param("timestamp") Timestamp timestamp);

    // 퇴장 시각 업데이트
    void updateQuitTime(@Param("workspaceCd") String workspaceCd,
                        @Param("userId") String userId,
                        @Param("timestamp") Timestamp timestamp);

    // 워크스페이스 코드로 멤버 전체 조회
    List<WorkspaceMember> findMembersByWorkspaceCd(String workspaceCd);

    // 모든 워크스페이스의 대기 중 초대 목록 조회
    List<Map<String, Object>> getAllPendingInvitations();

    // 워크스페이스 프로필 정보 수정
    void updateWorkspaceProfile(@Param("workspaceCd") String workspaceCd,
                                @Param("userId") String userId,
                                @Param("userNickname") String userNickname,
                                @Param("statusMsg") String statusMsg,
                                @Param("email") String email,
                                @Param("phoneNum") String phoneNum,
                                @Param("userImg") String userImg);

    // 부서 및 직책 정보 수정
    void updateDeptAndPosition(@Param("workspaceCd") String workspaceCd,
                               @Param("userId") String userId,
                               @Param("deptCd") String deptCd,
                               @Param("position") String position);

    // 특정 워크스페이스에서 특정 유저의 멤버 정보 조회
    WorkspaceMember findMemberByWorkspaceAndUser(@Param("workspaceCd") String workspaceCd,
                                                 @Param("userId") String userId);

    // 사용자 상태 (USER_STATE) 업데이트 (예: 탈퇴 처리 등)
    void updateUserState(Map<String, Object> param);
}
