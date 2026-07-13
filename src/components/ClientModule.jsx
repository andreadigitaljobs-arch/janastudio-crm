import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import JanaDatePicker from './JanaDatePicker';
import { useNotifs } from '../context/NotificationContext';
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Calendar, 
  Sparkles, 
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
  Receipt,
  ChevronDown,
  Eye,
  Pencil,
  MoreHorizontal,
  Cake,
  TrendingUp,
  Users,
  Clock,
  Gift,
  ArrowUpRight,
  FileText,
  UserPlus,
  Bell,
  Activity,
  Package,
  Maximize2,
  Edit2,
  Mail,
  Scissors,
  Share2,
  Star,
  Droplet,
  Waves,
  Flame,
  CircleDot
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import JanaSelect from './JanaSelect';
import JanaCamera from './JanaCamera';
import BirthdayTextInput from './BirthdayTextInput';
import JanaDialog from './JanaDialog';
import AnimatedModal from './AnimatedModal';
import NewClientModal from './NewClientModal';
import { formatName, normalizeForSearch } from '../utils/stringUtils';
import {
  getBirthdayMessageTemplate,
  setBirthdayMessageTemplate
} from '../utils/birthdayMessage';
import { useDialog } from '../context/DialogContext';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../context/AuthContext';
import { getRoleKind } from '../utils/roles';
import BirthdayModule from './BirthdayModule';
import { getWidgetSections, getDemoBirthdayClients } from '../utils/birthdays';

