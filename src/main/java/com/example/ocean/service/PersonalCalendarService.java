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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;


import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PersonalCalendarService {

    private final CalendarEventtMapper calendarEventtMapper;
    private final PlaceMapper placeMapper;
    private final FileMapper fileMapper;
    private final S3Uploader s3Uploader;
    private final EventAttendencesRepository eventAttendencesRepository;
    private final MentionNotificationMapper mentionNotificationMapper;

    // 일정 crud

    public List<CalendarResponse> getPersonalEvents(String userId, String workspaceCd){
        return calendarEventtMapper.selectPersonalCalendar(userId, workspaceCd);
    }

    @Transactional
    public int createPersonalEvent(EventCreateRequest request, List<String> attendenceIds, MultipartFile[] files){

        String eventCd = "evnt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String userId = request.getUserId();


        Event event = new Event();

        event.setEventCd(eventCd);
        event.setUserId(userId);
        event.setWorkspaceCd(request.getWorkspaceCd());
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartDatetime(request.getStartDatetime());
        event.setEndDatetime(request.getEndDatetime());
        event.setColor(request.getColor());
        event.setIsShared(request.getIsShared());
        event.setProgressStatus(request.getProgressStatus());
        event.setPriority(request.getPriority());
        event.setNotifyTime(request.getNotifyTime());
        event.setCreatedDate(LocalDateTime.now());

        int result = calendarEventtMapper.insertPersonalEvent(event);

        if (request.getPlaceName() != null && !request.getPlaceName().isBlank() && request.getLat() != null && request.getLng() != null) {
            Place place = new Place();
            place.setEvent_cd(eventCd);
            place.setWorkspace_cd(request.getWorkspaceCd());
            place.setPlace_nm(request.getPlaceName());
            place.setAddress(request.getAddress());
            place.setPlace_id(request.getPlaceId());
            place.setLat(request.getLat());
            place.setLng(request.getLng());
            placeMapper.insertPlace(place);
        }

        // 참가자 삽입
        if (attendenceIds != null && !attendenceIds.isEmpty()) {
            for(String attendId : attendenceIds){
                eventAttendencesRepository.insertEventAttendences(eventCd, attendId);
            }
        }

        // 파일추가
        uploadFiles(eventCd, userId, files);

        insertMentionNotification(eventCd, "NEW");

        return result;
    }

    public EventDetailResponse getPersonalEventDetail(String eventCd){

        Event event = calendarEventtMapper.selectPersonalEvent(eventCd);

        if (event == null) {
            return null;
        }

        // 파일과 참석자 정보는 그대로 별도 조회.
        List<File> fileList = fileMapper.selectFileByEventCd(eventCd);
        List<AttendeesInfo> attendences = eventAttendencesRepository.selectAttendeesInfo(eventCd);

        // [수정] 별도의 placeRepository 호출 없이, event 객체에 담겨온 place 정보를 바로 가져옵니다.
        Place place = event.getPlace();

        // 생성자에 조회된 모든 정보를 담아 반환.
        EventDetailResponse response = new EventDetailResponse(event, attendences, fileList, place);

        return response;
    }

    @Transactional
    public int updatePersonalEvent(EventUpdateRequest eventUpdateRequest, List<String> attendenceIds, List<String> deletedFileIds, MultipartFile[] insertedFiles){
        int events = calendarEventtMapper.updatePersonalEvent(eventUpdateRequest);
        String eventCd = eventUpdateRequest.getEventCd();
        String userId = eventUpdateRequest.getUserId();

        boolean placeExists = placeMapper.checkPlaceExistsByEventCd(eventCd) > 0;
        boolean newPlaceDataExists = eventUpdateRequest.getPlaceName() != null && !eventUpdateRequest.getPlaceName().isBlank() && eventUpdateRequest.getLat() != null;

        if (newPlaceDataExists) { // 요청에 새로운 장소 정보가 있을 경우
            Place place = new Place();
            place.setEvent_cd(eventCd);
            place.setWorkspace_cd(eventUpdateRequest.getWorkspaceCd());
            place.setPlace_nm(eventUpdateRequest.getPlaceName());
            place.setAddress(eventUpdateRequest.getAddress());
            place.setPlace_id(eventUpdateRequest.getPlaceId());
            place.setLat(eventUpdateRequest.getLat());
            place.setLng(eventUpdateRequest.getLng());

            if (placeExists) { // 기존 장소가 있었으면 -> 업데이트
                placeMapper.updatePlace(place);
            } else { // 기존 장소가 없었으면 -> 새로 삽입
                placeMapper.insertPlace(place);
            }
        } else { // 요청에 새로운 장소 정보가 없을 경우
            if (placeExists) { // 기존 장소가 있었으면 -> 삭제
                placeMapper.deletePlaceByEventCd(eventCd);
            }
        }

        // 3. 참석자 정보 업데이트 (기존 정보 모두 삭제 후 새로 삽입)
        if (attendenceIds != null) {
            eventAttendencesRepository.deleteAttendeesByEventCd(eventUpdateRequest.getEventCd());
            if (!attendenceIds.isEmpty()) {
                for (String attendId : attendenceIds) {
                    eventAttendencesRepository.insertEventAttendences(eventUpdateRequest.getEventCd(), attendId);
                }
            }
        }
        //삭제된파일
        if (deletedFileIds != null && !deletedFileIds.isEmpty()) {
            for(String fileId:deletedFileIds){
                fileMapper.updateFileActiveByEventCdAndFileId(eventCd, fileId);
            }
        }

        //추가된파일
        uploadFiles(eventCd, userId, insertedFiles);
        //멘션
        insertMentionNotification(eventCd, "MODIFY");
        return events;
    }

    @Transactional
    public int deletePersonalEvent(String eventCd, String userId){
        //파일 참석자 먼저 삭제하고 이벤트 삭제하기
        insertMentionNotification(eventCd, "DELETE");

        fileMapper.deleteFileByEventCd(eventCd);
        eventAttendencesRepository.deleteAttendeesByEventCd(eventCd);
        return calendarEventtMapper.deletePersonalEvent(eventCd);
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
