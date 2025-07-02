const roomManager = require('./RoomManager');
const Peer = require('./Peer');
const Recorder = require('./recorder');

const peers = new Map();

// 파일 크기를 읽기 쉬운 형태로 변환
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = (io, worker, router) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', async (data) => {
      try {
        const { roomId, workspaceId, peerId, displayName, userId } = data;

        // ⭐ 디버깅 로그 추가
        console.log('join-room 데이터:', { roomId, workspaceId, peerId, displayName, userId });
        console.log(`${displayName} joining room ${roomId}`);

        // 룸 가져오기 또는 생성
        let room = roomManager.getRoom(roomId);
        if (!room) {
          room = roomManager.createRoom(roomId, workspaceId, router);
        }

        // Peer 생성
        const peer = new Peer(socket, roomId, peerId, displayName);
        peer.userId = userId;

        // ⭐ 저장 확인
        console.log('Peer 생성 완료:', { peerId: peer.id, userId: peer.userId });

        peers.set(socket.id, peer);
        // 룸에 피어 추가 (Peer 인스턴스 자체를 저장)
        room.peers.set(peerId, peer);
        console.log(`Peer ${peerId} added to room ${roomId}`);

        // Socket.io 룸 참가
        socket.join(roomId);

        // 기존 참가자 정보 전송
        const existingPeers = Array.from(room.peers.values())
          .filter(p => p.id !== peerId)
          .map(p => p.toJson());

        socket.emit('room-joined', {
          roomId,
          peers: existingPeers
        });

        // 다른 참가자들에게 알림
        socket.to(roomId).emit('new-peer', {
          peerId,
          displayName
        });

        // ⭐ 타이밍 문제 해결: 1초 후 기존 참가자들의 producer 정보 전송
            setTimeout(() => {
              console.log(`Sending existing producers to new peer ${peerId}...`);

              for (const [_, existingPeer] of room.peers) {
                if (existingPeer.id !== peerId) {
                  console.log(`Peer ${existingPeer.id} has ${existingPeer.producers.size} producers`);

                  for (const [producerId, producer] of existingPeer.producers) {
                    console.log(`Sending producer ${producerId} (${producer.kind})`);

                    socket.emit('new-producer', {
                      producerId: producer.id,
                      peerId: existingPeer.id,
                      kind: producer.kind
                    });
                  }
                }
              }
            }, 1000); // 1초 대기

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Router RTP Capabilities 요청
    socket.on('get-router-rtp-capabilities', (callback) => {
      console.log('Sending router RTP capabilities');
      callback(router.rtpCapabilities);
    });

    // Transport 생성
    socket.on('create-transport', async (data, callback) => {
      try {
        const { producing, consuming } = data;
        const peer = peers.get(socket.id);

        if (!peer) {
          throw new Error('Peer not found');
        }

        const transport = await createWebRtcTransport(router);
        // Transport에 producing/consuming 정보 추가
        transport.appData = { producing, consuming };
        
        // Transport 상태 변경 모니터링
        transport.on('icestatechange', (iceState) => {
          console.log(`Transport ${transport.id} ICE state changed to: ${iceState}`);
        });
        
        transport.on('dtlsstatechange', (dtlsState) => {
          console.log(`Transport ${transport.id} DTLS state changed to: ${dtlsState}`);
          if (dtlsState === 'connected') {
            console.log(`✅ Transport ${transport.id} is now fully connected!`);
          }
        });
        
        peer.addTransport(transport);

        console.log(`Transport created: ${transport.id} (producing: ${producing}, consuming: ${consuming})`);

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });

      } catch (error) {
        console.error('Create transport error:', error);
        callback({ error: error.message });
      }
    });

    // Transport 연결
    socket.on('connect-transport', async (data, callback) => {
      try {
        const { transportId, dtlsParameters } = data;
        const peer = peers.get(socket.id);

        if (!peer) {
          throw new Error('Peer not found');
        }

        const transport = peer.getTransport(transportId);
        if (!transport) {
          throw new Error('Transport not found');
        }

        await transport.connect({ dtlsParameters });
        console.log(`Transport connected: ${transportId}`);
        
        // Transport 상태 확인
        const stats = await transport.getStats();
        console.log(`Transport ${transportId} 연결 후 상태:`, {
            iceState: transport.iceState,
            dtlsState: transport.dtlsState,
            sctpState: transport.sctpState,
            iceSelectedTuple: transport.iceSelectedTuple
        });
        
        callback({ success: true });

      } catch (error) {
        console.error('Connect transport error:', error);
        callback({ error: error.message });
      }
    });

    // Producer 생성 (미디어 송신)
    socket.on('produce', async (data, callback) => {
      try {
        const { transportId, kind, rtpParameters } = data;
        const peer = peers.get(socket.id);

        if (!peer) {
          throw new Error('Peer not found');
        }

        const transport = peer.getTransport(transportId);
        if (!transport) {
          throw new Error('Transport not found');
        }

        const producer = await transport.produce({
          kind,
          rtpParameters
        });

        peer.addProducer(producer);
        console.log(`Producer created: ${producer.id} (${kind})`);
        console.log(`Producer 상태:`, {
            id: producer.id,
            kind: producer.kind,
            paused: producer.paused,
            type: producer.type,
            rtpParameters: JSON.stringify(producer.rtpParameters, null, 2)
        });
        
        // Transport 연결 상태 확인
        console.log(`Producer의 Transport 상태:`, {
            transportId: transport.id,
            iceState: transport.iceState,
            dtlsState: transport.dtlsState,
            iceSelectedTuple: transport.iceSelectedTuple
        });
        
        // Producer 통계 확인 (1초 후)
        setTimeout(async () => {
            if (!producer.closed) {
                const stats = await producer.getStats();
                console.log(`Producer ${producer.id} 통계 (1초 후):`, stats);
                if (stats && stats.length > 0 && stats[0].byteCount > 0) {
                    console.log(`✅ Producer ${producer.id}가 데이터를 생성 중입니다`);
                } else {
                    console.log(`❌ Producer ${producer.id}가 데이터를 생성하지 않습니다`);
                    
                    // Transport 상태 확인
                    const transportStats = await transport.getStats();
                    console.log(`Transport ${transport.id} 통계:`, transportStats);
                    
                    // Producer 상태 재확인
                    console.log(`Producer 추가 정보:`, {
                        paused: producer.paused,
                        closed: producer.closed,
                        appData: producer.appData,
                        type: producer.type,
                        score: producer.score
                    });
                }
            }
        }, 1000);
        
        // 5초 후 추가 확인
        setTimeout(async () => {
            if (!producer.closed && producer.getStats) {
                const stats = await producer.getStats();
                console.log(`Producer ${producer.id} 통계 (5초 후):`, stats);
            }
        }, 5000);

        // 다른 참가자들에게 새 Producer 알림
        socket.to(peer.roomId).emit('new-producer', {
          producerId: producer.id,
          peerId: peer.id,
          kind: producer.kind
        });

        callback({ producerId: producer.id });

      } catch (error) {
        console.error('Produce error:', error);
        callback({ error: error.message });
      }
    });

    // Consumer 생성 (미디어 수신)
    socket.on('consume', async (data, callback) => {
      try {
        const { producerId, rtpCapabilities } = data;
        const peer = peers.get(socket.id);

        if (!peer) {
          throw new Error('Peer not found');
        }

        const room = roomManager.getRoom(peer.roomId);
        if (!room) {
          throw new Error('Room not found');
        }

        // Producer를 가진 피어 찾기
        let targetProducer = null;
        let producerPeer = null;

        for (const [_, roomPeer] of room.peers) {
          if (roomPeer.getProducer(producerId)) {
            targetProducer = roomPeer.getProducer(producerId);
            producerPeer = roomPeer;
            break;
          }
        }

        if (!targetProducer) {
          throw new Error('Producer not found');
        }

        // RTP 능력 확인
        if (!router.canConsume({ producerId, rtpCapabilities })) {
          throw new Error('Cannot consume');
        }

        // Transport 가져오기 (Consumer용)
        // 우선 consuming: true로 설정된 transport를 찾고, 없으면 첫 번째 transport 사용
        const transport = Array.from(peer.transports.values())
            .find(t => t.appData && t.appData.consuming === true) || 
            Array.from(peer.transports.values())[0];

        if (!transport) {
          throw new Error('No suitable transport found for consuming');
        }

        // Consumer 생성
        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: false
        });

        peer.addConsumer(consumer);
        console.log(`Consumer created: ${consumer.id} for producer ${producerId}`);

        callback({
          consumerId: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        });

      } catch (error) {
        console.error('Consume error:', error);
        callback({ error: error.message });
      }
    });

    // Consumer 재개
    socket.on('resume-consumer', async (data, callback) => {
      try {
        const { consumerId } = data;
        const peer = peers.get(socket.id);

        if (!peer) {
          throw new Error('Peer not found');
        }

        const consumer = peer.getConsumer(consumerId);
        if (!consumer) {
          throw new Error('Consumer not found');
        }

        await consumer.resume();
        console.log(`Consumer resumed: ${consumerId}`);
        callback({ success: true });

      } catch (error) {
        console.error('Resume consumer error:', error);
        callback({ error: error.message });
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      const peer = peers.get(socket.id);
      if (!peer) return;

      console.log(`Client disconnected: ${peer.displayName}`);

      // 룸에서 피어 제거
      const room = roomManager.getRoom(peer.roomId);
      if (room) {
        room.peers.delete(peer.id);
        console.log(`Peer ${peer.id} removed from room ${peer.roomId}`);

        // 다른 참가자들에게 알림
        socket.to(peer.roomId).emit('peer-left', { peerId: peer.id });

        // 빈 룸 삭제
        if (room.isEmpty()) {
          roomManager.deleteRoom(peer.roomId);
        }
      }

      // 피어 정리
      peer.close();
      peers.delete(socket.id);
    });

    // 화면 공유 상태 변경 처리
    socket.on('screen-share-status', (data) => {
      try {
        const { roomId, peerId, isSharing, producerId } = data;
        console.log(`Screen share status change: ${peerId}, sharing: ${isSharing}`);

        // 다른 참가자들에게 화면 공유 상태 알림
        socket.to(roomId).emit('screen-share-update', {
          peerId,
          isSharing,
          producerId
        });

      } catch (error) {
        console.error('Screen share status error:', error);
      }
    });

    // 피어 ID로 비디오 producer 찾기
    socket.on('get-producer-by-peer', (data, callback) => {
      try {
        const { peerId, kind } = data;
        const peer = peers.get(socket.id);
        
        if (!peer) {
          return callback({ error: 'Peer not found' });
        }
        
        const room = roomManager.getRoom(peer.roomId);
        if (!room) {
          return callback({ error: 'Room not found' });
        }
        
        // 요청된 피어 찾기
        const targetPeer = room.peers.get(peerId);
        if (!targetPeer) {
          return callback({ error: 'Target peer not found' });
        }
        
        // 해당 피어의 일반 비디오 producer 찾기 (화면 공유가 아닌)
        const videoProducer = targetPeer.getProducerByKind(kind, false);
        
        if (!videoProducer) {
          return callback({ error: 'Video producer not found' });
        }
        
        callback({ producerId: videoProducer.id });
        
      } catch (error) {
        console.error('Get producer by peer error:', error);
        callback({ error: error.message });
      }
    });

    // 타이핑 상태 처리
    socket.on('typing', async (data) => {
      try {
        const { roomId, isTyping } = data;
        const peer = peers.get(socket.id);
        
        if (!peer) {
          console.error('Typing status error: Peer not found');
          return;
        }
        
        // 본인을 제외한 모든 참가자에게 타이핑 상태 전달
        socket.to(roomId).emit('typing', {
          peerId: peer.id,
          displayName: peer.displayName,
          isTyping
        });
        
        console.log(`Typing status from ${peer.displayName} in room ${roomId}: ${isTyping ? 'typing' : 'stopped typing'}`);
        
      } catch (error) {
        console.error('Typing status error:', error);
      }
    });

    // 채팅 메시지 처리
    socket.on('chat-message', async (data) => {
      try {
        const { roomId, message, timestamp } = data;
        const peer = peers.get(socket.id);
        
        if (!peer) {
          console.error('Chat message error: Peer not found');
          return;
        }
        
        // 모든 참가자에게 메시지 전달 (발신자 포함)
        io.to(roomId).emit('chat-message', {
          peerId: peer.id,
          displayName: peer.displayName,
          message,
          timestamp
        });
        
        console.log(`Chat message from ${peer.displayName} in room ${roomId}: ${message}`);
        
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // 파일 업로드 알림 처리
    socket.on('file-uploaded', async (data) => {
      try {
        const { roomId, fileInfo } = data;
        const peer = peers.get(socket.id);

        if (!peer) {
          console.error('File upload notification error: Peer not found');
          return;
        }

        console.log('파일 업로드 이벤트 수신:', data); // 디버깅용 로그 추가

        // 파일 정보에 업로더 정보 추가
        const fileMessage = {
          ...fileInfo,
          uploadedBy: peer.displayName,
          peerId: peer.id,
          type: 'file' // 메시지 타입 구분
        };

        // 모든 참가자에게 파일 업로드 알림
        io.to(roomId).emit('file-shared', fileMessage);

        console.log(`File shared by ${peer.displayName} in room ${roomId}: ${fileInfo.originalName}`);

      } catch (error) {
        console.error('File upload notification error:', error);
      }
    });

    // 파일 목록 요청 처리 (선택사항)
    socket.on('get-room-files', async (data, callback) => {
      try {
        const { roomId } = data;
        const fs = require('fs').promises;
        const path = require('path');

        const roomPath = path.join(__dirname, '../uploads/rooms', roomId);

        // 디렉토리가 없으면 빈 배열 반환
        try {
          await fs.access(roomPath);
          const files = await fs.readdir(roomPath);

          // 파일 정보 수집
          const fileInfos = await Promise.all(
            files.map(async (filename) => {
              const filePath = path.join(roomPath, filename);
              const stats = await fs.stat(filePath);
              return {
                filename,
                size: stats.size,
                uploadedAt: stats.mtime
              };
            })
          );

          callback({ files: fileInfos });

        } catch (err) {
          // 디렉토리가 없는 경우
          callback({ files: [] });
        }

      } catch (error) {
        console.error('Get room files error:', error);
        callback({ error: error.message });
      }
    });

    // 녹화 시작
    socket.on('start-recording', async (data, callback) => {
        try {
            const room = roomManager.getRoom(data.roomId);
            const peer = peers.get(socket.id);

            // ⭐ 디버깅 로그
            console.log('녹화 시작 - socket.id:', socket.id);
            console.log('녹화 시작 - peer:', peer);
            console.log('녹화 시작 - peer.userId:', peer ? peer.userId : 'peer가 없음');

            if (!peer || !peer.userId) {
                throw new Error('사용자 정보를 찾을 수 없습니다');
            }

            // ⭐⭐ 녹화 전 체크 추가 - 이 부분이 중요합니다!
            const checkResult = await room.preRecordingCheck();
            if (!checkResult) {
                throw new Error('녹화 사전 체크 실패. 콘솔 로그를 확인하세요.');
            }

            // 실제 사용자 ID 사용
            const result = await room.startRecording(peer.userId);

            // 다른 사용자에게 알림
            io.to(data.roomId).emit('recording-started', {
                recordingId: result.recordingId,
                startedBy: peer.displayName
            });

            callback(result);
        } catch (error) {
            console.error('녹화 시작 실패:', error);
            callback({ error: error.message });
        }
    });

    // 녹화 종료
    socket.on('stop-recording', async (data, callback) => {
        try {
            const { roomId } = data;
            const peer = peers.get(socket.id);

            if (!peer) {
                return callback({ error: '인증되지 않은 사용자' });
            }

            const room = roomManager.getRoom(roomId);
            if (!room) {
                return callback({ error: '룸을 찾을 수 없습니다' });
            }

            // 녹화 종료
            const result = await room.stopRecording();

            // 모든 참가자에게 녹화 종료 알림
            io.to(roomId).emit('recording-stopped', {
                recordingId: result.recordingId,
                stoppedBy: peer.displayName
            });

            callback({ success: true, ...result });

        } catch (error) {
            console.error('녹화 종료 오류:', error);
            callback({ error: error.message });
        }
    });
    // 녹화 상태 확인
    socket.on('get-recording-status', async (data, callback) => {
        try {
            const { roomId } = data;
            const room = roomManager.getRoom(roomId);

            if (!room) {
                return callback({ error: '룸을 찾을 수 없습니다' });
            }

            callback({
                isRecording: room.recordingStatus,
                recordingId: room.recorder?.recordingId
            });

        } catch (error) {
            console.error('녹화 상태 확인 오류:', error);
            callback({ error: error.message });
        }
    });
  });
};

// WebRTC Transport 생성 함수 에이콘 아카데미 IP :172.30.1.49 , 192.168.100.16  투썸플레이스 신촌점 : 192.168.40.6 집 와이파이 : 192.168.0.16
async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'  // 로컬 테스트용
      }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000
  });

  console.log(`WebRTC Transport created: ${transport.id}`);
  return transport;
}