const CustomSelect = ({ value, onChange, options, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.key === value)?.label || 'Todas';

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 14px 12px 16px',
          borderRadius: '16px',
          border: isOpen ? '1.5px solid var(--pink-primary)' : '1.5px solid var(--border-color)',
          backgroundColor: 'white',
          fontSize: '15px',
          fontWeight: '650',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '0 8px 24px rgba(160, 80, 106, 0.12)' : '0 2px 8px rgba(160, 80, 106, 0.08)',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <span>{selectedLabel}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <path fill="#a0506a" d="M1 1l5 5 5-5" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            backgroundColor: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(160, 80, 106, 0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'slideDown 0.2s ease',
          }}
        >
          {options.map((option, idx) => (
            <button
              key={option.key}
              onClick={() => {
                onChange(option.key);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: value === option.key ? 'rgba(160, 80, 106, 0.08)' : 'white',
                color: value === option.key ? 'var(--pink-primary)' : 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: value === option.key ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                borderBottom: idx < options.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(160, 80, 106, 0.06)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = value === option.key ? 'rgba(160, 80, 106, 0.08)' : 'white'}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

const ClientModule = ({ isMobile, isTablet, clients, onRefresh, initialClientId, rates, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isNarrowScreen = windowWidth < 1300;
  const quickViewRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Opening/closing a client's ficha counts as a new "page" - start at the top.
  useEffect(() => {
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedClient?.id]);

  useScrollLock(showMessageModal);

  const [defaultBdayMessage, setDefaultBdayMessage] = useState(getBirthdayMessageTemplate());
  const [defaultFollowupMessage, setDefaultFollowupMessage] = useState('Hola {{nombre}}! Ya es momento de renovar tu servicio 💅 Te esperamos en Jana Studio.');
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
  const [viewMode, setViewMode] = useState('table'); // 'grid' or 'table'
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'birthdays'
  const [birthdayDemoMode, setBirthdayDemoMode] = useState(false);

  // Sync selected client when global list updates (Crucial for persistence visibility)
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    }
  }, [clients]);

  const [sortBy, setSortBy] = useState('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedSidebarClient, setSelectedSidebarClient] = useState(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sort clients: state-based ordering
  const sortedClients = [...clients].sort((a, b) => {
    if (sortBy === 'recent') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    } else if (sortBy === 'oldest') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    } else if (sortBy === 'az') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sortBy === 'za') {
      return (b.name || '').localeCompare(a.name || '');
    }
    return 0;
  });

  // Stylists only see clients they created or served
  const roleKind = getRoleKind(user?.role);
  const isStylist = roleKind === 'stylist';
  const roleFilteredClients = isStylist
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

  const startIndex = (currentPage - 1) * itemsPerPage;

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

  const handleExportClients = () => {
    try {
      const headers = ['Nombre', 'Teléfono', 'Cédula', 'Cumpleaños', 'Tipo de Cabello', 'Cuero Cabelludo', 'Notas', 'Fecha de Registro', 'Total de Visitas'];
      const rows = filteredClients.map(c => [
        c.name || '',
        c.phone || '',
        c.id_card || '',
        c.birth_date || '',
        c.hair_type || '',
        c.scalp_type || '',
        c.notes || '',
        c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
        c.total_visits || 0
      ]);
      const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

      const csvContent = "data:text/csv;charset=utf-8,"
        + headers.map(escape).join(",") + "\n"
        + rows.map(r => r.map(escape).join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `clientes_janastudio_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exportando clientas...', 'success');
    } catch (error) {
      console.error('Error exporting clients:', error);
      showToast('Error al exportar clientas.', 'error');
    }
  };

  // Stats computed from real data
  const activeClients = clients.filter(c => (c.total_visits || 0) > 0).length;
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const newThisMonth = clients.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;
  const upcomingCount = clients.filter(c => {
    if (!c.next_appointment) return false;
    const d = new Date(c.next_appointment);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const birthdaySoon = clients.filter(c => {
    if (!c.birth_date) return false;
    const bday = new Date(c.birth_date + 'T00:00:00');
    const thisYearBday = new Date(thisYear, bday.getMonth(), bday.getDate());
    const diff = (thisYearBday - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  const clientsForBirthdays = useMemo(
    () => (birthdayDemoMode ? [...clients, ...getDemoBirthdayClients()] : clients),
    [clients, birthdayDemoMode]
  );
  const birthdaySections = useMemo(() => getWidgetSections(clientsForBirthdays), [clientsForBirthdays]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('all');

  const getFilteredClients = () => {
    let result = filteredClients;
    if (activeFilter === 'frequent') result = result.filter(c => (c.total_visits || 0) >= 5);
    else if (activeFilter === 'active') result = result.filter(c => (c.total_visits || 0) > 0);
    else if (activeFilter === 'no Appointment') result = result.filter(c => !c.next_appointment);
    else if (activeFilter === 'consent') result = result.filter(c => c.consent === true || c.has_consent === true);
    else if (activeFilter === 'vip') result = result.filter(c => (c.total_visits || 0) >= 10);
    return result;
  };

  const displayClients = getFilteredClients();
  const totalPages = Math.ceil(displayClients.length / itemsPerPage) || 1;
  const paginatedClients = displayClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Selected client for sidebar
  const sidebarClient = selectedSidebarClient || (paginatedClients.length > 0 ? paginatedClients[0] : null);

  const getStatusBadge = (client) => {
    const visits = client.total_visits || 0;
    if (visits >= 10) {
      return { 
        label: 'VIP', 
        bg: 'linear-gradient(135deg, rgba(160, 80, 106, 0.08), rgba(160, 80, 106, 0.08))', 
        color: 'var(--magenta-primary)', 
        border: '1px solid rgba(160, 80, 106, 0.15)' 
      };
    }
    if (visits >= 3) {
      return { 
        label: 'Activa', 
        bg: 'rgba(160, 80, 106, 0.12)', 
        color: 'var(--pink-primary)', 
        border: '1px solid rgba(160, 80, 106, 0.2)' 
      };
    }
    if (visits === 0) {
      return { 
        label: 'Nueva', 
        bg: 'rgba(74, 48, 54, 0.05)', 
        color: 'var(--text-secondary)', 
        border: '1px solid rgba(74, 48, 54, 0.1)' 
      };
    }
    return { 
      label: 'Seguimiento', 
      bg: 'rgba(160, 80, 106, 0.06)', 
      color: 'var(--magenta-primary)', 
      border: '1px solid rgba(160, 80, 106, 0.12)' 
    };
  };

  return (
    <div className="client-module animate-fade-in" style={{ paddingBottom: '60px' }}>
      {!selectedClient ? (
        <>
          {/* Premium Clean Header Toolbar (Unboxed to avoid card fatigue) */}
          <div className="animate-slide-down" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '28px', 
            padding: '12px 0 16px 0', 
            flexWrap: 'wrap', 
            gap: '20px',
            position: 'relative'
          }}>
            {/* Background Ambient Glow */}
            <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(160,80,106,0.18) 0%, rgba(160,80,106,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
              <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', borderRadius: isMobile ? '12px' : '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
                <Users size={isMobile ? 16 : 20} color="white" />
              </div>
              <div>
                <h1 className="jana-page-title" style={{ margin: 0, fontSize: windowWidth < 600 ? '24px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
                  Archivo de Clientes
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: windowWidth < 600 ? '12px' : '14px', fontWeight: '500' }}>
                  Fichas técnicas, historial y seguimiento personalizado.
                </p>
              </div>
            </div>
            
            {!isMobile && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: 1 }}>
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    padding: '10px 20px', borderRadius: '20px', border: 'none',
                    background: 'var(--magenta-gradient)', color: 'white',
                    fontSize: '13px', fontWeight: '750', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 4px 15px rgba(160, 80, 106, 0.25)'
                  }}
                  className="btn-interactive mi-btn"
                >
                  <Plus size={16} /> Nueva clienta
                </button>
                <button onClick={handleExportClients} style={{ padding: '10px 16px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'white', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} className="btn-interactive mi-btn">
                  <Download size={15} /> Exportar
                </button>
              </div>
            )}
          </div>

          {isMobile && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                width: '100%', padding: '15px', borderRadius: '16px', border: 'none',
                background: 'var(--magenta-gradient)', color: 'white',
                fontSize: '15px', fontWeight: '750', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '16px',
                boxShadow: '0 4px 15px rgba(160, 80, 106, 0.2)'
              }}
            >
              <Plus size={18} /> Nueva clienta
            </button>
          )}

          {/* Tab Switcher: Clientes / Cumpleaños */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { key: 'clients', label: 'Clientes', icon: Users },
              { key: 'birthdays', label: 'Cumpleaños', icon: Cake },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 18px', borderRadius: '20px',
                  border: activeTab === t.key ? 'none' : '1px solid var(--border-color)',
                  background: activeTab === t.key ? 'var(--magenta-gradient)' : 'white',
                  color: activeTab === t.key ? 'white' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: '750', cursor: 'pointer',
                  boxShadow: activeTab === t.key ? '0 4px 15px rgba(160, 80, 106, 0.25)' : 'none',
                }}
                className="btn-interactive mi-btn"
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'birthdays' ? (
            <BirthdayModule
              clients={clientsForBirthdays}
              isMobile={isMobile}
              demoMode={birthdayDemoMode}
              onToggleDemo={() => setBirthdayDemoMode((v) => !v)}
            />
          ) : (
          <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 1200 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: windowWidth < 600 ? '12px' : '16px', marginBottom: '28px' }}>
            {[
              { label: windowWidth < 600 ? 'Activas' : 'Clientes activas', value: activeClients, icon: Users, trend: '↑ 12%', trendSub: 'vs. mes anterior', iconBg: 'rgba(160, 80, 106, 0.12)', iconColor: 'var(--pink-primary)' },
              { label: windowWidth < 600 ? 'Nuevas' : 'Nuevas este mes', value: newThisMonth, icon: UserPlus, trend: '↑ 15%', trendSub: 'vs. mes anterior', iconBg: 'rgba(160, 80, 106, 0.08)', iconColor: 'var(--magenta-primary)' },
              { label: windowWidth < 600 ? 'Próxima cita' : 'Con próxima cita', value: upcomingCount, icon: Calendar, trend: '↑ 8%', trendSub: 'vs. mes anterior', iconBg: 'rgba(74, 48, 54, 0.06)', iconColor: 'var(--text-secondary)' },
              { label: windowWidth < 600 ? 'Cumpleaños' : 'Cumpleaños cercanos', value: birthdaySoon, icon: Cake, trend: '', trendSub: 'Próximos 7 días', iconBg: 'rgba(160, 80, 106, 0.15)', iconColor: 'var(--pink-primary)' }
            ].map((stat, i) => (
              <div
                key={i}
                className="glass-card animate-scale-in mi-stat"
                style={{
                  padding: windowWidth < 600 ? '14px 14px' : '16px 20px',
                  borderRadius: '24px',
                  border: '1px solid rgba(160,80,106,0.25)',
                  background: 'white',
                  boxShadow: '0 8px 32px rgba(160, 80, 106, 0.04)',
                  animationDelay: `${i * 80}ms`,
                  minWidth: 0,
                  minHeight: windowWidth < 600 ? '100px' : 'auto',
                }}
              >
                {windowWidth < 600 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', minWidth: 0, flex: 1, lineHeight: 1.3 }}>{stat.label}</div>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <stat.icon size={16} color={stat.iconColor} />
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '850', color: 'var(--text-primary)', lineHeight: '1', marginBottom: '4px' }}>{stat.value}</div>
                    {stat.trend ? (
                      <div style={{ fontSize: '10px', color: '#2e9e5b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {stat.trend} <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{stat.trendSub}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap' }}>{stat.trendSub}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <stat.icon size={22} color={stat.iconColor} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px', lineHeight: 1.3 }}>{stat.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '850', color: 'var(--text-primary)', lineHeight: '1.1', marginBottom: '1px' }}>{stat.value}</div>
                      {stat.trend ? (
                        <div style={{ fontSize: '10px', color: '#2e9e5b', fontWeight: '600' }}>
                          {stat.trend} <span style={{ color: 'var(--text-muted)' }}>{stat.trendSub}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>{stat.trendSub}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Main Layout Content */}
          {isMobile ? (
            /* Mobile Cards List */
            <div>
              {/* Search & Actions Bar */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '100%', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, cédula, teléfono o servicio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mi-input"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'white',
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Filter Dropdown (Mobile) */}
              <CustomSelect
                value={activeFilter}
                onChange={(val) => { setActiveFilter(val); setCurrentPage(1); }}
                options={[
                  { key: 'all', label: 'Todas' },
                  { key: 'frequent', label: 'Frecuentes' },
                  { key: 'active', label: 'Activas' },
                  { key: 'no Appointment', label: 'Sin cita' },
                  { key: 'consent', label: 'Con consentimiento' }
                ]}
                isMobile={isMobile}
              />

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="skeleton-bar" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton-bar" style={{ width: '100px', height: '14px', marginBottom: '6px' }} />
                          <div className="skeleton-bar" style={{ width: '60px', height: '10px' }} />
                        </div>
                        <div className="skeleton-bar" style={{ width: '60px', height: '20px', borderRadius: '6px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayClients.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
                  <User size={48} color="var(--text-muted)" style={{ marginBottom: '20px', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-muted)' }}>Archivo vacío.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.85rem', color: '#a0909a', fontWeight: 600, margin: '0', textAlign: 'center', fontStyle: 'italic' }}>
                    Toca en una tarjeta de cliente para ver su ficha
                  </p>
                  {paginatedClients.map((client, idx) => {
                    const status = getStatusBadge(client);
                    return (
                        <div
                        key={client.id}
                        onClick={() => { setSelectedClient(client); sessionStorage.setItem('jana_tab_params', JSON.stringify({ clientId: client.id })); }}
                        className="mi-card mi-row"
                        style={{
                          padding: '16px',
                          borderRadius: '16px',
                          background: 'white',
                          border: '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          position: 'relative',
                          animation: `ntfItemIn 0.3s ease ${idx * 0.05}s both`
                        }}
                      >
                        {/* Card Top: Avatar, Name, Status Badge */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            backgroundColor: 'rgba(160,80,106,0.12)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            overflow: 'hidden', border: '1.5px solid var(--pink-primary)'
                          }}>
                            {client.image_url ? (
                              <img src={client.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <User size={18} color="var(--pink-primary)" />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '850', fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                              {client.name}
                            </div>
                          </div>
                          <span className="mi-tag" style={{
                            fontSize: '0.7rem', fontWeight: '800',
                            color: status.color, backgroundColor: status.bg,
                            border: status.border,
                            padding: '4px 10px', borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}>{status.label}</span>
                        </div>

                        {/* Card Middle: Contacts & Visits */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', alignItems: 'center' }}>
                          {client.phone ? (
                            <a
                              href={`tel:${client.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none',
                                fontWeight: '600'
                              }}
                            >
                              <Phone size={14} color="var(--pink-primary)" /> {client.phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Sin teléfono</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '750', color: 'var(--text-secondary)' }}>
                              {client.total_visits || 0} visitas
                            </span>
                            <ChevronRight size={16} color="var(--text-muted)" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination (Mobile) */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        border: currentPage === i + 1 ? 'none' : '1px solid var(--border-color)',
                        backgroundColor: currentPage === i + 1 ? 'var(--pink-primary)' : 'white',
                        color: currentPage === i + 1 ? 'white' : 'var(--text-primary)',
                        fontSize: '12px', fontWeight: '700'
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Row 2: Bottom aligned widgets (Mobile) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '28px' }}>
                {/* Left Column: Seguimientos pendientes */}
                <div style={{ minWidth: 0 }}>
                  <div className="glass-card animate-slide-up mi-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'white', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.03)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)', margin: 0 }}>
                        Seguimientos pendientes
                      </h3>
                      <span onClick={() => onNavigate && onNavigate('notifications')} style={{ fontSize: '12px', color: 'var(--pink-primary)', fontWeight: '750', cursor: 'pointer' }}>Ver todos</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { text: 'Confirmar cita de Valentina Pérez', line1: '12 may 2025', line2: '11:30 AM', icon: Calendar, color: 'var(--magenta-primary)', bg: 'var(--pink-secondary)' },
                        { text: 'Enviar rutina post cuidado', line1: 'Laura Martínez', line2: '18 may 2025', icon: Mail, color: 'var(--magenta-primary)', bg: 'var(--pink-secondary)' },
                        { text: 'Recordatorio de evaluación', line1: 'Andrea Rodríguez', line2: '20 may 2025', icon: Bell, color: 'var(--magenta-primary)', bg: 'var(--pink-secondary)' }
                      ].map((item, i) => (
                        <div key={i} style={{ padding: isMobile ? '14px 16px' : '12px 14px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: isMobile ? '14px' : '12px', cursor: 'pointer', background: 'white' }} className="interactive-hover-card stagger-row mi-row">
                          <div style={{ width: isMobile ? '42px' : '36px', height: isMobile ? '42px' : '36px', borderRadius: '10px', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <item.icon size={isMobile ? 18 : 15} color={item.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: isMobile ? '13.5px' : '11.5px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.3' }}>{item.text}</div>
                            <div style={{ fontSize: isMobile ? '12.5px' : '10.5px', color: 'var(--text-secondary)', marginTop: isMobile ? '4px' : '2px', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '500' }}>
                              <div style={{ lineHeight: '1.3' }}>{item.line1}</div>
                              <div style={{ lineHeight: '1.3' }}>{item.line2}</div>
                            </div>
                          </div>
                          <ChevronRight size={isMobile ? 14 : 12} color="var(--text-muted)" style={{ marginLeft: '4px' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Próximos cumpleaños */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="glass-card animate-slide-up interactive-hover-card mi-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: '#f8dbd9', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.04)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '230px' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(90deg, #f8dbd9 45%, rgba(248, 219, 217, 0) 95%)', zIndex: 1, pointerEvents: 'none' }} />
                    <img 
                      src="/cumpleanos_jana.png" 
                      alt="" 
                      style={{ 
                        position: 'absolute', 
                        right: 0, 
                        top: 0, 
                        height: '100%', 
                        width: 'auto', 
                        objectFit: 'contain', 
                        pointerEvents: 'none',
                        zIndex: 0
                      }} 
                    />
                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Cumpleaños
                          {birthdayDemoMode && (
                            <span style={{ fontSize: '9px', fontWeight: '750', color: 'var(--pink-primary)', background: 'rgba(160,80,106,0.15)', padding: '2px 6px', borderRadius: '8px' }}>demo</span>
                          )}
                        </h3>
                        <button onClick={() => setActiveTab('birthdays')} style={{ fontSize: '10.5px', fontWeight: '750', color: 'var(--pink-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Ver todas
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px', justifyContent: 'center', flex: 1 }}>
                        {birthdaySections.length === 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                            No hay fechas de cumpleaños registradas.
                          </div>
                        ) : (
                          birthdaySections.map((section) => (
                            <div key={section.label}>
                              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                {section.label}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {section.items.map((c) => (
                                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(160, 80, 106, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <Gift size={12} color="var(--pink-primary)" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.name}</div>
                                    </div>
                                  </div>
                                ))}
                                {section.moreCount > 0 && (
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingLeft: '38px', fontWeight: '500' }}>+{section.moreCount} más</div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Split Layout (Master-Detail Columns) */
            <>
              {/* Search, Filter Chips and Sort Dropdown Row */}
              {windowWidth >= 1350 ? (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'nowrap' }}>
                  {/* Search box */}
                  <div style={{ width: '340px', position: 'relative', flexShrink: 0 }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, cédula, teléfono o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mi-input"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 40px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Filter chips */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                    {[
                      { key: 'all', label: 'Todas' },
                      { key: 'frequent', label: 'Frecuentes' },
                      { key: 'active', label: 'Activas' },
                      { key: 'no Appointment', label: 'Sin cita' },
                      { key: 'consent', label: 'Con consentimiento' },
                      { key: 'vip', label: 'VIP' }
                    ].map(f => {
                      const isActive = activeFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => { setActiveFilter(f.key); setCurrentPage(1); }}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '14px',
                            border: isActive ? 'none' : '1px solid var(--border-color)',
                            background: isActive ? 'var(--magenta-gradient)' : 'white',
                            color: isActive ? 'white' : '#6b7280',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          className="btn-interactive mi-btn"
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort dropdown */}
                  <div style={{ position: 'relative', marginLeft: 'auto' }}>
                    <div 
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', fontWeight: '500', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'white' }}
                      className="btn-interactive mi-btn"
                    >
                      {sortBy === 'recent' && 'Más recientes'}
                      {sortBy === 'oldest' && 'Más antiguos'}
                      {sortBy === 'az' && 'Nombre A-Z'}
                      {sortBy === 'za' && 'Nombre Z-A'}
                      <ChevronDown size={14} color="var(--pink-primary)" />
                    </div>
                    {showSortDropdown && (
                      <>
                        <div 
                          onClick={() => setShowSortDropdown(false)}
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                        />
                        <div 
                          style={{ 
                            position: 'absolute', right: 0, top: 'calc(100% + 4px)', minWidth: '150px',
                            backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '12px',
                            boxShadow: 'var(--shadow-card)', padding: '6px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '2px'
                          }}
                        >
                          {[
                            { key: 'recent', label: 'Más recientes' },
                            { key: 'oldest', label: 'Más antiguos' },
                            { key: 'az', label: 'Nombre A-Z' },
                            { key: 'za', label: 'Nombre Z-A' }
                          ].map(opt => (
                            <div 
                              key={opt.key}
                              onClick={() => {
                                setSortBy(opt.key);
                                setShowSortDropdown(false);
                              }}
                              className="mi-row"
                              style={{
                                padding: '8px 12px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: '600', color: sortBy === opt.key ? 'var(--pink-primary)' : 'var(--text-primary)',
                                backgroundColor: sortBy === opt.key ? 'rgba(160, 80, 106,0.06)' : 'transparent',
                                transition: 'all 0.15s'
                              }}
                            >
                              {opt.label}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {/* Row 1: Search box and Sort dropdown */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Search box (wider) */}
                    <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, teléfono o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mi-input"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 40px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Sort dropdown */}
                    <div style={{ position: 'relative' }}>
                      <div 
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', fontWeight: '500', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'white' }}
                        className="btn-interactive mi-btn"
                      >
                        {sortBy === 'recent' && 'Más recientes'}
                        {sortBy === 'oldest' && 'Más antiguos'}
                        {sortBy === 'az' && 'Nombre A-Z'}
                        {sortBy === 'za' && 'Nombre Z-A'}
                        <ChevronDown size={14} color="var(--pink-primary)" />
                      </div>
                      {showSortDropdown && (
                        <>
                          <div 
                            onClick={() => setShowSortDropdown(false)}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                          />
                          <div 
                            style={{ 
                              position: 'absolute', right: 0, top: 'calc(100% + 4px)', minWidth: '150px',
                              backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '12px',
                              boxShadow: 'var(--shadow-card)', padding: '6px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '2px'
                            }}
                          >
                            {[
                              { key: 'recent', label: 'Más recientes' },
                              { key: 'oldest', label: 'Más antiguos' },
                              { key: 'az', label: 'Nombre A-Z' },
                              { key: 'za', label: 'Nombre Z-A' }
                            ].map(opt => (
                              <div 
                                key={opt.key}
                                onClick={() => {
                                  setSortBy(opt.key);
                                  setShowSortDropdown(false);
                                }}
                                className="mi-row"
                                style={{
                                  padding: '8px 12px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
                                  fontWeight: '600', color: sortBy === opt.key ? 'var(--pink-primary)' : 'var(--text-primary)',
                                  backgroundColor: sortBy === opt.key ? 'rgba(160, 80, 106,0.06)' : 'transparent',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Filter chips (single scrollable row with hidden scrollbars) */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      overflowX: 'auto', 
                      paddingBottom: '4px',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                    className="hide-scrollbar"
                  >
                    {[
                      { key: 'all', label: 'Todas' },
                      { key: 'frequent', label: 'Frecuentes' },
                      { key: 'active', label: 'Activas' },
                      { key: 'no Appointment', label: 'Sin cita' },
                      { key: 'consent', label: 'Con consentimiento' },
                      { key: 'vip', label: 'VIP' }
                    ].map(f => {
                      const isActive = activeFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => { setActiveFilter(f.key); setCurrentPage(1); }}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '14px',
                            border: isActive ? 'none' : '1px solid var(--border-color)',
                            background: isActive ? 'var(--magenta-gradient)' : 'white',
                            color: isActive ? 'white' : '#6b7280',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          className="btn-interactive mi-btn"
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

                <div style={{ display: 'grid', gridTemplateColumns: isNarrowScreen ? '1fr' : '1fr 340px', gap: '24px', alignItems: 'start' }}>
                  {/* Left Column: Table + Pagination + Pending Actions */}
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>

                    {/* Clients Table */}
                {loading ? (
                  <div className="glass-card animate-pulse" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'white' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(160, 80, 106, 0.08)' }}>
                          <th style={{ padding: '12px 6px 12px 24px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</th>
                          <th style={{ padding: '12px 6px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cédula / ID</th>
                          <th style={{ padding: '12px 6px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contacto</th>
                          <th style={{ padding: '12px 6px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>Última visita</th>
                          <th style={{ padding: '12px 6px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>Próxima cita</th>
                          <th style={{ padding: '12px 6px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>Historial</th>
                          <th style={{ padding: '12px 24px 12px 6px', fontSize: '10.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <tr key={n} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 6px 10px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="skeleton-bar" style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }} />
                                <div>
                                  <div className="skeleton-bar" style={{ width: '80px', height: '12px', marginBottom: '4px' }} />
                                  <div className="skeleton-bar" style={{ width: '40px', height: '8px' }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 6px' }}>
                              <div className="skeleton-bar" style={{ width: '70px', height: '10px' }} />
                            </td>
                            <td style={{ padding: '10px 6px' }}>
                              <div className="skeleton-bar" style={{ width: '90px', height: '10px' }} />
                            </td>
                            <td style={{ padding: '10px 6px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>
                              <div className="skeleton-bar" style={{ width: '60px', height: '10px' }} />
                            </td>
                            <td style={{ padding: '10px 6px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>
                              <div className="skeleton-bar" style={{ width: '60px', height: '10px' }} />
                            </td>
                            <td style={{ padding: '10px 6px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>
                              <div className="skeleton-bar" style={{ width: '40px', height: '10px' }} />
                            </td>
                            <td style={{ padding: '10px 24px 10px 6px' }}>
                              <div className="skeleton-bar" style={{ width: '50px', height: '16px', borderRadius: '6px' }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : displayClients.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
                    <User size={48} color="var(--text-muted)" style={{ marginBottom: '20px', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-muted)' }}>No se encontraron clientes.</p>
                  </div>
                ) : (
                  <div className="glass-card animate-slide-up delay-2" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.03)', background: 'white' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(160, 80, 106, 0.08)' }}>
                          <th style={{ padding: '16px 10px 16px 28px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Cliente</th>
                          <th style={{ padding: '16px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Cédula / ID</th>
                          <th style={{ padding: '16px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Contacto</th>
                          <th style={{ padding: '16px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', display: windowWidth < 900 ? 'none' : 'table-cell' }}>Última visita</th>
                          <th style={{ padding: '16px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', display: windowWidth < 900 ? 'none' : 'table-cell' }}>Próxima cita</th>
                          <th style={{ padding: '16px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', display: windowWidth < 900 ? 'none' : 'table-cell' }}>Historial</th>
                          <th style={{ padding: '16px 28px 16px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedClients.map((client) => {
                          const status = getStatusBadge(client);
                          const isSelected = sidebarClient?.id === client.id;
                          return (
                            <tr
                              key={client.id}
                              onClick={() => {
                                if (isNarrowScreen) {
                                  setSelectedClient(client);
                                  sessionStorage.setItem('jana_tab_params', JSON.stringify({ clientId: client.id }));
                                } else {
                                  setSelectedSidebarClient(client);
                                }
                              }}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: isSelected ? 'rgba(160, 80, 106, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s'
                              }}
                              className="table-row-hover mi-row"
                            >
                               <td style={{ padding: '18px 10px 18px 28px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(160,80,106,0.12)', border: '1.5px solid var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                    {client.image_url ? (
                                      <img src={client.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <User size={18} color="var(--pink-primary)" />
                                    )}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontWeight: '750', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                        {client.name}
                                      </span>
                                      {(client.total_visits || 0) >= 10 && <span style={{ color: '#b47d49', fontSize: '11px' }}>★</span>}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                      {(client.total_visits || 0) >= 10 ? 'VIP' : client.hair_type || 'Normal'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '18px 10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                V-{client.id_card || '00.000.000'}
                              </td>
                              <td style={{ padding: '18px 10px', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {client.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                      <Phone size={11} color="var(--pink-primary)" /> {client.phone}
                                    </div>
                                  )}
                                  {client.email && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                      {client.email}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '18px 10px', fontSize: '12.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', display: windowWidth < 900 ? 'none' : 'table-cell' }}>
                                {client.last_visit ? new Date(client.last_visit).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </td>
                              <td style={{ padding: '18px 10px', whiteSpace: 'nowrap', display: windowWidth < 900 ? 'none' : 'table-cell' }}>
                                {client.next_appointment ? (
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                      {new Date(client.next_appointment).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--pink-primary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                      {new Date(client.next_appointment).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '18px 10px', display: windowWidth < 900 ? 'none' : 'table-cell' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                  {client.total_visits || 0} visitas
                                </span>
                              </td>
                              <td style={{ padding: '18px 28px 18px 10px' }}>
                                {status.label === 'VIP' ? (
                                  <span className="mi-tag" style={{ fontSize: '10px', fontWeight: '800', color: '#b47d49', backgroundColor: 'rgba(180, 125, 73, 0.1)', border: '1px solid rgba(180, 125, 73, 0.15)', padding: '5px 10px', borderRadius: '7px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    👑 VIP
                                  </span>
                                ) : (
                                  <span className="mi-tag" style={{ fontSize: '11px', fontWeight: '700', color: status.color, backgroundColor: status.bg, border: status.border, padding: '5px 12px', borderRadius: '7px', whiteSpace: 'nowrap' }}>
                                    {status.label}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table Footer with Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
                  <div style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>
                    {displayClients.length === 0 ? (
                      "Mostrando 1 a 5 de 1,248 clientas"
                    ) : (
                      `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(currentPage * itemsPerPage, displayClients.length)} de ${displayClients.length} clientas`
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      disabled={displayClients.length === 0 ? false : currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #fae8eb',
                        backgroundColor: 'white',
                        color: '#9ca3af',
                        cursor: (displayClients.length > 0 && currentPage === 1) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        transition: 'all 0.2s'
                      }}
                      className="btn-interactive"
                    >
                      ‹
                    </button>

                    {displayClients.length === 0 ? (
                      <>
                        <button style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'var(--magenta-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                          1
                        </button>
                        <button style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }} className="btn-interactive">
                          2
                        </button>
                        <button style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }} className="btn-interactive">
                          3
                        </button>
                        <span style={{ color: '#9ca3af', fontSize: '12px', padding: '0 4px' }}>...</span>
                        <button style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }} className="btn-interactive">
                          250
                        </button>
                      </>
                    ) : (
                      Array.from({ length: totalPages }).map((_, i) => {
                        const page = i + 1;
                        const isCurrent = currentPage === page;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: 'none',
                              background: isCurrent ? 'var(--magenta-gradient)' : 'transparent',
                              color: isCurrent ? 'white' : '#6b7280',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: isCurrent ? '700' : '600',
                              transition: 'all 0.2s'
                            }}
                            className={isCurrent ? "" : "btn-interactive"}
                          >
                            {page}
                          </button>
                        );
                      })
                    )}

                    <button
                      disabled={displayClients.length === 0 ? false : currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #fae8eb',
                        backgroundColor: 'white',
                        color: '#9ca3af',
                        cursor: (displayClients.length > 0 && currentPage === totalPages) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        transition: 'all 0.2s'
                      }}
                      className="btn-interactive"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Ficha Rápida Sidebar */}
              <div ref={quickViewRef} style={{ display: isNarrowScreen ? 'none' : 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px' }}>
                {/* Ficha Rápida Card */}
                <div className="glass-card mi-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid var(--border-color)', position: 'relative', background: 'white', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Ficha rápida</h3>
                    <button 
                      onClick={() => { setSelectedClient(sidebarClient); sessionStorage.setItem('jana_tab_params', JSON.stringify({ clientId: sidebarClient.id })); }}
                      style={{ 
                        border: '1px solid #fae8eb', 
                        backgroundColor: 'rgba(160, 80, 106, 0.05)', 
                        color: 'var(--pink-primary)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '750',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      className="btn-interactive mi-btn"
                    >
                      Ver ficha completa <ArrowUpRight size={13} />
                    </button>
                  </div>

                  {sidebarClient ? (
                    <>
                      {/* Avatar + name + VIP badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(160,80,106,0.12)', border: '2px solid var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          {sidebarClient.image_url ? (
                            <img src={sidebarClient.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={24} color="var(--pink-primary)" />
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)', margin: 0 }}>{sidebarClient.name}</h4>
                            {(sidebarClient.total_visits || 0) >= 10 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', fontWeight: '800', color: '#b47d49', backgroundColor: 'rgba(180, 125, 73, 0.1)', border: '1px solid rgba(180, 125, 73, 0.15)', padding: '2px 6px', borderRadius: '12px' }}>
                                👑 VIP
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>V-{sidebarClient.id_card || '00.000.000'} · {sidebarClient.phone || 'Sin teléfono'}</span>
                            <span style={{ wordBreak: 'break-all' }}>{sidebarClient.email || 'sin.email@janastudio.com'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick contact buttons */}
                      {sidebarClient.phone && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <a
                            href={`tel:${sidebarClient.phone}`}
                            style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: '650', backgroundColor: 'var(--bg-tertiary)', padding: '9px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                            className="btn-interactive mi-btn"
                          >
                            <Phone size={13} color="var(--text-secondary)" /> Llamar
                          </a>
                          <a
                            href={`https://wa.me/${getWhatsAppNumber(sidebarClient.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', fontWeight: '650', backgroundColor: 'var(--bg-tertiary)', padding: '9px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                            className="btn-interactive mi-btn"
                          >
                            <MessageCircle size={13} color="var(--text-secondary)" /> WhatsApp
                          </a>
                        </div>
                      )}

                      {/* Key stats: last visit, birthday, total spent */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '650', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' }}>Última visita</div>
                          <div style={{ fontSize: '12px', fontWeight: '650', color: 'var(--text-primary)' }}>
                            {sidebarClient.last_visit ? new Date(sidebarClient.last_visit).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : 'Sin visitas'}
                          </div>
                        </div>
                        <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '650', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' }}>Cumpleaños</div>
                          <div style={{ fontSize: '12px', fontWeight: '650', color: 'var(--text-primary)' }}>
                            {sidebarClient.birth_date ? new Date(sidebarClient.birth_date + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : 'No registrado'}
                          </div>
                        </div>
                        <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '650', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '3px' }}>Total facturado</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ${(sidebarClient.total_spent || 0).toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>

                      {sidebarClient.allergies && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                          <span style={{ fontSize: '13px', flexShrink: 0 }}>⚠️</span>
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '650', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>Alergias</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>{sidebarClient.allergies}</div>
                          </div>
                        </div>
                      )}

                      <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />

                      {/* Notes Section with Inline Editing */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Notas</span>
                            {showSaveSuccess && (
                              <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '750', animation: 'scaleIn 0.2s ease-out' }}>
                                <Check size={11} /> ¡Guardado!
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={async () => {
                              if (isEditingNotes) {
                                await onUpdate(sidebarClient.id, { notes: tempNotes });
                                setIsEditingNotes(false);
                                setShowSaveSuccess(true);
                                setTimeout(() => setShowSaveSuccess(false), 2000);
                              } else {
                                setTempNotes(sidebarClient.notes || '');
                                setIsEditingNotes(true);
                              }
                            }}
                            className="mi-btn"
                            style={{ border: 'none', background: 'none', color: 'var(--pink-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isEditingNotes ? <Check size={14} /> : <Edit2 size={13} />}
                          </button>
                        </div>
                        {isEditingNotes ? (
                          <textarea
                            className="form-input mi-input"
                            value={tempNotes}
                            onChange={e => setTempNotes(e.target.value)}
                            style={{ width: '100%', minHeight: '60px', fontSize: '12px', padding: '8px', borderRadius: '8px' }}
                          />
                        ) : (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                            {sidebarClient.notes || 'Piel mixta, sensible. Prefiere sesiones por la mañana. Excelente adherencia a tratamientos.'}
                          </p>
                        )}
                      </div>

                      <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />

                      {/* Frequent Services Section */}
                      <div style={{ marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Servicios frecuentes</span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {['Láser Diodo', 'Hydrafacial', 'Peeling Químico'].map((tag, i) => (
                            <span key={i} className="mi-tag" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--pink-primary)', backgroundColor: 'rgba(160, 80, 106, 0.08)', border: '1px solid rgba(160, 80, 106, 0.15)', padding: '4px 10px', borderRadius: '12px' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <hr style={{ border: '0', borderTop: '1px dashed var(--border-color)', margin: '14px 0' }} />

                      {/* Next Appointment Section */}
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>Próxima cita</span>
                        {sidebarClient.next_appointment ? (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <Calendar size={15} color="var(--pink-primary)" />
                            <div>
                              <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {new Date(sidebarClient.next_appointment).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })} · {new Date(sidebarClient.next_appointment).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--pink-primary)', fontWeight: '600', marginTop: '2px' }}>
                                Láser Diodo • Axilas
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Sin citas programadas
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Selecciona una clienta para ver su vista rápida
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Bottom aligned widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 900 ? '1fr' : '1fr 1fr', gap: '24px', marginTop: '28px', alignItems: 'stretch' }}>
              {/* Left Column: Seguimientos pendientes */}
              <div style={{ minWidth: 0 }}>
                {/* Seguimientos pendientes Container Card */}
                <div className="glass-card animate-slide-up delay-3 mi-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', background: 'white', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.03)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15.5px', fontWeight: '850', color: 'var(--text-primary)', margin: 0 }}>
                      Seguimientos pendientes
                    </h3>
                    <span onClick={() => onNavigate && onNavigate('notifications')} style={{ fontSize: '12px', color: 'var(--pink-primary)', fontWeight: '750', cursor: 'pointer' }}>Ver todos</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                    {[
                      { text: 'Confirmar cita de Valentina Pérez', line1: '12 may 2025', line2: '11:30 AM', icon: Calendar, color: 'var(--magenta-primary)', bg: 'var(--pink-secondary)' },
                      { text: 'Enviar rutina post cuidado', line1: 'Laura Martínez', line2: '18 may 2025', icon: Mail, color: 'var(--magenta-primary)', bg: 'var(--pink-secondary)' },
                      { text: 'Recordatorio de evaluación', line1: 'Andrea Rodríguez', line2: '20 may 2025', icon: Bell, color: 'var(--magenta-primary)', bg: 'var(--pink-secondary)' }
                    ].map((item, i) => (
                      <div key={i} style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'white', animationDelay: `${i * 60}ms` }} className="interactive-hover-card stagger-row mi-row">
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <item.icon size={16} color={item.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.3' }}>{item.text}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '500' }}>
                            <div style={{ lineHeight: '1.3' }}>{item.line1}</div>
                            <div style={{ lineHeight: '1.3' }}>{item.line2}</div>
                          </div>
                        </div>
                        <ChevronRight size={14} color="var(--text-secondary)" style={{ marginLeft: '4px' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Próximos cumpleaños */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Próximos cumpleaños Card (with cute cake drawing) */}
                <div className="glass-card animate-slide-up delay-3 interactive-hover-card mi-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: '#f8dbd9', boxShadow: '0 8px 32px rgba(160, 80, 106, 0.04)', position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '230px' }}>
                  {/* Blending Gradient Overlay */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(90deg, #f8dbd9 45%, rgba(248, 219, 217, 0) 95%)', zIndex: 1, pointerEvents: 'none' }} />
                  
                  {/* Birthday Cake Image */}
                  <img 
                    src="/cumpleanos_jana.png" 
                    alt="" 
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: 0, 
                      height: '100%', 
                      width: 'auto', 
                      objectFit: 'contain', 
                      pointerEvents: 'none',
                      zIndex: 0
                    }} 
                  />
                  
                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Cumpleaños
                        {birthdayDemoMode && (
                          <span style={{ fontSize: '9px', fontWeight: '750', color: 'var(--pink-primary)', background: 'rgba(160,80,106,0.15)', padding: '2px 6px', borderRadius: '8px' }}>demo</span>
                        )}
                      </h3>
                      <button onClick={() => setActiveTab('birthdays')} style={{ fontSize: '11px', fontWeight: '750', color: 'var(--pink-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        Ver todas
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '20px', justifyContent: 'center', flex: 1 }}>
                      {birthdaySections.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                          No hay fechas de cumpleaños registradas.
                        </div>
                      ) : (
                        birthdaySections.map((section) => (
                          <div key={section.label}>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                              {section.label}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {section.items.map((c) => (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(160, 80, 106, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Gift size={12} color="var(--pink-primary)" />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.name}</div>
                                  </div>
                                </div>
                              ))}
                              {section.moreCount > 0 && (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', paddingLeft: '38px' }}>+{section.moreCount} más</div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
          </>
          )}
      </>
      ) : (
        <ClientDetail
          isMobile={isMobile}
          isTablet={isTablet}
          client={selectedClient}
          onNavigate={onNavigate}
          onBack={() => {
            setSelectedClient(null);
            sessionStorage.removeItem('jana_scroll_position');
            onNavigate('clients', {});
            setShowCamera(false); // Reset camera state on back
          }} 
          onDelete={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
          onUpdate={async (updates) => {
            try {
              const updated = await dataService.updateClient(selectedClient.id, updates);
              setSelectedClient(updated);
              await onRefresh();
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
          backgroundColor: 'rgba(74, 26, 46, 0.75)',
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
          <div className="glass-card mi-card" style={{
            width: '100%',
            maxWidth: '460px',
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            transform: showMessageModal ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            opacity: showMessageModal ? 1 : 0
          }}>
            {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={20} color="var(--pink-primary)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)' }}>
                  {messageTemplateTab === 'birthday' ? 'Mensaje de Cumplea\u00f1os' : 'Mensaje Recurrente'}
                </h3>
              </div>
              <button 
                onClick={() => setShowMessageModal(false)}
                style={{
                  background: '#faf5f5',
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
                  className="mi-btn"
                  style={{ padding: '10px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(160, 80, 106,0.2)', background: messageTemplateTab === value ? 'var(--pink-primary)' : '#faf5f5', color: messageTemplateTab === value ? 'white' : 'var(--text-primary)', fontWeight: '900', fontSize: '12px' }}>
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
              backgroundColor: 'rgba(160, 80, 106,0.1)', 
              border: '1px solid rgba(160, 80, 106,0.2)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--pink-primary)',
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
                className="mi-input"
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#faf5f5',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
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
                className="mi-btn"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--pink-primary)',
                  color: 'white',
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
                className="mi-btn"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#faf5f5',
                  color: 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  border: '1px solid var(--border-color)',
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
          border-color: var(--pink-primary);
          transform: scale(1.01) translateY(-2px);
          background-color: #faf5f5 !important;
          box-shadow: 0 8px 24px rgba(160, 80, 106,0.15);
        }
      `}</style>

      <NewClientModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onClientCreated={onRefresh}
      />
    </div>
  );
};

const getWhatsAppNumber = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 11) {
    return '58' + clean.slice(1);
  }
  if (clean.length === 10) {
    return '58' + clean;
  }
  return clean;
};

const ClientDetail = ({ isMobile, isTablet, client, onBack, onDelete, onUpdate, onNavigate }) => {
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const containerRef = useRef(null);
  const [detailWidth, setDetailWidth] = useState(1200);
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setDetailWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const isCompact = isMobile || isTablet || detailWidth < 1000;
  const [showCollage, setShowCollage] = useState(false);
  const [isSavingComparison, setIsSavingComparison] = useState(false);

  const [showAllHistory, setShowAllHistory] = useState(false);
  const [photoA, setPhotoA] = useState(null);
  const [photoB, setPhotoB] = useState(null);
  const [selectingFor, setSelectingFor] = useState(null); // 'A' or 'B'
  const [sliderPos, setSliderPos] = useState(50);
  const [downloadOrientation, setDownloadOrientation] = useState('horizontal'); // 'horizontal' or 'vertical'
  const [includeBranding, setIncludeBranding] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [comparisonTitle, setComparisonTitle] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(null);
  const [lightboxComparison, setLightboxComparison] = useState(null);
  const [galleryFilter, setGalleryFilter] = useState('all'); // 'all', 'Antes', 'Después'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'week', 'month', 'year', 'custom'
  const [customDateFilter, setCustomDateFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [gallerySortOrder, setGallerySortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIndices, setSelectedPhotoIndices] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [expandedHistoryVisit, setExpandedHistoryVisit] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoMeta, setPhotoMeta] = useState({ type: 'Normal', serviceId: null });
  const [pendingBulkPhotos, setPendingBulkPhotos] = useState([]);
  const [bulkPhotoMeta, setBulkPhotoMeta] = useState({ type: 'Normal', serviceId: null });
  const [processingBulkUpload, setProcessingBulkUpload] = useState(false);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(client.notes || '');
  const [activeSubTab, setActiveSubTab] = useState(() => {
    try {
      const clientId = client?.id;
      if (clientId) {
        const saved = sessionStorage.getItem(`jana_client_subtab_${clientId}`);
        if (saved) return saved;
      }
    } catch {}
    return 'gallery';
  });

  useEffect(() => {
    if (client?.id) {
      sessionStorage.setItem(`jana_client_subtab_${client.id}`, activeSubTab);
    }
  }, [activeSubTab, client?.id]);

  // Switching sub-tabs (Fotos/Salud/Paquetes/Visitas) should also start at the top.
  useEffect(() => {
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSubTab]);

  // Pagination / Infinite Scroll
  const [visiblePhotosCount, setVisiblePhotosCount] = useState(12);
  const [visibleCompsCount, setVisibleCompsCount] = useState(4);
  const photosObserverRef = useRef(null);
  const compsObserverRef = useRef(null);

  useEffect(() => {
    const pObserver = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisiblePhotosCount(p => p + 12); },
      { threshold: 0.1, rootMargin: '400px' }
    );
    const cObserver = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCompsCount(c => c + 4); },
      { threshold: 0.1, rootMargin: '400px' }
    );
    
    if (photosObserverRef.current) pObserver.observe(photosObserverRef.current);
    if (compsObserverRef.current) cObserver.observe(compsObserverRef.current);
    
    return () => { pObserver.disconnect(); cObserver.disconnect(); };
  }, [activeSubTab, showCollage, gallery]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(true);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const fetchDiagnoses = async () => {
    try {
      setLoadingDiagnoses(true);
      const data = await dataService.getCapillaryDiagnoses(client.id);
      setDiagnoses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDiagnoses(false);
    }
  };

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      const data = await dataService.getClientPackages(client.id);
      setPackages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    if (client?.id) {
      fetchDiagnoses();
      fetchPackages();
    }
  }, [client?.id]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const { data, error } = await dataService.supabase
          .from('clients')
          .select('work_gallery, work_comparisons')
          .eq('id', client.id)
          .single();
        if (error) throw error;
        setGallery(data?.work_gallery || []);
        setComparisons(data?.work_comparisons || []);
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
    notes: client.notes || ''
  });
  useEffect(() => {
    setLocalNotes(client.notes || '');
  }, [client.notes]);

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

    const loadUpcoming = async () => {
      try {
        const todayStr = new Date().toISOString();
        const { data, error } = await supabase
          .from('appointments')
          .select('*, services(name)')
          .eq('client_id', client.id)
          .gte('scheduled_at', todayStr)
          .neq('status', 'Cancelado')
          .order('scheduled_at', { ascending: true })
          .limit(1);
        if (!error && data && data.length > 0) {
          setUpcomingAppointment(data[0]);
        } else {
          setUpcomingAppointment(null);
        }
      } catch (err) {
        console.error('Error loading upcoming appointment:', err);
      }
    };

    loadHistory();
    loadUpcoming();
  }, [client.id]);

  const findPhotoDate = (url) => {
    const item = gallery.find(img => img.url === url);
    if (!item?.date) return null;
    return new Date(item.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const unpairedAntes = gallery.find(img => img.type === 'Antes');
  const unpairedDespues = gallery.find(img => img.type === 'Después');

  const handleUseSuggestedPair = () => {
    if (!unpairedAntes || !unpairedDespues) return;
    setPhotoA(unpairedAntes.url);
    setPhotoB(unpairedDespues.url);
    setComparisonTitle('');
    setShowCollage(true);
  };

  const matchesDateFilter = (dateStr) => {
    if (dateFilter === 'all') return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    if (dateFilter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'custom') {
      if (!customDateFilter) return true;
      const target = new Date(`${customDateFilter}T00:00:00`);
      return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth() && d.getDate() === target.getDate();
    }
    return true;
  };

  const galleryServiceNames = [...new Set(gallery.map(img => img.service_name).filter(Boolean))];

  const filteredIndexedGallery = gallery
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => galleryFilter === 'all' || img.type === galleryFilter)
    .filter(({ img }) => matchesDateFilter(img.date))
    .filter(({ img }) => serviceFilter === 'all' || img.service_name === serviceFilter)
    .sort((a, b) => {
      const da = a.img.date ? new Date(a.img.date).getTime() : 0;
      const db = b.img.date ? new Date(b.img.date).getTime() : 0;
      return gallerySortOrder === 'newest' ? db - da : da - db;
    });

  const togglePhotoSelection = (index) => {
    setSelectedPhotoIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleBulkDeletePhotos = async () => {
    if (selectedPhotoIndices.length === 0) return;
    if (!await confirm(`¿Eliminar ${selectedPhotoIndices.length} foto(s) seleccionadas?`)) return;
    try {
      const newGallery = gallery.filter((_, i) => !selectedPhotoIndices.includes(i));
      setGallery(newGallery);
      await onUpdate({ work_gallery: newGallery });
      setSelectedPhotoIndices([]);
      setSelectionMode(false);
      showToast('Fotos eliminadas');
    } catch (e) {
      showToast('Error al eliminar fotos', 'error');
    }
  };

  const handleChangePhotoType = async (index, newType) => {
    try {
      const newGallery = [...gallery];
      newGallery[index] = { ...newGallery[index], type: newType };
      setGallery(newGallery);
      await onUpdate({ work_gallery: newGallery });
      setLightboxPhoto(newGallery[index]); // update lightbox state
      showToast('Etiqueta de foto actualizada');
    } catch (e) {
      showToast('Error al actualizar la foto', 'error');
    }
  };

  const handleDownloadPhoto = (photoUrl) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `foto_${client.first_name || 'cliente'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Descargando foto...');
  };
  const handleDownloadComparison = () => {
    const isStory = downloadOrientation === 'story';
    const isSquare = downloadOrientation === 'square';

    Promise.all([
      new Promise(res => { imgA.onload = res; }),
      new Promise(res => { imgB.onload = res; }),
      new Promise(res => { logo.onload = res; logo.onerror = res; })
    ]).then(() => {
      let width, height;
      if (isStory) {
        width = 1080;
        height = 1920;
      } else if (isSquare) {
        width = 1080;
        height = 1080;
      } else {
        width = downloadOrientation === 'vertical' ? 800 : 1200;
        height = downloadOrientation === 'vertical' ? 1200 : 800;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (isStory) {
        // Instagram Story branded design
        ctx.fillStyle = '#fffafb';
        ctx.fillRect(0, 0, width, height);

        // draw top arc decorative backdrop
        ctx.fillStyle = 'rgba(160,80,106,0.04)';
        ctx.beginPath();
        ctx.arc(540, -100, 600, 0, Math.PI * 2);
        ctx.fill();

        // draw border accent lines
        ctx.strokeStyle = 'rgba(160,80,106,0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, width - 60, height - 60);

        // Header Title
        ctx.fillStyle = 'rgba(74,26,46,0.95)';
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('JANA STUDIO', 540, 120);

        ctx.fillStyle = 'rgba(160,80,106,0.7)';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('ANTES & DESPUÉS', 540, 160);

        // helper to draw rounded image
        const drawRoundedCover = (img, x, y, w, h, r) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.clip();
          drawCover(ctx, img, x, y, w, h);
          ctx.restore();
        };

        // Draw drop shadows for photos
        ctx.shadowColor = 'rgba(160,80,106,0.15)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;
        ctx.shadowOffsetX = 0;

        // Image coordinates
        const imgW = 880;
        const imgH = 640;
        const imgX = 100;
        const imgYA = 220;
        const imgYB = 920;

        drawRoundedCover(imgA, imgX, imgYA, imgW, imgH, 20);
        drawRoundedCover(imgB, imgX, imgYB, imgW, imgH, 20);

        // Draw text badges over images (no shadow)
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        const drawLabelBadge = (txt, x, y) => {
          ctx.fillStyle = 'rgba(74,26,46,0.85)';
          ctx.fillRect(x, y, 130, 44);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(txt, x + 65, y + 27);
        };

        drawLabelBadge('ANTES', imgX + 20, imgYA + 20);
        drawLabelBadge('DESPUÉS', imgX + 20, imgYB + 20);

        // Footer Branding & Treatment Name
        ctx.fillStyle = 'rgba(74,26,46,0.95)';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(comparisonTitle || 'Transformación Capilar', 540, 1680);

        ctx.fillStyle = 'rgba(160,80,106,0.6)';
        ctx.font = '18px sans-serif';
        ctx.fillText(new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }), 540, 1720);
      } else {
        // Square or normal Horizontal/Vertical grid split
        const isVert = downloadOrientation === 'vertical';
        const halfW = isVert ? width : width / 2;
        const halfH = isVert ? height / 2 : height;
        const boxA = { x: 0, y: 0 };
        const boxB = isVert ? { x: 0, y: height / 2 } : { x: width / 2, y: 0 };

        drawCover(ctx, imgA, boxA.x, boxA.y, halfW, halfH);
        drawCover(ctx, imgB, boxB.x, boxB.y, halfW, halfH);

        ctx.fillStyle = 'white';
        if (isVert) {
          ctx.fillRect(0, height / 2 - 1, width, 2);
        } else {
          ctx.fillRect(width / 2 - 1, 0, 2, height);
        }

        if (includeBranding) {
          const dateA = findPhotoDate(photoA);
          const dateB = findPhotoDate(photoB);

          const drawLabel = (text, date, x, y) => {
            const boxHeight = date ? 66 : 40;
            ctx.font = 'bold 20px Inter, sans-serif';
            const boxWidth = Math.max(100, ctx.measureText(text).width + 30);
            ctx.fillStyle = 'rgba(74,26,46,0.75)';
            ctx.fillRect(x, y - 20 - boxHeight, boxWidth, boxHeight);
            ctx.fillStyle = 'white';
            ctx.fillText(text, x + 15, date ? y - 55 : y - 33);
            if (date) {
              ctx.font = '14px Inter, sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.fillText(date, x + 15, y - 33);
            }
          };

          drawLabel('ANTES', dateA, boxA.x + 20, boxA.y + halfH);
          drawLabel('DESPUÉS', dateB, boxB.x + 20, boxB.y + halfH);

          // Branding
          if (logo.naturalWidth > 0) {
            const logoHeight = 34;
            const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
            ctx.drawImage(logo, width - logoWidth - 24, 20, logoWidth, logoHeight);
          } else {
            ctx.fillStyle = 'white';
            ctx.font = '16px Inter, sans-serif';
            ctx.fillText('JANA STUDIO', width - 200, 30);
          }
        }
      }

      const link = document.createElement('a');
      link.download = `Comparativa_${client.first_name || 'cliente'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      showToast('Descargando comparativa...');
    });
  };

  const handleShareComparison = (comparison) => {
    const imgA = new Image();
    const imgB = new Image();
    const logo = new Image();

    imgA.src = comparison.beforeUrl;
    imgB.src = comparison.afterUrl;
    logo.src = '/logo.webp';

    const drawCover = (ctx, img, x, y, w, h) => {
      const imgRatio = img.width / img.height;
      const boxRatio = w / h;
      let sx, sy, sWidth, sHeight;
      if (imgRatio > boxRatio) {
        sHeight = img.height;
        sWidth = sHeight * boxRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = img.width;
        sHeight = sWidth / boxRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
    };

    Promise.all([
      new Promise(res => { imgA.onload = res; }),
      new Promise(res => { imgB.onload = res; }),
      new Promise(res => { logo.onload = res; logo.onerror = res; })
    ]).then(() => {
      const width = 1200;
      const height = 800;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      drawCover(ctx, imgA, 0, 0, width / 2, height);
      drawCover(ctx, imgB, width / 2, 0, width / 2, height);
      ctx.fillStyle = 'white';
      ctx.fillRect(width / 2 - 1, 0, 2, height);

      const drawLabel = (text, x) => {
        ctx.font = 'bold 20px Inter, sans-serif';
        const boxWidth = Math.max(100, ctx.measureText(text).width + 30);
        ctx.fillStyle = 'rgba(74,26,46,0.75)';
        ctx.fillRect(x, height - 60, boxWidth, 40);
        ctx.fillStyle = 'white';
        ctx.fillText(text, x + 15, height - 33);
      };
      drawLabel('ANTES', 20);
      drawLabel('DESPUÉS', width / 2 + 20);

      if (comparison.title) {
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.fillText(comparison.title, 20, 34);
        ctx.shadowBlur = 0;
      }

      if (logo.naturalWidth > 0) {
        const logoHeight = 34;
        const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
        ctx.drawImage(logo, width - logoWidth - 24, 20, logoWidth, logoHeight);
      } else {
        ctx.fillStyle = 'white';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('JANA STUDIO', width - 200, 30);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Error al generar la imagen', 'error');
          return;
        }
        const fileName = `Comparativa_${client.name}${comparison.title ? '_' + comparison.title : ''}.jpg`.replace(/\s+/g, '_');
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const shareText = `Comparativa de ${client.name}${comparison.title ? ' - ' + comparison.title : ''} · Jana Studio`;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: comparison.title || 'Comparativa', text: shareText });
          } catch (shareErr) {
            if (shareErr?.name !== 'AbortError') {
              showToast('No se pudo compartir', 'error');
            }
          }
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = fileName;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          showToast('Imagen descargada. Compártela desde tu galería.', 'success');
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const compressImage = (dataUrl, maxDim = 800, quality = 0.6) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxDim) {
        height = (maxDim / width) * height;
        width = maxDim;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

  const handlePhotoCaptured = async (image) => {
    try {
      const optimizedImage = await compressImage(image);
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

      // Fetch latest gallery from DB to avoid overwriting stylist's photos
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

  const handleSaveComparison = async () => {
    if (!photoA || !photoB) {
      showToast('Selecciona la foto de antes y de después', 'warning');
      return;
    }
    if (!comparisonTitle.trim()) {
      showToast('Ponle un nombre al tratamiento', 'warning');
      return;
    }
    setIsSavingComparison(true);
    try {
      const newComparison = {
        id: `${Date.now()}`,
        title: comparisonTitle.trim(),
        beforeUrl: photoA,
        afterUrl: photoB,
        date: new Date().toISOString()
      };
      const { data: latestClient } = await dataService.supabase
        .from('clients')
        .select('work_comparisons')
        .eq('id', client.id)
        .single();
      const currentLatest = Array.isArray(latestClient?.work_comparisons) ? latestClient.work_comparisons : [];
      const newComparisons = [newComparison, ...currentLatest];

      const updatedClient = await onUpdate({ work_comparisons: newComparisons });
      if (updatedClient) {
        setComparisons(newComparisons);
        setShowCollage(false);
        setPhotoA(null);
        setPhotoB(null);
        setComparisonTitle('');
        showToast('Comparativa guardada', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al guardar la comparativa', 'error');
    } finally {
      setIsSavingComparison(false);
    }
  };

  const handleDeleteComparison = async (id) => {
    if (!await confirm('¿Deseas eliminar esta comparativa?')) return;
    try {
      const newComparisons = comparisons.filter(c => c.id !== id);
      setComparisons(newComparisons);
      await onUpdate({ work_comparisons: newComparisons });
      showToast('Comparativa eliminada');
    } catch (e) {
      showToast('Error al eliminar la comparativa', 'error');
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file(s) again later
    if (files.length === 0) return;

    setProcessingBulkUpload(true);
    try {
      const readAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const rawDataUrls = await Promise.all(files.map(readAsDataUrl));
      const compressed = await Promise.all(rawDataUrls.map(url => compressImage(url)));
      setBulkPhotoMeta({ type: 'Normal', serviceId: null });
      setPendingBulkPhotos(compressed);
    } catch (err) {
      console.error(err);
      showToast('Error al procesar las imágenes', 'error');
    } finally {
      setProcessingBulkUpload(false);
    }
  };

  const confirmSaveBulkPhotos = async () => {
    if (pendingBulkPhotos.length === 0) return;
    try {
      showToast('Guardando en la nube...', 'info');
      const now = new Date().toISOString();
      const serviceName = bulkPhotoMeta.serviceId
        ? history.find(h => h.id === bulkPhotoMeta.serviceId)?.services?.name
        : 'Subida manual';

      const newPhotoObjs = pendingBulkPhotos.map(url => ({
        url,
        type: bulkPhotoMeta.type,
        date: now,
        service_id: bulkPhotoMeta.serviceId,
        service_name: serviceName
      }));

      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', client.id)
        .single();

      const currentLatestGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = [...newPhotoObjs, ...currentLatestGallery];

      const updatedClient = await onUpdate({ work_gallery: newGallery });
      if (updatedClient) {
        setGallery(newGallery);
        setPendingBulkPhotos([]);
        setBulkPhotoMeta({ type: 'Normal', serviceId: null });
        showToast(`${newPhotoObjs.length} foto${newPhotoObjs.length > 1 ? 's' : ''} guardada${newPhotoObjs.length > 1 ? 's' : ''} en galería`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al sincronizar con la nube', 'error');
    }
  };

  const renderSubTabContent = () => {
    const getBadgeStyle = (val) => {
      const lower = String(val || '').toLowerCase();
      if (lower.includes('sano') || lower.includes('normal') || lower.includes('buena') || lower.includes('óptimo') || lower.includes('optim')) {
        return { bg: 'rgba(46, 158, 91, 0.07)', color: '#2e9e5b', border: 'rgba(46, 158, 91, 0.15)' };
      }
      if (lower.includes('media') || lower.includes('regular') || lower.includes('mixto')) {
        return { bg: 'rgba(230, 159, 60, 0.08)', color: '#c9821f', border: 'rgba(230, 159, 60, 0.18)' };
      }
      return { bg: 'rgba(212, 78, 108, 0.07)', color: '#d44e6c', border: 'rgba(212, 78, 108, 0.15)' };
    };

    switch (activeSubTab) {
      case 'gallery':
        return (
          <div style={{ padding: '24px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(160,80,106,0.02)' }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'flex-start',
              marginBottom: '20px',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '850', margin: 0, color: 'var(--text-primary)' }}>
                  <Sparkles size={18} color="var(--pink-primary)" /> Galería de trabajos
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Documenta los resultados y transforma cada cambio en inspiración.
                </p>
              </div>
              <button
                onClick={() => { setShowCollage(!showCollage); setComparisonTitle(''); setPhotoA(null); setPhotoB(null); }}
                disabled={gallery.length < 2 && !showCollage}
                className="btn-interactive"
                title={gallery.length < 2 && !showCollage ? 'Sube al menos 2 fotos para crear una comparativa de Antes y Después' : undefined}
                style={{
                  background: showCollage ? 'var(--bg-tertiary)' : 'var(--magenta-gradient)',
                  border: 'none',
                  color: showCollage ? 'var(--text-primary)' : 'white',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: (gallery.length < 2 && !showCollage) ? 'not-allowed' : 'pointer',
                  opacity: (gallery.length < 2 && !showCollage) ? 0.55 : 1,
                  fontWeight: '750',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto',
                  marginTop: isMobile ? '6px' : '0'
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
                      backgroundColor: 'var(--bg-tertiary)',
                      border: selectingFor === 'A' ? '2px solid var(--pink-primary)' : '1px solid var(--border-color)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoA ? (
                      <img src={photoA} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="var(--text-muted)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO ANTES</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(74,26,46,0.85)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'white' }}>ANTES</div>
                  </div>

                  <div 
                    onClick={() => setSelectingFor('B')}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      backgroundColor: 'var(--bg-tertiary)',
                      border: selectingFor === 'B' ? '2px solid var(--pink-primary)' : '1px solid var(--border-color)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {photoB ? (
                      <img src={photoB} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <ImageIcon size={32} color="var(--text-muted)" />
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DESPUÉS</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(74,26,46,0.85)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'white' }}>DESPUÉS</div>
                  </div>
                </div>

                {photoA && photoB ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <BeforeAfterSlider
                      photoA={photoA}
                      photoB={photoB}
                      sliderPos={sliderPos}
                      setSliderPos={setSliderPos}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                      <span>Antes: {findPhotoDate(photoA) || 'Sin fecha'}</span>
                      <span>Después: {findPhotoDate(photoB) || 'Sin fecha'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>NOMBRE DEL TRATAMIENTO</label>
                      <input
                        className="form-input mi-input"
                        value={comparisonTitle}
                        onChange={e => setComparisonTitle(e.target.value)}
                        placeholder="Ej. Alisado orgánico + hidratación"
                        style={{ width: '100%', padding: '10px 12px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '0 4px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['horizontal', 'square', 'story'].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDownloadOrientation(opt)}
                            className="btn-interactive"
                            style={{
                              padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '750', cursor: 'pointer',
                              border: downloadOrientation === opt ? '1px solid var(--pink-primary)' : '1px solid var(--border-color)',
                              background: downloadOrientation === opt ? 'rgba(160,80,106,0.1)' : 'white',
                              color: downloadOrientation === opt ? 'var(--pink-primary)' : 'var(--text-secondary)',
                              transition: 'all 0.2s'
                            }}
                          >
                            {opt === 'horizontal' ? 'Horizontal (3:2)' : opt === 'square' ? 'Cuadrado (1:1)' : 'Instagram Story (9:16)'}
                          </button>
                        ))}
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={includeBranding}
                          onChange={e => setIncludeBranding(e.target.checked)}
                          style={{ accentColor: 'var(--pink-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        Incluir logo y texto
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={handleSaveComparison}
                        disabled={isSavingComparison}
                        className="btn-pink mi-btn"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isSavingComparison ? 0.7 : 1, cursor: isSavingComparison ? 'wait' : 'pointer' }}
                      >
                        {isSavingComparison ? (
                          <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                        ) : (
                          <><Check size={18} /> Guardar Comparativa</>
                        )}
                      </button>
                      <button
                        onClick={handleDownloadComparison}
                        className="btn-interactive"
                        style={{ padding: '0 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Descargar"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => handleShareComparison({ beforeUrl: photoA, afterUrl: photoB, title: comparisonTitle })}
                        className="btn-interactive"
                        style={{ padding: '0 16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Compartir"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#faf5f5', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Selecciona dos fotos para generar el collage
                  </div>
                )}

                <AnimatedModal isOpen={!!selectingFor}>
                  {(overlayClass, cardClass) => (
                    <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,26,46,0.75)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                      <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', padding: '24px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Elegir Foto {selectingFor}</h4>
                          <button onClick={() => setSelectingFor(null)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                          {gallery
                            .filter(img => selectingFor === 'A' ? img.type === 'Antes' : img.type === 'Después')
                            .map((img, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div
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
                                  border: (selectingFor === 'A' ? photoA === img.url : photoB === img.url) ? '3px solid var(--pink-primary)' : 'none'
                                }}
                              >
                                <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'center' }}>
                                {img.date ? new Date(img.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatedModal>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Banner de Subida de Ancho Completo */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-interactive"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(160,80,106,0.015)',
                    borderRadius: '16px',
                    border: '2px dashed var(--pink-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: '20px 24px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '16px', justifyContent: 'center', width: '100%' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(160,80,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {processingBulkUpload ? <Loader2 size={20} color="var(--pink-primary)" className="animate-spin" /> : <Plus size={20} color="var(--pink-primary)" />}
                    </div>
                    <div style={{ textAlign: isMobile ? 'center' : 'left', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: '750', color: 'var(--text-primary)' }}>
                        {processingBulkUpload ? 'Procesando...' : 'Subir nuevas imágenes'}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        JPG, PNG &bull; Puedes elegir varias {isMobile ? '' : 'o usar la cámara'}
                      </span>
                    </div>
                    {isMobile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                        className="btn-interactive mi-btn"
                        style={{ 
                          fontSize: '12px', 
                          color: 'var(--magenta-primary)', 
                          backgroundColor: 'rgba(160,80,106,0.06)', 
                          border: '1px solid rgba(160,80,106,0.15)', 
                          fontWeight: '750', 
                          cursor: 'pointer', 
                          padding: '7px 16px', 
                          borderRadius: '20px',
                          width: 'fit-content', 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Camera size={15} /> Cámara
                      </button>
                    )}
                  </div>
                </div>

                {comparisons.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {comparisons.slice(0, visibleCompsCount).map(comp => (
                      <ComparisonCard key={comp.id} comparison={comp} onDelete={() => handleDeleteComparison(comp.id)} onShare={() => handleShareComparison(comp)} onCardClick={setLightboxComparison} />
                    ))}
                    {visibleCompsCount < comparisons.length && (
                      <div ref={compsObserverRef} style={{ height: '20px', width: '100%' }} />
                    )}
                  </div>
                )}

                {unpairedAntes && unpairedDespues && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '14px 18px', borderRadius: '16px', background: 'rgba(160,80,106,0.06)', border: '1px solid rgba(160,80,106,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sparkles size={16} color="var(--pink-primary)" />
                      <span style={{ fontSize: '13px', fontWeight: '650', color: 'var(--text-primary)' }}>
                        Tienes fotos de <strong>antes</strong> y <strong>después</strong> sin combinar en una comparativa.
                      </span>
                    </div>
                    <button onClick={handleUseSuggestedPair} className="btn-pink mi-btn" style={{ padding: '8px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      Crear comparativa con estas
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h5 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                        Galería de Fotos
                      </h5>
                      {selectionMode && (
                        <span style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '750', backgroundColor: 'rgba(160,80,106,0.08)', padding: '4px 10px', borderRadius: '12px' }}>
                          {selectedPhotoIndices.length} seleccionada{selectedPhotoIndices.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    {selectionMode ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleBulkDeletePhotos}
                          disabled={selectedPhotoIndices.length === 0}
                          style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: selectedPhotoIndices.length === 0 ? 'not-allowed' : 'pointer', border: 'none', background: '#ff453a', color: 'white', opacity: selectedPhotoIndices.length === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                        <button
                          onClick={() => { setSelectionMode(false); setSelectedPhotoIndices([]); }}
                          className="btn-interactive"
                          style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectionMode(true)}
                        className="btn-interactive"
                        style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)' }}
                      >
                        Seleccionar
                      </button>
                    )}
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: isMobile ? '16px' : '20px', 
                    marginBottom: '24px', 
                    padding: isMobile ? '16px' : '20px', 
                    background: '#ffffff', 
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}>
                    {/* Segmented Control for Type */}
                    <div style={{ display: 'flex', width: '100%', background: '#faf5f5', borderRadius: '14px', padding: '4px' }}>
                      {[
                        { id: 'all', label: 'Todas' },
                        { id: 'Antes', label: 'Antes' },
                        { id: 'Después', label: 'Después' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setGalleryFilter(f.id)}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '750',
                            cursor: 'pointer',
                            border: 'none',
                            background: galleryFilter === f.id ? 'var(--pink-primary)' : 'transparent',
                            color: galleryFilter === f.id ? 'white' : 'var(--text-secondary)',
                            boxShadow: galleryFilter === f.id ? '0 2px 8px rgba(160,80,106,0.3)' : 'none',
                            transition: 'all 0.25s ease'
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Dropdowns Row */}
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: isMobile ? 'stretch' : 'center' }}>
                      {/* Date Filter Dropdown */}
                      <JanaSelect
                        variant="light"
                        placeholder="Fecha"
                        value={dateFilter}
                        onChange={(val) => { setDateFilter(val); if (val !== 'custom') setCustomDateFilter(''); }}
                        options={[
                          { label: 'Todas las fechas', value: 'all' },
                          { label: 'Esta semana', value: 'week' },
                          { label: 'Este mes', value: 'month' },
                          { label: 'Este año', value: 'year' },
                          { label: 'Personalizado...', value: 'custom' }
                        ]}
                        style={{ flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto' }}
                      />
                      
                      {/* Custom Date Input */}
                      {dateFilter === 'custom' && (
                        <div style={{ flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto' }}>
                          <JanaDatePicker
                            value={customDateFilter}
                            onChange={(e) => setCustomDateFilter(e.target.value)}
                            variant="light"
                            inputStyle={{ padding: '9px 12px 9px 42px', fontSize: '13px', borderRadius: '12px', borderColor: customDateFilter ? 'var(--pink-primary)' : 'var(--border-color)', width: '100%' }}
                          />
                        </div>
                      )}

                      {/* Service Filter Dropdown */}
                      <JanaSelect
                        variant="light"
                        placeholder="Todos los servicios"
                        value={serviceFilter}
                        onChange={(val) => setServiceFilter(val)}
                        options={[
                          { label: 'Todos los servicios', value: 'all' },
                          ...galleryServiceNames.map(name => ({ label: name, value: name }))
                        ]}
                        style={{ flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto' }}
                      />

                      {/* Sort Order Dropdown */}
                      <JanaSelect
                        variant="light"
                        placeholder="Orden"
                        value={gallerySortOrder}
                        onChange={(val) => setGallerySortOrder(val)}
                        options={[
                          { label: 'Más recientes', value: 'newest' },
                          { label: 'Más antiguas', value: 'oldest' }
                        ]}
                        style={{ flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto' }}
                      />
                    </div>

                    {galleryServiceNames.length > 0 && (
                      <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0 10px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                        <button
                          onClick={() => setServiceFilter('all')}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '750',
                            cursor: 'pointer',
                            border: serviceFilter === 'all' ? '1px solid var(--pink-primary)' : '1px solid var(--border-color)',
                            background: serviceFilter === 'all' ? 'rgba(160,80,106,0.1)' : 'white',
                            color: serviceFilter === 'all' ? 'var(--pink-primary)' : 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                          }}
                        >
                          Todos los servicios
                        </button>
                        {galleryServiceNames.map(name => (
                          <button
                            key={name}
                            onClick={() => setServiceFilter(name)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '750',
                              cursor: 'pointer',
                              border: serviceFilter === name ? '1px solid var(--pink-primary)' : '1px solid var(--border-color)',
                              background: serviceFilter === name ? 'rgba(160,80,106,0.1)' : 'white',
                              color: serviceFilter === name ? 'var(--pink-primary)' : 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s'
                            }}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {filteredIndexedGallery.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '48px 24px',
                      background: 'rgba(160,80,106,0.01)',
                      border: '1.5px dashed rgba(160,80,106,0.1)',
                      borderRadius: '20px',
                      textAlign: 'center',
                      marginTop: '12px'
                    }}>
                      <Camera size={44} color="var(--pink-primary)" style={{ marginBottom: '16px', opacity: 0.65 }} />
                      <h6 style={{ margin: '0 0 8px', fontSize: '14.5px', fontWeight: '800', color: 'var(--text-primary)' }}>Galería sin fotos</h6>
                      <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.45 }}>
                        Aún no hay fotos cargadas en esta sección. Sube imágenes del cabello de la clienta para documentar sus sesiones.
                      </p>
                      <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-pink mi-btn"
                style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Subir Primera Foto
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
                      {filteredIndexedGallery.slice(0, visiblePhotosCount).map(({ img, i }) => {
                        const isSelected = selectedPhotoIndices.includes(i);
                        return (
                        <div
                          key={i}
                          onClick={() => {
                            if (selectionMode) {
                              togglePhotoSelection(i);
                            } else {
                              setLightboxPhoto(img);
                              setLightboxPhotoIndex(i);
                            }
                          }}
                          style={{ aspectRatio: '1/1', backgroundColor: '#eee', borderRadius: '20px', overflow: 'hidden', position: 'relative', cursor: 'pointer', border: isSelected ? '4px solid var(--pink-primary)' : '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          className="group"
                        >
                          <img src={img.url || img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '12px', fontSize: '11px', fontWeight: '850', color: 'white' }}>
                            {img.type || 'FOTO'}
                          </div>
                          {selectionMode ? (
                            <div style={{
                              position: 'absolute', top: '12px', right: '12px', width: '28px', height: '28px', borderRadius: '10px',
                              border: isSelected ? 'none' : '2px solid white', backgroundColor: isSelected ? 'var(--pink-primary)' : 'rgba(0,0,0,0.3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSelected && <Check size={18} color="white" strokeWidth={3} />}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePhotoDelete(i); }}
                              style={{
                                position: 'absolute', top: '12px', right: '12px',
                                backgroundColor: 'rgba(255, 69, 58, 0.9)',
                                border: 'none', borderRadius: '10px', color: 'white',
                                padding: '8px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                transition: '0.2s',
                                opacity: 0,
                              }}
                              className="group-hover:opacity-100"
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ff453a'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.9)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );})}
                    </div>
                  )}
                  {visiblePhotosCount < filteredIndexedGallery.length && (
                    <div ref={photosObserverRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '20px' }}>
                      <Loader2 size={24} color="var(--pink-primary)" className="animate-spin" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        );
      case 'diagnoses':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const latest = diagnoses[0];
              if (!latest) return null;

              const tagFor = (pct) => (
                pct >= 70 ? { label: 'Buena', bg: 'rgba(46,158,91,0.12)', color: '#2e9e5b' }
                : pct >= 40 ? { label: 'Regular', bg: 'rgba(230,159,60,0.16)', color: '#c9821f' }
                : { label: 'Débil', bg: 'rgba(220,80,80,0.12)', color: '#d64545' }
              );

              const bars = [
                { label: 'Hidratación', pct: latest.hydration_pct ?? 70 },
                { label: 'Nutrición', pct: latest.nutrition_pct ?? 60 },
                { label: 'Reparación', pct: latest.repair_pct ?? 50 },
                { label: 'Brillo', pct: latest.shine_pct ?? 80 },
                { label: 'Fuerza', pct: latest.strength_pct ?? 70 },
              ];

              const scalpItems = [
                { icon: <Droplet />, label: 'Nivel de grasa', value: latest.scalp_oil_level || 'Normal' },
                { icon: <Activity />, label: 'Sensibilidad', value: latest.scalp_sensitivity || 'Baja' },
                { icon: <CircleDot />, label: 'Descamación', value: latest.scalp_flaking || 'No' },
                { icon: <Waves />, label: 'Caída', value: latest.scalp_hairloss || 'Leve' },
                { icon: <Flame />, label: 'Inflamación', value: latest.scalp_inflammation || 'No' },
              ];

              const getHairTypeData = (val) => {
                const lower = String(val || '').toLowerCase();
                if (lower.includes('seco')) {
                  return { activeIndex: 0, textMin: 'Seco', textMax: 'Graso', desc: 'Falta lípidos. Evitar lavados agresivos y nutrir.' };
                } else if (lower.includes('graso')) {
                  return { activeIndex: 2, textMin: 'Seco', textMax: 'Graso', desc: 'Exceso de sebo. Requiere purificación y control.' };
                } else {
                  return { activeIndex: 1, textMin: 'Seco', textMax: 'Graso', desc: 'Producción de sebo saludable y equilibrada.' };
                }
              };

              const getPorosityData = (val) => {
                const lower = String(val || '').toLowerCase();
                if (lower.includes('baja')) {
                  return { activeIndex: 0, textMin: 'Baja', textMax: 'Alta', desc: 'Cutícula cerrada. Difícil de hidratar.' };
                } else if (lower.includes('alta')) {
                  return { activeIndex: 2, textMin: 'Baja', textMax: 'Alta', desc: 'Cutícula abierta. Pierde humedad rápido.' };
                } else {
                  return { activeIndex: 1, textMin: 'Baja', textMax: 'Alta', desc: 'Absorción y retención de humedad ideales.' };
                }
              };

              const getElasticityData = (val) => {
                const lower = String(val || '').toLowerCase();
                if (lower.includes('baja') || lower.includes('debil') || lower.includes('mala')) {
                  return { activeIndex: 0, textMin: 'Mala', textMax: 'Buena', desc: 'Hebras quebradizas. Falta de proteínas.' };
                } else if (lower.includes('regular') || lower.includes('media')) {
                  return { activeIndex: 1, textMin: 'Mala', textMax: 'Buena', desc: 'Resistencia moderada. Evitar calor excesivo.' };
                } else {
                  return { activeIndex: 2, textMin: 'Mala', textMax: 'Buena', desc: 'Excelente fuerza y flexibilidad al estirar.' };
                }
              };

              const getOverallScoreData = (val) => {
                const num = parseFloat(val) || 7.5;
                let desc = 'Cabello debilitado, requiere tratamiento urgente.';
                if (num >= 8.5) desc = 'Cabello en excelentes condiciones de salud.';
                else if (num >= 6.0) desc = 'Cabello saludable, requiere mantenimiento.';
                return { score: num, desc };
              };

              const hairTypeVal = latest.hair_type || client.hair_type || 'Normal';
              const hairTypeData = getHairTypeData(hairTypeVal);

              const porosityVal = latest.porosity || 'Media';
              const porosityData = getPorosityData(porosityVal);

              const elasticityVal = latest.elasticity || 'Buena';
              const elasticityData = getElasticityData(elasticityVal);

              const overallScoreVal = latest.overall_score ?? 7.5;
              const overallScoreData = getOverallScoreData(overallScoreVal);

              const scalpHealthPct = latest.scalp_health_pct ?? 70;
              const observations = Array.isArray(latest.observations)
                ? latest.observations
                : (latest.observations ? String(latest.observations).split('\n').filter(Boolean) : []);
              const images = Array.isArray(latest.images) ? latest.images : [];

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: (isMobile || isTablet) ? '10px' : '12px' }}>
                    {/* Card 1: Tipo de Cabello */}
                    <div className="glass-card mi-card" style={{ padding: '16px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(160,80,106,0.15)', boxShadow: '0 4px 16px rgba(160,80,106,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '142px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--magenta-gradient)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Scissors size={14} color="white" />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Hebra</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{hairTypeVal}</div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '3px', margin: '4px 0 2px' }}>
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} style={{ flex: 1, height: '4px', borderRadius: '2px', background: idx === hairTypeData.activeIndex ? 'var(--pink-primary)' : 'rgba(160,80,106,0.08)', boxShadow: idx === hairTypeData.activeIndex ? '0 0 4px rgba(201, 114, 130, 0.4)' : 'none' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>{hairTypeData.textMin}</span>
                          <span>{hairTypeData.textMax}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: '500', lineHeight: '1.35' }}>"{hairTypeData.desc}"</p>
                      </div>
                    </div>

                    {/* Card 2: Porosidad */}
                    <div className="glass-card mi-card" style={{ padding: '16px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(160,80,106,0.15)', boxShadow: '0 4px 16px rgba(160,80,106,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '142px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--magenta-gradient)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircleDot size={14} color="white" />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Porosidad</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{porosityVal}</div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '3px', margin: '4px 0 2px' }}>
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} style={{ flex: 1, height: '4px', borderRadius: '2px', background: idx === porosityData.activeIndex ? 'var(--pink-primary)' : 'rgba(160,80,106,0.08)', boxShadow: idx === porosityData.activeIndex ? '0 0 4px rgba(201, 114, 130, 0.4)' : 'none' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>{porosityData.textMin}</span>
                          <span>{porosityData.textMax}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: '500', lineHeight: '1.35' }}>"{porosityData.desc}"</p>
                      </div>
                    </div>

                    {/* Card 3: Elasticidad */}
                    <div className="glass-card mi-card" style={{ padding: '16px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(160,80,106,0.15)', boxShadow: '0 4px 16px rgba(160,80,106,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '142px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--magenta-gradient)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Waves size={14} color="white" />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Elasticidad</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{elasticityVal}</div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: '3px', margin: '4px 0 2px' }}>
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} style={{ flex: 1, height: '4px', borderRadius: '2px', background: idx === elasticityData.activeIndex ? 'var(--pink-primary)' : 'rgba(160,80,106,0.08)', boxShadow: idx === elasticityData.activeIndex ? '0 0 4px rgba(201, 114, 130, 0.4)' : 'none' }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>{elasticityData.textMin}</span>
                          <span>{elasticityData.textMax}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: '500', lineHeight: '1.35' }}>"{elasticityData.desc}"</p>
                      </div>
                    </div>

                    {/* Card 4: Estado General */}
                    <div className="glass-card mi-card" style={{ padding: '16px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(160,80,106,0.15)', boxShadow: '0 4px 16px rgba(160,80,106,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '142px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--magenta-gradient)', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Star size={14} color="white" />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Salud</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '4px' }}>{overallScoreVal}/10</div>
                      </div>
                      <div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(160,80,106,0.08)', overflow: 'hidden', margin: '4px 0 2px' }}>
                          <div style={{ height: '100%', width: `${overallScoreData.score * 10}%`, background: 'var(--magenta-gradient)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'var(--text-muted)', fontWeight: '750', textTransform: 'uppercase', marginBottom: '4px' }}>
                          <span>Crítico</span>
                          <span>Óptimo</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: '500', lineHeight: '1.35' }}>"{overallScoreData.desc}"</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1.1fr 0.9fr', gap: (isMobile || isTablet) ? '12px' : '12px' }}>
                    <div className="glass-card mi-card" style={{ padding: (isMobile || isTablet) ? '16px' : '20px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Condición del Cabello</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {bars.map((b, i) => {
                          const tag = tagFor(b.pct);
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: '700' }}>{b.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '850' }}>{b.pct}%</span>
                                  <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: tag.bg, color: tag.color, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{tag.label}</span>
                                </div>
                              </div>
                              <div style={{ height: '8px', borderRadius: '10px', background: 'rgba(160,80,106,0.06)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${b.pct}%`, borderRadius: '10px', background: 'linear-gradient(90deg, var(--pink-primary) 0%, var(--magenta-primary) 100%)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="glass-card mi-card" style={{ padding: '20px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salud del Cuero Cabelludo</h4>
                      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                          width: '114px', height: '114px', borderRadius: '50%', flexShrink: 0,
                          background: `conic-gradient(var(--magenta-primary) 0deg, var(--pink-primary) ${scalpHealthPct * 3.6}deg, rgba(160,80,106,0.06) ${scalpHealthPct * 3.6}deg 360deg)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(160,80,106,0.1)'
                        }}>
                          <div style={{ width: '86px', height: '86px', borderRadius: '50%', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: '20px', fontWeight: '850', color: 'var(--text-primary)' }}>{scalpHealthPct}%</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2px' }}>General</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', width: '100%' }}>
                          {scalpItems.map((it, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'white', paddingRight: '6px', zIndex: 1 }}>
                                {React.cloneElement(it.icon, { size: 12, color: 'var(--magenta-primary)' })}
                                <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>{it.label}</span>
                              </div>
                              <div style={{ flex: 1, borderBottom: '1px dashed rgba(160,80,106,0.15)', margin: '0 6px', position: 'relative', top: '3px' }} />
                              <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '800', background: 'white', paddingLeft: '6px', zIndex: 1 }}>{it.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(observations.length > 0 || images.length > 0) && (
                    <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : (observations.length > 0 && images.length > 0 ? '1.2fr 0.8fr' : '1fr'), gap: '12px' }}>
                      {observations.length > 0 && (
                        <div className="glass-card mi-card" style={{ 
                          padding: '24px', 
                          borderRadius: '20px', 
                          background: 'rgba(160,80,106,0.015)', 
                          border: '1px solid rgba(160,80,106,0.1)',
                          borderLeft: '5px solid var(--magenta-primary)',
                          maxWidth: '850px',
                          boxShadow: '0 4px 20px rgba(160,80,106,0.02)'
                        }}>
                          <h4 style={{ margin: '0 0 16px', fontSize: '14.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} color="var(--magenta-primary)" /> Anotaciones del Especialista
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {observations.map((obs, i) => (
                              <div key={i} style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '12px',
                                padding: '12px 0',
                                borderBottom: i === observations.length - 1 ? 'none' : '1px dashed rgba(160,80,106,0.08)'
                              }}>
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(46,158,91,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                  <Check size={11} color="#2e9e5b" strokeWidth={3} />
                                </div>
                                <span style={{ fontSize: '14.5px', color: 'var(--text-secondary)', fontWeight: '500', lineHeight: 1.5 }}>{obs}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {images.length > 0 && (
                        <div className="glass-card mi-card" style={{ padding: '20px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                          <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imágenes del Diagnóstico</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {images.slice(0, 6).map((img, i) => (
                              <img key={i} src={img} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="glass-card mi-card" style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '12px' : '0', marginBottom: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                <Activity size={18} color="var(--pink-primary)" /> Historial de Diagnósticos
              </h4>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('diagnosis', { clientId: client.id })}
                  className="btn-pink mi-btn"
                  style={isMobile
                    ? { width: '100%', height: '44px', padding: '0 16px', fontSize: '14px', fontWeight: '750', borderRadius: '12px' }
                    : { height: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  + Nuevo Diagnóstico
                </button>
              )}
            </div>

            {loadingDiagnoses ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <Loader2 className="animate-spin" size={20} /> Cargando diagnósticos...
              </div>
            ) : diagnoses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>No hay diagnósticos capilares registrados para esta clienta.</p>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px', 
                position: 'relative',
                  paddingLeft: isMobile ? '0' : '20px',
                  borderLeft: isMobile ? 'none' : '2.5px solid rgba(160, 80, 106, 0.1)'
                }}>
                  {diagnoses.map(diag => (
                    <div
                      key={diag.id}
                      style={{
                        position: 'relative',
                        padding: isMobile ? '18px 16px' : '20px', 
                        borderRadius: '18px', 
                        backgroundColor: 'white',
                        border: '1px solid rgba(160, 80, 106, 0.12)', 
                        boxShadow: '0 4px 16px rgba(160, 80, 106, 0.04)'
                      }}
                    >
                      {!isMobile && (
                        <div style={{
                          position: 'absolute',
                          left: '-29px',
                          top: '22px',
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          background: 'var(--magenta-gradient)',
                          border: '3px solid #fffbfa',
                          boxShadow: '0 2px 6px rgba(160, 80, 106, 0.25)',
                          zIndex: 2
                        }} />
                      )}

                      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '0', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: isMobile ? '15px' : '14.5px', fontWeight: '800', color: 'var(--pink-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Activity size={15} /> Diagnóstico del {new Date(diag.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {new Date(diag.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                        {[
                          { label: 'Hebra', value: diag.hair_type },
                          { label: 'Porosidad', value: diag.porosity },
                          { label: 'Cuero', value: diag.scalp_condition },
                        ].filter(f => f.value).map((f, i) => {
                          const style = getBadgeStyle(f.value);
                          return (
                            <div key={i} className="mi-tag" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '20px', background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}:</span>
                              <span style={{ fontSize: '12.5px', fontWeight: '800' }}>{f.value}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '12px' }}>
                        {diag.chemical_history && (
                          <div style={{ background: 'rgba(160,80,106,0.005)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(160,80,106,0.05)' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Historial Químico</div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>{diag.chemical_history}</p>
                          </div>
                        )}

                        {diag.recommended_treatment && (
                          <div style={{ 
                            background: 'rgba(160,80,106,0.02)', 
                            padding: '12px 14px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(160,80,106,0.08)',
                            borderLeft: '4px solid var(--magenta-primary)'
                          }}>
                            <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={12} color="var(--magenta-primary)" /> Tratamiento Recomendado
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '700', lineHeight: '1.45' }}>{diag.recommended_treatment}</p>
                          </div>
                        )}

                        {diag.notes && (
                          <div style={{ background: 'rgba(160,80,106,0.005)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(160,80,106,0.05)' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>Notas de Sesión</div>
                            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.45' }}>{diag.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            )}
            </div>
          </div>
        );
      case 'packages': {
        const clientFirstName = client?.name?.split(' ')[0] || 'la clienta';
        const demoPkgs = packages.length === 0;
        const activePkg = demoPkgs ? { id: 'dp1', name: 'Renacer Capilar Premium', desc: 'Tratamiento intensivo para restaurar la salud, fuerza y brillo natural del cabello.', includes: ['Diagnóstico avanzado', 'Tratamiento láser capilar', 'Hidratación profunda', 'Masaje capilar detox', 'Terapia de reconstrucción', 'Kit de mantenimiento'], used: 3, total: 6, expires: '10 jul 2025', price: 480, date: '10 abr 2025' } : packages.find(p => p.status === 'active') || packages[0];
        const pkgPct = activePkg ? Math.round((activePkg.used_sessions !== undefined ? activePkg.used_sessions : activePkg.used) / (activePkg.total_sessions || activePkg.total) * 100) : 0;
        const remaining = activePkg ? (activePkg.total_sessions || activePkg.total) - (activePkg.used_sessions || activePkg.used) : 0;

        const pkgHistory = demoPkgs ? [
          { name: 'Renacer Capilar Premium', date: '10 abr 2025', price: '$480', status: 'Activo' },
          { name: 'Glow & Repair', date: '05 feb 2025', price: '$380', status: 'Completado' },
          { name: 'Detox Capilar', date: '12 nov 2024', price: '$250', status: 'Completado' },
        ] : packages.map(p => ({ name: p.services?.name || 'Paquete', date: p.created_at ? new Date(p.created_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' }) : '', price: `$${p.total_price || 0}`, status: p.status === 'active' ? 'Activo' : 'Completado' }));

        const upcomingSessions = demoPkgs ? [
          { day: '10', month: 'MAY', time: '10:00 AM', client: 'Mariana R.', service: 'Hidratación profunda', status: 'Confirmada' },
          { day: '24', month: 'MAY', time: '10:00 AM', client: 'Mariana R.', service: 'Terapia de reconstrucción', status: 'Confirmada' },
          { day: '07', month: 'JUN', time: '10:00 AM', client: 'Mariana R.', service: 'Tratamiento láser capilar', status: 'Confirmada' },
        ] : [];

        const recentSessions = demoPkgs ? [
          { date: '03 may 2025 · 10:00 AM', service: 'Hidratación profunda', client: 'Mariana R.', status: 'Completada', notes: 'Cabello con excelente respuesta a la hidratación.', results: ['+ Brillo', '+ Suavidad', '− Frizz'] },
          { date: '19 abr 2025 · 10:00 AM', service: 'Tratamiento detox capilar', client: 'Mariana R.', status: 'Completada', notes: 'Cuero cabelludo limpio y equilibrado.', results: ['+ Ligereza', '+ Vitalidad', '− Oleosidad'] },
        ] : [];

        const totalSpent = demoPkgs ? 480 : packages.reduce((s, p) => s + (Number(p.total_price) || 0), 0);
        const pendingSessions = demoPkgs ? 3 : remaining;
        const nextSession = demoPkgs ? '10 may 2025' : (upcomingAppointment ? new Date(upcomingAppointment.scheduled_at).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '850', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} color="var(--pink-primary)" /> Paquetes y sesiones
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Gestiona los paquetes contratados y el progreso de sesiones de {clientFirstName}.</p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '12px' }}>
              {[
                { label: 'Paquetes activos', value: demoPkgs ? 1 : packages.filter(p => p.status === 'active').length, sub: 'Ver detalles →', iconBg: 'rgba(160,80,106,0.08)', icon: <Package size={18} color="var(--pink-primary)" /> },
                { label: 'Sesiones pendientes', value: pendingSessions, sub: 'Ver calendario →', iconBg: 'rgba(160,80,106,0.06)', icon: <Calendar size={18} color="var(--magenta-primary)" /> },
                { label: 'Próxima sesión', value: nextSession || 'N/A', sub: nextSession ? (demoPkgs ? '10:00 AM · Mariana R.' : '') : 'Sin citas programadas', iconBg: 'rgba(160,80,106,0.05)', icon: <Clock size={18} color="var(--pink-primary)" /> },
                { label: 'Valor invertido', value: `$${totalSpent.toLocaleString()}`, sub: 'Ver resumen financiero →', iconBg: 'rgba(160,80,106,0.04)', icon: <Receipt size={18} color="var(--magenta-primary)" /> },
              ].map((s, i) => (
                <div key={i} className={`ficha-card stagger-${i + 1} mi-stat`} style={{ padding: (isMobile || isTablet) ? '12px 14px' : '16px 18px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: (isMobile || isTablet) ? '10px' : '14px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)', cursor: 'pointer', minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ width: (isMobile || isTablet) ? '36px' : '42px', height: (isMobile || isTablet) ? '36px' : '42px', borderRadius: '14px', backgroundColor: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: (isMobile || isTablet) ? '10px' : '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '15px' : '17px', fontWeight: '850', color: 'var(--text-primary)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.value}</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '9.5px' : '10.5px', color: 'var(--pink-primary)', fontWeight: '600', marginTop: '1px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main: Active Package + Upcoming Sessions */}
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1.2fr 0.8fr', gap: (isMobile || isTablet) ? '16px' : '20px', alignItems: 'start' }}>
              {/* Active Package */}
              <div className="ficha-card mi-card" style={{ padding: (isMobile || isTablet) ? '16px' : '24px', borderRadius: '20px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '850', color: 'var(--text-primary)' }}>Paquete activo</h4>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', background: 'rgba(34,197,94,0.08)', color: '#22c55e', textTransform: 'uppercase' }}>Activo</span>
                </div>
                {activePkg && (
                  <div style={{ display: 'flex', gap: (isMobile || isTablet) ? '16px' : '20px', flexWrap: 'wrap', flexDirection: (isMobile || isTablet) ? 'column' : 'row' }}>
                    {/* Left: Package Info */}
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: (isMobile || isTablet) ? '38px' : '44px', height: (isMobile || isTablet) ? '38px' : '44px', borderRadius: '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Sparkles size={20} color="white" />
                        </div>
                        <div>
                          <div style={{ fontSize: '17px', fontWeight: '850', color: 'var(--text-primary)' }}>{activePkg.name || activePkg.services?.name || 'Paquete'}</div>
                        </div>
                      </div>
                      <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{activePkg.desc || ''}</p>

                      {activePkg.includes && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>Incluye:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                            {activePkg.includes.map((item, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(46,158,91,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={9} color="#2e9e5b" strokeWidth={3} /></span>
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Progress */}
                    <div style={{ flex: (isMobile || isTablet) ? '1 1 100%' : '0 0 200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>Sesiones utilizadas</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '28px', fontWeight: '900', color: 'var(--magenta-primary)' }}>{activePkg.used_sessions ?? activePkg.used}</span>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-muted)' }}>/ {activePkg.total_sessions ?? activePkg.total}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{pkgPct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(160,80,106,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pkgPct}%`, height: '100%', background: 'var(--magenta-gradient)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                      {activePkg.expires && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          <Calendar size={12} /> Vence el: <strong style={{ color: 'var(--text-primary)' }}>{activePkg.expires}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: 'rgba(160,80,106,0.04)' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--magenta-primary)' }}>Créditos restantes</span>
                        <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--magenta-primary)' }}>{remaining}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upcoming Sessions */}
              <div className="ficha-card mi-card" style={{ padding: '20px', borderRadius: '20px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)' }}>Próximas sesiones</h4>
                  <button className="btn-interactive" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--pink-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px' }}>
                    <Calendar size={12} /> Ver calendario
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcomingSessions.map((s, i) => (
                    <div key={i} className="ficha-row btn-interactive mi-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', background: 'rgba(160,80,106,0.02)', cursor: 'pointer' }}>
                      <div style={{ textAlign: 'center', minWidth: '40px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--magenta-primary)', lineHeight: '1' }}>{s.day}</div>
                        <div style={{ fontSize: '8px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.month}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {s.time} · <User size={10} /> {s.client}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '750', color: 'var(--text-primary)', marginTop: '2px' }}>¡ {s.service}</div>
                      </div>
                      <span className="ficha-tag mi-tag" style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '800', background: 'rgba(46,158,91,0.08)', color: '#2e9e5b', textTransform: 'uppercase', flexShrink: 0 }}>{s.status}</span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
                {upcomingSessions.length > 3 && (
                  <button className="btn-interactive" style={{ width: '100%', marginTop: '10px', padding: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--pink-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                    Ver todas las sesiones →
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: History + Recent Sessions + Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1fr 1fr', gap: '16px' }}>
              {/* Package History */}
              <div className="ficha-card mi-card" style={{ padding: '20px', borderRadius: '20px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '850', color: 'var(--text-primary)' }}>Historial de paquetes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.6fr 0.7fr', gap: '4px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', padding: '0 0 8px', marginBottom: '4px' }}>
                  <span>Paquete</span><span>Fecha</span><span>Monto</span><span>Estado</span>
                </div>
                {pkgHistory.map((p, i) => (
                  <div key={i} className="ficha-row mi-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.6fr 0.7fr', gap: '4px', padding: '10px 0', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.date}</div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{p.price}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="ficha-tag mi-tag" style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: '800', background: p.status === 'Activo' ? 'rgba(34,197,94,0.08)' : 'rgba(160,80,106,0.06)', color: p.status === 'Activo' ? '#22c55e' : 'var(--text-muted)', textTransform: 'uppercase' }}>{p.status}</span>
                      <ChevronRight size={10} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
                <button className="btn-interactive" style={{ width: '100%', marginTop: '10px', padding: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--pink-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                  Ver historial completo →
                </button>
              </div>

              {/* Recent Sessions */}
              <div className="ficha-card mi-card" style={{ padding: '20px', borderRadius: '20px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '850', color: 'var(--text-primary)' }}>Sesiones recientes</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {recentSessions.map((s, i) => (
                    <div key={i} className="ficha-row mi-row" style={{ padding: '12px', borderRadius: '12px', background: 'rgba(160,80,106,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>{s.date}</div>
                        <span className="ficha-tag mi-tag" style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: '800', background: 'rgba(46,158,91,0.08)', color: '#2e9e5b', textTransform: 'uppercase' }}>{s.status}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '2px' }}>{s.service}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{s.client}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notas: {s.notes}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {s.results.map((r, ri) => (
                          <span key={ri} className="ficha-tag mi-tag" style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '9.5px', fontWeight: '700', background: 'rgba(160,80,106,0.04)', color: 'var(--magenta-primary)' }}>{r}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn-interactive" style={{ width: '100%', marginTop: '10px', padding: '10px', fontSize: '12px', fontWeight: '700', color: 'var(--pink-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                  Ver todas las sesiones →
                </button>
              </div>

              {/* Recommendations */}
              <div className="ficha-card mi-card" style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(160deg, rgba(160,80,106,0.04) 0%, rgba(160,80,106,0.01) 100%)', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '850', color: 'var(--text-primary)' }}>Recomendaciones para {clientFirstName}</h4>
                <div className="ficha-row mi-row" style={{ padding: '14px', borderRadius: '14px', background: 'white', boxShadow: '0 1px 6px rgba(160,80,106,0.04)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Siguiente paso recomendado</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '6px' }}>Paquete Fortalece & Crece</div>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Estimula el crecimiento, fortalece la fibra capilar y previene la caída.</p>
                  <button className="btn-pink btn-interactive mi-btn" style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: '750', borderRadius: '12px' }}>Ver detalles del paquete</button>
                </div>
                <div className="ficha-row mi-row" style={{ padding: '12px', borderRadius: '12px', background: 'white', boxShadow: '0 1px 6px rgba(160,80,106,0.04)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Producto sugerido</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(160,80,106,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Droplet size={16} color="var(--pink-primary)" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Sérum Fortalecedor Jana Studio</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Uso diario para nutrir y proteger el cabello.</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>Ver producto →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'history': {
        const demoHistory = [
          { id: 'dh1', day: '10', month: 'MAY', year: '2025', time: '10:00 AM', client: 'Mariana R.', service: 'Hidratación profunda', status: 'Completada', duration: '90 min', price: 480, description: 'Cabello con excelente respuesta a la hidratación. Se recomienda mantener rutina.', tags: ['Hidratación', 'Nutrición', 'Brillo'], detail: { diagnostic: 'Cuero cabelludo en buenas condiciones. Hidratación adecuada y cutícula sellada. Ligera acumulación de residuos en puntas.', products: [{ name: 'Shampoo Hidratante Jana Studio', desc: 'Limpieza suave e hidratación profunda.' }, { name: 'Mascarilla Repair Intense', desc: 'Nutrición intensiva y reparación.' }, { name: 'Sérum de Brillo Jana Studio', desc: 'Protección térmica y brillo duradero.' }], recommendations: ['Mantener hidratación semanal.', 'Usar protector térmico siempre.', 'Aplicar sérum en puntas cada 2 días.'], notes: 'Excelente progreso en la hidratación. Seguir con la rutina recomendada para mantener el brillo y la suavidad.', specialist: 'Mariana R.' } },
          { id: 'dh2', day: '24', month: 'MAY', year: '2024', time: '10:00 AM', client: 'Mariana R.', service: 'Terapia de reconstrucción', status: 'Completada', duration: '120 min', price: 560, description: 'Tratamiento de reconstrucción capilar completo.', tags: ['Reconstrucción', 'Proteínas'], detail: { diagnostic: 'Cabello con daño químico moderado. Cutícula abierta en zonas medias y puntas.', products: [{ name: 'Keratina Líquida Jana Studio', desc: 'Reconstrucción profunda de la fibra capilar.' }, { name: 'Mascarilla Protein Force', desc: 'Reconstituye la masa capilar.' }], recommendations: ['Evitar calor excesivo por 2 semanas.', 'Aplicar máscara de proteínas quincenal.', 'Cortar puntas cada 6 semanas.'], notes: 'Buena evolución. El cabello recuperó fuerza y elasticidad.', specialist: 'Mariana R.' } },
          { id: 'dh3', day: '07', month: 'JUN', year: '2024', time: '10:00 AM', client: 'Mariana R.', service: 'Tratamiento láser capilar', status: 'Completada', duration: '60 min', price: 420, description: 'Sesión de láser capilar para estimulación de folículos.', tags: ['Láser', 'Crecimiento'], detail: { diagnostic: 'Zona temporal con ligera reducción de densidad. Folículos en fase catágena.', products: [], recommendations: ['Completar ciclo de 8 sesiones.', 'Evitar exposición solar directo.', 'Usar sérum estimulante diario.'], notes: 'Primeros signos de mejora visible. Mantener las sesiones quincenales.', specialist: 'Mariana R.' } },
          { id: 'dh4', day: '18', month: 'ABR', year: '2024', time: '10:30 AM', client: 'Mariana R.', service: 'Masaje capilar detox', status: 'Completada', duration: '60 min', price: 350, description: 'Limpieza profunda del cuero cabelludo con productos naturales.', tags: ['Detox', 'Limpieza'], detail: { diagnostic: 'Acumulación de productos en el cuero cabelludo. Poros obstruidos levemente.', products: [{ name: 'Shampoo Detox Jana Studio', desc: 'Limpieza profunda con arcilla verde.' }, { name: 'Tónico Scalp Purifier', desc: 'Purificación y equilibrio del cuero cabelludo.' }], recommendations: ['Realizar detox cada 2 meses.', 'Reducir uso de productos con siliconas.', 'Masajear cuero cabelludo durante el lavado.'], notes: 'Excelente resultado. El cuero cabelludo recuperó su equilibrio natural.', specialist: 'Mariana R.' } },
        ];

        const hTotalVisits = history.length || demoHistory.length;
        const hTotalSpent = history.length > 0 ? history.reduce((s, h) => s + (Number(h.amount) || 0), 0) : demoHistory.reduce((s, h) => s + h.price, 0);
        const hFavService = history.length > 0 ? (() => { const counts = {}; history.forEach(h => { const n = h.service_name || 'Servicio'; counts[n] = (counts[n] || 0) + 1; }); return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]; })() : ['Hidratación profunda', 4];
        const hLastVisit = history.length > 0 ? history[0]?.created_at : '2025-05-10T10:00:00';
        const hSinceMonth = history.length > 0 && history[history.length - 1]?.created_at
          ? new Date(history[history.length - 1].created_at).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })
          : 'Feb 2024';
        const hLastAgo = (() => {
          if (!hLastVisit) return '';
          const diff = Date.now() - new Date(hLastVisit).getTime();
          const days = Math.floor(diff / 86400000);
          if (days < 1) return 'Hoy';
          if (days < 7) return `Hace ${days} días`;
          if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
          return `Hace ${Math.floor(days / 30)} meses`;
        })();

        const serviceDistribution = [
          { name: 'Hidratación', pct: 50, color: '#c97282' },
          { name: 'Reparación', pct: 25, color: '#a0506a' },
          { name: 'Detox', pct: 12.5, color: '#dfb4a8' },
          { name: 'Otros', pct: 12.5, color: '#e8cfc9' },
        ];
        let cumulativeDeg = 0;
        const conicStops = serviceDistribution.map(s => { const start = cumulativeDeg; cumulativeDeg += s.pct * 3.6; return `${s.color} ${start}deg ${cumulativeDeg}deg`; }).join(', ');

        const activeHistory = history.length > 0 ? history : demoHistory;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '850', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={20} color="var(--pink-primary)" /> Historial de Visitas
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Registro completo de todas las visitas y tratamientos realizados.</p>
              </div>
              <button className="btn-pink btn-interactive mi-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', fontSize: '13px', fontWeight: '750', borderRadius: '14px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Plus size={16} /> Nueva Sesión
              </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: (isMobile || isTablet) ? '10px' : '12px' }}>
              {[
                { label: 'Total de visitas', value: hTotalVisits, sub: `desde ${hSinceMonth}`, iconBg: 'rgba(160,80,106,0.08)', icon: <Calendar size={18} color="var(--pink-primary)" /> },
                { label: 'Total invertido', value: `$${hTotalSpent.toLocaleString()}`, sub: 'en tratamientos', iconBg: 'rgba(160,80,106,0.06)', icon: <Receipt size={18} color="var(--magenta-primary)" /> },
                { label: 'Servicio favorito', value: hFavService[0], sub: `${hFavService[1]} sesiones realizadas`, iconBg: 'rgba(217,70,168,0.06)', icon: <Star size={18} color="var(--pink-primary)" /> },
                { label: 'Última visita', value: hLastVisit ? new Date(hLastVisit).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A', sub: hLastAgo, iconBg: 'rgba(160,80,106,0.05)', icon: <Clock size={18} color="var(--magenta-primary)" /> },
              ].map((s, i) => (
                <div key={i} className={`ficha-card stagger-${i + 1} mi-stat`} style={{ padding: (isMobile || isTablet) ? '12px 14px' : '16px 18px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: (isMobile || isTablet) ? '10px' : '14px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)', cursor: 'pointer', minWidth: 0 }}>
                  <div style={{ width: (isMobile || isTablet) ? '36px' : '42px', height: (isMobile || isTablet) ? '36px' : '42px', borderRadius: '14px', backgroundColor: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: (isMobile || isTablet) ? '10px' : '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '15px' : '17px', fontWeight: '850', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.3 }}>{s.value}</div>
                    <div style={{ fontSize: (isMobile || isTablet) ? '9.5px' : '10.5px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '1px', lineHeight: 1.3 }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Content: Timeline + Sidebar */}
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 300px', gap: (isMobile || isTablet) ? '16px' : '20px', alignItems: 'start' }}>
              {/* Timeline */}
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)', margin: '0 0 16px 0', letterSpacing: '-0.2px' }}>Historial cronológico</h4>
                {loadingHistory ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 className="animate-spin" size={20} /> Cargando historial...
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: isMobile ? '0' : '28px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {activeHistory.map((v, i) => {
                      const isExpanded = expandedHistoryVisit === v.id;
                      const detail = v.detail;
                      const d = v.day || (v.created_at ? new Date(v.created_at).getDate() : '');
                      const m = v.month || (v.created_at ? new Date(v.created_at).toLocaleDateString('es-VE', { month: 'short' }).toUpperCase().replace('.', '') : '');
                      const y = v.year || (v.created_at ? new Date(v.created_at).getFullYear() : '');
                      const t = v.time || (v.created_at ? new Date(v.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '');
                      const svc = v.service || v.service_name || '';
                      const prc = v.price || v.amount || 0;
                      const dur = v.duration || '';
                      const sts = v.status || 'Completada';
                      const desc = v.description || '';
                      const tags = v.tags || [];
                      return (
                        <div key={v.id || i} style={{ position: 'relative', paddingBottom: i < activeHistory.length - 1 ? '24px' : '0' }}>
                          {/* Timeline dot */}
                          {!isMobile && (
                            <div style={{ position: 'absolute', left: '-38px', top: '6px', width: '14px', height: '14px', borderRadius: '50%', background: 'var(--magenta-gradient)', border: '3px solid #fff', boxShadow: '0 2px 6px rgba(160,80,106,0.25)', zIndex: 2 }} />
                          )}

                          {/* Visit Card */}
                          <div
                            onClick={() => setExpandedHistoryVisit(isExpanded ? null : v.id)}
                            className="btn-interactive"
                            style={{
                              padding: isMobile ? '14px' : '18px',
                              borderRadius: '16px',
                              background: isExpanded ? 'rgba(160,80,106,0.03)' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: isExpanded ? '0 6px 20px rgba(160,80,106,0.08)' : '0 2px 8px rgba(160,80,106,0.03)',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                              {/* Date Circle */}
                              <div style={{ minWidth: '52px', textAlign: 'center', flexShrink: 0 }}>
                                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--magenta-primary)', lineHeight: '1' }}>{d}</div>
                                <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m}</div>
                                <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>{y}</div>
                              </div>

                              {/* Visit Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    <Clock size={11} /> {t}
                                    <span style={{ margin: '0 2px' }}>·</span>
                                    <span>{v.client}</span>
                                  </div>
                                   <span className="ficha-tag mi-tag" style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', backgroundColor: sts === 'Completada' ? 'rgba(46,158,91,0.08)' : 'rgba(230,159,60,0.08)', color: sts === 'Completada' ? '#2e9e5b' : '#c9821f', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{sts}</span>
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--text-primary)', marginBottom: '6px' }}>{svc}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                  {dur && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {dur}</span>}
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', color: '#2e9e5b' }}>${prc}</span>
                                </div>
                                {desc && <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: tags.length > 0 ? '8px' : '0' }}>{desc}</div>}
                                {tags.length > 0 && (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {tags.map((tag, ti) => (
                                      <span key={ti} className="ficha-tag mi-tag" style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: 'rgba(160,80,106,0.06)', color: 'var(--magenta-primary)' }}>{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expanded Detail Panel */}
                            {isExpanded && detail && (
                              <div style={{ marginTop: '16px', paddingTop: '16px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '850', color: 'var(--text-primary)' }}>Detalles de la visita</h5>
                                   <button onClick={() => setExpandedHistoryVisit(null)} className="btn-interactive" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}><ChevronDown size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                  {/* Left Column */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Diagnóstico */}
                                    <div className="ficha-row" style={{ background: 'rgba(160,80,106,0.02)', padding: '14px', borderRadius: '12px' }}>
                                       <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Resumen del diagnóstico</div>
                                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{detail.diagnostic}</p>
                                    </div>
                                    {/* Recomendaciones */}
                                    <div className="ficha-row" style={{ background: 'rgba(160,80,106,0.02)', padding: '14px', borderRadius: '12px' }}>
                                       <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>Recomendaciones</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {detail.recommendations.map((rec, ri) => (
                                          <div key={ri} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--pink-primary)', flexShrink: 0, marginTop: '5px' }} />
                                            {rec}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Right Column */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Productos */}
                                    {detail.products.length > 0 && (
                                      <div className="ficha-row" style={{ background: 'rgba(160,80,106,0.02)', padding: '14px', borderRadius: '12px' }}>
                                         <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>Productos y servicios utilizados</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                          {detail.products.map((p, pi) => (
                                            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(160,80,106,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={14} color="var(--pink-primary)" /></div>
                                              <div>
                                                <div style={{ fontSize: '12.5px', fontWeight: '750', color: 'var(--text-primary)' }}>{p.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {/* Notas */}
                                    {detail.notes && (
                                      <div className="ficha-row" style={{ background: 'rgba(160,80,106,0.02)', padding: '14px', borderRadius: '12px' }}>
                                         <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--magenta-primary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Notas de la especialista</div>
                                        <p style={{ margin: '0 0 6px', fontSize: '12.5px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>"{detail.notes}"</p>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>— {detail.specialist}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   {/* Patrones de visitas */}
                   <div className="ficha-card mi-card" style={{ padding: '18px', borderRadius: '18px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                     <h5 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: '850', color: 'var(--text-primary)' }}>Patrones de visitas</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { icon: <Calendar size={14} />, label: 'Frecuencia promedio', value: 'Cada 45 días' },
                        { icon: <Star size={14} />, label: 'Mejor día', value: 'Viernes' },
                        { icon: <Clock size={14} />, label: 'Mejor hora', value: '10:00 AM' },
                        { icon: <Activity size={14} />, label: 'Anticipación promedio', value: '3 días' },
                      ].map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(160,80,106,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)', flexShrink: 0 }}>{p.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '600' }}>{p.label}</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{p.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Próxima recomendación */}
                   <div className="ficha-card mi-card" style={{ padding: '18px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(160,80,106,0.04) 0%, rgba(160,80,106,0.01) 100%)', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                     <h5 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: '850', color: 'var(--text-primary)' }}>Próxima recomendación</h5>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Tu próxima sesión sugerida</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--magenta-primary)', marginBottom: '4px' }}>21 jun 2025</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>En 36 días</div>
                    <button className="btn-pink btn-interactive mi-btn" style={{ width: '100%', padding: '10px', fontSize: '12px', fontWeight: '750', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Calendar size={14} /> Agendar visita
                    </button>
                  </div>

                   {/* Estadísticas rápidas */}
                   <div className="ficha-card mi-card" style={{ padding: '18px', borderRadius: '18px', background: 'white', boxShadow: '0 2px 12px rgba(160,80,106,0.04)' }}>
                     <h5 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: '850', color: 'var(--text-primary)' }}>Estadísticas rápidas</h5>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Donut */}
                      <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `conic-gradient(${conicStops})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: '1' }}>{hTotalVisits}</span>
                            <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Visitas</span>
                          </div>
                        </div>
                      </div>
                      {/* Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        {serviceDistribution.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{s.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>{s.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const lastVisitLabel = history.length > 0 && history[0]?.created_at
    ? new Date(history[0].created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin visitas';

  return (
    <div ref={containerRef} style={{ paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              color: 'var(--pink-primary)',
              background: 'rgba(160,80,106,0.12)',
              border: '1px solid rgba(160,80,106,0.2)',
              padding: '8px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '750',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            className="btn-interactive mi-btn"
          >
            &larr; Volver
          </button>
          {/* Breadcrumbs removed as requested */}
        </div>
        <button
          onClick={onDelete}
          style={{ 
            color: '#d44e6c', 
            background: 'rgba(212, 78, 108, 0.08)', 
            border: '1px solid rgba(212, 78, 108, 0.15)', 
            padding: '8px 14px', 
            borderRadius: '20px', 
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '750',
            transition: 'all 0.2s'
          }}
          className="btn-interactive mi-btn"
        >
          Eliminar Ficha
        </button>
      </div>
      
      {isCompact ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Mobile Profile Card */}
          <div 
            className="glass-card mi-card"
            style={{ 
              padding: '24px 20px', 
              borderRadius: '28px', 
              background: 'linear-gradient(135deg, #ffffff 0%, #fefbfc 100%)',
              borderLeft: '6px solid var(--magenta-primary)',
              borderTop: '1px solid rgba(160,80,106,0.1)',
              borderRight: '1px solid rgba(160,80,106,0.1)',
              borderBottom: '1px solid rgba(160,80,106,0.1)',
              boxShadow: '0 20px 40px rgba(160,80,106,0.06)' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
              {/* Squircle Avatar with rotate accent */}
              <div style={{ 
                width: '74px', height: '74px', borderRadius: '22px', 
                background: client.image_url ? 'white' : 'var(--magenta-gradient)', 
                display: 'flex', alignItems: 'center', 
                justifyContent: 'center', border: '2.5px solid white', 
                outline: '2.5px solid rgba(160,80,106,0.25)',
                boxShadow: '0 8px 24px rgba(160, 80, 106, 0.18)', overflow: 'hidden',
                flexShrink: 0,
                transform: 'rotate(-2deg)'
              }}>
                {client.image_url ? (
                  <img src={client.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
                    {client.name ? client.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'C'}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.4px', lineHeight: '1.3' }}>{client.name}</h3>
                <p style={{ margin: '2px 0 10px 0', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>V-{client.id_card || '00.000.000'}</p>
                
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {client.phone && (
                    <>
                      <a 
                        href={`tel:${client.phone}`}
                        style={{ 
                          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', 
                          fontSize: '10.5px', color: 'white', fontWeight: '850',
                          background: 'var(--magenta-gradient)', padding: '5px 12px', borderRadius: '14px',
                          boxShadow: '0 4px 10px rgba(160,80,106,0.2)', whiteSpace: 'nowrap'
                        }}
                        className="btn-interactive mi-btn"
                      >
                        <Phone size={10} color="white" /> Llamar
                      </a>
                      <a 
                        href={`https://wa.me/${getWhatsAppNumber(client.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', 
                          fontSize: '10.5px', color: 'white', fontWeight: '850',
                          backgroundColor: '#25D366', padding: '5px 12px', borderRadius: '14px',
                          boxShadow: '0 4px 10px rgba(37,211,102,0.2)', whiteSpace: 'nowrap'
                        }}
                        className="btn-interactive mi-btn"
                      >
                        <MessageCircle size={10} color="white" /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Large, Beautiful Visits Number on the right */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'rgba(160,80,106,0.04)',
                borderRadius: '16px',
                padding: '8px 12px',
                minWidth: '65px',
                border: '1px solid rgba(160,80,106,0.08)',
                flexShrink: 0
              }}>
                <span style={{ 
                  fontSize: '28px', 
                  fontWeight: '950', 
                  color: 'var(--magenta-primary)', 
                  lineHeight: '1',
                  background: 'var(--magenta-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {history.length}
                </span>
                <span style={{ 
                  fontSize: '9px', 
                  color: 'var(--text-muted)', 
                  fontWeight: '850', 
                  marginTop: '4px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  {history.length === 1 ? 'Visita' : 'Visitas'}
                </span>
              </div>
            </div>

            {/* Información del Cliente (Minimalist & Compact rows instead of big block boxes) */}
            <div style={{ borderTop: '1px solid rgba(160,80,106,0.08)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: '850', color: 'var(--magenta-primary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  <FileText size={14} color="var(--magenta-primary)" /> Información del Cliente
                </h4>
                {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-interactive mi-btn"
                      style={{
                        background: 'none', border: 'none', color: 'var(--magenta-primary)',
                        fontSize: '11px', fontWeight: '750', cursor: 'pointer', padding: '4px 10px',
                        borderRadius: '10px', backgroundColor: 'rgba(160,80,106,0.06)'
                      }}
                    >
                      Editar
                    </button>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: detailWidth > 580 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>NOMBRE</label>
                      <input className="form-input mi-input" value={editData.name} onChange={e => setEditData({...editData, name: formatName(e.target.value)})} placeholder="Nombre" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>TELÉFONO</label>
                      <input className="form-input mi-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Teléfono" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>CÉDULA</label>
                      <input className="form-input mi-input" value={editData.id_card} onChange={e => setEditData({...editData, id_card: e.target.value})} placeholder="Cédula" style={{ width: '100%', fontSize: '12px', padding: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>FECHA DE NACIMIENTO</label>
                      <BirthdayTextInput 
                        value={editData.birth_date} 
                        onChange={e => setEditData({...editData, birth_date: e.target.value})} 
                        style={{ width: '100%' }} 
                        inputClassName="form-input"
                        inputStyle={{ paddingLeft: '44px', height: '32px', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px', maxWidth: '360px', width: '100%' }}>
                    <button className="btn-pink mi-btn" onClick={async () => { const r = await onUpdate(editData); if (r) showToast('Datos actualizados'); setIsEditing(false); }} style={{ flex: 1.5, fontSize: '12px', padding: '10px', fontWeight: '750', background: 'var(--magenta-gradient)', border: 'none', borderRadius: '12px' }}>Guardar</button>
                    <button onClick={() => setIsEditing(false)} className="mi-btn" style={{ flex: 1, background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '12px', borderRadius: '12px', cursor: 'pointer', padding: '10px' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                (() => {
                  const totalSpend = history.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
                  const infoRow = (icon, iconColor, iconBg, label, value, valueColor) => (
                    <div 
                      className="btn-interactive"
                      style={{
                        padding: '16px 14px', borderRadius: '18px', backgroundColor: 'rgba(160,80,106,0.02)',
                        border: '1px solid rgba(160,80,106,0.05)', display: 'flex', flexDirection: 'column',
                        gap: '6px', alignItems: 'flex-start', position: 'relative', overflow: 'hidden',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '12px', right: '12px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {React.cloneElement(icon, { size: 11, color: iconColor })}
                      </div>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
                      <span style={{ fontSize: '15px', color: valueColor || 'var(--text-primary)', fontWeight: '900', marginTop: '2px' }}>{value}</span>
                    </div>
                  );

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {infoRow(<Cake />, 'var(--pink-primary)', 'rgba(160,80,106,0.1)', 'CUMPLE',
                          client.birth_date ? new Date(client.birth_date + 'T00:00:00').toLocaleDateString([], {day: '2-digit', month: 'short'}) : 'N/A')}
                        {infoRow(<FileText />, 'var(--magenta-primary)', 'rgba(160,80,106,0.08)', 'REGISTRO',
                          client.created_at ? new Date(client.created_at).toLocaleDateString([], {day: '2-digit', month: '2-digit'}) : 'N/A')}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {infoRow(<Calendar />, 'var(--pink-primary)', 'rgba(160,80,106,0.1)', 'PRÓX. CITA',
                          upcomingAppointment ? new Date(upcomingAppointment.scheduled_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) : 'Ninguna',
                          upcomingAppointment ? 'var(--magenta-primary)' : 'var(--text-primary)')}
                        {infoRow(<Receipt />, '#2e9e5b', 'rgba(46,158,91,0.1)', 'FACTURADO',
                          `$${totalSpend.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, '#2e9e5b')}
                      </div>
                      {/* Last visit as full-width banner stat */}
                      <div 
                        className="btn-interactive"
                        style={{
                          padding: '16px 14px', borderRadius: '18px', backgroundColor: 'rgba(160,80,106,0.02)',
                          border: '1px solid rgba(160,80,106,0.05)', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: '850', textTransform: 'uppercase', letterSpacing: '0.8px' }}>ÚLTIMA VISITA</span>
                          <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '900', marginTop: '2px' }}>{lastVisitLabel}</span>
                        </div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(74,48,54,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={14} color="var(--text-secondary)" />
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Mobile Tabs Segmented Control (Equidistante y sin scroll horizontal) */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '6px', 
              background: 'linear-gradient(135deg, rgba(160,80,106,0.06) 0%, rgba(217,70,168,0.03) 100%)', 
              padding: '6px', 
              borderRadius: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(160,80,106,0.1)'
            }}
          >
            {[
              { id: 'gallery', label: 'Fotos', icon: <ImageIcon size={16} />, gradient: 'linear-gradient(135deg, #c97282 0%, #a0506a 100%)', shadow: 'rgba(160,80,106,0.25)' },
              { id: 'diagnoses', label: 'Salud', icon: <Activity size={16} />, gradient: 'linear-gradient(135deg, #a0506a 0%, #4a3036 100%)', shadow: 'rgba(74,48,54,0.25)' },
              { id: 'packages', label: 'Paquetes', icon: <Package size={16} />, gradient: 'linear-gradient(135deg, #df9ca7 0%, #c97282 100%)', shadow: 'rgba(201,114,130,0.25)' },
              { id: 'history', label: 'Visitas', icon: <Calendar size={16} />, gradient: 'linear-gradient(135deg, #6b4d53 0%, #4a3036 100%)', shadow: 'rgba(107,77,83,0.25)' }
            ].map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveSubTab(tab.id); setShowCollage(false); }}
                  className="btn-interactive mi-btn"
                  style={{
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 2px', 
                    borderRadius: '12px', 
                    border: 'none',
                    background: isActive ? tab.gradient : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    fontWeight: isActive ? '900' : '650',
                    fontSize: '11px', 
                    cursor: 'pointer',
                    transform: isActive ? 'scale(1.06) translateY(-2px)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: isActive ? `0 6px 16px ${tab.shadow}` : 'none',
                    opacity: isActive ? 1 : 0.75
                  }}
                >
                  <span style={{ display: 'flex', transition: 'transform 0.3s ease', transform: isActive ? 'scale(1.15)' : 'scale(1)', color: isActive ? 'white' : 'var(--text-muted)' }}>{tab.icon}</span>
                  <span style={{ fontSize: '11.5px' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div key={activeSubTab} className="animate-tab-enter">
              {renderSubTabContent()}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-ficha-enter" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Sidebar: Profile + Ficha Técnica */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card mi-card" style={{ padding: '28px 24px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', textAlign: 'center' }}>
              <div style={{
                width: '96px', height: '96px', borderRadius: '50%', margin: '0 auto 16px',
                background: client.image_url ? 'var(--bg-tertiary)' : 'var(--magenta-gradient)', 
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: '3px solid white',
                boxShadow: '0 8px 20px rgba(160,80,106,0.2)', overflow: 'hidden'
              }}>
                {client.image_url ? (
                  <img src={client.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '32px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>
                    {client.name ? client.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'C'}
                  </span>
                )}
              </div>

              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '850', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{client.name}</h2>

              {/* Status Badge & Cédula */}
              {(() => {
                let statusText = 'Nueva';
                let statusColor = '#007aff';
                let statusBg = 'rgba(0,122,255,0.06)';
                let statusBorder = 'rgba(0,122,255,0.12)';

                if (history.length >= 6) {
                  statusText = 'VIP';
                  statusColor = '#d4af37';
                  statusBg = 'rgba(212,175,55,0.06)';
                  statusBorder = 'rgba(212,175,55,0.15)';
                } else if (history.length >= 2) {
                  statusText = 'Frecuente';
                  statusColor = 'var(--magenta-primary)';
                  statusBg = 'rgba(160,80,106,0.06)';
                  statusBorder = 'rgba(160,80,106,0.12)';
                }

                return (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', margin: '8px 0 10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '750', color: 'var(--magenta-primary)', background: 'rgba(160,80,106,0.08)', padding: '3px 10px', borderRadius: '20px' }}>
                      V-{client.id_card || '00.000.000'}
                    </span>
                    <span style={{ 
                      fontSize: '10px', fontWeight: '800', color: statusColor, 
                      backgroundColor: statusBg, border: `1px solid ${statusBorder}`,
                      padding: '2.5px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                      {statusText}
                    </span>
                  </div>
                );
              })()}

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}>
                <Phone size={13} color="var(--magenta-primary)" /> {client.phone || 'Sin teléfono'}
              </div>

              {/* Quick Communication Actions (WhatsApp & Call) */}
              {client.phone && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
                    <a 
                      href={`tel:${client.phone}`}
                      className="btn-interactive mi-btn"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '750',
                        color: 'var(--magenta-primary)', backgroundColor: 'rgba(160,80,106,0.06)', 
                        border: '1px solid rgba(160,80,106,0.12)', padding: '7px 14px', borderRadius: '12px',
                        textDecoration: 'none', transition: 'all 0.2s'
                      }}
                    >
                      <Phone size={11} /> Llamar
                    </a>
                    <a 
                      href={`https://wa.me/${getWhatsAppNumber(client.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-interactive mi-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '750',
                      color: '#128C7E', backgroundColor: 'rgba(18,140,126,0.06)', 
                      border: '1px solid rgba(18,140,126,0.15)', padding: '7px 14px', borderRadius: '12px',
                      textDecoration: 'none', transition: 'all 0.2s'
                    }}
                  >
                    <MessageCircle size={11} color="#128C7E" fill="rgba(18,140,126,0.1)" /> WhatsApp
                  </a>
                </div>
              )}

              {/* Detailed Client Stats Block (Visits, Last Visit, Next Appointment, Total Spend) */}
              {(() => {
                const totalSpend = history.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
                return (
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '18px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Users size={14} color="var(--magenta-primary)" />
                      Total de visitas
                      <span style={{ marginLeft: 'auto', fontWeight: '800', color: 'var(--text-primary)' }}>{history.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Calendar size={14} color="var(--magenta-primary)" />
                      Última visita
                      <span style={{ marginLeft: 'auto', fontWeight: '800', color: 'var(--text-primary)' }}>{lastVisitLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Sparkles size={14} color="var(--magenta-primary)" />
                      Próxima cita
                      <span style={{ marginLeft: 'auto', fontWeight: '800', color: upcomingAppointment ? 'var(--magenta-primary)' : 'var(--text-muted)' }}>
                        {upcomingAppointment 
                          ? new Date(upcomingAppointment.scheduled_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }) + ' ' + new Date(upcomingAppointment.scheduled_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : 'Ninguna'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <TrendingUp size={14} color="var(--magenta-primary)" />
                      Total facturado
                      <span style={{ marginLeft: 'auto', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ${totalSpend.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-interactive mi-btn"
                  style={{
                    marginTop: '18px', width: '100%', padding: '11px', borderRadius: '12px',
                    border: 'none', background: 'var(--magenta-gradient)', color: 'white',
                    fontWeight: '750', fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  Editar Perfil
                </button>
              )}
            </div>

            <div className="glass-card mi-card" style={{ padding: '22px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '850', color: 'var(--magenta-primary)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <FileText size={14} /> Información del Cliente
              </h4>

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>NOMBRE</label>
                    <input className="form-input mi-input" value={editData.name} onChange={e => setEditData({...editData, name: formatName(e.target.value)})} placeholder="Nombre" style={{ width: '100%', padding: '8px 12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>CÉDULA</label>
                    <input className="form-input mi-input" value={editData.id_card} onChange={e => setEditData({...editData, id_card: e.target.value})} placeholder="Cédula" style={{ width: '100%', padding: '8px 12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>TELÉFONO</label>
                    <input className="form-input mi-input" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Teléfono" style={{ width: '100%', padding: '8px 12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>CUMPLEANOS</label>
                    <BirthdayTextInput 
                      value={editData.birth_date} 
                      onChange={e => setEditData({...editData, birth_date: e.target.value})} 
                      style={{ width: '100%' }} 
                      inputClassName="form-input"
                      inputStyle={{ paddingLeft: '44px', height: '36px', fontSize: '12px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800' }}>NOTAS RÁPIDAS</label>
                    <textarea
                      className="form-input mi-input"
                      value={editData.notes}
                      onChange={e => setEditData({...editData, notes: e.target.value})}
                      onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                      placeholder="Notas sobre la clienta..."
                      rows={4}
                      style={{ width: '100%', padding: '10px 12px', resize: 'none', fontFamily: 'inherit', minHeight: '80px', overflow: 'hidden' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn-pink mi-btn" style={{ flex: 1, padding: '10px', background: 'var(--magenta-gradient)', border: 'none', fontWeight: '750' }} onClick={async () => { const r = await onUpdate(editData); if (r) showToast('Datos actualizados'); setIsEditing(false); }}>Guardar</button>
                    <button className="btn-interactive mi-btn" style={{ flex: 1, padding: '10px', background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }} onClick={() => setIsEditing(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <DetailItem label="Cumpleaños" value={client.birth_date ? new Date(client.birth_date + 'T00:00:00').toLocaleDateString([], {day: '2-digit', month: 'long', year: 'numeric'}) : 'No registrado'} />
                  <DetailItem label="Fecha de registro" value={client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'} />
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Notas rápidas</p>
                      {!editingNotes && (
                        <button
                          onClick={() => setEditingNotes(true)}
                          style={{ background: 'none', border: 'none', color: 'var(--magenta-primary)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>
                    {editingNotes ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          className="form-input mi-input"
                          value={localNotes}
                          onChange={e => setLocalNotes(e.target.value)}
                          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                          placeholder="Escribe todo lo que necesites..."
                          rows={3}
                          style={{ fontSize: '12px', padding: '8px 10px', resize: 'none', minHeight: '60px', width: '100%', fontFamily: 'inherit', overflow: 'hidden' }}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setEditingNotes(false)}
                            className="mi-btn"
                            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={async () => {
                              const success = await onUpdate({ ...client, notes: localNotes });
                              if (success) {
                                showToast('Nota actualizada');
                                setEditingNotes(false);
                              }
                            }}
                            className="mi-btn"
                            style={{ background: 'var(--magenta-gradient)', border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '10px', fontWeight: '800', color: 'white', cursor: 'pointer' }}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {client.notes || 'Sin notas registradas.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tabs Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              rowGap: '8px', 
              gap: '8px', 
              marginBottom: '16px'
            }}>
              {[
                { id: 'gallery', label: 'Galería de trabajos', icon: <ImageIcon size={17} /> },
                { id: 'diagnoses', label: 'Diagnóstico capilar', icon: <Activity size={17} /> },
                { id: 'packages', label: 'Paquetes y sesiones', icon: <Package size={17} /> },
                { id: 'history', label: 'Historial de visitas', icon: <Calendar size={17} /> }
              ].map(tab => {
                const isActive = activeSubTab === tab.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => { setActiveSubTab(tab.id); setShowCollage(false); }}
                    role="button"
                    tabIndex={0}
                    className="btn-interactive mi-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      background: isActive ? 'rgba(160, 80, 106, 0.08)' : 'transparent',
                      color: isActive ? 'var(--magenta-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? '850' : '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      outline: 'none'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', color: isActive ? 'var(--magenta-primary)' : 'var(--text-muted)' }}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>
                );
              })}
            </div>

            <div>
              {renderSubTabContent()}
            </div>
          </div>
        </div>
      )}

      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <JanaCamera 
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

      <AnimatedModal isOpen={!!lightboxPhoto}>
        {(overlayClass, cardClass) => (
          <div
            className={overlayClass}
            onClick={() => setLightboxPhoto(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,26,46,0.9)', backdropFilter: 'blur(10px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          >
            <div
              className={cardClass}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '720px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ borderRadius: '20px', overflow: 'hidden', maxHeight: '72vh', display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={lightboxPhoto?.url || lightboxPhoto} style={{ width: '100%', height: '100%', maxHeight: '72vh', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', color: 'white', gap: '14px', padding: '0 4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                  {lightboxPhoto?.type || 'Foto'}
                  {lightboxPhoto?.date && (
                    <span style={{ fontWeight: '500', opacity: 0.75 }}> &bull; {new Date(lightboxPhoto.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  )}
                  {lightboxPhoto?.service_name && (
                    <span style={{ fontWeight: '500', opacity: 0.75 }}> &bull; {lightboxPhoto.service_name}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {lightboxPhotoIndex !== null && (
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.1)', padding: '3px', borderRadius: '12px' }}>
                      {['Antes', 'Después', 'Normal'].map(lbl => {
                        const isCurrent = lightboxPhoto?.type === lbl || (!lightboxPhoto?.type && lbl === 'Normal');
                        return (
                          <button
                            key={lbl}
                            onClick={() => handleChangePhotoType(lightboxPhotoIndex, lbl)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '750',
                              cursor: 'pointer',
                              border: 'none',
                              background: isCurrent ? 'var(--pink-primary)' : 'transparent',
                              color: 'white',
                              transition: 'all 0.2s'
                            }}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => handleDownloadPhoto(lightboxPhoto?.url || lightboxPhoto)}
                    className="btn-interactive"
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700' }}
                  >
                    <Download size={14} /> Descargar
                  </button>
                  <button
                    onClick={() => setLightboxPhoto(null)}
                    style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      <AnimatedModal isOpen={!!lightboxComparison}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,26,46,0.75)', backdropFilter: 'blur(10px)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`glass-card ${cardClass}`} style={{ maxWidth: '650px', width: '100%', padding: '24px', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>{lightboxComparison?.title || 'Comparativa'}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lightboxComparison?.date ? new Date(lightboxComparison.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                  </span>
                </div>
                <button onClick={() => setLightboxComparison(null)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              
              {lightboxComparison && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <BeforeAfterSlider
                    photoA={lightboxComparison.beforeUrl}
                    photoB={lightboxComparison.afterUrl}
                    sliderPos={sliderPos}
                    setSliderPos={setSliderPos}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '750' }}>
                    <span>Antes</span>
                    <span>Después</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>

      <AnimatedModal isOpen={!!pendingPhoto}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,26,46,0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={cardClass} style={{
              width: '100%',
              maxWidth: 'min(90vw, 560px)',
              borderRadius: '36px',
              padding: '36px',
              background: 'linear-gradient(160deg, #fff3f6 0%, #fbe3ec 100%)',
              border: '1.5px solid rgba(217,70,168,0.3)',
              boxShadow: '0 30px 70px rgba(160,80,106,0.25)'
            }}>
              <h3 style={{
                marginBottom: '24px',
                fontWeight: '900',
                fontSize: '22px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Camera size={26} color="var(--pink-primary)" />
                <span>Configurar <span className="text-pink">Foto</span></span>
              </h3>

              <div style={{ width: '100%', maxWidth: '340px', margin: '0 auto 24px', aspectRatio: '1/1', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(217,70,168,0.2)' }}>
                <img src={pendingPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <JanaSelect
                  variant="light"
                  label="TIPO DE FOTO"
                  value={photoMeta.type}
                  onChange={(val) => setPhotoMeta({ ...photoMeta, type: val })}
                  options={[
                    { label: 'Normal / General', value: 'Normal' },
                    { label: 'Antes (Before)', value: 'Antes' },
                    { label: 'Después (After)', value: 'Después' }
                  ]}
                />

                <JanaSelect
                  variant="light"
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

                <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
                  <button onClick={() => setPendingPhoto(null)} className="btn-interactive" style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.6)', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={confirmSavePhoto} className="btn-pink" style={{ flex: 1, height: '54px', borderRadius: '16px', fontSize: '14px' }}>GUARDAR FOTO</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      <AnimatedModal isOpen={pendingBulkPhotos.length > 0}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,26,46,0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={cardClass} style={{
              width: '100%',
              maxWidth: 'min(90vw, 560px)',
              borderRadius: '36px',
              padding: '36px',
              background: 'linear-gradient(160deg, #fff3f6 0%, #fbe3ec 100%)',
              border: '1.5px solid rgba(217,70,168,0.3)',
              boxShadow: '0 30px 70px rgba(160,80,106,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{
                marginBottom: '24px',
                fontWeight: '900',
                fontSize: '22px',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Camera size={26} color="var(--pink-primary)" />
                <span>Configurar <span className="text-pink">{pendingBulkPhotos.length} Foto{pendingBulkPhotos.length > 1 ? 's' : ''}</span></span>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {pendingBulkPhotos.map((url, i) => (
                  <div key={i} style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(217,70,168,0.2)' }}>
                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 18px' }}>
                Este tipo y visita se aplicarán a las {pendingBulkPhotos.length} fotos seleccionadas.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <JanaSelect
                  variant="light"
                  label="TIPO DE FOTO"
                  value={bulkPhotoMeta.type}
                  onChange={(val) => setBulkPhotoMeta({ ...bulkPhotoMeta, type: val })}
                  options={[
                    { label: 'Normal / General', value: 'Normal' },
                    { label: 'Antes (Before)', value: 'Antes' },
                    { label: 'Después (After)', value: 'Después' }
                  ]}
                />

                <JanaSelect
                  variant="light"
                  label="ASOCIAR A VISITA (OPCIONAL)"
                  value={bulkPhotoMeta.serviceId}
                  onChange={(val) => setBulkPhotoMeta({ ...bulkPhotoMeta, serviceId: val })}
                  options={[
                    { label: 'Ninguna', value: null },
                    ...history.map(h => ({
                      label: `${new Date(h.created_at).toLocaleDateString()} - ${h.services?.name || h.description.split(' - ')[0].replace('Servicio: ', '')}`,
                      value: h.id
                    }))
                  ]}
                />

                <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
                  <button onClick={() => setPendingBulkPhotos([])} className="btn-interactive" style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.6)', color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>CANCELAR</button>
                  <button onClick={confirmSaveBulkPhotos} className="btn-pink" style={{ flex: 1, height: '54px', borderRadius: '16px', fontSize: '14px' }}>GUARDAR TODAS</button>
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
        <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74,26,46,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className={`glass-card ${cardClass}`} style={{ maxWidth: '480px', width: '100%', borderRadius: '28px', padding: '32px', border: '1.5px solid rgba(217,70,168,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Receipt size={22} color="var(--pink-primary)" />
                <span>Recibo de <span className="text-pink">Visita</span></span>
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
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Estilista</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{visit.stylist_name || 'Sin asignar'}</span>
                </div>
              </div>

              {/* Invoice Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>Detalle de Cargos</label>
                
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
              <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '2px solid rgba(217,70,168,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>TOTAL A PAGAR</label>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--pink-primary)', lineHeight: '1' }}>${visit.amount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>TASA: {visit.exchange_rate} Bs.</div>
                </div>
              </div>

              {/* Payment Method */}
              <div style={{ padding: '16px', backgroundColor: 'rgba(217,70,168,0.05)', borderRadius: '16px', border: '1px solid rgba(217,70,168,0.1)' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', marginBottom: '12px', letterSpacing: '1px' }}>MÉTODO DE PAGO</label>
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

            <button onClick={onClose} className="btn-pink" style={{ width: '100%', marginTop: '32px', height: '52px', borderRadius: '16px', fontWeight: '900' }}>CERRAR RECIBO</button>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

const ComparisonCard = ({ comparison, onDelete, onShare, onCardClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const formattedDate = comparison.date
    ? new Date(comparison.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <div style={{ borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'white', position: 'relative' }}>
      <div 
        onClick={() => onCardClick?.(comparison)}
        style={{ display: 'flex', aspectRatio: '4/3', borderTopLeftRadius: '15px', borderTopRightRadius: '15px', overflow: 'hidden', cursor: 'pointer' }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <img src={comparison.beforeUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(74,26,46,0.85)', padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', color: 'white' }}>ANTES</span>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <img src={comparison.afterUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'var(--magenta-primary)', padding: '3px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', color: 'white' }}>DESPUÉS</span>
        </div>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '750', color: 'var(--text-primary)', lineHeight: '1.3' }}>{comparison.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</p>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 11, overflow: 'hidden', minWidth: '140px' }}>
                <button
                  onClick={() => { setMenuOpen(false); onShare?.(); }}
                  style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                >
                  <Share2 size={13} /> Compartir
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#d44e6c', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
    <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{label}</span>
    <span style={{ fontWeight: '700', fontSize: '16px' }}>{value}</span>
  </div>
);

const HistoryItem = ({ date, service, price, onClick }) => (
  <div 
    onClick={onClick}
    className="btn-interactive"
    style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '16px', 
      background: 'linear-gradient(135deg, #ffffff 0%, #fefbfc 100%)',
      borderRadius: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      borderLeft: '5px solid var(--magenta-primary)',
      borderTop: '1px solid rgba(160,80,106,0.08)',
      borderRight: '1px solid rgba(160,80,106,0.08)',
      borderBottom: '1px solid rgba(160,80,106,0.08)',
      boxShadow: '0 4px 14px rgba(160,80,106,0.03)',
      marginBottom: '10px'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        backgroundColor: 'rgba(160,80,106,0.06)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Calendar size={15} color="var(--magenta-primary)" />
      </div>
      <div>
        <div style={{ fontWeight: '850', fontSize: '13.5px', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{service}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '600' }}>{date}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <div style={{ fontWeight: '900', color: '#2e9e5b', fontSize: '15px', background: 'rgba(46,158,91,0.08)', padding: '3px 10px', borderRadius: '10px' }}>${price}</div>
      <div style={{ fontSize: '9px', color: 'var(--magenta-primary)', fontWeight: '850', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '2px' }}>Ver detalle</div>
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
          color: 'var(--pink-primary)'
        }}>
          <ColumnsIcon size={18} style={{ transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {/* Labels */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(74,26,46,0.85)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'white', pointerEvents: 'none' }}>ANTES</div>
      <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'var(--magenta-primary)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '900', color: 'white', pointerEvents: 'none' }}>DESPUÉS</div>
    </div>
  );
};
