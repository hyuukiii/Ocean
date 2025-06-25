const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
const cors = require('cors');
const roomManager = require('./RoomManager');
const socketHandler = require('./socketHandler');
const fs = require('fs');
const https = require('https');

const app = express();
app.use(cors());
//정적 파일 서빙 하기
app.use(express.static('public'));
app.use(express.json());

//const server = http.createServer(app);
// HTTPS 서버 생성
const server = https.createServer({
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem')
}, app);

//const io = new Server(server, {
  //cors: {
    //origin: ["https://localhost:3001","https://172.30.1.49:3001", "*"],
    //credentials: true
  //}
//});

const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST"]
  }
});

let worker;
let router;

async function createWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  console.log('mediasoup Worker created');

  worker.on('died', () => {
    console.error('mediasoup Worker died!');
    process.exit(1);
  });

  return worker;
}

async function init() {
  worker = await createWorker();

  // Router 생성 (간단한 코덱 설정)
  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000
      }
    ]
  });

  console.log('Router created');

  socketHandler(io,worker,router);
}

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'ok', worker: worker?.pid });
});

// 룸 생성 API
app.post('/api/rooms',async(req,res) => {
    try {
       const { roomId, workspaceId } = req.body;

       if(!roomId || !workspaceId) {
        return res.status(400).json({ error: '룸ID 혹은 워크스페이스ID는 필수 입니다'});
       }

       const room = roomManager.createRoom(roomId,workspaceId,router);
       res.json({success: true, room: room.toJson() });
    } catch(error) {
        console.error('룸 만들던 중 오류:',error);
        res.status(500).json({ error: error.message });
    }
});

// 룸 조회 API
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const roomId = req.params.roomId;
    console.log('Looking for room:', roomId);

    const room = roomManager.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room.toJson());
  } catch (error) {
    console.error('Room lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 워크스페이스별 룸 조회
app.get('/api/workspaces/:workspaceId/rooms', (req, res) => {
  const rooms = roomManager.getRoomsByWorkspace(req.params.workspaceId);
  res.json(rooms.map(room => room.toJson()));
});

//서버 테스트
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', async () => {
  await init();
  console.log(`mediasoup 서버가 http://0.0.0.0:${PORT} 에서 실행 중`);
  console.log(`접속 주소: http://172.30.1.49:${PORT}`);
});