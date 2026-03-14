import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import axios from 'axios';

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

function ChatWithPulse() {
  // State management
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: "Hi! I'm Amy, your AI companion for mental wellness. How can I help you today?",
      sender: "bot",
      timestamp: new Date()
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Initialize speech synthesis (useRef to avoid re-creating on every render)
  const speechSynthesisRef = React.useRef(window.speechSynthesis);
  const speechSynthesis = speechSynthesisRef.current;
  const recognitionRef = React.useRef(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    return SR ? new SR() : null;
  });
  const recognition = React.useMemo(() => recognitionRef.current(), []);
  const [recognitionTimeout, setRecognitionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Google AI configuration (useRef to avoid re-creating on every render)
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  const genAIRef = React.useRef(
    GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null
  );
  const genAI = genAIRef.current;

  const allSuggestions = [
    "Suggest a quick breathing exercise.",
    "I'm feeling overwhelmed. Can we talk?",
    "I don't know how I feel right now.",
    "Give me tips based on my current stress level.",
    "I just need someone to talk to.",
    "Can you help me deal with anxiety?",
    "What should I do if I feel low?"
  ];

  // Utility function to get random suggestions
  const getRandomSuggestions = () => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  // Initialize suggestions and test API connection
  useEffect(() => {
    setSuggestions(getRandomSuggestions());
    
    // Test Google AI connection
    if (GOOGLE_API_KEY && genAI) {
      console.log('Google AI initialized successfully');
      // Disabled auto-test to save API quota
      // testConnection();
    } else {
      console.warn('Google AI not initialized - missing API key');
    }
    
    // Track session engagement
    trackEngagement('session');
  }, []);
  
  const trackEngagement = async (action: string, data?: any) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('http://localhost:5000/api/user/track-engagement', 
          { action, data },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
    } catch (error) {
      console.error('Error tracking engagement:', error);
    }
  };
  
  const testConnection = async () => {
    try {
      const model = genAI?.getGenerativeModel({ model: "gemini-2.5-flash" });
      if (model) {
        const result = await model.generateContent("Say hello");
        const response = await result.response;
        console.log('Connection test successful:', response.text());
      }
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  // Update suggestions when a message is sent
  useEffect(() => {
    if (messages.length > 1) {
      setSuggestions(getRandomSuggestions());
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Try to find preferred voices in order of preference
      const preferredVoices = [
        'Google US English Female',
        'Google UK English Female',
        'Microsoft Aria Online (Natural)',
        'Microsoft Jenny Online (Natural)',
        'Microsoft Guy Online (Natural)',
        'Samantha',
        'Daniel',
        'Moira'
      ];
      
      const preferredVoice = availableVoices.find(voice => 
        preferredVoices.includes(voice.name)
      ) || availableVoices.find(
        voice => voice.lang.includes('en') && voice.name.includes('Female')
      ) || availableVoices.find(
        voice => voice.lang.includes('en')
      ) || availableVoices[0];
      
      setSelectedVoice(preferredVoice);
    };

    // Load voices when they become available
    if (speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Speech synthesis function
  const speak = (text: string) => {
    if (speechSynthesis && selectedVoice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.volume = 1.0;
      
      // Add slight pauses at punctuation for more natural speech
      const processedText = text.replace(/([.,!?])/g, '$1 ');
      utterance.text = processedText;
      
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (recognition) {
      recognition.continuous = true;  // Keep listening
      recognition.interimResults = true;  // Get interim results
      recognition.lang = 'en-US';

      recognition.onresult = (event: { results: { transcript: string }[][] }) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInput(transcript);
        
        // Reset timeout when we get results
        if (recognitionTimeout) {
          clearTimeout(recognitionTimeout);
        }
        
        // Set new timeout for 3 seconds of silence
        const timeout = setTimeout(() => {
          setIsListening(false);
          recognition.stop();
        }, 3000);
        
        setRecognitionTimeout(timeout);
      };

      recognition.onerror = (event: { error: string }) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (recognitionTimeout) {
          clearTimeout(recognitionTimeout);
          setRecognitionTimeout(null);
        }
      };

      recognition.onend = () => {
        if (isListening) {
          // Restart recognition if it ends while we're still listening
          recognition.start();
        }
      };
    }

    return () => {
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
      }
    };
  }, [recognition, isListening, recognitionTimeout]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        setRecognitionTimeout(null);
      }
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Typewriter effect for bot messages
  const typewriterEffect = (text: string, onComplete: () => void) => {
    let index = 0;
    setIsTyping(true);
    setTypingMessage('');

    // Start speech synthesis immediately
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.volume = 1.0;
    
    // Add slight pauses at punctuation for more natural speech
    const processedText = text.replace(/([.,!?])/g, '$1 ');
    utterance.text = processedText;
    
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);

    const type = () => {
      if (index < text.length) {
        setTypingMessage(prev => prev + text[index]);
        index++;
        setTimeout(type, 30); // Adjust speed here (lower = faster)
      } else {
        setIsTyping(false);
        onComplete();
      }
    };

    type();
  };

  // Crisis detection function
  const detectCrisis = (text: string): boolean => {
    const crisisKeywords = [
      'kill myself', 'suicide', 'end my life', 'want to die', 'better off dead',
      'rope to hang', 'hang myself', 'hanging myself', 'take my life',
      'self harm', 'self-harm', 'hurt myself', 'cut myself', 'overdose',
      'not worth living', 'no reason to live', 'end it all', 'goodbye forever',
      'suicide note', 'final goodbye', 'kill me'
    ];
    
    const lowerText = text.toLowerCase();
    return crisisKeywords.some(keyword => lowerText.includes(keyword));
  };

  const handleSend = async () => {
    if (input.trim() === '') return;

    const userMessage = { text: input, sender: 'user' as const, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentInput = input;
    setInput('');

    try {
      // Check for crisis/self-harm indicators
      if (detectCrisis(currentInput)) {
        const crisisResponse = `I'm deeply concerned about what you've shared, and I want you to know that your life has immeasurable value. What you're feeling right now is incredibly painful, and I can hear that pain in your words. Please know that these feelings, however overwhelming they seem, are temporary—even though I understand they might not feel that way right now.

You deserve support from someone who can truly help. I'm not equipped to provide the immediate, specialized care you need in this moment, but there are compassionate professionals available 24/7 who are trained to help:

**National Crisis Helpline:** 1-800-273-8255 (Available 24/7)
**Crisis Text Line:** Text HOME to 741741
**International Crisis Lines:** findahelpline.com

You are not alone in this. Reaching out takes tremendous courage, and I'm glad you've shared this with me. Please, take that next step and connect with someone who can provide the immediate support you deserve. Your story isn't over, and there are people who want to help you write the next chapter.

If you're in immediate danger, please call emergency services (911) or go to your nearest emergency room. Your safety matters more than anything else.`;

        // Start typewriter effect for crisis response
        setIsTyping(true);
        setTypingMessage('');
        typewriterEffect(crisisResponse, () => {
          const crisisMessage = { text: crisisResponse, sender: 'bot' as const, timestamp: new Date() };
          setMessages(prev => [...prev, crisisMessage]);
        });
        
        setIsLoading(false);
        return; // Exit early, don't proceed with normal AI response
      }
      
      // Get all available API keys
      const primaryKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      const mascotKey = import.meta.env.MASCOT_GEMINI_API_KEY;
      const fallbackKeysStr = import.meta.env.VITE_FALLBACK_API_KEYS || '';
      const fallbackKeys = fallbackKeysStr.split(',').map((k: string) => k.trim()).filter(Boolean);
      
      // Build pool of unique keys
      const allKeys = [...new Set([primaryKey, mascotKey, ...fallbackKeys].filter(Boolean))];
      
      if (allKeys.length === 0) {
        throw new Error('Google AI API key is not configured. Please set VITE_GOOGLE_AI_API_KEY in your environment variables.');
      }
      
      // Prepare the conversation context
      const conversationHistory = messages.map(msg => 
        `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.text}`
      ).join('\n');

      const prompt = `You are Amy, an empathetic and professional AI assistant focused on mental wellness and stress management.

CRITICAL INSTRUCTION: Always respond in the SAME LANGUAGE that the user is using. If they write in Hindi, respond in Hindi. If they write in Spanish, respond in Spanish. If they write in English, respond in English. Match the user's language exactly.

Keep responses short, calming, and supportive (1–3 sentences).

Maintain a gentle, understanding tone, like a compassionate guide.

Avoid medical diagnosis or complex advice—focus on emotional support, reassurance, and simple coping suggestions.

Use plain, non-technical language appropriate for the user's language.

Example scenarios include:
- Someone feeling overwhelmed, anxious, sad, or low on motivation
- A person needing a quick grounding tip or mental reset
- Requests for calming messages or check-ins

Previous conversation:
${conversationHistory}

User: ${currentInput}

Assistant:`;

      let botReply = "I'm here to assist you!";
      let success = false;
      let lastError: any = null;

      // Try hitting the API, rotating through keys if we hit a 429 Rate Limit
      for (const currentKey of allKeys) {
        try {
          const tempGenAI = new GoogleGenerativeAI(currentKey);
          const model = tempGenAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          botReply = response.text() || botReply;
          success = true;
          break; // Key worked, exit the loop
        } catch (err: any) {
          lastError = err;
          // If it's a 429 Too Many Requests, log it and the loop will try the next key
          if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
            console.warn(`API Key rate limited, automatically switching to fallback key...`);
            continue;
          } else {
            // Unrelated error (like bad format), throw it immediately
            throw err;
          }
        }
      }

      if (!success) {
        throw lastError; // All keys failed or final error
      }
      
      // Start typewriter effect immediately
      setIsTyping(true);
      setTypingMessage('');
      typewriterEffect(botReply, () => {
        // Add the message to the chat history only after typewriter effect is complete
        const botMessage = { text: botReply, sender: 'bot' as const, timestamp: new Date() };
        setMessages(prev => [...prev, botMessage]);
      });

    } catch (error: any) {
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });

      let errorMessage = "I apologize, but I'm having trouble connecting right now. Please try again in a moment.";

      if (error.message?.includes('Google AI API key is not configured')) {
        errorMessage = "AI service is not properly configured. Please check the API configuration.";
      } else if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
        errorMessage = "Invalid API key. Please check your Google AI API configuration.";
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = "Access denied. Please check your Google AI API permissions.";
      } else if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
        errorMessage = "We're experiencing uncommonly high traffic right now and all our failover systems are busy. Please take a deep breath and try again in a few minutes.";
      } else if (error.response) {
        console.error("API Error:", error.response.data);
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "The request took too long to complete. Please try again.";
      }

      // Start typewriter effect for error message
      setIsTyping(true);
      setTypingMessage('');
      typewriterEffect(errorMessage, () => {
        const errorBotMessage = { text: errorMessage, sender: 'bot' as const, timestamp: new Date() };
        setMessages(prev => [...prev, errorBotMessage]);
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-stress-gray flex items-center justify-center p-4" style={{
      backgroundImage: 'url("/images/yog.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div className="w-[90%] h-[90vh] max-w-6xl mx-auto">
        <div className="bg-black/60 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 h-full flex flex-col relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-stress-yellow/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-stress-yellow/50 to-transparent" />
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 relative z-10">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Chat with Serenity AI</h1>
              
              <div className="flex items-center space-x-4">
                <select
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = voices.find(v => v.name === e.target.value);
                    if (voice) setSelectedVoice(voice);
                  }}
                  className="px-3 py-1 rounded-full bg-black/40 border border-white/20 text-white focus:outline-none focus:border-stress-yellow"
                  aria-label="Select voice"
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
                <button
                  onClick={isSpeaking ? stopSpeaking : () => speak(messages[messages.length - 1].text)}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                  title={isSpeaking ? "Stop speaking" : "Read last message"}
                >
                  {isSpeaking ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                </button>
              </div>
            </div>
            <p className="text-gray-300 text-center mt-2">
              Your AI companion for mental wellness and stress management
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.sender === 'user'
                      ? 'bg-stress-yellow text-stress-dark'
                      : 'bg-black/40 text-white backdrop-blur-sm'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-black/40 text-white rounded-2xl p-4 backdrop-blur-sm">
                  {typingMessage}
                  <span className="animate-pulse">|</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-black/60 p-6 border-t border-white/10 relative z-10">
            {/* Suggestion Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInput(suggestion);
                    handleSend();
                  }}
                  className="px-4 py-2 rounded-full bg-stress-yellow/20 text-stress-yellow hover:bg-stress-yellow/30 transition-all text-sm whitespace-nowrap backdrop-blur-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isListening}
                  className="w-full px-6 py-3 rounded-full bg-black/40 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-stress-yellow disabled:opacity-50 backdrop-blur-sm"
                  placeholder={isListening ? "Listening... (speak now)" : "Type your message..."}
                />
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-black/40 hover:bg-black/60'
                  }`}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={isLoading || isListening}
                className="bg-stress-yellow text-stress-dark px-6 py-3 rounded-full hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWithPulse;
