import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * JanaTimePicker - Un selector de hora ultra-premium que permite escribir y seleccionar.
 */
const JanaTimePicker = ({ value, onChange, label = "", variant = "dark", placement = "bottom" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const isLight = variant === 'light';

  // Parse current value (format "HH:mm")
  const [hours, setHours] = useState(value.split(':')[0] || '10');
  const [minutes, setMinutes] = useState(value.split(':')[1] || '00');
  const [ampm, setAmPm] = useState(parseInt(hours) >= 12 ? 'PM' : 'AM');

  // Local text input state (formatted value: "HH:MM AM/PM")
  const getFormattedDisplay = (h, m, am_pm) => {
    const displayH = h === '00' ? '12' : (parseInt(h) > 12 ? (parseInt(h) - 12).toString().padStart(2, '0') : h);
    return `${displayH}:${m} ${am_pm}`;
  };

  const [textInput, setTextInput] = useState(getFormattedDisplay(hours, minutes, ampm));

  useEffect(() => {
    const h = value.split(':')[0] || '10';
    const m = value.split(':')[1] || '00';
    const a = parseInt(h) >= 12 ? 'PM' : 'AM';
    setHours(h);
    setMinutes(m);
    setAmPm(a);
    setTextInput(getFormattedDisplay(h, m, a));
  }, [value]);

  // Convert 12h to 24h for the parent
  const handleTimeChange = (newH, newM, newAmPm) => {
    let h = parseInt(newH);
    if (newAmPm === 'PM' && h < 12) h += 12;
    if (newAmPm === 'AM' && h === 12) h = 0;
    const formattedH = h.toString().padStart(2, '0');
    onChange(`${formattedH}:${newM}`);
  };

  const adjustHour = (delta) => {
    let h = parseInt(hours);
    h = ((h - 1 + delta + 12) % 12) + 1;
    const newH = h.toString().padStart(2, '0');
    setHours(newH);
    handleTimeChange(newH, minutes, ampm);
  };

  const adjustMinute = (delta) => {
    let m = parseInt(minutes);
    m = ((m + delta + 60) % 60);
    const newM = m.toString().padStart(2, '0');
    setMinutes(newM);
    handleTimeChange(hours, newM, ampm);
  };

  const toggleAmPm = () => {
    const newAmPm = ampm === 'AM' ? 'PM' : 'AM';
    setAmPm(newAmPm);
    handleTimeChange(hours, minutes, newAmPm);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format typing (mask "XX:XX AM" or "XX:XX PM")
  const handleInputChange = (e) => {
    let raw = e.target.value.toUpperCase();
    
    // Clean anything that isn't a digit, A, P, or M
    let clean = raw.replace(/[^0-9APM]/g, '');
    
    let formatted = '';
    if (clean.length > 0) {
      formatted += clean.slice(0, 2);
    }
    if (clean.length > 2) {
      formatted += ':' + clean.slice(2, 4);
    }
    if (clean.length > 4) {
      const part = clean.slice(4).replace(/[^APM]/g, '');
      if (part.length > 0) {
        formatted += ' ' + part.slice(0, 2);
      }
    }
    
    setTextInput(formatted);

    // Try parsing
    const match = formatted.match(/^(\d{2}):(\d{2})\s?([AP]M?)$/);
    if (match) {
      let typedH = parseInt(match[1]);
      let typedM = parseInt(match[2]);
      let typedAmPm = match[3];
      if (!typedAmPm.endsWith('M')) typedAmPm += 'M'; // autocomplete 'A' to 'AM'

      if (typedH >= 1 && typedH <= 12 && typedM >= 0 && typedM <= 59) {
        let h24 = typedH;
        if (typedAmPm === 'PM' && h24 < 12) h24 += 12;
        if (typedAmPm === 'AM' && h24 === 12) h24 = 0;
        
        const stringH = h24.toString().padStart(2, '0');
        const stringM = typedM.toString().padStart(2, '0');
        onChange(`${stringH}:${stringM}`);
      }
    }
  };

  // Display hour representation
  const displayHour = hours === '00' ? '12' : (parseInt(hours) > 12 ? (parseInt(hours) - 12).toString().padStart(2, '0') : hours);
  const isTop = placement === 'top';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}
      
      <div
        style={{
          height: '48px',
          background: isLight ? 'linear-gradient(135deg, #fff 0%, #fff8fa 100%)' : 'rgba(255, 255, 255, 0.05)',
          border: isOpen ? '1.5px solid var(--pink-primary)' : isLight ? '1px solid rgba(212,160,154,0.35)' : '1px solid var(--border-color)',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px 0 16px',
          transition: 'all 0.2s ease',
          gap: '8px',
          boxShadow: isOpen ? '0 0 15px rgba(196,139,159,0.1)' : 'none'
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: isOpen ? 'var(--pink-primary)' : (isLight ? '#c97282' : 'var(--text-muted)')
          }}
        >
          <Clock size={16} color="inherit" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={textInput}
          onChange={handleInputChange}
          placeholder="HH:MM AM"
          maxLength={8}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '14px',
            fontWeight: '700',
            color: isLight ? 'var(--text-primary)' : 'white',
            padding: 0,
            cursor: 'text'
          }}
        />
      </div>

      {isOpen && (
        <div className="animate-scale-in" style={{
          position: 'absolute',
          bottom: isTop ? '58px' : 'auto',
          top: isTop ? 'auto' : '60px',
          right: 0,
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          border: isLight ? '1px solid rgba(196, 139, 159, 0.22)' : '1.5px solid rgba(196, 139, 159, 0.3)',
          borderRadius: '24px',
          padding: '20px',
          zIndex: 1000,
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          boxShadow: isLight ? '0 18px 45px rgba(93, 57, 67, 0.18)' : '0 20px 40px rgba(0,0,0,0.6)',
          animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transformOrigin: isTop ? 'bottom right' : 'top right'
        }}>
          {/* Hours */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => adjustHour(1)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronUp size={20} /></button>
            <div style={{ ...timeValueStyle, color: isLight ? 'var(--text-primary)' : timeValueStyle.color }}>{displayHour}</div>
            <button type="button" onClick={() => adjustHour(-1)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronDown size={20} /></button>
          </div>

          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--pink-primary)', marginTop: '-4px' }}>:</div>

          {/* Minutes */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => adjustMinute(5)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronUp size={20} /></button>
            <div style={{ ...timeValueStyle, color: isLight ? 'var(--text-primary)' : timeValueStyle.color }}>{minutes}</div>
            <button type="button" onClick={() => adjustMinute(-5)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronDown size={20} /></button>
          </div>

          {/* AM/PM Toggle */}
          <div
            onClick={toggleAmPm}
            style={{
              backgroundColor: 'rgba(196, 139, 159, 0.1)',
              padding: '10px 14px',
              borderRadius: '12px',
              color: 'var(--pink-primary)',
              fontWeight: '900',
              fontSize: '14px',
              cursor: 'pointer',
              border: '1px solid rgba(196,139,159,0.2)',
              marginLeft: '10px'
            }}
          >
            {ampm}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const scrollBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: '0.2s'
};

const timeValueStyle = {
  fontSize: '28px',
  fontWeight: '950',
  color: 'white',
  fontFamily: 'monospace',
  lineHeight: 1
};

export default JanaTimePicker;
