// 메인페이지 JS

    // 쿠키에서 tempAccessToken 확인
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function deleteCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    // 디버깅용
    window.addEventListener('error', function(e) {
       console.error('JavaScript 에러:', e.error);
    });

// 하나의 통합된 DOMContentLoaded 이벤트
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 메인 페이지 로드 ===');

    // 1. tempAccessToken 쿠키 확인 및 처리
    const tempToken = getCookie('tempAccessToken');
    if (tempToken) {
        console.log('임시 토큰 쿠키 발견!');

        try {
            // localStorage에 저장
            localStorage.setItem('accessToken', tempToken);
            localStorage.setItem('isAuthenticated', 'true');

            // 임시 쿠키 삭제
            deleteCookie('tempAccessToken');

            console.log('✅ 토큰이 localStorage로 이동 완료');

        } catch (e) {
            console.error('토큰 저장 실패:', e);
        }
    }

    // 2. URL 토큰 파라미터 확인
    checkTokenFromUrl();

    // 3. 인증 상태 확인 및 UI 업데이트
    checkAuthStatus();

    // 4. 타이핑 애니메이션
    setTimeout(typeEffect, 500);

    // 5. 로그아웃 버튼 이벤트 리스너
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

        // URL에서 토큰 파라미터 확인
        function checkTokenFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (token) {
                // 토큰 저장
                localStorage.setItem('accessToken', token);
                localStorage.setItem('isAuthenticated', 'true');

                // URL 파라미터 제거
                window.history.replaceState({}, document.title, '/');

                // UI 업데이트
                checkAuthStatus();
            }
        }

   // 인증 상태 확인 및 UI 업데이트
function checkAuthStatus() {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const accessToken = localStorage.getItem('accessToken');
    const userMenu = document.getElementById('userMenu');
    const loginButton = document.getElementById('loginButton');

    console.log('인증 상태:', isAuthenticated, '토큰:', accessToken ? '있음' : '없음');

    if (isAuthenticated && accessToken) {
        // 로그인 상태
        if (userMenu) userMenu.style.display = 'flex';
        if (loginButton) loginButton.style.display = 'none';

        // 사용자 정보 가져오기 (파라미터 없이 호출)
        fetchUserInfo();
    } else {
        // 로그아웃 상태
        if (userMenu) userMenu.style.display = 'none';
        if (loginButton) loginButton.style.display = 'block';
    }
}

