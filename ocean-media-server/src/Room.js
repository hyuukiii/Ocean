
const Recorder = require('./recorder');

class Room {
  constructor(roomId, workspaceId, router) {
    this.id = roomId;
    this.workspaceId = workspaceId;
    this.router = router;
    this.peers = new Map(); // Peer 인스턴스를 직접 저장
    this.createdAt = new Date();
    this.recorder = null;
    this.recordingStatus = false;
  }

  // 녹화 시작
  async startRecording(recorderId) {
      if (this.recordingStatus) {
          throw new Error('이미 녹화 중입니다');
      }

      try {
          // Producer 찾기
          const videoProducer = this.getVideoProducer();
          const audioProducer = this.getAudioProducer();

          console.log('비디오 Producer:', videoProducer ? '있음' : '없음');
          console.log('오디오 Producer:', audioProducer ? '있음' : '없음');

          if (!videoProducer && !audioProducer) {
              throw new Error('녹화할 미디어 스트림이 없습니다');
          }

          // ⭐ PlainTransport 생성 - rtcpMux true로 변경
          const videoTransport = await this.router.createPlainTransport({
              listenIp: { ip: '127.0.0.1', announcedIp: null },
              rtcpMux: true,  // ⭐ true로 변경
              comedia: true   // ⭐ true로 다시 변경
          });

          const audioTransport = await this.router.createPlainTransport({
              listenIp: { ip: '127.0.0.1', announcedIp: null },
              rtcpMux: true,  // ⭐ true로 변경
              comedia: true   // ⭐ true로 다시 변경
          });

          const videoPort = videoTransport.tuple.localPort;
          const audioPort = audioTransport.tuple.localPort;

          console.log('MediaSoup 비디오 포트:', videoPort);
          console.log('MediaSoup 오디오 포트:', audioPort);

          // ⭐ comedia가 true면 connect 불필요 (주석 처리)
          // await videoTransport.connect({ ip: '127.0.0.1', port: videoPort });
          // await audioTransport.connect({ ip: '127.0.0.1', port: audioPort });

          // Consumer 생성
          let videoConsumer = null;
          let audioConsumer = null;

          if (videoProducer) {
              videoConsumer = await videoTransport.consume({
                  producerId: videoProducer.id,
                  rtpCapabilities: this.router.rtpCapabilities,
                  paused: false
              });
              await videoConsumer.resume();
          }

          if (audioProducer) {
              audioConsumer = await audioTransport.consume({
                  producerId: audioProducer.id,
                  rtpCapabilities: this.router.rtpCapabilities,
                  paused: false
              });
              await audioConsumer.resume();
          }

          // Recorder 시작
          this.recorder = new Recorder(
              this.id,
              this.workspaceId,
              recorderId,
              process.env.SPRING_BOOT_URL || 'http://localhost:8080'
          );

          const result = await this.recorder.startRecording(
              videoPort,
              audioPort,
              videoConsumer ? videoConsumer.rtpParameters : null,
              audioConsumer ? audioConsumer.rtpParameters : null
          );

          this.recordingStatus = true;
          this.recordingTransports = {
              videoTransport,
              audioTransport,
              videoConsumer,
              audioConsumer
          };

          return result;

      } catch (error) {
          console.error('녹화 시작 실패:', error);

          // 실패 시 정리
          if (this.recordingTransports) {
              if (this.recordingTransports.videoTransport) {
                  this.recordingTransports.videoTransport.close();
              }
              if (this.recordingTransports.audioTransport) {
                  this.recordingTransports.audioTransport.close();
              }
          }

          this.recordingTransports = null;
          this.recordingStatus = false;
          this.recorder = null;

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
      if (peer.producers && peer.producers.size > 0) {
        for (const producer of peer.producers.values()) {
          if (producer.kind === 'video') {
            return producer;
          }
        }
      }
    }
    return null;
  }

  // 첫 번째 오디오 Producer 가져오기
  getAudioProducer() {
    for (const peer of this.peers.values()) {
      if (peer.producers && peer.producers.size > 0) {
        for (const producer of peer.producers.values()) {
          if (producer.kind === 'audio') {
            return producer;
          }
        }
      }
    }
    return null;
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