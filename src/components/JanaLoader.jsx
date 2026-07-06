import React, { useState, useEffect, useRef, useMemo } from 'react';

const motivationalTexts = [
  "Tu belleza merece lo mejor ✨",
  "Hoy te mereces brillar 🌸",
  "Cada detalle, perfectamente cuidado 💅",
  "Bienvenida a tu espacio de lujo 🌺",
  "La belleza empieza aquí 💖",
  "Un momento para ti, con amor 🌷",
];

const LOADER_MIN_DURATION_MS = 2500;
const PROGRESS_INTERVAL_MS = 30;
const FADE_OUT_MS = 500;

// Pre-compute random values to avoid re-renders
const GLITTER_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  top: `${10 + (i * 37 % 80)}%`,
  left: `${5 + (i * 53 % 90)}%`,
  delay: `${(i * 0.3) % 4}s`,
  duration: `${2 + (i * 0.4) % 3}s`,
  size: `${3 + (i % 3)}px`,
  color: i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#ffb3c1' : '#e8a0a8',
}));

const PETALS = Array.from({ length: 18 }, (_, i) => {
  const sizeGroup = i % 3; // 0 = small, 1 = medium, 2 = large
  const w = sizeGroup === 0 ? (14 + (i % 4) * 2) : sizeGroup === 1 ? (26 + (i % 3) * 4) : (40 + (i % 3) * 8);
  const h = Math.round(w * 0.65);
  return {
    id: i,
    left: `${(i * 5.6) % 100}%`,
    delay: `${(i * 0.3) % 4}s`,
    duration: `${3.5 + (i * 0.25) % 3}s`,
    width: `${w}px`,
    height: `${h}px`,
  };
});

