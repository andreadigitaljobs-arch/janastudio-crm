import React, { useState, useEffect, useRef } from 'react';

const loadingTexts = [
  "Preparando tu experiencia de belleza...",
  "Cuidando cada detalle para ti...",
  "Calibrando destellos de alta frecuencia...",
  "Preparando el espacio perfecto...",
  "Revelando tu brillo natural...",
  "Cargando Jana Experience..."
];

const LOADER_MIN_DURATION_MS = 2500;
const PROGRESS_INTERVAL_MS = 30;
const FADE_OUT_MS = 500;

const AstroLoader = ({ visible }) => {
  const [showLoader, setShowLoader] = useState(visible);
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const containerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [fadeText, setFadeText] = useState(true);

  // Dynamically load luxury google fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Great+Vibes&family=Montserrat:wght@200;400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      try {
        document.head.removeChild(link);
      } catch (e) {}
    };
  }, []);

  // Initialize progress and text transitions
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
        setProgress(() => {
          const target = (currentStep / steps) * 100;
          return Math.min(target, 99);
        });
      }, PROGRESS_INTERVAL_MS);

      // Smooth text transition
      const textInterval = setInterval(() => {
        setFadeText(false);
        setTimeout(() => {
          setTextIndex(i => (i + 1) % loadingTexts.length);
          setFadeText(true);
        }, 300);
      }, 2500);

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        clearInterval(progressInterval);
        clearInterval(textInterval);
      };
    }
  }, [visible]);

  // Handle minimum duration and unmount after fade-out transition
  useEffect(() => {
    if (!visible && showLoader) {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const remaining = Math.max(0, LOADER_MIN_DURATION_MS - elapsed);

      const finishLoading = () => {
        setProgress(100);
        setTimeout(() => {
          setShowLoader(false);
        }, FADE_OUT_MS);
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff5f6', // Fallback color
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      {/* Sparkles Ambient Animation */}
      <div className="luxury-stars-container">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i} 
            className="floating-sparkle" 
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 3 + 2}s`
            }}
          />
        ))}
      </div>

      {/* Floating flower petals */}
      <div className="petals-container">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i} 
            className="falling-petal" 
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 6 + 6}s`,
              transform: `scale(${Math.random() * 0.5 + 0.5})`
            }}
          />
        ))}
      </div>

      {/* Central Loading Spinner */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 10 }}>
        <div className="emblem-glow">
          <div className="rose-gold-spinner"></div>
        </div>
      </div>

      {/* Styles for Luxury Animations */}
      <style>{`
        .emblem-glow {
          filter: drop-shadow(0 4px 10px rgba(226, 132, 149, 0.15));
          animation: scalePulse 4s ease-in-out infinite;
        }

        .rose-gold-spinner {
          width: 80px;
          height: 80px;
          border: 4px solid rgba(180, 120, 120, 0.2); /* light rose gold track */
          border-top-color: #b47878; /* solid rose gold */
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes scalePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 10px rgba(226, 132, 149, 0.1)); }
          50% { transform: scale(1.03); filter: drop-shadow(0 8px 18px rgba(226, 132, 149, 0.25)); }
        }

        /* Floating Sparkles */
        .luxury-stars-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .floating-sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #ffd700;
          box-shadow: 0 0 4px #ffd700, 0 0 8px #ffb3c1;
          opacity: 0;
          animation: floatSparkle ease-in-out infinite;
        }

        @keyframes floatSparkle {
          0%, 100% { transform: translateY(0) scale(0); opacity: 0; }
          50% { opacity: 0.6; transform: translateY(-12px) scale(1); }
        }

        /* Falling Petals */
        .petals-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          overflow: hidden;
        }

        .falling-petal {
          position: absolute;
          top: -10%;
          width: 14px;
          height: 9px;
          background: radial-gradient(circle, #ffcbd5 0%, #e28495 100%);
          border-radius: 12px 2px 12px 10px;
          opacity: 0;
          transform-origin: center;
          animation: fallPetal linear infinite;
          box-shadow: inset 1px -1px 2px rgba(255,255,255,0.4);
        }

        @keyframes fallPetal {
          0% {
            top: -5%;
            transform: translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            top: 105%;
            transform: translateX(40px) rotate(360deg);
            opacity: 0;
          }
        }

        .brand-title {
          text-shadow: 0 2px 4px rgba(92, 36, 47, 0.05);
        }

        .loader-container {
          background-image: url(/fondo_carga.png);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        @media (max-width: 768px) {
          .loader-container {
            background-image: url(/fondo_carga_mobile.png);
          }
        }
      `}</style>
    </div>
  );
};

export default AstroLoader;
