/**
 * 회의 준비 페이지 JavaScript - 수정된 버전
 * 카메라와 마이크를 독립적으로 제어할 수 있도록 개선
 */
class MeetingSetup {
  constructor() {
    this.localStream = null;
    this.videoTrack = null;
    this.audioTrack = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;

    // 장치 상태 추적
    this.isCameraOn = false;
    this.isMicOn = false;

    this.initializeElements();
    this.initializeEventListeners();
    this.checkDevicePermissions();
  }

  /**
   * DOM 요소 초기화
   */
  initializeElements() {
    // 비디오 요소
    this.videoElement = document.getElementById('localVideo');
    this.videoPlaceholder = document.getElementById('videoPlaceholder');

    // 컨트롤 버튼
    this.cameraToggle = document.getElementById('cameraToggle');
    this.micToggle = document.getElementById('micToggle');

    // 장치 선택
    this.cameraSelect = document.getElementById('cameraSelect');
    this.micSelect = document.getElementById('micSelect');
    this.speakerSelect = document.getElementById('speakerSelect');

    // 볼륨 미터
    this.volumeBar = document.getElementById('volumeBar');

    // 폼 요소
    this.meetingForm = document.getElementById('meetingForm');

    // 기타
    this.loadingOverlay = document.getElementById('loadingOverlay');
  }

