import React, { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { dataService } from '../services/dataService';

const defaults = {
  warningDays: '30',
  intervalDays: '21',
  latePolicy: 'Reprogramar sin consumir la sesión hasta que el servicio sea completado.',
  commissionRecognition: 'Reconocer cada parte cuando se cobra su cuota correspondiente.',
};

export default function LaserSettingsPanel({ isMobile }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      dataService.getSystemSetting('laser_expiration_warning_days', defaults.warningDays),
      dataService.getSystemSetting('laser_session_interval_days', defaults.intervalDays),
      dataService.getSystemSetting('laser_late_policy', defaults.latePolicy),
      dataService.getSystemSetting('laser_commission_recognition', defaults.commissionRecognition),
    ]).then(([warningDays, intervalDays, latePolicy, commissionRecognition]) => {
      if (active) setForm({ warningDays, intervalDays, latePolicy, commissionRecognition });
    }).catch(error => setMessage(error.message));
    return () => { active = false; };
  }, []);

  const save = async () => {
    const warningDays = Math.max(1, Math.trunc(Number(form.warningDays) || 30));
    const intervalDays = Math.max(1, Math.trunc(Number(form.intervalDays) || 21));
    setSaving(true);
    setMessage('');
    try {
      await Promise.all([
        dataService.setSystemSetting('laser_expiration_warning_days', warningDays),
        dataService.setSystemSetting('laser_session_interval_days', intervalDays),
        dataService.setSystemSetting('laser_late_policy', form.latePolicy),
        dataService.setSystemSetting('laser_commission_recognition', form.commissionRecognition),
      ]);
      setForm(current => ({ ...current, warningDays: String(warningDays), intervalDays: String(intervalDays) }));
      setMessage('Configuración guardada.');
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const input = { width: '100%', minHeight: 40, borderRadius: 10, border: '1px solid rgba(201,114,130,.25)', padding: '9px 11px', color: '#4a3036', background: '#fff', fontFamily: 'inherit' };
  return (
    <details className="agenda-glass-card" style={{ padding: 16, marginBottom: 18 }}>
      <summary style={{ cursor: 'pointer', color: '#4a3036', fontWeight: 850, display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={16} color="#c97282" /> Políticas operativas láser</summary>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 160px 1fr 1fr', gap: 10, marginTop: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 750 }}>Avisar con días de anticipación<input style={input} type="number" min="1" value={form.warningDays} onChange={event => setForm({ ...form, warningDays: event.target.value })} /></label>
        <label style={{ fontSize: 11, fontWeight: 750 }}>Intervalo entre sesiones<input style={input} type="number" min="1" value={form.intervalDays} onChange={event => setForm({ ...form, intervalDays: event.target.value })} /></label>
        <label style={{ fontSize: 11, fontWeight: 750 }}>Retrasos y reprogramaciones<textarea style={input} value={form.latePolicy} onChange={event => setForm({ ...form, latePolicy: event.target.value })} /></label>
        <label style={{ fontSize: 11, fontWeight: 750 }}>Reconocimiento de comisiones<textarea style={input} value={form.commissionRecognition} onChange={event => setForm({ ...form, commissionRecognition: event.target.value })} /></label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button className="btn-pink" disabled={saving} onClick={save} style={{ height: 38, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Save size={14} />{saving ? 'Guardando…' : 'Guardar políticas'}</button>
        {message && <span style={{ fontSize: 11, color: message.includes('guardada') ? '#198754' : '#b42318' }}>{message}</span>}
      </div>
    </details>
  );
}
