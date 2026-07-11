import React from 'react';
import { createPortal } from 'react-dom';

const MiniLoader = ({ text = "Cargando...", fixed = true }) => {
  if (window.isJanaLoaderVisible || window.isJanaAppLoading) {
    return null;
  }

  const containerStyle = fixed ? {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    backgroundColor: 'rgba(247, 235, 230, 0.4)',
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    zIndex: 99999,
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '30px',
    width: '100%',
    minHeight: '180px'
  };

  const loaderContent = (
    <div style={containerStyle}>
      <div className="rose-gold-spinner" style={{ width: '42px', height: '42px', borderWidth: '3.5px' }}></div>
      {text && (
        <p 
          style={{ 
            fontFamily: "'Playfair Display', Georgia, serif", 
            fontSize: '15px', 
            color: '#7a5853', 
            margin: 0, 
            fontStyle: 'italic',
            letterSpacing: '0.02em',
            textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)'
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fixed) {
    return createPortal(loaderContent, document.body);
  }

  return loaderContent;
};

export default MiniLoader;


