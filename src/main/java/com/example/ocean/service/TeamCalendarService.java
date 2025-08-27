package com.example.ocean.service;

import com.example.ocean.domain.Event;
import com.example.ocean.domain.File;
import com.example.ocean.domain.MentionNotification;
import com.example.ocean.domain.Place;
import com.example.ocean.dto.request.*;
import com.example.ocean.dto.response.*;
import com.example.ocean.mapper.*;
import com.example.ocean.util.S3Uploader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional; // 트랜잭션 추가

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamCalendarService {

    private final TeamEventMapper teamEventMapper;
    private final EventAttendencesMapper eventAttendencesRepository;
    private final FileMapper fileMapper;
    private final MentionNotificationMapper mentionNotificationMapper;
    private final S3Uploader s3Uploader;
    private final WorkspaceMemberMapper workspaceMemberMapper;
    private final PlaceMapper placeMapper;

    public List<CalendarResponse> getTeamEvents(String workspaceCd){
        return teamEventMapper.selectTeamEvents(workspaceCd);
    }

    @Transactional(readOnly = true) // 읽기 전용 트랜잭션
    public EventDetailResponse selectTeamEventDetail(String eventCd){
        Event event = teamEventMapper.selectTeamEventDetail(eventCd);
        if (event == null) {
            return null;
        }
        List<AttendeesInfo> attendences = eventAttendencesRepository.selectAttendeesInfo(eventCd);
        List<File> fileList = fileMapper.selectFileByEventCd(eventCd);
        Place place = event.getPlace(); // Event 내부에 Place 객체 포함

        return new EventDetailResponse(event, attendences, fileList, place);
    }

    @Transactional // 트랜잭션 적용
    public int insertTeamEvent(EventCreateRequest request, MultipartFile[] files){
        String eventCd = "evnt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String userId = request.getUserId();

        Event detail = new Event();

        detail.setEventCd(eventCd);
        detail.setUserId(userId);
        detail.setWorkspaceCd(request.getWorkspaceCd());
        detail.setTitle(request.getTitle());
        detail.setDescription(request.getDescription());
        detail.setStartDatetime(request.getStartDatetime());
        detail.setEndDatetime(request.getEndDatetime());
        detail.setColor(request.getColor());
        detail.setIsShared("1"); 
        detail.setProgressStatus(request.getProgressStatus());
        detail.setPriority(request.getPriority());
        detail.setCreatedDate(LocalDateTime.now());
        detail.setNotifyTime(request.getNotifyTime());

        int events = teamEventMapper.insertTeamEvent(detail);

        // 장소 정보 저장 (Event 도메인에 place 필드가 추가되었으므로 PlaceRepository 사용)
        // EventCreateRequest에 장소 정보가 직접 담겨 오지 않고, Event 도메인에 Place 객체가 통째로 들어있지 않다면
        // request.getPlaceName() 등의 getter를 통해 받아와야 합니다.
        // 현재 EventCreateRequest DTO를 알 수 없으므로, PlaceService의 insertPlaceAndEvent와 유사하게
        // request에서 장소 필드를 직접 가져와서 Place 객체를 생성하는 방식으로 유지합니다.
        if (request.getPlaceName() != null && !request.getPlaceName().isBlank() && request.getLat() != null) {
            Place place = new Place();
            place.setEvent_cd(eventCd); // PLACE 테이블의 event_cd 필드는 snake_case 유지
            place.setWorkspace_cd(request.getWorkspaceCd());
            place.setPlace_nm(request.getPlaceName());
            place.setAddress(request.getAddress());
            place.setPlace_id(request.getPlaceId());
            place.setLat(request.getLat());
            place.setLng(request.getLng());
            placeMapper.insertPlace(place);
        }

        List<String> attendenceIds = workspaceMemberMapper.getWorkspaceMemberId(request.getWorkspaceCd());
        // 참가자 삽입
        if (attendenceIds != null && !attendenceIds.isEmpty()) { // size() > 0 대신 isEmpty() 권장
            for(String attendId : attendenceIds){
                eventAttendencesRepository.insertEventAttendences(eventCd, attendId);
            }
        }

        // 파일추가
        uploadFiles(eventCd, userId, files);

        insertMentionNotification(eventCd, "NEW");
        return events;
    }

    @Transactional // 트랜잭션 적용
    public int updateTeamEvent(EventUpdateRequest eventUpdateRequest, List<String> deletedFileIds, MultipartFile[] insertedFiles){
        // EventUpdateRequest의 isShared 필드도 'Y'/'N'으로 통일해야 할 수 있습니다.
        // 현재 EventUpdateRequest DTO 구조를 모르므로, 이 부분은 DTO에 맞게 조정 필요
        // 예시: eventUpdateRequest.setIsShared("Y");

        int events = teamEventMapper.updateTeamEvent(eventUpdateRequest);
        String eventCd = eventUpdateRequest.getEventCd();
        String userId = eventUpdateRequest.getUserId();

        boolean placeExists = placeMapper.checkPlaceExistsByEventCd(eventCd) > 0;
        boolean newPlaceDataExists = eventUpdateRequest.getPlaceName() != null && !eventUpdateRequest.getPlaceName().isBlank() && eventUpdateRequest.getLat() != null;

        if (newPlaceDataExists) {
            Place place = new Place();
            place.setEvent_cd(eventCd);
            place.setWorkspace_cd(eventUpdateRequest.getWorkspaceCd());
            place.setPlace_nm(eventUpdateRequest.getPlaceName());
            place.setAddress(eventUpdateRequest.getAddress());
            place.setPlace_id(eventUpdateRequest.getPlaceId());
            place.setLat(eventUpdateRequest.getLat());
            place.setLng(eventUpdateRequest.getLng());
            if (placeExists) {
                placeMapper.updatePlace(place);
            } else {
                placeMapper.insertPlace(place);
            }
        } else if (placeExists) {
            placeMapper.deletePlaceByEventCd(eventCd);
        }

        //삭제된파일
        if (deletedFileIds != null && !deletedFileIds.isEmpty()) { // size() > 0 대신 isEmpty() 권장
            for(String fileId:deletedFileIds){
                fileMapper.updateFileActiveByEventCdAndFileId(eventCd, fileId);
            }
        }

        //추가된파일
        uploadFiles(eventCd, userId, insertedFiles);

        insertMentionNotification(eventCd, "MODIFY");
        return events;
    }

    @Transactional // 트랜잭션 적용
    public int deleteTeamEvent(String eventCd, String userId){
        insertMentionNotification(eventCd, "DELETE");
        fileMapper.deleteFileByEventCd(eventCd);
        // Place 정보도 함께 삭제 (Event 삭제보다 먼저 호출되어야 외래키 제약조건 위반 방지)
        placeMapper.deletePlaceByEventCd(eventCd);
        int attendences = eventAttendencesRepository.deleteAttendeesByEventCd(eventCd);
        int events = teamEventMapper.deleteTeamEvent(eventCd, userId);
        return events;
    }

    public void uploadFiles(String eventCd, String userId, MultipartFile[] files) {
        //파일 s3 업로드 + 테이블에 삽입
        if (files != null && files.length > 0) {
            for (MultipartFile file : files) {
                String filePath = s3Uploader.upload(file, "event-files"); // S3 업로드
                File insertFileRequest = File.builder()
                        .fileId(UUID.randomUUID().toString())
                        .eventCd(eventCd)
                        .fileNm(file.getOriginalFilename())
                        .fileType(file.getContentType())
                        .filePath(filePath)
                        .fileSize(file.getSize())
                        .uploadedBy(userId)
                        .build();

                fileMapper.insertFile(insertFileRequest);

            }
        }
    }

    public ResponseEntity<byte[]> downloadFile(String fileId) throws IOException {
        File file = fileMapper.selectFileByFileId(fileId);
        String key = extractKeyFromUrl(file.getFilePath());
        byte[] bytes = s3Uploader.download(key);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + URLEncoder.encode(file.getFileNm(), "UTF-8") + "\"")
                .body(bytes);
    }

    private String extractKeyFromUrl(String url) {
        URI uri = URI.create(url);
        return uri.getPath().substring(1); // 앞에 '/' 제거
    }

    private void insertMentionNotification(String eventCd, String notiState) {
        // 멘션
        List<AttendeesInfo> attendeesInfos=eventAttendencesRepository.selectAttendeesInfo(eventCd);
        if (attendeesInfos != null && !attendeesInfos.isEmpty()) {
            for(AttendeesInfo info :attendeesInfos){
                String attendId = info.getUserId();
                String notiCd="noti_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
                MentionNotification noti = new MentionNotification(notiCd, eventCd, attendId, notiState,"N" );
                mentionNotificationMapper.insertMentionNotification(noti);
            }
        }
    }
}