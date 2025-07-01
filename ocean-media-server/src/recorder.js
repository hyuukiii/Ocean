// ocean-media-server/src/recorder.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

class Recorder {
    constructor(roomId, workspaceId, recorderId, springBootUrl) {
        this.roomId = roomId;
        this.workspaceId = workspaceId;
        this.recorderId = recorderId;
        this.springBootUrl = springBootUrl || 'http://localhost:8080';
        this.recordingId = null;
        this.ffmpegProcess = null;
        this.videoPort = null;
        this.audioPort = null;
        this.isRecording = false;
        this.filePath = null;
    }

    /**
     * 녹화 시작
     */
    async startRecording(videoPort, audioPort) {
        try {
            // Spring Boot에 녹화 시작 알림
            const response = await axios.post(`${this.springBootUrl}/api/recordings/start`, {
                roomId: this.roomId,
                workspaceId: this.workspaceId,
                recorderId: this.recorderId
            });

            // ⭐ 응답 전체 확인
            console.log('Spring Boot 응답 전체:', response.data);
            console.log('응답 키들:', Object.keys(response.data));

            this.recordingId = response.data.recordingId;
            this.filePath = response.data.filePath;

            // filePath가 없으면 에러 메시지 출력
            if (!this.filePath) {
                console.error('filePath가 응답에 없습니다!');
                console.error('받은 데이터:', JSON.stringify(response.data, null, 2));
            }

            this.videoPort = videoPort;
            this.audioPort = audioPort;

            // 녹화 디렉토리 생성
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // FFmpeg 프로세스 시작
            const ffmpegArgs = [
                '-protocol_whitelist', 'pipe,udp,rtp,file',
                '-fflags', '+genpts',
                '-f', 'sdp',
                '-i', 'pipe:0',
                '-map', '0:v:0',
                '-map', '0:a:0',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-tune', 'zerolatency',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                '-y',
                this.filePath
            ];

            this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            // SDP 생성 및 전송
            const sdp = this.createSDP();
            this.ffmpegProcess.stdin.write(sdp);
            this.ffmpegProcess.stdin.end();

            // FFmpeg 로그 처리
            this.ffmpegProcess.stderr.on('data', (data) => {
                console.log(`FFmpeg: ${data}`);
            });

            this.ffmpegProcess.on('error', (error) => {
                console.error('FFmpeg 에러:', error);
                this.handleRecordingError(error.message);
            });

            this.ffmpegProcess.on('exit', (code, signal) => {
                console.log(`FFmpeg 종료: code=${code}, signal=${signal}`);
                if (code !== 0 && this.isRecording) {
                    this.handleRecordingError(`FFmpeg 비정상 종료: ${code}`);
                }
            });

            this.isRecording = true;
            console.log(`녹화 시작: ${this.recordingId}`);

            return {
                success: true,
                recordingId: this.recordingId
            };

        } catch (error) {
            console.error('녹화 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 녹화 종료
     */
    async stopRecording() {
        if (!this.isRecording || !this.ffmpegProcess) {
            return { success: false, message: '녹화 중이 아닙니다' };
        }

        try {
            this.isRecording = false;

            // FFmpeg 프로세스 종료
            this.ffmpegProcess.kill('SIGTERM');

            // 파일 크기 확인
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

            let fileSize = 0;
            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath);
                fileSize = stats.size;
            }

            // Spring Boot에 녹화 종료 알림
            await axios.put(`${this.springBootUrl}/api/recordings/${this.recordingId}/stop`, {
                fileSize: fileSize
            });

            console.log(`녹화 종료: ${this.recordingId}, 파일크기: ${fileSize}`);

            return {
                success: true,
                recordingId: this.recordingId,
                filePath: this.filePath,
                fileSize: fileSize
            };

        } catch (error) {
            console.error('녹화 종료 실패:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * SDP 파일 생성
     */
    createSDP() {
        return `v=0
o=- 0 0 IN IP4 127.0.0.1
s=Recording
c=IN IP4 127.0.0.1
t=0 0
m=video ${this.videoPort} RTP/AVP 96
a=rtpmap:96 VP8/90000
a=recvonly
m=audio ${this.audioPort} RTP/AVP 97
a=rtpmap:97 opus/48000/2
a=recvonly
`;
    }

    /**
     * 녹화 에러 처리
     */
    async handleRecordingError(errorMessage) {
        this.isRecording = false;

        try {
            await axios.put(`${this.springBootUrl}/api/recordings/${this.recordingId}/fail`, {
                reason: errorMessage
            });
        } catch (error) {
            console.error('녹화 실패 처리 중 오류:', error);
        }
    }
}

module.exports = Recorder;