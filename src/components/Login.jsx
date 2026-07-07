import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight, CalendarHeart, Sparkles, Scissors, SlidersHorizontal, X } from 'lucide-react';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted]   = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [cardRadius, setCardRadius] = useState(36);
  const [logoTaps, setLogoTaps] = useState(0);
  const tapTimer = useRef(null);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const formRef = useRef(null);

  const images = [
    '/login_bg2.webp',
    '/login_bg1.webp',
    '/login_bg3.webp'
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  const [config] = useState({
    0: { x: 60, y: 55, z: 110 },
    1: { x: 70, y: 50, z: 105 },
    2: { x: 10, y: 45, z: 115 }
  });

  const { login } = useAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    setTimeout(() => setMounted(true), 100);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const nextImage = new Image();
    nextImage.src = images[(activeIndex + 1) % images.length];
  }, [activeIndex]);

  useEffect(() => {
    if (isMobile && emailRef.current) {
      const handleFocus = () => {
        setTimeout(() => {
          emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      };
      const input = emailRef.current;
      input?.addEventListener('focus', handleFocus);
      return () => input?.removeEventListener('focus', handleFocus);
    }
  }, [isMobile]);

  useEffect(() => {
    document.documentElement.style.setProperty('--login-radius', `${cardRadius}px`);
  }, [cardRadius]);

  const handleLogoTap = useCallback(() => {
    setLogoTaps(prev => {
      const next = prev + 1;
      clearTimeout(tapTimer.current);
      if (next >= 5) {
        setShowSettings(s => !s);
        return 0;
      }
      tapTimer.current = setTimeout(() => setLogoTaps(0), 1500);
      return next;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result && !result.success) {
        setError(result.message || 'Credenciales incorrectas');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
      setLoading(false);
    }
  };

  const handleRipple = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.className = 'salon-ripple';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const decorativeIcons = [
    { icon: <CalendarHeart size={isMobile ? 18 : 20} strokeWidth={1.4} />, label: 'Agenda inteligente', sub: 'Organiza tus citas' },
    { icon: <Sparkles size={isMobile ? 18 : 20} strokeWidth={1.4} />, label: 'Control total', sub: 'Inventario y finanzas' },
    { icon: <Scissors size={isMobile ? 18 : 20} strokeWidth={1.4} />, label: 'Más clientes', sub: 'Fideliza y crece' },
  ];

  const activeImage = images[activeIndex];
  const activeImageConfig = config[activeIndex] || { x: 50, y: 50, z: 100 };

  return (
    <div className="salon-login-outer">
      {/* Decorative leaf top-right */}
      <svg className="salon-login-leaf" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M180 10 C160 30, 140 20, 120 50 C100 80, 110 90, 90 120 C80 135, 70 140, 60 155" stroke="rgba(196,139,159,0.35)" strokeWidth="1.5" fill="none"/>
        <path d="M175 5 C155 25, 150 15, 130 40 C115 60, 125 75, 105 105 C95 120, 85 130, 75 145" stroke="rgba(196,139,159,0.25)" strokeWidth="1.2" fill="none"/>
        <path d="M190 15 C170 35, 145 25, 125 55 C110 75, 115 95, 95 125 C85 140, 75 150, 65 165" stroke="rgba(196,139,159,0.3)" strokeWidth="1" fill="none"/>
        <ellipse cx="90" cy="120" rx="20" ry="9" transform="rotate(-35 90 120)" fill="rgba(196,139,159,0.08)"/>
        <ellipse cx="110" cy="90" rx="17" ry="7" transform="rotate(-40 110 90)" fill="rgba(196,139,159,0.06)"/>
        <ellipse cx="130" cy="60" rx="14" ry="6" transform="rotate(-45 130 60)" fill="rgba(196,139,159,0.06)"/>
      </svg>
      <div className="salon-login-container">

        {/* ── SECCIÓN IZQUIERDA: Carrusel de fotos ── */}
        <div className="salon-login-left">
          <div className="salon-semicircle-border">
            <div className="salon-semicircle-content" style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div
                key={activeImage}
                className="salon-semicircle-image"
                style={{
                  backgroundImage: `url(${activeImage})`,
                  backgroundPosition: `${activeImageConfig.x}% ${activeImageConfig.y}%`,
                  backgroundSize: `${activeImageConfig.z}%`,
                  position: 'absolute',
                  inset: 0,
                  opacity: 1,
                  transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 2
                }}
              />
              <div className="salon-photo-overlay" />
            </div>
          </div>
        </div>

        {/* ── SECCIÓN DERECHA: Formulario flotante ── */}
        <div className="salon-login-right">
          {/* Decorative flower bottom-right */}
          <svg className="salon-login-flower" viewBox="0 0 180 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M150 220 C140 190, 120 200, 110 170 C100 140, 80 150, 70 120 C65 105, 55 95, 45 80" stroke="rgba(196,139,159,0.35)" strokeWidth="1.5" fill="none"/>
            <path d="M140 210 C130 185, 115 195, 105 165 C95 135, 75 145, 65 115 C60 100, 50 90, 40 75" stroke="rgba(196,139,159,0.25)" strokeWidth="1.2" fill="none"/>
            <path d="M160 215 C150 195, 125 205, 115 175 C105 145, 85 155, 75 125 C70 110, 60 100, 50 85" stroke="rgba(196,139,159,0.2)" strokeWidth="1" fill="none"/>
            {/* Flower petals */}
            <ellipse cx="45" cy="80" rx="16" ry="26" transform="rotate(-15 45 80)" fill="rgba(196,139,159,0.06)" stroke="rgba(196,139,159,0.2)" strokeWidth="0.8"/>
            <ellipse cx="36" cy="72" rx="14" ry="22" transform="rotate(-40 36 72)" fill="rgba(196,139,159,0.05)" stroke="rgba(196,139,159,0.18)" strokeWidth="0.7"/>
            <ellipse cx="54" cy="74" rx="13" ry="20" transform="rotate(15 54 74)" fill="rgba(196,139,159,0.05)" stroke="rgba(196,139,159,0.18)" strokeWidth="0.7"/>
            <ellipse cx="42" cy="65" rx="12" ry="18" transform="rotate(-55 42 65)" fill="rgba(196,139,159,0.04)" stroke="rgba(196,139,159,0.15)" strokeWidth="0.6"/>
            <ellipse cx="50" cy="66" rx="11" ry="16" transform="rotate(30 50 66)" fill="rgba(196,139,159,0.04)" stroke="rgba(196,139,159,0.15)" strokeWidth="0.6"/>
            {/* Small leaves along stem */}
            <ellipse cx="85" cy="130" rx="10" ry="16" transform="rotate(-30 85 130)" fill="rgba(196,139,159,0.05)" stroke="rgba(196,139,159,0.15)" strokeWidth="0.6"/>
            <ellipse cx="105" cy="165" rx="9" ry="14" transform="rotate(-25 105 165)" fill="rgba(196,139,159,0.05)" stroke="rgba(196,139,159,0.15)" strokeWidth="0.6"/>
          </svg>
          <div className={`salon-login-form-wrapper ${mounted ? 'salon-form-mounted' : ''}`}>

            {/* Logo */}
            <div className="salon-logo-header salon-stagger-1" onClick={handleLogoTap} style={{ cursor: 'pointer' }}>
              <img
                src="/logo.webp"
                alt="Jana Studio Eyelashes & Brows"
                className="salon-logo-image"
              />
            </div>

            {/* Panel de ajustes de radio (oculto) */}
            {showSettings && (
              <div className="salon-settings-panel">
                <div className="salon-settings-header">
                  <SlidersHorizontal size={14} />
                  <span>Ajustar forma de tarjeta</span>
                  <button onClick={() => setShowSettings(false)} className="salon-settings-close">
                    <X size={14} />
                  </button>
                </div>
                <div className="salon-settings-row">
                  <span className="salon-settings-label">Radio: {cardRadius}px</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cardRadius}
                    onChange={(e) => setCardRadius(Number(e.target.value))}
                    className="salon-settings-slider"
                  />
                  <div className="salon-settings-presets">
                    <button onClick={() => setCardRadius(0)} className={cardRadius === 0 ? 'active' : ''}>0</button>
                    <button onClick={() => setCardRadius(24)} className={cardRadius === 24 ? 'active' : ''}>24</button>
                    <button onClick={() => setCardRadius(48)} className={cardRadius === 48 ? 'active' : ''}>48</button>
                    <button onClick={() => setCardRadius(72)} className={cardRadius === 72 ? 'active' : ''}>72</button>
                    <button onClick={() => setCardRadius(100)} className={cardRadius === 100 ? 'active' : ''}>100</button>
                  </div>
                </div>
              </div>
            )}

            {/* Encabezado */}
            <div className="salon-form-header salon-stagger-2">
              <h3 className="salon-form-title">
                Bienvenida de nuevo <span className="salon-heart-icon">♡</span>
              </h3>
              <p className="salon-form-subtitle">
                Inicia sesión para continuar con elegancia.
              </p>
            </div>

            {error && (
              <div className="salon-error-banner salon-shake">
                {error}
              </div>
            )}

            {/* Formulario */}
            <form ref={formRef} onSubmit={handleSubmit} className="salon-main-form salon-stagger-3" autoComplete="on">

              {/* Correo Electrónico */}
              <div className="salon-input-group">
                <label htmlFor="login-email" className="salon-field-label">Correo electrónico</label>
                <div className={`salon-field-container ${email ? 'has-value' : ''} ${isMobile ? '' : 'salon-field-hover'}`}>
                  <span className="salon-field-icon"><User size={18} strokeWidth={1.5} /></span>
                  <input
                    ref={emailRef}
                    type="email"
                    className="salon-field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    autoComplete="email"
                    required
                    id="login-email"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="salon-input-group">
                <label htmlFor="login-password" className="salon-field-label">Contraseña</label>
                <div className={`salon-field-container ${password ? 'has-value' : ''} ${isMobile ? '' : 'salon-field-hover'}`}>
                  <span className="salon-field-icon"><Lock size={18} strokeWidth={1.5} /></span>
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    className="salon-field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                    id="login-password"
                  />
                  <button
                    type="button"
                    className="salon-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {/* Botón de envío con ripple */}
              <button
                type="submit"
                className="salon-submit-button"
                disabled={loading}
                onClick={handleRipple}
              >
                {loading ? (
                  <span className="salon-loading-content">
                    <span className="salon-spinner-premium"></span>
                    <span>Iniciando sesión...</span>
                  </span>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight size={18} className="salon-submit-arrow" />
                  </>
                )}
              </button>

            </form>

            {/* Iconos decorativos */}
            <div className="salon-decorative-section salon-stagger-4">
              {decorativeIcons.map((item, i) => (
                <div key={i} className="salon-decorative-item">
                  <div className="salon-decorative-icon-wrapper">
                    {item.icon}
                  </div>
                  <div className="salon-decorative-text">
                    <div className="salon-decorative-label">{item.label}</div>
                    <div className="salon-decorative-sub">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="roseGoldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a76673" />
            <stop offset="35%" stopColor="#dfb28c" />
            <stop offset="70%" stopColor="#dca3ae" />
            <stop offset="100%" stopColor="#915462" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
