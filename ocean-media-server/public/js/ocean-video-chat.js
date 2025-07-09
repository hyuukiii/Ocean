        // 동적으로 SpringBoot 서버 URL 설정 하기
        const SPRING_BOOT_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:8080'
            : `http://${window.location.hostname}:8080`;

        // ===== UI 상태 관리 =====
        let isVideoOn = true;
        let isAudioOn = true;
        let isScreenSharing = false;
        let isRecording = false;
        let currentLayout = 'grid';

        // ===== 타이핑 관련 변수 추가 =====
        let typingUsers = new Map(); // 타이핑 중인 사용자들 관리
        let typingDisplayTimeout;
        let isTyping = false;
        let typingTimeout;
        const TYPING_TIMER_LENGTH = 1000; // 1초로 단축

        // ===== MediaSoup 관련 변수 =====
        let socket = null;
        let device;
        let producerTransport;
        let consumerTransport;
        let audioProducer;
        let videoProducer;
        let screenProducer;
        let consumers = new Map();
        // ===== 전역 변수 추가 =====
        let isHost = false;  // 현재 사용자가 호스트인지 여부
        let meetingEnded = false;  // 회의가 종료되었는지 여부

        // URL 파라미터 파싱
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('roomId');
        const workspaceId = urlParams.get('workspaceId');
        const meetingTitle = urlParams.get('meetingTitle') || '회의';

        // ===== 녹화 기능 ======
        let currentRecordingId = null;
        // 녹화 관련 전역 변수 추가
        let recordingStartTime = null;
        let recordingTimerInterval = null;
        // URL 파라미터에서 녹화 경로 가져오기
        const recordingPath = urlParams.get('recordingPath') || null;

        // 녹화 시간 포맷팅 함수
        function formatRecordingTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            if (hours > 0) {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        // 녹화 타이머 시작
        function startRecordingTimer() {
            recordingStartTime = Date.now();

            // 기존 타이머가 있다면 클리어
            if (recordingTimerInterval) {
                clearInterval(recordingTimerInterval);
            }

            // 1초마다 시간 업데이트
            recordingTimerInterval = setInterval(() => {
                const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
                const recordingTimeElement = document.getElementById('recordingTime');
                if (recordingTimeElement) {
                    recordingTimeElement.textContent = formatRecordingTime(elapsedSeconds);
                }
            }, 1000);
        }

        // 녹화 타이머 중지
        function stopRecordingTimer() {
            if (recordingTimerInterval) {
                clearInterval(recordingTimerInterval);
                recordingTimerInterval = null;
            }
            recordingStartTime = null;
        }

        // 로컬 미디어 스트림
        let localStream;
        let screenStream;



        // ⭐ 토큰에서 사용자 정보 가져오기 부분을 완전히 새로 작성
        const userInfo = {
            userName: localStorage.getItem('userName'),
            userId: localStorage.getItem('userId'),
            userProfileImg: localStorage.getItem('userImg')
        };

        // 토큰 파싱은 나중에 (필요하면)
        const tokenInfo = getUserInfoFromToken() || {};
        if (!userInfo.userName) userInfo.userName = tokenInfo.userName;
        if (!userInfo.userId) userInfo.userId = tokenInfo.userId;
        if (!userInfo.userProfileImg) userInfo.userProfileImg = tokenInfo.userProfileImg;

        //const displayName = userInfo?.userName || urlParams.get('displayName') || '참가자';
        // ⭐ displayName 설정 개선
        let displayName = urlParams.get('displayName');  // URL 파라미터 우선
        if (!displayName || displayName === 'null' || displayName === 'undefined' || displayName === '참가자') {
            displayName = userInfo?.userName || localStorage.getItem('userName');
        }
        if (!displayName || displayName === 'null' || displayName === 'undefined') {
            displayName = '참가자';  // 최후의 대안
        }

         console.log('최종 displayName:', displayName);

        //const userId = userInfo?.userId || urlParams.get('peerId') || urlParams.get('userId');
        // ⭐ userId 설정 개선
        let userId = urlParams.get('userId') || urlParams.get('peerId');  // URL 파라미터 우선
        if (!userId || userId === 'null' || userId === 'undefined') {
            userId = userInfo?.userId || localStorage.getItem('userId');
        }

        const peerId = userId || 'peer-' + Math.random().toString(36).substr(2, 9);

        // ⭐ 프로필 이미지 처리 (이 부분 찾아서 수정)
        let userProfileImg = urlParams.get('userProfileImg');

        // URL 파라미터가 없으면 userInfo나 localStorage에서 가져오기
        if (!userProfileImg || userProfileImg === 'null' || userProfileImg === 'undefined' || userProfileImg === '') {
            userProfileImg = userInfo?.userProfileImg || localStorage.getItem('userImg');
        }

        // URL 디코딩 및 처리
        if (userProfileImg && userProfileImg !== 'null' && userProfileImg !== 'undefined') {
            userProfileImg = decodeURIComponent(userProfileImg);

            // 상대 경로를 절대 경로로 변환
            if (!userProfileImg.startsWith('http')) {
                userProfileImg = 'http://localhost:8080' + (userProfileImg.startsWith('/') ? userProfileImg : '/' + userProfileImg);
            }

            // 포트 수정 (필요시)
            if (userProfileImg.includes(':8081')) {
                userProfileImg = userProfileImg.replace(':8081', ':8080');
            }
        }

        console.log('최종 userProfileImg:', userProfileImg);

        // ⭐ 호스트 정보 (URL 파라미터에서)
        const isHostFromUrl = urlParams.get('isHost') === 'true';
        const hostIdFromUrl = urlParams.get('hostId');

        // 디버깅 로그
        console.log('=== 사용자 정보 초기화 ===');
        console.log('URL 파라미터:', {
            displayName: urlParams.get('displayName'),
            userId: urlParams.get('userId'),
            isHost: urlParams.get('isHost'),
            hostId: urlParams.get('hostId')
        });
        console.log('토큰 정보:', userInfo);
        console.log('최종 설정:', {
            displayName,
            userId,
            peerId,
            isHostFromUrl,
            hostIdFromUrl
        });

        // ⭐ 로컬 비디오에 이름 즉시 표시
        document.addEventListener('DOMContentLoaded', () => {
            const localNameSpan = document.querySelector('#localVideo .video-info span');
            if (localNameSpan) {
                localNameSpan.textContent = displayName;
            }

            // ⭐⭐ 프로필 이미지 초기 표시
                const localPlaceholder = document.getElementById('localPlaceholder');
                if (localPlaceholder && userProfileImg && userProfileImg !== 'null' && userProfileImg !== 'undefined') {
                    console.log('프로필 이미지 표시 시도:', userProfileImg);

                    localPlaceholder.innerHTML = `
                        <img src="${userProfileImg}"
                             alt="${displayName}"
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                             onerror="this.onerror=null; this.parentElement.textContent='${displayName.charAt(0).toUpperCase()}'">
                    `;

                    // 비디오가 꺼져있으면 placeholder 보이게
                    if (!isVideoOn) {
                        localPlaceholder.style.display = 'flex';
                    }
                }
        });

        // URL 디코딩 및 절대 경로 변환
        //if (userProfileImg && userProfileImg !== 'null' && userProfileImg !== 'undefined') {
            userProfileImg = decodeURIComponent(userProfileImg);

            // 프로필 이미지가 http로 시작하지 않으면 절대 경로로 변환
            //if (!userProfileImg.startsWith('http')) {
                // Spring Boot 서버의 절대 URL로 변환
                //userProfileImg = 'http://localhost:8080' + (userProfileImg.startsWith('/') ? userProfileImg : '/' + userProfileImg);
                // console.log('프로필 이미지를 절대 경로로 변환:', userProfileImg);
            //}

            // 8081 포트를 8080으로 변경 (만약 있다면)
            //if (userProfileImg.includes(':8081')) {
                userProfileImg = userProfileImg.replace(':8081', ':8080');
                // console.log('프로필 이미지 포트 수정: 8081 → 8080');
            //}
        //}

        // 디버깅을 위한 로그
        console.log('사용자 정보 설정:', {
            userInfo,
            userId,
            displayName,
            peerId,
            urlParams: {
                peerId: urlParams.get('peerId'),
                displayName: urlParams.get('displayName'),
                userId: urlParams.get('userId')
            }
        });

        // 회의 옵션 파라미터 읽기
        const meetingOptions = {
            autoRecord: urlParams.get('autoRecord') === 'true',
            muteOnJoin: urlParams.get('muteOnJoin') === 'true',
            videoQuality: urlParams.get('videoQuality') || 'HD',
            waitingRoom: urlParams.get('waitingRoom') === 'true'
        };

        // userId가 없으면 경고
        if (!userId) {
            console.warn('userId를 찾을 수 없습니다. 로그인이 필요할 수 있습니다.');
        }

        // ===== 한글 입력 관련 변수 추가 =====
        window.enterPressedDuringComposition = false;

        // 토큰 확인 및 사용자 정보 재설정
        (function checkAuth() {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.error('인증 토큰이 없습니다. 로그인이 필요합니다.');
                // 로그인 페이지로 리다이렉트할 수도 있음
                // window.location.href = '/login';
            }
        })();


        // 재접속 처리를 위해 joinRoom 함수 호출 부분 수정
        async function init() {
            try {
                showToast('연결 중...');

                // 1. Socket.IO 연결
                await connectSocket();

                // 2. 미디어 장치 권한 요청
                await requestMediaPermissions();

                // 3. 재접속 여부에 따라 다른 처리
                if (urlParams.get('rejoin') === 'true') {
                    await rejoinMeeting();
                } else {
                    await joinRoom();
                }

            } catch (error) {
                console.error('초기화 실패:', error);
                showToast('연결 실패: ' + error.message);

                if (confirm('연결에 실패했습니다. 다시 시도하시겠습니까?')) {
                    window.location.reload();
                } else {
                    window.location.href = '/';
                }
            }
        }

        // ===== Socket.IO 연결 =====  ==== 집 와이파이 : 192.168.0.16 에이콘 아카데미 : 172.30.1.49 , 192.168.100.16
        async function connectSocket() {
            return new Promise((resolve, reject) => {
                const serverUrl = window.location.hostname === 'localhost'
                    ? 'https://localhost:3001'
                    : 'https://192.168.100.16:3001';

                socket = io(serverUrl, {
                    transports: ['websocket'],
                    reconnection: true
                });

                socket.on('connect', () => {
                    console.log('Socket.IO 연결됨');
                    resolve();
                });

                socket.on('connect_error', (error) => {
                    console.error('Socket.IO 연결 실패:', error);
                    reject(error);
                });

                // 이벤트 리스너 설정
                setupSocketListeners();
            });
        }

        // setupSocketListeners 함수 수정 - 모든 socket 이벤트를 함수 안으로 이동
        function setupSocketListeners() {
            // 새 참가자 입장
            socket.on('new-peer', ({ peerId, displayName }) => {
                console.log('새 참가자:', displayName);
                addRemoteVideo(peerId, displayName);
                showToast(`${displayName}님이 입장했습니다`);
                updateParticipantCount();
            });

            // 참가자 퇴장
            socket.on('peer-left', ({ peerId }) => {
                console.log('참가자 퇴장:', peerId);
                removeRemoteVideo(peerId);
                updateParticipantCount();
            });

            // 호스트 권한 변경 알림
            socket.on('host-changed', (data) => {
                const { newHostId, newHostName } = data;

                // 자신이 새 호스트가 되었는지 확인
                if (userId === newHostId) {
                    isHost = true;
                    document.getElementById('endCallBtn').style.display = 'block';
                    showToast('호스트 권한을 획득했습니다.');
                } else {
                    isHost = false;
                    document.getElementById('endCallBtn').style.display = 'none';
                    showToast(`${newHostName}님이 새로운 호스트가 되었습니다.`);
                }
            });

            // 참가자가 일시적으로 나감
            socket.on('peer-left-temporarily', ({ peerId, displayName }) => {
                console.log('참가자가 일시적으로 나감:', displayName);

                // 비디오 컨테이너는 유지하되 상태만 변경
                const container = document.getElementById(`container-${peerId}`);
                if (container) {
                    container.style.opacity = '0.5';
                    const nameSpan = container.querySelector('.video-info span');
                    if (nameSpan) {
                        nameSpan.textContent = `${displayName} (나감)`;
                    }
                }

                showToast(`${displayName}님이 회의에서 나갔습니다`);
            });

            // 참가자 재접속
            socket.on('peer-rejoined', ({ peerId, displayName }) => {
                console.log('참가자 재접속:', displayName);

                // 비디오 컨테이너 상태 복원
                const container = document.getElementById(`container-${peerId}`);
                if (container) {
                    container.style.opacity = '1';
                    const nameSpan = container.querySelector('.video-info span');
                    if (nameSpan) {
                        nameSpan.textContent = displayName;
                    }
                } else {
                    // 컨테이너가 없으면 새로 추가
                    addRemoteVideo(peerId, displayName);
                }

                showToast(`${displayName}님이 회의에 재접속했습니다`);
            });

            // 참가자 완전 연결 해제
            socket.on('peer-disconnected', ({ peerId, isHost: wasHost }) => {
                console.log('참가자 연결 해제:', peerId);

                if (wasHost) {
                    showToast('호스트의 연결이 끊어졌습니다. 새로운 호스트가 지정됩니다.');
                }

                // 30초 후에도 재접속하지 않으면 제거
                setTimeout(() => {
                    const container = document.getElementById(`container-${peerId}`);
                    if (container && container.style.opacity === '0.5') {
                        removeRemoteVideo(peerId);
                        updateParticipantCount();
                    }
                }, 30000); // 30초
            });

            // 새 프로듀서 (다른 참가자의 미디어 스트림)
            socket.on('new-producer', async ({ producerId, peerId, kind }) => {
                console.log('새 프로듀서:', kind, 'from', peerId);
                await consumeMedia(producerId, peerId, kind);
            });

            // 화면 공유 상태 업데이트
            socket.on('screen-share-update', async ({ peerId, isSharing, producerId }) => {
                console.log('화면 공유 상태 업데이트:', peerId, isSharing);

                const remoteVideo = document.getElementById(`video-${peerId}`);
                const placeholder = document.querySelector(`#container-${peerId} .video-placeholder`);

                if (isSharing) {
                    // 화면 공유 시작 - 해당 producerId를 소비
                    await consumeMedia(producerId, peerId, 'video', true);
                    showToast('상대방이 화면을 공유하기 시작했습니다');
                } else {
                    // 화면 공유 종료 - 기존 비디오 producer를 다시 찾아서 소비
                    // 기존 비디오 트랙 복원
                    restoreVideoAfterScreenShare(peerId);
                    showToast('상대방이 화면 공유를 종료했습니다');
                }
            });

            // 채팅 메시지 수신
            socket.on('chat-message', ({ peerId: senderPeerId, displayName, message, timestamp }) => {
                // 자신이 보낸 메시지는 이미 로컬에서 표시했으므로 무시
                console.log('메시지 수신:', senderPeerId, '내 ID:', peerId);
                if (senderPeerId !== peerId) {
                    addChatMessage(displayName, message, timestamp);
                }
            });

            // 파일 공유 알림 수신
            socket.on('file-shared', (fileMessage) => {
                console.log('파일 공유 알림:', fileMessage);

                // 자신이 업로드한 파일은 이미 로컬에서 표시했으므로 무시
                if (fileMessage.peerId === peerId) {
                    console.log('자신이 업로드한 파일이므로 표시하지 않음');
                    return;
                }

                // 파일 메시지를 채팅창에 표시
                addFileMessage(
                    fileMessage.uploadedBy,
                    fileMessage,
                    fileMessage.uploadedAt
                );

                // 알림 표시
                showToast(`${fileMessage.uploadedBy}님이 파일을 공유했습니다`);
            });

            // 타이핑 상태 수신
            socket.on('typing', ({ peerId: typingPeerId, displayName, isTyping }) => {
                console.log('타이핑 상태 수신:', typingPeerId, displayName, isTyping);

                // 타이핑 상태 표시 업데이트
                updateTypingIndicator(typingPeerId, displayName, isTyping);
            });

            // 다른 사용자가 녹화 시작
            socket.on('recording-started', ({ recordingId, startedBy }) => {
                if (startedBy !== displayName) {
                    isRecording = true;
                    currentRecordingId = recordingId;
                    document.getElementById('recordBtn').classList.add('active');
                    document.getElementById('recordingIndicator').style.display = 'flex';
                    showToast(`${startedBy}님이 녹화를 시작했습니다`);
                }
            });

            // 다른 사용자가 녹화 종료
            socket.on('recording-stopped', ({ recordingId, stoppedBy }) => {
                if (stoppedBy !== displayName) {
                    isRecording = false;
                    currentRecordingId = null;
                    document.getElementById('recordBtn').classList.remove('active');
                    document.getElementById('recordingIndicator').style.display = 'none';
                    showToast(`${stoppedBy}님이 녹화를 종료했습니다`);
                }
            });

            // 호스트 정보 수신 시 처리 개선
            socket.on('host-info', (data) => {
                const { hostId } = data;
                console.log('호스트 정보 수신:', hostId);

                // 다양한 방법으로 호스트 여부 확인
                isHost = (userId === hostId) || (peerId === hostId);

                console.log('호스트 여부 재확인:', {
                    hostId,
                    userId,
                    peerId,
                    isHost
                });

                // 호스트인 경우 종료 버튼 표시
                const endCallBtn = document.getElementById('endCallBtn');
                if (endCallBtn) {
                    endCallBtn.style.display = isHost ? 'block' : 'none';
                }

                if (isHost) {
                    showToast('호스트 권한을 확인했습니다.');
                }
            });

            // ⭐ 회의 종료 알림 수신 (이 부분도 함수 안으로 이동!)
            socket.on('meeting-ended', (data) => {
                meetingEnded = true;
                showToast('호스트가 회의를 종료했습니다.');

                // 3초 후 자동으로 워크스페이스로 이동
                setTimeout(() => {
                    window.location.href = `${SPRING_BOOT_URL}/wsmain?workspaceCd=${workspaceId}`;
                }, 3000);
            });

            // ⭐ 재접속 성공 알림 (이 부분도 함수 안으로 이동!)
            socket.on('reconnect-success', (data) => {
                showToast('회의에 재접속했습니다.');

                // 기존 참가자 정보 업데이트
                const { peers } = data;
                peers.forEach(peer => {
                    if (!document.getElementById(`container-${peer.peerId}`)) {
                        addRemoteVideo(peer.peerId, peer.displayName, peer.userProfileImg);
                    }
                });
            });

            // room-joined 이벤트 핸들러 개선
            socket.on('room-joined', async (data) => {
                console.log('room-joined 이벤트 수신:', data);
                const {
                    hostId,
                    peers,
                    isHost: isHostFromServer
                } = data;

                // 호스트 상태 설정
                isHost = isHostFromServer || (hostId === userId) || (hostId === peerId);

                console.log('호스트 상태 결정:', {
                        isHostFromServer,
                        hostId,
                        userId,
                        peerId,
                        최종isHost: isHost
                });


                // 만약 서버에서 isHost를 안 보냈다면 hostId로 확인
                if (isHost === undefined || isHost === null) {
                    isHost = (hostId === userId) || (hostId === peerId);
                }

                console.log('호스트 상태 결정:', {
                    isHostFromServer,
                    hostId,
                    userId,
                    peerId,
                    최종isHost: isHost
                });

                // ⭐ 호스트 버튼 즉시 표시
                const endCallBtn = document.getElementById('endCallBtn');
                    if (endCallBtn) {
                        endCallBtn.style.display = isHost ? 'block' : 'none';
                    }

                // 사용자 이름 업데이트
                const localNameSpan = document.querySelector('#localVideo .video-info span');
                if (localNameSpan && displayName !== '참가자') {
                     localNameSpan.textContent = displayName;
                }

                // 방 이름 설정
                if (data.roomName) {
                    document.getElementById('roomName').textContent = data.roomName;
                }

                // 토스트 메시지
                if (isHost) {
                    showToast('호스트로 회의에 참여했습니다');
                } else {
                    showToast('회의에 참여했습니다');
                }

                // 기존 참가자 추가
                if (peers && peers.length > 0) {
                    peers.forEach(peer => {
                        addRemoteVideo(peer.peerId, peer.displayName);
                    });
                }

                updateParticipantCount();

                // ⭐ Transport 생성 및 Producer 시작
                    try {
                        console.log('Transport 생성 시작...');
                        await createTransports();

                        console.log('Producer 생성 시작...');
                        await startProducing();

                        console.log('미디어 전송 준비 완료');

                        // Producer 생성 확인
                        if (videoProducer || audioProducer) {
                            console.log('✅ Producer 생성 성공:', {
                                video: !!videoProducer,
                                audio: !!audioProducer
                            });
                        } else {
                            console.warn('⚠️ Producer 생성 실패');
                        }

                    } catch (error) {
                        console.error('Transport/Producer 생성 실패:', error);
                        showToast('미디어 연결에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
                    }

                    // 디버깅을 위한 추가 확인
                    setTimeout(() => {
                        const endCallBtn = document.getElementById('endCallBtn');
                        console.log('1초 후 상태 확인:', {
                            isHost: isHost,
                            호스트버튼: endCallBtn ? endCallBtn.style.display : 'button not found',
                            videoProducer: !!videoProducer,
                            audioProducer: !!audioProducer
                        });
                    }, 1000);
                });

        }

        // 페이지 로드 시 녹화 상태 확인
        async function checkRecordingStatus() {
            // socket이 초기화되었는지 확인
            if (!socket || !socket.connected) {
                console.error('Socket이 연결되지 않았습니다');
                return;
            }

            socket.emit('get-recording-status', { roomId }, (response) => {
                    if (response.isRecording) {
                        isRecording = true;
                        currentRecordingId = response.recordingId;
                        document.getElementById('recordBtn').classList.add('active');
                        document.getElementById('recordingIndicator').style.display = 'flex';
                    }
            });
        }

        // ===== 미디어 권한 요청 =====
        async function requestMediaPermissions() {
            try {
                // 비디오 품질 설정 적용
                let videoConstraints = {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                };

                // 회의 옵션에 따른 비디오 품질 설정
                if (meetingOptions.videoQuality) {
                    const qualitySettings = {
                        'SD': { width: { ideal: 640 }, height: { ideal: 480 } },
                        'HD': { width: { ideal: 1280 }, height: { ideal: 720 } },
                        'FHD': { width: { ideal: 1920 }, height: { ideal: 1080 } }
                    };

                    if (qualitySettings[meetingOptions.videoQuality]) {
                        videoConstraints = {
                            ...qualitySettings[meetingOptions.videoQuality],
                            frameRate: { ideal: 30 }
                        };
                    }
                }

                localStream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints,
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                // 로컬 비디오 표시
                const localVideo = document.getElementById('localVideo');
                localVideo.srcObject = localStream;
                document.getElementById('localPlaceholder').style.display = 'none';

                // ⭐ 입장 시 음소거 옵션 적용
                if (meetingOptions.muteOnJoin) {
                    const audioTrack = localStream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.enabled = false;  // 오디오 트랙 비활성화
                        isAudioOn = false;  // 전역 상태 업데이트

                        // UI 업데이트
                        const micBtn = document.getElementById('micBtn');
                        const localMicStatus = document.getElementById('localMicStatus');

                        micBtn.classList.add('active');  // 음소거 상태 표시
                        localMicStatus.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>`;

                        console.log('입장 시 음소거 적용됨');
                        showToast('입장 시 음소거가 적용되었습니다');
                    }
                }

            } catch (error) {
                console.error('미디어 권한 획득 실패:', error);
                showToast('카메라/마이크 권한이 필요합니다');
                throw error;
            }
        }

        // ocean-video-chat.js 수정 부분만 표시

        // joinRoom 함수에서 사용자 정보 확인 강화
        async function joinRoom() {
            try {
                // Router RTP Capabilities 가져오기
                const routerRtpCapabilities = await new Promise((resolve, reject) => {
                    socket.emit('get-router-rtp-capabilities', (capabilities) => {
                        resolve(capabilities);
                    });
                });

                // MediaSoup 디바이스 초기화
                await initializeDevice(routerRtpCapabilities);

                // userId 가져오기
                let actualUserId = userId;
                if (!actualUserId) {
                    actualUserId = localStorage.getItem('userId');
                }
                if (!actualUserId) {
                    const tokenUserInfo = getUserInfoFromToken();
                    actualUserId = tokenUserInfo?.userId;
                    if (actualUserId) {
                        localStorage.setItem('userId', actualUserId);
                    }
                }

                console.log('최종 사용할 userId:', actualUserId);
                console.log('최종 displayName:', displayName);

                // ⭐ rejoin 파라미터 확인
                const isRejoining = urlParams.get('rejoin') === 'true';

                // 방 참가
                socket.emit('join-room', {
                    roomId,
                    workspaceId,
                    peerId,
                    displayName,  // 실제 이름이 전달되도록
                    userId: actualUserId,
                    rejoin: isRejoining
                });

                console.log('join-room 전송 데이터:', {
                    roomId,
                    workspaceId,
                    peerId,
                    displayName,
                    userId: actualUserId,
                    rejoin: isRejoining
                });

                // ⭐ URL에서 호스트 정보가 있으면 즉시 적용
                if (isHostFromUrl) {
                    isHost = true;
                    const endCallBtn = document.getElementById('endCallBtn');
                    if (endCallBtn) {
                        endCallBtn.style.display = 'block';
                        console.log('URL 파라미터로 호스트 버튼 표시');
                    }
                }

            } catch (error) {
                console.error('joinRoom 에러:', error);
                showToast('회의 참가 중 오류가 발생했습니다.');
            }
        }

        // ===== MediaSoup Device 초기화 =====
        async function initializeDevice(routerRtpCapabilities) {
            device = new mediasoupClient.Device();

            await device.load({ routerRtpCapabilities });

            if (!device.canProduce('video') || !device.canProduce('audio')) {
                console.warn('이 디바이스는 미디어를 생성할 수 없습니다');
            }
        }

        // ===== Transport 생성 =====
        async function createTransports() {
            // Producer Transport 생성
            await createProducerTransport();

            // Consumer Transport 생성
            await createConsumerTransport();
        }

        // ===== Producer Transport 생성 =====
        async function createProducerTransport() {
            return new Promise((resolve, reject) => {
                socket.emit('create-transport', { producing: true, consuming: false }, async (response) => {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }

                    producerTransport = device.createSendTransport(response);

                    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        socket.emit('connect-transport', {
                            transportId: producerTransport.id,
                            dtlsParameters
                        }, (response) => {
                            if (response.error) {
                                errback(new Error(response.error));
                            } else {
                                callback();
                            }
                        });
                    });

                    producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                        socket.emit('produce', {
                            transportId: producerTransport.id,
                            kind,
                            rtpParameters
                        }, (response) => {
                            if (response.error) {
                                errback(new Error(response.error));
                            } else {
                                callback({ id: response.producerId });
                            }
                        });
                    });

                    resolve();
                });
            });
        }

        // ===== Consumer Transport 생성 =====
        async function createConsumerTransport() {
            return new Promise((resolve, reject) => {
                socket.emit('create-transport', { producing: false, consuming: true }, async (response) => {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }

                    consumerTransport = device.createRecvTransport(response);

                    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        socket.emit('connect-transport', {
                            transportId: consumerTransport.id,
                            dtlsParameters
                        }, (response) => {
                            if (response.error) {
                                errback(new Error(response.error));
                            } else {
                                callback();
                            }
                        });
                    });

                    resolve();
                });
            });
        }

        // ======== 미디어 생산 시작 =========
        async function startProducing() {
            // 오디오 프로듀서
            if (localStream.getAudioTracks().length > 0) {
                audioProducer = await producerTransport.produce({
                    track: localStream.getAudioTracks()[0],
                    codecOptions: {
                        opusStereo: true,
                        opusDtx: true
                    }
                });

                // ⭐ 입장 시 음소거가 적용된 경우 Producer도 일시정지
                        if (meetingOptions.muteOnJoin) {
                            audioProducer.pause();
                        }

                // ⭐ 디버깅을 위해 window에 저장
                if (!window.producers) window.producers = new Map();
                window.producers.set('audio', audioProducer);
                console.log(`✅ audio Producer 생성:`, audioProducer.id);
                
                // Track 상태 확인
                const audioTrack = audioProducer.track;
                console.log('오디오 Track 상태:', {
                    enabled: audioTrack.enabled,
                    muted: audioTrack.muted,
                    readyState: audioTrack.readyState,
                    settings: audioTrack.getSettings()
                });

                audioProducer.on('transportclose', () => {
                    audioProducer = null;
                    window.producers.delete('audio');  // ⭐ 정리 시에도 제거
                });
            }

            // 비디오 프로듀서
            if (localStream.getVideoTracks().length > 0) {
                videoProducer = await producerTransport.produce({
                    track: localStream.getVideoTracks()[0],
                    encodings: [
                        { maxBitrate: 100000 },
                        { maxBitrate: 300000 },
                        { maxBitrate: 900000 }
                    ],
                    codecOptions: {
                        videoGoogleStartBitrate: 1000
                    }
                });

                // ⭐ 디버깅을 위해 window에 저장
                if (!window.producers) window.producers = new Map();
                window.producers.set('video', videoProducer);
                console.log(`✅ video Producer 생성:`, videoProducer.id);

                videoProducer.on('transportclose', () => {
                    videoProducer = null;
                    window.producers.delete('video');  // ⭐ 정리 시에도 제거
                });
            }

            // ⭐ 추가: producerTransport도 window에 저장
            window.producerTransport = producerTransport;
            console.log('✅ Producer Transport 저장됨:', producerTransport.id);
        }

        // ===== 미디어 소비 ============
        async function consumeMedia(producerId, peerId, kind, isScreenShare = false) {
            return new Promise((resolve, reject) => {
                socket.emit('consume', {
                    producerId,
                    rtpCapabilities: device.rtpCapabilities
                }, async (response) => {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }

                    const consumer = await consumerTransport.consume({
                        id: response.consumerId,
                        producerId: response.producerId,
                        kind: response.kind,
                        rtpParameters: response.rtpParameters
                    });

                    // 화면 공유 여부 저장
                    consumer.appData = { peerId, isScreenShare };
                    consumers.set(consumer.id, consumer);

                    // 비디오/오디오를 해당 피어의 video 엘리먼트에 연결
                    const remoteVideo = document.getElementById(`video-${peerId}`);
                    if (remoteVideo) {
                        const stream = new MediaStream();
                        stream.addTrack(consumer.track);

                        if (kind === 'video') {
                            // 기존 비디오 트랙이 있으면 제거
                            if (remoteVideo.srcObject && isScreenShare) {
                                const tracks = remoteVideo.srcObject.getVideoTracks();
                                tracks.forEach(track => {
                                    // 기존 비디오 트랙 중지
                                    track.stop();
                                    remoteVideo.srcObject.removeTrack(track);
                                });
                            }

                            // 새 비디오 트랙 추가
                            if (remoteVideo.srcObject) {
                                const audioTracks = remoteVideo.srcObject.getAudioTracks();
                                audioTracks.forEach(track => stream.addTrack(track));
                            }

                            remoteVideo.srcObject = stream;
                            const placeholder = document.querySelector(`#container-${peerId} .video-placeholder`);
                            if (placeholder) placeholder.style.display = 'none';
                        } else if (kind === 'audio') {
                            // 오디오는 기존 스트림에 추가
                            if (remoteVideo.srcObject) {
                                remoteVideo.srcObject.addTrack(consumer.track);
                            } else {
                                remoteVideo.srcObject = stream;
                            }
                        }
                    }

                    // 소비 확인
                    socket.emit('resume-consumer', { consumerId: consumer.id }, (response) => {
                        if (response.error) {
                            console.error('Resume consumer error:', response.error);
                        }
                    });

                    resolve();
                });
            });
        }

        // 화면 공유 종료 후 원래 비디오로 복원
        async function restoreVideoAfterScreenShare(peerId) {
            console.log('원래 비디오로 복원 시도:', peerId);

            // 화면 공유 consumer 찾기
            const screenConsumer = Array.from(consumers.values()).find(
                consumer => consumer.appData &&
                consumer.appData.peerId === peerId &&
                consumer.appData.isScreenShare &&
                consumer.kind === 'video'
            );

            if (screenConsumer) {
                // 화면 공유 consumer 닫기
                screenConsumer.close();
                consumers.delete(screenConsumer.id);
                console.log('화면 공유 consumer 닫힘');
            }

            // 서버에 해당 피어의 비디오 producer 요청
            socket.emit('get-producer-by-peer', { peerId, kind: 'video' }, async (response) => {
                if (response.error) {
                    console.error('원래 비디오 찾기 실패:', response.error);
                    return;
                }

                if (response.producerId) {
                    // 찾은 producer로 새로운 consumer 생성
                    await consumeMedia(response.producerId, peerId, 'video', false);
                    console.log('원래 비디오로 복원됨');
                } else {
                    // 비디오 producer를 찾지 못한 경우 비디오 요소 초기화
                    const remoteVideo = document.getElementById(`video-${peerId}`);
                    if (remoteVideo) {
                        // 비디오 요소 초기화
                        if (remoteVideo.srcObject) {
                            const tracks = remoteVideo.srcObject.getTracks();
                            tracks.forEach(track => track.stop());
                        }

                        // 오디오만 유지하는 새 스트림 생성
                        const newStream = new MediaStream();

                        // 기존 오디오 트랙이 있으면 추가
                        const audioConsumer = Array.from(consumers.values()).find(
                            consumer => consumer.appData &&
                            consumer.appData.peerId === peerId &&
                            consumer.kind === 'audio'
                        );

                        if (audioConsumer) {
                            newStream.addTrack(audioConsumer.track);
                            remoteVideo.srcObject = newStream;
                        }

                        // 플레이스홀더 표시
                        const placeholder = document.querySelector(`#container-${peerId} .video-placeholder`);
                        if (placeholder) placeholder.style.display = 'flex';
                    }
                }
            });
        }

        // ============== UI 제어 함수들 ===============

        // 마이크 토글
        function toggleMic() {
            isAudioOn = !isAudioOn;
            const micBtn = document.getElementById('micBtn');
            const localMicStatus = document.getElementById('localMicStatus');

            if (isAudioOn) {
                micBtn.classList.remove('active');
                localMicStatus.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>`;
                if (audioProducer) audioProducer.resume();
            } else {
                micBtn.classList.add('active');
                localMicStatus.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>`;
                if (audioProducer) audioProducer.pause();
            }

            showToast(isAudioOn ? '마이크 켜짐' : '마이크 꺼짐');
        }

        // toggleVideo 함수도 동일하게 수정
        function toggleVideo() {
            isVideoOn = !isVideoOn;
            const videoBtn = document.getElementById('videoBtn');
            const localVideo = document.getElementById('localVideo');
            const localPlaceholder = document.getElementById('localPlaceholder');

            if (isVideoOn) {
                videoBtn.classList.remove('active');
                localVideo.style.display = 'block';
                localPlaceholder.style.display = 'none';
                if (videoProducer) videoProducer.resume();
            } else {
                videoBtn.classList.add('active');
                localVideo.style.display = 'none';

                // 디버깅 로그 추가
                console.log('비디오 OFF - 프로필 이미지 설정 시도');
                console.log('userProfileImg 값:', userProfileImg);

                // 프로필 이미지가 있으면 표시, 없으면 이니셜 표시
                if (userProfileImg && userProfileImg !== 'null' && userProfileImg !== 'undefined') {
                    localPlaceholder.innerHTML = `
                        <img src="${userProfileImg}"
                             alt="${displayName}"
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                             onerror="this.onerror=null; this.parentElement.innerHTML='${displayName.charAt(0).toUpperCase()}'">
                    `;
                    console.log('프로필 이미지 HTML 설정됨:', localPlaceholder.innerHTML);
                } else {
                    localPlaceholder.textContent = displayName.charAt(0).toUpperCase();
                    console.log('이니셜 표시됨:', displayName.charAt(0).toUpperCase());
                }

                localPlaceholder.style.display = 'flex';
                if (videoProducer) videoProducer.pause();
            }

            showToast(isVideoOn ? '비디오 켜짐' : '비디오 꺼짐');
        }

        // 화면 공유 토글
        async function toggleScreenShare() {
            if (!isScreenSharing) {
                try {
                    screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            cursor: "always"
                        },
                        audio: false
                    });

                    screenProducer = await producerTransport.produce({
                        track: screenStream.getVideoTracks()[0],
                        appData: { mediaType: 'screen' }  // 화면 공유임을 표시
                    });

                    // ⭐ 화면 공유 Producer도 window에 저장
                    if (!window.producers) window.producers = new Map();
                    window.producers.set('screen', screenProducer);
                    console.log(`✅ screen Producer 생성:`, screenProducer.id);

                    screenStream.getVideoTracks()[0].onended = () => {
                        toggleScreenShare();
                    };

                    isScreenSharing = true;
                    document.getElementById('shareBtn').classList.add('active');
                    showToast('화면 공유 시작');

                    // 서버에 화면 공유 상태 알림
                    socket.emit('screen-share-status', {
                        roomId,
                        peerId,
                        isSharing: true,
                        producerId: screenProducer.id
                    });

                } catch (error) {
                    console.error('화면 공유 실패:', error);
                    showToast('화면 공유를 시작할 수 없습니다');
                }
            } else {
                if (screenProducer) {
                    screenProducer.close();
                    screenProducer = null;
                }
                if (screenStream) {
                    screenStream.getTracks().forEach(track => track.stop());
                    screenStream = null;
                }

                isScreenSharing = false;
                document.getElementById('shareBtn').classList.remove('active');
                showToast('화면 공유 종료');

                // 서버에 화면 공유 종료 알림
                socket.emit('screen-share-status', {
                    roomId,
                    peerId,
                    isSharing: false
                });
            }
        }

        // 2. 실제 녹화 시작 로직 분리
        async function startRecordingInternal() {
            if (isRecording) {
                console.log('이미 녹화 중입니다');
                return;
            }

            console.log('녹화 시작 요청');
            console.log('Socket 상태:', socket.connected);
            console.log('Room ID:', roomId);
            console.log('Peer ID:', peerId);
            console.log('Display Name:', displayName);
            console.log('Recording Path:', recordingPath); // 경로 로그 추가

            // 서버의 이벤트 이름 확인 - 'start-recording' 또는 'startRecording'
            const recordingData = {
                roomId: roomId,
                peerId: peerId,
                displayName: displayName,
                recordingPath: recordingPath  // ⭐ 경로 추가
            };

            console.log('녹화 요청 데이터:', recordingData);

            // 녹화 시작 요청 - 이벤트 이름 수정
            socket.emit('startRecording', recordingData, (response) => {
                console.log('서버 응답 받음:', response);

                if (!response) {
                    console.error('서버 응답이 없습니다');
                    showToast('녹화 시작 실패: 서버 응답 없음', 'error');
                    return;
                }

                if (response.error) {
                    console.error('녹화 시작 에러:', response.error);
                    showToast('녹화 시작 실패: ' + response.error, 'error');
                    return;
                }

                // UI 업데이트
                isRecording = true;
                currentRecordingId = response.recordingId;

                const recordBtn = document.getElementById('recordBtn');
                if (recordBtn) recordBtn.classList.add('active');

                // ⭐ 헤더 녹화 표시 보이기
                const headerRecordingIndicator = document.getElementById('headerRecordingIndicator');
                if (headerRecordingIndicator) {
                    headerRecordingIndicator.style.display = 'flex';
                    startRecordingTimer(); // 타이머 시작
                }

                showToast('녹화가 시작되었습니다', 'success');
                console.log('녹화 시작 성공:', response);
            });

            // 타임아웃 설정 (응답이 없을 경우)
            setTimeout(() => {
                if (!isRecording) {
                    console.error('녹화 시작 타임아웃');
                    showToast('녹화 시작 응답 시간 초과', 'error');
                }
            }, 5000);
        }

        // 1. 활성 미디어 스트림 체크 함수 추가
        function checkActiveMediaStreams() {
            // Producer가 있고 활성화되어 있는지 확인
            const hasVideoProducer = videoProducer && !videoProducer.closed;
            const hasAudioProducer = audioProducer && !audioProducer.closed;
            const hasActiveVideo = hasVideoProducer && isVideoOn && !videoProducer.paused;
            const hasActiveAudio = hasAudioProducer && isAudioOn && !audioProducer.paused;

            console.log('미디어 상태 체크:', {
                hasActiveVideo,
                hasActiveAudio,
                hasVideoProducer,
                hasAudioProducer,
                isVideoOn,
                isAudioOn,
                videoProducer: !!videoProducer,
                audioProducer: !!audioProducer,
                videoProducerPaused: videoProducer ? videoProducer.paused : 'no producer',
                audioProducerPaused: audioProducer ? audioProducer.paused : 'no producer'
            });

            // Producer가 하나라도 있으면 true (꼭 활성화되어 있지 않아도 됨)
            return hasVideoProducer || hasAudioProducer;
        }

        // Producer 생성 대기 함수 추가
        async function waitForProducers(maxWaitTime = 5000) {
            const startTime = Date.now();

            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (videoProducer || audioProducer) {
                        clearInterval(checkInterval);
                        console.log('Producer 생성 확인됨');
                        resolve(true);
                    } else if (Date.now() - startTime > maxWaitTime) {
                        clearInterval(checkInterval);
                        console.log('Producer 생성 타임아웃');
                        resolve(false);
                    }
                }, 100);
            });
        }

        // ========= 녹화 기능 토글 ==========
        // 3. toggleRecording 함수 수정
        async function toggleRecording() {
            const recordBtn = document.getElementById('recordBtn');
            const recordingIndicator = document.getElementById('recordingIndicator');

            if (!isRecording) {
                // Producer 체크
                if (!videoProducer && !audioProducer) {
                    showToast('미디어 연결 중입니다. 잠시만 기다려주세요...', 'warning');

                    // Producer 생성 대기
                    const producersReady = await waitForProducers();

                    if (!producersReady) {
                        showToast('미디어 연결에 실패했습니다. 페이지를 새로고침해주세요.', 'error');

                        // Transport가 있는지 확인하고 Producer 생성 시도
                        if (producerTransport && localStream) {
                            showToast('Producer 생성을 재시도합니다...', 'warning');
                            try {
                                await startProducing();
                                // 다시 한번 대기
                                const retryReady = await waitForProducers(3000);
                                if (!retryReady) {
                                    showToast('미디어 연결에 실패했습니다. 관리자에게 문의하세요.', 'error');
                                    return;
                                }
                            } catch (error) {
                                console.error('Producer 생성 실패:', error);
                                showToast('미디어 연결에 실패했습니다.', 'error');
                                return;
                            }
                        } else {
                            return;
                        }
                    }
                }

                // Producer가 있으면 활성 상태 체크
                const hasActiveMedia = checkActiveMediaStreams();

                if (!hasActiveMedia) {
                    showToast('녹화를 시작하려면 카메라나 마이크를 켜주세요', 'warning');

                    const userChoice = confirm(
                        '녹화를 시작하려면 카메라나 마이크가 켜져 있어야 합니다.\n\n' +
                        '카메라를 켜시겠습니까?'
                    );

                    if (userChoice) {
                        if (!isVideoOn) {
                            toggleVideo();
                            setTimeout(() => {
                                if (checkActiveMediaStreams()) {
                                    startRecordingInternal();
                                } else {
                                    showToast('미디어 활성화에 실패했습니다.');
                                }
                            }, 1000);
                        }
                    }
                    return;
                }

                // 녹화 시작 확인
                if (!confirm('녹화를 시작하시겠습니까?')) {
                    return;
                }

                // 녹화 시작
                startRecordingInternal();

            } else {
                // 녹화 종료
                if (!confirm('녹화를 종료하시겠습니까?')) {
                    return;
                }

                // 녹화 종료 요청
                // 녹화 종료 부분 수정
                socket.emit('stopRecording', {
                    roomId: roomId,
                    recordingId: currentRecordingId
                    }, (response) => {
                        console.log('녹화 종료 응답:', response);

                    if (!response) {
                        console.error('서버 응답이 없습니다');
                        showToast('녹화 종료 실패: 서버 응답 없음', 'error');
                        return;
                    }

                    if (response.error) {
                        showToast('녹화 종료 실패: ' + response.error, 'error');
                        return;
                    }

                    // UI 업데이트
                    isRecording = false;
                    currentRecordingId = null;

                    const recordBtn = document.getElementById('recordBtn');
                    if (recordBtn) {
                        recordBtn.classList.remove('active');
                    }

                    // ⭐ 헤더 녹화 표시 숨기기
                    const headerRecordingIndicator = document.getElementById('headerRecordingIndicator');
                    if (headerRecordingIndicator) {
                        headerRecordingIndicator.style.display = 'none';
                        stopRecordingTimer(); // 타이머 중지
                    }

                    showToast('녹화가 종료되었습니다', 'success');
                    console.log('녹화 종료:', response);

                    // 녹화 파일 정보 표시 (선택사항)
                    if (response.fileSize) {
                        const fileSizeMB = (response.fileSize / 1024 / 1024).toFixed(2);
                        showToast(`녹화 파일 크기: ${fileSizeMB}MB`);
                    }
                });

                // 다른 사용자가 녹화 시작했을 때
                socket.on('recordingStarted', ({ recordingId, recorderName }) => {
                    if (recorderName !== displayName) {
                        isRecording = true;
                        currentRecordingId = recordingId;

                        const recordBtn = document.getElementById('recordBtn');
                        if (recordBtn) recordBtn.classList.add('active');

                        // ⭐ 헤더 녹화 표시 보이기
                        const headerRecordingIndicator = document.getElementById('headerRecordingIndicator');
                        if (headerRecordingIndicator) {
                            headerRecordingIndicator.style.display = 'flex';
                            startRecordingTimer();
                        }

                        showToast(`${recorderName}님이 녹화를 시작했습니다`);
                    }
                });

                // 다른 사용자가 녹화 종료했을 때
                socket.on('recording-stopped', ({ recordingId, stoppedBy }) => {
                    if (stoppedBy !== displayName) {
                        isRecording = false;
                        currentRecordingId = null;

                        const recordBtn = document.getElementById('recordBtn');
                        if (recordBtn) recordBtn.classList.remove('active');

                        // ⭐ 헤더 녹화 표시 숨기기
                        const headerRecordingIndicator = document.getElementById('headerRecordingIndicator');
                        if (headerRecordingIndicator) {
                            headerRecordingIndicator.style.display = 'none';
                            stopRecordingTimer();
                        }

                        showToast(`${stoppedBy}님이 녹화를 종료했습니다`);
                    }
                });
            }
        }


        // 채팅 토글 (수정됨)
        function toggleChat() {
            const chatPanel = document.getElementById('chatPanel');
            const chatBtn = document.getElementById('chatBtn');

            chatPanel.classList.toggle('hidden');
            chatBtn.classList.toggle('active');

            // 채팅 패널이 표시되면 알림 표시 제거 및 스크롤 아래로
            if (!chatPanel.classList.contains('hidden')) {
                chatBtn.classList.remove('active');

                // 스크롤을 맨 아래로 이동
                const chatMessages = document.getElementById('chatMessages');
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // 채팅 입력 필드에 포커스
                document.getElementById('chatInputField').focus();
            } else {
                // 채팅 패널을 닫을 때 타이핑 중지
                stopTyping();
            }
        }

        // 레이아웃 선택자 토글
        function toggleLayoutSelector() {
            const layoutSelector = document.getElementById('layoutSelector');
            layoutSelector.classList.toggle('show');
        }

        // 레이아웃 설정
        function setLayout(layout) {
            currentLayout = layout;
            const videoGrid = document.getElementById('videoGrid');
            const layoutOptions = document.querySelectorAll('.layout-option');

            videoGrid.classList.remove('grid-layout', 'speaker-layout');
            videoGrid.classList.add(`${layout}-layout`);

            layoutOptions.forEach(option => {
                option.classList.remove('active');
                if (option.textContent.includes(layout === 'grid' ? '그리드' : '발표자')) {
                    option.classList.add('active');
                }
            });

            document.getElementById('layoutSelector').classList.remove('show');
            showToast(`${layout === 'grid' ? '그리드' : '발표자'} 보기로 변경`);
        }

        // 채팅 입력 처리
        function handleChatInput(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();

                const input = event.target;

                // 한글 입력 중인지 확인 (composing 상태 체크)
                if (event.isComposing || event.keyCode === 229) {
                    // 한글 조합 중이면 플래그 설정하고 리턴
                    window.enterPressedDuringComposition = true;
                    return;
                }

                const message = input.value.trim();

                if (message) {
                    // 메시지 전송
                    const timestamp = new Date();

                    // 로컬에서 먼저 메시지 표시
                    addChatMessage(displayName, message, timestamp);

                    // 서버로 메시지 전송
                    socket.emit('chat-message', {
                        roomId,
                        message,
                        timestamp
                    });

                    // 타이핑 상태 중지
                    stopTyping();

                    // 입력 필드 초기화
                    input.value = '';
                }
            }
        }

        // 한글 입력 완료 처리
        function handleCompositionEnd(event) {
            const input = event.target;

            // Enter 키가 눌렸던 경우 메시지 전송
            if (window.enterPressedDuringComposition) {
                window.enterPressedDuringComposition = false;

                const message = input.value.trim();

                if (message) {
                    // 메시지 전송
                    const timestamp = new Date();

                    // 로컬에서 먼저 메시지 표시
                    addChatMessage(displayName, message, timestamp);

                    // 서버로 메시지 전송
                    socket.emit('chat-message', {
                        roomId,
                        message,
                        timestamp
                    });

                    // 타이핑 상태 중지
                    stopTyping();

                    // 입력 필드 초기화
                    input.value = '';
                }
            }
        }

        // 타이핑 이벤트 처리 (개선됨)
        function handleTyping(event) {
            if (!socket || !socket.connected) return;

            // 빈 입력일 때는 타이핑 중지
            if (event.target.value.trim() === '') {
                if (isTyping) {
                    stopTyping();
                }
                return;
            }

            // 타이핑 시작
            if (!isTyping) {
                isTyping = true;
                socket.emit('typing', {
                    roomId: roomId,
                    isTyping: true
                });
            }

            // 타이머 재설정
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(stopTyping, TYPING_TIMER_LENGTH);
        }

        // 타이핑 중지
        function stopTyping() {
            if (!isTyping) return;

            isTyping = false;
            socket.emit('typing', {
                roomId: roomId,
                isTyping: false
            });

            clearTimeout(typingTimeout);
        }

        // 채팅 메시지 추가
        function addChatMessage(author, message, timestamp) {
            const chatMessages = document.getElementById('chatMessages');
            const time = new Date(timestamp || new Date()).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message';
            messageEl.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${escapeHtml(message)}</div>
            `;

            chatMessages.appendChild(messageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 채팅 패널이 숨겨져 있으면 알림 표시
            if (document.getElementById('chatPanel').classList.contains('hidden')) {
                const chatBtn = document.getElementById('chatBtn');
                chatBtn.classList.add('active');
                // 알림 효과 추가 (깜빡임)
                chatBtn.animate([
                    { opacity: 1 },
                    { opacity: 0.5 },
                    { opacity: 1 }
                ], {
                    duration: 1000,
                    iterations: 3
                });
            }
        }

        // 파일 메시지 추가
        function addFileMessage(author, fileInfo, timestamp) {
            const chatMessages = document.getElementById('chatMessages');
            const time = new Date(timestamp || new Date()).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const messageEl = document.createElement('div');
            messageEl.className = 'chat-message';
            messageEl.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="file-message">
                   <div class="file-info">
                        <div class="file-icon">${getFileIcon(fileInfo.originalName)}</div>
                        <div class="file-details">
                            <div class="file-name">${escapeHtml(fileInfo.originalName)}</div>
                            <div class="file-size">${formatFileSize(fileInfo.size)}</div>
                        </div>
                        <button class="file-download-btn" onclick="downloadFile('${fileInfo.filename}', '${fileInfo.originalName}')">
                            다운로드
                        </button>
                    </div>
                </div>
            `;

            chatMessages.appendChild(messageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 채팅 패널이 숨겨져 있으면 알림 표시
            if (document.getElementById('chatPanel').classList.contains('hidden')) {
                const chatBtn = document.getElementById('chatBtn');
                chatBtn.classList.add('active');
                // 알림 효과 추가 (깜빡임)
                chatBtn.animate([
                    { opacity: 1 },
                    { opacity: 0.5 },
                    { opacity: 1 }
                ], {
                    duration: 1000,
                    iterations: 3
                });
            }
        }

        // HTML 이스케이프
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        // 4. showToast 함수 개선 (warning 타입 지원 추가)
        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            toast.textContent = message;

            // 기존 클래스 제거
            toast.classList.remove('show', 'warning', 'error', 'success');

            // 타입에 따른 클래스 추가
            if (type === 'warning') {
                toast.classList.add('warning');
            } else if (type === 'error') {
                toast.classList.add('error');
            } else if (type === 'success') {
                toast.classList.add('success');
            }

            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // 추가: 자동 녹화 시작 함수 (회의 옵션에 따른 자동 녹화용)
        async function startAutoRecording() {
            // 미디어가 준비될 때까지 대기
            let retryCount = 0;
            const maxRetries = 10;

            const checkAndStart = () => {
                if (checkActiveMediaStreams()) {
                    console.log('자동 녹화 시작 - 미디어 준비됨');
                    startRecordingInternal();
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`자동 녹화 대기 중... (${retryCount}/${maxRetries})`);
                    setTimeout(checkAndStart, 1000);
                } else {
                    console.warn('자동 녹화 실패 - 미디어가 준비되지 않음');
                    showToast('자동 녹화를 시작할 수 없습니다. 카메라나 마이크를 켜주세요.', 'warning');
                }
            };

            checkAndStart();
        }

        // ===== 파일 업로드 관련 함수들 =====
        // 파일 크기 포맷팅
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // 파일 확장자에 따른 아이콘 가져오기
        function getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const icons = {
                pdf: '📄',
                doc: '📝', docx: '📝',
                xls: '📊', xlsx: '📊',
                png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
                zip: '📦', rar: '📦',
                txt: '📃',
                default: '📎'
            };
            return icons[ext] || icons.default;
        }

        // 파일 선택 처리
        async function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 파일 크기 확인 (10MB 제한)
            if (file.size > 10 * 1024 * 1024) {
                showToast('파일 크기는 10MB를 초과할 수 없습니다');
                event.target.value = '';
                return;
            }

            // 파일 업로드
            await uploadFile(file);

            // 입력 초기화
            event.target.value = '';
        }

        // 파일 업로드
        async function uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('peerId', peerId);

            // 진행률 표시
            const progressDiv = document.getElementById('uploadProgress');
            const progressFill = document.getElementById('progressFill');
            const uploadStatus = document.getElementById('uploadStatus');

            progressDiv.style.display = 'block';

            try {
                const xhr = new XMLHttpRequest();

                // 업로드 진행률 이벤트
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        progressFill.style.width = percentComplete + '%';
                        uploadStatus.textContent = Math.round(percentComplete) + '%';
                    }
                });

                // 업로드 완료 이벤트
                xhr.addEventListener('load', function() {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);

                        if (response.success) {
                            // 로컬에서 파일 메시지 표시
                            const fileInfo = {
                                ...response.file,
                                uploadedBy: displayName,
                                peerId: peerId
                            };

                            // 로컬에서 먼저 파일 메시지 표시
                            addFileMessage(displayName, fileInfo, new Date());

                            // Socket.IO로 파일 공유 알림 (다른 사용자들에게 전달)
                            socket.emit('file-uploaded', {
                                roomId: roomId,
                                fileInfo: response.file
                            });

                            showToast('파일 업로드 완료');
                        } else {
                            showToast('파일 업로드 실패: ' + response.error);
                        }
                    } else {
                        showToast('파일 업로드 실패');
                    }

                    // 진행률 숨기기
                    setTimeout(() => {
                        progressDiv.style.display = 'none';
                        progressFill.style.width = '0%';
                        uploadStatus.textContent = '0%';
                    }, 1000);
                });

                // 에러 이벤트
                xhr.addEventListener('error', function() {
                    showToast('파일 업로드 중 오류가 발생했습니다');
                    progressDiv.style.display = 'none';
                });

                // 요청 전송
                const serverUrl = window.location.protocol + '//' + window.location.hostname + ':3001';
                xhr.open('POST', `${serverUrl}/api/rooms/${roomId}/upload`);
                xhr.send(formData);

            } catch (error) {
                console.error('파일 업로드 오류:', error);
                showToast('파일 업로드 실패');
                progressDiv.style.display = 'none';
            }
        }

        // 파일 다운로드
        function downloadFile(filename, originalName) {
            const serverUrl = window.location.protocol + '//' + window.location.hostname + ':3001';
            const downloadUrl = `${serverUrl}/api/rooms/${roomId}/files/${filename}`;

            // 다운로드 링크 생성
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = originalName || filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // 원격 비디오 추가
        function addRemoteVideo(peerId, displayName, profileImg) {
            const videoGrid = document.getElementById('videoGrid');

            const container = document.createElement('div');
            container.className = 'video-container';
            container.id = `container-${peerId}`;

            // 프로필 이미지가 있으면 표시, 없으면 이니셜
            const placeholderContent = profileImg && profileImg !== 'null'
                ? `<img src="${profileImg}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
                : displayName.charAt(0).toUpperCase();

            container.innerHTML = `
                <video id="video-${peerId}" autoplay playsinline></video>
                <div class="video-placeholder" style="display: flex;">${placeholderContent}</div>
                <div class="video-info">
                    <span>${displayName}</span>
                    <span class="mic-status">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </span>
                </div>
            `;

            videoGrid.appendChild(container);

            // 더블클릭 시 전체화면 이벤트 추가
            container.addEventListener('dblclick', function() {
                toggleFullscreen(this);
            });
        }

        // addParticipant 함수 추가
        function addParticipant(peerId, displayName) {
            addRemoteVideo(peerId, displayName);
        }

        // 원격 비디오 제거
        function removeRemoteVideo(peerId) {
            const container = document.getElementById(`container-${peerId}`);
            if (container) {
                container.remove();
            }

            // 해당 피어의 consumer 정리
            consumers.forEach((consumer, id) => {
                if (consumer.appData && consumer.appData.peerId === peerId) {
                    consumer.close();
                    consumers.delete(id);
                }
            });
        }

        // ===== 회의 종료 함수 추가 (호스트 전용) =====
        function exitMeeting() {
            // 호스트가 아닌 경우 경고
            if (!isHost) {
                alert('호스트만 회의를 종료할 수 있습니다.');
                return;
            }

            if (confirm('정말로 회의를 종료하시겠습니까? 모든 참가자가 회의에서 나가게 됩니다.')) {
                // 서버에 회의 종료 요청
                socket.emit('end-meeting', { roomId }, (response) => {
                    if (response.error) {
                        showToast('회의 종료 실패: ' + response.error);
                        return;
                    }

                    // 미디어 정리
                    cleanupMedia();

                    // 워크스페이스로 이동
                    window.location.href = `${SPRING_BOOT_URL}/wsmain?workspaceCd=${workspaceId}`;
                });
            }
        }

        // 참가자 수 업데이트
        function updateParticipantCount() {
            const count = document.querySelectorAll('.video-container').length;
            document.getElementById('participantCount').textContent = count;
        }

        // 회의 나가기
        function leaveRoom() {
            if (confirm('정말로 회의에서 나가시겠습니까?')) {
                meetingEnded = true;

                try {
                    // 소켓 연결 종료
                    if (socket) {
                        socket.emit('leave-room', { roomId, peerId });
                        socket.disconnect();
                    }

                    // 미디어 스트림 정리
                    if (localStream) {
                        localStream.getTracks().forEach(track => track.stop());
                    }
                    if (screenStream) {
                        screenStream.getTracks().forEach(track => track.stop());
                    }

                    // Producer 정리
                    if (audioProducer) audioProducer.close();
                    if (videoProducer) videoProducer.close();
                    if (screenProducer) screenProducer.close();

                    // Consumer 정리
                    consumers.forEach(consumer => consumer.close());
                    consumers.clear();

                    // Transport 정리
                    if (producerTransport) producerTransport.close();
                    if (consumerTransport) consumerTransport.close();

                    // Spring Boot 서버로 리다이렉트 (list 페이지로)
                    // workspaceId를 workspaceCd로 전달
                    const redirectUrl = `${SPRING_BOOT_URL}/meeting/list?workspaceCd=${workspaceId}`;

                    console.log('회의 종료, 리다이렉트:', redirectUrl);

                    // 현재 창에서 이동
                    window.location.href = redirectUrl;

                } catch (error) {
                    console.error('회의 나가기 중 오류:', error);
                    // 오류가 발생해도 list 페이지로 이동
                    window.location.href = `${SPRING_BOOT_URL}/meeting/list?workspaceCd=${workspaceId}`;
                }
            }
        }

        // 회의 설정 페이지로 돌아가기
        function exitToSetup() {
            if (confirm('회의 설정 페이지로 돌아가시겠습니까? 현재 회의는 계속 진행됩니다.')) {
                // workspaceId를 가져오기
                const urlParams = new URLSearchParams(window.location.search);
                const workspaceId = urlParams.get('workspaceId');

                if (workspaceId) {
                    // ⭐ Spring Boot 서버의 meeting-setup 페이지로 이동
                    window.location.href = `${SPRING_BOOT_URL}/meeting/setup?workspaceCd=${workspaceId}`;
                } else {
                    // ⭐ workspaceId가 없으면 워크스페이스 목록 페이지로
                    window.location.href = SPRING_BOOT_URL + '/workspace';
                }
            }
        }

        // 페이지 로드 시 초기화
        window.addEventListener('load', () => {
            // displayName과 roomName 초기화
            document.getElementById('localName').textContent = displayName;

            // 종료 버튼 초기 숨김
            const endCallBtn = document.getElementById('endCallBtn');
            if (endCallBtn) {
                endCallBtn.style.display = 'none';
            }

            // URL 파라미터에서 재접속 여부 확인
            const isRejoining = urlParams.get('rejoin') === 'true';
            if (isRejoining) {
                // 재접속 모드로 초기화
                showToast('회의에 재접속을 시도합니다...');
            }

            // 프로필 이미지가 있으면 표시, 없으면 이니셜 표시
            const localPlaceholder = document.getElementById('localPlaceholder');

            if (userProfileImg && userProfileImg !== 'null' && userProfileImg !== 'undefined') {
                // URL 디코딩
                let imgSrc = decodeURIComponent(userProfileImg);

                // ⭐ 상대 경로를 절대 경로로 변환 (이 부분이 추가됨!)
                if (!imgSrc.startsWith('http')) {
                    imgSrc = 'http://localhost:8080' + (imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc);
                    console.log('프로필 이미지를 절대 경로로 변환:', imgSrc);
                }

                // 포트 변경 (이미 있음)
                if (imgSrc.includes(':8081')) {
                    imgSrc = imgSrc.replace(':8081', ':8080');
                }

                 console.log('페이지 로드 - 최종 이미지 URL:', imgSrc);

                localPlaceholder.innerHTML = `
                    <img src="${imgSrc}"
                         alt="${displayName}"
                         style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                         onerror="this.onerror=null; this.parentElement.innerHTML='${displayName.charAt(0).toUpperCase()}'">
                `;
            } else {
                localPlaceholder.textContent = displayName.charAt(0).toUpperCase();
            }

            // ⭐ 회의 제목 설정
            document.getElementById('roomName').textContent = meetingTitle;

            // 회의 옵션 적용
            if (meetingOptions.muteOnJoin) {
                isAudioOn = false;
                document.getElementById('micBtn').classList.add('active');
            }

            // 녹화 자동 시작
            if (meetingOptions.autoRecord) {
                setTimeout(() => {
                    if (socket && socket.connected) {
                        startAutoRecording();  // 새로 만든 함수 호출
                    }
                }, 3000);
            }

            // 채팅 입력 필드 이벤트 리스너 추가
            const chatInput = document.getElementById('chatInputField');

            // 포커스 아웃 시 타이핑 중지
            chatInput.addEventListener('blur', stopTyping);

            init();
            updateParticipantCount();

            // 로컬 비디오 더블클릭 시 전체화면
            document.getElementById('localVideoContainer').addEventListener('dblclick', function() {
                toggleFullscreen(this);
            });
        });

        // 4. 원격 사용자의 비디오가 꺼졌을 때도 프로필 처리 (handleRemoteVideoOff 함수 추가/수정)
        function handleRemoteVideoOff(peerId, userInfo) {
            const remoteContainer = document.getElementById(`remote-${peerId}`);
            if (!remoteContainer) return;

            const remoteVideo = remoteContainer.querySelector('video');
            const remotePlaceholder = remoteContainer.querySelector('.video-placeholder');

            if (remoteVideo) {
                remoteVideo.style.display = 'none';
            }

            if (remotePlaceholder) {
                // 원격 사용자의 프로필 이미지 처리
                if (userInfo?.profileImg && userInfo.profileImg !== 'null') {
                    // URL 디코딩
                    let imgSrc = decodeURIComponent(userInfo.profileImg);

                    remotePlaceholder.innerHTML = `
                        <img src="${imgSrc}"
                             alt="${userInfo.displayName || '참가자'}"
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                             onerror="this.onerror=null; this.parentElement.innerHTML='${(userInfo.displayName || '참가자').charAt(0).toUpperCase()}'">
                    `;
                } else {
                    remotePlaceholder.textContent = (userInfo?.displayName || '참가자').charAt(0).toUpperCase();
                }

                remotePlaceholder.style.display = 'flex';
            }
        }

        // 전체화면 토글 함수
        function toggleFullscreen(element) {
            if (!document.fullscreenElement &&    // 표준 속성
                !document.mozFullScreenElement && // Firefox
                !document.webkitFullscreenElement && // Chrome, Safari, Opera
                !document.msFullscreenElement) {  // IE/Edge

                // 전체화면 진입
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
            } else {
                // 전체화면 종료
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        }

        // ===== 미디어 정리 함수 =====
        function cleanupMedia() {
            // 모든 프로듀서 정리
            if (audioProducer) audioProducer.close();
            if (videoProducer) videoProducer.close();
            if (screenProducer) screenProducer.close();

            // 녹화 타이머 정리
            stopRecordingTimer();

            // 모든 컨슈머 정리
            consumers.forEach(consumer => consumer.close());

            // Transport 정리
            if (producerTransport) producerTransport.close();
            if (consumerTransport) consumerTransport.close();

            // 로컬 스트림 정리
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }

            // Socket 연결 종료
            if (socket) {
                socket.disconnect();
            }
        }

        // 회의 상태 확인
        // const response = await fetch(`/api/meetings/${roomId}/status`);
        // const data = await response.json();

        // 재접속 처리 함수 수정
        async function rejoinMeeting() {
            try {
                showToast('회의에 재접속 중...');

                const routerRtpCapabilities = await new Promise((resolve, reject) => {
                    socket.emit('get-router-rtp-capabilities', (capabilities) => {
                        resolve(capabilities);
                    });
                });

                await initializeDevice(routerRtpCapabilities);

                let actualUserId = userId;
                if (!actualUserId) {
                    actualUserId = localStorage.getItem('userId');
                }
                if (!actualUserId) {
                    const tokenUserInfo = getUserInfoFromToken();
                    actualUserId = tokenUserInfo?.userId;
                    if (actualUserId) {
                        localStorage.setItem('userId', actualUserId);
                    }
                }

                console.log('재접속 시 사용할 userId:', actualUserId);
                console.log('재접속 시 displayName:', displayName);

                // ⭐ join-room 이벤트 사용
                socket.emit('join-room', {
                    roomId,
                    workspaceId,
                    peerId,
                    displayName,  // 실제 이름이 전달되도록
                    userId: actualUserId,
                    rejoin: true
                });

                // ⭐ URL에서 호스트 정보가 있으면 즉시 적용
                if (isHostFromUrl) {
                    isHost = true;
                    const endCallBtn = document.getElementById('endCallBtn');
                    if (endCallBtn) {
                        endCallBtn.style.display = 'block';
                        console.log('재접속 시 URL 파라미터로 호스트 버튼 표시');
                    }
                }

            } catch (error) {
                console.error('회의 재접속 실패:', error);
                showToast('재접속 실패: ' + error.message);

                if (confirm('재접속에 실패했습니다. 다시 시도하시겠습니까?')) {
                    window.location.reload();
                } else {
                    window.location.href = `${SPRING_BOOT_URL}/wsmain?workspaceCd=${workspaceId}`;
                }
            }
        }

        // 페이지 나가기 전 정리
        window.addEventListener('beforeunload', () => {
            if (socket && socket.connected) {
                socket.disconnect();
            }
        });

        // 타이핑 표시기 업데이트 (완전히 새로 작성)
        function updateTypingIndicator(typingPeerId, displayName, isTyping) {
            if (isTyping) {
                // 타이핑 시작
                typingUsers.set(typingPeerId, {
                    displayName: displayName,
                    timestamp: Date.now()
                });
            } else {
                // 타이핑 종료
                typingUsers.delete(typingPeerId);
            }

            // UI 업데이트
            renderTypingIndicator();
        }

        // 타이핑 표시기 렌더링
        function renderTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            const typingAvatars = document.getElementById('typingAvatars');
            const typingText = document.getElementById('typingText');
            const chatMessages = document.getElementById('chatMessages');

            // 타이핑 중인 사용자가 없으면 숨김
            if (typingUsers.size === 0) {
                typingIndicator.classList.remove('show');
                setTimeout(() => {
                    if (typingUsers.size === 0) {
                        typingIndicator.style.display = 'none';
                    }
                }, 300);
                return;
            }

            // 타이핑 중인 사용자들 정보 가져오기
            const typingUsersList = Array.from(typingUsers.values());

            // 아바타 렌더링
            typingAvatars.innerHTML = '';
            const maxAvatars = 3;
            const avatarsToShow = typingUsersList.slice(0, maxAvatars);

            avatarsToShow.forEach(user => {
                const avatar = document.createElement('div');
                avatar.className = 'typing-avatar';
                avatar.textContent = user.displayName.charAt(0).toUpperCase();
                avatar.title = user.displayName;
                typingAvatars.appendChild(avatar);
            });

            // 텍스트 업데이트
            if (typingUsers.size === 1) {
                typingText.textContent = `${typingUsersList[0].displayName}님이 입력 중`;
                typingIndicator.classList.remove('multiple');
            } else if (typingUsers.size === 2) {
                typingText.textContent = `${typingUsersList[0].displayName}님과 ${typingUsersList[1].displayName}님이 입력 중`;
                typingIndicator.classList.add('multiple');
            } else {
                const othersCount = typingUsers.size - 2;
                typingText.textContent = `${typingUsersList[0].displayName}님 외 ${typingUsers.size - 1}명이 입력 중`;
                typingIndicator.classList.add('multiple');
            }

            // 표시
            typingIndicator.style.display = 'flex';
            setTimeout(() => {
                typingIndicator.classList.add('show');
            }, 10);

            // 스크롤 아래로
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // 타이핑 타임아웃 체크 (오래된 타이핑 상태 제거)
        function checkTypingTimeouts() {
            const now = Date.now();
            const timeout = 5000; // 5초

            typingUsers.forEach((user, peerId) => {
                if (now - user.timestamp > timeout) {
                    typingUsers.delete(peerId);
                }
            });

            renderTypingIndicator();
        }

        // 주기적으로 타임아웃 체크
        setInterval(checkTypingTimeouts, 1000);