  /**
   * 이벤트 리스너 설정
   */
  initializeEventListeners() {
    // 미디어 컨트롤
    if (this.cameraToggle) {
      this.cameraToggle.addEventListener('click', () => this.toggleCamera());
    }
    if (this.micToggle) {
      this.micToggle.addEventListener('click', () => this.toggleMicrophone());
    }

    // 장치 변경
    if (this.cameraSelect) {
      this.cameraSelect.addEventListener('change', () => this.changeCamera());
    }
    if (this.micSelect) {
      this.micSelect.addEventListener('change', () => this.changeMicrophone());
    }
    if (this.speakerSelect) {
      this.speakerSelect.addEventListener('change', () => this.changeSpeaker());
    }

    // 테스트 버튼
    const testSpeakerBtn = document.getElementById('testSpeaker');
    if (testSpeakerBtn) {
      testSpeakerBtn.addEventListener('click', () => this.testSpeaker());
    }

    // 폼 제출
    if (this.meetingForm) {
      this.meetingForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  /**
   * 장치 권한 확인
   */
  async checkDevicePermissions() {
    try {
      // 권한 요청 (짧게만)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // 즉시 정지
      stream.getTracks().forEach(track => track.stop());

      // 장치 목록 로드
      await this.loadDevices();
    } catch (error) {
      console.log('미디어 권한 대기 중');
    }
  }

  /**
   * 스트림 업데이트 - 트랙들을 하나의 스트림으로 합침
   */
  updateStream() {
    // 기존 스트림이 있으면 정리
    if (this.localStream) {
      // 기존 트랙들 제거
      this.localStream.getTracks().forEach(track => {
        this.localStream.removeTrack(track);
      });
    } else {
      // 새 스트림 생성
      this.localStream = new MediaStream();
    }

    // 활성 트랙들 추가
    if (this.videoTrack) {
      this.localStream.addTrack(this.videoTrack);
    }
    if (this.audioTrack) {
      this.localStream.addTrack(this.audioTrack);
    }

    // 비디오 요소에 스트림 설정
    if (this.videoTrack) {
      this.videoElement.srcObject = this.localStream;
      this.videoElement.style.display = 'block';
      this.videoPlaceholder.style.display = 'none';
    } else {
      this.videoElement.srcObject = null;
      this.videoElement.style.display = 'none';
      this.videoPlaceholder.style.display = 'flex';
    }
  }

  /**
   * 카메라 토글
   */
  async toggleCamera() {
    if (!this.isCameraOn) {
      await this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  /**
   * 카메라만 시작
   */
  async startCamera() {
    try {
      const constraints = {
        video: {
          deviceId: this.cameraSelect.value ? { exact: this.cameraSelect.value } : undefined
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoTrack = stream.getVideoTracks()[0];

      this.isCameraOn = true;
      this.updateStream();

      // 버튼 상태 업데이트
      this.cameraToggle.classList.add('active');

      // 버튼 텍스트 변경
      this.cameraToggle.querySelector('span').textContent = '카메라 끄기';

    } catch (error) {
      console.error('카메라 시작 실패:', error);
      alert('카메라를 시작할 수 없습니다. 권한을 확인해주세요.');
    }
  }

  /**
   * 카메라만 정지
   */
  stopCamera() {
    if (this.videoTrack) {
      this.videoTrack.stop();
      this.videoTrack = null;
    }

    this.isCameraOn = false;
    this.updateStream();

    // 버튼 상태 업데이트
    this.cameraToggle.classList.remove('active');

    // 버튼 텍스트 변경
    this.cameraToggle.querySelector('span').textContent = '카메라 켜기';
  }

  /**
   * 마이크 토글
   */
  async toggleMicrophone() {
    if (!this.isMicOn) {
      await this.startMicrophone();
    } else {
      this.stopMicrophone();
    }
  }

  /**
   * 마이크만 시작
   */
  async startMicrophone() {
    try {
      const constraints = {
        audio: {
          deviceId: this.micSelect.value ? { exact: this.micSelect.value } : undefined
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioTrack = stream.getAudioTracks()[0];

      this.isMicOn = true;
      this.updateStream();

      // 버튼 상태 업데이트
      this.micToggle.classList.add('active');

      // 버튼 텍스트 변경
      this.micToggle.querySelector('span').textContent = '마이크 끄기';

      // 오디오 레벨 모니터링 시작
      this.startVolumeMonitor();

    } catch (error) {
      console.error('마이크 시작 실패:', error);
      alert('마이크를 시작할 수 없습니다. 권한을 확인해주세요.');
    }
  }

  /**
   * 마이크만 정지
   */
  stopMicrophone() {
    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }

    this.isMicOn = false;
    this.updateStream();

    // 버튼 상태 업데이트
    this.micToggle.classList.remove('active');

    // 버튼 텍스트 변경
    this.micToggle.querySelector('span').textContent = '마이크 켜기';

    // 오디오 레벨 모니터링 중지
    this.stopVolumeMonitor();
  }

  /**
   * 오디오 레벨 모니터링 시작
   */
  startVolumeMonitor() {
    if (!this.localStream || !this.audioTrack) return;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.microphone = this.audioContext.createMediaStreamSource(this.localStream);
    this.microphone.connect(this.analyser);

    this.analyser.fftSize = 256;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!this.analyser || !this.isMicOn) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const percentage = Math.min(100, (average / 255) * 200);

      if (this.volumeBar) {
        this.volumeBar.style.width = `${percentage}%`;
      }

      requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  /**
   * 오디오 레벨 모니터링 중지
   */
  stopVolumeMonitor() {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser = null;
    }
    if (this.volumeBar) {
      this.volumeBar.style.width = '0%';
    }
  }

  /**
   * 카메라 변경
   */
  async changeCamera() {
    if (this.isCameraOn) {
      this.stopCamera();
      await this.startCamera();
    }
  }

  /**
   * 마이크 변경
   */
  async changeMicrophone() {
    if (this.isMicOn) {
      this.stopMicrophone();
      await this.startMicrophone();
    }
  }

  /**
   * 스피커 변경
   */
  async changeSpeaker() {
    if (this.videoElement && this.speakerSelect.value) {
      try {
        await this.videoElement.setSinkId(this.speakerSelect.value);
      } catch (error) {
        console.error('스피커 변경 실패:', error);
      }
    }
  }

  /**
   * 스피커 테스트
   */
  testSpeaker() {
    const audio = new Audio('/sounds/test-sound.mp3');
    if (this.speakerSelect.value) {
      audio.setSinkId(this.speakerSelect.value);
    }
    audio.play();
  }

  /**
   * 장치 목록 로드
   */
  async loadDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      // 카메라 목록
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.cameraSelect.innerHTML = '<option value="">카메라를 선택하세요</option>';
      videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `카메라 ${this.cameraSelect.options.length}`;
        this.cameraSelect.appendChild(option);
      });

      // 마이크 목록
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      this.micSelect.innerHTML = '<option value="">마이크를 선택하세요</option>';
      audioDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `마이크 ${this.micSelect.options.length}`;
        this.micSelect.appendChild(option);
      });

      // 스피커 목록
      const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');
      this.speakerSelect.innerHTML = '<option value="">스피커를 선택하세요</option>';
      audioOutputDevices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || `스피커 ${this.speakerSelect.options.length}`;
        this.speakerSelect.appendChild(option);
      });

    } catch (error) {
      console.error('장치 목록 로드 실패:', error);
    }
  }

  /**
   * 폼 제출 처리 - 수정된 버전
   */
  async handleSubmit(e) {
      e.preventDefault();

      // 로딩 표시
      if (this.loadingOverlay) {
        this.loadingOverlay.style.display = 'flex';
      }

      try {
        // 폼 데이터 수집
        const formData = new FormData(this.meetingForm);

        // 선택된 멤버 수집
        const invitedMembers = [];
        document.querySelectorAll('input[name="invitedMembers"]:checked').forEach(checkbox => {
          invitedMembers.push(checkbox.value);
        });

        // 녹화 경로 설정
        let recordingPath = null;
        const pathType = document.querySelector('input[name="pathType"]:checked')?.value;
        if (pathType === 'custom') {
          recordingPath = document.getElementById('recordingPath').value;
          if (!recordingPath) {
            alert('녹화 경로를 입력해주세요.');
            if (this.loadingOverlay) {
              this.loadingOverlay.style.display = 'none';
            }
            return;
          }
        }

        // 요청 데이터 구성
        const requestData = {
          title: formData.get('meetingTitle'),
          description: document.getElementById('meetingDesc').value,
          workspaceCd: workspaceCd,
          autoRecord: formData.get('autoRecord') === 'on',
          muteOnJoin: formData.get('muteOnJoin') === 'on',
          waitingRoom: formData.get('waitingRoom') === 'on',
          videoQuality: formData.get('videoQuality'),
          invitedMembers: invitedMembers,
          recordingPath: recordingPath // 이제 정의됨
        };

        // 회의 생성 API 호출
        const response = await fetch('/meeting/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          throw new Error('회의 생성 실패');
        }

        const result = await response.json();

        // 스트림 정리
        this.cleanup();

        // 회의실로 이동
        window.location.href = `${mediaServerUrl}/ocean-video-chat-complete.html?${new URLSearchParams({
          roomId: result.roomId,
          workspaceId: workspaceCd,
          peerId: currentUserId,
          displayName: result.displayName || '사용자',
          meetingType: 'sketch',
          autoRecord: requestData.autoRecord,
          muteOnJoin: requestData.muteOnJoin,
          videoQuality: requestData.videoQuality,
          meetingTitle: requestData.title,
          userProfileImg: result.userProfileImg || '',
          recordingPath: requestData.recordingPath || ''
        })}`;

      } catch (error) {
        console.error('회의 생성 실패:', error);
        alert('회의를 시작할 수 없습니다. 다시 시도해주세요.');

        if (this.loadingOverlay) {
          this.loadingOverlay.style.display = 'none';
        }
      }
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    // 카메라 정지
    if (this.videoTrack) {
      this.videoTrack.stop();
      this.videoTrack = null;
    }

    // 마이크 정지
    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }

    // 스트림 정리
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // 오디오 컨텍스트 정리
    this.stopVolumeMonitor();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.meetingSetup = new MeetingSetup();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  if (window.meetingSetup) {
    window.meetingSetup.cleanup();
  }
});

