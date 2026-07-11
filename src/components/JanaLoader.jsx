import React, { useState, useEffect, useRef } from 'react';

const LOADER_MIN_DURATION_MS = 1500; // slightly longer to appreciate the luxury load
const PROGRESS_INTERVAL_MS = 25;
const FADE_OUT_MS = 600;

// Pre-compute random values for background glitter particles
const GLITTER_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  top: `${15 + (i * 37 % 70)}%`,
  left: `${5 + (i * 53 % 90)}%`,
  delay: `${(i * 0.3) % 4}s`,
  duration: `${3 + (i * 0.4) % 3}s`,
  size: `${2 + (i % 3)}px`,
  color: i % 2 === 0 ? '#e8a0a8' : '#d4a39b',
}));

const JanaLoader = ({ visible }) => {
  const [showLoader, setShowLoader] = useState(visible);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Remove static HTML splash screen only when React loader is fully visible
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        const splash = document.getElementById('splash-loader');
        if (splash) {
          splash.style.transition = 'opacity 0.4s ease';
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 400);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Play subtle luxury chime on mount
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
            gain.gain.linearRampToValueAtTime(0.04, startTime + 0.05);
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

  // Progress bar management
  useEffect(() => {
    if (visible) {
      window.isJanaLoaderVisible = true;
      setShowLoader(true);
      setProgress(0);
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

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
        clearInterval(progressInterval);
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
        setTimeout(() => {
          setShowLoader(false);
          window.isJanaLoaderVisible = false;
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

  // Texto secundario dinámico según el progreso para un toque premium
  const getSubtitle = () => {
    if (progress < 30) return "Cargando citas, clientes y servicios...";
    if (progress < 60) return "Conectando con la base de datos segura...";
    if (progress < 85) return "Configurando diseño y elementos personalizados...";
    return "Preparando tu espacio de lujo...";
  };

  if (!showLoader) return null;

  return (
    <div
      ref={containerRef}
      className={`loader-container ${visible ? 'loader-entering' : 'loader-exiting'}`}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Glitter background particles */}
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

      {/* Main loading content block */}
      <div className="loader-content">
        {/* Rose Gold Logo */}
        <div className="loader-logo-wrapper">
          <img src="/logo.webp" alt="Jana Studio" className="loader-logo" />
        </div>

        {/* Custom Rose Gold Spinner */}
        <div className="loader-spinner-wrapper">
          <div className="rose-gold-spinner"></div>
        </div>

        {/* Elegant typography */}
        <div className="loader-info-wrapper">
          <h2 className="loader-title">Preparando tu experiencia...</h2>
          <p className="loader-subtitle">{getSubtitle()}</p>
        </div>

        {/* Progress row (track + percentage) */}
        <div className="loader-progress-row">
          <div className="custom-progress-track">
            <div className="custom-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="loader-percent">{Math.round(progress)}%</span>
        </div>

        {/* Luxury Footer */}
        <div className="loader-footer">
          <div className="loader-heart-icon">♡</div>
          <p className="loader-slogan">Empodera tu confianza. Eleva tu belleza.</p>
        </div>
      </div>

      <style>{`
        /* Container background & responsive backgrounds */
        .loader-container {
          background-image: url(/fondo_carga.png);
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-color: #f7ebe6; /* Fallback luxury color */
        }

        @media (max-width: 768px), (orientation: portrait) and (max-width: 1366px) {
          .loader-container {
            background-image: url(/fondo_carga_mobile.png);
          }
        }

        /* --- Glitter Background --- */
        .glitter-container {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 1; overflow: hidden;
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
          30% { opacity: 0.6; }
          50% { transform: translateY(-12px) scale(1.1) rotate(180deg); opacity: 0.4; }
          70% { opacity: 0.2; }
        }

        /* --- Content Layout --- */
        .loader-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 90%;
          max-width: 600px;
          text-align: center;
          padding: 20px;
        }

        /* --- Logo Styling --- */
        .loader-logo-wrapper {
          margin-bottom: 25px;
        }
        .loader-logo {
          width: 280px;
          max-width: 80%;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 4px 10px rgba(122, 88, 83, 0.08));
        }
        @media (max-width: 768px), (orientation: portrait) and (max-width: 1366px) {
          .loader-logo {
            width: 220px;
          }
        }

        /* --- Spinner --- */
        .loader-spinner-wrapper {
          margin-bottom: 30px;
          display: flex;
          justify-content: center;
        }
        .rose-gold-spinner {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 3.5px solid rgba(179, 130, 121, 0.15);
          border-top: 3.5px solid #b38279;
          animation: luxurySpin 1.2s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
          box-shadow: 0 0 15px rgba(179, 130, 121, 0.2);
        }
        @keyframes luxurySpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* --- Typography --- */
        .loader-info-wrapper {
          margin-bottom: 25px;
        }
        .loader-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 21px;
          font-weight: 500;
          color: #7a5853;
          margin: 0 0 8px 0;
          letter-spacing: 0.02em;
          text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
        }
        .loader-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: #9e7f7b;
          margin: 0;
          letter-spacing: 0.03em;
        }
        @media (max-width: 480px) {
          .loader-title {
            font-size: 18px;
          }
          .loader-subtitle {
            font-size: 12px;
          }
        }

        /* --- Progress Row --- */
        .loader-progress-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          width: 100%;
          max-width: 320px;
          margin-bottom: 70px;
          animation: luxurySlideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
        }
        .custom-progress-track {
          flex: 1;
          height: 3px;
          background: rgba(122, 88, 83, 0.12);
          border-radius: 10px;
          overflow: hidden;
        }
        .custom-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #d4a39b, #b38279, #d4a39b);
          background-size: 200% 100%;
          border-radius: 10px;
          transition: width 0.1s linear;
          animation: shimmerGlow 2.5s linear infinite;
        }
        .loader-percent {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px;
          font-style: italic;
          color: #7a5853;
          min-width: 32px;
          text-align: right;
        }
        @keyframes shimmerGlow {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* --- Footer --- */
        .loader-footer {
          position: absolute;
          bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          animation: fadeInScale 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }
        @media (max-height: 600px) {
          .loader-footer {
            position: relative;
            bottom: auto;
            margin-top: 20px;
          }
          .loader-progress-row {
            margin-bottom: 30px;
          }
        }
        .loader-heart-icon {
          color: #b38279;
          font-size: 16px;
          animation: heartbeat 2s ease-in-out infinite;
        }
        .loader-slogan {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 13px;
          font-style: italic;
          color: #7a5853;
          margin: 0;
          letter-spacing: 0.05em;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.4);
          padding: 6px 16px;
          border-radius: 20px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        /* --- Entry Animations --- */
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes luxurySlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes luxuryScaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }

        /* --- Exit Animations --- */
        .loader-exiting .loader-logo-wrapper {
          animation: luxurySlideUpOut 0.5s cubic-bezier(0.4, 0, 1, 1) forwards !important;
        }
        .loader-exiting .loader-spinner-wrapper {
          animation: luxuryScaleOut 0.5s cubic-bezier(0.4, 0, 1, 1) forwards !important;
        }
        .loader-exiting .loader-info-wrapper {
          animation: luxurySlideDownOut 0.5s cubic-bezier(0.4, 0, 1, 1) forwards !important;
        }
        .loader-exiting .loader-progress-row {
          animation: luxuryScaleOut 0.5s cubic-bezier(0.4, 0, 1, 1) forwards !important;
        }
        .loader-exiting .loader-footer {
          animation: luxurySlideDownOut 0.5s cubic-bezier(0.4, 0, 1, 1) forwards !important;
        }

        @keyframes luxurySlideUpOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-24px); }
        }
        @keyframes luxurySlideDownOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(24px); }
        }
        @keyframes luxuryScaleOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};

export default JanaLoader;
