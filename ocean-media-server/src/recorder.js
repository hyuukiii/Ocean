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
        // 환경 변수에서 경로 가져오기
        this.recordingPath = process.env.RECORDING_PATH || '/Users/hyunki/Ocean/recordings';
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
    async startRecording(videoPort, audioPort, videoRtpParameters, audioRtpParameters) {
        try {
            // Spring Boot에 녹화 시작 알림
            const response = await axios.post(`${this.springBootUrl}/api/recordings/start`, {
                roomId: this.roomId,
                workspaceId: this.workspaceId,
                recorderId: this.recorderId
            });

            console.log('Spring Boot 응답:', response.data);

            this.recordingId = response.data.recordingId;

            // 로컬 경로 설정
            const fileName = path.basename(response.data.filePath);
            const localDir = path.join(this.recordingPath, this.workspaceId, this.roomId);
            this.filePath = path.join(localDir, fileName);

            console.log('녹화 파일 경로:', this.filePath);

            this.videoPort = videoPort;
            this.audioPort = audioPort;

            // 디렉토리 생성
            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }

            // SDP 생성
            const sdp = this.createDetailedSDP(videoRtpParameters, audioRtpParameters);

            // SDP를 파일로 저장
            const sdpPath = path.join(localDir, 'recording.sdp');
            fs.writeFileSync(sdpPath, sdp);
            console.log('SDP 파일 저장:', sdpPath);

            // ⭐ FFmpeg 실행 - SDP 파일 직접 사용
            const ffmpegArgs = [
                '-protocol_whitelist', 'file,udp,rtp',
                '-i', sdpPath,  // ⭐ 파일로 SDP 입력
                '-c:v', 'libvpx',  // VP8 코덱 사용
                '-c:a', 'libopus', // Opus 코덱 사용
                '-f', 'webm',
                '-y',
                this.filePath
            ];

            console.log('FFmpeg 명령:', 'ffmpeg', ffmpegArgs.join(' '));

            this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            // FFmpeg 로그
            this.ffmpegProcess.stderr.on('data', (data) => {
                console.log(`FFmpeg: ${data}`);
            });

            this.ffmpegProcess.on('error', (error) => {
                console.error('FFmpeg 프로세스 에러:', error);
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

    // ⭐ stopRecording 함수 확인 (이미 있는지 확인)
    async stopRecording() {
        if (!this.isRecording || !this.ffmpegProcess) {
            return { success: false, message: '녹화 중이 아닙니다' };
        }

        try {
            this.isRecording = false;

            // FFmpeg 프로세스 종료
            this.ffmpegProcess.kill('SIGTERM');

            // 파일 크기 확인
            await new Promise(resolve => setTimeout(resolve, 1000));

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