class Room {
  constructor(roomId, workspaceId, router) {
    this.id = roomId;
    this.workspaceId = workspaceId;
    this.router = router;
    this.peers = new Map(); // Peer 인스턴스를 직접 저장
    this.createdAt = new Date();
    this.recorder = null;
    this.recorder = false;
  }

  // 녹화 시작
  async startRecording(recorderId) {
    if (this.recordingStatus) {
           throw new Error('이미 녹화 중입니다');
    }

    try {
         // RTP 포트 할당 (실제로는 동적으로 할당해야 함)
         const videoPort = 5004;
         const audioPort = 5005;

    // PlainTransport 생성 (RTP 수신용)
       const videoTransport = await this.router.createPlainTransport({
       listenIp: { ip: '127.0.0.1', announcedIp: null },
       rtcpMux: false,
       comedia: false
    });

    const audioTransport = await this.router.createPlainTransport({
         listenIp: { ip: '127.0.0.1', announcedIp: null },
         rtcpMux: false,
         comedia: false
    });

    // Transport 연결
    await videoTransport.connect({ ip: '127.0.0.1', port: videoPort });
    await audioTransport.connect({ ip: '127.0.0.1', port: audioPort });

    // Consumer 생성 (녹화용)
    // 실제로는 특정 Producer를 선택해야 함 (예: 발표자)
    const videoProducer = this.getVideoProducer(); // *** 구현 필요 ***
    const audioProducer = this.getAudioProducer(); // *** 구현 필요 ***

    if (videoProducer) {
       await videoTransport.consume({
          producerId: videoProducer.id,
          rtpCapabilities: this.router.rtpCapabilities
       });
    }

    if (audioProducer) {
        await audioTransport.consume({
           producerId: audioProducer.id,
                        rtpCapabilities: this.router.rtpCapabilities
        });
    }

    // Recorder 시작
    this.recorder = new Recorder(
        this.roomId,
        this.workspaceId,
        recorderId,
        process.env.SPRING_BOOT_URL || 'http://localhost:8080'
    );

    const result = await this.recorder.startRecording(
        videoTransport.tuple.localPort,
        audioTransport.tuple.localPort
    );

    this.recordingStatus = true;
    this.recordingTransports = { videoTransport, audioTransport };

    return result;

    } catch (error) {
      console.error('녹화 시작 실패:', error);
       throw error;
    }
  }

    // 녹화 종료
    async stopRecording() {
    if (!this.recordingStatus || !this.recorder) {
        throw new Error('녹화 중이 아닙니다');
    }

    try {
        const result = await this.recorder.stopRecording();

        // Transport 정리
        if (this.recordingTransports) {
              this.recordingTransports.videoTransport.close();
              this.recordingTransports.audioTransport.close();
        }

        this.recordingStatus = false;
        this.recorder = null;
        this.recordingTransports = null;

        return result;

        } catch (error) {
           console.error('녹화 종료 실패:', error);
           throw error;
        }
    }

        // 첫 번째 비디오 Producer 가져오기
        getVideoProducer() {
            for (const peer of this.peers.values()) {
                for (const producer of peer.producers.values()) {
                    if (producer.kind === 'video') {
                        return producer;
                    }
                }
            }
            return null;
        }

        // 첫 번째 오디오 Producer 가져오기
        getAudioProducer() {
            for (const peer of this.peers.values()) {
                for (const producer of peer.producers.values()) {
                    if (producer.kind === 'audio') {
                        return producer;
                    }
                }
            }
            return null;
        }
    }


  addPeer(peerId, peer) {
    // Peer 인스턴스를 직접 저장
    this.peers.set(peerId, peer);
    console.log(`Peer ${peerId} joined room ${this.id}`);
    return peer;
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    // Peer 클래스의 close 메서드 호출
    if (peer.close && typeof peer.close === 'function') {
      peer.close();
    }

    this.peers.delete(peerId);
    console.log(`Peer ${peerId} left room ${this.id}`);
  }

  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  getAllPeers() {
    return Array.from(this.peers.values());
  }

  isEmpty() {
    return this.peers.size === 0;
  }

  toJson() {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      peers: this.getAllPeers().map(peer => {
        // Peer 인스턴스의 toJson 메서드 호출
        if (peer.toJson && typeof peer.toJson === 'function') {
          return peer.toJson();
        }
        // 폴백: 기본 정보만 반환
        return {
          id: peer.id || 'unknown',
          displayName: peer.displayName || 'Unknown User'
        };
      }),
      createdAt: this.createdAt
    };
  }
}

module.exports = Room;