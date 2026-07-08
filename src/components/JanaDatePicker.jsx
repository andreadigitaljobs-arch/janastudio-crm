import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X } from 'lucide-react';

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAYS_OF_WEEK = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

// Parse "YYYY-MM-DD" → { year, month(0-based), day }
function parseISO(iso) {
  if (iso && iso.includes('-')) {
    const [y, m, d] = iso.split('-').map(Number);
    if (y && m && d) return { year: y, month: m - 1, day: d };
  }
  return null;
}

// Format display: "YYYY-MM-DD" → "DD/MM/YYYY"
function isoToDisplay(iso) {
  if (!iso || !iso.includes('-')) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Mask input: keep only digits, auto-insert slashes at positions 2 and 5
function applyDateMask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '/';
    result += digits[i];
  }
  return result;
}

// Parse "DD/MM/YYYY" → "YYYY-MM-DD" if complete and valid
function displayToISO(display) {
  const clean = display.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  const d = clean.slice(0, 2);
  const m = clean.slice(2, 4);
  const y = clean.slice(4, 8);
  const dateObj = new Date(`${y}-${m}-${d}`);
  if (isNaN(dateObj.getTime())) return null;
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month, year) {
  return new Date(year, month, 1).getDay();
}

export const JanaDatePicker = ({ value, onChange, placeholder = "DD/MM/AAAA", variant = "dark", inputClassName = "", inputStyle = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState(isoToDisplay(value));
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0, width: 300 });
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const currentSystemYear = new Date().getFullYear();
  const isLight = variant === 'light';

  // Calendar nav state
  const getInitialNav = () => {
    const parsed = parseISO(value);
    return parsed
      ? { year: parsed.year, month: parsed.month }
      : { year: currentSystemYear - 25, month: new Date().getMonth() };
  };

  const [navYear, setNavYear] = useState(getInitialNav().year);
  const [navMonth, setNavMonth] = useState(getInitialNav().month);
  const [selectedDay, setSelectedDay] = useState(() => parseISO(value)?.day ?? null);

  // Sync text input and calendar state when value changes externally
  useEffect(() => {
    setTextInput(isoToDisplay(value));
    const parsed = parseISO(value);
    if (parsed) {
      setNavYear(parsed.year);
      setNavMonth(parsed.month);
      setSelectedDay(parsed.day);
    } else {
      setSelectedDay(null);
    }
  }, [value]);

  // Compute calendar dropdown position (fixed, so it shows above everything)
  const openCalendar = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCalendarPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 280)
      });
    }
    setIsOpen(true);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const calEl = document.getElementById('jana-datepicker-calendar');
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        calEl && !calEl.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle text typing — auto-mask DD/MM/YYYY
  const handleTextChange = (e) => {
    const masked = applyDateMask(e.target.value);
    setTextInput(masked);
    const iso = displayToISO(masked);
    if (iso) {
      onChange({ target: { value: iso } });
    } else if (masked === '') {
      onChange({ target: { value: '' } });
    }
  };

  // Handle backspace properly
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { setIsOpen(false); return; }
    if (e.key === 'Escape') { setIsOpen(false); return; }
  };

  const handleSelectDay = (day) => {
    const fm = String(navMonth + 1).padStart(2, '0');
    const fd = String(day).padStart(2, '0');
    const iso = `${navYear}-${fm}-${fd}`;
    onChange({ target: { value: iso } });
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setTextInput('');
    onChange({ target: { value: '' } });
  };

  // Calendar grid
  const daysInMonth = getDaysInMonth(navMonth, navYear);
  const firstDayIndex = getFirstDayOfMonth(navMonth, navYear);
  const totalSlots = Math.ceil((daysInMonth + firstDayIndex) / 7) * 7;
  const cells = [];
  const prevMonthIndex = navMonth === 0 ? 11 : navMonth - 1;
  const prevYearIndex = navMonth === 0 ? navYear - 1 : navYear;
  const daysInPrevMonth = getDaysInMonth(prevMonthIndex, prevYearIndex);
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, isCurrentMonth: true });
  }
  const fillerCount = totalSlots - cells.length;
  for (let i = 1; i <= fillerCount; i++) {
    cells.push({ day: i, isCurrentMonth: false });
  }

  const years = [];
  for (let y = currentSystemYear; y >= 1920; y--) years.push(y);

  const calendarJSX = isOpen ? createPortal(
    <div
      id="jana-datepicker-calendar"
      className="animate-scale-in"
      style={{
        position: 'fixed',
        top: calendarPos.top,
        left: calendarPos.left,
        width: calendarPos.width,
        background: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(20, 20, 24, 0.99)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: isLight ? '1px solid rgba(196, 139, 159, 0.22)' : '1.5px solid rgba(196, 139, 159, 0.35)',
        borderRadius: '20px',
        padding: '16px',
        zIndex: 999999,
        boxShadow: isLight ? '0 18px 45px rgba(93, 57, 67, 0.18)' : '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(196,139,159,0.1)'
      }}
    >
      {/* Month + Year selectors */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <select
          value={navMonth}
          onChange={e => setNavMonth(parseInt(e.target.value, 10))}
          style={{
            flex: 1.3,
            height: '36px',
            background: isLight ? '#fff' : '#1c1c1e',
            border: isLight ? '1px solid rgba(212,160,154,0.35)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: isLight ? 'var(--text-primary)' : 'white',
            padding: '0 8px',
            fontSize: '13px',
            fontWeight: '600',
            outline: 'none',
            cursor: 'pointer',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23db8c95\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '28px'
          }}
        >
          {MONTHS.map((m, idx) => (
            <option key={m} value={idx} style={{ background: isLight ? 'white' : '#1c1c1e', color: isLight ? 'var(--text-primary)' : 'white' }}>{m}</option>
          ))}
        </select>
        <select
          value={navYear}
          onChange={e => setNavYear(parseInt(e.target.value, 10))}
          style={{
            flex: 1,
            height: '36px',
            background: isLight ? '#fff' : '#1c1c1e',
            border: isLight ? '1px solid rgba(212,160,154,0.35)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: isLight ? 'var(--text-primary)' : 'white',
            padding: '0 8px',
            fontSize: '13px',
            fontWeight: '600',
            outline: 'none',
            cursor: 'pointer',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%23db8c95\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '28px'
          }}
        >
          {years.map(y => (
            <option key={y} value={y} style={{ background: isLight ? 'white' : '#1c1c1e', color: isLight ? 'var(--text-primary)' : 'white' }}>{y}</option>
          ))}
        </select>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
        {DAYS_OF_WEEK.map(d => (
          <span key={d} style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((cell, idx) => {
          const isSelected = cell.isCurrentMonth && selectedDay === cell.day &&
            navYear === (parseISO(value)?.year) && navMonth === (parseISO(value)?.month);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => cell.isCurrentMonth && handleSelectDay(cell.day)}
              style={{
                height: '34px',
                width: '100%',
                background: isSelected ? 'var(--pink-primary)' : 'none',
                border: 'none',
                borderRadius: '8px',
                color: isSelected ? 'white' : (cell.isCurrentMonth ? (isLight ? 'var(--text-primary)' : 'white') : (isLight ? 'rgba(93,57,67,0.22)' : 'rgba(255,255,255,0.2)')),
                fontSize: '13px',
                fontWeight: isSelected ? '900' : (cell.isCurrentMonth ? '600' : '400'),
                cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (cell.isCurrentMonth && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(196,139,159,0.15)';
                  e.currentTarget.style.color = 'var(--pink-primary)';
                }
              }}
              onMouseLeave={e => {
                if (cell.isCurrentMonth && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = isLight ? 'var(--text-primary)' : 'white';
                }
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Calendar
          style={{ position: 'absolute', left: '16px', top: '14px', zIndex: 1, pointerEvents: 'none' }}
          size={18}
          color="var(--pink-primary)"
        />
        <input
          ref={inputRef}
          className={inputClassName}
          type="text"
          placeholder={placeholder}
          value={textInput}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onFocus={openCalendar}
          onClick={openCalendar}
          maxLength={10}
          inputMode="numeric"
          style={{
            width: '100%',
            paddingLeft: '48px',
            paddingRight: value ? '40px' : '16px',
            cursor: 'text',
            background: isLight ? 'linear-gradient(135deg, #fff 0%, #fff8fa 100%)' : 'rgba(255,255,255,0.05)',
            border: isOpen ? '1.5px solid var(--pink-primary)' : isLight ? '1px solid rgba(212,160,154,0.35)' : '1px solid rgba(255,255,255,0.15)',
            color: isLight ? 'var(--text-primary)' : 'white',
            outline: 'none',
            transition: 'border-color 0.2s',
            ...inputStyle
          }}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '16px',
              top: '12px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      {calendarJSX}
    </div>
  );
};

export default JanaDatePicker;
