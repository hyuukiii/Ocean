document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceCd = urlParams.get("workspaceCd");
    if (!workspaceCd) return;

    try {
        // 1. 내 프로필 정보 불러오기
        const profileRes = await fetch(`/api/workspaces/${workspaceCd}/profile`);
        const myProfile = await profileRes.json();

        document.getElementById("myProfileImg").src = "/profile-images/" + (myProfile.image || "default.png");
        document.getElementById("myProfileName").textContent = myProfile.userNickname || "이름없음";
        document.getElementById("myProfileRole").textContent = myProfile.position || "회원";
        document.getElementById("myProgressBar").style.width = (myProfile.progress || 0) + "%";
        document.getElementById("myProgressPercent").textContent = (myProfile.progress || 0) + "%";

        // 2. 멤버 리스트 불러오기
        const memberRes = await fetch(`/api/workspaces/${workspaceCd}`);
        const data = await memberRes.json();
        const members = data.members || [];

        const memberContainer = document.getElementById("memberListContainer");
        const memberCountEl = document.getElementById("memberCount");

        // 기존 멤버 초기화
        memberContainer.innerHTML = "";
        memberCountEl.textContent = members.length;

        // 멤버 추가
        members.forEach(member => {
            const memberDiv = document.createElement("div");
            memberDiv.classList.add("member");

            memberDiv.innerHTML = `
                <img src="/profile-images/${member.image || 'default.png'}" alt="멤버이미지">
                <div class="info">
                    <span class="m-name">${member.userNickname}</span>
                    <span class="m-role">${member.position}</span>
                </div>
            `;
            memberContainer.appendChild(memberDiv);
        });

    } catch (err) {
        console.error("RNB 데이터 로딩 오류:", err);
    }
});
