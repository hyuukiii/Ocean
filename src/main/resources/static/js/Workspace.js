    // 페이지 로드 시 즉시 사용자 정보 표시
    document.addEventListener('DOMContentLoaded', function() {
        updateAuthUI();


        // 워크스페이스 상세 페이지로 이동
        window.goToDetail = function(element) {
            const workspaceCd = element.getAttribute('data-id');
            if (workspaceCd) {
                // ✅ 수정된 부분: /wsmain 으로 직접 가지 않고,
                // 서버의 컨트롤러 주소(/workspace/{workspaceCd})를 호출합니다.
                location.href = `/workspace/${workspaceCd}`;
            }
        };

        // 임시로 타임리프에서 받은 사용자 정보 사용
        const userPrincipal = /*[[${#authentication?.principal}]]*/ null;
        if (userPrincipal) {
            displayUserInfo(userPrincipal);
        }
    });

    function updateAuthUI() {
        const accessToken = localStorage.getItem('accessToken');
        const loginBtn = document.querySelector('.login-btn');
        const userInfo = document.querySelector('.user-info');

        if (accessToken) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';

            // OAuth2 로그인 후 임시 사용자 정보 표시
            const tempUserName = localStorage.getItem('userName');
            const tempUserImg = localStorage.getItem('userImg');

            if (tempUserName || tempUserImg) {
                document.querySelector('.user-avatar').src = tempUserImg || '/images/default-avatar.png';
                document.querySelector('.user-name').textContent = tempUserName || '사용자';
            } else {
                // API 호출
                fetchUserInfo();
            }
        } else {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    }

    async function fetchUserInfo() {
        const token = localStorage.getItem('accessToken');

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (response.ok) {
                const user = await response.json();
                displayUserInfo(user);
            } else {
                console.error('사용자 정보 조회 실패:', response.status);
                // 기본값 표시
                document.querySelector('.user-avatar').src = '/images/default-avatar.png';
                document.querySelector('.user-name').textContent = '사용자';
            }
        } catch (error) {
            console.error('사용자 정보 조회 실패:', error);
            // 기본값 표시
            document.querySelector('.user-avatar').src = '/images/default-avatar.png';
            document.querySelector('.user-name').textContent = '사용자';
        }
    }

    function displayUserInfo(user) {
        // AuthController의 응답 형식에 맞게 수정
        document.querySelector('.user-avatar').src = user.userProfileImg || '/images/default-avatar.png';
        document.querySelector('.user-name').textContent = user.userName || '사용자';
    }

    // 로그아웃
        async function logout() {
            try {
                // 1. 서버에 로그아웃 요청
                const token = localStorage.getItem('accessToken');
                if (token) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        },
                        credentials: 'include'
                    });
                }
            } catch (error) {
                console.error('서버 로그아웃 요청 실패:', error);
            }

            // 2. 로컬 스토리지 완전 정리
            localStorage.removeItem('accessToken');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userName');
            localStorage.removeItem('userImg');

            // 3. 세션 스토리지도 정리 (만약 사용한다면)
            sessionStorage.clear();

            // 4. 쿠키 삭제 (리프레시 토큰 등)
            document.cookie.split(";").forEach(function(c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // 5. 메인 페이지로 이동
            window.location.href = '/';
        }