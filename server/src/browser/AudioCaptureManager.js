import { spawn } from 'child_process';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import { EventEmitter } from 'events';
import logger from '../shared/logger.js';

class AudioCaptureManager extends EventEmitter {
  constructor(sessionId, options = {}) {
    super();
    this.sessionId = sessionId;
    this.isCapturing = false;
    this.ffmpegProcess = null;
    this.sinkLoaded = false;
    this.audioChunks = [];
    this.lastAudioTime = 0;
    this.audioBufferSize = 0;

    this.config = {
      sampleRate: options.sampleRate || 48000,
      channels: options.channels || 2,
      bitrate: options.bitrate || '128k',
      codec: options.codec || 'libopus',
      format: options.format || 'webm',
      latencyTarget: options.latencyTarget || 10, // ms
      ...options
    };
  }

  /**
   * Start capturing system audio from the browser with improved WebRTC approach
   */
  async startCapture(browserId, mode = 'auto') {
    if (this.isCapturing) return;

    // Auto-select mode based on platform if not specified
    if (mode === 'auto') {
      mode = (process.platform === 'linux') ? 'system' : 'webrtc';
    }

    this.captureMode = mode;
    logger.info(`[Audio ${this.sessionId}] Starting capture in ${mode} mode with ${this.config.latencyTarget}ms target`);

    if (mode === 'webrtc') {
      // WebRTC mode - audio comes from browser via WebRTC data channel
      this.isCapturing = true;
      this.emit('capture-started', { mode: 'webrtc', sessionId: this.sessionId });
      return;
    }

    try {
      // Step 1: Create virtual audio sink for this browser (Linux Only)
      if (process.platform === 'linux') {
        try {
          await this.createVirtualSink(browserId);
          this.sinkLoaded = true;
        } catch (err) {
          logger.warn(`[Audio ${this.sessionId}] PulseAudio sink creation failed: ${err.message}`);
        }
      }

      // Step 2: Start FFmpeg with optimized settings for low latency
      let inputFormat = 'pulse';
      let inputDevice = this.sinkLoaded ? `cospira-browser-${browserId}.monitor` : 'default';

      if (process.platform === 'win32') {
        inputFormat = 'dshow';
        inputDevice = 'audio=default';
      }

      // Optimized FFmpeg args for low latency audio
      const ffmpegArgs = [
        '-f', inputFormat,
        '-i', inputDevice,
        '-acodec', this.config.codec,
        '-ar', this.config.sampleRate.toString(),
        '-ac', this.config.channels.toString(),
        '-b:a', this.config.bitrate,
        '-f', this.config.format,
        '-fflags', '+nobuffer+flush_packets',
        '-flags', 'low_delay',
        '-max_delay', '0',
        '-avoid_negative_ts', 'make_zero',
        '-bufsize', '64k',
        '-tune', 'zerolatency',
        '-preset', 'ultrafast',
        '-g', '10', // GOP size for low latency
        'pipe:1'
      ];

      logger.info(`[Audio ${this.sessionId}] Starting FFmpeg: ${ffmpegPath.path} ${ffmpegArgs.join(' ')}`);
      this.ffmpegProcess = spawn(ffmpegPath.path, ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.chunkCount = 0;
      this.audioBufferSize = 0;

      // Handle audio data chunks with improved buffering
      this.ffmpegProcess.stdout.on('data', (chunk) => {
        this.chunkCount++;
        this.audioBufferSize += chunk.length;

        // Emit audio chunk with timing information
        this.emit('audio-chunk', {
          sessionId: this.sessionId,
          data: chunk.toString('base64'),
          timestamp: Date.now(),
          format: this.config.format,
          codec: this.config.codec,
          size: chunk.length,
          sequence: this.chunkCount
        });

        // Log every 50th chunk for monitoring
        if (this.chunkCount % 50 === 0) {
          logger.info(`[Audio ${this.sessionId}] Received 50 chunks. Total: ${this.chunkCount}, Buffer: ${this.audioBufferSize} bytes`);
        }

        // Prevent memory leaks - limit buffer size
        if (this.audioBufferSize > 10 * 1024 * 1024) { // 10MB limit
          logger.warn(`[Audio ${this.sessionId}] Audio buffer overflow, clearing buffer`);
          this.audioBufferSize = 0;
        }
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        const message = data.toString();
        // Log errors and warnings, but filter out common FFmpeg status messages
        if (message.includes('Error') || message.includes('failed') ||
            message.includes('No such file') || this.chunkCount === 0) {
          logger.warn(`[Audio ${this.sessionId}] FFmpeg stderr: ${message.trim()}`);
        }
      });

      this.ffmpegProcess.on('error', (error) => {
        logger.error(`[Audio ${this.sessionId}] FFmpeg process error: ${error.message}`);
        this.stopCapture(browserId);
      });

      this.ffmpegProcess.on('close', (code) => {
        logger.info(`[Audio ${this.sessionId}] FFmpeg process closed with code ${code}`);
        if (code !== 0 && this.isCapturing) {
          this.stopCapture(browserId);
        }
      });

      this.isCapturing = true;
      logger.info(`[Audio ${this.sessionId}] Capture started using device: ${inputDevice}`);

    } catch (error) {
      logger.error(`[Audio ${this.sessionId}] Failed to start capture: ${error.message}`);
      this.isCapturing = false;
    }
  }

  /**
   * Handle WebRTC audio data from browser
   */
  handleWebRTCAudio(audioData) {
    if (!this.isCapturing || this.captureMode !== 'webrtc') return;

    this.emit('webrtc-audio-chunk', {
      sessionId: this.sessionId,
      data: audioData,
      timestamp: Date.now(),
      format: 'webrtc'
    });
  }

  /**
   * Create PulseAudio virtual sink for isolated browser audio
   */
  async createVirtualSink(browserId) {
    return new Promise((resolve, reject) => {
      const sinkName = `cospira-browser-${browserId}`;

      const pactl = spawn('pactl', [
        'load-module',
        'module-null-sink',
        `sink_name=${sinkName}`,
        `sink_properties=device.description="Cospira_Browser_${browserId}"`
      ]);

      let errorOutput = '';
      pactl.stderr.on('data', (data) => { errorOutput += data.toString(); });

      pactl.on('close', (code) => {
        if (code === 0) {
          logger.info(`[Audio ${this.sessionId}] Virtual sink created: ${sinkName}`);
          resolve(sinkName);
        } else {
          reject(new Error(`Exit code ${code}: ${errorOutput.trim()}`));
        }
      });

      pactl.on('error', reject);
    });
  }

  /**
   * Stop audio capture
   */
  async stopCapture(browserId) {
    if (this.ffmpegProcess) {
      try {
        this.ffmpegProcess.stdin.end();
        this.ffmpegProcess.kill('SIGTERM');

        // Wait for process to exit gracefully
        setTimeout(() => {
          if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
            this.ffmpegProcess.kill('SIGKILL');
          }
        }, 5000);
      } catch (e) {
        logger.debug(`[Audio ${this.sessionId}] Error stopping FFmpeg: ${e.message}`);
      }
      this.ffmpegProcess = null;
    }

    if (this.sinkLoaded) {
      await this.removeVirtualSink(browserId);
      this.sinkLoaded = false;
    }

    this.isCapturing = false;
    this.audioChunks = [];
    this.audioBufferSize = 0;
    logger.info(`[Audio ${this.sessionId}] Capture stopped`);
  }

