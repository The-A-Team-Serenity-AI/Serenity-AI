import { getApiUrl } from '../../utils/api';
import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';

export type EmotionName = 'happy' | 'embarrassed' | 'angry' | 'neutral' | 'thinking' | 'blushing' | 'teasing' | 'frustrated';

interface EmotionMapping {
  [expr: string]: number; // expression preset name → target value
}

const EMOTION_MAP: Record<EmotionName, EmotionMapping> = {
  happy: { happy: 0.95 },           // BIG smile
  embarrassed: { happy: 0.5 },      // shy smile
  angry: { angry: 0.9 },            // strong angry
  neutral: {},
  thinking: { neutral: 0.5 },
  blushing: { happy: 0.6 },         // warm blush smile
  teasing: { happy: 0.7 },          // playful smirk
  frustrated: { angry: 0.4, sad: 0.3 },  // mix of annoyed + pouty
};

// All expression names we might touch — used for resetting
const ALL_EXPRESSIONS = ['happy', 'angry', 'sad', 'surprised', 'neutral', 'relaxed'];

/**
 * Lightweight emotion controller for the VRM mascot.
 * Call `setEmotion` to change, and `update` every frame for smooth fading.
 */
export class EmotionController {
  private vrm: VRM | null = null;
  private current: EmotionMapping = {};
  private target: EmotionMapping = {};
  private lerpSpeed = 4; // how fast emotions fade (higher = faster)

  setVRM(vrm: VRM) {
    this.vrm = vrm;
  }

  /**
   * Transition to a new emotion state.
   */
  setEmotion(name: EmotionName) {
    // Reset all targets to 0
    this.target = {};
    for (const expr of ALL_EXPRESSIONS) {
      this.target[expr] = 0;
    }
    // Apply the new emotion targets
    const mapping = EMOTION_MAP[name] || {};
    for (const [expr, val] of Object.entries(mapping)) {
      this.target[expr] = val;
    }
  }

  /**
   * Call every frame. Smoothly interpolates current expression values toward target.
   */
  update(delta: number) {
    if (!this.vrm?.expressionManager) return;

    for (const expr of ALL_EXPRESSIONS) {
      const targetVal = this.target[expr] ?? 0;
      const currentVal = this.current[expr] ?? 0;
      const newVal = currentVal + (targetVal - currentVal) * Math.min(1, this.lerpSpeed * delta);
      this.current[expr] = newVal;

      try {
        this.vrm.expressionManager.setValue(expr as VRMExpressionPresetName, newVal);
      } catch {
        // expression may not exist on this model
      }
    }
  }
}

// Singleton instance — shared across the React tree
export const emotionController = new EmotionController();

// ═══════════════════════════════════════════════════════════════
// Voice Controller — manages TTS, lip sync state, and STT
// ═══════════════════════════════════════════════════════════════

class VoiceController {
  isSpeaking = false;
  /** 0-1 amplitude for lip sync (driven by TTS timing) */
  mouthOpenness = 0;
  private _audio: HTMLAudioElement | null = null;

  /**
   * Speak text using Gemini 2.5 Flash TTS (high quality AI voice).
   * Falls back to browser SpeechSynthesis if Gemini TTS is unavailable.
   */
  async speak(text: string): Promise<void> {
    this.stop();

    // Try Gemini TTS first
    try {
      const res = await fetch(getApiUrl('/api/mascot/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (data.audio) {
        // Play the base64 audio from Gemini TTS
        return this._playBase64Audio(data.audio, data.mimeType || 'audio/wav');
      }
    } catch (e) {
      console.warn('Gemini TTS unavailable, using browser voice:', e);
    }

    // Fallback: browser SpeechSynthesis
    return this._speakBrowser(text);
  }

  /** Play base64-encoded audio data */
  private _playBase64Audio(base64: string, mimeType: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(`data:${mimeType};base64,${base64}`);
      this._audio = audio;

      audio.onplay = () => { this.isSpeaking = true; };
      audio.onended = () => {
        this.isSpeaking = false;
        this.mouthOpenness = 0;
        this._audio = null;
        resolve();
      };
      audio.onerror = () => {
        this.isSpeaking = false;
        this.mouthOpenness = 0;
        this._audio = null;
        resolve();
      };

      audio.play().catch(() => {
        // Autoplay blocked — fall back to browser speech
        this.isSpeaking = false;
        resolve();
      });
    });
  }

  /** Voice chosen by the user from the dropdown. When set, browser TTS uses this. */
  selectedVoice: SpeechSynthesisVoice | null = null;

  /** Fallback: browser SpeechSynthesis */
  private _speakBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.15;
      utterance.volume = 0.9;

      // Use user-selected voice, or auto-pick
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      } else {
        const voices = window.speechSynthesis.getVoices();
        const pickVoice = () => {
          const googleNatural = voices.find(v =>
            /google.*us.*english/i.test(v.name) && v.lang.startsWith('en')
          );
          if (googleNatural) return googleNatural;
          const msNatural = voices.find(v =>
            /natural|aria|jenny|ana|sara|sonia/i.test(v.name) && v.lang.startsWith('en')
          );
          if (msNatural) return msNatural;
          const female = voices.find(v =>
            v.lang.startsWith('en') && /female|zira|samantha|karen|fiona|moira|tessa/i.test(v.name)
          );
          if (female) return female;
          return voices.find(v => v.lang.startsWith('en')) || null;
        };
        const chosen = pickVoice();
        if (chosen) utterance.voice = chosen;
      }

      utterance.onstart = () => { this.isSpeaking = true; };
      utterance.onend = () => {
        this.isSpeaking = false;
        this.mouthOpenness = 0;
        resolve();
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        this.mouthOpenness = 0;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /** Call every frame to get procedural mouth open value */
  updateLipSync(elapsed: number) {
    if (!this.isSpeaking) {
      this.mouthOpenness = 0;
      return;
    }
    // Multi-frequency sine wave for realistic syllable-like motion
    const t = elapsed;
    const fast = Math.sin(t * 12) * 0.5 + 0.5;
    const mid = Math.sin(t * 7.3) * 0.3 + 0.5;
    const slow = Math.sin(t * 3.1) * 0.2 + 0.5;
    this.mouthOpenness = Math.min(1, (fast * 0.5 + mid * 0.3 + slow * 0.2));
  }

  /** Stop any ongoing speech */
  stop() {
    window.speechSynthesis.cancel();
    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }
    this.isSpeaking = false;
    this.mouthOpenness = 0;
  }
}

export const voiceController = new VoiceController();

// ═══════════════════════════════════════════════════════════════
// Speech Recognition helper (STT)
// ═══════════════════════════════════════════════════════════════

// Extend Window for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function createSpeechRecognition(
  onResult: (transcript: string) => void,
  onEnd: () => void,
  onError?: (err: string) => void
): { start: () => void; stop: () => void } | null {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onend = () => onEnd();
  recognition.onerror = (event: any) => {
    console.warn('Speech recognition error:', event.error);
    onError?.(event.error);
    onEnd();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}
