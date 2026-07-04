import React, { useState, useEffect, useRef } from 'react';

const loadingTexts = [
  "Afilando navajas estelares...",
  "Calibrando tijeras de alta precisión...",
  "Preparando la espuma perfecta...",
  "Calculando el desvanecido ideal...",
  "Encendiendo las luces de la estación...",
  "Cargando la Astro Experience..."
];

const LOADER_MIN_DURATION_MS = 1200;
const PROGRESS_INTERVAL_MS = 40;
const FADE_OUT_MS = 350;

const AstroLoader = ({ visible }) => {
  const [showLoader, setShowLoader] = useState(visible);
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const startTimeRef = useRef(null);
  const particleThrottleRef = useRef(0);

  const shouldUseParticles = () => {
    if (typeof window === 'undefined') return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    return !reducedMotion && !coarsePointer && window.innerWidth >= 768;
  };

  // Initialize showLoader and animate progress towards 99%
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

      const textInterval = setInterval(() => {
        setTextIndex(i => (i + 1) % loadingTexts.length);
      }, 1400);

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

  // 3D Tilt Effect and Particle Emitter
  useEffect(() => {
    if (!visible || !shouldUseParticles()) return;

    const handleMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const tiltX = (y - centerY) / centerY * -8;
      const tiltY = (x - centerX) / centerX * 8;
      setTilt({ x: tiltX, y: tiltY });

      const now = Date.now();
      if (now - particleThrottleRef.current > 55) {
        particleThrottleRef.current = now;
        createParticles(x, y, 2);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [visible]);

  // High performance Canvas Particle System
  const particlesRef = useRef([]);
  const createParticles = (x, y, count = 2) => {
    if (!canvasRef.current) return;
    const colors = [
      'rgba(212, 175, 55, 0.95)', // Gold
      'rgba(249, 217, 118, 0.9)',  // Soft Gold
      'rgba(255, 255, 255, 0.85)', // Magic White Sparkle
      'rgba(186, 140, 28, 0.7)'    // Dark Gold
    ];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 0.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1,
        vy: Math.sin(angle) * speed - (Math.random() * 2), // upward bias
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3.2 + 0.8,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008,
        gravity: 0.07,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  };

  // Canvas loop
  useEffect(() => {
    if (!visible || !shouldUseParticles()) return;
    let animationFrameId;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.alpha <= 0 || p.x < 0 || p.x > canvas.width || p.y > canvas.height) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Glow effect
        ctx.shadowBlur = p.size * 2.5;
        ctx.shadowColor = p.color;
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        
        // Draw star-shaped sparkles for extra magic
        ctx.beginPath();
        const spikes = 4;
        const outerRadius = p.size;
        const innerRadius = p.size / 2.2;
        let rot = Math.PI / 2 * 3;
        let x = 0;
        let y = 0;
        const step = Math.PI / spikes;

        ctx.moveTo(0, -outerRadius);
        for (let j = 0; j < spikes; j++) {
          x = Math.cos(rot) * outerRadius;
          y = Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = Math.cos(rot) * innerRadius;
          y = Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(0, -outerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [visible]);

  if (!showLoader) return null;

  return (
    <div 
      ref={containerRef}
      className="astro-loader-container" 
      style={{ 
        opacity: visible ? 1 : 0, 
        pointerEvents: visible ? 'all' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px',
        backgroundColor: '#050505',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        transition: `opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      }}
    >
      {/* Interactive canvas behind elements */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          pointerEvents: 'none', 
          zIndex: 1 
        }} 
      />

      {/* Interactive SVG Scissors container with 3D tilt */}
      <div 
        style={{
          zIndex: 2,
          perspective: '1000px',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)'
        }}
      >
        <div className="neon-scissors-glow">
          {/* Custom SVG Neon outline of scissors */}
          <svg 
            width="120" 
            height="120" 
            viewBox="0 0 100 100" 
            fill="none" 
            stroke="url(#neonGoldGrad)" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="neon-scissors-svg"
          >
            <defs>
              <linearGradient id="neonGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9d976" />
                <stop offset="50%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#b5891b" />
              </linearGradient>
            </defs>
            {/* Left Ring handle */}
            <circle cx="32" cy="72" r="12" className="neon-stroke-draw" style={{ animationDelay: '0s' }} />
            {/* Right Ring handle */}
            <circle cx="68" cy="72" r="12" className="neon-stroke-draw" style={{ animationDelay: '0.1s' }} />
            {/* Blades cross & pivots */}
            <line x1="32" y1="60" x2="68" y2="20" className="neon-stroke-draw" style={{ animationDelay: '0.2s' }} />
            <line x1="68" y1="60" x2="32" y2="20" className="neon-stroke-draw" style={{ animationDelay: '0.3s' }} />
            <circle cx="50" cy="40" r="2" fill="#d4af37" />
          </svg>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '280px', gap: '12px', zIndex: 2 }}>
        <div className="loader-title-neon" style={{ fontSize: '18px', letterSpacing: '4px', textAlign: 'center', fontWeight: '950', color: 'white', textTransform: 'uppercase' }}>
          ASTRO EXPERIENCE
        </div>
        
        {/* Dynamic Text */}
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--text-secondary)', 
          fontWeight: '600', 
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          height: '18px',
          transition: 'opacity 0.3s ease',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }}>
          {loadingTexts[textIndex]}
        </div>

        {/* Progress Bar Container */}
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {/* Golden Progress Fill */}
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #d4af37, #f9d976, #d4af37)',
            width: `${progress}%`,
            transition: 'width 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(212, 175, 55, 0.8)'
          }} />
        </div>
        
        {/* Percentage Text */}
        <div style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900', alignSelf: 'flex-end', letterSpacing: '0.5px' }}>
          {Math.round(progress)}%
        </div>
      </div>
      
      {/* Background glow behind scissors */}
      <div style={{
        position: 'absolute',
        width: '550px',
        height: '550px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 40%, transparent 75%)',
        zIndex: -1,
        filter: 'blur(100px)',
        pointerEvents: 'none'
      }} />

      <style>{`
        /* Self drawing strokes */
        .neon-stroke-draw {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: selfDraw 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards, neonPulse 3s ease-in-out infinite 1.2s;
        }

        @keyframes selfDraw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes neonPulse {
          0%, 100% {
            filter: drop-shadow(0 0 1px rgba(212, 175, 55, 0.5)) drop-shadow(0 0 4px rgba(212, 175, 55, 0.3));
            opacity: 0.9;
          }
          50% {
            filter: drop-shadow(0 0 3px rgba(212, 175, 55, 0.9)) drop-shadow(0 0 8px rgba(212, 175, 55, 0.6));
            opacity: 1;
          }
        }

        .neon-scissors-glow {
          filter: drop-shadow(0 0 8px rgba(212,175,55,0.4));
          animation: rotateGlow 12s linear infinite;
        }

        @keyframes rotateGlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loader-title-neon {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(212, 175, 55, 0.2);
        }
      `}</style>
    </div>
  );
};

export default AstroLoader;
