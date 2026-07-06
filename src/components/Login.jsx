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
    '/login_bg2.jpeg',
    '/login_bg1.jpeg',
    '/login_bg3.jpeg'
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
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="salon-login-outer">
      <div className="salon-login-container">

        {/* ── SECCIÓN IZQUIERDA: Carrusel de fotos ── */}
        <div className="salon-login-left">
          <div className="salon-semicircle-border">
            <div className="salon-semicircle-content" style={{ position: 'relative', width: '100%', height: '100%' }}>
              {images.map((imgUrl, idx) => {
                const imgConf = config[idx] || { x: 50, y: 50, z: 100 };
                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`salon-semicircle-image ${activeIndex === idx ? 'ken-burns-active' : ''}`}
                      style={{
                        backgroundImage: `url(${imgUrl})`,
                        backgroundPosition: `${imgConf.x}% ${imgConf.y}%`,
                        backgroundSize: `${imgConf.z}%`,
                        position: 'absolute',
                        inset: 0,
                        opacity: activeIndex === idx ? 1 : 0,
                        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: activeIndex === idx ? 2 : 1
                      }}
                    />
                    {activeIndex === idx && <div className="salon-photo-overlay" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN DERECHA: Formulario flotante ── */}
        <div className="salon-login-right">
          <div className={`salon-login-form-wrapper ${mounted ? 'salon-form-mounted' : ''}`}>

            {/* Logo */}
            <div className="salon-logo-header salon-stagger-1" onClick={handleLogoTap} style={{ cursor: 'pointer' }}>
              <img
                src="/logo.png"
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

              {/* Correo Electrónico - Floating Label */}
              <div className="salon-input-group">
                <div className={`salon-field-container ${email ? 'has-value' : ''} ${isMobile ? '' : 'salon-field-hover'}`}>
                  <span className="salon-field-icon"><User size={18} strokeWidth={1.5} /></span>
                  <input
                    ref={emailRef}
                    type="email"
                    className="salon-field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    autoComplete="email"
                    required
                    id="login-email"
                  />
                </div>
                <label htmlFor="login-email" className={`salon-floating-label ${email ? 'is-up' : ''}`}>Correo electrónico</label>
              </div>

              {/* Contraseña - Floating Label */}
              <div className="salon-input-group">
                <div className={`salon-field-container ${password ? 'has-value' : ''} ${isMobile ? '' : 'salon-field-hover'}`}>
                  <span className="salon-field-icon"><Lock size={18} strokeWidth={1.5} /></span>
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    className="salon-field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
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
                <label htmlFor="login-password" className={`salon-floating-label ${password ? 'is-up' : ''}`}>Contraseña</label>
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
