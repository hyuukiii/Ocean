const roomManager = require('./RoomManager');
const Peer = require('./Peer');

const peers = new Map();

module.exports = (io, worker, router) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', async (data) => {
      try {
        const { roomId, workspaceId, peerId, displayName } = data;
        console.log(`${displayName} joining room ${roomId}`);

        // 룸 가져오기 또는 생성
        let room = roomManager.getRoom(roomId);
        if (!room) {
          room = roomManager.createRoom(roomId, workspaceId, router);
        }

        // Peer 생성
        const peer = new Peer(socket, roomId, peerId, displayName);
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
  });
};

// WebRTC Transport 생성 함수
async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        //ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
        //announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
        ip: '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '172.30.1.49'
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