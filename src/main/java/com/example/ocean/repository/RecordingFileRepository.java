package com.example.ocean.repository;

import com.example.ocean.entity.RecordingFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RecordingFileRepository extends JpaRepository<RecordingFile, String> {

    List<RecordingFile> findByWorkspaceCdOrderByCreatedDateDesc(String workspaceCd);

    List<RecordingFile> findByRoomCdOrderByCreatedDateDesc(String roomCd);

    List<RecordingFile> findByRecorderIdOrderByCreatedDateDesc(String recorderId);

    List<RecordingFile> findByRecordingStatus(String status);

    // 특정 워크스페이스의 완료된 녹화만 조회
    List<RecordingFile> findByWorkspaceCdAndRecordingStatusOrderByCreatedDateDesc(
            String workspaceCd, String status
    );
}
