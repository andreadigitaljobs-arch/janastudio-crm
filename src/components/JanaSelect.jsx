import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * JanaSelect - Un componente de selección premium que evita los estilos nativos de Windows.
 * El dropdown usa position:fixed para siempre renderizarse por encima de todo.
 */
const JanaSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label = "",
  style = {},
  disabled = false,
  variant = "dark"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const safeOptions = Array.isArray(options) ? options : [];

  const selectedOption = safeOptions.find(opt => opt.value == value);
  const isLight = variant === 'light';

  // Calculate fixed position whenever dropdown opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownMaxH = 250;

      if (spaceBelow < dropdownMaxH + 16) {
        // Open upward
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999,
          top: 'auto'
        });
      } else {
        // Open downward
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999,
          bottom: 'auto'
        });
      }
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        !event.target.closest('.jana-select-dropdown')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on scroll/resize to avoid stale position,
  // but NOT when scrolling inside the dropdown itself
  useEffect(() => {
    if (!isOpen) return;
    const close = (e) => {
      // Ignore scroll events that happen inside the dropdown
      if (e.target && e.target.closest && e.target.closest('.jana-select-dropdown')) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const dropdown = isOpen ? (
    <div
      className={`jana-select-dropdown jana-scrollbar ${isLight ? 'jana-select-dropdown-light' : 'jana-select-dropdown-dark'}`}
      style={{
        ...dropdownStyle,
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : '#1c1c1e',
        backdropFilter: 'blur(18px)',
        borderRadius: '18px',
        border: isLight ? '1px solid rgba(196, 139, 159, 0.22)' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isLight ? '0 18px 45px rgba(93, 57, 67, 0.18)' : '0 10px 40px rgba(0,0,0,0.8)',
        maxHeight: '250px',
        overflowY: 'auto',
        padding: '8px',
        animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'top center'
      }}
    >
      {safeOptions.length === 0 ? (
        <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>Sin opciones</div>
      ) : (
        safeOptions.map((opt) => (
          <div
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              backgroundColor: value === opt.value ? 'rgba(196, 139, 159, 0.15)' : 'transparent',
              color: value === opt.value ? 'var(--pink-primary)' : isLight ? 'var(--text-primary)' : 'white',
              transition: '0.2s',
              fontSize: '14px',
              fontWeight: value === opt.value ? '700' : '500',
              marginBottom: '2px'
            }}
            className="jana-option"
          >
            {opt.label}
          </div>
        ))
      )}
    </div>
  ) : null;

  return (
    <>
      <div
        className="form-group"
        style={{ position: 'relative', width: '100%', ...style, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        ref={containerRef}
      >
        {label && (
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {label}
          </label>
        )}

        <div
          ref={triggerRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            ...(isLight ? {
              background: isOpen ? 'rgba(255, 255, 255, 1)' : 'linear-gradient(135deg, #fff 0%, #fff8fa 100%)',
              border: isOpen ? '1px solid var(--pink-primary)' : '1px solid rgba(212,160,154,0.35)',
              boxShadow: isOpen ? '0 0 0 4px rgba(196, 139, 159, 0.12), 0 12px 28px rgba(93, 57, 67, 0.10)' : '0 8px 22px rgba(93, 57, 67, 0.06)'
            } : {
              border: isOpen ? '1px solid var(--pink-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isOpen ? '0 0 0 4px rgba(196, 139, 159, 0.1)' : 'none'
            }),
            padding: '13px 16px',
            borderRadius: '14px',
            color: selectedOption ? isLight ? 'var(--text-primary)' : 'white' : 'var(--text-muted)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '15px',
            fontWeight: selectedOption ? '700' : '600',
            userSelect: 'none'
          }}
        >
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown size={18} color="var(--pink-primary)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s', flexShrink: 0 }} />
        </div>
      </div>

      {/* Render dropdown via portal so it escapes all overflow/transform contexts */}
      {createPortal(
        <>
          {dropdown}
          <style>{`
            .jana-option:hover {
              background-color: rgba(255, 255, 255, 0.05) !important;
              transform: translateX(4px);
            }
            .jana-select-dropdown-light .jana-option:hover {
              background-color: rgba(196, 139, 159, 0.10) !important;
            }
            .jana-select-dropdown.jana-scrollbar::-webkit-scrollbar {
              width: 6px;
              display: block !important;
            }
            .jana-select-dropdown.jana-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(196, 139, 159, 0.2);
              border-radius: 10px;
            }
          `}</style>
        </>,
        document.body
      )}
    </>
  );
};

export default JanaSelect;
