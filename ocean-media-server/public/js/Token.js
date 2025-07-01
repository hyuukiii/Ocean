// HTML 페이지 마다 추가 할 토큰 기능 자바스크립트 페이지마다 무조건 추가 해주기!!

// JWT 토큰 파싱 함수 추가
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('JWT 파싱 에러:', e);
        return null;
    }
}

// 토큰 가져오기 (localStorage 또는 쿠키에서)
function getAccessToken() {
    // 1. localStorage에서 먼저 확인
    let token = localStorage.getItem('accessToken');

    // 2. 없으면 쿠키에서 tempAccessToken 확인
    if (!token) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'tempAccessToken') {
                token = decodeURIComponent(value);
                // localStorage에 저장
                localStorage.setItem('accessToken', token);
                console.log('tempAccessToken을 localStorage로 이동');
                break;
            }
        }
    }

    return token;
}

// 토큰에서 사용자 정보 가져오기 (수정된 버전)
function getUserInfoFromToken() {
    const token = getAccessToken();  // ⭐ localStorage.getItem 대신 getAccessToken 사용
    if (!token) return null;

    const payload = parseJwt(token);
    return {
        userId: payload.sub || payload.userId,
        userName: payload.name || payload.userName || payload.userNm
    };
}

// 토큰 갱신 함수
    async function refreshAccessToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include' // 쿠키(리프레시 토큰) 포함
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                return data.accessToken;
            } else {
                // 리프레시 토큰도 만료됨 - 로그인 페이지로
                window.location.href = '/login';
                return null;
            }
        } catch (error) {
            console.error('토큰 갱신 실패:', error);
            window.location.href = '/login';
            return null;
        }
    }

    // API 요청 래퍼 함수
    async function apiRequest(url, options = {}) {
        let token = localStorage.getItem('accessToken');

        // 첫 번째 시도
        let response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': 'Bearer ' + token
            }
        });

        // 401 에러면 토큰 갱신 후 재시도
        if (response.status === 401) {
            token = await refreshAccessToken();
            if (token) {
                response = await fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        'Authorization': 'Bearer ' + token
                    }
                });
            }
        }

        return response;
    }

    // 페이지 로드 시 실행
    document.addEventListener('DOMContentLoaded', function() {
        const token = localStorage.getItem('accessToken');

        // ocean-video-chat-complete.html은 예외 처리
            if (window.location.pathname.includes('ocean-video-chat-complete')) {
                return; // 토큰 체크 스킵 (ocean-video-chat.js에서 처리)
            }

        if (!token) {
            // 토큰이 없으면 로그인 페이지로
            window.location.href = '/login';
            return;
        }

        // 모든 AJAX 요청에 토큰 추가 (jQuery 사용 시)
        if (window.jQuery) {
            $.ajaxSetup({
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                error: function(xhr) {
                    if (xhr.status === 401) {
                        // 토큰 만료 시 갱신
                        refreshAccessToken().then(newToken => {
                            if (newToken) {
                                // 원래 요청 재시도
                                this.headers = {'Authorization': 'Bearer ' + newToken};
                                $.ajax(this);
                            }
                        });
                    }
                }
            });
        }
    });