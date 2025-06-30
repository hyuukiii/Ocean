package com.example.ocean.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
public class OAuth2DebugController {
    
    @GetMapping("/debug/session")
    public Map<String, Object> debugSession(HttpServletRequest request) {
        Map<String, Object> result = new HashMap<>();
        
        HttpSession session = request.getSession(false);
        if (session != null) {
            result.put("sessionId", session.getId());
            result.put("creationTime", session.getCreationTime());
            result.put("lastAccessedTime", session.getLastAccessedTime());
            result.put("maxInactiveInterval", session.getMaxInactiveInterval());
            result.put("isNew", session.isNew());
            
            Map<String, Object> attributes = new HashMap<>();
            Enumeration<String> attributeNames = session.getAttributeNames();
            while (attributeNames.hasMoreElements()) {
                String name = attributeNames.nextElement();
                attributes.put(name, session.getAttribute(name));
            }
            result.put("attributes", attributes);
        } else {
            result.put("session", "No session exists");
        }
        
        result.put("requestedSessionId", request.getRequestedSessionId());
        result.put("requestedSessionIdValid", request.isRequestedSessionIdValid());
        result.put("requestedSessionIdFromCookie", request.isRequestedSessionIdFromCookie());
        result.put("requestedSessionIdFromURL", request.isRequestedSessionIdFromURL());
        
        return result;
    }
}