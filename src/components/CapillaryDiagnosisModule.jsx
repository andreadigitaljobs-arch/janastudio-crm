import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Activity, Scissors, Droplet, FileText, Check, ChevronRight, Loader2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';

const emptyDiagnosis = {
  wash_frequency: '',
  salud: {
    embarazos_partos: false,
    problemas_hormonales: false,
    anticonceptivos_orales: false,
    caida: false,
    saborrea: false,
    caspa: false,
    alopecia: false,
    dermatitis: false,
    descamacion: false,
    irritacion: false,
  },
  cuero_cabelludo: {
    normal: false,
    seco: false,
    graso: false,
    grosor_fino: false,
    grosor_medio: false,
    grosor_grueso: false,
    tacto_suave: false,
    tacto_aspero: false,
    tacto_graso: false,
    tacto_seco: false,
    nota: '',
  },
  tinturado: { color: '', peroxido: '', fecha: '' },
  alisado: { marca: '', fecha: '' },
  hidratacion: { tipo_tratamiento: '', marca: '', fecha: '' },
  notas: '',
};

const getInitials = (name = '') => (
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
);

const Checkbox = ({ checked, onChange, label }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
    <div
      onClick={onChange}
      style={{
        width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
        border: checked ? '2px solid var(--pink-primary)' : '2px solid #d1d5db',
        backgroundColor: checked ? 'var(--pink-primary)' : 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {checked && <Check size={13} color="white" strokeWidth={3} />}
    </div>
    {label}
  </label>
);

const SmallInput = ({ value, onChange, placeholder, style }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%', height: '32px', borderRadius: '8px',
      border: '1px solid var(--border-color)', padding: '0 10px',
      fontSize: '12px', color: 'var(--text-primary)', backgroundColor: 'white',
      outline: 'none', ...style,
    }}
  />
);

