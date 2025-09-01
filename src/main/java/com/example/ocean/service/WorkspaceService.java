package com.example.ocean.service;

import com.example.ocean.domain.Notification;
import com.example.ocean.domain.Workspace;
import com.example.ocean.domain.WorkspaceDept;
import com.example.ocean.domain.WorkspaceMember;
import com.example.ocean.mapper.MemberTransactionMapper;
import com.example.ocean.mapper.WorkspaceMapper;
import com.example.ocean.security.oauth.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import java.util.UUID;

import java.io.File;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class WorkspaceService {

    @Autowired
    private JavaMailSender mailSender;

    private final WorkspaceMapper workspaceMapper;

    private final MemberTransactionMapper transactionMapper;

    public WorkspaceService(WorkspaceMapper workspaceMapper,
                            MemberTransactionMapper transactionMapper) {
        this.workspaceMapper = workspaceMapper;
        this.transactionMapper = transactionMapper;
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

    public Workspace findByInviteCode(String inviteCd) {
        return workspaceMapper.findByInviteCode(inviteCd);
    }

    public boolean existsInvitation(String workspaceCd, String invitedUserId) {
        return workspaceMapper.countInvitation(workspaceCd, invitedUserId) > 0;
    }

    public void requestInvitation(String workspaceCd, String invitedUserId, String inviteCd) {
        workspaceMapper.insertInvitation(workspaceCd, invitedUserId, inviteCd);
    }

    public void approveInvitation(String workspaceCd, String invitedUserId, String requesterId) {
        WorkspaceMember requester = workspaceMapper.findMemberByWorkspaceAndUser(workspaceCd, requesterId);
        if (requester == null || !"OWNER".equalsIgnoreCase(requester.getUserRole())) {
            throw new RuntimeException("승인 권한이 없습니다.");
        }

        workspaceMapper.updateInvitationStatus(workspaceCd, invitedUserId, "ACCEPT");
        workspaceMapper.insertWorkspaceMember(workspaceCd, invitedUserId);
    }

    public void rejectInvitation(String workspaceCd, String invitedUserId, String requesterId) {
        WorkspaceMember requester = workspaceMapper.findMemberByWorkspaceAndUser(workspaceCd, requesterId);
        if (requester == null || !"OWNER".equalsIgnoreCase(requester.getUserRole())) {
            throw new RuntimeException("거절 권한이 없습니다.");
        }

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
            Workspace workspace,
            List<String> departments,
            MultipartFile file
    ) throws IOException {

        log.info("워크스페이스 생성 시작 - 업로드 디렉토리: {}", uploadDir);

        // 1. 파일 저장 로직
        String savedFilePath = null;
        if (file != null && !file.isEmpty()) {
            log.info("파일 업로드 시작 - 파일명: {}, 크기: {} bytes",
                    file.getOriginalFilename(), file.getSize());
            String originalFilename = file.getOriginalFilename();
            String savedFilename = UUID.randomUUID().toString() + "_" + originalFilename;

            // ⚠️ 수정된 부분: File 객체를 사용하여 경로 조합
            File uploadDirectory = new File(uploadDir);
            if (!uploadDirectory.exists()) {
                log.warn("업로드 디렉토리가 존재하지 않습니다. 생성 시도: {}", uploadDir);
                uploadDirectory.mkdirs();
            }

            // ⚠️ 중요: 경로와 파일명을 올바르게 조합
            File destinationFile = new File(uploadDirectory, savedFilename);
            log.info("파일 저장 경로: {}", destinationFile.getAbsolutePath());

            file.transferTo(destinationFile);
            savedFilePath = "/images/workspace/" + savedFilename;

            log.info("파일 업로드 완료 - 저장 경로: {}", savedFilePath);
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
        Timestamp quitTime = Timestamp.valueOf(LocalDateTime.now());

        // 1. 퇴장 시간 업데이트
        workspaceMapper.updateQuitTime(workspaceCd, userId, quitTime);

        // 2. 입장 시간 조회
        Timestamp entranceTime = transactionMapper.getEntranceTime(workspaceCd, userId);
        if (entranceTime != null) {
            long durationInSeconds = (quitTime.getTime() - entranceTime.getTime()) / 1000;

            // 3. MEMBERS_TRANSACTION에 누적
            Long currentTime = transactionMapper.getAccumulatedTime(workspaceCd, userId);
            if (currentTime == null) {
                // 최초 insert
                transactionMapper.insertAccumulatedTime(workspaceCd, userId, durationInSeconds);
            } else {
                // 누적 update
                transactionMapper.updateAccumulatedTime(workspaceCd, userId, durationInSeconds);
            }
        }
    }


    public List<WorkspaceMember> getWorkspaceMembers(String workspaceCd) {
        return workspaceMapper.findMembersByWorkspaceCd(workspaceCd);
    }

    // 사용자 멀티 프로필
    @Transactional
    public void updateWorkspaceProfile(
            String workspaceCd,
            String userId,
            String userNickname,
            String statusMsg,
            String email,
            String phoneNum,
            String userRole,
            String userImg
    ) {
        try {
            log.info("=== 프로필 업데이트 시작 ===");
            log.info("워크스페이스 코드: {}", workspaceCd);
            log.info("사용자 ID: {}", userId);
            log.info("닉네임: {}", userNickname);
            log.info("상태메시지: {}", statusMsg);
            log.info("이메일: {}", email);
            log.info("전화번호: {}", phoneNum);
            log.info("역할: {}", userRole);
            log.info("이미지 경로: {}", userImg);  // ⭐ 이미지 경로 로그

            // ⭐ 매퍼 호출 (6개 파라미터)
            workspaceMapper.updateWorkspaceProfile(
                    workspaceCd,
                    userId,
                    userNickname,
                    statusMsg,
                    email,
                    phoneNum,
                    userImg  // ⭐ 이미지 경로 포함
            );

            log.info("=== 프로필 업데이트 완료 ===");

        } catch (Exception e) {
            log.error("프로필 업데이트 실패 - workspaceCd: {}, userId: {}", workspaceCd, userId, e);
            throw new RuntimeException("프로필 업데이트 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 워크스페이스에 새 사용자 프로필 추가
     * 이미지 경로를 포함한 모든 프로필 정보를 삽입
     */
    @Transactional
    public void insertUserProfileToWorkspace(
            String workspaceCd,
            String userId,
            String userNickname,
            String statusMsg,
            String email,
            String phoneNum,
            String role,
            String userImg
    ) {
        try {
            log.info("=== 사용자 프로필 추가 시작 ===");
            log.info("워크스페이스 코드: {}", workspaceCd);
            log.info("사용자 ID: {}", userId);
            log.info("닉네임: {}", userNickname);
            log.info("상태메시지: {}", statusMsg);
            log.info("이메일: {}", email);
            log.info("전화번호: {}", phoneNum);
            log.info("역할: {}", role);
            log.info("이미지 경로: {}", userImg);  // ⭐ 이미지 경로 로그

            // ⭐ 매퍼 호출 (8개 파라미터)
            workspaceMapper.insertUserProfile(
                    workspaceCd,
                    userId,
                    userNickname,
                    statusMsg,
                    email,
                    phoneNum,
                    role,
                    userImg  // ⭐ 이미지 경로 포함
            );

            log.info("=== 사용자 프로필 추가 완료 ===");

        } catch (Exception e) {
            log.error("사용자 프로필 추가 실패 - workspaceCd: {}, userId: {}", workspaceCd, userId, e);
            throw new RuntimeException("사용자 프로필 추가 중 오류가 발생했습니다.", e);
        }
    }


    /**
     * 프로필 이미지만 업데이트하는 메서드
     */
    public void updateProfileImage(String workspaceCd, String userId, String imageFileName) {
        try {
            log.info("=== 프로필 이미지 업데이트 시작 ===");
            log.info("워크스페이스 코드: {}", workspaceCd);
            log.info("사용자 ID: {}", userId);
            log.info("이미지 파일명: {}", imageFileName);

            workspaceMapper.updateProfileImageOnly(workspaceCd, userId, imageFileName);

            log.info("=== 프로필 이미지 업데이트 완료 ===");

        } catch (Exception e) {
            log.error("프로필 이미지 업데이트 실패 - workspaceCd: {}, userId: {}", workspaceCd, userId, e);
            throw new RuntimeException("프로필 이미지 업데이트 중 오류가 발생했습니다.", e);
        }
    }


    public void updateDeptAndPosition(String workspaceCd, String userId,
                                      String deptCd, String position) {
        workspaceMapper.updateDeptAndPosition(workspaceCd, userId, deptCd, position);
    }

    public void updateDeptAndPosition2(String workspaceCd, String userId,
                                        String position) {
        workspaceMapper.updateDeptAndPosition2(workspaceCd, userId,   position);
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

    public Map<String, Object> getEventSummary(String workspaceCd) {
        Map<String, Object> summary = workspaceMapper.getEventSummaryByWorkspace(workspaceCd);
        if (summary == null) summary = new HashMap<>();

        int done = summary.get("doneCount") != null ? ((Number) summary.get("doneCount")).intValue() : 0;
        int total = summary.get("totalCount") != null ? ((Number) summary.get("totalCount")).intValue() : 0;
        int todo = summary.get("todoCount") != null ? ((Number) summary.get("todoCount")).intValue() : 0;
        int ing = summary.get("ingCount") != null ? ((Number) summary.get("ingCount")).intValue() : 0;

        double progressRate = total > 0 ? (done * 100.0 / total) : 0.0;

        summary.put("doneCount", done);
        summary.put("todoCount", todo);
        summary.put("ingCount", ing);
        summary.put("totalCount", total);
        summary.put("progressRate", String.format("%.1f", progressRate));

        return summary;
    }

    public void sendInviteEmail(String email, String inviteCode) {
        String subject = "워크스페이스 초대코드 안내";
        String content = String.format(
                "아래 초대코드를 사용해 워크스페이스에 참여하세요!\n\n초대코드: %s\n참여 링크: localhost:8080\n",
                inviteCode
        );

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject(subject);
        message.setText(content);

        mailSender.send(message);
    }

    public Long getAccumulatedTime(String workspaceCd, String userId) {
        Long time = transactionMapper.getAccumulatedTime(workspaceCd, userId);
        return time != null ? time : 0L;
    }

    public WorkspaceMember getMemberDetail(String workspaceCd, String userId) {
        return workspaceMapper.findMemberByWorkspaceAndUser(workspaceCd, userId);
    }

    public String getUserStatus(String workspaceCd, String userId) {
        return workspaceMapper.getUserStatus(workspaceCd, userId);
    }

    public void insertNewMemberNotification(String workspaceCd, String userNickname) {
        workspaceMapper.insertNewMemberNotification(workspaceCd, userNickname);
    }

    public List<Notification> getRecentNotifications(String workspaceCd) {
        return workspaceMapper.selectRecentNotifications(workspaceCd);
    }

    public List<Map<String, Object>> getPendingInvitationsByWorkspace(String workspaceCd) {
        return workspaceMapper.getPendingInvitationsByWorkspace(workspaceCd);
    }

    public void acceptInvitation(String workspaceCd, String invitedUserId) {
        workspaceMapper.updateInvitationStatus(workspaceCd, invitedUserId, "ACCEPT");
        workspaceMapper.insertWorkspaceMember(workspaceCd, invitedUserId);

        // 워크스페이스 닉네임 대신 소셜 이름 조회
        String userName = workspaceMapper.findUserNameByUserId(invitedUserId);

        String notiId = UUID.randomUUID().toString();

        Map<String, Object> map = new HashMap<>();
        map.put("notiId", notiId);
        map.put("workspaceCd", workspaceCd);
        map.put("createdBy", userName != null ? userName : invitedUserId); // fallback

        workspaceMapper.insertNewMemberNotification(map);
    }

    public void rejectInvitation(String workspaceCd, String invitedUserId) {
        workspaceMapper.updateInvitationStatus(workspaceCd, invitedUserId, "REJECT");
    }

    public Workspace getWorkspaceByCd(String workspaceCd) {
        return workspaceMapper.findWorkspaceByCd(workspaceCd);
    }

    public Map<String, Object> getWorkspaceInfo(String workspaceCd) {
        Workspace workspace = workspaceMapper.findWorkspaceByCd(workspaceCd);
        if (workspace == null) return null;

        Map<String, Object> response = new HashMap<>();
        response.put("workspaceName", workspace.getWorkspaceNm());
        response.put("inviteCode", workspace.getInviteCd());

        LocalDate today = LocalDate.now();

        // ✅ D-day 및 날짜 정보
        if (workspace.getEndDate() != null) {
            LocalDate endDate = workspace.getEndDate().toLocalDateTime().toLocalDate();
            long dday = ChronoUnit.DAYS.between(today, endDate);
            response.put("dday", dday);

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("M월 d일 E요일", Locale.KOREA);
            String dueDateFormatted = endDate.format(formatter);
            response.put("dueDateFormatted", dueDateFormatted);

            // ✅ 진행률 계산: (오늘 - 시작일) / (마감일 - 시작일)
            if (workspace.getCreatedDate() != null) {
                LocalDate startDate = workspace.getCreatedDate().toLocalDateTime().toLocalDate();
                long totalDays = ChronoUnit.DAYS.between(startDate, endDate);
                long passedDays = ChronoUnit.DAYS.between(startDate, today);

                int progressPercent = (totalDays <= 0) ? 100
                        : (int) ((Math.min(passedDays, totalDays) * 100.0) / totalDays);

                response.put("progressPercent", progressPercent);
            } else {
                response.put("progressPercent", 0);
            }
        } else {
            response.put("dday", null);
            response.put("dueDateFormatted", "");
            response.put("progressPercent", 0);
        }

        return response;
    }

    public List<Map<String, Object>> getPendingInvitations(String workspaceCd) {
        return workspaceMapper.getPendingInvitationsByWorkspace(workspaceCd);
    }

    public void respondToInvitation(String workspaceCd, String invitedUserId, String status) {
        workspaceMapper.updateInvitationStatus(workspaceCd, invitedUserId, status);
    }

    /**
     * 워크스페이스 접근 권한 확인
     */
    public boolean hasAccess(String workspaceCd, String userId) {
        try {
            List<WorkspaceMember> members = getWorkspaceMembers(workspaceCd);

            // 단순히 해당 워크스페이스의 멤버인지만 확인
            return members.stream()
                    .anyMatch(member -> member.getUserId().equals(userId));

        } catch (Exception e) {
            log.error("워크스페이스 접근 권한 확인 실패: workspaceCd={}, userId={}",
                    workspaceCd, userId, e);
            return false;
        }
    }

    /**
     * 워크스페이스 이름 조회
     */
    public String getWorkspaceName(String workspaceCd) {
        try {
            Workspace workspace = workspaceMapper.findWorkspaceByCd(workspaceCd);
            return workspace != null ? workspace.getWorkspaceNm() : null;

        } catch (Exception e) {
            log.error("워크스페이스 이름 조회 실패: workspaceCd={}", workspaceCd, e);
            return null;
        }
    }

    /**
     * 워크스페이스의 활성 멤버 조회
     */
    public List<WorkspaceMember> getActiveMembers(String workspaceCd) {
        try {
            // 이미 getWorkspaceMembers 메서드가 있으므로 활용
            List<WorkspaceMember> allMembers = getWorkspaceMembers(workspaceCd);

            // 활성 상태(userState가 null이 아닌) 멤버만 필터링 getUserState() != null
            return allMembers.stream()
                    .filter(member ->"Y". equals(member.getActiveState()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("활성 멤버 조회 실패: workspaceCd={}", workspaceCd, e);
            return new ArrayList<>();
        }
    }

}
