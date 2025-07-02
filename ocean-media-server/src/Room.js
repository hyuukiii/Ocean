
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
  // Room.js의 startRecording 메소드 - 최종 작동 버전
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

          // ⭐ 중요: PlainTransport는 comedia=false로 생성하고
          // connect()로 FFmpeg가 리스닝하는 포트를 지정해야 함

          // FFmpeg가 리스닝할 포트
          const ffmpegVideoPort = 5004;
          const ffmpegAudioPort = 5006;

          // PlainTransport 생성 옵션
          const transportOptions = {
              listenIp: {
                  ip: '127.0.0.1',
                  announcedIp: null
              },
              rtcpMux: false,     // RTCP 분리
              comedia: false,     // ⭐ 중요: false로 설정
              enableSctp: false
          };

          // Transport 생성
          const videoTransport = await this.router.createPlainTransport(transportOptions);
          const audioTransport = await this.router.createPlainTransport(transportOptions);

          // MediaSoup의 로컬 포트 확인
          console.log('비디오 Transport 로컬 포트:', videoTransport.tuple.localPort);
          console.log('오디오 Transport 로컬 포트:', audioTransport.tuple.localPort);

          // ⭐ 중요: FFmpeg가 리스닝하는 포트로 연결
          await videoTransport.connect({
              ip: '127.0.0.1',
              port: ffmpegVideoPort,
              rtcpPort: ffmpegVideoPort + 1
          });

          await audioTransport.connect({
              ip: '127.0.0.1',
              port: ffmpegAudioPort,
              rtcpPort: ffmpegAudioPort + 1
          });

          console.log(`✅ Transport 연결 완료:`);
          console.log(`   비디오: MediaSoup -> 127.0.0.1:${ffmpegVideoPort}`);
          console.log(`   오디오: MediaSoup -> 127.0.0.1:${ffmpegAudioPort}`);

          // Consumer 생성
          let videoConsumer = null;
          let audioConsumer = null;

          if (videoProducer) {
              videoConsumer = await videoTransport.consume({
                  producerId: videoProducer.id,
                  rtpCapabilities: this.router.rtpCapabilities,
                  paused: true  // 일단 일시정지 상태로 생성
              });

              console.log('비디오 Consumer 생성 완료');
          }

          if (audioProducer) {
              audioConsumer = await audioTransport.consume({
                  producerId: audioProducer.id,
                  rtpCapabilities: this.router.rtpCapabilities,
                  paused: true  // 일단 일시정지 상태로 생성
              });

              console.log('오디오 Consumer 생성 완료');
          }

          // Recorder 시작
          this.recorder = new Recorder(
              this.id,
              this.workspaceId,
              recorderId,
              process.env.SPRING_BOOT_URL || 'http://localhost:8080'
          );

          // ⭐ FFmpeg가 리스닝할 포트를 전달
          const result = await this.recorder.startRecording(
              ffmpegVideoPort,  // 5004
              ffmpegAudioPort,  // 5006
              videoConsumer ? videoConsumer.rtpParameters : null,
              audioConsumer ? audioConsumer.rtpParameters : null
          );

          // ⭐ FFmpeg가 준비되면 Consumer 재개
          console.log('Consumer 재개 중...');

          if (videoConsumer) {
              await videoConsumer.resume();
              console.log('✅ 비디오 Consumer 재개됨');
          }

          if (audioConsumer) {
              await audioConsumer.resume();
              console.log('✅ 오디오 Consumer 재개됨');
          }

          // 3초 후 상태 확인
          setTimeout(async () => {
              console.log('\n=== 녹화 상태 확인 ===');

              if (videoConsumer) {
                  const stats = await videoConsumer.getStats();
                  console.log('비디오 Consumer 통계:', stats);
              }

              if (audioConsumer) {
                  const stats = await audioConsumer.getStats();
                  console.log('오디오 Consumer 통계:', stats);
              }

              if (videoTransport && !videoTransport.closed) {
                  const stats = await videoTransport.getStats();
                  console.log('비디오 Transport 통계:', stats);
              }
          }, 3000);

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

          // 정리
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
                  if (producer.kind === 'video' && !producer.closed) {
                      // Producer가 paused 상태면 재개
                      if (producer.paused) {
                          console.log('비디오 Producer가 일시정지 상태, 재개 시도...');
                          producer.resume();
                      }
                      return producer;
                  }
              }
          }
      }
      return null;
  }
  /*
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
*/
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