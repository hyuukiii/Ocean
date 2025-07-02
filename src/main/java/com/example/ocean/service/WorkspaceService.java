package com.example.ocean.service;

import com.example.ocean.domain.Workspace;
import com.example.ocean.domain.WorkspaceDept;
import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.mapper.WorkspaceMapper;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
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
                                             String email, String phoneNum, String role) {
        workspaceMapper.insertUserProfile(workspaceCd, userId, userNickname, statusMsg, email, phoneNum, role);
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
    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public Workspace createWorkspace(
            UserPrincipal userPrincipal,
            Workspace workspace, // Controller에서 @ModelAttribute로 받은 객체
            List<String> departments,
            MultipartFile file
    ) throws IOException {

        // 1. 파일 저장 로직 (이 부분은 새로 추가되어야 합니다)
        String savedFilePath = null;
        if (file != null && !file.isEmpty()) {
            String originalFilename = file.getOriginalFilename();
            String savedFilename = UUID.randomUUID().toString() + "_" + originalFilename;
            new File(uploadDir).mkdirs(); // 폴더가 없으면 생성
            file.transferTo(new File(uploadDir + savedFilename));
            savedFilePath = "/images/workspace/" + savedFilename;
        }

        // 2. ID, 초대코드, 날짜 등 DB 저장 전 값 설정
        workspace.setWorkspaceCd(UUID.randomUUID().toString());
        workspace.setInviteCd(UUID.randomUUID().toString().substring(0, 8));
        workspace.setWorkspaceImg(savedFilePath);
        workspace.setActiveState("Y");
        workspace.setCreatedDate(Timestamp.valueOf(LocalDateTime.now()));

        // 3. 기존에 만들어두신 메소드를 호출합니다.
        //   - List<String>을 String[] 배열로 변환합니다.
        String[] deptsArray = (departments != null) ? departments.toArray(new String[0]) : new String[0];
        //   - UserPrincipal에서 userId를 가져옵니다.
        String userId = userPrincipal.getId(); // UserPrincipal에 맞게 수정 필요

        // 기존 로직 재사용
        createWorkspaceWithDepartments(workspace, deptsArray, userId);

        // 4. 모든 정보가 담긴 최종 객체 반환
        return workspace;
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
    public void updateWorkspaceProfile(
            String workspaceCd,
            String userId,
            String userNickname,
            String statusMsg,
            String email,
            String phoneNum,
            String userRole
    ) {
        try {
            log.info("프로필 업데이트 시작");
            log.info("워크스페이스: {}", workspaceCd);
            log.info("사용자: {}", userId);
            log.info("닉네임: {}", userNickname);
            log.info("상태메시지: {}", statusMsg);
            log.info("이메일: {}", email);
            log.info("전화번호: {}", phoneNum);
            log.info("역할: {}", userRole);

            workspaceMapper.updateUserProfile(
                    workspaceCd,
                    userId,
                    userNickname,
                    statusMsg,
                    email,
                    phoneNum,
                    userRole
            );
            log.info("프로필 업데이트 완료");
        } catch (Exception e) {
            log.error("프로필 업데이트 실패", e);
            throw new RuntimeException("프로필 업데이트 중 오류가 발생했습니다.", e);
        }
    }


    // 사용자 '이미지'만 업데이트 매서드
    public void updateProfileImage(String workspaceCd, String userId, String imageFileName) {
        try {
            workspaceMapper.updateProfileImageOnly(workspaceCd, userId, imageFileName);
        } catch (Exception e) {
            log.error("프로필 이미지 업데이트 실패 - workspaceCd: {}, userId: {}", workspaceCd, userId, e);
            throw new RuntimeException("프로필 이미지 업데이트 중 오류가 발생했습니다.", e);
        }
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
