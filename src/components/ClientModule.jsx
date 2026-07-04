import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Scissors, 
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Filter,
  Columns as ColumnsIcon,
  Loader2,
  X,
  Trash2,
  Download,
  Check,
  LayoutGrid,
  Table as TableIcon,
  MessageCircle,
  Receipt
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import AstroSelect from './AstroSelect';
import AstroCamera from './AstroCamera';
import BirthdayTextInput from './BirthdayTextInput';
import AstroDialog from './AstroDialog';
import AnimatedModal from './AnimatedModal';
import { formatName, normalizeForSearch } from '../utils/stringUtils';
import {
  getBirthdayMessageTemplate,
  setBirthdayMessageTemplate
} from '../utils/birthdayMessage';
import { useDialog } from '../context/DialogContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../context/AuthContext';
import { getRoleKind } from '../utils/roles';

const ClientModule = ({ isMobile, clients, onRefresh, initialClientId }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useScrollLock(showMessageModal);

  const [defaultBdayMessage, setDefaultBdayMessage] = useState(getBirthdayMessageTemplate());
  const [defaultFollowupMessage, setDefaultFollowupMessage] = useState('Hola {{nombre}}! Ya es momento de renovar tu corte \u2702\uFE0F Te esperamos en Astro Barbershop.');
  const [messageTemplateTab, setMessageTemplateTab] = useState('birthday');
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      dataService.getSystemSetting('whatsapp_template_birthday', getBirthdayMessageTemplate()),
      dataService.getSystemSetting('whatsapp_template_followup', defaultFollowupMessage)
    ]).then(([birthday, followup]) => {
      if (!active) return;
      setDefaultBdayMessage(birthday);
      setBirthdayMessageTemplate(birthday);
      setDefaultFollowupMessage(followup);
    }).catch(error => console.error('No se pudieron cargar las plantillas de WhatsApp:', error));
    return () => { active = false; };
    // Templates are shared settings and only need to load when this module mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveMessageTemplate = async () => {
    const isBirthday = messageTemplateTab === 'birthday';
    const key = isBirthday ? 'whatsapp_template_birthday' : 'whatsapp_template_followup';
    const value = isBirthday ? defaultBdayMessage : defaultFollowupMessage;
    if (!String(value || '').trim()) {
      showToast('El mensaje no puede estar vacio', 'warning');
      return;
    }
    try {
      setSavingTemplate(true);
      const saved = await dataService.setSystemSetting(key, value);
      if (isBirthday) {
        setDefaultBdayMessage(saved);
        setBirthdayMessageTemplate(saved);
      } else {
        setDefaultFollowupMessage(saved);
      }
      setShowMessageModal(false);
      showToast(isBirthday ? 'Mensaje de cumplea\u00f1os guardado' : 'Mensaje recurrente guardado');
    } catch (error) {
      console.error(error);
      showToast('No se pudo guardar el mensaje', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  useEffect(() => {
    if (initialClientId && clients.length > 0) {
      const client = clients.find(c => c.id == initialClientId);
      if (client) setSelectedClient(client);
    }
  }, [initialClientId, clients]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', 
    phone: '', 
    id_card: '',
    birth_date: '',
    hair_type: 'Normal', 
    scalp_type: 'Normal' 
  });
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'

  const [creating, setCreating] = useState(false);

  // Sync selected client when global list updates (Crucial for persistence visibility)
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    }
  }, [clients]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sort clients: newest first (created_at descending)
  const sortedClients = [...clients].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  // Barbers only see clients they created or served
  const roleKind = getRoleKind(user?.role);
  const isBarber = roleKind === 'barber';
  const roleFilteredClients = isBarber
    ? sortedClients.filter(c =>
        c.created_by_staff_id === user?.id ||
        (c.served_by_staff_ids || []).includes(user?.id)
      )
    : sortedClients;

  // Filter clients by search
  const filteredClients = roleFilteredClients.filter(c => {
    const term = normalizeForSearch(searchTerm);
    const normalizedName = normalizeForSearch(c.name || '');
    const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
    const idMatches = (c.id_card || '').toLowerCase().includes(term);
    const phoneMatches = (c.phone || '').includes(searchTerm);
    return nameMatches || idMatches || phoneMatches;
  });

  // Paginated clients
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const handleDeleteClient = async (id, name) => {
    if (!await confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) return;
    try {
      setLoading(true);
      await dataService.deleteClient(id);
      if (selectedClient?.id === id) setSelectedClient(null);
      await onRefresh();
      showToast(`${name} ha sido eliminado.`);
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('Error al eliminar cliente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name) return;
    try {
      setCreating(true);
      await dataService.addClient(newClient);
      setNewClient({ 
        name: '', 
        phone: '', 
        id_card: '',
        birth_date: '',
        hair_type: 'Normal', 
        scalp_type: 'Normal' 
      });
      setShowAddForm(false);
      await onRefresh();
      showToast('¡Ficha de cliente creada con éxito!');
    } catch (error) {
      console.error('Error addClient:', error);
      showToast('Error técnico al agregar cliente.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="client-module animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {!selectedClient ? (
        <>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '20px' : '0',
            marginBottom: isMobile ? '24px' : '40px'
          }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '26px' : '28px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' }}>Archivo de <span className="text-gold">Clientes</span></h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: isMobile ? '13px' : '15px' }}>Fichas técnicas y galería de evolución.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
              {/* View Toggles */}
              <div style={{ 
                display: 'flex', 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                padding: '4px',
                border: '1px solid rgba(255,255,255,0.05)',
                marginRight: isMobile ? '0' : '12px',
                flex: isMobile ? '1 1 100%' : 'none',
                justifyContent: 'space-between'
              }}>
                <button 
                  onClick={() => setViewMode('grid')}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: viewMode === 'grid' ? 'rgba(212,175,55,0.1)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--gold-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  <LayoutGrid size={16} /> Tarjetas
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    backgroundColor: viewMode === 'table' ? 'rgba(212,175,55,0.1)' : 'transparent',
                    color: viewMode === 'table' ? 'var(--gold-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    flex: isMobile ? 1 : 'none',
                    justifyContent: 'center'
                  }}
                >
                  <TableIcon size={16} /> Tabla
                </button>
              </div>

              <button 
                className="btn-gold" 
                onClick={() => setShowMessageModal(true)} 
                style={{ 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: 'pointer',
                  flex: isMobile ? '1 1 45%' : 'none',
                  justifyContent: 'center',
                  fontSize: isMobile ? '13px' : '14px',
                  padding: isMobile ? '12px 8px' : '12px 16px',
                  whiteSpace: 'nowrap'
                }}
              >
                <MessageCircle size={18} /> {!isMobile && "Mensajes WhatsApp"}
                {isMobile && "Mensajes"}
              </button>

              <button className="btn-gold" onClick={() => setShowAddForm(!showAddForm)} style={{ 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                flex: isMobile ? '1 1 45%' : 'none',
                justifyContent: 'center',
                fontSize: isMobile ? '13px' : '14px',
                padding: isMobile ? '12px 8px' : '12px 16px',
                whiteSpace: 'nowrap'
              }}>
                <Plus size={18} /> {showAddForm ? 'Cancelar' : 'Nuevo Cliente'}
              </button>
            </div>
          </div>

          {showAddForm && (
            <div className="glass-card animate-fade-in" style={{ marginBottom: '40px', padding: '32px', borderRadius: '24px' }}>
              <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>Alta de Cliente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                  <input className="form-input" placeholder="Ej. Juan Pérez" value={newClient.name} onChange={(e) => setNewClient({...newClient, name: formatName(e.target.value)})} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Cédula / ID</label>
                  <input className="form-input" placeholder="Ej. 28.123.456" value={newClient.id_card} onChange={(e) => setNewClient({...newClient, id_card: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Teléfono</label>
                  <input className="form-input" placeholder="WhatsApp" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Cumpleaños</label>
                  <BirthdayTextInput value={newClient.birth_date} onChange={(e) => setNewClient({...newClient, birth_date: e.target.value})} style={{ width: '100%' }} />
                </div>
                <AstroSelect 
                  label="Tipo de Cabello"
                  value={newClient.hair_type}
                  onChange={(val) => setNewClient({...newClient, hair_type: val})}
                  options={[
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Graso', value: 'Graso' },
                    { label: 'Seco', value: 'Seco' },
                    { label: 'Mixto', value: 'Mixto' }
                  ]}
                />
                <AstroSelect 
                  label="Cuero Cabelludo"
                  value={newClient.scalp_type}
                  onChange={(val) => setNewClient({...newClient, scalp_type: val})}
                  options={[
                    { label: 'Sano / Normal', value: 'Sano' },
                    { label: 'Sensible', value: 'Sensible' },
                    { label: 'Irritado', value: 'Irritado' },
                    { label: 'Caspa / Seborrea', value: 'Caspa' }
                  ]}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-gold" onClick={handleAddClient} disabled={creating} style={{ width: '100%', height: '48px', borderRadius: '12px' }}>
                    {creating ? <Loader2 className="animate-spin" /> : 'Registrar Ficha Técnica'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="focus-ring" style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '16px', 
            padding: '4px 16px', 
            marginBottom: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px solid var(--border-color)',
            transition: 'all 0.2s'
          }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                width: '100%',
                padding: '12px 0',
                fontSize: '16px',
                boxShadow: 'none'
              }}
            />
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <Loader2 className="animate-spin" size={40} color="var(--gold-primary)" />
            </div>
          ) : clients.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
              <User size={48} color="var(--bg-tertiary)" style={{ marginBottom: '20px' }} />
              <p style={{ color: 'var(--text-muted)' }}>Archivo vacío. Agrega a tu primer cliente.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {paginatedClients.map(client => (
                <div 
                  key={client.id} 
                  className="glass-card list-item" 
                  onClick={() => setSelectedClient(client)}
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'minmax(120px, 1.5fr) 90px auto auto' : 'minmax(200px, 1.5fr) 120px 1fr 1fr 1fr auto',
                    gap: isMobile ? '8px' : '0',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: isMobile ? '12px 14px' : '20px 24px',
                    borderRadius: '20px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: isMobile ? '36px' : '48px', 
                      height: isMobile ? '36px' : '48px', 
                      borderRadius: isMobile ? '10px' : '14px', 
                      backgroundColor: 'rgba(212,175,55,0.05)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(212,175,55,0.1)',
                      flexShrink: 0
                    }}>
                      <User size={isMobile ? 16 : 20} color="var(--gold-primary)" />
                    </div>
                    <span style={{ fontWeight: '700', fontSize: isMobile ? '13px' : '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</span>
                    {isBarber && (
                      <span style={{ fontSize: '9px', fontWeight: '900', color: client.created_by_staff_id === user?.id ? 'var(--gold-primary)' : '#34d399', background: client.created_by_staff_id === user?.id ? 'rgba(212,175,55,0.12)' : 'rgba(52,211,153,0.12)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                        {client.created_by_staff_id === user?.id ? 'Creado' : 'Atendido'}
                      </span>
                    )}
                  </div>
                  {!isMobile && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '800', opacity: 0.8 }}>
                      V-{client.id_card || '00.000.000'}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '14px', fontWeight: '500' }}>
                    <Phone size={isMobile ? 12 : 14} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.phone}</span>
                  </div>
                  {!isMobile && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      Registrado: {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  )}
                  <div style={{ textAlign: isMobile ? 'right' : 'center' }}>
                    <span style={{ 
                      padding: isMobile ? '4px 8px' : '6px 14px', 
                      borderRadius: '10px', 
                      backgroundColor: 'rgba(212,175,55,0.05)', 
                      color: 'var(--gold-primary)',
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: '700',
                      letterSpacing: '0.3px',
                      whiteSpace: 'nowrap'
                    }}>
                      {client.total_visits || 0} VISITAS
                    </span>
                  </div>
                  <ChevronRight size={isMobile ? 16 : 20} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-slide-up" style={{ background: 'rgba(28, 28, 30, 0.95)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</th>
                    {!isMobile && <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cédula / ID</th>}
                    <th style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contacto</th>
                    {!isMobile && <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registrado</th>}
                    <th style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: isMobile ? 'right' : 'left' }}>Visitas</th>
                    {!isMobile && <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client) => (
                    <tr 
                      key={client.id} 
                      onClick={() => setSelectedClient(client)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s', cursor: 'pointer' }} 
                      className="table-row-hover"
                    >
                      <td style={{ padding: isMobile ? '12px 12px' : '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'white', fontSize: isMobile ? '13px' : '16px' }}>{client.name}</div>
                        {isMobile && client.id_card && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>V-{client.id_card}</div>}
                      </td>
                      {!isMobile && (
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                          V-{client.id_card || '00.000.000'}
                        </td>
                      )}
                      <td style={{ padding: isMobile ? '12px 12px' : '16px 24px', fontSize: isMobile ? '12px' : '14px', color: 'var(--text-secondary)' }}>
                        {client.phone}
                      </td>
                      {!isMobile && (
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      )}
                      <td style={{ padding: isMobile ? '12px 12px' : '16px 24px', textAlign: isMobile ? 'right' : 'left' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold-primary)', backgroundColor: 'rgba(212,175,55,0.05)', padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                          {client.total_visits || 0} {!isMobile && "Visitas"}
                        </span>
                      </td>
                      {!isMobile && (
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <ChevronRight size={18} color="var(--text-muted)" />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '16px', 
              marginTop: '32px',
              padding: '12px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: currentPage === 1 ? 'transparent' : 'rgba(212,175,55,0.1)',
                  color: currentPage === 1 ? 'var(--text-muted)' : 'var(--gold-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: currentPage === totalPages ? 'transparent' : 'rgba(212,175,55,0.1)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--gold-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <ClientDetail 
          isMobile={isMobile}
          client={selectedClient} 
          onBack={() => {
            setSelectedClient(null);
            setShowCamera(false); // Reset camera state on back
          }} 
          onDelete={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
          onUpdate={async (updates) => {
            try {
              const updated = await dataService.updateClient(selectedClient.id, updates);
              setSelectedClient(updated);
              await onRefresh();
              showToast('Datos actualizados');
              return updated;
            } catch (e) {
              showToast('Error al actualizar', 'error');
              return null;
            }
          }}
        />
      )}
      
      {/* Custom styled modal overlay to edit default birthday message */}
      {createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: showMessageModal ? 'blur(8px)' : 'blur(0px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          opacity: showMessageModal ? 1 : 0,
          visibility: showMessageModal ? 'visible' : 'hidden',
          pointerEvents: showMessageModal ? 'auto' : 'none',
          transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease, visibility 0.3s'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '460px',
            background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.05)',
            position: 'relative',
            transform: showMessageModal ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            opacity: showMessageModal ? 1 : 0
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={20} color="var(--gold-primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'white' }}>
                  {messageTemplateTab === 'birthday' ? 'Mensaje de Cumplea\u00f1os' : 'Mensaje Recurrente'}
                </h3>
              </div>
              <button 
                onClick={() => setShowMessageModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
              {[['birthday', 'Cumplea\u00f1os'], ['followup', 'Recurrente']].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setMessageTemplateTab(value)}
                  style={{ padding: '10px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(212,175,55,0.2)', background: messageTemplateTab === value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', color: messageTemplateTab === value ? '#111' : 'white', fontWeight: '900', fontSize: '12px' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Description */}
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              {messageTemplateTab === 'birthday'
                ? 'El bot enviara este mensaje automaticamente a los clientes que cumplan anos.'
                : 'El bot enviara este mensaje cuando se cumpla la recurrencia configurada durante el cobro.'}
            </p>

            <div style={{ 
              backgroundColor: 'rgba(212, 175, 55, 0.1)', 
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--gold-primary)',
              marginBottom: '16px',
              lineHeight: '1.4'
            }}>
              <strong>Consejo:</strong> Usa <code>{"{{nombre}}"}</code> para insertar automaticamente el nombre del cliente al enviar.</div>

            {/* Message Template Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
              <textarea 
                value={messageTemplateTab === 'birthday' ? defaultBdayMessage : defaultFollowupMessage}
                onChange={(e) => messageTemplateTab === 'birthday'
                  ? setDefaultBdayMessage(e.target.value)
                  : setDefaultFollowupMessage(e.target.value)}
                rows={6}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '140px',
                  lineHeight: '1.5'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleSaveMessageTemplate}
                disabled={savingTemplate}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--gold-primary)',
                  color: 'black',
                  fontWeight: '850',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {savingTemplate ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              
              <button 
                onClick={() => {
                  setDefaultBdayMessage(getBirthdayMessageTemplate());
                  setShowMessageModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .list-item:hover {
          border-color: var(--gold-primary);
          transform: scale(1.01) translateY(-2px);
          background-color: var(--bg-tertiary) !important;
          box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

const ClientDetail = ({ isMobile, client, onBack, onDelete, onUpdate }) => {
  const { showToast } = useNotifs();
  const [showCollage, setShowCollage] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [photoA, setPhotoA] = useState(null);
  const [photoB, setPhotoB] = useState(null);
  const [selectingFor, setSelectingFor] = useState(null); // 'A' or 'B'
  const [sliderPos, setSliderPos] = useState(50);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoMeta, setPhotoMeta] = useState({ type: 'Normal', serviceId: null });

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data, error } = await dataService.supabase
          .from('clients')
          .select('work_gallery')
          .eq('id', client.id)
          .single();
        if (error) throw error;
        setGallery(data?.work_gallery || []);
      } catch (err) {
        console.error('Error fetching client gallery:', err);
      }
    };
    if (client?.id) {
      fetchGallery();
    }
  }, [client?.id]);

  const fileInputRef = useRef(null);
  const [editData, setEditData] = useState({ 
    name: client.name, 
    phone: client.phone,
    id_card: client.id_card,
    birth_date: client.birth_date || '',
    hair_type: client.hair_type,
    scalp_type: client.scalp_type
  });

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const data = await dataService.getClientTransactions(client.id);
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [client.id]);

  const handleDownloadComparison = () => {
    if (!photoA || !photoB) return;
    
    const canvas = document.createElement('canvas');
    const imgA = new Image();
    const imgB = new Image();
    
    imgA.src = photoA;
    imgB.src = photoB;
    
    Promise.all([
      new Promise(res => imgA.onload = res),
      new Promise(res => imgB.onload = res)
    ]).then(() => {
      const width = 1200;
      const height = 800;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw images side by side
      ctx.drawImage(imgA, 0, 0, width/2, height);
      ctx.drawImage(imgB, width/2, 0, width/2, height);
      
      // Add overlay labels
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(20, height - 60, 100, 40);
      ctx.fillRect(width/2 + 20, height - 60, 120, 40);
      
      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText('ANTES', 35, height - 33);
      ctx.fillText('DESPUÉS', width/2 + 35, height - 33);
      
      // Add Branding
      ctx.fillStyle = 'white';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('ASTRO BARBER SHOP', width - 200, 30);
      
      const link = document.createElement('a');
      link.download = `Comparativa_${client.name}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      showToast('Descargando comparativa...');
    });
  };

  const handlePhotoCaptured = async (image) => {
    try {
      // Small but pro optimization
      const img = new Image();
      img.src = image;
      await new Promise(r => img.onload = r);
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const optimizedImage = canvas.toDataURL('image/jpeg', 0.6);

      setPendingPhoto(optimizedImage);
      setShowCamera(false);
    } catch (e) {
      console.error(e);
      showToast('Error al procesar imagen', 'error');
    }
  };

  const confirmSavePhoto = async () => {
    try {
      showToast('Guardando en la nube...', 'info');
      
      const photoObj = {
        url: pendingPhoto,
        type: photoMeta.type,
        date: new Date().toISOString(),
        service_id: photoMeta.serviceId,
        service_name: photoMeta.serviceId ? history.find(h => h.id === photoMeta.serviceId)?.services?.name : 'Subida manual'
      };

      // Fetch latest gallery from DB to avoid overwriting barber's photos
      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', client.id)
        .single();
      
      const currentLatestGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = [photoObj, ...currentLatestGallery];
      
      const updatedClient = await onUpdate({ work_gallery: newGallery });
      if (updatedClient) {
        setGallery(newGallery);
        setPendingPhoto(null);
        setPhotoMeta({ type: 'Normal', serviceId: null });
        showToast('Foto guardada en galería', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al sincronizar con la nube', 'error');
    }
  };

  const handlePhotoDelete = async (index) => {
    if (!await confirm('¿Deseas eliminar esta foto de la galería?')) return;
    try {
      const newGallery = gallery.filter((_, i) => i !== index);
      setGallery(newGallery);
      await onUpdate({ work_gallery: newGallery });
      showToast('Foto eliminada');
    } catch (e) {
      showToast('Error al eliminar foto', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handlePhotoCaptured(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Volver al Listado
        </button>
        <button 
          onClick={onDelete}
          style={{ 
            color: '#ff453a', 
            background: 'rgba(255, 69, 58, 0.1)', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          Eliminar Ficha
        </button>
      </div>
      
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Mobile: Combined User Info + Ficha Técnica Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* User Info Column */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', border: '2px solid var(--border-color)' }}>
                  <User size={36} color="var(--gold-primary)" />
                </div>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input className="form-input" value={editData.name} onChange={e => setEditData({...editData, name: formatName(e.target.value)})} placeholder="Nombre" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    <input className="form-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Teléfono" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    <button className="btn-gold" onClick={() => { onUpdate(editData); setIsEditing(false); }} style={{ fontSize: '12px', padding: '8px' }}>Guardar</button>
                    <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px' }}>Cancelar</button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ fontSize: '15px', marginBottom: '4px', fontWeight: '800' }}>{client.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '8px' }}>V-{client.id_card || '00.000.000'}</p>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px' }}>
                      <Phone size={10} color="var(--gold-primary)" /> {client.phone}
                    </p>
                    <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '6px', borderRadius: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{history.length}</span> Visitas
                    </div>
                  </>
                )}
              </div>
              {/* Ficha Técnica Column */}
              <div>
                <h4 style={{ marginBottom: '10px', fontSize: '13px', fontWeight: '800' }}>Ficha Técnica Capilar</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <DetailItem label="Cabello" value={client.hair_type || 'Normal'} />
                  <DetailItem label="Cuero" value={client.scalp_type || 'Normal'} />
                  <DetailItem label="Cumple" value={client.birth_date ? new Date(client.birth_date + 'T00:00:00').toLocaleDateString([], {day: '2-digit', month: 'short'}) : 'N/A'} />
                  <DetailItem label="Registro" value={client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'} />
                </div>
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    style={{ width: '100%', marginTop: '10px', background: 'none', border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)', padding: '5px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
            {isEditing && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input className="form-input" value={editData.id_card} onChange={e => setEditData({...editData, id_card: e.target.value})} placeholder="Cédula" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                <BirthdayTextInput value={editData.birth_date} onChange={e => setEditData({...editData, birth_date: e.target.value})} style={{ width: '100%' }} />
                <AstroSelect 
                  label="Tipo de Cabello"
                  value={editData.hair_type}
                  onChange={(val) => setEditData({...editData, hair_type: val})}
                  options={[
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Graso', value: 'Graso' },
                    { label: 'Seco', value: 'Seco' },
                    { label: 'Mixto', value: 'Mixto' }
                  ]}
                />
                <AstroSelect 
                  label="Cuero Cabelludo"
                  value={editData.scalp_type}
                  onChange={(val) => setEditData({...editData, scalp_type: val})}
                  options={[
                    { label: 'Sano', value: 'Sano' },
                    { label: 'Sensible', value: 'Sensible' },
                    { label: 'Irritado', value: 'Irritado' },
                    { label: 'Caspa', value: 'Caspa' }
                  ]}
                />
              </div>
            )}
          </div>

          {/* Mobile: History (last 5 + show more) */}
          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--gold-primary)" /> Historial de Servicios
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Loader2 className="animate-spin" size={16} /> Cargando...
                </div>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay historial registrado.</p>
              ) : (
                <>
                  {(showAllHistory ? history : history.slice(0, 5)).map(h => (
                    <HistoryItem 
                      key={h.id} 
                      date={new Date(h.created_at).toLocaleString('es-VE', { 
                        day: 'numeric', 
                        month: 'numeric', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                      })} 
                      service={h.service_name || h.description.split(' - ')[0].replace('Servicio: ', '')} 
                      price={h.amount} 
                      onClick={() => setSelectedVisit(h)}
                    />
                  ))}
                  {history.length > 5 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: showAllHistory ? 'rgba(255,255,255,0.03)' : 'rgba(212,175,55,0.08)', 
                        border: '1px solid var(--gold-primary)', 
                        color: 'var(--gold-primary)', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '13px',
                        marginTop: '4px'
                      }}
                    >
                      {showAllHistory ? '↑ Ver menos' : `↓ Ver más servicios (${history.length - 5})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile: Gallery */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="var(--gold-primary)" /> Galería de Trabajos
              </h4>
              <button 
                onClick={() => setShowCollage(!showCollage)}
                style={{ 
                  background: showCollage ? 'var(--gold-primary)' : 'rgba(212,175,55,0.1)', 
                  border: '1px solid var(--gold-primary)', 
                  color: showCollage ? 'black' : 'var(--gold-primary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: '800'
                }}
              >
                <ColumnsIcon size={14} /> {showCollage ? 'Ver Galería' : 'Crear Comparativa'}
              </button>
            </div>

            {showCollage ? (
              <div className="animate-scale-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => setSelectingFor('A')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'A' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoA ? (
                      <img src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>ANTES</div>
                  </div>

                  <div 
                    onClick={() => setSelectingFor('B')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'B' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoB ? (
                      <img src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>DESPUÉS</div>
                  </div>
                </div>

                {photoA && photoB ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <BeforeAfterSlider 
                      photoA={photoA} 
                      photoB={photoB} 
                      sliderPos={sliderPos} 
                      setSliderPos={setSliderPos} 
                    />
                    <button 
                      onClick={handleDownloadComparison}
                      className="btn-gold" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <Download size={18} /> Descargar Comparativa
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Selecciona dos fotos para generar el collage
                  </div>
                )}

                <AnimatedModal isOpen={!!selectingFor}>
                  {(overlayClass, cardClass) => (
                    <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                      <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                          <h4 style={{ 
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <ImageIcon size={20} color="var(--gold-primary)" />
                            <span>Elegir Foto {selectingFor}</span>
                          </h4>
                          <button onClick={() => setSelectingFor(null)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                          {gallery
                            .filter(img => selectingFor === 'A' ? img.type === 'Antes' : img.type === 'Después')
                            .map((img, i) => (
                            <div 
                              key={i} 
                              onClick={() => {
                                if (selectingFor === 'A') setPhotoA(img.url);
                                if (selectingFor === 'B') setPhotoB(img.url);
                                setSelectingFor(null);
                              }}
                              style={{ 
                                aspectRatio: '1/1', 
                                borderRadius: '8px', 
                                overflow: 'hidden', 
                                cursor: 'pointer',
                                border: (selectingFor === 'A' ? photoA === img.url : photoB === img.url) ? '3px solid var(--gold-primary)' : 'none'
                              }}
                            >
                              <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatedModal>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }} className="group">
                    <img src={img.url || img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                      {img.type || 'FOTO'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePhotoDelete(i); }}
                      style={{ 
                        position: 'absolute', top: '8px', right: '8px', 
                        backgroundColor: 'rgba(255, 69, 58, 0.8)', 
                        border: 'none', borderRadius: '8px', color: 'white', 
                        padding: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff453a'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.8)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div 
                  onClick={() => setShowCamera(true)}
                  style={{ aspectRatio: '1/1', backgroundColor: 'rgba(212,175,55,0.02)', borderRadius: '12px', border: '2px dashed var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.02)'}
                >
                  <Camera size={24} color="var(--gold-primary)" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 300px) 1fr', gap: '32px' }}>
        {/* Left Sidebar: Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid var(--border-color)' }}>
              <User size={64} color="var(--gold-primary)" />
            </div>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input className="form-input" value={editData.name} onChange={e => setEditData({...editData, name: formatName(e.target.value)})} placeholder="Nombre" style={{ width: '100%' }} />
                <input className="form-input" value={editData.id_card} onChange={e => setEditData({...editData, id_card: e.target.value})} placeholder="Cédula" style={{ width: '100%' }} />
                <input className="form-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Teléfono" style={{ width: '100%' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginBottom: '8px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Cumpleaños</label>
                  <BirthdayTextInput value={editData.birth_date} onChange={e => setEditData({...editData, birth_date: e.target.value})} style={{ width: '100%' }} />
                </div>
                <AstroSelect 
                  label="Tipo de Cabello"
                  value={editData.hair_type}
                  onChange={(val) => setEditData({...editData, hair_type: val})}
                  options={[
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Graso', value: 'Graso' },
                    { label: 'Seco', value: 'Seco' },
                    { label: 'Mixto', value: 'Mixto' }
                  ]}
                  style={{ marginBottom: '12px' }}
                />
                <AstroSelect 
                  label="Cuero Cabelludo"
                  value={editData.scalp_type}
                  onChange={(val) => setEditData({...editData, scalp_type: val})}
                  options={[
                    { label: 'Sano', value: 'Sano' },
                    { label: 'Sensible', value: 'Sensible' },
                    { label: 'Irritado', value: 'Irritado' },
                    { label: 'Caspa', value: 'Caspa' }
                  ]}
                  style={{ marginBottom: '12px' }}
                />
                <button className="btn-gold" onClick={() => { onUpdate(editData); setIsEditing(false); }}>Actualizar Ficha</button>
                <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px' }}>Cancelar</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{client.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>V-{client.id_card || '00.000.000'}</p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Phone size={14} color="var(--gold-primary)" /> {client.phone}
                </p>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                  <span style={{ color: 'var(--gold-primary)', fontWeight: '700' }}>{history.length}</span> Visitas registradas
                </div>
              </>
            )}
          </div>

          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>Ficha Técnica Capilar</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <DetailItem label="Tipo de Cabello" value={client.hair_type || 'Normal'} />
              <DetailItem label="Cuero Cabelludo" value={client.scalp_type || 'Normal'} />
              <DetailItem label="Cumpleaños" value={client.birth_date ? new Date(client.birth_date + 'T00:00:00').toLocaleDateString([], {day: '2-digit', month: 'long', year: 'numeric'}) : 'No registrado'} />
              <DetailItem label="Registrado" value={client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'} />
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                style={{ width: '100%', marginTop: '20px', background: 'none', border: '1px solid var(--gold-primary)', color: 'var(--gold-primary)', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Editar Perfil
              </button>
            )}
          </div>
        </div>
        
        {/* Right Content: History & Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="var(--gold-primary)" /> Galería de Trabajos
              </h4>
              <button 
                onClick={() => setShowCollage(!showCollage)}
                style={{ 
                  background: showCollage ? 'var(--gold-primary)' : 'rgba(212,175,55,0.1)', 
                  border: '1px solid var(--gold-primary)', 
                  color: showCollage ? 'black' : 'var(--gold-primary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: '800'
                }}
              >
                <ColumnsIcon size={14} /> {showCollage ? 'Ver Galería' : 'Crear Comparativa'}
              </button>
            </div>

            {showCollage ? (
              <div className="animate-scale-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div 
                    onClick={() => setSelectingFor('A')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'A' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoA ? (
                      <img src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>ANTES</div>
                  </div>

                  <div 
                    onClick={() => setSelectingFor('B')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: selectingFor === 'B' ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoB ? (
                      <img src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="rgba(255,255,255,0.05)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)' }}>DESPUÉS</div>
                  </div>
                </div>

                {photoA && photoB ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <BeforeAfterSlider 
                      photoA={photoA} 
                      photoB={photoB} 
                      sliderPos={sliderPos} 
                      setSliderPos={setSliderPos} 
                    />
                    <button 
                      onClick={handleDownloadComparison}
                      className="btn-gold" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <Download size={18} /> Descargar Comparativa
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Selecciona dos fotos para generar el collage
                  </div>
                )}

                <AnimatedModal isOpen={!!selectingFor}>
                  {(overlayClass, cardClass) => (
                    <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                      <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: '900' }}>Elegir Foto {selectingFor}</h4>
                          <button onClick={() => setSelectingFor(null)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                          {gallery
                            .filter(img => selectingFor === 'A' ? img.type === 'Antes' : img.type === 'Después')
                            .map((img, i) => (
                            <div 
                              key={i} 
                              onClick={() => {
                                if (selectingFor === 'A') setPhotoA(img.url);
                                if (selectingFor === 'B') setPhotoB(img.url);
                                setSelectingFor(null);
                              }}
                              style={{ 
                                aspectRatio: '1/1', 
                                borderRadius: '8px', 
                                overflow: 'hidden', 
                                cursor: 'pointer',
                                border: (selectingFor === 'A' ? photoA === img.url : photoB === img.url) ? '3px solid var(--gold-primary)' : 'none'
                              }}
                            >
                              <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatedModal>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }} className="group">
                    <img src={img.url || img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '8px', fontSize: '9px', fontWeight: '800', color: 'var(--gold-primary)' }}>
                      {img.type || 'FOTO'}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePhotoDelete(i); }}
                      style={{ 
                        position: 'absolute', top: '8px', right: '8px', 
                        backgroundColor: 'rgba(255, 69, 58, 0.8)', 
                        border: 'none', borderRadius: '8px', color: 'white', 
                        padding: '6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        transition: '0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff453a'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.8)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div 
                  onClick={() => setShowCamera(true)}
                  style={{ aspectRatio: '1/1', backgroundColor: 'rgba(212,175,55,0.02)', borderRadius: '12px', border: '2px dashed var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.02)'}
                >
                  <Camera size={24} color="var(--gold-primary)" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
            )}
          </div>

          <div className="glass-card">
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--gold-primary)" /> {isMobile ? 'Historial de Servicios' : 'Historial de Visitas'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHistory ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Loader2 className="animate-spin" size={16} /> Cargando...
                </div>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay historial registrado.</p>
              ) : (
                <>
                  {(showAllHistory ? history : history.slice(0, 5)).map(h => (
                    <HistoryItem 
                      key={h.id} 
                      date={h.created_at ? new Date(h.created_at).toLocaleString('es-VE', { 
                        day: 'numeric', 
                        month: 'numeric', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: true 
                      }) : 'Fecha no registrada'} 
                      service={h.service_name || h.description.split(' - ')[0].replace('Servicio: ', '')} 
                      price={h.amount} 
                      onClick={() => setSelectedVisit(h)}
                    />
                  ))}
                  {history.length > 5 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: showAllHistory ? 'rgba(255,255,255,0.03)' : 'rgba(212,175,55,0.08)', 
                        border: '1px solid var(--gold-primary)', 
                        color: 'var(--gold-primary)', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '13px',
                        marginTop: '4px'
                      }}
                    >
                      {showAllHistory ? '↑ Ver menos' : `↓ Ver más servicios (${history.length - 5})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <AstroCamera 
            onCapture={handlePhotoCaptured} 
            onClose={() => setShowCamera(false)} 
            overlayClass={overlayClass}
            cardClass={cardClass}
          />
        )}
      </AnimatedModal>

      <VisitDetailModal 
        isOpen={!!selectedVisit}
        visit={selectedVisit || {}} 
        onClose={() => setSelectedVisit(null)} 
        gallery={gallery}
      />

      <AnimatedModal isOpen={!!pendingPhoto}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`glass-card ${cardClass}`} style={{ maxWidth: '400px', width: '100%', borderRadius: '32px', padding: '24px', border: '1.5px solid rgba(212,175,55,0.3)' }}>
              <h3 style={{ 
                marginBottom: '20px', 
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Camera size={22} color="var(--gold-primary)" />
                <span>Configurar <span className="text-gold">Foto</span></span>
              </h3>
              
              <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
                <img src={pendingPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <AstroSelect 
                  label="TIPO DE FOTO"
                  value={photoMeta.type}
                  onChange={(val) => setPhotoMeta({ ...photoMeta, type: val })}
                  options={[
                    { label: 'Normal / General', value: 'Normal' },
                    { label: 'Antes (Before)', value: 'Antes' },
                    { label: 'Después (After)', value: 'Después' }
                  ]}
                />

                <AstroSelect 
                  label="ASOCIAR A VISITA (OPCIONAL)"
                  value={photoMeta.serviceId}
                  onChange={(val) => setPhotoMeta({ ...photoMeta, serviceId: val })}
                  options={[
                    { label: 'Ninguna', value: null },
                    ...history.map(h => ({ 
                      label: `${new Date(h.created_at).toLocaleDateString()} - ${h.services?.name || h.description.split(' - ')[0].replace('Servicio: ', '')}`, 
                      value: h.id 
                    }))
                  ]}
                />

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button onClick={() => setPendingPhoto(null)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'white', fontWeight: '700' }}>CANCELAR</button>
                  <button onClick={confirmSavePhoto} className="btn-gold" style={{ flex: 1, height: '48px', borderRadius: '14px' }}>GUARDAR FOTO</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
};

const VisitDetailModal = ({ isOpen, visit, onClose, gallery = [] }) => {
  if (!visit || Object.keys(visit).length === 0) return null;

  const servicePhotos = gallery.filter(img => img.service_id === visit.id);
  const servicePriceBs = (visit.service_price || 0) * (visit.exchange_rate || 0);
  const totalBs = visit.payment_metadata?.transfer_bs || (visit.amount * (visit.exchange_rate || 0));

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`glass-card ${cardClass}`} style={{ maxWidth: '480px', width: '100%', borderRadius: '28px', padding: '32px', border: '1.5px solid rgba(212,175,55,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Receipt size={22} color="var(--gold-primary)" />
                <span>Recibo de <span className="text-gold">Visita</span></span>
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', paddingBottom: '20px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha y Hora</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>
                    {visit.created_at ? new Date(visit.created_at).toLocaleString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Fecha no registrada'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Barbero</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{visit.barber_name || 'No especificado'}</span>
                </div>
              </div>

              {/* Invoice Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--gold-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Detalle de Cargos</label>
                
                {/* Main Service */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{visit.service_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Servicio Base</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>${visit.service_price}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{servicePriceBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                  </div>
                </div>

                {/* Extras */}
                {visit.payment_metadata?.extras && visit.payment_metadata.extras.length > 0 && (
                  visit.payment_metadata.extras.map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>+ {ex.name}</div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>${ex.price}</div>
                    </div>
                  ))
                )}

                {/* Products */}
                {visit.payment_metadata?.products_sold && visit.payment_metadata.products_sold.length > 0 && (
                  visit.payment_metadata.products_sold.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{p.name} (x{p.quantity})</div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>${(p.price * p.quantity).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Section */}
              <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '2px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TOTAL A PAGAR</label>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gold-primary)', lineHeight: '1' }}>${visit.amount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>TASA: {visit.exchange_rate} Bs.</div>
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ padding: '16px', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.1)' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>MÉTODO DE PAGO</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px' }}>{visit.payment_method}</span>
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#34c759', backgroundColor: 'rgba(52,199,89,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{visit.status?.toUpperCase() || 'PAGADO'}</span>
                </div>
                {visit.payment_metadata?.method_bs && visit.payment_metadata.method_bs !== visit.payment_method && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>M. Secundario</span>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{visit.payment_metadata.method_bs}</span>
                  </div>
                )}
              </div>

              {/* Photos */}
              {servicePhotos.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Fotos de esta visita</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {servicePhotos.map((p, i) => (
                      <div key={i} style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                        <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={onClose} className="btn-gold" style={{ width: '100%', marginTop: '32px', height: '52px', borderRadius: '16px', fontWeight: '900' }}>CERRAR RECIBO</button>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{label}</span>
    <span style={{ fontWeight: '600', fontSize: '14px' }}>{value}</span>
  </div>
);

const HistoryItem = ({ date, service, price, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '16px', 
      backgroundColor: 'var(--bg-tertiary)', 
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid transparent'
    }}
    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--gold-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div>
      <div style={{ fontWeight: '700', fontSize: '15px', color: 'white' }}>{service}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{date}</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: '800', color: 'var(--gold-primary)', fontSize: '16px' }}>${price}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>VER DETALLE</div>
    </div>
  </div>
);

 export default ClientModule;

const BeforeAfterSlider = ({ photoA, photoB, sliderPos, setSliderPos }) => {
  const containerRef = useRef(null);

  const handleMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      style={{ 
        position: 'relative', 
        width: '100%', 
        aspectRatio: '4/3', 
        borderRadius: '20px', 
        overflow: 'hidden', 
        cursor: 'ew-resize',
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}
    >
      {/* Photo B (After) - Background */}
      <img src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      
      {/* Photo A (Before) - Foreground with Clip */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
      }}>
        <img src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* Slider Handle */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        bottom: 0, 
        left: `${sliderPos}%`, 
        width: '2px', 
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          color: 'var(--gold-primary)'
        }}>
          <ColumnsIcon size={18} style={{ transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {/* Labels */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'white', pointerEvents: 'none' }}>ANTES</div>
      <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(212,175,55,0.8)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'black', pointerEvents: 'none' }}>DESPUÉS</div>
    </div>
  );
};
