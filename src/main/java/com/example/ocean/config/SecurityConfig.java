package com.example.ocean.config;

import com.example.ocean.security.jwt.JwtAuthenticationFilter;
import com.example.ocean.security.jwt.JwtTokenProvider;
import com.example.ocean.security.oauth.CustomOAuth2UserService;
import com.example.ocean.security.oauth.OAuth2AuthenticationFailureHandler;
import com.example.ocean.security.oauth.OAuth2AuthenticationSuccessHandler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    @Value("${app.frontend.url:https://ocean-app.click}")
    private String frontendUrl;

    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;

    @Autowired
    private OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    @Autowired
    private OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private ClientRegistrationRepository clientRegistrationRepository;
    
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(
                new HttpSessionSecurityContextRepository(),
                new RequestAttributeSecurityContextRepository()
        );
    }

    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico")
                .requestMatchers("/error");
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session
                        // OAuth2 인증을 위해 ALWAYS로 설정
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation().migrateSession()
                        .invalidSessionUrl("/login")
                        .maximumSessions(1)
                        .maxSessionsPreventsLogin(false)
                )
                .authorizeHttpRequests(authorize -> authorize
                        // 정적 리소스 "/favicon-svg.svg"
                        .requestMatchers("/css/**", "/js/**", "/images/**" ,"/favicon.ico", "/favicon.svg", "/favicon-*.png", "/apple-touch-icon.png").permitAll()
                        .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()


                        // 녹화 API는 인증 없이 접근 가능 (내부 서버 간 통신)
                        .requestMatchers("/api/recordings/**").permitAll()  // ⭐ 추가
                        // .requestMatchers("/api/public/**").permitAll()

                        // 워크스페이스 관련 경로 추가
                        .requestMatchers("/workspace", "/workspace/**").authenticated()

                        // 메인 페이지
                        .requestMatchers("/", "/index", "/main/**").permitAll()

                        // API 및 인증 관련
                        .requestMatchers("/api/auth/**", "/login", "/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/oauth2-redirect.html", "/error", "/error/**").permitAll()

                        // 디버그 및 모니터링
                        .requestMatchers("/oauth2-debug", "/debug/session", "/actuator/health").permitAll()

                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/login")
                        .authorizationEndpoint(authorization -> authorization
                                .baseUri("/oauth2/authorize")
                                .authorizationRequestResolver(customAuthorizationRequestResolver())
                        )
                        .redirectionEndpoint(redirection -> redirection
                                .baseUri("/login/oauth2/code/*")
                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                        .failureHandler(oAuth2AuthenticationFailureHandler)
                )
                .securityContext(securityContext -> securityContext
                        .securityContextRepository(securityContextRepository())
                        .requireExplicitSave(true)
                );

        // JWT 필터 추가
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
    }

    @Bean
    public OAuth2AuthorizationRequestResolver customAuthorizationRequestResolver() {
        DefaultOAuth2AuthorizationRequestResolver defaultResolver =
                new DefaultOAuth2AuthorizationRequestResolver(
                        clientRegistrationRepository, "/oauth2/authorize");

        return new OAuth2AuthorizationRequestResolver() {
            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
                OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request);
                return customizeAuthorizationRequest(authorizationRequest);
            }

            @Override
            public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
                OAuth2AuthorizationRequest authorizationRequest =
                        defaultResolver.resolve(request, clientRegistrationId);
                return customizeAuthorizationRequest(authorizationRequest);
            }

            private OAuth2AuthorizationRequest customizeAuthorizationRequest(
                    OAuth2AuthorizationRequest authorizationRequest) {
                if (authorizationRequest == null) {
                    return null;
                }

                // 추가 파라미터 설정 (필요시)
                Map<String, Object> additionalParameters = new HashMap<>(
                        authorizationRequest.getAdditionalParameters());

                // 무한 리다이렉트 방지를 위한 state 검증 강화
                additionalParameters.put("prompt", "select_account");
                
                // 세션 관련 파라미터 추가
                additionalParameters.put("access_type", "offline");
                
                log.debug("OAuth2 인증 요청 파라미터: {}", additionalParameters);

                return OAuth2AuthorizationRequest.from(authorizationRequest)
                        .additionalParameters(additionalParameters)
                        .build();
            }
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 특정 도메인만 허용하도록 수정 (보안 강화)
        configuration.setAllowedOrigins(Arrays.asList(
                frontendUrl,
                "https://ocean-app.click",
                "http://localhost:3000", // 개발용
                "http://localhost:8080"  // 개발용
        ));

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", 
            "Cache-Control", "Accept", "Origin", "X-Auth-Token"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Auth-Token"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}