function fetchUserInfo() {  // token 파라미터 제거
    fetchWithAuth('/api/auth/me')
    .then(response => {
        if (!response.ok) {
            throw new Error('인증 실패');
        }
        return response.json();
    })
    // 중복 제거
    .then(data => {
        // 사용자 이름 표시
        const displayName = data.userName || data.email || '사용자';

        // ID가 userName인 요소 찾기 (기존: userEmail)
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = displayName;
        }

        // 이니셜 표시
        const userInitialElement = document.querySelector('.user-initial');
        if (userInitialElement) {
            const initial = displayName.charAt(0).toUpperCase();
            userInitialElement.textContent = initial;
        }

        // 프로필 이미지가 있으면 표시
        if (data.userProfileImg) {
            const userAvatar = document.querySelector('.user-avatar');
            if (userAvatar) {
                userAvatar.innerHTML = `<img src="${data.userProfileImg}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        }
    })
    .catch(error => {
        console.error('사용자 정보 가져오기 실패:', error);
        // 인증 오류 시 로그아웃 처리
        logout();
    });
}

// 쿠키에서 값 가져오기
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// 토큰 갱신 함수
async function refreshAccessToken() {
    try {
        // 쿠키의 리프레시 토큰은 자동으로 전송됨
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'  // 쿠키 포함해서 전송
        });

        if (!response.ok) {
            throw new Error('토큰 갱신 실패');
        }

        const data = await response.json();

        // 새 액세스 토큰 저장
        localStorage.setItem('accessToken', data.accessToken);

        console.log('토큰 갱신 성공');
        return data.accessToken;

    } catch (error) {
        console.error('토큰 갱신 실패:', error);
        // 갱신 실패 시 로그아웃 처리
        logout();
        return null;
    }
}


// API 호출 시 자동 토큰 갱신
async function fetchWithAuth(url, options = {}) {
    let accessToken = localStorage.getItem('accessToken');

    // 첫 번째 시도
    let response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include'  // 쿠키 포함
    });

    // 401 에러면 토큰 갱신 시도
    if (response.status === 401) {
        console.log('액세스 토큰 만료, 갱신 시도...');
        const newToken = await refreshAccessToken();

        if (newToken) {
            // 새 토큰으로 재시도
            response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
        }
    }

    return response;
}

function logout() {
    const accessToken = localStorage.getItem('accessToken');

    // 로컬 스토리지 정리 (먼저 실행)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isAuthenticated');

    // 서버에 로그아웃 요청
    if (accessToken) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,  // JWT 인증
                'Content-Type': 'application/json'
            },
            credentials: 'include'  // 쿠키도 함께 전송
        }).finally(() => {
            // 성공/실패 관계없이 로그인 페이지로
            window.location.href = '/login';
        });
    } else {
        // 토큰이 없어도 로그인 페이지로
        window.location.href = '/login';
    }
}

        // 로그아웃 버튼 이벤트 리스너
        document.getElementById('logoutButton').addEventListener('click', logout);


        // 파티클 생성
        const particlesContainer = document.getElementById('particles');

        function createParticle() {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // 랜덤 위치와 크기 설정
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.animationDuration = Math.random() * 10 + 10 + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';

            particlesContainer.appendChild(particle);

            // 애니메이션이 끝나면 파티클 제거
            setTimeout(() => {
                particle.remove();
            }, 20000);
        }

        // 초기 파티클 생성
        for (let i = 0; i < 30; i++) {
            setTimeout(createParticle, i * 200);
        }

        // 지속적으로 파티클 생성
        setInterval(createParticle, 1000);

        // 마우스 움직임에 따른 배경 효과
        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;

            const wave = document.querySelector('.wave');
            wave.style.transform = `translate(${x * 20 - 10}px, ${y * 20 - 10}px)`;
        });

        // 타이핑 효과
        const textElement = document.getElementById('typing-text');
        const typingSection = document.getElementById('typing-section');
        const featureSection = document.getElementById('feature-section');
        const featureCards = document.getElementById('feature-cards');
        const cardsContainer = document.getElementById('cards-container');
        const pageIndicators = document.getElementById('page-indicators');
        const indicators = document.querySelectorAll('.indicator');
        const prevArrow = document.getElementById('prev-arrow');
        const nextArrow = document.getElementById('next-arrow');
        const ctaButton = document.getElementById('cta-button');
        const textArray = ['Ocean', '프로젝트', '지금 바로 시작'];
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingSpeed = 100;
        let isTypingComplete = false;
        let currentPage = 0;
        let startX, moveX;
        let isDragging = false;
        let typingTimer = null;
        let isTypingSkipped = false;

        // 타이핑 즉시 완료 함수
        function completeTyping() {
            if (isTypingComplete) return; // 이미 완료된 경우 실행하지 않음

            // 타이핑 중인 타이머 정리
            if (typingTimer) {
                clearTimeout(typingTimer);
            }

            // 타이핑 완료 상태로 설정
            isTypingComplete = true;
            isTypingSkipped = true;

            // 타이핑 섹션 즉시 숨기기
            typingSection.classList.add('hide');

            // 빠른 전환을 위한 타이밍 조정
            setTimeout(() => {
                typingSection.style.display = 'none';
                featureSection.style.display = 'block';

                setTimeout(() => {
                    featureSection.classList.add('show');

                    setTimeout(() => {
                        featureCards.style.display = 'block';

                        requestAnimationFrame(() => {
                            featureCards.classList.add('show');
                            pageIndicators.classList.add('show');

                            setTimeout(() => {
                                ctaButton.style.opacity = '1';
                                ctaButton.style.transform = 'translateY(0)';
                            }, 400);
                        });
                    }, 200);
                }, 50);
            }, 500);
        }

        function typeEffect() {
            const currentText = textArray[textIndex];

            if (isDeleting) {
                // 글자 지우기
                textElement.innerHTML = currentText.substring(0, charIndex - 1) + '<span class="typing-cursor"></span>';
                charIndex--;
                typingSpeed = 50;
            } else {
                // 글자 타이핑
                textElement.innerHTML = currentText.substring(0, charIndex + 1) + '<span class="typing-cursor"></span>';
                charIndex++;
                typingSpeed = 100;
            }

            // 단어 완성 후
            if (!isDeleting && charIndex === currentText.length) {
                // 마지막 텍스트는 지우지 않음
                if (textIndex === textArray.length - 1) {
                    // 타이핑 완료 후 기능 섹션으로 전환
                    if (!isTypingComplete) {
                        isTypingComplete = true;
                        // 잠시 대기 후 전환 시작
                        setTimeout(() => {
                            // 타이핑 섹션 부드럽게 페이드아웃
                            typingSection.classList.add('hide');

                            // 페이드아웃 애니메이션이 진행되는 동안 기능 섹션 준비
                            setTimeout(() => {
                                typingSection.style.display = 'none';
                                featureSection.style.display = 'block';

                                // 약간의 지연 후 기능 섹션 페이드인
                                setTimeout(() => {
                                    featureSection.classList.add('show');

                                    // 기능 섹션이 표시된 후 카드 표시
                                    setTimeout(() => {
                                        featureCards.style.display = 'block';

                                        // 부드러운 페이드인을 위해 약간 지연
                                        requestAnimationFrame(() => {
                                            featureCards.classList.add('show');
                                            pageIndicators.classList.add('show');

                                            // CTA 버튼 표시
                            setTimeout(() => {
                                ctaButton.style.opacity = '1';
                                ctaButton.style.transform = 'translateY(0)';
                                            }, 400);
                                        });
                                    }, 200);
                                }, 50);
                            }, 800);
                        }, 1500);
                    }
                    return;
                }
                typingSpeed = 2000; // 단어 완성 후 대기
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex++;
                if (textIndex >= textArray.length) {
                    textIndex = textArray.length - 1;
                }
                typingSpeed = 500; // 다음 단어 시작 전 대기
            }

            typingTimer = setTimeout(typeEffect, typingSpeed);
        }

        // 타이핑 섹션 클릭 이벤트 리스너
        typingSection.addEventListener('click', completeTyping);

        // 페이지 로드 후 타이핑 시작 및 클릭 이벤트 설정
        window.addEventListener('load', () => {
            // 타이핑 효과 시작
            setTimeout(typeEffect, 500);

            // 클릭 시 타이핑 효과 스킵하고 바로 주요 기능 소개로 이동
            document.body.addEventListener('click', skipToFeatureSection);

            // 카드 컨테이너 설정 - 양방향 무한 스크롤을 위한 카드 복제
            setupInfiniteScroll();

            setupEventListeners();
        });

        // 무한 스크롤을 위한 카드 복제 함수
        function setupInfiniteScroll() {
            // 마지막 카드(3번째)를 복제하여 맨 앞에 추가
            const lastCard = document.getElementById('feature-card-3');
            const lastCardClone = lastCard.cloneNode(true);
            lastCardClone.id = 'feature-card-3-clone';
            cardsContainer.insertBefore(lastCardClone, cardsContainer.firstChild);

            // 첫 번째 카드를 복제하여 맨 뒤에 추가
            const firstCard = document.getElementById('feature-card-1');
            const firstCardClone = firstCard.cloneNode(true);
            firstCardClone.id = 'feature-card-1-clone';
            cardsContainer.appendChild(firstCardClone);

            // 초기 위치 설정 - 복제된 마지막 카드 다음(실제 첫 번째 카드)으로 설정
            currentPage = 1; // 실제 첫 번째 카드의 인덱스는 이제 1
            cardsContainer.style.transform = `translateX(-${currentPage * 20}%)`;

            // 인디케이터 초기 설정
            updateIndicators();
        }

        // 인디케이터 업데이트 함수
        function updateIndicators() {
            indicators.forEach((indicator, index) => {
                // 현재 페이지를 실제 카드 인덱스(0,1,2)로 변환
                const realIndex = getRealIndex(currentPage);
                if (index === realIndex) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            });
        }

        // 현재 페이지 인덱스를 실제 카드 인덱스(0,1,2)로 변환하는 함수
        function getRealIndex(pageIndex) {
            if (pageIndex === 0) return 2; // 복제된 마지막 카드는 실제로는 2번째 카드
            if (pageIndex === 4) return 0; // 복제된 첫 번째 카드는 실제로는 0번째 카드
            return pageIndex - 1; // 실제 카드들(인덱스 1,2,3)은 0,1,2로 변환
        }

        // 페이지 이동 함수
        function goToPage(pageIndex) {
            if (pageIndex < 0) {
                pageIndex = 3;
            } else if (pageIndex > 4) {
                pageIndex = 1;
            }

            // 현재 페이지 업데이트
            currentPage = pageIndex;

            // 페이지 이동 애니메이션
            requestAnimationFrame(() => {
                cardsContainer.style.transition = 'transform 0.5s cubic-bezier(0.33, 1, 0.68, 1)';
                cardsContainer.style.transform = `translateX(-${currentPage * 20}%)`;

                // 무한 스크롤 처리
                if (pageIndex === 0 || pageIndex === 4) {
                    // 애니메이션 완료 후 실제 카드로 순간 이동
                    setTimeout(() => {
                        const targetPage = pageIndex === 0 ? 3 : 1;
                        cardsContainer.style.transition = 'none';
                        currentPage = targetPage;
                        cardsContainer.style.transform = `translateX(-${targetPage * 20}%)`;

                        // 다음 프레임에서 트랜지션 속성 복원
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                cardsContainer.style.transition = 'transform 0.5s cubic-bezier(0.33, 1, 0.68, 1)';
                            }, 50);
                        });
                    }, 500);
                }
            });

            // 인디케이터 업데이트
            updateIndicators();
        }

        // 이벤트 리스너 설정
        function setupEventListeners() {
            // 화살표 버튼 클릭 이벤트
            prevArrow.addEventListener('click', () => {
                goToPage(currentPage - 1);
            });

            nextArrow.addEventListener('click', () => {
                goToPage(currentPage + 1);
            });

            // 인디케이터 클릭 이벤트
            indicators.forEach(indicator => {
                indicator.addEventListener('click', () => {
                    const pageIndex = parseInt(indicator.getAttribute('data-index'));
                    goToPage(pageIndex);
                });
            });

            // 키보드 이벤트
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    goToPage(currentPage - 1);
                } else if (e.key === 'ArrowRight') {
                    goToPage(currentPage + 1);
                }
            });

            // 마우스 및 터치 스와이프 이벤트
            cardsContainer.addEventListener('mousedown', startDrag);
            cardsContainer.addEventListener('touchstart', startDrag);
            cardsContainer.addEventListener('mousemove', drag);
            cardsContainer.addEventListener('touchmove', drag);
            cardsContainer.addEventListener('mouseup', endDrag);
            cardsContainer.addEventListener('touchend', endDrag);
            cardsContainer.addEventListener('mouseleave', endDrag);
        }

        function startDrag(e) {
            isDragging = true;
            startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            // 드래그 시작 시 트랜지션 제거로 즉각적인 반응 보장
            cardsContainer.style.transition = 'none';
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            moveX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
            const diff = moveX - startX;
            const currentTranslate = -(currentPage * 20);

            // 드래그 저항감 추가로 더 자연스러운 움직임 구현
            const resistance = 0.8;
            const dragDistance = diff * resistance;

            // 제한된 범위 내에서만 드래그 가능
            const newTranslate = Math.max(-80, Math.min(0, currentTranslate + (dragDistance / cardsContainer.offsetWidth * 100)));
            cardsContainer.style.transform = `translateX(${newTranslate}%)`;
        }

        function endDrag(e) {
            if (!isDragging) return;
            isDragging = false;

            // 트랜지션 속성 복원
            cardsContainer.style.transition = 'transform 0.5s cubic-bezier(0.33, 1, 0.68, 1)';

            if (e.type !== 'mouseleave') {
                moveX = e.type.includes('mouse') ? e.pageX : (e.changedTouches ? e.changedTouches[0].pageX : startX);
                const diff = moveX - startX;

                // 충분한 거리를 드래그했을 때만 페이지 전환
                if (Math.abs(diff) > 30) {  // 민감도 증가 (50 -> 30)
                    if (diff > 0) {
                        goToPage(currentPage - 1);
                    } else {
                        goToPage(currentPage + 1);
                    }
                } else {
                    // 원래 페이지로 복원
                    cardsContainer.style.transform = `translateX(-${currentPage * 20}%)`;
                }
            } else {
                // 마우스가 영역을 벗어나면 원래 페이지로 복원
                cardsContainer.style.transform = `translateX(-${currentPage * 20}%)`;
            }
        }

        // 주요 기능 소개로 바로 이동하는 함수
        function skipToFeatureSection() {
            // 이미 전환 중이거나 완료된 경우 실행하지 않음
            if (isTypingComplete) return;

            // 클릭 이벤트 리스너 제거 (한 번만 실행)
            document.body.removeEventListener('click', skipToFeatureSection);

            // 타이핑 중인 타이머 정리
            if (typingTimer) {
                clearTimeout(typingTimer);
            }

            // 타이핑 완료 상태로 설정
            isTypingComplete = true;
            isTypingSkipped = true;

            // 타이핑 섹션 즉시 숨기기
            typingSection.classList.add('hide');

            // 타이핑 섹션 페이드아웃 후 기능 섹션 표시
            setTimeout(() => {
                typingSection.style.display = 'none';
                featureSection.style.display = 'block';

                // 기능 섹션 페이드인
                setTimeout(() => {
                    featureSection.classList.add('show');

                    // 기능 카드 표시
                    setTimeout(() => {
                        featureCards.style.display = 'block';

                        // 부드러운 페이드인
                        requestAnimationFrame(() => {
                            featureCards.classList.add('show');
                            pageIndicators.classList.add('show');

                            // CTA 버튼 표시
                            setTimeout(() => {
                                ctaButton.style.opacity = '1';
                                ctaButton.style.transform = 'translateY(0)';
                            }, 400);
                        });
                    }, 200);
                }, 50);
            }, 500);
        }