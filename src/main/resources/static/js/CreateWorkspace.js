document.addEventListener('DOMContentLoaded', function() {
    // 스와이퍼 초기화
    const swiper = new Swiper('.swiper-container', {
        allowTouchMove: false,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.btn-next',
            prevEl: '.btn-prev',
        },
    });

    // 다음 버튼 클릭 이벤트
    document.querySelector('.btn-next').addEventListener('click', function() {
        validateFirstSlide();
    });

    // 이전 버튼 클릭 이벤트
    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', function() {
            swiper.slidePrev();
        });
    });

    function validateFirstSlide() {
        const nameInput = document.getElementById('workspaceNm');
        if (!nameInput.value.trim()) {
            alert('워크스페이스 이름을 입력해주세요!');
            nameInput.focus();
            return;
        }
        swiper.slideNext();
    }

    // 폼 제출 이벤트 처리
    document.getElementById('workspaceForm').addEventListener('submit', function(e) {
        e.preventDefault(); // 기본 폼 제출 방지
        createWorkspace();
    });

    // 워크스페이스 생성 함수
    async function createWorkspace() {
        // 로딩 표시
        const submitBtn = document.querySelector('.btn-create');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '생성 중...';

        try {
            // 폼 데이터 수집
            const formData = new FormData(document.getElementById('workspaceForm'));

            // 부서 정보 수집
            const departments = [];
            document.querySelectorAll('input[name="departments"]').forEach(input => {
                if (input.value.trim()) {
                    departments.push(input.value.trim());
                }
            });

            // API에 맞는 데이터 구조 생성
            const requestData = {
                workspaceName: formData.get('workspaceNm'),
                endDate: formData.get('endDate') || null,
                description: formData.get('description') || '',
                departments: departments
            };

            // 액세스 토큰 가져오기
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                alert('로그인이 필요합니다.');
                window.location.href = '/login';
                return;
            }

            // API 호출
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                },
                 body: formData // JSON.stringify 대신 formData 객체 직접 삽입
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '워크스페이스 생성 실패');
            }

            const workspace = await response.json();

            // 성공 메시지
            alert(`워크스페이스가 생성되었습니다!\n초대 코드: ${workspace.inviteCd}`);

            // 워크스페이스 목록으로 이동
            window.location.href = `/wsmain?workspaceCd=${workspace.workspaceCd}`;

        } catch (error) {
            console.error('Error:', error);
            alert(error.message || '워크스페이스 생성 중 오류가 발생했습니다.');
        } finally {
            // 버튼 상태 복원
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    // 이미지 업로드 처리
    document.getElementById('upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 이미지 미리보기
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('preview').src = e.target.result;
            };
            reader.readAsDataURL(file);

            // TODO: 이미지 업로드 기능은 추후 구현
            // 현재 API에서 이미지 처리를 하지 않으므로 일단 미리보기만 제공
        }
    });
});

// 부서 추가/삭제 함수
function addDepartment() {
    const departmentSection = document.getElementById('department-section');
    const newDepartment = document.createElement('div');
    newDepartment.className = 'department-input-group';
    newDepartment.innerHTML = `
        <input type="text" name="departments" placeholder="부서명" required>
        <button type="button" class="btn-remove-department" onclick="removeDepartment(this)">×</button>
    `;
    departmentSection.appendChild(newDepartment);
}

function removeDepartment(btn) {
    btn.parentElement.remove();
}