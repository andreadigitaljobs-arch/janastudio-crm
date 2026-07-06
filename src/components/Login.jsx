import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Heart } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result && !result.success) {
        setError(result.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      {/* LEFT — Imagen del salón */}
      <div className="login-left-image">
        <div className="login-left-overlay">
          <div className="login-left-content">
            <p className="login-left-logo-text">
              JANA<br />
              <span style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '3rem' }}>Studio</span>
            </p>
            <p className="login-left-logo-sub">Beauty. Confidence. You.</p>
            <div style={{ marginTop: '18px', color: 'rgba(255,255,255,0.7)' }}>
              <Heart size={18} fill="rgba(255,255,255,0.5)" />
            </div>
          </div>
        </div>
      </div>

      {/* SVG wave divider */}
      <svg
        className="login-wave-divider"
        viewBox="0 0 42 900"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M42,0 C20,150 0,300 20,450 C0,600 20,750 42,900 L42,900 L42,0 Z" fill="#ffffff" />
      </svg>

      {/* RIGHT — Formulario */}
      <div className="login-right-panel">
        <div className="login-card">

          {/* Header */}
          <div className="login-logo">
            <div className="login-logo-heart">
              <Heart size={22} fill="var(--pink-primary)" color="var(--pink-primary)" />
            </div>
            <h1 className="login-welcome-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to continue to Jana Studio</p>
          </div>

          {/* Error */}
          {error && <div className="login-error">{error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">

            {/* Email */}
            <div className="login-field">
              <label className="login-label">Email address</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="login-input-wrapper login-password-wrapper">
                <span className="login-input-icon">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>


            {/* Submit */}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <span className="login-loading">
                  <span className="spinner" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
