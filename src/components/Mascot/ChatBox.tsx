import React, { useState, useRef, useEffect, useCallback } from 'react';
import { emotionController, EmotionName, voiceController } from './MascotController';
import { animationController } from './MascotAnimations';
import { liveVoiceClient } from './LiveVoiceClient';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatBoxProps {
  onGreeting?: (text: string, emotion: EmotionName) => void;
}

type VoiceMode = 'off' | 'connecting' | 'live';

const ChatBox: React.FC<ChatBoxProps> = ({ onGreeting }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [reactionBubble, setReactionBubble] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('off');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  // Accumulate live transcripts
  const modelTranscriptRef = useRef('');
  const userTranscriptRef = useRef('');
  const [liveUserTranscript, setLiveUserTranscript] = useState<string>('');

  // ── Load available voices ──
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);

      if (!selectedVoiceName && available.length > 0) {
        const preferred = [
          'Google UK English Female',
          'Google US English',
          'Microsoft Aria Online (Natural)',
          'Microsoft Jenny Online (Natural)',
          'Samantha',
          'Moira',
        ];
        const found = available.find(v => preferred.includes(v.name))
          || available.find(v => v.lang.startsWith('en') && /female/i.test(v.name))
          || available.find(v => v.lang.startsWith('en'))
          || available[0];
        if (found) {
          setSelectedVoiceName(found.name);
          voiceController.selectedVoice = found;
        }
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const handleVoiceChange = (name: string) => {
    setSelectedVoiceName(name);
    const voice = voices.find(v => v.name === name);
    voiceController.selectedVoice = voice || null;
  };

  // ── Reaction bubble sync ──
  useEffect(() => {
    const interval = setInterval(() => {
      const bubble = animationController.reactionBubble;
      if (bubble && Date.now() < bubble.expiresAt) {
        setReactionBubble(bubble.text);
      } else {
        setReactionBubble(null);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ── Idle companion prompts ──
  useEffect(() => {
    animationController.onIdlePrompt = (text: string) => {
      setMessages(prev => [...prev, { role: 'assistant', text }]);
      const picks: Array<'shyLookAway' | 'idleLookAround'> = ['shyLookAway', 'idleLookAround'];
      animationController.playAnimation(
        picks[Math.floor(Math.random() * picks.length)],
        text.replace(/\s*[🌸✨💫👀🤔💧😊]+\s*/g, '').slice(0, 20)
      );
    };
    return () => { animationController.onIdlePrompt = null; };
  }, []);

  // Auto-greeting
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;

    const greeting = "Hi! I'm Amy, your AI wellness companion~ Nice to meet you! 💖";
    setMessages([{ role: 'assistant', text: greeting }]);
    emotionController.setEmotion('happy');
    onGreeting?.(greeting, 'happy');

    setTimeout(() => {
      animationController.playAnimation('waveHello', 'Hi~!');
      if (voiceEnabled) {
        voiceController.speak(greeting);
      }
    }, 500);
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, liveTranscript]);

  const loadingRef = useRef(false);
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  // ── Text chat send ──
  const sendChatMessage = useCallback(async (msgText: string) => {
    if (!msgText.trim() || loadingRef.current) return;

    if (animationController.detectCompliment(msgText)) {
      animationController.playAnimation('shyLookAway', 'aww~');
    }

    setMessages((prev) => [...prev, { role: 'user', text: msgText }]);
    setLoading(true);
    loadingRef.current = true;

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/mascot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });
      const data = await res.json();
      const reply = data.reply || "Hmm, I couldn't think of anything...";
      const emotion: EmotionName = data.emotion || 'neutral';

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
      emotionController.setEmotion(emotion);

      const trigger = animationController.detectReplyTrigger(reply);
      if (trigger) {
        animationController.playAnimation(trigger.anim, trigger.bubble);
      }

      if (voiceEnabledRef.current) {
        voiceController.speak(reply);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', text: "Sorry, I got a little confused~ Try again?" }]);
      emotionController.setEmotion('embarrassed');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendChatMessage(text);
  }, [input, sendChatMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ══════════════════════════════════════════════
  // Live Voice Mode (WebSocket)
  // ══════════════════════════════════════════════

  const toggleLiveVoice = useCallback(async () => {
    if (voiceMode === 'live' || voiceMode === 'connecting') {
      // Disconnect
      liveVoiceClient.disconnect();
      setVoiceMode('off');
      setLiveTranscript('');
      voiceController.isSpeaking = false;
      return;
    }

    // Stop any browser TTS
    voiceController.stop();
    setVoiceMode('connecting');
    setLiveTranscript('');
    setLiveUserTranscript('');
    modelTranscriptRef.current = '';
    userTranscriptRef.current = '';

    try {
      await liveVoiceClient.connect({
        onConnected: () => {
          setVoiceMode('live');
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: '🎙️ Live voice mode active! Speak to me~',
          }]);
          emotionController.setEmotion('happy');
          animationController.playAnimation('waveHello', '🎙️ Live!');
        },
        onDisconnected: () => {
          setVoiceMode('off');
          setLiveTranscript('');
          voiceController.isSpeaking = false;
        },
        onError: (msg) => {
          console.error('Live voice error:', msg);
          setVoiceMode('off');
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: `Oops, voice connection failed~ (${msg})`,
          }]);
          emotionController.setEmotion('embarrassed');
        },
        onUserTranscript: (text) => {
          // Accumulate user speech fragments into one message
          userTranscriptRef.current += (userTranscriptRef.current ? ' ' : '') + text;
          setLiveUserTranscript(userTranscriptRef.current);
        },
        onModelTranscript: (text) => {
          // When model starts speaking, flush accumulated user speech first
          if (userTranscriptRef.current.trim() && !modelTranscriptRef.current) {
            const userText = userTranscriptRef.current.trim();
            setMessages(prev => [...prev, { role: 'user', text: userText }]);
            userTranscriptRef.current = '';
            setLiveUserTranscript('');
          }

          // Accumulate model transcript WITH spaces
          modelTranscriptRef.current += (modelTranscriptRef.current ? ' ' : '') + text;
          setLiveTranscript(modelTranscriptRef.current);
        },
        onSpeaking: (isSpeaking) => {
          // Drive lip sync via voiceController
          voiceController.isSpeaking = isSpeaking;

          if (!isSpeaking && modelTranscriptRef.current.trim()) {
            // Model stopped speaking — flush transcript as message
            const modelText = modelTranscriptRef.current.trim();
            setMessages(prev => [...prev, { role: 'assistant', text: modelText }]);

            const trigger = animationController.detectReplyTrigger(modelText);
            if (trigger) {
              animationController.playAnimation(trigger.anim, trigger.bubble);
            }
            modelTranscriptRef.current = '';
            setLiveTranscript('');
          }
        },
      });
    } catch {
      setVoiceMode('off');
    }
  }, [voiceMode]);

  return (
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur-md rounded-2xl border border-purple-500/30 overflow-hidden relative">
      {/* ── Reaction Bubble ── */}
      {reactionBubble && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-pink-500/90 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-pink-500/30 whitespace-nowrap">
            {reactionBubble}
          </div>
          <div className="w-3 h-3 bg-pink-500/90 rotate-45 mx-auto -mt-1.5" />
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-purple-600/30 to-yellow-500/20 border-b border-purple-500/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-sm">✨ Chat with Amy</h3>
          <div className="flex items-center gap-1.5">
            {/* Voice mode badge */}
            {voiceMode === 'live' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/70 text-white animate-pulse">
                🔴 LIVE
              </span>
            )}
            {voiceMode === 'connecting' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/70 text-white animate-pulse">
                ⏳ Connecting...
              </span>
            )}
            <button
              onClick={() => {
                setVoiceEnabled((v) => !v);
                if (voiceEnabled) voiceController.stop();
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                voiceEnabled
                  ? 'bg-green-600/50 text-green-200 hover:bg-green-500/50'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
              }`}
              title={voiceEnabled ? 'Voice On' : 'Voice Off'}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
          </div>
        </div>
        {voiceEnabled && voices.length > 0 && voiceMode === 'off' && (
          <select
            value={selectedVoiceName}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/20 text-white text-[11px] focus:outline-none focus:border-purple-400 truncate"
            aria-label="Select voice"
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name} style={{ background: '#1a1a2e' }}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-white/90 rounded-bl-sm border border-cyan-400/20'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Live user speech preview */}
        {liveUserTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed bg-purple-600/50 text-white/70 italic">
              {liveUserTranscript}
              <span className="animate-pulse ml-1">▊</span>
            </div>
          </div>
        )}

        {/* Live transcript preview */}
        {liveTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-sm text-sm leading-relaxed bg-gray-800/60 text-white/70 border border-cyan-400/10 italic">
              {liveTranscript}
              <span className="animate-pulse ml-1">▊</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-white/60 px-3 py-2 rounded-2xl rounded-bl-sm text-sm border border-cyan-400/20">
              <span className="animate-pulse">Amy is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-purple-500/20">
        <div className="flex gap-2">
          {/* Live Voice Mic Button */}
          <button
            onClick={toggleLiveVoice}
            disabled={voiceMode === 'connecting'}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
              voiceMode === 'live'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-400/50 ring-offset-1 ring-offset-gray-900'
                : voiceMode === 'connecting'
                  ? 'bg-cyan-400 text-white animate-pulse'
                  : 'bg-gray-700 text-white/60 hover:bg-purple-600 hover:text-white hover:shadow-lg hover:shadow-purple-500/30'
            }`}
            title={
              voiceMode === 'live'
                ? 'End live voice (click to stop)'
                : voiceMode === 'connecting'
                  ? 'Connecting...'
                  : 'Start live voice conversation'
            }
          >
            {voiceMode === 'connecting' ? '⏳' : '🎤'}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              voiceMode === 'live'
                ? '🔴 Live mode — speak to Amy!'
                : voiceMode === 'connecting'
                  ? 'Connecting...'
                  : 'Say something...'
            }
            className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none placeholder-gray-500"
            disabled={loading || voiceMode !== 'off'}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || voiceMode !== 'off'}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
          >
            Send
          </button>
        </div>
        {voiceMode === 'live' && (
          <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Live voice active — speak to Amy, or click 🎤 to end
          </div>
        )}
        {voiceMode === 'connecting' && (
          <div className="mt-2 flex items-center gap-2 text-cyan-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
            Setting up voice connection...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;
