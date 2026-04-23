import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ShieldAlert, Loader2, Home, Search, PlusSquare, Film, User, BookmarkIcon, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

/* ─── Types ─── */
interface StoredComment {
  id: string;
  postId: string;
  username: string;
  text: string;
  timestamp: number;
  sentiment?: string;
}

interface PostData {
  id: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: StoredComment[];
}

/* ─── Seed Posts ─── */
const SEED_POSTS: PostData[] = [
  {
    id: 'post-1',
    username: 'serenity_wellness',
    avatar: '🧘',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    caption: 'Start each day with a grateful heart. 🌅 #mindfulness #wellness #serenityai',
    likes: 234, liked: false, saved: false, comments: [],
  },
  {
    id: 'post-2',
    username: 'nature_heals',
    avatar: '🌿',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
    caption: 'Nature is the best therapy. Take a walk outside today. 🌳💚 #naturetherapy',
    likes: 512, liked: false, saved: false, comments: [],
  },
  {
    id: 'post-3',
    username: 'amy_mascot',
    avatar: '💖',
    image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=800&q=80',
    caption: "Hi everyone! I'm Amy, your AI wellness companion. Remember: you are enough. ✨",
    likes: 1024, liked: false, saved: false, comments: [],
  },
];

const STORAGE_KEY = 'simugram_posts';
const CURRENT_USER = 'you_user';

/* ─── Helper: load / save ─── */
function loadPosts(): PostData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return SEED_POSTS;
}
function savePosts(posts: PostData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

/* ─── Keyword fallback for negative detection ─── */
const NEGATIVE_KEYWORDS = [
  'hate', 'loser', 'stupid', 'ugly', 'worthless', 'kill', 'die',
  'trash', 'pathetic', 'disgusting', 'terrible', 'worst', 'idiot',
  'dumb', 'useless', 'nobody likes', 'go away', 'shut up', 'piece of',
];

function keywordCheck(text: string): boolean {
  const lower = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some(kw => lower.includes(kw));
}

/* ─── Sentiment Analysis ─── */
async function analyzeSentiment(text: string): Promise<string> {
  // Fast keyword pre-check
  if (keywordCheck(text)) return 'NEGATIVE_AGGRESSIVE';

  const key = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  if (!key) return 'NEUTRAL';
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent(
      `Classify this social media comment as exactly one of: NEGATIVE_AGGRESSIVE, NEUTRAL, POSITIVE.\nComment: "${text}"\nRespond with ONLY the category.`
    );
    const raw = result.response.text().trim().toUpperCase();
    if (raw.includes('NEGATIVE')) return 'NEGATIVE_AGGRESSIVE';
    if (raw.includes('POSITIVE')) return 'POSITIVE';
    return 'NEUTRAL';
  } catch {
    return 'NEUTRAL';
  }
}