// ========== 모달 관련 전역 함수들 ==========

/**
 * 멤버 정보 모달 표시
 * @param {string} userId - 사용자 ID
 * @param {string} userNickname - 사용자 닉네임
 * @param {string} deptNm - 부서명
 * @param {string} position - 직책
 * @param {string} email - 이메일
 * @param {string} phoneNum - 전화번호
 * @param {string} statusMsg - 상태 메시지
 * @param {string} userImg - 프로필 이미지 URL
 */
function showMemberModal(userId, userNickname, deptNm, position, email, phoneNum, statusMsg, userImg) {
    // 모달 요소 가져오기
    const modal = document.getElementById('memberModal');
    if (!modal) return;

    // 프로필 이미지 처리
    const modalProfileImage = document.getElementById('modalProfileImage');
    const profileImg = modalProfileImage.querySelector('img');
    const profileInitial = modalProfileImage.querySelector('.profile-initial-large');

    if (userImg && userImg !== 'null' && userImg !== '') {
        // 프로필 이미지가 있는 경우
        profileImg.src = userImg;
        profileImg.style.display = 'block';
        profileImg.onerror = function() {
            // 이미지 로드 실패 시 이니셜 표시
            this.style.display = 'none';
            profileInitial.style.display = 'flex';
            profileInitial.textContent = userNickname ? userNickname.charAt(0).toUpperCase() : '?';
        };
        profileInitial.style.display = 'none';
    } else {
        // 프로필 이미지가 없는 경우 - 이니셜 표시
        profileImg.style.display = 'none';
        profileInitial.style.display = 'flex';
        profileInitial.textContent = userNickname ? userNickname.charAt(0).toUpperCase() : '?';

        // 랜덤 배경색 적용
        const colors = ['#4a9eff', '#ff6b6b', '#51cf66', '#ff922b', '#845ef7'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        profileInitial.style.backgroundColor = randomColor;
    }

    // 정보 업데이트
    document.getElementById('modalMemberName').textContent = userNickname || '이름 없음';
    document.getElementById('modalMemberPosition').textContent = position || '';
    document.getElementById('modalMemberDept').textContent = deptNm || '-';
    document.getElementById('modalMemberEmail').textContent = email || '-';
    document.getElementById('modalMemberPhone').textContent = phoneNum || '-';
    document.getElementById('modalMemberStatus').textContent = statusMsg || '-';

    // 모달에 사용자 ID 저장 (나중에 초대할 때 사용)
    modal.dataset.userId = userId;

    // 모달 표시
    modal.classList.add('show');

    // ESC 키로 닫기
    document.addEventListener('keydown', handleModalEsc);

    // 배경 클릭으로 닫기
    modal.addEventListener('click', handleModalBackgroundClick);
}

/**
 * 멤버 정보 모달 닫기
 */
function closeMemberModal() {
    const modal = document.getElementById('memberModal');
    if (!modal) return;

    // 모달 숨기기
    modal.classList.remove('show');

    // 이벤트 리스너 제거
    document.removeEventListener('keydown', handleModalEsc);
    modal.removeEventListener('click', handleModalBackgroundClick);

    // 데이터 초기화
    delete modal.dataset.userId;
}

/**
 * ESC 키 처리
 */
function handleModalEsc(e) {
    if (e.key === 'Escape') {
        closeMemberModal();
    }
}

/**
 * 배경 클릭 처리
 */
function handleModalBackgroundClick(e) {
    if (e.target.classList.contains('member-modal-overlay')) {
        closeMemberModal();
    }
}

/**
 * 멤버 초대 - 개선된 버전
 */
async function inviteMember(event) {
    // 이벤트 전파 방지
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const modal = document.getElementById('memberModal');
    const userId = modal.dataset.userId;

    if (!userId) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return false;
    }

    try {
        // 체크박스 찾기 - ID로 직접 찾기
        const checkbox = document.getElementById(`member-${userId}`);

        if (checkbox) {
            if (checkbox.disabled) {
                alert('본인은 자동으로 회의에 참가합니다.');
            } else {
                // 체크박스 상태 토글
                checkbox.checked = !checkbox.checked;

                // change 이벤트 수동 발생
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);

                // 체크박스 변경 함수 호출
                handleCheckboxChange(checkbox);

                // 성공 메시지
                if (checkbox.checked) {
                    alert('초대 목록에 추가되었습니다.');
                } else {
                    alert('초대 목록에서 제거되었습니다.');
                }
            }
        } else {
            console.error('체크박스를 찾을 수 없습니다:', userId);
        }

        // 모달 닫기
        closeMemberModal();

    } catch (error) {
        console.error('초대 실패:', error);
        alert('초대에 실패했습니다. 다시 시도해주세요.');
    }
    return false;
}

