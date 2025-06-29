    // 페이지 로드 시 즉시 사용자 정보 표시
    document.addEventListener('DOMContentLoaded', function() {
        updateAuthUI();
        loadWorkspaces(); // 워크스페이스 목록 로드 추가

        // 임시로 타임리프에서 받은 사용자 정보 사용
        const userPrincipal = /*[[${#authentication?.principal}]]*/ null;
        if (userPrincipal) {
            displayUserInfo(userPrincipal);
        }

        // 찜하기 폼 이벤트 처리
        const favoriteForm = document.getElementById('favoriteForm');
        if (favoriteForm) {
            favoriteForm.addEventListener('submit', handleFavoriteSubmit);
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

    // ========== 워크스페이스 관련 기능 추가 ==========

    // 워크스페이스 목록 로드
    async function loadWorkspaces() {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        try {
            const response = await fetch('/api/workspaces', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (response.ok) {
                const workspaces = await response.json();
                displayWorkspaces(workspaces);
            } else {
                console.error('워크스페이스 목록 조회 실패:', response.status);
            }
        } catch (error) {
            console.error('워크스페이스 목록 조회 실패:', error);
        }
    }

    // 워크스페이스 목록 표시
    function displayWorkspaces(workspaces) {
        const container = document.querySelector('.workspace-list');
        if (!container) return;

        // 기존 내용 제거 (타임리프로 렌더링된 내용 유지)
        // container.innerHTML = '';

        if (!workspaces || workspaces.length === 0) {
            // 워크스페이스가 없는 경우는 이미 타임리프에서 처리
            return;
        }

        // 워크스페이스 목록이 이미 타임리프로 렌더링되어 있으므로
        // 추가적인 이벤트 리스너만 연결
        attachWorkspaceEventListeners();
    }

    // 워크스페이스 이벤트 리스너 연결
    function attachWorkspaceEventListeners() {
        // 워크스페이스 항목 클릭 이벤트
        document.querySelectorAll('.workspace-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // 체크박스나 라벨 클릭은 제외
                if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                    return;
                }

                const workspaceCd = this.dataset.workspaceCd;
                if (workspaceCd) {
                    enterWorkspace(workspaceCd);
                }
            });
        });
    }

    // 워크스페이스 입장
    async function enterWorkspace(workspaceCd) {
        const token = localStorage.getItem('accessToken');

        try {
            // 입장 시간 업데이트
            await fetch(`/api/workspaces/${workspaceCd}/enter`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            // 워크스페이스 메인 페이지로 이동
            window.location.href = `/workspace/${workspaceCd}/main`;

        } catch (error) {
            console.error('워크스페이스 입장 실패:', error);
            alert('워크스페이스 입장에 실패했습니다.');
        }
    }

    // 찜하기/찜 해제 처리
    async function handleFavoriteSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const action = e.submitter.value; // 'favorite' or 'unfavorite'
        const selectedWorkspaces = formData.getAll('selectedWorkspaces');

        if (selectedWorkspaces.length === 0) {
            alert('워크스페이스를 선택해주세요.');
            return;
        }

        const token = localStorage.getItem('accessToken');
        const isFavorite = action === 'favorite';

        try {
            // 선택된 워크스페이스들에 대해 찜하기 상태 업데이트
            for (const workspaceCd of selectedWorkspaces) {
                await fetch(`/api/workspaces/${workspaceCd}/favorite`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ favorite: isFavorite })
                });
            }

            alert(isFavorite ? '찜하기가 완료되었습니다.' : '찜하기가 해제되었습니다.');

            // 페이지 새로고침하여 업데이트된 상태 표시
            location.reload();

        } catch (error) {
            console.error('찜하기 처리 실패:', error);
            alert('처리 중 오류가 발생했습니다.');
        }
    }

    // 워크스페이스 검색 기능 (선택적)
    function searchWorkspaces(keyword) {
        const items = document.querySelectorAll('.workspace-item');

        items.forEach(item => {
            const name = item.querySelector('.space-text').textContent.toLowerCase();
            if (name.includes(keyword.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 워크스페이스 필터링 (찜한 것만 보기)
    function filterFavorites(showOnlyFavorites) {
        const items = document.querySelectorAll('.workspace-item');

        items.forEach(item => {
            const hasFavorite = item.querySelector('.favorite-heart') !== null;
            if (showOnlyFavorites && !hasFavorite) {
                item.style.display = 'none';
            } else {
                item.style.display = 'flex';
            }
        });
    }

    // 초대 코드 복사 기능
    function copyInviteCode(inviteCode) {
        navigator.clipboard.writeText(inviteCode)
            .then(() => {
                alert('초대 코드가 복사되었습니다: ' + inviteCode);
            })
            .catch(err => {
                console.error('복사 실패:', err);
                // 폴백: 수동으로 선택하도록 안내
                prompt('초대 코드를 복사하세요:', inviteCode);
            });
    }