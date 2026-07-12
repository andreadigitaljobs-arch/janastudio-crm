import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, User, Activity, Scissors, Droplet, FileText, Check, ChevronRight, Loader2
} from 'lucide-react';
import JanaSelect from './JanaSelect';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';

const emptyDiagnosis = {
  hair_type: 'Normal',
  porosity: 'Media',
  scalp_condition: 'Sano',
  elasticity: 'Buena',
  overall_score: 7.5,
  hydration_pct: 70,
  nutrition_pct: 60,
  repair_pct: 50,
  shine_pct: 80,
  strength_pct: 70,
  scalp_oil_level: 'Normal',
  scalp_sensitivity: 'Baja',
  scalp_flaking: 'No',
  scalp_hairloss: 'Leve',
  scalp_inflammation: 'No',
  scalp_health_pct: 70,
  observations: '',
  chemical_history: '',
  recommended_treatment: '',
  notes: '',
  images: []
};

const getInitials = (name = '') => (
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
);

const SectionCard = ({ icon, title, children, isMobile }) => (
  <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '16px' : '18px', border: '1px solid var(--border-color)' }}>
    <h5 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: '850', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {icon} {title}
    </h5>
    {children}
  </div>
);

const CapillaryDiagnosisModule = ({ isMobile, clients = [], onNavigate, prefillClientId }) => {
  const { showToast } = useNotifs();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(() => (
    prefillClientId ? (clients || []).find(c => c.id === prefillClientId) || null : null
  ));
  const [diagnosis, setDiagnosis] = useState(emptyDiagnosis);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (!prefillClientId) return;
    const match = (clients || []).find(c => c.id === prefillClientId);
    if (match) {
      setSelectedClient(match);
      setSavedOk(false);
    }
  }, [prefillClientId, clients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (clients || [])
      .filter((c) => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q))
      .slice(0, 8);
  }, [search, clients]);

  const resetForm = () => {
    setDiagnosis(emptyDiagnosis);
    setSavedOk(false);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearch('');
    resetForm();
  };

  const handleChangeClient = () => {
    setSelectedClient(null);
    resetForm();
  };

  const handleSave = async () => {
    if (!diagnosis.chemical_history && !diagnosis.recommended_treatment) {
      showToast('Por favor introduce detalles del diagnóstico', 'warning');
      return;
    }
    setSaving(true);
    try {
      await dataService.addCapillaryDiagnosis({
        client_id: selectedClient.id,
        ...diagnosis,
        observations: diagnosis.observations.split('\n').map(s => s.trim()).filter(Boolean)
      });
      setSavedOk(true);
      showToast('Diagnóstico registrado con éxito', 'success');
    } catch (err) {
      showToast('Error al registrar diagnóstico', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Premium Clean Header Toolbar (matches Archivo de Clientes / Agenda) */}
      <div className="animate-slide-down" style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        marginBottom: '28px', padding: '12px 0 16px 0', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(160,80,106,0.18) 0%, rgba(160,80,106,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', borderRadius: isMobile ? '12px' : '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0, zIndex: 1 }}>
          <Activity size={isMobile ? 16 : 20} color="white" />
        </div>
        <div style={{ zIndex: 1 }}>
          <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '24px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
            Diagnóstico Capilar
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
            Registra un nuevo diagnóstico capilar para cualquier clienta, sin tener que entrar a su ficha.
          </p>
        </div>
      </div>

      {!selectedClient ? (
        <div className="glass-card animate-slide-up delay-2" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.04)' }}>
          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
            Buscar clienta
          </label>
          <div style={{ position: 'relative', marginBottom: filteredClients.length > 0 ? '14px' : '0' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              autoFocus
              placeholder="Nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px 13px 40px', borderRadius: '14px',
                border: '1px solid var(--border-color)', backgroundColor: 'white',
                fontSize: '15px', color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>

          {search.trim() && filteredClients.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No se encontraron clientas.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectClient(c)}
                className="btn-interactive table-row-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  borderRadius: '14px', border: '1px solid var(--border-color)', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: 'rgba(160,80,106,0.12)', border: '1.5px solid var(--pink-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>{getInitials(c.name)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '750', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{c.phone}</div>}
                </div>
                <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      ) : savedOk ? (
        <div className="glass-card animate-fade-in" style={{ padding: '40px 24px', background: 'white', borderRadius: '18px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(46,158,91,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={28} color="#2e9e5b" />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '850', color: 'var(--text-primary)' }}>Diagnóstico guardado</h3>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Se registró correctamente para {selectedClient.name}.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-pink" style={{ padding: '12px 20px' }} onClick={() => { resetForm(); }}>
              Registrar otro para {selectedClient.name.split(' ')[0]}
            </button>
            <button
              className="btn-interactive"
              style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
              onClick={handleChangeClient}
            >
              Diagnosticar otra clienta
            </button>
            {onNavigate && (
              <button
                className="btn-interactive"
                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--pink-primary)', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => onNavigate('clients', { clientId: selectedClient.id })}
              >
                Ver ficha de {selectedClient.name.split(' ')[0]}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-card" style={{ padding: '14px 16px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--magenta-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{getInitials(selectedClient.name)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedClient.name}</div>
              {selectedClient.phone && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{selectedClient.phone}</div>}
            </div>
            <button
              onClick={handleChangeClient}
              style={{ background: 'none', border: 'none', color: 'var(--magenta-primary)', fontSize: '13px', fontWeight: '750', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', backgroundColor: 'rgba(160,80,106,0.05)' }}
            >
              Cambiar
            </button>
          </div>

          <SectionCard icon={<Scissors size={13} />} title="Perfil del Cabello" isMobile={isMobile}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <JanaSelect variant="light" label="Grosor de Hebra" value={diagnosis.hair_type} onChange={(val) => setDiagnosis({ ...diagnosis, hair_type: val })}
                options={[{ label: 'Normal', value: 'Normal' }, { label: 'Fino', value: 'Fino' }, { label: 'Grueso', value: 'Grueso' }, { label: 'Quebradizo', value: 'Quebradizo' }]} />
              <JanaSelect variant="light" label="Porosidad" value={diagnosis.porosity} onChange={(val) => setDiagnosis({ ...diagnosis, porosity: val })}
                options={[{ label: 'Baja', value: 'Baja' }, { label: 'Media', value: 'Media' }, { label: 'Alta', value: 'Alta' }]} />
              <JanaSelect variant="light" label="Condición del Cuero" value={diagnosis.scalp_condition} onChange={(val) => setDiagnosis({ ...diagnosis, scalp_condition: val })}
                options={[{ label: 'Sano', value: 'Sano' }, { label: 'Seborrea', value: 'Seborrea' }, { label: 'Descamación', value: 'Descamación' }, { label: 'Caída', value: 'Caída' }, { label: 'Sensible', value: 'Sensible' }]} />
              <JanaSelect variant="light" label="Elasticidad" value={diagnosis.elasticity} onChange={(val) => setDiagnosis({ ...diagnosis, elasticity: val })}
                options={[{ label: 'Baja', value: 'Baja' }, { label: 'Regular', value: 'Regular' }, { label: 'Buena', value: 'Buena' }]} />
            </div>
            <div style={{ marginTop: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Estado General: {diagnosis.overall_score} / 10</label>
              <input type="range" min="0" max="10" step="0.5" value={diagnosis.overall_score} onChange={e => setDiagnosis({ ...diagnosis, overall_score: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--pink-primary)' }} />
            </div>
          </SectionCard>

          <SectionCard icon={<Activity size={13} />} title="Condición del Cabello" isMobile={isMobile}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 16px' }}>
              {[
                { key: 'hydration_pct', label: 'Hidratación' },
                { key: 'nutrition_pct', label: 'Nutrición' },
                { key: 'repair_pct', label: 'Reparación' },
                { key: 'shine_pct', label: 'Brillo' },
                { key: 'strength_pct', label: 'Fuerza' },
              ].map((f) => (
                <div key={f.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '4px' }}>
                    <span>{f.label}</span><span>{diagnosis[f.key]}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={diagnosis[f.key]} onChange={e => setDiagnosis({ ...diagnosis, [f.key]: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--pink-primary)' }} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={<Droplet size={13} />} title="Salud del Cuero Cabelludo" isMobile={isMobile}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
              <JanaSelect variant="light" label="Nivel de Grasa" value={diagnosis.scalp_oil_level} onChange={(val) => setDiagnosis({ ...diagnosis, scalp_oil_level: val })}
                options={[{ label: 'Bajo', value: 'Bajo' }, { label: 'Normal', value: 'Normal' }, { label: 'Alto', value: 'Alto' }]} />
              <JanaSelect variant="light" label="Sensibilidad" value={diagnosis.scalp_sensitivity} onChange={(val) => setDiagnosis({ ...diagnosis, scalp_sensitivity: val })}
                options={[{ label: 'Baja', value: 'Baja' }, { label: 'Media', value: 'Media' }, { label: 'Alta', value: 'Alta' }]} />
              <JanaSelect variant="light" label="Descamación" value={diagnosis.scalp_flaking} onChange={(val) => setDiagnosis({ ...diagnosis, scalp_flaking: val })}
                options={[{ label: 'No', value: 'No' }, { label: 'Leve', value: 'Leve' }, { label: 'Sí', value: 'Sí' }]} />
              <JanaSelect variant="light" label="Caída" value={diagnosis.scalp_hairloss} onChange={(val) => setDiagnosis({ ...diagnosis, scalp_hairloss: val })}
                options={[{ label: 'No', value: 'No' }, { label: 'Leve', value: 'Leve' }, { label: 'Moderada', value: 'Moderada' }]} />
              <JanaSelect variant="light" label="Inflamación" value={diagnosis.scalp_inflammation} onChange={(val) => setDiagnosis({ ...diagnosis, scalp_inflammation: val })}
                options={[{ label: 'No', value: 'No' }, { label: 'Leve', value: 'Leve' }, { label: 'Sí', value: 'Sí' }]} />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '4px' }}>
                  <span>Salud general</span><span>{diagnosis.scalp_health_pct}%</span>
                </div>
                <input type="range" min="0" max="100" value={diagnosis.scalp_health_pct} onChange={e => setDiagnosis({ ...diagnosis, scalp_health_pct: Number(e.target.value) })} style={{ width: '100%', marginTop: '10px', accentColor: 'var(--pink-primary)' }} />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<FileText size={13} />} title="Notas y Observaciones" isMobile={isMobile}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Observaciones (una por línea)</label>
                <textarea className="form-input" value={diagnosis.observations} onChange={e => setDiagnosis({ ...diagnosis, observations: e.target.value })}
                  placeholder={'Se observa acumulación leve de residuos en raíz.\nPuntas ligeramente secas y porosas.'}
                  style={{ width: '100%', height: '60px', padding: '10px', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Historial Químico</label>
                <textarea className="form-input" value={diagnosis.chemical_history} onChange={e => setDiagnosis({ ...diagnosis, chemical_history: e.target.value })}
                  placeholder="Decoloraciones previas, alisados, tintes..." style={{ width: '100%', height: '60px', padding: '10px', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Tratamiento Recomendado</label>
                <textarea className="form-input" value={diagnosis.recommended_treatment} onChange={e => setDiagnosis({ ...diagnosis, recommended_treatment: e.target.value })}
                  placeholder="Tratamiento molecular, fototerapia, etc..." style={{ width: '100%', height: '60px', padding: '10px', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notas de Diagnóstico</label>
                <textarea className="form-input" value={diagnosis.notes} onChange={e => setDiagnosis({ ...diagnosis, notes: e.target.value })}
                  placeholder="Observaciones adicionales..." style={{ width: '100%', height: '60px', padding: '10px', fontSize: '13px' }} />
              </div>
            </div>
          </SectionCard>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-pink"
            style={{ width: '100%', height: isMobile ? '48px' : '44px', fontSize: '15px', fontWeight: '750', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {saving ? 'Guardando...' : 'Guardar Diagnóstico'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CapillaryDiagnosisModule;
