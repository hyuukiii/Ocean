document.addEventListener("DOMContentLoaded", () => {
    const btnImg = document.querySelector('.rnb-toggle-btn img');
    const body = document.body;

    // 처음에 RNB는 열려있고 → 표시돼야 하므로
    btnImg.style.transform = 'rotate(0deg)'; // → 방향
});

function toggleRnb() {
    const btnImg = document.querySelector('.rnb-toggle-btn img');
    const body = document.body;

    const isClosed = body.classList.contains('rnb-closed');

    if (isClosed) {
        body.classList.remove('rnb-closed');
        btnImg.style.transform = 'rotate(0deg)'; // → 오른쪽 (닫기용)
    } else {
        body.classList.add('rnb-closed');
        btnImg.style.transform = 'rotate(180deg)'; // ← 왼쪽 (열기용)
    }
}

function openInvite() {
  document.getElementById("modalOverlay").style.display = "block";
  document.getElementById("inviteModal").style.display = "block";
}

function closeInvite() {
  document.getElementById("modalOverlay").style.display = "none";
  document.getElementById("inviteModal").style.display = "none";
}

