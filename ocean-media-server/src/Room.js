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

  // 녹화 시작 - 완전 수정 버전
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

        // ⭐ Producer 상태 확인
        if (videoProducer) {
            console.log('비디오 Producer 상태:', {
                id: videoProducer.id,
                paused: videoProducer.paused,
                closed: videoProducer.closed,
                kind: videoProducer.kind
            });

            const stats = await videoProducer.getStats();
            console.log('비디오 Producer 실시간 통계:', stats);
        }

        if (audioProducer) {
            console.log('오디오 Producer 상태:', {
                id: audioProducer.id,
                paused: audioProducer.paused,
                closed: audioProducer.closed,
                kind: audioProducer.kind
            });

            const stats = await audioProducer.getStats();
            console.log('오디오 Producer 실시간 통계:', stats);
        }

        // Transport 옵션
        const transportOptions = {
            listenIp: {
                ip: '127.0.0.1',
                announcedIp: null
            },
            rtcpMux: false,
            comedia: false,  // 수동으로 connect 호출할 것임
            enableSctp: false,
            enableSrtp: false
        };

        // Transport 생성
        const videoTransport = await this.router.createPlainTransport(transportOptions);
        const audioTransport = await this.router.createPlainTransport(transportOptions);

        console.log('비디오 Transport 정보:', {
            id: videoTransport.id,
            port: videoTransport.tuple.localPort,
            rtcpPort: videoTransport.rtcpTuple ? videoTransport.rtcpTuple.localPort : 'N/A'
        });

        console.log('오디오 Transport 정보:', {
            id: audioTransport.id,
            port: audioTransport.tuple.localPort,
            rtcpPort: audioTransport.rtcpTuple ? audioTransport.rtcpTuple.localPort : 'N/A'
        });

        // FFmpeg가 리스닝할 포트
        const ffmpegVideoPort = 5004;
        const ffmpegAudioPort = 5006;

        // ⭐ 중요: Recorder 인스턴스를 먼저 생성하고 FFmpeg 시작
        this.recorder = new Recorder(
            this.id,
            this.workspaceId,
            recorderId,
            process.env.SPRING_BOOT_URL || 'http://localhost:8080'
        );

        // ⭐ Consumer를 위한 임시 RTP Parameters 준비 - Producer의 실제 RTP Parameters 기반
        let tempVideoRtpParams = null;
        let tempAudioRtpParams = null;

        if (videoProducer) {
            // Producer의 실제 RTP Parameters 가져오기
            const producerRtpParams = videoProducer.rtpParameters;
            console.log('비디오 Producer RTP Parameters:', JSON.stringify(producerRtpParams, null, 2));
            
            tempVideoRtpParams = {
                codecs: producerRtpParams.codecs.map(codec => ({
                    mimeType: codec.mimeType,
                    payloadType: codec.payloadType,
                    clockRate: codec.clockRate,
                    parameters: codec.parameters || {}
                })),
                encodings: [{ ssrc: Math.floor(Math.random() * 1000000000) }]
            };
        }

        if (audioProducer) {
            // Producer의 실제 RTP Parameters 가져오기
            const producerRtpParams = audioProducer.rtpParameters;
            console.log('오디오 Producer RTP Parameters:', JSON.stringify(producerRtpParams, null, 2));
            
            tempAudioRtpParams = {
                codecs: producerRtpParams.codecs.map(codec => ({
                    mimeType: codec.mimeType,
                    payloadType: codec.payloadType,
                    clockRate: codec.clockRate,
                    channels: codec.channels || 2,
                    parameters: codec.parameters || {}
                })),
                encodings: [{ ssrc: Math.floor(Math.random() * 1000000000) }]
            };
        }

        // ⭐ Consumer를 먼저 생성 (Transport 연결 전에)
        let videoConsumer = null;
        let audioConsumer = null;

        if (videoProducer) {
            // Producer 타입 확인 (simulcast인 경우 처리)
            const isSimulcast = videoProducer.type === 'simulcast';
            console.log(`비디오 Producer 타입: ${videoProducer.type}`);
            
            const consumerParams = {
                producerId: videoProducer.id,
                rtpCapabilities: this.router.rtpCapabilities,
                paused: true  // 일단 paused로 생성
            };
            
            // Simulcast인 경우 preferredLayers 설정
            if (isSimulcast) {
                consumerParams.preferredLayers = {
                    spatialLayer: 2,  // 최고 품질 레이어 사용
                    temporalLayer: 2
                };
            }
            
            videoConsumer = await videoTransport.consume(consumerParams);

            console.log('비디오 Consumer 생성:', {
                id: videoConsumer.id,
                kind: videoConsumer.kind,
                type: videoConsumer.type,
                paused: videoConsumer.paused,
                producerPaused: videoConsumer.producerPaused,
                priority: videoConsumer.priority,
                preferredLayers: videoConsumer.preferredLayers,
                currentLayers: videoConsumer.currentLayers,
                rtpParameters: videoConsumer.rtpParameters
            });

            // Consumer 이벤트 리스너 추가
            videoConsumer.on('score', (score) => {
                console.log('비디오 Consumer score:', score);
            });

            videoConsumer.on('layerschange', (layers) => {
                console.log('비디오 Consumer layers changed:', layers);
            });
            
            videoConsumer.on('producerpause', () => {
                console.log('비디오 Producer가 일시정지됨');
            });
            
            videoConsumer.on('producerresume', () => {
                console.log('비디오 Producer가 재개됨');
            });
        }

        if (audioProducer) {
            audioConsumer = await audioTransport.consume({
                producerId: audioProducer.id,
                rtpCapabilities: this.router.rtpCapabilities,
                paused: true  // 일단 paused로 생성
            });

            console.log('오디오 Consumer 생성:', {
                id: audioConsumer.id,
                kind: audioConsumer.kind,
                paused: audioConsumer.paused,
                rtpParameters: audioConsumer.rtpParameters
            });
        }

        // ⭐ 실제 RTP Parameters 가져오기 (Consumer에서)
        const actualVideoRtpParams = videoConsumer ? videoConsumer.rtpParameters : tempVideoRtpParams;
        const actualAudioRtpParams = audioConsumer ? audioConsumer.rtpParameters : tempAudioRtpParams;

        // ⭐ FFmpeg을 먼저 시작 (실제 RTP Parameters 사용)
        console.log('FFmpeg 시작 중...');
        const recorderStartPromise = this.recorder.startRecording(
            ffmpegVideoPort,
            ffmpegAudioPort,
            actualVideoRtpParams,
            actualAudioRtpParams
        );

        // ⭐ FFmpeg이 준비될 때까지 대기
        console.log('FFmpeg이 포트를 리스닝할 때까지 대기...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // ⭐ 이제 Transport 연결 (FFmpeg이 리스닝 중일 때)
        console.log('Transport 연결 시작...');

        try {
            await videoTransport.connect({
                ip: '127.0.0.1',
                port: ffmpegVideoPort,
                rtcpPort: ffmpegVideoPort + 1
            });
            console.log('✅ 비디오 Transport 연결 성공');
        } catch (err) {
            console.error('❌ 비디오 Transport 연결 실패:', err);
        }

        try {
            await audioTransport.connect({
                ip: '127.0.0.1',
                port: ffmpegAudioPort,
                rtcpPort: ffmpegAudioPort + 1
            });
            console.log('✅ 오디오 Transport 연결 성공');
        } catch (err) {
            console.error('❌ 오디오 Transport 연결 실패:', err);
        }

        // ⭐ Consumer resume (Transport 연결 후)
        if (videoConsumer) {
            await videoConsumer.resume();
            console.log('✅ 비디오 Consumer resumed');
            
            // Producer도 resume 확인
            if (videoProducer.paused) {
                await videoProducer.resume();
                console.log('✅ 비디오 Producer도 resumed');
            }
            
            // Simulcast인 경우 최고 품질 레이어 요청
            if (videoConsumer.type === 'simulcast') {
                await videoConsumer.setPreferredLayers({ 
                    spatialLayer: 2, 
                    temporalLayer: 2 
                });
                console.log('✅ 비디오 Consumer 최고 품질 레이어 설정');
            }
            
            // Consumer 상태 재확인
            const consumerStats = await videoConsumer.getStats();
            console.log('비디오 Consumer resume 후 상태:', consumerStats);
        }

        if (audioConsumer) {
            await audioConsumer.resume();
            console.log('✅ 오디오 Consumer resumed');
            
            // Producer도 resume 확인
            if (audioProducer.paused) {
                await audioProducer.resume();
                console.log('✅ 오디오 Producer도 resumed');
            }
            
            // Consumer 상태 재확인
            const consumerStats = await audioConsumer.getStats();
            console.log('오디오 Consumer resume 후 상태:', consumerStats);
        }

        console.log(`MediaSoup가 비디오를 전송할 포트: ${ffmpegVideoPort}`);
        console.log(`MediaSoup가 오디오를 전송할 포트: ${ffmpegAudioPort}`);

        // ⭐ 연결 후 Transport 상태 확인
        console.log('Transport 연결 후 상태:', {
            video: videoTransport.tuple,
            audio: audioTransport.tuple
        });

        // ⭐ FFmpeg 시작 결과 대기
        const result = await recorderStartPromise;
        console.log('녹화 시작 완료');

        // ⭐ PLI (Picture Loss Indication) 요청을 보내서 키프레임 요청
        if (videoConsumer) {
            console.log('비디오 Consumer에 PLI 요청 전송...');
            await videoConsumer.requestKeyFrame();
        }

        // ⭐ 녹화 시작 후 즉시 상태 확인
        setTimeout(async () => {
            console.log('\n=== 녹화 시작 후 즉시 상태 확인 (1초 후) ===');

            if (videoTransport && !videoTransport.closed) {
                const stats = await videoTransport.getStats();
                console.log('비디오 Transport 통계:', JSON.stringify(stats, null, 2));
            }

            if (videoConsumer && !videoConsumer.closed) {
                const stats = await videoConsumer.getStats();
                console.log('비디오 Consumer 통계:', JSON.stringify(stats, null, 2));
                console.log('비디오 Consumer 현재 레이어:', videoConsumer.currentLayers);
            }

            if (videoProducer && !videoProducer.closed) {
                const stats = await videoProducer.getStats();
                console.log('비디오 Producer 통계:', JSON.stringify(stats, null, 2));
                
                // Producer에서 실제로 데이터가 생성되고 있는지 확인
                if (stats && stats.length > 0) {
                    const stat = stats[0];
                    if (stat.byteCount > 0) {
                        console.log('✅ Producer가 데이터를 생성 중입니다');
                    } else {
                        console.log('❌ Producer가 데이터를 생성하지 않습니다');
                    }
                }
            }
            
            // 추가 디버깅: Transport tuple 확인
            console.log('비디오 Transport tuple:', videoTransport.tuple);
            console.log('오디오 Transport tuple:', audioTransport.tuple);
            
            // PlainTransport에서 Consumer가 활성화되었는지 확인
            console.log('비디오 Transport의 Consumer 목록:', Array.from(videoTransport.consumers.keys()));
            console.log('오디오 Transport의 Consumer 목록:', Array.from(audioTransport.consumers.keys()));
        }, 1000);

        // 기존 5초 후 확인도 유지
        setTimeout(async () => {
            console.log('\n=== 녹화 상태 확인 (5초 후) ===');

            if (videoTransport && !videoTransport.closed) {
                const stats = await videoTransport.getStats();
                console.log('비디오 Transport 통계:', JSON.stringify(stats, null, 2));
            }

            if (audioTransport && !audioTransport.closed) {
                const stats = await audioTransport.getStats();
                console.log('오디오 Transport 통계:', JSON.stringify(stats, null, 2));
            }

            if (videoConsumer && !videoConsumer.closed) {
                const stats = await videoConsumer.getStats();
                console.log('비디오 Consumer 통계:', JSON.stringify(stats, null, 2));
            }

            if (audioConsumer && !audioConsumer.closed) {
                const stats = await audioConsumer.getStats();
                console.log('오디오 Consumer 통계:', JSON.stringify(stats, null, 2));
            }
        }, 5000);

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

            // ⭐ Producer 상태 로그
            console.log('선택된 비디오 Producer:', {
                id: producer.id,
                paused: producer.paused,
                type: producer.type,
                appData: producer.appData
            });

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
                  if (producer.kind === 'audio' && !producer.closed) {
                      // Producer가 paused 상태면 재개
                      if (producer.paused) {
                          console.log('오디오 Producer가 일시정지 상태, 재개 시도...');
                          producer.resume();
                      }

                      // ⭐ Producer 상태 로그
                      console.log('선택된 오디오 Producer:', {
                          id: producer.id,
                          paused: producer.paused,
                          type: producer.type,
                          appData: producer.appData
                      });

                      return producer;
                  }
              }
          }
      }
      return null;
  }

  // 모든 Producer 상태 출력
  debugProducers() {
      console.log('\n=== Producer 상태 디버깅 ===');
      let producerCount = 0;

      for (const [peerId, peer] of this.peers.entries()) {
          console.log(`\nPeer: ${peerId}`);
          
          // Transport 상태 확인
          if (peer.transports && peer.transports.size > 0) {
              console.log('  Transports:');
              for (const [transportId, transport] of peer.transports.entries()) {
                  console.log(`    Transport ${transportId}:`);
                  console.log(`      - ICE State: ${transport.iceState}`);
                  console.log(`      - DTLS State: ${transport.dtlsState}`);
                  console.log(`      - Connected: ${transport.iceState === 'connected' && transport.dtlsState === 'connected'}`);
              }
          }

          if (peer.producers && peer.producers.size > 0) {
              for (const [producerId, producer] of peer.producers.entries()) {
                  producerCount++;
                  console.log(`  Producer ${producerId}:`);
                  console.log(`    - Kind: ${producer.kind}`);
                  console.log(`    - Paused: ${producer.paused}`);
                  console.log(`    - Closed: ${producer.closed}`);
                  console.log(`    - Score: ${JSON.stringify(producer.score)}`);

                  // Producer 통계 가져오기
                  producer.getStats().then(stats => {
                      console.log(`    - Stats: ${JSON.stringify(stats)}`);
                  }).catch(err => {
                      console.error(`    - Stats 에러: ${err.message}`);
                  });
              }
          } else {
              console.log('  Producer 없음');
          }
      }

      console.log(`\n총 Producer 수: ${producerCount}`);
      console.log('=========================\n');
  }

  // 녹화 전 사전 체크
  async preRecordingCheck() {
      console.log('\n=== 녹화 사전 체크 ===');

      // 1. Router 상태 확인
      if (!this.router || this.router.closed) {
          console.error('❌ Router가 없거나 닫혀있습니다');
          return false;
      }
      console.log('✅ Router 정상');

      // 2. Peer 확인
      if (this.peers.size === 0) {
          console.error('❌ 참가자가 없습니다');
          return false;
      }
      console.log(`✅ 참가자 수: ${this.peers.size}`);

      // 3. Producer 확인
      const videoProducer = this.getVideoProducer();
      const audioProducer = this.getAudioProducer();

      if (!videoProducer && !audioProducer) {
          console.error('❌ 활성화된 미디어 스트림이 없습니다');
          this.debugProducers();
          return false;
      }
      
      // Transport 연결 상태 확인 - Peer 레벨에서 확인
      let transportConnected = false;
      
      // 모든 Peer의 Transport 확인
      for (const peer of this.peers.values()) {
          if (peer.transports && peer.transports.size > 0) {
              for (const transport of peer.transports.values()) {
                  // producing이 true인 transport 찾기
                  if (transport.appData && transport.appData.producing === true) {
                      // iceState는 'connected' 또는 'completed', dtlsState는 'connected'여야 함
                      if ((transport.iceState === 'connected' || transport.iceState === 'completed') && 
                          transport.dtlsState === 'connected') {
                          transportConnected = true;
                          console.log('✅ Producer Transport 연결됨:', {
                              transportId: transport.id,
                              iceState: transport.iceState,
                              dtlsState: transport.dtlsState
                          });
                          break;
                      } else {
                          console.error('❌ Producer Transport가 아직 연결되지 않았습니다:', {
                              transportId: transport.id,
                              iceState: transport.iceState,
                              dtlsState: transport.dtlsState
                          });
                      }
                  }
              }
              if (transportConnected) break;
          }
      }
      
      if (!transportConnected) {
          console.error('❌ WebRTC Transport가 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
          return false;
      }

      if (videoProducer) {
          console.log('✅ 비디오 Producer 발견');
          const stats = await videoProducer.getStats();
          console.log('   비디오 통계:', JSON.stringify(stats));
          
          // Producer가 실제로 데이터를 생성하는지 확인
          if (!stats || stats.length === 0 || (stats[0] && stats[0].byteCount === 0)) {
              console.error('❌ 비디오 Producer가 데이터를 생성하지 않습니다!');
              console.log('   Transport 연결 상태를 확인하세요.');
              return false;
          }
      }

      if (audioProducer) {
          console.log('✅ 오디오 Producer 발견');
          const stats = await audioProducer.getStats();
          console.log('   오디오 통계:', JSON.stringify(stats));
          
          // Producer가 실제로 데이터를 생성하는지 확인
          if (!stats || stats.length === 0 || (stats[0] && stats[0].byteCount === 0)) {
              console.error('❌ 오디오 Producer가 데이터를 생성하지 않습니다!');
              console.log('   Transport 연결 상태를 확인하세요.');
              return false;
          }
      }

      // 4. 네트워크 확인 (UDP 포트)
      const checkPort = (port) => {
          return new Promise((resolve) => {
              const dgram = require('dgram');
              const server = dgram.createSocket('udp4');

              server.on('error', (err) => {
                  console.error(`❌ UDP 포트 ${port} 사용 불가: ${err.message}`);
                  resolve(false);
              });

              server.on('listening', () => {
                  console.log(`✅ UDP 포트 ${port} 사용 가능`);
                  server.close();
                  resolve(true);
              });

              server.bind(port);
          });
      };

      const port5004Available = await checkPort(5004);
      const port5006Available = await checkPort(5006);

      if (!port5004Available || !port5006Available) {
          console.error('❌ 필요한 UDP 포트를 사용할 수 없습니다');
          console.log('   다른 프로세스가 포트를 사용 중이거나 권한이 부족할 수 있습니다');
          return false;
      }

      console.log('===================\n');
      return true;
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