    // 페이지 로드 시 즉시 사용자 정보 표시
    document.addEventListener('DOMContentLoaded', function() {
        updateAuthUI();

        // 워크스페이스 상세 페이지로 이동 + 입장 시간 기록
        window.goToDetail = function(element) {
            const workspaceCd = element.getAttribute('data-id');
            // 워크스페이스 입장 시간 기록 후 이동
            fetch(`/api/workspaces/${workspaceCd}/enter`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
                }
            }).then(response => {
                if (response.ok) {
                    sessionStorage.setItem('currentWorkspaceCd', workspaceCd);
                    window.location.href = "/workspace/" + workspaceCd;
                } else {
                    alert("입장 실패");
                }
            }).catch(error => {
                console.error("입장 요청 실패:", error);
            });
        };


        // 워크스페이스 리스트(/workspace)로 돌아올 때 퇴장 처리
        window.addEventListener("pageshow", function () {
            if (window.location.pathname === "/workspace") {
                sendQuitRequest(false);  // 일반 fetch 사용
                sessionStorage.removeItem('currentWorkspaceCd');  // ✔️ 퇴장 후 초기화
            }
        });

        function sendQuitRequest(useBeacon = false) {
            const workspaceCd = sessionStorage.getItem('currentWorkspaceCd');
            if (!workspaceCd) return;

            const url = `/api/workspaces/${workspaceCd}/exit`;
            const token = localStorage.getItem('accessToken');

            if (useBeacon && navigator.sendBeacon) {
                const blob = new Blob([], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            } else {
                fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    credentials: 'include'
                }).catch(error => {
                    console.error("퇴장 시간 업데이트 실패:", error);
                });
            }
        }

        // 브라우저 탭 닫기 또는 새로고침 시 퇴장 처리
        window.addEventListener("beforeunload", function () {
            sendQuitRequest(true);  // sendBeacon 사용
        });

        // 임시로 타임리프에서 받은 사용자 정보 사용
        const userPrincipal = /*[[${#authentication?.principal}]]*/ null;
        if (userPrincipal) {
            displayUserInfo(userPrincipal);
        }
    });

// 워크스페이스 코드 저장 (예: 전역에서 쓰도록)
const currentWorkspaceCd = extractWorkspaceCdFromUrl();  // 아래 함수 참조

// 1. 워크스페이스 리스트로 돌아왔을 때 퇴장 시간 업데이트
window.addEventListener("pageshow", function () {
    if (window.location.pathname === "/workspace") {
        sendQuitRequest(false);
    }
});

// 2. 탭 닫기, 새로고침 시에도 퇴장 시간 업데이트 (sendBeacon 사용)
window.addEventListener("beforeunload", function () {
    sendQuitRequest(true);
});

// 퇴장 요청 보내는 함수
function sendQuitRequest(useBeacon = false) {
    if (!currentWorkspaceCd) return;

    const url = `/api/workspaces/${currentWorkspaceCd}/exit`;
    const token = localStorage.getItem('accessToken');

    if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
    } else {
        fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            credentials: 'include'
        }).catch(error => {
            console.error("퇴장 시간 업데이트 실패:", error);
        });
    }
}

// 현재 워크스페이스 코드 추출 (예: /workspace/abcd1234/main → abcd1234)
function extractWorkspaceCdFromUrl() {
    const path = window.location.pathname;  // ex: /workspace/abcd1234/main
    const match = path.match(/^\/workspace\/([^/]+)/);
    return match ? match[1] : null;
}


    // 찜 기능
    document.addEventListener('DOMContentLoaded', function () {
                document.querySelectorAll('input[name="selectedWorkspaces"]').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        const workspaceCd = e.target.value;
                    });
                });

                // 찜/찜 해제 버튼 이벤트 등록
                document.querySelector(".btn-favorite").addEventListener("click", () => {
                    updateFavorites(true);
                });

                document.querySelector(".btn-unfavorite").addEventListener("click", () => {
                    updateFavorites(false);
                });

                function updateFavorites(isFavorite) {
                    const selectedCheckboxes = document.querySelectorAll('input[name="selectedWorkspaces"]:checked');

                    if (selectedCheckboxes.length === 0) {
                        alert("워크스페이스를 선택해주세요.");
                        return;
                    }

                    selectedCheckboxes.forEach((checkbox) => {
                        const workspaceCd = checkbox.value;

                        console.log("요청 URL:", `/api/workspaces/${workspaceCd}/favorite`);

                        fetch(`/api/workspaces/${workspaceCd}/favorite`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ favorite: isFavorite })
                        })
                        .then(response => {
                            if (!response.ok) throw new Error("서버 오류 발생");
                        })
                        .then(() => {
                            alert(isFavorite ? "찜 완료!" : "찜 해제 완료!");
                            location.reload(); // 상태 반영 위해 새로고침
                        })
                        .catch(error => {
                            console.error("에러 발생:", error);
                            alert("처리 중 에러가 발생했습니다.");
                        });
                    });
                }
            });

    async function updateAuthUI() {
        const accessToken = localStorage.getItem('accessToken');
        const loginBtn = document.querySelector('.login-btn');
        const userInfo = document.querySelector('.user-info');

        if (accessToken) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';

            // 항상 최신 정보를 API에서 가져오기
            await fetchUserInfo();
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