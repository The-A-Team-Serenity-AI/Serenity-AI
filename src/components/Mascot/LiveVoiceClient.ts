/**
 * LiveVoiceClient — WebSocket client for Gemini Live API voice conversation.
 *
 * Handles:
 * - WebSocket connection to server proxy (ws://localhost:5000/api/mascot/live)
 * - Mic capture → PCM 16kHz 16-bit → base64 → WebSocket
 * - Receive PCM 24kHz audio → AudioContext playback
 * - Transcriptions display (input + output)
 * - Barge-in (model stops when user speaks)
 */

// ═══════════════════════════════════════════════════════════════
// Types & Callbacks
// ═══════════════════════════════════════════════════════════════

export interface LiveVoiceCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (msg: string) => void;
  /** Called when user's speech is transcribed */
  onUserTranscript?: (text: string) => void;
  /** Called when Amy's speech is transcribed */
  onModelTranscript?: (text: string) => void;
  /** Called when model starts/stops speaking (for lip sync) */
  onSpeaking?: (isSpeaking: boolean) => void;
}

type LiveState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ═══════════════════════════════════════════════════════════════
// LiveVoiceClient
// ═══════════════════════════════════════════════════════════════

class LiveVoiceClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private callbacks: LiveVoiceCallbacks = {};

  state: LiveState = 'disconnected';

  // Audio playback queue
  private audioQueue: Float32Array[] = [];
  private isPlayingAudio = false;
  private currentSource: AudioBufferSourceNode | null = null;

  // Tracking speaking state
  private _isSpeaking = false;
  private speakingTimeout: ReturnType<typeof setTimeout> | null = null;

  // Setup complete flag — Gemini sends a setupComplete message before accepting audio
  private setupComplete = false;

  /**
   * Connect to the Live API proxy and start mic capture.
   */
  async connect(callbacks: LiveVoiceCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.state = 'connecting';

    try {
      // Create AudioContext for playback (24kHz output from Gemini)
      this.audioCtx = new AudioContext({ sampleRate: 24000 });

      // Open WebSocket to our server's proxy
      // Use the environment variable for the backend URL, converting http/https to ws/wss
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const hostnameAndPort = backendUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${hostnameAndPort}/api/mascot/live`;
      this.ws = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          console.log('🎙️ WebSocket connected to proxy');
          // Don't resolve yet — wait for setupComplete from Gemini
        };

        this.ws!.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleMessage(data);

          // Resolve the connect promise once setup is complete
          if (data.setupComplete !== undefined && !this.setupComplete) {
            this.setupComplete = true;
            this.state = 'connected';
            this.callbacks.onConnected?.();
            resolve();
          }
        };

        this.ws!.onerror = (err) => {
          clearTimeout(timeout);
          console.error('❌ WS error:', err);
          this.state = 'error';
          this.callbacks.onError?.('WebSocket connection failed');
          reject(new Error('WebSocket connection failed'));
        };

        this.ws!.onclose = () => {
          console.log('🔚 WS closed');
          this.cleanup();
          this.callbacks.onDisconnected?.();
        };
      });

      // Now start the microphone
      await this.startMic();

    } catch (err: any) {
      console.error('LiveVoiceClient connect error:', err);
      this.state = 'error';
      this.callbacks.onError?.(err.message || 'Connection failed');
      this.cleanup();
      throw err;
    }
  }

  /**
   * Start mic capture and stream PCM 16kHz to WebSocket.
   */
  private async startMic(): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create a separate AudioContext at 16kHz for mic processing
    const micCtx = new AudioContext({ sampleRate: 16000 });
    this.micSource = micCtx.createMediaStreamSource(this.micStream);

    // ScriptProcessorNode to capture raw PCM samples
    // Buffer size 4096 = ~256ms chunks at 16kHz
    this.scriptProcessor = micCtx.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupComplete) return;

      const inputData = e.inputBuffer.getChannelData(0); // Float32 [-1, 1]

      // Convert Float32 → Int16 PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Send audio chunk
      const msg = {
        realtimeInput: {
          mediaChunks: [{
            data: base64,
            mimeType: 'audio/pcm;rate=16000',
          }],
        },
      };
      this.ws.send(JSON.stringify(msg));
    };

    this.micSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(micCtx.destination); // Required for processing to fire
    console.log('🎤 Mic streaming started (16kHz PCM)');
  }

  /**
   * Handle incoming messages from Gemini Live API.
   */
  private handleMessage(data: any): void {
    // Setup complete acknowledgment
    if (data.setupComplete !== undefined) {
      console.log('✅ Gemini Live API setup complete');
      return;
    }

    // Error
    if (data.error) {
      console.error('❌ Gemini error:', data.error);
      this.callbacks.onError?.(data.error.message || 'Gemini error');
      return;
    }

    const serverContent = data.serverContent;
    if (!serverContent) return;

    // Audio response
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.enqueueAudio(part.inlineData.data);
          this.setSpeaking(true);
        }
      }
    }

    // Turn complete — model finished speaking
    if (serverContent.turnComplete) {
      this.setSpeaking(false);
    }

    // User's speech transcription
    if (serverContent.inputTranscription?.text) {
      const text = serverContent.inputTranscription.text.trim();
      if (text) {
        this.callbacks.onUserTranscript?.(text);
      }
    }

    // Model's speech transcription
    if (serverContent.outputTranscription?.text) {
      const text = serverContent.outputTranscription.text.trim();
      if (text) {
        this.callbacks.onModelTranscript?.(text);
      }
    }

    // Interrupted (user barged in)
    if (serverContent.interrupted) {
      console.log('🔇 Model interrupted by user (barge-in)');
      this.stopPlayback();
      this.setSpeaking(false);
    }
  }

  /**
   * Decode base64 PCM 24kHz audio and queue for playback.
   */
  private enqueueAudio(base64Data: string): void {
    if (!this.audioCtx) return;

    // Decode base64 → Uint8Array → Int16 → Float32
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    this.audioQueue.push(float32);
    if (!this.isPlayingAudio) {
      this.playNextChunk();
    }
  }

  /**
   * Play queued audio chunks sequentially.
   */
  private playNextChunk(): void {
    if (!this.audioCtx || this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    this.isPlayingAudio = true;
    const samples = this.audioQueue.shift()!;

    const buffer = this.audioCtx.createBuffer(1, samples.length, 24000);
    buffer.copyToChannel(new Float32Array(samples) as Float32Array<ArrayBuffer>, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioCtx.destination);
    this.currentSource = source;

    source.onended = () => {
      this.currentSource = null;
      this.playNextChunk();
    };
    source.start();
  }

  /**
   * Stop any current audio playback.
   */
  private stopPlayback(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* */ }
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlayingAudio = false;
  }

  /**
   * Track speaking state with debounce.
   */
  private setSpeaking(speaking: boolean): void {
    if (speaking) {
      if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
      if (!this._isSpeaking) {
        this._isSpeaking = true;
        this.callbacks.onSpeaking?.(true);
      }
    } else {
      // Debounce stop — wait 300ms for more audio chunks
      if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
      this.speakingTimeout = setTimeout(() => {
        this._isSpeaking = false;
        this.callbacks.onSpeaking?.(false);
      }, 300);
    }
  }

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Disconnect and clean up all resources.
   */
  disconnect(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.state = 'disconnected';
    this.setupComplete = false;

    // Stop mic
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }

    // Stop playback
    this.stopPlayback();

    // Close WebSocket
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    // Close AudioContext
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => { /* */ });
      this.audioCtx = null;
    }

    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }

    this._isSpeaking = false;
  }
}

// Singleton export
export const liveVoiceClient = new LiveVoiceClient();
