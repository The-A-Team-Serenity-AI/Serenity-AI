import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const TOTAL_FRAMES = 768;
const FRAMES_PER_SECTION = 192; // 8s × 24fps
const FREEZE_RATIO = 0.08; // 8% of each section's scroll = frozen on last frame

// Each section: which frames it spans + parallax text content
const SECTIONS = [
  {
    id: 1,
    startFrame: 1,
    endFrame: 192,
    title: 'Every Mind Starts Young',
    subtitle: 'A developing brain — full of potential, full of vulnerability.',
  },
  {
    id: 2,
    startFrame: 193,
    endFrame: 384,
    title: 'The Weight Builds Silently',
    subtitle: 'Academic pressure. Social media. Isolation. The stress compounds.',
  },
  {
    id: 3,
    startFrame: 385,
    endFrame: 576,
    title: 'Until It Breaks',
    subtitle: 'Aggression. Burnout. Self-harm. The signs were always there.',
  },
  {
    id: 4,
    startFrame: 577,
    endFrame: 768,
    title: 'The Numbers Don\'t Lie',
    subtitle: '1 in 5 youth experience a mental health crisis before age 18.',
  },
];

// Stat overlays that appear at specific scroll points within section 4
const STATS = [
  { text: '46%', sub: 'of teens feel stressed "all the time"', appearAt: 0.15 },
  { text: '70%', sub: 'say anxiety & depression are major problems', appearAt: 0.4 },
  { text: '50%', sub: 'of mental illness begins by age 14', appearAt: 0.65 },
];

// ═══════════════════════════════════════════════════════════════
// Helper: build frame path
// ═══════════════════════════════════════════════════════════════

function framePath(index: number): string {
  const padded = String(index).padStart(4, '0');
  return `/sequence/frame-${padded}.jpg`;
}

// ═══════════════════════════════════════════════════════════════
// IntroPage Component
// ═══════════════════════════════════════════════════════════════

