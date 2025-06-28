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

    List<Workspace> findWorkspacesByUserId(@Param("userId") String userId);

    //void createWorkspace(Workspace workspace);
    //List<Map<String, Object>> selectPendingInvitations(@Param("workspaceCd") String workspaceCd);

    //String findNicknameInWorkspace(@Param("workspaceCd") String workspaceCd,
    //@Param("userId") String userId);

    void addUserToWorkspace(@Param("userId") String userId,
                            @Param("workspaceCd") String workspaceCd,
                            @Param("userRole") String userRole,
                            @Param("activeState") String activeState);

    Workspace findWorkspaceByInviteCd(@Param("inviteCd") String inviteCd);

    void insertUserProfile(@Param("workspaceCd") String workspaceCd,
                           @Param("userId") String userId,
                           @Param("userNickname") String userNickname,
                           @Param("statusMsg") String statusMsg,
                           @Param("email") String email,
                           @Param("phoneNum") String phoneNum,
                           @Param("userRole") String userRole,
                           @Param("userImg") String userImg);

    Workspace findByInviteCode(String inviteCd);

    int countInvitation(@Param("workspaceCd") String workspaceCd,
                        @Param("invitedUserId") String invitedUserId);

    void insertInvitation(@Param("workspaceCd") String workspaceCd,
                          @Param("invitedUserId") String invitedUserId,
                          @Param("inviteCd") String inviteCd);



    void updateInvitationStatus(@Param("workspaceCd") String workspaceCd,
                                @Param("invitedUserId") String invitedUserId,
                                @Param("status") String status);

    void insertWorkspaceMember(@Param("workspaceCd") String workspaceCd,
                               @Param("userId") String userId);




    void rejectInvitation(@Param("workspaceCd") String workspaceCd,
                          @Param("invitedUserId") String invitedUserId);



    Workspace findWorkspaceByCd(@Param("workspaceCd") String workspaceCd);

    void insertWorkspace(Workspace workspace);

    void insertDepartment(WorkspaceDept dept);

    void insertMember(WorkspaceMember member);

    Integer findGlobalMaxDeptNumber();

    List<WorkspaceDept> selectDepartmentsByWorkspace(@Param("workspaceCd") String workspaceCd);

    void updateFavorite(@Param("userId") String userId,
                        @Param("workspaceCd") String workspaceCd,
                        @Param("favorite") int favorite);

    void updateEntranceTime(@Param("workspaceCd") String workspaceCd,
                            @Param("userId") String userId,
                            @Param("timestamp") Timestamp timestamp);

    void updateQuitTime(@Param("workspaceCd") String workspaceCd,
                        @Param("userId") String userId,
                        @Param("timestamp") Timestamp timestamp);

    List<WorkspaceMember> findMembersByWorkspaceCd(String workspaceCd);

    List<Map<String, Object>> getAllPendingInvitations();

    void updateWorkspaceProfile(@Param("workspaceCd") String workspaceCd,
                                @Param("userId") String userId,
                                @Param("userNickname") String userNickname,
                                @Param("statusMsg") String statusMsg,
                                @Param("email") String email,
                                @Param("phoneNum") String phoneNum,
                                @Param("userImg") String userImg);

    void updateDeptAndPosition(@Param("workspaceCd") String workspaceCd,
                               @Param("userId") String userId,
                               @Param("deptCd") String deptCd,
                               @Param("position") String position);

    WorkspaceMember findMemberByWorkspaceAndUser(@Param("workspaceCd") String workspaceCd,
                                                 @Param("userId") String userId);

    void updateUserState(Map<String, Object> param);

}
