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
        this.gstreamerProcess = null;
        this.videoPort = null;
        this.audioPort = null;
        this.isRecording = false;
        this.filePath = null;
    }

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

            // GStreamer는 SDP 파일이 필요 없음
            console.log('GStreamer 녹화 준비 중...');

            // ⭐ GStreamer 파이프라인 구성
            const videoCaps = `application/x-rtp,media=video,encoding-name=VP8,payload=${videoRtpParameters?.codecs?.[0]?.payloadType || 101},clock-rate=90000`;
            const audioCaps = `application/x-rtp,media=audio,encoding-name=OPUS,payload=${audioRtpParameters?.codecs?.[0]?.payloadType || 100},clock-rate=48000`;

            // GStreamer 파이프라인
            const pipeline = [
                // 비디오 입력
                `udpsrc port=${this.videoPort} caps="${videoCaps}" ! rtpvp8depay ! vp8dec ! videoconvert ! vp8enc deadline=1 cpu-used=4 threads=4`,
                
                // 오디오 입력  
                `udpsrc port=${this.audioPort} caps="${audioCaps}" ! rtpopusdepay ! opusdec ! audioconvert ! opusenc`,
                
                // Muxer 및 출력
                `webmmux name=mux ! filesink location="${this.filePath}"`,
                
                // 비디오를 muxer에 연결
                `name=video ! mux.`,
                
                // 오디오를 muxer에 연결
                `name=audio ! mux.`
            ];

            // 전체 파이프라인을 하나의 문자열로
            const gstPipeline = `
                udpsrc port=${this.videoPort} caps="${videoCaps}" ! 
                rtpvp8depay ! queue ! vp8dec ! videoconvert ! 
                vp8enc deadline=1 cpu-used=4 threads=4 target-bitrate=1000000 ! queue ! mux.video_0 
                
                udpsrc port=${this.audioPort} caps="${audioCaps}" ! 
                rtpopusdepay ! queue ! opusdec ! audioconvert ! audioresample ! 
                opusenc bitrate=128000 ! queue ! mux.audio_0 
                
                webmmux name=mux ! filesink location="${this.filePath}"
            `.replace(/\s+/g, ' ').trim();

            console.log('GStreamer 파이프라인:', gstPipeline);

            // GStreamer 실행
            this.gstreamerProcess = spawn('gst-launch-1.0', ['-e', '-v', ...gstPipeline.split(' ')]);

            // GStreamer 프로세스 시작 확인
            this.gstreamerProcess.on('spawn', () => {
                console.log('✅ GStreamer 프로세스 시작됨');
                this.isRecording = true;
            });

            // GStreamer 출력 모니터링
            this.gstreamerProcess.stdout.on('data', (data) => {
                const log = data.toString();
                if (log.includes('Pipeline is PREROLLING')) {
                    console.log('GStreamer: 파이프라인 준비 중...');
                } else if (log.includes('Pipeline is PREROLLED')) {
                    console.log('✅ GStreamer: 파이프라인 준비 완료');
                } else if (log.includes('Pipeline is PLAYING')) {
                    console.log('✅ GStreamer: 녹화 시작됨');
                }
            });

            // 에러 모니터링
            this.gstreamerProcess.stderr.on('data', (data) => {
                const log = data.toString();
                if (log.includes('ERROR')) {
                    console.error('GStreamer 에러:', log);
                } else if (log.includes('WARNING')) {
                    console.warn('GStreamer 경고:', log);
                } else {
                    console.log('GStreamer:', log.trim());
                }
            });

            // 프로세스 종료 처리
            this.gstreamerProcess.on('exit', (code, signal) => {
                console.log(`GStreamer 종료 - code: ${code}, signal: ${signal}`);
                this.isRecording = false;
            });

             return {
                        success: true,
                        recordingId: this.recordingId
                    };

                } catch (error) {
                    console.error('녹화 시작 실패:', error);
                    throw error;
                }
            }

    // GStreamer는 SDP 파일이 필요 없으므로 이 메서드는 더 이상 사용하지 않습니다
    createDetailedSDP(videoRtpParameters, audioRtpParameters) {
        // GStreamer는 caps 문자열로 RTP 파라미터를 직접 지정하므로 SDP 파일이 불필요
        console.log('GStreamer 방식에서는 SDP 파일을 사용하지 않습니다.');
        return null;
    }

    async stopRecording() {
        if (!this.isRecording || !this.gstreamerProcess) {
            return { success: false, message: '녹화 중이 아닙니다' };
        }

        try {
            this.isRecording = false;

            // GStreamer 프로세스 종료
            console.log('GStreamer 프로세스 종료 시작...');
            
            // SIGINT로 정상 종료 (Ctrl+C와 동일)
            this.gstreamerProcess.kill('SIGINT');
            
            // 프로세스가 종료될 때까지 대기 (최대 5초)
            await new Promise((resolve) => {
                let timeout = setTimeout(() => {
                    console.log('GStreamer가 정상 종료되지 않아 강제 종료합니다.');
                    this.gstreamerProcess.kill('SIGKILL');
                    resolve();
                }, 5000);
                
                this.gstreamerProcess.on('exit', (code, signal) => {
                    clearTimeout(timeout);
                    console.log(`GStreamer 종료됨 - code: ${code}, signal: ${signal}`);
                    resolve();
                });
            });

            // 파일이 완전히 쓰여질 때까지 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 2000));

            let fileSize = 0;
            if (fs.existsSync(this.filePath)) {
                const stats = fs.statSync(this.filePath);
                fileSize = stats.size;
                console.log(`녹화 파일 크기: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
            } else {
                console.error('녹화 파일이 존재하지 않습니다:', this.filePath);
            }

            // Spring Boot에 녹화 종료 알림
            await axios.put(`${this.springBootUrl}/api/recordings/${this.recordingId}/stop`, {
                fileSize: fileSize
            });

            console.log(`녹화 종료 완료: ${this.recordingId}`);

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