  /**
   * Remove PulseAudio virtual sink
   */
  async removeVirtualSink(browserId) {
    return new Promise((resolve) => {
      const sinkName = `cospira-browser-${browserId}`;
      const pactl = spawn('pactl', ['unload-module', sinkName]);
      pactl.on('close', () => resolve());
      pactl.on('error', () => resolve());
    });
  }

  /**
   * Get audio statistics
   */
  getStats() {
    return {
      isCapturing: this.isCapturing,
      mode: this.captureMode,
      chunksReceived: this.chunkCount || 0,
      bufferSize: this.audioBufferSize,
      lastActivity: this.lastAudioTime,
      config: this.config
    };
  }
}

export default AudioCaptureManager;

      this.ffmpegProcess.on('error', (error) => {
        logger.error(`[Audio ${this.sessionId}] FFmpeg process error: ${error.message}`);
        this.stopCapture(browserId);
      });

      this.isCapturing = true;
      logger.info(`[Audio ${this.sessionId}] Capture started using device: ${inputDevice}`);

    } catch (error) {
      logger.error(`[Audio ${this.sessionId}] Failed to start capture: ${error.message}`);
      this.isCapturing = false;
    }
  }

  /**
   * Create PulseAudio virtual sink for isolated browser audio
   */
  async createVirtualSink(browserId) {
    return new Promise((resolve, reject) => {
      const sinkName = `cospira-browser-${browserId}`;
      
      const pactl = spawn('pactl', [
        'load-module',
        'module-null-sink',
        `sink_name=${sinkName}`,
        `sink_properties=device.description="Cospira_Browser_${browserId}"`
      ]);

      let errorOutput = '';
      pactl.stderr.on('data', (data) => { errorOutput += data.toString(); });

      pactl.on('close', (code) => {
        if (code === 0) {
          logger.info(`[Audio ${this.sessionId}] Virtual sink created: ${sinkName}`);
          resolve(sinkName);
        } else {
          reject(new Error(`Exit code ${code}: ${errorOutput.trim()}`));
        }
      });

      pactl.on('error', reject);
    });
  }

  /**
   * Stop audio capture
   */
  async stopCapture(browserId) {
    if (this.ffmpegProcess) {
      this.ffmpegProcess.kill('SIGTERM');
      this.ffmpegProcess = null;
    }

    if (this.sinkLoaded) {
      await this.removeVirtualSink(browserId);
      this.sinkLoaded = false;
    }

    this.isCapturing = false;
    logger.info(`[Audio ${this.sessionId}] Capture stopped`);
  }

  /**
   * Remove PulseAudio virtual sink
   */
  async removeVirtualSink(browserId) {
    return new Promise((resolve) => {
      const sinkName = `cospira-browser-${browserId}`;
      const pactl = spawn('pactl', ['unload-module', sinkName]);
      pactl.on('close', () => resolve());
      pactl.on('error', () => resolve());
    });
  }
}

export default AudioCaptureManager;