/* ─── Component ─── */
const SocialSimulator: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostData[]>(loadPosts);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertComment, setAlertComment] = useState('');
  const [likeAnim, setLikeAnim] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // persist on every change
  useEffect(() => { savePosts(posts); }, [posts]);

  /* ── Like Toggle ── */
  const toggleLike = (postId: string) => {
    setLikeAnim(postId);
    setTimeout(() => setLikeAnim(null), 600);
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  /* ── Double-tap Like ── */
  const lastTap = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const handleDoubleTap = (postId: string) => {
    const now = Date.now();
    if (lastTap.current.id === postId && now - lastTap.current.time < 350) {
      const post = posts.find(p => p.id === postId);
      if (post && !post.liked) toggleLike(postId);
      else setLikeAnim(postId); // still show anim
      setTimeout(() => setLikeAnim(null), 600);
    }
    lastTap.current = { id: postId, time: now };
  };

  /* ── Save Toggle ── */
  const toggleSave = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, saved: !p.saved } : p
    ));
  };

  /* ── Post Comment ── */
  const postComment = async (postId: string) => {
    const text = commentText.trim();
    if (!text) return;

    const newComment: StoredComment = {
      id: `c-${Date.now()}`,
      postId,
      username: CURRENT_USER,
      text,
      timestamp: Date.now(),
    };

    // Add comment optimistically
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
    ));
    setCommentText('');

    // Analyze sentiment
    setAnalyzing(true);
    const sentiment = await analyzeSentiment(text);
    setAnalyzing(false);

    // Update comment with sentiment
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? {
            ...p,
            comments: p.comments.map(c =>
              c.id === newComment.id ? { ...c, sentiment } : c
            ),
          }
        : p
    ));

    if (sentiment === 'NEGATIVE_AGGRESSIVE') {
      setAlertComment(text);
      setShowAlert(true);
      setTimeout(() => {
        navigate('/mascot', {
          state: { safetyContext: true, originalComment: text, sentimentType: 'online_negativity' },
        });
      }, 3500);
    }
  };

  /* ── Time Ago ── */
  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-20">
      {/* ═══ Top Nav ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800 px-4 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold italic font-serif tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
          SimuGram
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> SAFETY ON
          </span>
          <Heart className="w-5 h-5 text-zinc-400" />
          <Send className="w-5 h-5 text-zinc-400" />
        </div>
      </nav>

      {/* ═══ Stories Row ═══ */}
      <div className="flex gap-4 px-4 py-3 overflow-x-auto border-b border-zinc-800 scrollbar-hide">
        {[
          { name: 'Your Story', emoji: '➕', ring: false },
          { name: 'serenity', emoji: '🧘', ring: true },
          { name: 'nature', emoji: '🌿', ring: true },
          { name: 'amy', emoji: '💖', ring: true },
          { name: 'wellness', emoji: '🌸', ring: true },
          { name: 'mindful', emoji: '🧠', ring: true },
        ].map(s => (
          <div key={s.name} className="flex flex-col items-center gap-1 min-w-[64px]">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${s.ring ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]' : 'bg-zinc-800 p-[2px]'}`}>
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                {s.emoji}
              </div>
            </div>
            <span className="text-[11px] text-zinc-400 truncate w-16 text-center">{s.name}</span>
          </div>
        ))}
      </div>

      {/* ═══ Posts Feed ═══ */}
      <div className="max-w-lg mx-auto">
        {posts.map(post => (
          <article key={post.id} className="border-b border-zinc-800 pb-1">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-sm">
                    {post.avatar}
                  </div>
                </div>
                <span className="text-sm font-semibold">{post.username}</span>
              </div>
              <MoreHorizontal className="w-5 h-5 text-zinc-500 cursor-pointer" />
            </div>

            {/* Image */}
            <div
              className="relative aspect-square bg-zinc-900 cursor-pointer select-none"
              onClick={() => handleDoubleTap(post.id)}
            >
              <img src={post.image} alt="post" className="w-full h-full object-cover" loading="lazy" />
              {/* Double-tap heart animation */}
              {likeAnim === post.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" style={{ animation: 'igHeart 0.6s ease-out forwards' }} />
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(post.id)} className="transition-transform active:scale-125">
                  <Heart className={`w-6 h-6 transition-colors ${post.liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                </button>
                <button onClick={() => { setActiveComment(activeComment === post.id ? null : post.id); setTimeout(() => inputRef.current?.focus(), 100); }}>
                  <MessageCircle className="w-6 h-6 text-white" />
                </button>
                <Send className="w-6 h-6 text-white cursor-pointer" />
              </div>
              <button onClick={() => toggleSave(post.id)}>
                <Bookmark className={`w-6 h-6 transition-colors ${post.saved ? 'text-white fill-white' : 'text-white'}`} />
              </button>
            </div>

            {/* Likes */}
            <div className="px-3 text-sm font-semibold">{post.likes.toLocaleString()} likes</div>

            {/* Caption */}
            <div className="px-3 py-1 text-sm">
              <span className="font-semibold mr-1">{post.username}</span>
              {post.caption}
            </div>

            {/* Stored Comments */}
            {post.comments.length > 0 && (
              <div className="px-3 pt-1 space-y-1">
                {post.comments.slice(-3).map(c => (
                  <div key={c.id} className="flex items-start gap-1 text-sm">
                    <span className="font-semibold">{c.username}</span>
                    <span className="text-white/90 flex-1">{c.text}</span>
                    <span className="text-zinc-600 text-[10px] ml-1 flex-shrink-0">{timeAgo(c.timestamp)}</span>
                    {c.sentiment === 'NEGATIVE_AGGRESSIVE' && <span title="Flagged" className="text-red-400 text-[10px]">⚠️</span>}
                  </div>
                ))}
                {post.comments.length > 3 && (
                  <button onClick={() => setActiveComment(post.id)} className="text-zinc-500 text-sm">
                    View all {post.comments.length} comments
                  </button>
                )}
              </div>
            )}

            {/* Comment Input */}
            {activeComment === post.id && (
              <div className="px-3 py-2 flex items-center gap-2 border-t border-zinc-800/50 mt-1">
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs">😊</div>
                <input
                  ref={inputRef}
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') postComment(post.id); }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-600"
                  disabled={analyzing}
                />
                {analyzing ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                ) : (
                  <button
                    onClick={() => postComment(post.id)}
                    disabled={!commentText.trim()}
                    className="text-cyan-400 text-sm font-semibold disabled:text-zinc-700 transition-colors"
                  >
                    Post
                  </button>
                )}
              </div>
            )}

            {/* Inline add comment prompt */}
            {activeComment !== post.id && (
              <button
                onClick={() => { setActiveComment(post.id); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="px-3 py-2 text-sm text-zinc-500"
              >
                Add a comment...
              </button>
            )}
          </article>
        ))}
      </div>

      {/* ═══ Info Banner ═══ */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
          <h3 className="text-cyan-400 font-bold mb-2 flex items-center gap-2 text-sm">
            <ShieldAlert className="w-4 h-4" /> Social Shield — AI Sentiment Protection
          </h3>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Every comment you post is analyzed by Serenity AI in real-time. If negativity or
            aggression is detected, you'll be gently redirected to <strong>Amy</strong> — your AI
            wellness companion — for immediate support. Try posting a negative comment to see it in action.
          </p>
        </div>
      </div>

      {/* ═══ Bottom Nav ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-zinc-800 h-12 flex items-center justify-around px-6">
        <Home className="w-6 h-6 text-white" />
        <Search className="w-6 h-6 text-zinc-500" />
        <PlusSquare className="w-6 h-6 text-zinc-500" />
        <Film className="w-6 h-6 text-zinc-500" />
        <User className="w-6 h-6 text-zinc-500" />
      </nav>

      {/* ═══ Safety Alert Overlay ═══ */}
      {showAlert && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg" style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div className="bg-zinc-900 border-2 border-cyan-400/60 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_0_60px_rgba(34,211,238,0.15)]">
            <div className="w-16 h-16 bg-cyan-400/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-400/30">
              <ShieldAlert className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Safety Protection Active</h2>
            <p className="text-zinc-400 text-sm mb-2 leading-relaxed">
              We detected negativity in your comment. Your mental well-being matters.
            </p>
            <p className="text-zinc-500 text-xs italic mb-5 px-4">"{alertComment}"</p>
            <p className="text-cyan-300 text-sm font-medium mb-4">Redirecting you to Amy for support...</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Animations ═══ */}
      <style>{`
        @keyframes igHeart {
          0%   { transform: scale(0); opacity: 0.9; }
          40%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default SocialSimulator;
