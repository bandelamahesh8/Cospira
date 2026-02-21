import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import logger from '../logger.js';

class AudioCaptureManager extends EventEmitter {
  constructor(sessionId, options = {}) {
    super();
    this.sessionId = sessionId;
    this.isCapturing = false;
    this.ffmpegProcess = null;
    this.sinkLoaded = false;
    
    this.config = {
      sampleRate: options.sampleRate || 48000,
      channels: options.channels || 2,
      bitrate: options.bitrate || '64k',
      codec: options.codec || 'libopus',
      format: options.format || 'webm',
      ...options
    };
  }

  /**
   * Start capturing system audio from the browser
   */
  async startCapture(browserId, mode = 'auto') {
    if (this.isCapturing) return;

    // Auto-select mode based on platform if not specified
    if (mode === 'auto') {
      mode = (process.platform === 'linux') ? 'system' : 'browser';
    }

    this.captureMode = mode;
    logger.info(`[Audio ${this.sessionId}] Starting capture in ${mode} mode`);

    if (mode === 'browser') {
      // In browser mode, chunks are pushed via window.__cospira_audio_chunk
      // which is handled in OptimizedCloudBrowserManager.
      this.isCapturing = true;
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

      // Step 2: Start FFmpeg to capture audio (Fallback/System Mode)
      let inputFormat = 'pulse';
      let inputDevice = this.sinkLoaded ? `cospira-browser-${browserId}.monitor` : 'default';

      if (process.platform === 'win32') {
        inputFormat = 'dshow';
        inputDevice = 'audio=default'; 
      }
      
      const ffmpegArgs = [
        '-f', inputFormat,
        '-i', inputDevice,
        '-acodec', this.config.codec,
        '-ar', this.config.sampleRate.toString(),
        '-ac', this.config.channels.toString(),
        '-b:a', this.config.bitrate,
        '-f', this.config.format,
        '-fflags', '+nobuffer',
        '-flags', 'low_delay',
        'pipe:1'
      ];

      logger.info(`[Audio ${this.sessionId}] Starting FFmpeg: ffmpeg ${ffmpegArgs.join(' ')}`);
      this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      this.chunkCount = 0;

      // Handle audio data chunks
      this.ffmpegProcess.stdout.on('data', (chunk) => {
        this.chunkCount++;
        this.emit('audio-chunk', {
          sessionId: this.sessionId,
          data: chunk.toString('base64'),
          timestamp: Date.now(),
          format: this.config.format,
          codec: this.config.codec
        });
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        const message = data.toString();
        // Log basic FFmpeg status and all errors
        if (message.includes('Error') || message.includes('failed') || this.chunkCount === 0) {
          logger.warn(`[Audio ${this.sessionId}] FFmpeg stderr: ${message.trim()}`);
        }
      });

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