const JanaLoader = ({ visible }) => {
  const [showLoader, setShowLoader] = useState(visible);
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [fadeText, setFadeText] = useState(true);
  const containerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRef = useRef(null);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Great+Vibes&family=Montserrat:wght@200;400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  // Play subtle chime on mount
  useEffect(() => {
    if (visible) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const playChime = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.06, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          playChime(880, ctx.currentTime, 1.2);
          playChime(1108, ctx.currentTime + 0.15, 1.0);
          playChime(1318, ctx.currentTime + 0.3, 0.9);
        }
      } catch (e) { /* audio blocked, skip silently */ }
    }
  }, [visible]);

  // Progress bar & text rotation
  useEffect(() => {
    if (visible) {
      setShowLoader(true);
      setProgress(0);
      setTextIndex(0);
      startTimeRef.current = Date.now();

      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const steps = LOADER_MIN_DURATION_MS / PROGRESS_INTERVAL_MS;
      let currentStep = 0;

      const progressInterval = setInterval(() => {
        currentStep++;
        setProgress(() => Math.min((currentStep / steps) * 100, 99));
      }, PROGRESS_INTERVAL_MS);

      const textInterval = setInterval(() => {
        setFadeText(false);
        setTimeout(() => {
          setTextIndex(i => (i + 1) % motivationalTexts.length);
          setFadeText(true);
        }, 400);
      }, 2800);

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        clearInterval(progressInterval);
        clearInterval(textInterval);
      };
    }
  }, [visible]);

  // Fade out and unmount
  useEffect(() => {
    if (!visible && showLoader) {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const remaining = Math.max(0, LOADER_MIN_DURATION_MS - elapsed);
      const finishLoading = () => {
        setProgress(100);
        setTimeout(() => setShowLoader(false), FADE_OUT_MS);
      };
      if (remaining > 0) {
        const timeout = setTimeout(finishLoading, remaining);
        return () => clearTimeout(timeout);
      } else {
        finishLoading();
      }
    }
  }, [visible, showLoader]);

  if (!showLoader) return null;

  return (
    <div
      ref={containerRef}
      className="loader-container"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        fontFamily: "'Montserrat', sans-serif",
        overflow: 'hidden',
        backgroundColor: '#fff0f2',
      }}
    >



      {/* Glitter particles */}
      <div className="glitter-container">
        {GLITTER_PARTICLES.map(p => (
          <div
            key={p.id}
            className="glitter-particle"
            style={{
              top: p.top, left: p.left,
              width: p.size, height: p.size,
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Large falling petals */}
      <div className="petals-container">
        {PETALS.map(p => (
          <div
            key={p.id}
            className="falling-petal-wrapper"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          >
            <div
              className="falling-petal"
              style={{
                width: p.width,
                height: p.height,
              }}
            />
          </div>
        ))}
      </div>

      {/* Spinner */}
      <div className="spinner-container">
        <div className="chic-spinner"></div>
      </div>



      {/* Luxury progress line at the very bottom */}
      <div className="luxury-progress-track">
        <div className="luxury-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <style>{`
        .loader-container {
          background-image: url(/fondo_carga.jpeg);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        @media (max-width: 768px) {
          .loader-container {
            background-image: url(/fondo_carga_mobile.jpeg);
          }
        }

        /* --- Glitter --- */
        .glitter-container {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 2; overflow: hidden;
        }
        .glitter-particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0;
          box-shadow: 0 0 4px currentColor, 0 0 8px currentColor;
          animation: glitterFloat ease-in-out infinite;
        }
        @keyframes glitterFloat {
          0%, 100% { transform: translateY(0) scale(0) rotate(0deg); opacity: 0; }
          30% { opacity: 0.9; }
          50% { transform: translateY(-18px) scale(1.2) rotate(180deg); opacity: 0.7; }
          70% { opacity: 0.4; }
        }

        /* --- Petals --- */
        .petals-container {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 5; overflow: hidden;
        }
        .falling-petal-wrapper {
          position: absolute;
          top: -12%;
          transform-origin: center center;
          animation: fallPetal linear infinite;
        }
        .falling-petal {
          background: radial-gradient(ellipse at 30% 30%, rgba(255,180,200,1) 0%, rgba(226,132,149,0.9) 60%, rgba(180,80,106,0.8) 100%);
          border-radius: 60% 10% 60% 40%;
          transform-origin: center center;
          box-shadow: inset 2px -2px 4px rgba(255,255,255,0.5), 0 2px 8px rgba(226,132,149,0.4);
          transition: transform 0.3s ease;
        }
        @keyframes fallPetal {
          0%   { top: -12%; transform: translateX(0) rotate(0deg); opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { top: 105%; transform: translateX(60px) rotate(360deg); opacity: 0; }
        }

        @media (max-width: 768px) {
          .falling-petal {
            transform: scale(0.45); /* Scale down petals by ~55% on mobile */
          }
        }

        /* --- Spinner --- */
        .spinner-container {
          position: absolute; bottom: 8%; left: 0; right: 0;
          display: flex; flex-direction: column; align-items: center;
          z-index: 10;
        }
        @media (max-width: 768px) {
          .spinner-container { bottom: 22% !important; }
        }

        .chic-spinner {
          width: 52px; height: 52px; border-radius: 50%;
          border: 3px solid rgba(255, 182, 193, 0.25);
          border-top: 3px solid #c97282;
          border-right: 3px solid #e8a0a8;
          animation: chicSpin 1.4s ease-in-out infinite;
          box-shadow: 0 0 22px rgba(201,114,130,0.4), inset 0 0 12px rgba(255,182,193,0.1);
        }
        @keyframes chicSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }



        /* --- Luxury progress line --- */
        .luxury-progress-track {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(255, 182, 193, 0.12);
          z-index: 15;
          overflow: visible;
        }
        .luxury-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #fbcada 0%, #e8a0a8 40%, #c97282 70%, #e8a0a8 100%);
          background-size: 200% 100%;
          transition: width 0.12s cubic-bezier(0.4, 0, 0.2, 1);
          animation: progressShimmer 2s linear infinite;
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px rgba(201,114,130,0.5), 0 0 2px rgba(255,182,193,0.8);
        }
        @keyframes progressShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default JanaLoader;
