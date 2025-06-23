document.addEventListener("DOMContentLoaded", () => {
    const btnImg = document.querySelector('.rnb-toggle-btn img');
    const body = document.body;


    btnImg.style.transform = 'rotate(0deg)';
});

function toggleRnb() {
    const btnImg = document.querySelector('.rnb-toggle-btn img');
    const body = document.body;

    const isClosed = body.classList.contains('rnb-closed');

    if (isClosed) {
        body.classList.remove('rnb-closed');
        btnImg.style.transform = 'rotate(0deg)';
    } else {
        body.classList.add('rnb-closed');
        btnImg.style.transform = 'rotate(180deg)';
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

