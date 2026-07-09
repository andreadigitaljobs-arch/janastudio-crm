import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * JanaTimePicker - Un selector de hora ultra-premium que elimina el input nativo.
 */
const JanaTimePicker = ({ value, onChange, label = "HORA", variant = "dark" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const isLight = variant === 'light';

  // Parse current value (format "HH:mm")
  const [hours, setHours] = useState(value.split(':')[0] || '10');
  const [minutes, setMinutes] = useState(value.split(':')[1] || '00');
  const [ampm, setAmPm] = useState(parseInt(hours) >= 12 ? 'PM' : 'AM');

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

  // Display time in 12h format
  const displayHour = hours === '00' ? '12' : (parseInt(hours) > 12 ? (parseInt(hours) - 12).toString().padStart(2, '0') : hours);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          height: '48px',
          background: isLight ? 'linear-gradient(135deg, #fff 0%, #fff8fa 100%)' : 'rgba(255, 255, 255, 0.05)',
          border: isOpen ? '1.5px solid var(--pink-primary)' : isLight ? '1px solid rgba(212,160,154,0.35)' : '1px solid var(--border-color)',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          gap: '12px',
          boxShadow: isOpen ? '0 0 15px rgba(196,139,159,0.1)' : 'none'
        }}
      >
        <Clock size={16} color={isOpen ? 'var(--pink-primary)' : (isLight ? '#c97282' : 'var(--text-muted)')} />
        <span style={{ fontSize: '15px', fontWeight: '700', color: isLight ? 'var(--text-primary)' : 'white', whiteSpace: 'nowrap' }}>
          {displayHour}:{minutes} {ampm}
        </span>
      </div>

      {isOpen && (
        <div className="animate-scale-in" style={{
          position: 'absolute',
          top: '60px',
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
          animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          {/* Hours */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => adjustHour(1)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronUp size={20} /></button>
            <div style={{ ...timeValueStyle, color: isLight ? 'var(--text-primary)' : timeValueStyle.color }}>{displayHour}</div>
            <button onClick={() => adjustHour(-1)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronDown size={20} /></button>
          </div>

          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--pink-primary)', marginTop: '-4px' }}>:</div>

          {/* Minutes */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => adjustMinute(5)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronUp size={20} /></button>
            <div style={{ ...timeValueStyle, color: isLight ? 'var(--text-primary)' : timeValueStyle.color }}>{minutes}</div>
            <button onClick={() => adjustMinute(-5)} style={{ ...scrollBtnStyle, color: isLight ? '#c97282' : scrollBtnStyle.color }}><ChevronDown size={20} /></button>
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
