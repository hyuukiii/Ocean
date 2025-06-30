class Room {
  constructor(roomId, workspaceId, router) {
    this.id = roomId;
    this.workspaceId = workspaceId;
    this.router = router;
    this.peers = new Map(); // Peer 인스턴스를 직접 저장
    this.createdAt = new Date();
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