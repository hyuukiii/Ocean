// HTML 페이지 마다 추가 할 토큰 기능 자바스크립트 페이지마다 무조건 추가 해주기!!
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