const IntroPage: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // ── Preload images ──
  useEffect(() => {
    let loaded = 0;
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);

    // Load first frame immediately for instant display
    const firstImg = new Image();
    firstImg.src = framePath(1);
    firstImg.onload = () => {
      images[0] = firstImg;
      drawFrame(firstImg);
    };

    // Load all frames
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        loaded++;
        images[i - 1] = img;
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) {
          imagesRef.current = images;
          setIsLoaded(true);
        }
      };
      img.onerror = () => {
        loaded++;
        // Use previous valid frame as fallback
        if (i > 1 && images[i - 2]) {
          images[i - 1] = images[i - 2];
        }
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) {
          imagesRef.current = images;
          setIsLoaded(true);
        }
      };
    }
  }, []);

  // ── Draw a single frame to canvas ──
  const drawFrame = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Cover-fit the image
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (canvasRatio > imgRatio) {
      drawW = canvas.width;
      drawH = canvas.width / imgRatio;
      drawX = 0;
      drawY = (canvas.height - drawH) / 2;
    } else {
      drawH = canvas.height;
      drawW = canvas.height * imgRatio;
      drawX = (canvas.width - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  // ── Scroll handler with freeze zones ──
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container || !isLoaded) return;

      const scrollTop = window.scrollY;
      const scrollHeight = container.scrollHeight - window.innerHeight;
      // Reserve last 12% of scroll for the CTA section (no frames)
      const frameScrollHeight = scrollHeight * 0.88;
      const rawProgress = Math.min(scrollTop / frameScrollHeight, 1);

      setScrollProgress(Math.min(scrollTop / scrollHeight, 1));

      // Map scroll to frame index with freeze zones between sections
      // Each section gets (1/4) of scroll. Within that, the last FREEZE_RATIO
      // portion holds the final frame (1-second freeze effect).
      const numSections = SECTIONS.length;
      const sectionSlice = 1 / numSections; // 0.25 per section
      const sectionIdx = Math.min(Math.floor(rawProgress / sectionSlice), numSections - 1);
      const progressInSection = (rawProgress - sectionIdx * sectionSlice) / sectionSlice;

      let frameIndex: number;
      if (progressInSection > (1 - FREEZE_RATIO)) {
        // In freeze zone — hold the last frame of this section
        frameIndex = SECTIONS[sectionIdx].endFrame - 1; // 0-indexed
      } else {
        // Normal playback within the non-frozen portion
        const playProgress = progressInSection / (1 - FREEZE_RATIO);
        const s = SECTIONS[sectionIdx];
        frameIndex = Math.min(
          (s.startFrame - 1) + Math.floor(playProgress * FRAMES_PER_SECTION),
          s.endFrame - 1 // 0-indexed
        );
      }

      frameIndex = Math.max(0, Math.min(frameIndex, TOTAL_FRAMES - 1));

      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        const img = imagesRef.current[frameIndex];
        if (img) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => drawFrame(img));
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      const img = imagesRef.current[currentFrameRef.current];
      if (img) drawFrame(img);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isLoaded, drawFrame]);

  // ── Calculate section-level data for overlays ──
  const getSectionData = () => {
    const currentFrame = currentFrameRef.current + 1; // 1-indexed
    for (let i = 0; i < SECTIONS.length; i++) {
      const s = SECTIONS[i];
      if (currentFrame >= s.startFrame && currentFrame <= s.endFrame) {
        const progress = (currentFrame - s.startFrame) / (s.endFrame - s.startFrame);
        return { sectionIndex: i, section: s, progress };
      }
    }
    return { sectionIndex: SECTIONS.length - 1, section: SECTIONS[SECTIONS.length - 1], progress: 1 };
  };

  const { sectionIndex, section, progress: sectionProgress } = isLoaded
    ? getSectionData()
    : { sectionIndex: 0, section: SECTIONS[0], progress: 0 };

  // Text visibility: fade in at 15%, hold through 80%, fade out by 92%
  // (the remaining 8% is the freeze zone where text is gone)
  const textOpacity = (() => {
    if (sectionProgress < 0.15) return sectionProgress / 0.15;
    if (sectionProgress > 0.80) return Math.max(0, (0.92 - sectionProgress) / 0.12);
    return 1;
  })();

  // Parallax offset: subtle upward drift (10px range)
  const textY = (1 - sectionProgress) * 20 - 10;

  // Check if we're past the last frame (in CTA zone)
  const isInCTA = scrollProgress > 0.88;

  return (
    <div
      ref={containerRef}
      className="relative bg-black"
      style={{ height: '920vh' }} // Scroll container (15% slower than 800vh)
    >
      {/* ── Loading Screen ── */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          <div className="mb-8">
            <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              SERENITY
            </div>
            <div className="text-white/40 text-center text-sm tracking-[0.3em] mt-2">
              AI
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <div className="text-white/30 text-xs mt-3 font-mono">
            Loading experience — {loadProgress}%
          </div>
        </div>
      )}

      {/* ── Sticky Canvas ── */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full z-0"
        style={{ opacity: isInCTA ? 0 : 1, transition: 'opacity 0.8s ease' }}
      />

      {/* ── Dark Vignette Overlay ── */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%)
          `,
          opacity: isInCTA ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* ── Section Text Overlays ── */}
      {isLoaded && !isInCTA && (
        <div
          className="fixed inset-0 z-[2] flex flex-col items-center justify-end pb-24 pointer-events-none"
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            transition: 'transform 0.1s linear',
          }}
        >
          {/* Section number indicator */}
          <div className="mb-6 flex items-center gap-3">
            {SECTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 rounded-full transition-all duration-500 ${
                  i === sectionIndex
                    ? 'w-8 bg-white'
                    : i < sectionIndex
                      ? 'w-4 bg-white/40'
                      : 'w-4 bg-white/15'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white text-center px-8 mb-4"
            style={{
              textShadow: '0 4px 30px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.5)',
              letterSpacing: '-0.02em',
            }}
          >
            {section.title}
          </h2>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-white/70 text-center max-w-2xl px-8"
            style={{
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            {section.subtitle}
          </p>

          {/* Stats overlay for section 4 */}
          {sectionIndex === 3 && (
            <div className="flex flex-wrap justify-center gap-8 mt-10 px-8">
              {STATS.map((stat, i) => {
                const statOpacity = sectionProgress > stat.appearAt
                  ? Math.min((sectionProgress - stat.appearAt) / 0.15, 1)
                  : 0;
                return (
                  <div
                    key={i}
                    className="text-center"
                    style={{
                      opacity: statOpacity,
                      transform: `translateY(${(1 - statOpacity) * 30}px)`,
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    <div
                      className="text-5xl md:text-6xl font-black bg-gradient-to-b from-red-400 to-orange-500 bg-clip-text text-transparent"
                      style={{ textShadow: '0 0 40px rgba(239,68,68,0.3)' }}
                    >
                      {stat.text}
                    </div>
                    <div className="text-white/60 text-sm mt-1 max-w-[200px]">
                      {stat.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── "What if" Transition Text (appears near end of section 4) ── */}
      {isLoaded && !isInCTA && sectionIndex === 3 && sectionProgress > 0.85 && (
        <div
          className="fixed inset-0 z-[3] flex items-center justify-center pointer-events-none"
          style={{
            opacity: Math.min((sectionProgress - 0.85) / 0.1, 1),
          }}
        >
          <div className="text-center">
            <h2
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white italic"
              style={{
                textShadow: '0 0 60px rgba(34,211,238,0.4), 0 4px 30px rgba(0,0,0,0.8)',
              }}
            >
              What if this could be prevented?
            </h2>
          </div>
        </div>
      )}

      {/* ── CTA Section (after all frames) ── */}
      <div
        className="fixed inset-0 z-[5] flex flex-col items-center justify-center transition-all duration-1000"
        style={{
          opacity: isInCTA ? 1 : 0,
          pointerEvents: isInCTA ? 'auto' : 'none',
          background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #000000 100%)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.4) 0%, rgba(168,85,247,0.2) 50%, transparent 70%)',
          }}
        />

        <div className="relative z-10 text-center px-8">
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6"
            style={{
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            It starts with
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Serenity
            </span>
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-xl mx-auto mb-12">
            An AI-powered mental wellness companion that meets you where you are — and grows with you.
          </p>
          <button
            onClick={() => { window.scrollTo(0, 0); navigate('/'); }}
            className="group relative px-10 py-4 rounded-full text-lg font-bold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 50%, #ec4899 100%)',
              boxShadow: '0 0 40px rgba(34,211,238,0.3), 0 0 80px rgba(168,85,247,0.15)',
            }}
          >
            <span className="relative z-10 text-white tracking-wide">
              Get Started →
            </span>
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 50%, #ec4899 100%)',
                filter: 'blur(20px)',
              }}
            />
          </button>
        </div>

        {/* Scroll-up hint */}
        <div className="absolute bottom-8 text-white/20 text-xs tracking-widest animate-pulse">
          SCROLL UP TO REPLAY
        </div>
      </div>

      {/* ── Scroll Progress Bar ── */}
      {isLoaded && (
        <div className="fixed top-0 left-0 w-full h-[2px] z-[60]">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
            style={{ width: `${scrollProgress * 100}%`, transition: 'width 0.05s linear' }}
          />
        </div>
      )}
    </div>
  );
};

export default IntroPage;
