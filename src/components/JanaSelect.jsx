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
  variant = "dark",
  showSearch = false,
  editable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typedValue, setTypedValue] = useState("");
  const safeOptions = Array.isArray(options) ? options : [];

  const selectedOption = safeOptions.find(opt => opt.value == value);
  const isLight = variant === 'light';

  // Filter options based on search query if enabled
  const filteredOptions = searchQuery 
    ? safeOptions.filter(opt => String(opt.label).toLowerCase().includes(searchQuery.toLowerCase()))
    : safeOptions;

  // Reset search when opening/closing, sync typed value
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedOption) {
      setTypedValue(selectedOption.label);
    } else {
      setTypedValue(value || "");
    }
  }, [value, selectedOption]);

  // Calculate fixed position whenever dropdown opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownMaxH = 300;
      const margin = 20; // 20px padding from the viewport bottom (accounts for Taskbar)

      if (spaceBelow >= dropdownMaxH + margin) {
        // Normal open downward
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999,
          bottom: 'auto',
          maxHeight: `${dropdownMaxH}px`
        });
      } else if (rect.top >= dropdownMaxH + margin) {
        // Open upward since there is enough space above
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999,
          top: 'auto',
          maxHeight: `${dropdownMaxH}px`
        });
      } else {
        // Open downward but limit the max-height to fit remaining viewport space dynamically
        const restrictedHeight = Math.max(120, spaceBelow - margin);
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999,
          bottom: 'auto',
          maxHeight: `${restrictedHeight}px`
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
      // Ignore scroll events that happen inside the dropdown or inside search input
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

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      onChange(typedValue);
      setIsOpen(false);
    }
  };

  const dropdown = isOpen ? (
    <div
      className={`jana-select-dropdown jana-scrollbar ${isLight ? 'jana-select-dropdown-light' : 'jana-select-dropdown-dark'}`}
      style={{
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : '#1c1c1e',
        backdropFilter: 'blur(18px)',
        borderRadius: '18px',
        border: isLight ? '1px solid rgba(196, 139, 159, 0.22)' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isLight ? '0 18px 45px rgba(93, 57, 67, 0.18)' : '0 10px 40px rgba(0,0,0,0.8)',
        maxHeight: '300px',
        ...dropdownStyle,
        overflowY: 'auto',
        padding: '8px',
        animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'top center',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      {/* Search Input inside Dropdown */}
      {showSearch && (
        <div style={{ padding: '4px', position: 'sticky', top: 0, zIndex: 10, background: isLight ? 'rgba(255, 255, 255, 0.98)' : '#1c1c1e', marginBottom: '4px' }}>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: isLight ? '1.5px solid rgba(212,160,154,0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
              background: isLight ? '#fff' : 'rgba(255,255,255,0.05)',
              color: isLight ? '#3d2b30' : '#fff',
              fontSize: '0.8rem',
              fontWeight: '600',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--pink-primary)';
              e.target.style.boxShadow = isLight ? '0 0 0 3px rgba(196, 139, 159, 0.15)' : 'none';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isLight ? 'rgba(212,160,154,0.4)' : 'rgba(255, 255, 255, 0.15)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      )}

      <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }} className="jana-scrollbar">
        {filteredOptions.length === 0 ? (
          <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>Sin resultados</div>
        ) : (
          filteredOptions.map((opt) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: opt.image || opt.subLabel ? '8px 12px' : '12px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                backgroundColor: value === opt.value ? 'rgba(196, 139, 159, 0.12)' : 'transparent',
                color: value === opt.value ? 'var(--pink-primary)' : isLight ? 'var(--text-primary)' : 'white',
                transition: '0.2s',
                fontSize: '14px',
                fontWeight: value === opt.value ? '700' : '500',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              className="jana-option"
            >
              {opt.image && (
                <img 
                  src={opt.image} 
                  alt={opt.label} 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    border: '1.5px solid rgba(219,140,149,0.2)' 
                  }} 
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: value === opt.value ? '750' : '650', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {opt.label}
                </div>
                {opt.subLabel && (
                  <div style={{ fontSize: '0.66rem', color: '#a0868c', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>
                    {opt.subLabel}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
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

        {editable ? (
          <div
            ref={triggerRef}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder={placeholder}
              value={typedValue}
              onFocus={() => !disabled && setIsOpen(true)}
              onChange={(e) => {
                setTypedValue(e.target.value);
                onChange(e.target.value);
              }}
              onKeyDown={handleInputKeyDown}
              style={{
                width: '100%',
                background: isLight ? 'linear-gradient(135deg, #fff 0%, #fff8fa 100%)' : 'rgba(255, 255, 255, 0.05)',
                border: isOpen ? '1.5px solid var(--pink-primary)' : isLight ? '1px solid rgba(212,160,154,0.35)' : '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: isOpen ? isLight ? '0 0 0 4px rgba(196, 139, 159, 0.12), 0 12px 28px rgba(93, 57, 67, 0.10)' : '0 0 0 4px rgba(196, 139, 159, 0.1)' : 'none',
                padding: '13px 40px 13px 16px',
                borderRadius: '14px',
                color: isLight ? 'var(--text-primary)' : 'white',
                fontSize: '15px',
                fontWeight: '700',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
            <ChevronDown
              size={18}
              color="var(--pink-primary)"
              style={{
                position: 'absolute',
                right: '16px',
                pointerEvents: 'none',
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: '0.3s'
              }}
            />
          </div>
        ) : (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              {selectedOption && selectedOption.image && (
                <img 
                  src={selectedOption.image} 
                  alt={selectedOption.label} 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    marginRight: '2px',
                    border: '1px solid rgba(219,140,149,0.25)'
                  }} 
                />
              )}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            </div>
            <ChevronDown size={18} color="var(--pink-primary)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s', flexShrink: 0 }} />
          </div>
        )}
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
