/**
 * Ocean Background 에니메이션 공통 스크립트
 */
(function() {
    'use strict';

    /**
     * 파티클 생성 함수
     */
    function createParticle() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

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

    /**
     * 배경 초기화 함수
     */
    function initOceanBackground() {
        // 배경 HTML 구조 생성
        const backgroundHTML = `
            <div class="ocean-background">
                <div class="wave"></div>
                <div class="particles" id="particles"></div>
            </div>
        `;

        // body의 첫 번째 자식으로 배경 추가
        document.body.insertAdjacentHTML('afterbegin', backgroundHTML);

        // 초기 파티클 생성
        for (let i = 0; i < 30; i++) {
            setTimeout(createParticle, i * 200);
        }

        // 지속적으로 파티클 생성
        setInterval(createParticle, 1000);

        // 마우스 움직임에 따른 배경 효과
        document.addEventListener('mousemove', handleMouseMove);
    }

    /**
     * 마우스 움직임 핸들러
     */
    function handleMouseMove(e) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        const wave = document.querySelector('.wave');
        if (wave) {
            wave.style.transform = `translate(${x * 20 - 10}px, ${y * 20 - 10}px)`;
        }
    }

    // DOM이 로드되면 배경 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOceanBackground);
    } else {
        initOceanBackground();
    }
})();