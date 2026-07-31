import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PenTool, RotateCcw, Check, FileText, Clock, User, Shield } from 'lucide-react';

const CONSENT_TEXT = `Yo, _________________________, declaro que he sido informada(a) de manera clara y completa sobre el procedimiento de depilación láser diodo que se me realizará en JanaStudio.

Entiendo que el procedimiento utiliza luz láser para la eliminación del vello y que los resultados pueden variar según cada persona.

Declaro que:
• No me encuentro embarazada.
• No presento lesiones cutáneas activas en la zona a tratar.
• He informado al profesional sobre cualquier condición médica, medicamento o alergia que pueda afectar el procedimiento.
• Comprendo que puedo experimentar enrojecimiento temporal, leve hinchazón o molestias menores después del tratamiento.
• Me comprometo a seguir las indicaciones pre y post-tratamiento proporcionadas por el profesional.

Declaro que he tenido la oportunidad de realizar todas las preguntas necesarias y que todas mis dudas han sido resueltas a mi satisfacción.

Otorgo mi consentimiento de forma libre y voluntaria para la realización del procedimiento de depilación láser diodo.`;

const CONSENT_LINES = CONSENT_TEXT.split('\n');

export default function DigitalConsentForm({ 
  clientName, 
  staffName, 
  existingConsent, 
  onSave, 
  isMobile,
  onCancel 
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signedBy, setSignedBy] = useState(clientName || '');
  const [saving, setSaving] = useState(false);
  const lastPoint = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#2d1b22';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasSignature(true);
    lastPoint.current = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      const pos = getPos(e);
      ctx.moveTo(pos.x, pos.y);
    }
  }, [getPos]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    const prev = lastPoint.current;
    if (prev) {
      const midX = (prev.x + pos.x) / 2;
      const midY = (prev.y + pos.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();
    }
    lastPoint.current = pos;
  }, [isDrawing, getPos]);

  const endDraw = useCallback((e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
  }, []);

  const handleSave = async () => {
    if (!hasSignature || !signedBy.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const signatureBase64 = canvas.toDataURL('image/png');
      await onSave({
        signature_base64: signatureBase64,
        signed_by: signedBy.trim(),
        consent_text: CONSENT_TEXT,
        service_type: 'laser',
      });
    } catch (err) {
      console.error('Error saving consent:', err);
    } finally {
      setSaving(false);
    }
  };

  if (existingConsent) {
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#2e7d32" />
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22' }}>Consentimiento Digital Registrado</div>
            <div style={{ fontSize: '0.75rem', color: '#a0909a', fontWeight: 600 }}>
              Firmado el {new Date(existingConsent.created_at).toLocaleDateString()} a las {new Date(existingConsent.created_at).toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div style={{ background: '#fcf9f8', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(223, 178, 140, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <User size={14} color="#c97282" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2d1b22' }}>Firmado por: {existingConsent.signed_by}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={14} color="#c97282" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a0909a' }}>Profesional: {existingConsent.staff_name || 'N/A'}</span>
          </div>
        </div>

        {existingConsent.signature_base64 && (
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid rgba(223,178,140,0.3)', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a0909a', marginBottom: '8px' }}>FIRMA:</div>
            <img 
              src={existingConsent.signature_base64} 
              alt="Firma del consentimiento" 
              style={{ width: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #fff0f2 0%, #ffe1e6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={18} color="#c97282" />
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2d1b22' }}>Consentimiento Informado - Láser</div>
          <div style={{ fontSize: '0.75rem', color: '#a0909a', fontWeight: 600 }}>El cliente debe leer y firmar</div>
        </div>
      </div>

      {/* Consent text */}
      <div style={{ 
        background: '#fcf9f8', 
        borderRadius: '12px', 
        padding: '16px', 
        marginBottom: '16px', 
        border: '1px solid rgba(223, 178, 140, 0.2)',
        maxHeight: '200px',
        overflowY: 'auto'
      }} className="jana-scrollbar">
        {CONSENT_LINES.map((line, i) => (
          <p key={i} style={{ fontSize: '0.72rem', color: '#5a4a50', lineHeight: 1.5, margin: '4px 0', fontWeight: line.startsWith('•') ? 600 : 400 }}>
            {line}
          </p>
        ))}
      </div>

      {/* Signature name */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2d1b22', marginBottom: '6px', display: 'block' }}>
          Nombre de quien firma
        </label>
        <input
          type="text"
          value={signedBy}
          onChange={(e) => setSignedBy(e.target.value)}
          placeholder="Nombre completo"
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1.5px solid rgba(223, 178, 140, 0.4)',
            fontSize: '0.9rem',
            fontWeight: 600,
            outline: 'none',
            color: '#2d1b22',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Signature pad */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2d1b22', marginBottom: '6px', display: 'block' }}>
          Firma del cliente
        </label>
        <div style={{ 
          position: 'relative',
          borderRadius: '12px',
          border: '2px dashed rgba(201, 114, 130, 0.4)',
          overflow: 'hidden',
          background: '#fff',
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            style={{
              width: '100%',
              height: '140px',
              display: 'block',
              cursor: 'crosshair',
              touchAction: 'none',
            }}
          />
          {!hasSignature && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'none',
            }}>
              <PenTool size={20} color="#c9a0b0" />
              <span style={{ fontSize: '0.72rem', color: '#c9a0b0', fontWeight: 600 }}>Firme aquí</span>
            </div>
          )}
        </div>
      </div>

      {/* Clear button */}
      <button
        onClick={clearCanvas}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '10px',
          border: '1px solid rgba(223, 178, 140, 0.3)',
          background: '#fff',
          color: '#a0909a',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: '16px',
          transition: 'all 0.2s',
        }}
      >
        <RotateCcw size={14} />
        Borrar firma
      </button>

      {/* Save / Cancel buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: '1.5px solid rgba(223, 178, 140, 0.4)',
            background: '#fff',
            color: '#a0909a',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!hasSignature || !signedBy.trim() || saving}
          style={{
            flex: 2,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: hasSignature && signedBy.trim()
              ? 'linear-gradient(135deg, #c48b9f 0%, #c97282 100%)'
              : '#f5f0f2',
            color: hasSignature && signedBy.trim() ? '#fff' : '#a0909a',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: hasSignature && signedBy.trim() ? 'pointer' : 'not-allowed',
            boxShadow: hasSignature && signedBy.trim() ? '0 4px 16px rgba(201, 114, 130, 0.25)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          {saving ? (
            'Guardando...'
          ) : (
            <>
              <Check size={16} />
              Aceptar Consentimiento
            </>
          )}
        </button>
      </div>
    </div>
  );
}
