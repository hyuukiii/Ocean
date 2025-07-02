#!/bin/bash

echo "GStreamer 설치 스크립트"
echo "======================"

# macOS인지 확인
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS 감지됨. Homebrew를 통해 GStreamer 설치..."
    
    # Homebrew가 설치되어 있는지 확인
    if ! command -v brew &> /dev/null; then
        echo "Homebrew가 설치되어 있지 않습니다. 먼저 Homebrew를 설치해주세요."
        exit 1
    fi
    
    # GStreamer 설치
    brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly gst-libav
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux 감지됨. apt-get을 통해 GStreamer 설치..."
    
    # Ubuntu/Debian 계열
    sudo apt-get update
    sudo apt-get install -y \
        gstreamer1.0-tools \
        gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad \
        gstreamer1.0-plugins-ugly \
        gstreamer1.0-libav \
        libgstreamer1.0-dev \
        libgstreamer-plugins-base1.0-dev
else
    echo "지원하지 않는 운영체제입니다."
    exit 1
fi

# 설치 확인
if command -v gst-launch-1.0 &> /dev/null; then
    echo ""
    echo "✅ GStreamer 설치 완료!"
    echo "설치된 버전:"
    gst-launch-1.0 --version
else
    echo "❌ GStreamer 설치 실패"
    exit 1
fi

echo ""
echo "필요한 플러그인 확인 중..."
echo "- VP8 codec: $(gst-inspect-1.0 vp8enc &> /dev/null && echo '✅' || echo '❌')"
echo "- Opus codec: $(gst-inspect-1.0 opusenc &> /dev/null && echo '✅' || echo '❌')"
echo "- WebM muxer: $(gst-inspect-1.0 webmmux &> /dev/null && echo '✅' || echo '❌')"
echo "- UDP source: $(gst-inspect-1.0 udpsrc &> /dev/null && echo '✅' || echo '❌')"