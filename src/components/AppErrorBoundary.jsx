import React from 'react';

const CHUNK_ERROR_PATTERN = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i;
const CHUNK_RELOAD_KEY = 'astro_chunk_reload_at';
const LAST_CRASH_KEY = 'astro_last_crash';

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
    localStorage.setItem('astro_active_tab', 'dashboard');
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
      <div style={{ minHeight: '100vh', background: '#050505', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '520px', padding: '32px', borderRadius: '24px', background: '#171717', border: '1px solid rgba(212,175,55,0.35)', textAlign: 'center' }}>
          <div style={{ color: '#d4af37', fontSize: '36px', marginBottom: '12px' }}>?</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '24px' }}>La pantalla necesita recuperarse</h1>
          <p style={{ color: '#aaa', margin: '0 0 16px', lineHeight: 1.5 }}>
            La aplicación encontró un error. Recarga para continuar y verifica si la cita o el cliente ya quedó registrado antes de repetir la operación.
          </p>

          <button onClick={() => this.setState({ showDebug: !this.state.showDebug })} style={{ border: '1px solid #555', borderRadius: '8px', padding: '6px 14px', background: 'transparent', color: '#d4af37', fontWeight: 700, cursor: 'pointer', fontSize: '12px', marginBottom: '16px' }}>
            {this.state.showDebug ? 'Ocultar detalle' : 'Ver detalle del error'}
          </button>

          {this.state.showDebug && (
            <div style={{ textAlign: 'left', background: '#0a0a0a', borderRadius: '12px', padding: '16px', marginBottom: '16px', fontSize: '12px', fontFamily: 'monospace', color: '#ff6b6b', maxHeight: '300px', overflow: 'auto', wordBreak: 'break-all' }}>
              <div style={{ color: '#d4af37', fontWeight: 800, marginBottom: '8px' }}>Error:</div>
              <div style={{ marginBottom: '12px' }}>{errorMsg}</div>
              {errorStack && (
                <>
                  <div style={{ color: '#d4af37', fontWeight: 800, marginBottom: '8px' }}>Stack:</div>
                  <div style={{ color: '#888', whiteSpace: 'pre-wrap' }}>{errorStack}</div>
                </>
              )}
              <button onClick={this.handleCopyError} style={{ marginTop: '10px', border: '1px solid #555', borderRadius: '6px', padding: '4px 10px', background: 'transparent', color: '#d4af37', fontWeight: 700, cursor: 'pointer', fontSize: '11px' }}>
                {this.state.copied ? 'Copiado!' : 'Copiar error'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.handleReload} style={{ border: 0, borderRadius: '12px', padding: '12px 20px', background: '#d4af37', color: '#050505', fontWeight: 900, cursor: 'pointer' }}>
              Recuperar pantalla
            </button>
            <button onClick={this.handleDashboard} style={{ border: '1px solid #555', borderRadius: '12px', padding: '12px 20px', background: 'transparent', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
