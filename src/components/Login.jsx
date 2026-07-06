import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight, CalendarHeart, Sparkles, Scissors } from 'lucide-react';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  
  // Lista de fotos del carrusel
  const images = [
    '/login_bg2.jpeg',
    '/login_bg1.jpeg',
    '/login_bg3.jpeg',
    '/login_bg4.webp'
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  // Configuraciones individuales por foto para ajustarlas (x, y, zoom)
  const [config, setConfig] = useState({
    0: { x: 84, y: 50, z: 100 },
    1: { x: 84, y: 50, z: 100 },
    2: { x: 0, y: 40, z: 120 },
    3: { x: 50, y: 50, z: 100 }
  });

  const { login } = useAuth();

  // Rotar imágenes automáticamente cada 7 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [activeIndex]: {
        ...prev[activeIndex],
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result && !result.success) setError(result.message || 'Credenciales incorrectas');
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const currentConf = config[activeIndex] || { x: 50, y: 50, z: 100 };

  return (
    <div className="salon-login-outer">
      <div className="salon-login-container">
        
        {/* ── SECCIÓN IZQUIERDA: Medio círculo gigante con el carrusel de fotos ── */}
        <div className="salon-login-left">

          <div className="salon-semicircle-border">
            <div className="salon-semicircle-content" style={{ position: 'relative', width: '100%', height: '100%' }}>
              {images.map((imgUrl, idx) => {
                const imgConf = config[idx] || { x: 50, y: 50, z: 100 };
                return (
                  <div 
                    key={idx}
                    className="salon-semicircle-image" 
                    style={{
                      backgroundImage: `url(${imgUrl})`,
                      backgroundPosition: `${imgConf.x}% ${imgConf.y}%`,
                      backgroundSize: `${imgConf.z}%`,
                      position: 'absolute',
                      inset: 0,
                      opacity: activeIndex === idx ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      zIndex: activeIndex === idx ? 2 : 1
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN DERECHA: Formulario flotante ── */}
        <div className="salon-login-right">
          <div className="salon-login-form-wrapper">
            
            {/* Logo de JANA Studio (Imagen oficial) */}
            <div className="salon-logo-header">
              <img 
                src="/logo.png" 
                alt="Jana Studio Eyelashes & Brows" 
                className="salon-logo-image" 
              />
            </div>

            {/* Encabezado del Formulario */}
            <div className="salon-form-header">
              <h3 className="salon-form-title">
                Bienvenida de nuevo <span className="salon-heart-icon">♡</span>
              </h3>
              <p className="salon-form-subtitle">
                Inicia sesión para continuar gestionando tu studio con elegancia.
              </p>
            </div>

            {error && <div className="salon-error-banner">{error}</div>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="salon-main-form">
              
              {/* Correo Electrónico */}
              <div className="salon-input-group">
                <div className="salon-field-container">
                  <span className="salon-field-icon"><User size={18} strokeWidth={1.5} /></span>
                  <input
                    type="email"
                    className="salon-field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="salon-input-group">
                <div className="salon-field-container">
                  <span className="salon-field-icon"><Lock size={18} strokeWidth={1.5} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="salon-field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    required
                  />
                  <button
                    type="button"
                    className="salon-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {/* Botón de envío */}
              <button type="submit" className="salon-submit-button" disabled={loading}>
                {loading ? (
                  <span className="salon-loading-spinner">Cargando...</span>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight size={18} className="salon-submit-arrow" />
                  </>
                )}
              </button>

            </form>

            {/* ── Íconos decorativos rose gold ── */}
            <div style={{
              marginTop: '28px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(223, 178, 140, 0.25)',
              display: 'flex',
              justifyContent: 'space-around',
              gap: '8px'
            }}>
              {[
                { icon: <CalendarHeart size={22} strokeWidth={1.4} />, label: 'Agenda', sub: 'tus citas' },
                { icon: <Sparkles size={22} strokeWidth={1.4} />, label: 'Servicios', sub: 'exclusivos' },
                { icon: <Scissors size={22} strokeWidth={1.4} />, label: 'Extensiones', sub: '& Brows' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  flex: 1
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(232,162,169,0.12) 0%, rgba(223,178,140,0.12) 100%)',
                    border: '1px solid rgba(223, 178, 140, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c97282'
                  }}>
                    {item.icon}
                  </div>
                  <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b4a52' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: '#a07880', fontWeight: '400' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* SVG para definir gradientes reutilizables */}
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
