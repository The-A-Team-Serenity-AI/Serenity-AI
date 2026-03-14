import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Question {
  id: number;
  text: string;
  category?: string;
}

interface Answer {
  questionId: number;
  questionText: string;
  score: number; // 1-5
}

interface AssessmentResult {
  date: string;
  score: number;
  recommendation: string;
  recommendedTherapies: string[];
  answers: Answer[];
  reasoning: string;
}

// Fixed base questions - these always appear first
const baseQuestions: Question[] = [
  {
    id: 1,
    text: "How are you feeling emotionally right now?",
    category: "emotional_state"
  },
  {
    id: 2,
    text: "How would you rate your energy level today?",
    category: "energy"
  },
  {
    id: 3,
    text: "How well did you sleep last night?",
    category: "sleep"
  },
  {
    id: 4,
    text: "How is your stress level at this moment?",
    category: "stress"
  }
];

const MoodAssessment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>(baseQuestions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ therapies: string[], reasoning: string, moodSummary: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const MIN_QUESTIONS = 10;
  const MAX_QUESTIONS = 15;

  // Helper to get all API keys in a pool
  const getApiKeys = () => {
    const primaryKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    const mascotKey = import.meta.env.MASCOT_GEMINI_API_KEY;
    const fallbackKeysStr = import.meta.env.VITE_FALLBACK_API_KEYS || '';
    const fallbackKeys = fallbackKeysStr.split(',').map((k: string) => k.trim()).filter(Boolean);
    return [...new Set([primaryKey, mascotKey, ...fallbackKeys].filter(Boolean))];
  };

  // Fallback questions if AI generation fails
  const fallbackQuestions = [
    "How well are you able to focus on tasks today?",
    "How satisfied do you feel with your social connections recently?",
    "How would you rate your appetite and eating habits today?",
    "How comfortable are you discussing your feelings with others?",
    "How much control do you feel you have over your daily life?",
    "How often have you felt motivated to do things you enjoy?",
    "How well are you managing your responsibilities right now?",
    "How would you rate your overall sense of hope about the future?",
    "How peaceful does your mind feel at this moment?",
    "How supported do you feel by the people around you?",
    "How satisfied are you with your current coping strategies?"
  ];

  // Generate next question based on previous answers
  const generateNextQuestion = async (previousAnswers: Answer[]) => {
    if (allQuestions.length >= MAX_QUESTIONS) {
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('🔄 Attempting to generate question with AI...', {
        keysAvailable: getApiKeys().length,
        previousAnswers: previousAnswers.length
      });

      const answerContext = previousAnswers.map(a => 
        `Q: ${a.questionText}\nAnswer: ${a.score}/5`
      ).join('\n\n');

      const prompt = `You are a compassionate mental health assessment assistant. Based on the user's previous responses, generate ONE follow-up question to better understand their mental state.

Previous responses:
${answerContext}

Requirements:
- Ask ONE specific, empathetic question
- Keep it concise and clear
- The question should use a 1-5 scale
- Return ONLY the question text, nothing else

Generate the next question:`;

      console.log('📤 Sending request to Gemini API...');
      
      const allKeys = getApiKeys();
      if (allKeys.length === 0) throw new Error('No API keys configured');

      let questionText = '';
      let success = false;
      let lastError: any = null;

      for (const currentKey of allKeys) {
        try {
          const tempGenAI = new GoogleGenerativeAI(currentKey);
          const model = tempGenAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          const result = await model.generateContent(prompt);
          questionText = result.response.text().trim();
          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
            console.warn(`API Key rate limited (Sentiscope Generation), switching to fallback key...`);
            continue;
          }
          throw err;
        }
      }

      if (!success) throw lastError;
      
      console.log('✅ Generated question:', questionText);

      if (questionText && questionText.length > 10 && questionText.length < 200) {
        const newQuestion: Question = {
          id: allQuestions.length + 1,
          text: questionText,
          category: "dynamic"
        };

        setAllQuestions(prev => [...prev, newQuestion]);
        setIsGenerating(false);
        console.log('✨ AI question added successfully');
        return newQuestion;
      } else {
        console.warn('⚠️ Generated question invalid:', questionText);
        throw new Error('Invalid question generated');
      }
    } catch (err) {
      console.error('❌ AI generation failed:', err);
      console.error('Error details:', err instanceof Error ? err.message : 'Unknown error');
      
      // Use fallback question as last resort
      const fallbackIndex = allQuestions.length - 4; // 4 base questions
      if (fallbackIndex >= 0 && fallbackIndex < fallbackQuestions.length) {
        console.log('🔄 Using fallback question #', fallbackIndex);
        const newQuestion: Question = {
          id: allQuestions.length + 1,
          text: fallbackQuestions[fallbackIndex],
          category: "fallback"
        };
        setAllQuestions(prev => [...prev, newQuestion]);
        setError(null); // Clear error since we have a fallback
        setIsGenerating(false);
        return newQuestion;
      }
      
      console.error('🚫 No fallback available');
      setError('Failed to generate follow-up question');
      setIsGenerating(false);
      return null;
    }
  };

  // Pre-generate next question in background
  // FIX: Add a ref to track if we're already generating to prevent infinite loops
  const isGeneratingRef = React.useRef(false);

  useEffect(() => {
    // Only generate if we need more questions and aren't already generating
    const needsMoreQuestions = allQuestions.length < MAX_QUESTIONS;
    const currentQuestionExists = allQuestions[currentQuestion];
    const nextQuestionMissing = !allQuestions[currentQuestion + 1];
    const hasAnswers = answers.length > 0;
    
    if (needsMoreQuestions && currentQuestionExists && nextQuestionMissing && hasAnswers && !isGenerating && !isGeneratingRef.current) {
      // Generate next question in background
      isGeneratingRef.current = true;
      generateNextQuestion(answers).finally(() => {
        isGeneratingRef.current = false;
      });
    }
  }, [answers.length, currentQuestion]);

  // If we landed on a question that doesn't exist, generate it immediately
  useEffect(() => {
    if (!allQuestions[currentQuestion] && !isGenerating && answers.length >= 4 && !isGeneratingRef.current) {
      isGeneratingRef.current = true;
      generateNextQuestion(answers).finally(() => {
        isGeneratingRef.current = false;
      });
    }
  }, [currentQuestion]);

  const handleAnswer = async (score: number) => {
    const currentQ = allQuestions[currentQuestion];
    const newAnswer: Answer = {
      questionId: currentQ.id,
      questionText: currentQ.text,
      score: score
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Check if we should continue or finish
    const shouldFinish = 
      updatedAnswers.length >= MIN_QUESTIONS && 
      (updatedAnswers.length >= MAX_QUESTIONS || allQuestions.length === currentQuestion + 1);

    if (shouldFinish) {
      setShowResults(true);
      setIsAnalyzing(true);
      
      // Analyze answers and get recommendations
      const analysis = await analyzeAndRecommend(updatedAnswers);
      setAnalysisResult(analysis);
      setIsAnalyzing(false);
      
      // Save results with analysis
      await saveAssessmentResult(updatedAnswers, analysis);
    } else {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    }
  };

  const calculateScore = (userAnswers: Answer[]) => {
    const totalScore = userAnswers.reduce((sum, answer) => sum + (answer.score - 1), 0);
    const maxScore = userAnswers.length * 4; // Each question: 0-4 range
    return Math.round((totalScore / maxScore) * 100);
  };

  // Crisis detection
  const detectCrisis = (score: number) => {
    return score < 25;
  };

  // AI-powered personalized therapy recommendations
  const analyzeAndRecommend = async (userAnswers: Answer[]) => {
    try {
      const answerContext = userAnswers.map(a => 
        `${a.questionText} → ${a.score}/5`
      ).join('\n');

      const prompt = `You are an empathetic mental wellness advisor. Analyze these mood assessment responses and provide personalized therapy recommendations.

User's responses:
${answerContext}

Based ONLY on these responses, recommend 2-3 therapy types from this list:
1. Audio Therapy - Music, nature sounds, guided meditation
2. Physical Therapy - Exercise, yoga, breathing exercises  
3. Laughing Therapy - Comedy, humor, lighthearted content
4. Reading Therapy - Books, articles, poetry for emotional processing

Provide your response in this EXACT format:
THERAPIES: [comma-separated list]
REASONING: [2-3 sentences explaining why based on their specific answers]
MOOD_SUMMARY: [1 empathetic sentence about their current state]

Example:
THERAPIES: Audio Therapy, Physical Therapy
REASONING: Your low energy and sleep difficulties suggest physical relaxation techniques could help. Combined with calming audio, this addresses both physical tension and mental restlessness you're experiencing.
MOOD_SUMMARY: You're navigating some challenging moments with stress and energy, but you're taking positive steps by checking in with yourself.

Now analyze:`;

      const allKeys = getApiKeys();
      if (allKeys.length === 0) throw new Error('No API keys configured');

      let responseText = '';
      let success = false;
      let lastError: any = null;

      for (const currentKey of allKeys) {
        try {
          const tempGenAI = new GoogleGenerativeAI(currentKey);
          const model = tempGenAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
          const result = await model.generateContent(prompt);
          responseText = result.response.text();
          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
            console.warn(`API Key rate limited (Sentiscope Analysis), switching to fallback key...`);
            continue;
          }
          throw err;
        }
      }

      if (!success) throw lastError;

      // Parse response
      const therapiesMatch = responseText.match(/THERAPIES:\s*(.+)/);
      const reasoningMatch = responseText.match(/REASONING:\s*(.+?)(?=MOOD_SUMMARY:|$)/s);
      const moodMatch = responseText.match(/MOOD_SUMMARY:\s*(.+)/);

      const therapies = therapiesMatch 
        ? therapiesMatch[1].trim().split(',').map(t => t.trim())
        : ['Audio Therapy', 'Physical Therapy'];

      const reasoning = reasoningMatch 
        ? reasoningMatch[1].trim()
        : 'Based on your responses, these therapies can help improve your emotional well-being.';

      const moodSummary = moodMatch
        ? moodMatch[1].trim()
        : 'You\'re taking an important step by assessing your mental state.';

      return { therapies, reasoning, moodSummary };
    } catch (err) {
      console.error('Error analyzing responses:', err);
      return {
        therapies: ['Audio Therapy', 'Physical Therapy'],
        reasoning: 'Based on your responses, we recommend starting with relaxation techniques.',
        moodSummary: 'Thank you for sharing your current state with us.'
      };
    }
  };

  const saveAssessmentResult = async (userAnswers: Answer[], analysis: { therapies: string[], reasoning: string, moodSummary: string }) => {
    if (!user) return;

    const score = calculateScore(userAnswers);

    const result: AssessmentResult = {
      date: new Date().toISOString(),
      score,
      recommendation: analysis.moodSummary,
      recommendedTherapies: analysis.therapies,
      answers: userAnswers,
      reasoning: analysis.reasoning
    };

    const existingResults = localStorage.getItem(`sentiscope_history_${user.username}`);
    const results: AssessmentResult[] = existingResults ? JSON.parse(existingResults) : [];
    results.push(result);
    localStorage.setItem(`sentiscope_history_${user.username}`, JSON.stringify(results));
    
    // Track engagement - assessment completed
    try {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Tracking Sentiscope completion with score:', score);
        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/user/track-engagement', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            action: 'assessment_complete',
            data: { moodScore: score }
          })
        });
        const result = await response.json();
        console.log('Sentiscope tracking response:', result);
      }
    } catch (error) {
      console.error('Error tracking assessment:', error);
    }
  };

  if (showResults) {
    const score = calculateScore(answers);

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-500/10 backdrop-blur-3xl p-8 rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full">
          <h2 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-lg flex items-center justify-center space-x-3">
            <CheckCircle className="w-10 h-10 text-green-400" />
            <span>Assessment Complete</span>
          </h2>
          
          <div className="space-y-8">
            <div className="text-center">
              <p className="text-white text-lg mb-2">Your Score</p>
              <div className="text-6xl font-bold text-white mb-4 drop-shadow-lg">{score}%</div>
              <div className="w-full bg-white/20 rounded-full h-4">
                <div 
                  className="bg-white h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>

            {detectCrisis(score) && (
              <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 mb-4 flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-red-400 font-bold text-lg mb-2">Immediate Support Available</h3>
                  <p className="text-white/90 mb-3">
                    It seems you're going through a particularly difficult time. Please know that help is available 24/7.
                  </p>
                  <div className="space-y-2 text-white">
                    <p><strong>National Crisis Helpline:</strong> 1-800-273-8255</p>
                    <p><strong>Crisis Text Line:</strong> Text HOME to 741741</p>
                    <p><strong>International:</strong> findahelpline.com</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Loading */}
            {isAnalyzing && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-300" />
                  <p className="text-white/90 text-lg">Analyzing your responses...</p>
                </div>
              </div>
            )}

            {/* Mood Summary */}
            {analysisResult && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-cyan-300 font-semibold mb-2">Your Current State</p>
                <p className="text-white/90 text-lg leading-relaxed">
                  {analysisResult.moodSummary}
                </p>
              </div>
            )}

            {/* Personalized Therapy Recommendations */}
            {analysisResult && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-cyan-300 font-semibold mb-3">Personalized Recommendations</p>
                <p className="text-white/90 mb-4 leading-relaxed">
                  {analysisResult.reasoning}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {analysisResult.therapies.map((therapy, index) => {
                    // Map therapy names to routes
                    const therapyRoutes: { [key: string]: string } = {
                      'Audio Therapy': '/services/audio',
                      'Physical Therapy': '/services/physical',
                      'Laughing Therapy': '/services/laughing',
                      'Reading Therapy': '/services/reading'
                    };
                    
                    // Find matching route (case-insensitive partial match)
                    const route = Object.keys(therapyRoutes).find(key => 
                      therapy.toLowerCase().includes(key.toLowerCase().replace(' therapy', ''))
                    );
                    
                    const therapyRoute = route ? therapyRoutes[route] : '/services';
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          // Save personalized context to localStorage before navigating
                          const therapyContext = {
                            therapy: therapy,
                            score: score,
                            moodSummary: analysisResult.moodSummary,
                            reasoning: analysisResult.reasoning,
                            answers: answers,
                            timestamp: new Date().toISOString()
                          };
                          localStorage.setItem('current_therapy_context', JSON.stringify(therapyContext));
                          navigate(therapyRoute, { state: therapyContext });
                        }}
                        className="bg-cyan-400/10 border border-cyan-400/30 rounded-lg p-4 text-cyan-300 font-medium text-center hover:bg-cyan-400/20 hover:border-cyan-400/50 hover:scale-105 transition-all duration-300 cursor-pointer"
                      >
                        {therapy}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Venting Text Box */}
            <div className="mt-8">
              <p className="text-white text-lg mb-4 text-center">Need to vent? Share your feelings here...</p>
              <textarea
                className="w-full h-32 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 resize-none"
                placeholder="Write whatever's on your mind. This is a safe space to express yourself..."
                onChange={(e) => {
                  // Save to localStorage if needed
                  if (user) {
                    const ventingHistory = localStorage.getItem(`venting_history_${user.username}`) || '[]';
                    const history = JSON.parse(ventingHistory);
                    history.push({
                      date: new Date().toISOString(),
                      text: e.target.value,
                      moodScore: score
                    });
                    localStorage.setItem(`venting_history_${user.username}`, JSON.stringify(history));
                  }
                }}
              />
              <p className="text-white/60 text-sm mt-2 text-center">
                Your thoughts are private and will be saved only on your device.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowResults(false);
                  setCurrentQuestion(0);
                  setAnswers([]);
                  setAllQuestions(baseQuestions);
                  setAnalysisResult(null);
                  setIsAnalyzing(false);
                }}
                className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full hover:bg-white/30 transition-all font-semibold flex items-center space-x-2"
              >
                <span>Take Assessment Again</span>
              </button>
              <button
                onClick={() => navigate('/services')}
                className="bg-cyan-400 text-black px-6 py-3 rounded-full hover:bg-cyan-300 transition-all font-semibold flex items-center space-x-2"
              >
                <span>Explore Therapies</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-500/10 backdrop-blur-3xl p-8 rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white text-lg font-medium">
              Question {currentQuestion + 1} of {Math.max(MIN_QUESTIONS, allQuestions.length)}
            </span>
            <span className="text-white/60 text-sm">
              {currentQuestion < 4 ? 'Base Questions' : 'Personalized Questions'}
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-yellow-300 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestion + 1) / Math.max(MIN_QUESTIONS, allQuestions.length + 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-lg leading-relaxed">
          {allQuestions[currentQuestion]?.text || 'Loading next question...'}
        </h2>

        {/* 1-5 Scale Selector - Only show if question is available */}
        {allQuestions[currentQuestion] && !isGenerating ? (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleAnswer(value)}
                  className="group relative p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1
                    bg-white/5 hover:bg-white/15 border-white/20 hover:border-cyan-300"
                >
                  <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">
                    {value}
                  </div>
                  <div className="text-xs text-white/60 group-hover:text-white/80">
                    {['Very Low', 'Low', 'Moderate', 'High', 'Very High'][value - 1]}
                  </div>
                </button>
              ))}
            </div>

            {/* Scale Labels */}
            <div className="flex justify-between text-white/50 text-sm px-2">
              <span>← Lowest</span>
              <span>Highest →</span>
            </div>
          </div>
        ) : !allQuestions[currentQuestion] && !isGenerating ? (
          <div className="text-center py-8">
            <p className="text-white/60">Please wait while we prepare the next question...</p>
            <button
              onClick={() => generateNextQuestion(answers)}
              className="mt-4 bg-cyan-400 text-black px-6 py-3 rounded-full hover:bg-cyan-300 transition-all font-semibold"
            >
              Generate Question
            </button>
          </div>
        ) : null}

        {/* Loading State */}
        {isGenerating && (
          <div className="mt-6 flex items-center justify-center space-x-2 text-cyan-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating personalized question...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300
              ${currentQuestion === 0 
                ? 'text-white/30 cursor-not-allowed' 
                : 'text-white hover:bg-white/10'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          <span className="text-white/60 text-sm">
            {answers.length < MIN_QUESTIONS 
              ? `${MIN_QUESTIONS - answers.length} more required`
              : 'Almost done!'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MoodAssessment; 