/**
 * 체크박스 변경 처리
 * @param {HTMLInputElement} checkbox - 변경된 체크박스
 */
function handleCheckboxChange(checkbox) {
    const userId = checkbox.value;
    const isChecked = checkbox.checked;

    console.log(`멤버 ${userId} 초대 상태: ${isChecked ? '선택됨' : '선택 해제됨'}`);

    // 선택된 멤버 수 업데이트
    updateInvitedCount();

    // 시각적 피드백
    const memberItem = checkbox.closest('.member-checkbox');
    if (memberItem) {
        if (isChecked) {
            memberItem.classList.add('selected');
        } else {
            memberItem.classList.remove('selected');
        }
    }
}

/**
 * 선택된 멤버 수 업데이트
 */
function updateInvitedCount() {
    const checkedBoxes = document.querySelectorAll('input[name="invitedMembers"]:checked');
    const count = checkedBoxes.length;

    // 선택된 멤버 수를 어딘가에 표시할 수 있음
    const countDisplay = document.getElementById('invitedCount');
    if (countDisplay) {
        countDisplay.textContent = count > 0 ? `(${count}명 선택됨)` : '';
    }
}

/**
 * 전체 선택/해제 기능
 */
function toggleAllMembers() {
    const checkboxes = document.querySelectorAll('input[name="invitedMembers"]:not(:disabled)');
    const checkedCount = document.querySelectorAll('input[name="invitedMembers"]:checked').length;
    const shouldCheck = checkedCount < checkboxes.length;

    checkboxes.forEach(checkbox => {
        checkbox.checked = shouldCheck;
        handleCheckboxChange(checkbox);
    });
}

