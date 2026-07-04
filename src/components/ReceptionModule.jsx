import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Search, 
  UserPlus, 
  Scissors, 
  Calendar, 
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  Rocket,
  X,
  Package,
  Edit3,
  Receipt,
  Trash2
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import AstroSelect from './AstroSelect';
import AstroDatePicker from './AstroDatePicker';
import { normalizeForSearch } from '../utils/stringUtils';
import NewClientModal from './NewClientModal';
import ScheduleModal from './ScheduleModal';
import AstroDialog from './AstroDialog';
import { useScrollLock } from '../hooks/useScrollLock';
import { supabase } from '../lib/supabase';

const ReceptionModule = ({ isMobile }) => {
  const { showToast, triggerRocket } = useNotifs();
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [idSearch, setIdSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Modals
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(58); // Default
  const [dialog, setDialog] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
  
  const [formData, setFormData] = useState({
    serviceId: '',
    staffId: '',
    status: 'En Silla' // Default flow: receive and sit
  });

  const loadData = async () => {
    try {
      const [c, s, st, active, ext, inv, allApps, ratesData] = await Promise.all([
        dataService.getClients(),
        dataService.getServices(),
        dataService.getStaff(),
        dataService.getAppointmentsByState(['En Silla', 'Agendado']),
        dataService.getExtras(),
        dataService.getSaleInventoryCatalog(),
        dataService.getExchangeRates()
      ]);
      setClients(c || []);
      setServices(s || []);
      setStaff((st || []).filter(member => {
        const roleName = (member.role?.split('|')[0] || 'Barbero').toLowerCase();
        return !roleName.includes('admin') && 
               !roleName.includes('recepcionista') && 
               !roleName.includes('caja');
      }));
      setActiveAppointments((active || []).filter(a => a.status === 'En Silla'));
      setAllExtras(ext || []);
      setInventory((inv || []).filter(i => 
        i.is_for_sale !== false && 
        i.category === 'Venta'
      ));
      
      const today = new Date().toISOString().split('T')[0];
      setUpcomingAppointments((allApps || []).filter(a => a.status === 'Agendado' && (a.scheduled_at?.startsWith(today) || a.created_at?.startsWith(today))));

      if (ratesData) {
        const activeType = localStorage.getItem('astro_active_rate') || 'usdt';
        setExchangeRate(activeType === 'bcv' ? (ratesData.bcv || 36.5) : (ratesData.usdt || 43.2));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // No polling needed — Realtime events via astro:data-changed keep data fresh
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);


  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en silla.");
      triggerRocket();
      loadData();
    } catch (error) {
      console.error("Error starting appointment:", error);
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIdSearch = () => {
    if (searchResults.length === 1) {
      handleSelectClient(searchResults[0]);
    } else {
      const exact = clients.find(c => c.id_card === idSearch || c.name.toLowerCase() === idSearch.toLowerCase());
      if (exact) {
        handleSelectClient(exact);
      } else if (searchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. Proceda a registrarlo.", "warning");
      }
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setIdSearch('');
    setSearchResults([]);
    showToast(`Cliente identificado: ${client.name}`);
  };

  const handleSearchInput = (val) => {
    setIdSearch(val);
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = (Array.isArray(clients) ? clients : []).filter(c => {
        const normalizedName = normalizeForSearch(c.name || '');
        const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
        const idMatches = (c.id_card || '').toLowerCase().includes(term);
        return nameMatches || idMatches;
      });
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  };

  const toggleService = (serviceId) => {
    const exists = selectedServices.find(s => s.id === serviceId);
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
      return;
    }
    
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleCreateClient = () => {
    setIsNewClientModalOpen(true);
  };

  const handleNewClientSuccess = (newClient) => {
    setClients([...clients, newClient]);
    setSelectedClient(newClient);
  };

  const handleScheduleClick = () => {
    if (!selectedClient || (selectedServices.length === 0 && selectedExtras.length === 0) || !formData.staffId) {
      showToast("Selecciona cliente, servicio/extra y barbero/asistente primero", "warning");
      return;
    }
    setIsScheduleModalOpen(true);
  };
  
  const toggleExtra = (extra) => {
    const exists = selectedExtras.find(e => e.id === extra.id);
    if (exists) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      // Add with default price as initial customPrice
      setSelectedExtras([...selectedExtras, { ...extra, customPrice: extra.price }]);
    }
  };

  const updateExtraPrice = (id, newPrice) => {
    setSelectedExtras(selectedExtras.map(e => 
      e.id === id ? { ...e, customPrice: parseFloat(newPrice) || 0 } : e
    ));
  };

  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  
  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const handleSubmit = async (statusOverride, scheduledAt = null) => {
    const isProductOnly = selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length > 0;
    
    if (!selectedClient) {
      showToast("Selecciona un cliente primero", "error");
      return;
    }

    if (selectedServices.length === 0 && selectedExtras.length === 0 && selectedProducts.length === 0) {
      showToast("Agrega al menos un servicio, extra o producto", "error");
      return;
    }

    const hasStaffRequired = selectedServices.length > 0 || selectedExtras.length > 0;
    if (hasStaffRequired && !formData.staffId) {
      showToast("Selecciona un barbero o asistente", "error");
      return;
    }

    try {
      setLoading(true);
      
      // We process multiple services as individual appointments/lines for now 
      // but linked to the same event. In a complex DB we'd have a Transaction table.
      let appointments = [];
      
      if (isProductOnly) {
        // Create a shell appointment for the products to live in
        const { data: directSale, error: dsError } = await supabase
          .from('appointments')
          .insert([{
            client_id: selectedClient.id,
            status: 'Por Pagar',
            total_price: selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0)
          }])
          .select()
          .single();
        
        if (dsError) throw dsError;
        appointments = [directSale];
      } else {
        if (selectedServices.length > 0) {
          const promises = selectedServices.map(service => 
            dataService.createAppointment({
              client_id: selectedClient.id,
              service_id: service.id,
              staff_id: formData.staffId,
              status: statusOverride || formData.status,
              total_price: service.price,
              scheduled_at: scheduledAt
            })
          );
          appointments = await Promise.all(promises);
        } else {
          // Only extras (no main services)
          const shellApp = await dataService.createAppointment({
            client_id: selectedClient.id,
            service_id: null,
            staff_id: formData.staffId,
            status: statusOverride || formData.status,
            total_price: 0,
            scheduled_at: scheduledAt
          });
          appointments = [shellApp];
        }
      }
      
      // If there are extras/products, link them to the first appointment
      if (appointments.length > 0) {
        const mainAppId = appointments[0].id;
        
        const extraPromises = selectedExtras.map(extra => 
          dataService.addExtraToAppointment(mainAppId, extra.id, extra.customPrice ?? extra.price)
        );
        
        const productPromises = selectedProducts.map(prod => 
          dataService.addProductToAppointment(mainAppId, prod.id, prod.quantity, prod.price)
        );
        
        await Promise.all([...extraPromises, ...productPromises]);
      }

      showToast(isProductOnly ? "Venta enviada a caja" : (scheduledAt ? `¡Cita agendada para las ${new Date(scheduledAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: true})}!` : `¡Orden enviada! ${selectedServices.length} servicios en cola.`));
      if (!statusOverride || statusOverride === 'En Silla') triggerRocket();
      
      // Reset
      setSelectedClient(null);
      setSelectedServices([]);
      setSelectedExtras([]);
      setSelectedProducts([]);
      setFormData({ serviceId: '', staffId: '', status: 'En Silla' });
      setIsScheduleModalOpen(false);
      loadData();
     } catch (error) {
      showToast("Error al procesar orden", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (appId) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Eliminar Cita',
      message: '¿Estás seguro de que deseas eliminar esta cita permanentemente? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          setLoading(true);
          await dataService.deleteAppointment(appId);
          showToast("Cita eliminada permanentemente");
          setDialog({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
          loadData();
        } catch (error) {
          showToast("Error al eliminar la cita", "error");
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="animate-fade-in" style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      paddingBottom: '100px',
      position: 'relative',
      overflow: 'hidden',
      '--text-muted': '#a1a1a6',
      '--text-secondary': '#d1d1d6'
    }}>
      {/* Background Orbs */}
      <div className="r-orb r-orb-1" />
      <div className="r-orb r-orb-2" />
      <header style={{ marginBottom: '40px', textAlign: isMobile ? 'center' : 'left' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Recepción <span className="text-gold">Astro</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Módulo de atención y agendamiento rápido.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '32px' }}>
        
        {/* Step 1: Client Selection */}
        <section>
          <div className="glass-card animate-slide-up animate-stagger-1" style={{ marginBottom: '24px', borderRadius: '24px', position: 'relative', zIndex: searchResults.length > 0 ? 9999 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>1. Cliente</span>
              </div>
              <button 
                onClick={handleCreateClient}
                style={{ background: 'rgba(212,175,55,0.1)', border: 'none', color: 'var(--gold-primary)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={14} /> Nuevo
              </button>
            </div>

            {selectedClient ? (
              <div className="animate-scale-in" style={{ padding: '20px', backgroundColor: 'rgba(212,175,55,0.05)', borderRadius: '16px', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '18px' }}>{selectedClient.name}</div>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      marginTop: '6px',
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      backgroundColor: 'rgba(212, 175, 55, 0.1)', 
                      border: '1px solid rgba(212, 175, 55, 0.25)',
                      fontSize: '11px', 
                      fontWeight: '800', 
                      color: 'var(--gold-primary)',
                      letterSpacing: '0.5px'
                    }}>
                      <span style={{ opacity: 0.6, fontSize: '9px', fontWeight: '900' }}>CÉDULA:</span> V-{selectedClient.id_card}
                    </div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer' }}>Cambiar</button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search style={{ position: 'absolute', left: '16px' }} size={18} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Escribe Nombre o Cédula..." 
                    value={idSearch}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIdSearch()}
                    style={{ 
                      width: '100%', 
                      paddingLeft: '48px', 
                      paddingRight: '54px', 
                      height: '52px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <button 
                    onClick={handleIdSearch} 
                    className="btn-gold" 
                    style={{ 
                      position: 'absolute',
                      right: '6px',
                      width: '40px', 
                      height: '40px', 
                      padding: 0, 
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="animate-scale-in" style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, 
                    marginTop: '8px', background: 'rgba(28,28,30,0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    overflow: 'hidden', zIndex: 10, backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                  }}>
                    {searchResults.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => handleSelectClient(c)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'white' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700' }}>V-{c.id_card}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card animate-slide-up animate-stagger-2" style={{ borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Receipt size={20} color="var(--gold-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>2. Detalle de la Orden</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? '8px' : '12px', marginBottom: '24px' }}>
              <button 
                onClick={() => setIsServiceModalOpen(true)}
                className="action-add-btn btn-service reception-animate-item"
                style={{ animationDelay: '0ms' }}
              >
                <Scissors size={18} /> <span style={{ whiteSpace: 'nowrap' }}>+ SERVICIO</span>
              </button>
              <button 
                onClick={() => setIsExtraModalOpen(true)}
                className="action-add-btn btn-extra reception-animate-item"
                style={{ animationDelay: '40ms' }}
              >
                <Rocket size={18} /> <span style={{ whiteSpace: 'nowrap' }}>+ EXTRA</span>
              </button>
              <button 
                onClick={() => setIsProductModalOpen(true)}
                className="action-add-btn btn-product reception-animate-item"
                style={{ animationDelay: '80ms' }}
              >
                <ShoppingBag size={18} /> <span style={{ whiteSpace: 'nowrap' }}>+ PRODUCTO</span>
              </button>
            </div>

            {(selectedServices.length > 0 || selectedExtras.length > 0 || selectedProducts.length > 0) && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedServices.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'white', fontWeight: '700' }}>{s.name}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{(s.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600' }}>Ref: ${s.price}</span>
                        </div>
                        <button onClick={() => toggleService(s.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '14px', marginLeft: '4px' }}>&times;</button>
                      </div>
                    </div>
                  ))}
                  {selectedExtras.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>+ {e.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {editingExtraPriceId === e.id ? (
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--gold-primary)', fontWeight: '800' }}>$</span>
                            <input 
                              type="number"
                              autoFocus
                              value={e.customPrice}
                              onChange={(val) => updateExtraPrice(e.id, val.target.value)}
                              onBlur={() => setEditingExtraPriceId(null)}
                              onKeyDown={(key) => key.key === 'Enter' && setEditingExtraPriceId(null)}
                              style={{ width: '60px', height: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--gold-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={() => setEditingExtraPriceId(e.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: 'all 0.2s' }}
                            onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{((e.customPrice ?? e.price) * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600' }}>Ref: ${e.customPrice ?? e.price}</span>
                                <Edit3 size={8} color="var(--text-muted)" />
                              </div>
                            </div>
                          </div>
                        )}
                        <button onClick={() => toggleExtra(e)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', padding: '0 4px' }}>&times;</button>
                      </div>
                    </div>
                  ))}
                  {selectedProducts.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#32d74b' }}>📦 {p.name}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ color: 'var(--gold-primary)', fontWeight: '800' }}>{(p.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600' }}>Ref: ${p.price}</span>
                        </div>
                        <button onClick={() => toggleProduct(p)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', fontSize: '14px', marginLeft: '4px' }}>&times;</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', fontWeight: '900', color: 'var(--gold-primary)' }}>
                  <div style={{ fontSize: '18px' }}>
                    TOTAL: {((selectedServices.reduce((acc, s) => acc + s.price, 0) + selectedExtras.reduce((acc, e) => acc + (e.customPrice ?? e.price), 0) + selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0)) * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    REF: ${selectedServices.reduce((acc, s) => acc + s.price, 0) + selectedExtras.reduce((acc, e) => acc + (e.customPrice ?? e.price), 0) + selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0)}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '12px' }}>BARBEROS Y ASISTENTES DISPONIBLES</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                {staff.map((s, idx) => {
                  const active = activeAppointments.find(a => a.staff_id === s.id);
                  const isBusy = !!active;
                  let timeLeft = 0;
                  
                  if (isBusy && active.started_at) {
                    const startTime = new Date(active.started_at);
                    const duration = active.services?.duration || 30;
                    const endTime = new Date(startTime.getTime() + duration * 60000);
                    timeLeft = Math.max(0, Math.ceil((endTime - new Date()) / 60000));
                  }

                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (formData.staffId === s.id) {
                          setFormData({...formData, staffId: ''});
                        } else {
                          setFormData({...formData, staffId: s.id});
                        }
                      }}
                      className="reception-animate-item"
                      style={{
                        padding: '16px 8px',
                        borderRadius: '20px',
                        border: formData.staffId === s.id ? '2px solid var(--gold-primary)' : isBusy ? '1px solid rgba(255,69,58,0.3)' : '1px solid var(--border-color)',
                        backgroundColor: formData.staffId === s.id ? 'rgba(212,175,55,0.1)' : isBusy ? 'rgba(255,69,58,0.05)' : 'rgba(255,255,255,0.02)',
                        color: formData.staffId === s.id ? 'var(--gold-primary)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.3s',
                        position: 'relative',
                        overflow: 'hidden',
                        animationDelay: `${120 + idx * 50}ms`
                      }}
                    >
                      {isBusy && (
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: 0, 
                          backgroundColor: '#ff453a', 
                          color: 'white', 
                          fontSize: '8px', 
                          padding: '2px 6px', 
                          fontWeight: '900',
                          borderBottomLeftRadius: '8px'
                        }}>
                          OCUPADO
                        </div>
                      )}
                      
                      <div className={`staff-avatar-wrapper ${isBusy ? 'status-busy' : 'status-available'}`} style={{
                        backgroundColor: isBusy ? 'rgba(255,69,58,0.1)' : 'rgba(255,255,255,0.05)', 
                        color: isBusy ? '#ff453a' : 'inherit',
                        overflow: 'hidden'
                      }}>
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Users size={18} />
                        )}
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800' }}>{s.name.split(' ')[0]}</div>
                        {isBusy ? (
                          <div style={{ fontSize: '9px', color: '#ff453a', fontWeight: '700', marginTop: '2px' }}>
                            {timeLeft > 0 ? `Libre: ${timeLeft}m` : 'Por terminar'}
                          </div>
                        ) : (
                          <div style={{ fontSize: '9px', color: '#32d74b', fontWeight: '700', marginTop: '2px' }}>Disponible</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Appointments List */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Calendar size={16} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>Próximas Citas (Agenda Hoy)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingAppointments.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  upcomingAppointments.map((app, idx) => (
                     <div 
                      key={app.id} 
                      className="upcoming-appointment-card reception-animate-item"
                      style={{ 
                        padding: isMobile ? '12px 14px' : '16px 20px', 
                        borderRadius: '20px', 
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? '12px' : '0',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        animationDelay: `${idx * 50}ms`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px', minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.25)',
                          minWidth: isMobile ? '80px' : '92px'
                        }}>
                          <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--gold-primary)', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const d = new Date(app.scheduled_at || app.created_at);
                              let h = d.getHours();
                              const m = String(d.getMinutes()).padStart(2, '0');
                              const ampm = h >= 12 ? 'PM' : 'AM';
                              h = h % 12;
                              h = h ? h : 12;
                              return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
                            })()}
                          </span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '800', fontSize: isMobile ? '13px' : '14px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.clients?.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)' }} />
                            <span>Atendido por: <strong>{app.staff?.name?.split(' ')[0]}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                        <button 
                          onClick={() => handleDeleteClick(app.id)}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'rgba(255, 69, 58, 0.05)',
                            border: '1px solid rgba(255, 69, 58, 0.15)',
                            color: '#ff453a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.4)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.15)';
                          }}
                          title="Eliminar cita"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleStartAppointment(app.id)}
                          className="btn-premium-start"
                          style={{ 
                            padding: '10px 16px', 
                            borderRadius: '12px', 
                            background: 'var(--gold-primary)', 
                            color: 'black', 
                            border: 'none', 
                            fontSize: '11px', 
                            fontWeight: '900', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            transition: 'all 0.25s',
                            flexShrink: 0
                          }}
                        >
                          <Clock size={13} /> INICIAR
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Action Panel */}
        <section className="animate-slide-up animate-stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(28,28,30,0.9), rgba(212,175,55,0.05))', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px 30px' }}>
            {!selectedClient ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="animate-fade-in">
                <div className="premium-badge">
                  <Clock size={10} style={{ marginRight: '2px' }} /> Módulo de Espera
                </div>
                <div className="radar-container">
                  <div className="radar-circle" />
                  <div className="radar-glow" />
                  <Search size={28} color="var(--gold-primary)" style={{ position: 'relative', zIndex: 2 }} />
                </div>
                <h3 style={{ color: 'white', fontWeight: '800', fontSize: '18px' }}>Escaneando Clientes</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '280px', lineHeight: '1.5' }}>
                  Ingresa la cédula o nombre en el buscador para cargar la ficha y comenzar la atención.
                </p>
              </div>
            ) : selectedServices.length === 0 && selectedProducts.length === 0 && selectedExtras.length === 0 ? (
              <>
                <Scissors size={48} color="rgba(212,175,55,0.2)" style={{ marginBottom: '20px' }} />
                <h3 style={{ color: 'var(--text-secondary)' }}>Añade productos o servicios</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>Selecciona lo que el cliente desea adquirir.</p>
              </>
            ) : (
              <div className="animate-slide-up" style={{ width: '100%' }}>
                <CheckCircle2 size={56} color="var(--gold-primary)" style={{ marginBottom: '24px' }} />
                <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Todo Listo</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                  Confirmación para <span style={{ color: 'white', fontWeight: '800' }}>{selectedClient.name}</span>
                </p>

                {/* Detailed Summary for Confirmation */}
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', marginBottom: '32px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>Resumen de Atención</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedServices.map(s => (
                      <div key={s.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Scissors size={14} color="var(--gold-primary)" />
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{s.name}</span>
                        </div>
                        {s.included_items && s.included_items.length > 0 && (
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px', 
                            marginLeft: '24px', 
                            marginTop: '6px',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.04)'
                          }}>
                            <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Incluye:</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                              {s.included_items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                                  <span style={{ color: 'var(--gold-primary)', fontSize: '11px', lineHeight: '1' }}>✓</span>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedExtras.map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Rocket size={14} color="var(--gold-primary)" />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{e.name} (Extra)</span>
                      </div>
                    ))}
                    {selectedProducts.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShoppingBag size={14} color="#32d74b" />
                        <span style={{ fontSize: '13px', color: '#32d74b' }}>{p.name}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Asignado: <span style={{ color: 'white', fontWeight: '700' }}>{staff.find(s => s.id === formData.staffId)?.name || 'No seleccionado'}</span></span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                  {(selectedServices.length > 0 || selectedExtras.length > 0) ? (
                    <>
                      <button 
                        disabled={loading || (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId))}
                        onClick={() => handleSubmit('En Silla')}
                        className="btn-gold" 
                        style={{ 
                          height: '60px', 
                          borderRadius: '18px', 
                          fontSize: '16px',
                          opacity: (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId)) ? 0.5 : 1,
                          cursor: (formData.staffId && activeAppointments.some(a => a.staff_id === formData.staffId)) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Zap size={20} fill="currentColor" /> 
                         {activeAppointments.some(a => a.staff_id === formData.staffId) ? 'PERSONAL OCUPADO' : 'INICIAR AHORA'}
                      </button>
                      
                      {activeAppointments.some(a => a.staff_id === formData.staffId) && (
                        <p style={{ fontSize: '11px', color: '#ff453a', fontWeight: '700', marginTop: '-4px' }}>
                          Usa "Agendar para después" para poner al cliente en cola.
                        </p>
                      )}

                      <button 
                        disabled={loading}
                        onClick={handleScheduleClick}
                        style={{ background: 'none', border: '1px solid var(--border-color)', color: 'white', height: '56px', borderRadius: '18px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                      >
                        <Calendar size={18} /> AGENDAR PARA DESPUÉS
                      </button>
                    </>
                  ) : (
                    <button 
                      disabled={loading}
                      onClick={() => handleSubmit('Por Pagar')}
                      className="btn-gold" 
                      style={{ height: '60px', borderRadius: '18px', fontSize: '16px', backgroundColor: '#32d74b', color: 'black', border: 'none' }}
                    >
                      <ShoppingBag size={20} /> ENVIAR A CAJA (PRODUCTOS)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <NewClientModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)}
        onSuccess={handleNewClientSuccess}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        client={selectedClient}
        staff={staff.find(s => s.id === formData.staffId)}
        service={selectedServices[0]}
        onSchedule={(date) => handleSubmit('Agendado', date)}
      />

      <AstroDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      {/* Selection Modals */}
      <SelectionModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Seleccionar Servicios"
        icon={<Scissors size={24} color="var(--gold-primary)" />}
        items={services}
        selectedItems={selectedServices}
        onToggle={(s) => toggleService(s.id)}
        exchangeRate={exchangeRate}
        type="service"
      />

      <SelectionModal 
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        title="Añadir Extras"
        icon={<Rocket size={24} color="var(--gold-primary)" />}
        items={allExtras}
        selectedItems={selectedExtras}
        onToggle={toggleExtra}
        exchangeRate={exchangeRate}
        type="extra"
      />

      <SelectionModal 
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Venta de Productos"
        icon={<ShoppingBag size={24} color="var(--gold-primary)" />}
        items={inventory}
        selectedItems={selectedProducts}
        onToggle={toggleProduct}
        exchangeRate={exchangeRate}
        type="product"
      />

      <style>{`
        .hover-item:hover {
          background-color: rgba(212,175,55,0.1) !important;
          transform: translateX(5px);
        }

        /* Backlight Glowing Orbs */
        .r-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.06;
          z-index: 0;
          pointer-events: none;
          animation: r-orb-float 22s infinite ease-in-out;
        }
        .r-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--gold-primary) 0%, transparent 70%);
          top: -10%;
          right: 5%;
          animation-duration: 26s;
        }
        .r-orb-2 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, #8a6d1c 0%, transparent 70%);
          bottom: 5%;
          left: 5%;
          animation-duration: 30s;
          animation-delay: -7s;
        }
        @keyframes r-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.1); }
        }

        /* Frosted Actions Buttons (+ Servicio, + Extra, + Producto) */
        .action-add-btn {
          background: rgba(255, 255, 255, 0.02) !important;
          border: 1px dashed rgba(255, 255, 255, 0.1) !important;
          padding: 18px 12px !important;
          border-radius: 20px !important;
          font-weight: 850 !important;
          font-size: 11px !important;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        @media (max-width: 768px) {
          .action-add-btn {
            padding: 12px 4px !important;
            font-size: 9px !important;
            border-radius: 14px !important;
            gap: 4px !important;
          }
        }
        
        .action-add-btn.btn-service {
          color: var(--gold-primary) !important;
          border-color: rgba(212, 175, 55, 0.25) !important;
        }
        .action-add-btn.btn-service:hover {
          background: rgba(212, 175, 55, 0.06) !important;
          border-color: rgba(212, 175, 55, 0.6) !important;
          border-style: solid !important;
          box-shadow: 0 8px 30px rgba(212, 175, 55, 0.15), 0 0 12px rgba(212, 175, 55, 0.05);
          transform: translateY(-3px) scale(1.02);
        }
        
        .action-add-btn.btn-extra {
          color: #ff9f0a !important; /* Premium orange */
          border-color: rgba(255, 159, 10, 0.25) !important;
        }
        .action-add-btn.btn-extra:hover {
          background: rgba(255, 159, 10, 0.06) !important;
          border-color: rgba(255, 159, 10, 0.6) !important;
          border-style: solid !important;
          box-shadow: 0 8px 30px rgba(255, 159, 10, 0.15), 0 0 12px rgba(255, 159, 10, 0.05);
          transform: translateY(-3px) scale(1.02);
        }
        
        .action-add-btn.btn-product {
          color: #30d158 !important; /* Premium green */
          border-color: rgba(48, 209, 88, 0.25) !important;
        }
        .action-add-btn.btn-product:hover {
          background: rgba(48, 209, 88, 0.06) !important;
          border-color: rgba(48, 209, 88, 0.6) !important;
          border-style: solid !important;
          box-shadow: 0 8px 30px rgba(48, 209, 88, 0.15), 0 0 12px rgba(48, 209, 88, 0.05);
          transform: translateY(-3px) scale(1.02);
        }

        /* Avatar Rings for Staff */
        .staff-avatar-wrapper {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .staff-avatar-wrapper::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        .staff-avatar-wrapper.status-available::after {
          border-color: rgba(50, 215, 75, 0.3);
          animation: ring-pulse 3s infinite ease-in-out;
        }
        .staff-avatar-wrapper.status-busy::after {
          border-color: rgba(255, 69, 58, 0.35);
        }
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 0.3; }
        }

        /* Radar Scanning Effect */
        .radar-container {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .radar-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 1px solid rgba(212, 175, 55, 0.15);
          background: radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%);
        }
        .radar-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2.5px solid var(--gold-primary);
          animation: radar-sweep 2.5s infinite linear;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
        }
        @keyframes radar-sweep {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .premium-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          background: rgba(212, 175, 55, 0.1);
          border: 1px solid rgba(212, 175, 55, 0.2);
          color: var(--gold-primary);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        /* Selection Modal Premium Items */
        .selection-modal-item {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .selection-modal-item:hover {
          transform: translateY(-2px) scale(1.008);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(212, 175, 55, 0.3) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        .selection-modal-item.is-selected:hover {
          background: rgba(212, 175, 55, 0.1) !important;
          border-color: var(--gold-primary) !important;
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.15);
        }
        .btn-premium-modal-ready {
          background: var(--gold-primary) !important;
          color: black !important;
          font-weight: 900 !important;
          letter-spacing: 1.5px !important;
          border: none !important;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2);
        }
        .btn-premium-modal-ready:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4);
          filter: brightness(1.1);
        }

        /* Upcoming Appointments List Glow Up */
        .upcoming-appointment-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .upcoming-appointment-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(212, 175, 55, 0.25) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }
        .btn-premium-start {
          transition: all 0.25s ease !important;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        }
        .btn-premium-start:hover {
          transform: scale(1.04);
          box-shadow: 0 6px 18px rgba(212, 175, 55, 0.4);
          filter: brightness(1.1);
        }

        @keyframes receptionCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.995);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .reception-animate-item {
          animation: receptionCardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  );
};

const SelectionModal = ({ isOpen, onClose, title, icon, items, selectedItems, onToggle, exchangeRate = 58, type }) => {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.85)', 
      backdropFilter: isOpen ? 'blur(10px)' : 'blur(0px)', 
      zIndex: 99999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' : 'hidden',
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.3s ease, backdrop-filter 0.3s ease, visibility 0.3s'
    }}>
      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: '650px', 
        maxHeight: '90vh', 
        display: 'flex', 
        flexDirection: 'column', 
        borderRadius: '32px', 
        border: '1px solid rgba(212,175,55,0.2)', 
        padding: '32px',
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(15px)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        opacity: isOpen ? 1 : 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon}
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingLeft: '8px', paddingRight: '12px', margin: '0 -8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px' }}>
            {items.map(item => {
              const isSelected = selectedItems.find(si => si.id === item.id);
              return (
                <button 
                  key={item.id}
                  onClick={() => onToggle(item)}
                  className={`selection-modal-item ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '20px',
                    border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                    background: isSelected ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    width: '100%',
                    boxShadow: isSelected ? '0 0 15px rgba(212,175,55,0.08)' : 'none'
                  }}
                >
                  <div style={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '12px', 
                    background: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                    ) : (
                      type === 'service' ? (
                        <Scissors size={20} color={isSelected ? 'black' : 'var(--gold-primary)'} />
                      ) : type === 'extra' ? (
                        <Rocket size={20} color={isSelected ? 'black' : '#ff9f0a'} />
                      ) : (
                        <ShoppingBag size={20} color={isSelected ? 'black' : '#30d158'} />
                      )
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: '750', color: isSelected ? 'var(--gold-primary)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--gold-primary)' }}>{(item.price * exchangeRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                        <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)', fontWeight: '700' }}>Ref: ${item.price}</div>
                      </div>
                    </div>
                    {item.included_items && item.included_items.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '6px 8px', 
                        marginTop: '10px' 
                      }}>
                        {item.included_items.map((inc, i) => (
                          <span key={i} style={{ 
                            fontSize: '9.5px', 
                            fontWeight: '700',
                            color: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.5)',
                            backgroundColor: isSelected ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.05)',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.3px'
                          }}>
                            {inc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={15} color="black" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="btn-premium-modal-ready"
          style={{ marginTop: '24px', height: '56px', borderRadius: '18px' }}
        >
          LISTO
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ReceptionModule;
