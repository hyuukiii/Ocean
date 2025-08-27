package com.example.ocean.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface WorkspaceMemberMapper {
    String selectMemberEmail(@Param("workspaceCd")String workspaceCd, @Param("userId")String userId);
    List<String> getWorkspaceMemberId(@Param("workspaceCd") String workspaceCd);
}
