package com.example.ocean.mapper;


import com.example.ocean.domain.File;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FileMapper {

    int insertFile(File file);
    List<File> selectFileByEventCd(@Param("eventCd")String eventCd);
    File selectFileByFileId(@Param("fileId")String fileId);
    int updateFileActiveByEventCdAndFileId(@Param("eventCd") String eventCd, @Param("fileId") String fileId);

    void deleteFileByEventCd(@Param("eventCd")String eventCd);
}