// 경로 타입 변경 처리
document.querySelectorAll('input[name="pathType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const customPathInput = document.querySelector('.custom-path-input');
        if (e.target.value === 'custom') {
            customPathInput.style.display = 'flex';
        } else {
            customPathInput.style.display = 'none';
            clearPathValidation();
        }
    });
});

// ========== 녹화 경로 설정 관련 코드 ==========

/**
 * 녹화 경로 관련 이벤트 핸들러 초기화
 * 이 함수는 기존 DOMContentLoaded 이벤트에서 호출되거나
 * MeetingSetup 클래스의 constructor에서 호출할 수 있습니다
 */
function initRecordingPathHandlers() {
    // 경로 옵션 요소들
    const pathOptions = document.querySelectorAll('.path-option');
    const customPathInput = document.getElementById('customPathInput');
    const recordingPathField = document.getElementById('recordingPath');
    const pathValidation = document.getElementById('pathValidation');

    // 경로 옵션 클릭 이벤트
    pathOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 라디오 버튼 체크
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }

            // 선택된 스타일 적용
            pathOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');

            // 사용자 지정 경로 입력 표시/숨김
            if (this.dataset.pathType === 'custom') {
                customPathInput.classList.add('show');
                recordingPathField.focus();
            } else {
                customPathInput.classList.remove('show');
                hideValidationMessage();
            }
        });
    });

    // 경로 입력 필드 이벤트
    if (recordingPathField) {
        recordingPathField.addEventListener('input', debounce(validatePath, 500));
        recordingPathField.addEventListener('blur', validatePath);
    }
}

/**
 * 폴더 선택 다이얼로그 열기
 * 전역 함수로 정의하여 HTML onclick에서 호출 가능
 */
function selectFolder() {
    const folderPicker = document.getElementById('folderPicker');
    if (folderPicker) {
        folderPicker.click();
    }
}

/**
 * 폴더 선택 처리
 * 전역 함수로 정의하여 HTML onchange에서 호출 가능
 * @param {Event} event - 파일 선택 이벤트
 */
function handleFolderSelection(event) {
    const files = event.target.files;
    if (files.length > 0) {
        // 첫 번째 파일의 경로에서 디렉토리 경로 추출
        const fullPath = files[0].webkitRelativePath || files[0].name;
        const pathParts = fullPath.split('/');
        pathParts.pop(); // 파일명 제거

        const directoryPath = '/' + pathParts.join('/');

        const recordingPathField = document.getElementById('recordingPath');
        if (recordingPathField) {
            recordingPathField.value = directoryPath;
            validatePath();
        }
    }
}

/**
 * 경로 유효성 검증
 */
