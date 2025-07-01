package com.example.ocean.service;

import com.example.ocean.domain.Workspace;
import com.example.ocean.domain.WorkspaceDept;
import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.mapper.WorkspaceMapper;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WorkspaceService {

    private final WorkspaceMapper workspaceMapper;

    public WorkspaceService(WorkspaceMapper workspaceMapper) {
        this.workspaceMapper = workspaceMapper;
    }

    public List<Workspace> getWorkspacesByUserId(String userId) {
        return workspaceMapper.findWorkspacesByUserId(userId);
    }

    /*
    public void createWorkspace(Workspace workspace) {
        workspaceMapper.createWorkspace(workspace);
    }
    */

    public void joinWorkspace(String workspaceCd, String userId, String userRole, String activeState) {
        workspaceMapper.addUserToWorkspace(userId, workspaceCd, userRole, activeState);
    }

    public boolean joinWorkspaceByInviteCode(String inviteCd, String userId) {
        Workspace workspace = workspaceMapper.findWorkspaceByInviteCd(inviteCd);
        if (workspace == null) return false;

        workspaceMapper.addUserToWorkspace(userId, workspace.getWorkspaceCd(), "MEMBER", "1");
        return true;
    }

    public void insertUserProfileToWorkspace(String workspaceCd, String userId,
                                             String userNickname, String statusMsg,
                                             String email, String phoneNum, String role,
                                             String userImg) {
        workspaceMapper.insertUserProfile(workspaceCd, userId, userNickname, statusMsg, email, phoneNum, role, userImg);
    }

    public Workspace findByInviteCode(String inviteCd) {
        return workspaceMapper.findByInviteCode(inviteCd);
    }

    public boolean existsInvitation(String workspaceCd, String invitedUserId) {
        return workspaceMapper.countInvitation(workspaceCd, invitedUserId) > 0;
    }

    public void requestInvitation(String workspaceCd, String invitedUserId, String inviteCd) {
        workspaceMapper.insertInvitation(workspaceCd, invitedUserId, inviteCd);
    }

    /*
    public List<Map<String, Object>> getPendingInvitations(String workspaceCd) {
        return workspaceMapper.selectPendingInvitations(workspaceCd);
    }
    */

    public void approveInvitation(String workspaceCd, String invitedUserId) {
        workspaceMapper.updateInvitationStatus(workspaceCd, invitedUserId, "ACCEPT");
        workspaceMapper.insertWorkspaceMember(workspaceCd, invitedUserId);
    }

    public void rejectInvitation(String workspaceCd, String invitedUserId) {
        workspaceMapper.rejectInvitation(workspaceCd, invitedUserId);
    }

    public List<Map<String, Object>> getAllPendingInvitations() {
        return workspaceMapper.getAllPendingInvitations();
    }

    /*
    public String getUserNicknameInWorkspace(String workspaceCd, String userId) {
        return workspaceMapper.findNicknameInWorkspace(workspaceCd, userId);
    }
    */

    public Workspace findWorkspaceByCd(String workspaceCd) {
        Workspace result = workspaceMapper.findWorkspaceByCd(workspaceCd);
        System.out.println("조회한 workspace: " + result);
        return result;
    }

    public void createWorkspaceWithDepartments(Workspace workspace, String[] departments, String userId) {
        workspaceMapper.insertWorkspace(workspace);

        Integer maxDeptNum = workspaceMapper.findGlobalMaxDeptNumber();
        int nextDeptNum = (maxDeptNum != null) ? maxDeptNum + 1 : 1;

        for (int i = 0; i < departments.length; i++) {
            WorkspaceDept dept = new WorkspaceDept();
            dept.setWorkspaceCd(workspace.getWorkspaceCd());
            dept.setDeptCd("D" + (nextDeptNum + i));
            dept.setDeptNm(departments[i]);
            workspaceMapper.insertDepartment(dept);
        }

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceCd(workspace.getWorkspaceCd());
        member.setUserId(userId);
        member.setUserRole("OWNER");
        workspaceMapper.insertMember(member);
    }

    public List<WorkspaceDept> getDepartments(String workspaceCd) {
        return workspaceMapper.selectDepartmentsByWorkspace(workspaceCd);
    }

    public void updateFavoriteStatus(String userId, List<String> workspaceCds, boolean isFavorite) {
        for (String workspaceCd : workspaceCds) {
            workspaceMapper.updateFavorite(userId, workspaceCd, isFavorite ? 1 : 0);
        }
    }

    public void updateEntranceTime(String workspaceCd, String userId) {
        workspaceMapper.updateEntranceTime(workspaceCd, userId, Timestamp.valueOf(LocalDateTime.now()));
    }

    public void updateQuitTime(String workspaceCd, String userId) {
        workspaceMapper.updateQuitTime(workspaceCd, userId, Timestamp.valueOf(LocalDateTime.now()));
    }

    public List<WorkspaceMember> getWorkspaceMembers(String workspaceCd) {
        return workspaceMapper.findMembersByWorkspaceCd(workspaceCd);
    }

    // 사용자 멀티 프로필
    public void updateWorkspaceProfile(String workspaceCd, String userId,
                                       String userNickname, String statusMsg,
                                       String email, String phoneNum,
                                       String userImg) {
        workspaceMapper.updateWorkspaceProfile(workspaceCd, userId, userNickname, statusMsg, email, phoneNum, userImg);
    }

    public void updateDeptAndPosition(String workspaceCd, String userId,
                                      String deptCd, String position) {
        workspaceMapper.updateDeptAndPosition(workspaceCd, userId, deptCd, position);
    }

    public WorkspaceMember findMemberByWorkspaceAndUser(String workspaceCd, String userId) {
        return workspaceMapper.findMemberByWorkspaceAndUser(workspaceCd, userId);
    }

    public void updateUserState(String workspaceCd, String userId, String userState) {
        System.out.println("[DEBUG] 상태 업데이트 요청 - workspaceCd: " + workspaceCd + ", userId: " + userId + ", userState: " + userState);

        Map<String, Object> param = new HashMap<>();
        param.put("workspaceCd", workspaceCd);
        param.put("userId", userId);
        param.put("userState", userState);

        System.out.println("[DEBUG] 파라미터 맵: " + param);

        workspaceMapper.updateUserState(param);
    }

}
