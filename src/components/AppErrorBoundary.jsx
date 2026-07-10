import React from 'react';

const CHUNK_ERROR_PATTERN = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i;
const CHUNK_RELOAD_KEY = 'jana_chunk_reload_at';
const LAST_CRASH_KEY = 'jana_last_crash';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, showDebug: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Application render failure:', error, info);

    try {
      localStorage.setItem(LAST_CRASH_KEY, JSON.stringify({
        occurred_at: new Date().toISOString(),
        message: String(error?.message || error || 'Unknown application error'),
        component_stack: String(info?.componentStack || '').slice(0, 4000),
        path: window.location.pathname
      }));
    } catch {
      // Diagnostics must never interfere with recovery.
    }

    if (CHUNK_ERROR_PATTERN.test(String(error?.message || error))) {
      const previousReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
      if (Date.now() - previousReload > 30000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDashboard = () => {
    localStorage.setItem('jana_active_tab', 'dashboard');
    window.location.reload();
  };

  handleCopyError = () => {
    const err = this.state.error;
    const text = `Error: ${err?.message || err}\n\nStack: ${err?.stack || 'N/A'}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const err = this.state.error;
    const errorMsg = String(err?.message || err || 'Unknown error');
    const errorStack = String(err?.stack || '').slice(0, 1500);

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fbf8f7 0%, #f5eff1 100%)', color: '#4a3036', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', }}>
        <div style={{ width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(212, 160, 154, 0.35)', textAlign: 'center', boxShadow: '0 12px 40px rgba(74, 48, 54, 0.05)' }}>
          <div style={{ color: '#d4a09a', fontSize: '48px', marginBottom: '12px', fontWeight: '300' }}>✨</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: '800', color: '#4a3036' }}>La pantalla necesita recuperarse</h1>
          <p style={{ color: '#7d5a62', margin: '0 0 20px', fontSize: '14px', lineHeight: 1.6 }}>
            La aplicación encontró un error inesperado. Recarga para continuar y verifica si la cita o el cliente ya quedó registrado antes de repetir la operación.
          </p>
 
          <button onClick={() => this.setState({ showDebug: !this.state.showDebug })} style={{ border: '1px solid rgba(74, 48, 54, 0.15)', borderRadius: '100px', padding: '8px 18px', background: 'transparent', color: '#a0506a', fontWeight: 600, cursor: 'pointer', fontSize: '12px', marginBottom: '20px', transition: 'all 0.2s' }}>
            {this.state.showDebug ? 'Ocultar detalle' : 'Ver detalle del error'}
          </button>
 
          {this.state.showDebug && (
            <div style={{ textAlign: 'left', background: 'rgba(240, 225, 227, 0.4)', borderRadius: '16px', padding: '18px', marginBottom: '20px', fontSize: '12px', fontFamily: 'monospace', color: '#b33951', maxHeight: '250px', overflow: 'auto', border: '1px solid rgba(212, 160, 154, 0.2)' }}>
              <div style={{ color: '#a0506a', fontWeight: 800, marginBottom: '8px' }}>Error:</div>
              <div style={{ marginBottom: '12px', lineHeight: 1.4 }}>{errorMsg}</div>
              {errorStack && (
                <>
                  <div style={{ color: '#a0506a', fontWeight: 800, marginBottom: '8px' }}>Stack:</div>
                  <div style={{ color: '#666', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{errorStack}</div>
                </>
              )}
              <button onClick={this.handleCopyError} style={{ marginTop: '12px', border: '1px solid rgba(74, 48, 54, 0.15)', borderRadius: '8px', padding: '4px 10px', background: '#ffffff', color: '#a0506a', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}>
                {this.state.copied ? '¡Copiado!' : 'Copiar error'}
              </button>
            </div>
          )}
 
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleReload} style={{ border: 0, borderRadius: '100px', padding: '12px 24px', background: 'linear-gradient(135deg, #e8a2a9 0%, #db8c95 100%)', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(219, 140, 149, 0.25)' }}>
              Recuperar pantalla
            </button>
            <button onClick={this.handleDashboard} style={{ border: '1px solid rgba(74, 48, 54, 0.15)', borderRadius: '100px', padding: '12px 24px', background: 'transparent', color: '#4a3036', fontWeight: 700, cursor: 'pointer' }}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
