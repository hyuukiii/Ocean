package com.example.ocean;

import com.example.ocean.dto.response.MailInfo;
import com.example.ocean.mapper.CalendarEventMapper;
import com.example.ocean.mapper.EventAttendencesMapper;
import com.example.ocean.mapper.WorkspaceMapper;
import com.example.ocean.mapper.WorkspaceMemberMapper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.ArrayList;
import java.util.List;


@RequiredArgsConstructor
//@SpringBootApplication
@EnableScheduling
@Component
public class EventAlarmMailScheduler {

    private final CalendarEventMapper calendarEventMapper;
    private final WorkspaceMapper workspaceMapper;
    private final EventAttendencesMapper eventAttendencesRepository;
    private final WorkspaceMemberMapper workspaceMemberMapper;

    @Autowired
    private JavaMailSender  emailSender;

    // 초(0–59) 분(0–59) 시(0–23) 일(1–31) 월(1–12) 요일(0–7)(0과 7은 일요일)
    @Scheduled(cron = "0 0 9 * * *")
    public void alarm9am() throws MessagingException {
        getAlarmMessage();
    }

    public void sendEmail(MailInfo mailInfo) throws MessagingException {

        MimeMessage message = emailSender.createMimeMessage();
        MimeMessageHelper helper = new  MimeMessageHelper(message, false, "UTF-8");

        helper.setFrom("dltnalssumin@gmail.com");//수정 필요
        String[] recipients = mailInfo.getAttendencdEmails().toArray(new String[0]);
        helper.setTo(recipients);
        helper.setSubject(mailInfo.getTitle()+" 일정 알림입니다");//event.getTitle()+"일정 알림입니다"

        //helper.setText("Ocean에서 "+mailInfo.getWorkspaceName()+"의 일정을 확인하세요!");//workspacename 의 일정을 확인하세요??

        String htmlContent = String.format("""
            <html>
            <body>
                <h3>안녕하세요!</h3>
                <p><a href="https://ocean-app.click/">Ocean</a>에서 %s의 일정을 확인하세요!</p>
            </body>
            </html>
            """, mailInfo.getWorkspaceName());

        helper.setText(htmlContent, true);

        emailSender.send(message);

    }

    public void getAlarmMessage() throws MessagingException {
        List<String> eventCds = calendarEventMapper.selectTodayAlarm();
        if (eventCds != null && !eventCds.isEmpty()) {
            for(String eventCd : eventCds){
                //이벤트 제목 찾기(EVENTS테이블)
                MailInfo mailInfo = calendarEventMapper.selectMailInfo(eventCd);
                //이벤트 워크스페이스 이름 찾기(WORKSPACE)
                String workspaceCd = mailInfo.getWorkspaceCd();
                String workspaceName = workspaceMapper.findWorkspaceNameByWorkspaceCd(workspaceCd);
                //이벤트 참석자 이메일 찾기()
                List<String> userIds = eventAttendencesRepository.selectAttendence(eventCd);
                List<String> attendencdEmails  = new ArrayList<>();
                if (userIds != null && !userIds.isEmpty()) {
                    for(String userId : userIds){
                        String email = workspaceMemberMapper.selectMemberEmail(workspaceCd, userId);
                        attendencdEmails.add(email);
                    }
                }
                mailInfo.setWorkspaceName(workspaceName);
                mailInfo.setAttendencdEmails(attendencdEmails);
                System.out.println(mailInfo);

                sendEmail(mailInfo);
            }
        }

    }

}