const CapillaryDiagnosisModule = ({ isMobile, clients = [], onNavigate, prefillClientId, editDiagId }) => {
  const { showToast } = useNotifs();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(() => (
    prefillClientId ? (clients || []).find(c => c.id === prefillClientId) || null : null
  ));
  const [diagnosis, setDiagnosis] = useState(emptyDiagnosis);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [editingDiag, setEditingDiag] = useState(null);

  useEffect(() => {
    if (!prefillClientId) return;
    const match = (clients || []).find(c => c.id === prefillClientId);
    if (match) {
      setSelectedClient(match);
      setSavedOk(false);
    }
  }, [prefillClientId, clients]);

  useEffect(() => {
    if (!editDiagId || !selectedClient) return;
    const loadForEdit = async () => {
      try {
        const { data } = await supabase.from('capillary_diagnoses').select('*').eq('id', editDiagId).single();
        if (data?.data) {
          setDiagnosis(data.data);
          setEditingDiag(data);
        }
      } catch (err) {
        showToast('Error al cargar diagnóstico', 'error');
      }
    };
    loadForEdit();
  }, [editDiagId, selectedClient]);

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

  const toggleSalud = (key) => setDiagnosis(d => ({
    ...d, salud: { ...d.salud, [key]: !d.salud[key] }
  }));

  const toggleCuero = (key) => setDiagnosis(d => ({
    ...d, cuero_cabelludo: { ...d.cuero_cabelludo, [key]: !d.cuero_cabelludo[key] }
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingDiag) {
        await supabase.from('capillary_diagnoses').update({ data: diagnosis }).eq('id', editingDiag.id);
        showToast('Diagnóstico actualizado con éxito', 'success');
      } else {
        await dataService.addCapillaryDiagnosis({
          client_id: selectedClient.id,
          ...diagnosis,
        });
        showToast('Diagnóstico registrado con éxito', 'success');
      }
      setSavedOk(true);
      setEditingDiag(null);
    } catch (err) {
      showToast('Error al guardar diagnóstico', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    background: 'white', borderRadius: '20px', padding: isMobile ? '18px' : '24px',
    border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(160,80,106,0.04)',
  };

  const sectionLabel = {
    fontSize: '11px', fontWeight: '800', color: 'var(--pink-primary)',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px',
  };

  const checkboxGrid = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
    gap: '8px 16px',
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Header */}
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
            Ficha Capilar
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
            Registro de diagnóstico capilar para clientas.
          </p>
        </div>
      </div>

      {!selectedClient ? (
        <div className="glass-card animate-slide-up delay-2" style={{ ...cardStyle }}>
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
                  <div style={{ fontSize: '14.5px', fontWeight: '750', color: 'var(--text-primary)', lineHeight: '1.3' }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{c.phone}</div>}
                </div>
                <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      ) : savedOk ? (
        <div className="glass-card animate-fade-in" style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
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
          {/* Client banner */}
          <div className="glass-card" style={{ padding: '14px 16px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{getInitials(selectedClient.name)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedClient.name}</div>
              {selectedClient.phone && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{selectedClient.phone}</div>}
            </div>
            <button onClick={handleChangeClient} style={{ background: 'none', border: 'none', color: 'var(--magenta-primary)', fontSize: '13px', fontWeight: '750', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', backgroundColor: 'rgba(160,80,106,0.05)' }}>
              Cambiar
            </button>
          </div>

          {/* Ficha Capilar form */}
          <div style={cardStyle}>
            {/* Top fields row */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Nombre</label>
                <SmallInput value={selectedClient.name || ''} onChange={() => {}} style={{ backgroundColor: '#f0f4f8', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Teléfono</label>
                <SmallInput value={selectedClient.phone || ''} onChange={() => {}} style={{ backgroundColor: '#f0f4f8', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Fecha</label>
                <SmallInput value={new Date().toLocaleDateString('es-VE')} onChange={() => {}} style={{ backgroundColor: '#f0f4f8', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Frecuencia de lavado</label>
                <SmallInput value={diagnosis.wash_frequency} onChange={e => setDiagnosis({ ...diagnosis, wash_frequency: e.target.value })} placeholder="Ej. 2 veces por semana" />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px dashed #e5e7eb', marginBottom: '16px' }} />

            {/* SALUD */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...sectionLabel, marginBottom: '10px' }}>Salud</div>
              <div style={checkboxGrid}>
                <Checkbox checked={diagnosis.salud.embarazos_partos} onChange={() => toggleSalud('embarazos_partos')} label="Embarazos / partos" />
                <Checkbox checked={diagnosis.salud.caida} onChange={() => toggleSalud('caida')} label="Caída" />
                <Checkbox checked={diagnosis.salud.dermatitis} onChange={() => toggleSalud('dermatitis')} label="Dermatitis" />
                <Checkbox checked={diagnosis.salud.problemas_hormonales} onChange={() => toggleSalud('problemas_hormonales')} label="Problemas hormonales" />
                <Checkbox checked={diagnosis.salud.saborrea} onChange={() => toggleSalud('saborrea')} label="Saborrea" />
                <Checkbox checked={diagnosis.salud.descamacion} onChange={() => toggleSalud('descamacion')} label="Descamación" />
                <Checkbox checked={diagnosis.salud.anticonceptivos_orales} onChange={() => toggleSalud('anticonceptivos_orales')} label="Anticonceptivos orales" />
                <Checkbox checked={diagnosis.salud.caspa} onChange={() => toggleSalud('caspa')} label="Caspa" />
                <Checkbox checked={diagnosis.salud.irritacion} onChange={() => toggleSalud('irritacion')} label="Irritación" />
                <Checkbox checked={diagnosis.salud.embarazos_partos} onChange={() => toggleSalud('embarazos_partos')} label="Embarazos / partos" />
                <Checkbox checked={diagnosis.salud.alopecia} onChange={() => toggleSalud('alopecia')} label="Alopecia" />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px solid #e5e7eb', marginBottom: '16px' }} />

            {/* CUERO CABELLUDO */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...sectionLabel, marginBottom: '10px' }}>Cuero cabelludo</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto auto auto 1fr', gap: '16px', alignItems: 'start' }}>
                {/* Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Checkbox checked={diagnosis.cuero_cabelludo.normal} onChange={() => toggleCuero('normal')} label="Normal" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.seco} onChange={() => toggleCuero('seco')} label="Seco" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.graso} onChange={() => toggleCuero('graso')} label="Graso" />
                </div>
                {/* Grosor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Grosor</span>
                  <Checkbox checked={diagnosis.cuero_cabelludo.grosor_fino} onChange={() => toggleCuero('grosor_fino')} label="Fino" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.grosor_medio} onChange={() => toggleCuero('grosor_medio')} label="Medio" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.grosor_grueso} onChange={() => toggleCuero('grosor_grueso')} label="Grueso" />
                </div>
                {/* Tacto */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Tacto</span>
                  <Checkbox checked={diagnosis.cuero_cabelludo.tacto_suave} onChange={() => toggleCuero('tacto_suave')} label="Suave" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.tacto_aspero} onChange={() => toggleCuero('tacto_aspero')} label="Áspero" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.tacto_graso} onChange={() => toggleCuero('tacto_graso')} label="Graso" />
                  <Checkbox checked={diagnosis.cuero_cabelludo.tacto_seco} onChange={() => toggleCuero('tacto_seco')} label="Seco" />
                </div>
                {/* Nota */}
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>Nota:</span>
                  <textarea
                    value={diagnosis.cuero_cabelludo.nota}
                    onChange={e => setDiagnosis({ ...diagnosis, cuero_cabelludo: { ...diagnosis.cuero_cabelludo, nota: e.target.value } })}
                    placeholder="Observaciones del cuero cabelludo..."
                    style={{ width: '100%', height: '80px', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '10px', fontSize: '12px', resize: 'vertical', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px solid #e5e7eb', marginBottom: '16px' }} />

            {/* TRATAMIENTOS */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...sectionLabel, marginBottom: '10px' }}>Tratamientos</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>
                {/* Tinturado */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
                  <h5 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center' }}>Tinturado</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Color:</label>
                      <SmallInput value={diagnosis.tinturado.color} onChange={e => setDiagnosis({ ...diagnosis, tinturado: { ...diagnosis.tinturado, color: e.target.value } })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Peróxido:</label>
                      <SmallInput value={diagnosis.tinturado.peroxido} onChange={e => setDiagnosis({ ...diagnosis, tinturado: { ...diagnosis.tinturado, peroxido: e.target.value } })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>fecha:</label>
                      <SmallInput value={diagnosis.tinturado.fecha} onChange={e => setDiagnosis({ ...diagnosis, tinturado: { ...diagnosis.tinturado, fecha: e.target.value } })} type="date" />
                    </div>
                  </div>
                </div>
                {/* Alisado */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
                  <h5 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center' }}>Alisado</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Marca:</label>
                      <SmallInput value={diagnosis.alisado.marca} onChange={e => setDiagnosis({ ...diagnosis, alisado: { ...diagnosis.alisado, marca: e.target.value } })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>fecha:</label>
                      <SmallInput value={diagnosis.alisado.fecha} onChange={e => setDiagnosis({ ...diagnosis, alisado: { ...diagnosis.alisado, fecha: e.target.value } })} type="date" />
                    </div>
                  </div>
                </div>
                {/* Hidratación */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
                  <h5 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center' }}>Hidratación</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Tipo de tratamiento:</label>
                      <SmallInput value={diagnosis.hidratacion.tipo_tratamiento} onChange={e => setDiagnosis({ ...diagnosis, hidratacion: { ...diagnosis.hidratacion, tipo_tratamiento: e.target.value } })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>Marca:</label>
                      <SmallInput value={diagnosis.hidratacion.marca} onChange={e => setDiagnosis({ ...diagnosis, hidratacion: { ...diagnosis.hidratacion, marca: e.target.value } })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>fecha:</label>
                      <SmallInput value={diagnosis.hidratacion.fecha} onChange={e => setDiagnosis({ ...diagnosis, hidratacion: { ...diagnosis.hidratacion, fecha: e.target.value } })} type="date" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '2px solid #e5e7eb', marginBottom: '16px' }} />

            {/* NOTAS */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>notas:</label>
              <textarea
                value={diagnosis.notas}
                onChange={e => setDiagnosis({ ...diagnosis, notas: e.target.value })}
                placeholder="Observaciones adicionales..."
                style={{ width: '100%', height: '100px', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '12px', fontSize: '13px', resize: 'vertical', outline: 'none' }}
              />
            </div>
          </div>

          {/* Save button */}
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
