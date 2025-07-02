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

            // ⭐ FFmpeg 실행 - SDP 파일 사용
            const ffmpegArgs = [
                '-loglevel', 'debug',  // 디버깅 로그
                '-analyzeduration', '10M',  // 분석 시간 증가
                '-probesize', '10M',  // 프로브 크기 증가
                '-protocol_whitelist', 'file,rtp,udp',
                '-reorder_queue_size', '0',  // RTP 재정렬 비활성화
                '-max_delay', '5000000',  // 최대 지연 시간 5초
                '-i', sdpPath,
                '-c:v', 'copy',  // 코덱 복사 (재인코딩 없음)
                '-c:a', 'copy',  // 코덱 복사 (재인코딩 없음)
                '-f', 'webm',
                '-flags', '+global_header',
                '-y',
                this.filePath
            ];

            console.log('FFmpeg 명령:', 'ffmpeg', ffmpegArgs.join(' '));

            this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

            // FFmpeg 로그
            this.ffmpegProcess.stderr.on('data', (data) => {
                const log = data.toString();
                console.log(`FFmpeg: ${log}`);

                // 성공 메시지 감지
                if (log.includes('Press [q] to stop') || log.includes('frame=')) {
                    if (!this.isRecording) {
                        this.isRecording = true;
                        console.log('녹화가 성공적으로 시작되었습니다');
                    }
                }
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

            // 녹화 시작 확인을 위한 타이머
            setTimeout(() => {
                if (!this.isRecording && this.ffmpegProcess && !this.ffmpegProcess.killed) {
                    console.log('녹화 시작 확인 중...');
                }
            }, 3000);

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
     * SDP 파일 생성 - FFmpeg 호환 버전
     * @param {Object} videoRtpParameters - 비디오 RTP 파라미터
     * @param {Object} audioRtpParameters - 오디오 RTP 파라미터
     * @returns {string} SDP 문자열
     */
    createDetailedSDP(videoRtpParameters, audioRtpParameters) {
        const videoCodec = videoRtpParameters?.codecs?.[0];
        const audioCodec = audioRtpParameters?.codecs?.[0];

        // 기본 SDP 헤더
        let sdp = 'v=0\r\n';
        sdp += 'o=- 0 0 IN IP4 127.0.0.1\r\n';
        sdp += 's=MediaSoup Recording\r\n';
        sdp += 'c=IN IP4 127.0.0.1\r\n';
        sdp += 't=0 0\r\n';

        // 비디오 스트림 추가
        if (videoRtpParameters && videoCodec) {
            sdp += `m=video ${this.videoPort} RTP/AVP ${videoCodec.payloadType}\r\n`;
            sdp += 'c=IN IP4 127.0.0.1\r\n';
            sdp += 'b=AS:5000\r\n';
            sdp += `a=rtcp:${this.videoPort + 1} IN IP4 127.0.0.1\r\n`;
            sdp += 'a=recvonly\r\n';
            sdp += `a=rtpmap:${videoCodec.payloadType} ${videoCodec.mimeType.split('/')[1].toUpperCase()}/${videoCodec.clockRate}\r\n`;

            // VP8 관련 추가 파라미터
            if (videoCodec.mimeType.toLowerCase() === 'video/vp8') {
                if (videoCodec.rtcpFeedback) {
                    videoCodec.rtcpFeedback.forEach(fb => {
                        if (fb.type === 'nack' && fb.parameter === 'pli') {
                            sdp += `a=rtcp-fb:${videoCodec.payloadType} nack pli\r\n`;
                        } else if (fb.type === 'nack' && !fb.parameter) {
                            sdp += `a=rtcp-fb:${videoCodec.payloadType} nack\r\n`;
                        } else if (fb.type === 'ccm' && fb.parameter === 'fir') {
                            sdp += `a=rtcp-fb:${videoCodec.payloadType} ccm fir\r\n`;
                        } else if (fb.type === 'goog-remb') {
                            sdp += `a=rtcp-fb:${videoCodec.payloadType} goog-remb\r\n`;
                        }
                    });
                }
            }

            // 추가 파라미터가 있다면 포함
            if (videoCodec.parameters && Object.keys(videoCodec.parameters).length > 0) {
                const params = Object.entries(videoCodec.parameters)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(';');
                sdp += `a=fmtp:${videoCodec.payloadType} ${params}\r\n`;
            }
        }

        // 오디오 스트림 추가
        if (audioRtpParameters && audioCodec) {
            sdp += `m=audio ${this.audioPort} RTP/AVP ${audioCodec.payloadType}\r\n`;
            sdp += 'c=IN IP4 127.0.0.1\r\n';
            sdp += `a=rtcp:${this.audioPort + 1} IN IP4 127.0.0.1\r\n`;
            sdp += 'a=recvonly\r\n';

            // 오디오 코덱 정보
            if (audioCodec.mimeType.toLowerCase() === 'audio/opus') {
                sdp += `a=rtpmap:${audioCodec.payloadType} opus/${audioCodec.clockRate}/${audioCodec.channels || 2}\r\n`;

                // Opus 파라미터
                const opusParams = [];

                // 기본 Opus 파라미터 설정
                opusParams.push('minptime=10');
                opusParams.push('useinbandfec=1');

                if (audioCodec.parameters) {
                    if (audioCodec.parameters.stereo !== undefined) {
                        opusParams.push(`stereo=${audioCodec.parameters.stereo}`);
                    }
                    if (audioCodec.parameters.maxplaybackrate !== undefined) {
                        opusParams.push(`maxplaybackrate=${audioCodec.parameters.maxplaybackrate}`);
                    }
                    if (audioCodec.parameters.sprop_stereo !== undefined) {
                        opusParams.push(`sprop-stereo=${audioCodec.parameters.sprop_stereo}`);
                    }
                }

                sdp += `a=fmtp:${audioCodec.payloadType} ${opusParams.join('; ')}\r\n`;
            } else {
                // 다른 오디오 코덱의 경우
                sdp += `a=rtpmap:${audioCodec.payloadType} ${audioCodec.mimeType.split('/')[1]}/${audioCodec.clockRate}`;
                if (audioCodec.channels && audioCodec.channels > 1) {
                    sdp += `/${audioCodec.channels}`;
                }
                sdp += '\r\n';
            }
        }

        console.log('생성된 SDP:\n', sdp);
        return sdp;
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