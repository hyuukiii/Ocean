// src/RoomManager.js
const Room = require('./Room');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId, workspaceId, router) {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const room = new Room(roomId, workspaceId, router);
    this.rooms.set(roomId, room);

    console.log(`Room created: ${roomId} for workspace: ${workspaceId}`);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.isEmpty()) {
      this.rooms.delete(roomId);
      console.log(`Room deleted: ${roomId}`);
      return true;
    }
    return false;
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  getRoomsByWorkspace(workspaceId) {
    return this.getAllRooms().filter(room => room.workspaceId === workspaceId);
  }
}

// 싱글톤 패턴
module.exports = new RoomManager();