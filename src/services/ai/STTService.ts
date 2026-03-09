import { createClient, LiveTranscriptionEvents, DeepgramClient, LiveClient } from '@deepgram/sdk';
import { logger } from '@/utils/logger';

// Define types for transcription events
export type TranscriptCallback = (text: string, isFinal: boolean, speakerId?: string) => void;

class STTService {
  private client: DeepgramClient | null = null;
  private connection: LiveClient | null = null;
  private isConnected = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  // Circuit Breaker State
  private currentStream: MediaStream | null = null;
  private currentCallback: TranscriptCallback | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private isIntentionalStop = false;
  private isMockMode = false;
  private mockInterval: NodeJS.Timeout | null = null;

  private mockPhrases = [
    "Alright team, let's initialize the secure handshake protocol.",
    "I'm detecting some latency in the neural link.",
    'Can we verify the encryption keys for the new sector?',
    'Deployment to production is scheduled for 0800 hours.',
    'The AI analysis indicates a 98% success probability.',
    'Who has the authorization codes for the mainframe?',
    "Wait, I'm getting a signal from the external node.",
    "Let's synchronize our data streams.",
    'Security breach prevented by the orbital firewall.',
    'Meeting minutes are being compiled automatically.',
  ];

  /**
   * Initialize Deepgram with a temporary key
   */
  async init(tempKey: string) {
    if (this.isConnected && this.client) return;

    // Auto-enable mock mode if key is 'mock' or empty
    if (!tempKey || tempKey === 'mock') {
      this.isMockMode = true;
      this.isConnected = true;
      logger.info('[STTService] Initialized in MOCK MODE');
      return;
    }

    try {
      this.client = createClient(tempKey);
      this.isConnected = true;
      logger.info('[STTService] Initialized with temporary key');
    } catch (error) {
      logger.error('[STTService] Failed to initialize:', error);
      // Fallback to mock on error?
      this.isMockMode = true;
      logger.info('[STTService] Falling back to MOCK MODE');
    }
  }

  /**
   * Start transcription for a media stream
   */
  async start(stream: MediaStream, onTranscript: TranscriptCallback) {
    this.currentStream = stream;
    this.currentCallback = onTranscript;
    this.isIntentionalStop = false;
    this.retryCount = 0;

    await this.connect();
  }

  private startMockSimulation() {
    if (this.mockInterval) clearInterval(this.mockInterval);

    logger.info('[STTService] Starting Mock Simulation');

    this.mockInterval = setInterval(() => {
      if (this.currentCallback) {
        const text = this.mockPhrases[Math.floor(Math.random() * this.mockPhrases.length)];
        // Simulate partials then final
        this.currentCallback(text + '...', false);
        setTimeout(() => {
          if (this.currentCallback) {
            this.currentCallback(text, true);
          }
        }, 800);
      }
    }, 3000);
  }

  private async connect() {
    if (this.isMockMode) {
      this.startMockSimulation();
      return;
    }

    if (!this.client) {
      logger.error('[STTService] Client not initialized. Call init() first.');
      return;
    }

    if (!this.currentStream) {
      logger.error('[STTService] No stream available for connection.');
      return;
    }

    try {
      // Clean up existing connection if any (ghost connection)
      if (this.connection) {
        this.cleanupConnection();
      }

      this.connection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        diarize: true,
        interim_results: true,
      });

      // Events
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        logger.info('[STTService] Connection open');
        this.retryCount = 0; // Reset retry count on successful connection

        // Start sending audio data
        const mediaRecorder = new MediaRecorder(this.currentStream!, { mimeType: 'audio/webm' });

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && this.connection && this.connection.getReadyState() === 1) {
            // 1 = OPEN
            this.connection.send(event.data);
          }
        });

        mediaRecorder.start(250); // Send chunks every 250ms

        // Clean up on close
        this.connection?.on(LiveTranscriptionEvents.Close, () => {
          logger.info('[STTService] Connection closed');
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          this.handleConnectionLoss();
        });

        // Store recorder purely for cleanup if needed?
        // Actually, the closure handles it. But we need to ensure we don't leak it.
        // If 'connect' is called again, the old event listeners are gone, but the old mediaRecorder might be running?
        // No, 'Close' event stops it.
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0];
        if (transcript && transcript.transcript && this.currentCallback) {
          const text = transcript.transcript;
          const isFinal = data.is_final;
          this.currentCallback(text, isFinal);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
        logger.error('[STTService] Error:', err);
        // Error often precedes Close, but sometimes not.
        // We defer to Close handler or handle explicit error disconnect?
        // If Deepgram SDK emits error, does it close? Usually yes.
      });

      // Keep alive
      if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = setInterval(() => {
        if (this.connection && this.connection.getReadyState() === 1) {
          this.connection.keepAlive();
        }
      }, 5000); // More frequent keep-alive
    } catch (error) {
      logger.error('[STTService] Failed to start transcription:', error);
      this.handleConnectionLoss();
    }
  }

  private handleConnectionLoss() {
    if (this.isIntentionalStop) return;

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
      logger.warn(
        `[STTService] Connection lost. Retrying in ${delay}ms (Attempt ${this.retryCount}/${this.maxRetries})`
      );
      setTimeout(() => this.connect(), delay);
    } else {
      logger.error('[STTService] Circuit breaker open. Max retries reached. Stopping STT.');
      this.cleanupConnection();
      // Optionally notify callback about failure?
    }
  }

  private cleanupConnection() {
    if (this.connection) {
      try {
        this.connection.finish();
      } catch (_e) {
        // ignore
      }
      this.connection = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  stop() {
    this.isIntentionalStop = true;
    this.cleanupConnection();
    this.isConnected = false;
    this.currentStream = null;
    this.currentCallback = null;
  }
}

export default new STTService();
