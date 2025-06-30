  // 초대 요청 제출
  function submitInvitation() {
      const inviteCode = document.getElementById('inviteCode').value.trim();

      if (!inviteCode) {
          alert('초대 코드를 입력해주세요.');
          return;
      }

      // 로딩 상태 표시
      const joinButton = document.querySelector('.btn-join');
      joinButton.disabled = true;
      joinButton.textContent = '처리 중...';

      // API 호출
      fetch('/api/invitations', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
          },
          body: JSON.stringify({
              inviteCode: inviteCode
          })
      })
      .then(response => {
          if (!response.ok) {
              return response.json().then(data => {
                  throw new Error(data.message || '초대 요청 실패');
              });
          }
          return response.json();
      })
      .then(data => {
          alert(data.message || '참가 요청이 전송되었습니다.');
          // 워크스페이스 목록으로 이동
          window.location.href = '/workspace';
      })
      .catch(error => {
          console.error('Error:', error);
          alert(error.message || '초대 코드가 유효하지 않습니다.');
      })
      .finally(() => {
          // 버튼 상태 복원
          joinButton.disabled = false;
          joinButton.textContent = 'Join Space';
      });
  }

  // Enter 키 처리
  document.getElementById('inviteCode').addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
          submitInvitation();
      }
  });