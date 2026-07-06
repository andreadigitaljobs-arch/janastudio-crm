import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  
  // Lista de 2 fotos del carrusel (removidas 3 y 4)
  const images = [
    '/login_bg1.jpeg',
    '/login_bg2.jpeg'
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  // Configuraciones individuales por foto para ajustarlas (x, y, zoom)
  const [config, setConfig] = useState({
    0: { x: 84, y: 50, z: 100 },
    1: { x: 50, y: 50, z: 100 }
  });

  const { login } = useAuth();

  // Rotar imágenes automáticamente cada 4.5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, 4500);
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
          {/* Panel de Ajuste individual para la foto visible */}
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 99,
            background: 'rgba(255, 255, 255, 0.92)',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(167, 102, 115, 0.15)',
            border: '1px solid rgba(223, 178, 140, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '260px',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            color: '#4a3036'
          }}>
            <strong style={{ fontSize: '13px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>⚙️ Ajustando Foto {activeIndex + 1} de 4</span>
              <span style={{ fontSize: '10px', color: '#c97282' }}>Carrusel activo</span>
            </strong>

            {/* Selectores rápidos de fotos para ajustarlas manualmente sin esperar */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '4px' }}>
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(201, 114, 130, 0.3)',
                    background: activeIndex === idx ? '#c97282' : '#ffffff',
                    color: activeIndex === idx ? '#ffffff' : '#6b5559',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Foto {idx + 1}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Horizontal (X):</span>
                <span>{currentConf.x}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={currentConf.x} 
                onChange={(e) => handleSliderChange('x', Number(e.target.value))} 
                style={{ width: '100%', accentColor: '#c97282' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Vertical (Y):</span>
                <span>{currentConf.y}%</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={currentConf.y} 
                onChange={(e) => handleSliderChange('y', Number(e.target.value))} 
                style={{ width: '100%', accentColor: '#c97282' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Zoom:</span>
                <span>{currentConf.z}%</span>
              </label>
              <input 
                type="range" 
                min="100" 
                max="250" 
                value={currentConf.z} 
                onChange={(e) => handleSliderChange('z', Number(e.target.value))} 
                style={{ width: '100%', accentColor: '#c97282' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#a0848a', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px', lineHeight: '1.4' }}>
              Valores configurados:<br/>
              <code>F1: {config[0].x}%, {config[0].y}%, {config[0].z}%</code><br/>
              <code>F2: {config[1].x}%, {config[1].y}%, {config[1].z}%</code>
            </div>
          </div>

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
                      transform: `scale(${imgConf.z / 100})`,
                      position: 'absolute',
                      inset: 0,
                      opacity: activeIndex === idx ? 1 : 0,
                      transition: 'opacity 1s ease-in-out', /* Suave disolvencia cruzada */
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