async function validatePath() {
    const pathInput = document.getElementById('recordingPath');
    const pathValidation = document.getElementById('pathValidation');

    if (!pathInput || !pathInput.value.trim()) {
        hideValidationMessage();
        return;
    }

    const path = pathInput.value.trim();

    // 기본적인 경로 형식 검증
    if (!isValidPathFormat(path)) {
        showValidationMessage('올바른 경로 형식이 아닙니다', 'error');
        return;
    }

    // 서버에 경로 검증 요청
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/validate-path', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ path: path })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.valid) {
                showValidationMessage('사용 가능한 경로입니다', 'success');
            } else {
                showValidationMessage(result.reason || '경로를 사용할 수 없습니다', 'error');
            }
        } else {
            showValidationMessage('경로 검증에 실패했습니다', 'error');
        }
    } catch (error) {
        // 서버 검증 실패 시 클라이언트 검증만 사용
        console.error('경로 검증 오류:', error);
        if (isValidPathFormat(path)) {
            showValidationMessage('경로가 설정되었습니다 (오프라인)', 'success');
        }
    }
}

/**
 * 경로 형식 유효성 검사
 * @param {string} path - 검사할 경로
 * @returns {boolean} 유효 여부
 */
function isValidPathFormat(path) {
    // Unix/Mac 경로 형식
    const unixPathRegex = /^\/[a-zA-Z0-9._\-\/]+$/;
    // Windows 경로 형식
    const windowsPathRegex = /^[a-zA-Z]:\\[a-zA-Z0-9._\-\\]+$/;

    return unixPathRegex.test(path) || windowsPathRegex.test(path);
}

/**
 * 검증 메시지 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 타입 ('success' | 'error')
 */
function showValidationMessage(message, type) {
    const pathValidation = document.getElementById('pathValidation');
    if (!pathValidation) return;

    pathValidation.textContent = message;
    pathValidation.className = `path-validation-message ${type}`;
    pathValidation.style.display = 'flex';
}

/**
 * 검증 메시지 숨김
 */
function hideValidationMessage() {
    const pathValidation = document.getElementById('pathValidation');
    if (pathValidation) {
        pathValidation.style.display = 'none';
    }
}

/**
 * Debounce 유틸리티 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간(ms)
 * @returns {Function} Debounced 함수
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// MeetingSetup 클래스가 이미 초기화된 후에 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecordingPathHandlers);
} else {
    // DOM이 이미 로드된 경우 즉시 실행
    initRecordingPathHandlers();
}

// 전역 함수로 등록 (HTML onclick/onchange에서 사용)
window.selectFolder = selectFolder;
window.handleFolderSelection = handleFolderSelection;

/**
 * 이메일로 초대
 */
async function inviteByEmail(email) {
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }

    try {
        // 이메일 초대 API 호출
        const response = await fetch('/api/meeting/invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                workspaceCd: workspaceCd
            })
        });

        if (response.ok) {
            alert(`${email}로 초대장을 발송했습니다.`);

            // 입력 필드 초기화
            const emailInput = document.getElementById('emailInput');
            if (emailInput) {
                emailInput.value = '';
            }
        } else {
            throw new Error('초대 실패');
        }

    } catch (error) {
        console.error('이메일 초대 실패:', error);
        alert('이메일 초대에 실패했습니다. 다시 시도해주세요.');
    }
}

/**
 * 초대 이메일 추가
 */
function addEmailInvite() {
    const emailInput = document.getElementById('newEmailInput');
    const email = emailInput.value.trim();

    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }

    // 이메일 목록에 추가
    const emailList = document.getElementById('emailList');
    if (emailList) {
        const emailItem = document.createElement('div');
        emailItem.className = 'email-item';
        emailItem.innerHTML = `
            <span>${email}</span>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>
        `;
        emailList.appendChild(emailItem);
    }

    // 입력 필드 초기화
    emailInput.value = '';
    emailInput.focus();
}

// Enter 키로 이메일 추가
document.addEventListener('DOMContentLoaded', function() {
    // 기존 이메일 입력 관련 코드
    const emailInput = document.getElementById('newEmailInput');
    if (emailInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addEmailInvite();
            }
        });
    }

    // ⭐ 새로 추가할 체크박스 관련 초기화 코드
    // 초기 선택된 멤버 수 표시
    updateInvitedCount();

    // 체크박스 클릭 이벤트가 부모로 전파되지 않도록 방지
    document.querySelectorAll('input[name="invitedMembers"]').forEach(checkbox => {
            checkbox.addEventListener('click', function(e) {
                e.stopPropagation();
            });
    });
});