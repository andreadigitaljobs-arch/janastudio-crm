import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../context/ModalContext';
import { 
  Sparkles, 
  Camera, 
  CheckCircle, 
  Clock, 
  User, 
  CameraOff,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Coins,
  LogOut,
  Trash2,
  RefreshCw,
  Edit3,
  Droplets,
  LayoutDashboard,
  ReceiptText
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import JanaCamera from './JanaCamera';
import { Plus, ShoppingBag, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import { useDialog } from '../context/DialogContext';
import AnimatedModal from './AnimatedModal';
import StaffTransactionHistory from './StaffTransactionHistory';
import { getBusinessDayRange } from '../utils/dateTime';

const BarberPanel = ({ isMobile, rates }) => {
  const { user } = useAuth();
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const { confirm } = useDialog();
  const [staff, setStaff] = useState([]);
  const [selectedStylist, setSelectedStylist] = useState(null);
  const [myServices, setMyServices] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New States for Extras/Products
  const [allExtras, setAllExtras] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeAppId, setActiveAppId] = useState(null);
  const [addMode, setAddMode] = useState(null); // 'extra' | 'product'
  const { pushModal, popModal } = useModal();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState({ appId: null, type: 'Antes' });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [selectedCompletedApp, setSelectedCompletedApp] = useState(null);
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(5);
  const [activeView, setActiveView] = useState('work');

  const handleUpdateExtraPrice = async (extraId, newPrice) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentExtraPrice(extraId, parseFloat(newPrice) || 0);
      showToast("Precio actualizado");
      await loadMyWork();
      await loadStats();
    } catch (e) {
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
      setEditingExtraPriceId(null);
    }
  };

  const [stats, setStats] = useState({ production: 0, services: 0, earnings: 0, tips: 0 });

  useEffect(() => {
    loadStaff();
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [extras, items] = await Promise.all([
        dataService.getExtras(),
        dataService.getSaleInventoryCatalog()
      ]);
      setAllExtras(extras);
      setInventory(items);
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-select if current user is a selectable staff member
  useEffect(() => {
    if (staff.length > 0 && user) {
      const roleName = (user.role || '').toLowerCase();
      const isSelectableRole = !roleName.includes('admin') && !roleName.includes('recepcionista') && !roleName.includes('caja');
      if (isSelectableRole) {
        const me = staff.find(s => s.id === user.id);
        if (me) {
          setSelectedStylist(me);
          window.dispatchEvent(new CustomEvent('jana_active_staff_changed', { detail: me }));
        }
      }
    }
  }, [staff, user]);

  // Sync modal state with global context to hide sidebar
  useEffect(() => {
    const isAnyModalOpen = !!selectedCompletedApp || showAddModal || showCamera;
    if (isAnyModalOpen) {
      pushModal();
      return () => popModal();
    }
  }, [selectedCompletedApp, showAddModal, showCamera, pushModal, popModal]);

  const loadMyWork = useCallback(async () => {
    if (!selectedStylist) return;
    try {
      setLoading(true);
      const isStylist = selectedStylist.role?.toLowerCase().includes('asistente');
      const states = isStylist ? ['En Silla', 'En Tratamiento'] : ['En Silla', 'Agendado', 'En Tratamiento'];
      const data = await dataService.getAppointmentsByState(states);
      if (isStylist) {
        setMyServices(data);
      } else {
        const filtered = data.filter(s => String(s.staff_id) === String(selectedStylist.id));
        setMyServices(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedStylist]);

  const loadCompletedToday = useCallback(async () => {
    if (!selectedStylist) return;
    try {
      const data = await dataService.getCompletedAppointmentsForBusinessDay();
      const isStylist = selectedStylist.role?.toLowerCase().includes('asistente');
      const filtered = data.filter(s => {
        if (isStylist) {
          return s.appointment_staff?.some(as => String(as.staff_id) === String(selectedStylist.id));
        } else {
          return String(s.staff_id) === String(selectedStylist.id);
        }
      });
      setCompletedToday(filtered);
    } catch (err) {
      console.error(err);
    }
  }, [selectedStylist]);

  useEffect(() => {
    if (selectedStylist) {
      loadMyWork();
      loadStats();
      loadCompletedToday();
      
      // Real-time listener for appointments
      const subscription = supabase
        .channel(`stylist-realtime-${selectedStylist.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'janastudio', 
          table: 'appointments' 
        }, (payload) => {
          dataService.invalidateOperationalCache();
          const isStylist = selectedStylist.role?.toLowerCase().includes('asistente');
          const isForMe = isStylist || 
                          String(payload.new?.staff_id) === String(selectedStylist.id) || 
                          String(payload.old?.staff_id) === String(selectedStylist.id);
          
          if (isForMe) {
            if (payload.eventType === 'INSERT') {
              showToast("🚀 ¡Nueva cita asignada!");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Silla') {
              showToast("🚀 ¡Cliente listo en silla!", "success");
              triggerRocket();
            } else if (payload.eventType === 'UPDATE' && payload.new.status === 'En Tratamiento') {
              showToast("💧 Cliente en estación de tratamiento", "info");
            } else {
              showToast("Actualizando silla...", "info");
            }
            
            // Only reload work list on realtime; stats refresh on demand
            setTimeout(() => {
              loadMyWork();
            }, 500);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else {
      window.dispatchEvent(new CustomEvent('jana_active_staff_changed', { detail: null }));
    }
  }, [selectedStylist, loadMyWork, loadCompletedToday]);

  useEffect(() => {
    if (!selectedStylist) return undefined;
    let refreshTimer;
    const refreshOperationalData = () => {
      dataService.invalidateOperationalCache();
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadMyWork();
      }, 300);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshOperationalData();
    };

    window.addEventListener('jana:data-changed', refreshOperationalData);
    window.addEventListener('focus', refreshOperationalData);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('jana:data-changed', refreshOperationalData);
      window.removeEventListener('focus', refreshOperationalData);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [selectedStylist, loadMyWork, loadCompletedToday]);

  const loadStaff = async () => {
    try {
      const data = await dataService.getStaff();
      setStaff(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    if (!selectedStylist) return;
    try {
      const isStylist = selectedStylist.role?.toLowerCase().includes('asistente');
      const { start, endExclusive } = getBusinessDayRange();
      const transactions = await dataService.getStaffTransactions(
        selectedStylist.id,
        start.toISOString(),
        new Date(endExclusive.getTime() - 1).toISOString()
      );
      const totals = transactions.reduce((summary, transaction) => {
        const member = (transaction.metadata?.staffInvolved || []).find(
          item => String(item.staffId || item.id) === String(selectedStylist.id)
        );
        const commission = Number(member?.commissionEarned ?? member?.commission_earned ?? 0);
        const productCommission = Number(member?.productCommissionEarned ?? member?.product_commission ?? 0);
        const tips = Number(member?.tip ?? member?.tip_amount ?? 0);
        const itemCount = isStylist
          ? Math.max(Number(transaction.metadata?.treatmentCount || 0), 1)
          : Math.max(transaction.metadata?.appointmentIds?.length || (transaction.metadata?.appointment_id ? 1 : 0), 1);
        return {
          production: summary.production + (isStylist ? commission + productCommission + tips : Number(transaction.amount || 0)),
          services: summary.services + itemCount,
          earnings: summary.earnings + commission + productCommission + tips,
          tips: summary.tips + tips
        };
      }, { production: 0, services: 0, earnings: 0, tips: 0 });
      setStats(totals);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleStartScheduled = async (appId) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(appId, 'En Silla');
      showToast('¡Cita iniciada! Cliente en silla.', 'success');
      triggerRocket();
      loadMyWork();
      loadStats();
    } catch (err) {
      console.error(err);
      showToast('Error al iniciar cita', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantStartTreatment = async (appId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === appId);
      const clientName = app?.clients?.name || 'Cliente';
      await dataService.updateAppointmentStatus(appId, 'En Tratamiento');
      showToast(`¡Tratamiento iniciado para ${clientName}!`, 'success');
      // Notify stylist
      notificationService.broadcastNotification(
        supabase,
        '💧 Tratamiento Iniciado',
        `El asistente ha iniciado el tratamiento de ${clientName}.`,
        { recipientRole: 'Admin' }
      );
      loadMyWork();
      loadStats();
    } catch (err) {
      console.error(err);
      showToast('Error al iniciar tratamiento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishService = async (serviceId) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Servicio finalizado! Enviado a caja para cobro.");
      triggerConfetti();
      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al finalizar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToTreatment = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';

      await dataService.updateAppointmentStatus(serviceId, 'En Tratamiento');
      showToast("¡Cliente enviado a la estación de tratamiento!");
      triggerRocket();
      
      // Broadcast to treatment assistants
      notificationService.broadcastNotification(
        supabase,
        '💧 Nuevo Cliente para Tratamiento',
        `Hey, te toca lavar a ${clientName}. (Enviado por: ${selectedStylist.name})`,
        { recipientRole: 'Asistente' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al enviar a tratamiento", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToStylist = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';
      const stylistId = app?.staff_id;
      const stylistName = app?.staff?.name || 'Estilista';

      await dataService.updateAppointmentStatus(serviceId, 'En Silla');
      showToast("¡Cliente enviado de regreso al estilista!");

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al regresar al estilista", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssistantSendToCheckout = async (serviceId) => {
    try {
      setLoading(true);
      const app = myServices.find(s => s.id === serviceId);
      const clientName = app?.clients?.name || 'Cliente';

      // Assign this assistant to the appointment
      await dataService.assignAssistantToAppointment(serviceId, selectedStylist.id);
      // Update status to 'Por Pagar' (sent to checkout)
      await dataService.updateAppointmentStatus(serviceId, 'Por Pagar');
      showToast("¡Tratamiento completado! Enviado a caja.");
      triggerConfetti();

      // Broadcast to Admin / Caja
      notificationService.broadcastNotification(
        supabase,
        '💳 Cliente enviado a Caja',
        `El cliente ${clientName} terminó su tratamiento y fue enviado a caja.`,
        { recipientRole: 'Admin' }
      );

      loadMyWork();
      loadStats();
      loadCompletedToday();
    } catch (err) {
      showToast("Error al procesar el tratamiento", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCaptured = async (image) => {
    if (!cameraTarget.appId) return;
    try {
      showToast("Sincronizando con la nube...", "info");
      const app = myServices.find(s => s.id === cameraTarget.appId);
      if (!app) return;

      // 1. Optimize Image (Small but pro)
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

      // 2. Update Client Gallery with metadata
      const photoObj = {
        url: optimizedImage,
        type: cameraTarget.type,
        date: new Date().toISOString(),
        service_id: app.id,
        service_name: app.services?.name || 'Servicio'
      };

      // 2. Fetch latest gallery from DB to avoid race conditions (overwriting)
      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', app.client_id)
        .single();

      const currentGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = [photoObj, ...currentGallery];
      await dataService.updateClient(app.client_id, { work_gallery: newGallery });
      
      // Update local state instantly for real-time feedback
      setMyServices(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      setCompletedToday(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      if (selectedCompletedApp && selectedCompletedApp.client_id === app.client_id) {
        setSelectedCompletedApp(prev => ({
          ...prev,
          clients: {
            ...prev.clients,
            work_gallery: newGallery
          }
        }));
      }

      showToast("¡Foto guardada con éxito!", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al guardar foto", "error");
    } finally {
      setShowCamera(false);
    }
  };

  const handleDeletePhoto = async (appId, type) => {
    try {
      const app = myServices.find(s => s.id === appId);
      if (!app) return;

      if (!await confirm("¿Quieres borrar la foto de esta cita?")) return;

      showToast("Borrando foto...", "info");

      const { data: latestClient } = await supabase
        .from('clients')
        .select('work_gallery')
        .eq('id', app.client_id)
        .single();

      const currentGallery = Array.isArray(latestClient?.work_gallery) ? latestClient.work_gallery : [];
      const newGallery = currentGallery.filter(p => !(p.service_id === appId && p.type === type));

      await dataService.updateClient(app.client_id, { work_gallery: newGallery });
      
      // Update local state instantly for real-time feedback
      setMyServices(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      setCompletedToday(prev => prev.map(s => {
        if (s.client_id === app.client_id) {
          return {
            ...s,
            clients: {
              ...s.clients,
              work_gallery: newGallery
            }
          };
        }
        return s;
      }));
      if (selectedCompletedApp && selectedCompletedApp.client_id === app.client_id) {
        setSelectedCompletedApp(prev => ({
          ...prev,
          clients: {
            ...prev.clients,
            work_gallery: newGallery
          }
        }));
      }

      showToast("Foto eliminada", "success");
      await loadMyWork();
    } catch (err) {
      console.error(err);
      showToast("Error al eliminar la foto", "error");
    }
  };

  const handleAddExtra = async (extra) => {
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(activeAppId, extra.id, extra.price);
      showToast(`+ ${extra.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (product) => {
    try {
      setLoading(true);
      await dataService.addProductToAppointment(activeAppId, product.id, 1, product.price);
      showToast(`+ ${product.name} añadido`);
      setShowAddModal(false);
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al añadir producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExtra = async (id) => {
    try {
      setLoading(true);
      await dataService.deleteAppointmentExtra(id);
      showToast("Extra eliminado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      setLoading(true);
      await dataService.deleteAppointmentProduct(id);
      showToast("Producto eliminado");
      loadMyWork();
      loadStats();
    } catch (err) {
      showToast("Error al eliminar", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedStylist) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 20px 100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(18px, 5.5vw, 28px)', fontWeight: '900', marginBottom: '10px', whiteSpace: 'nowrap' }}>Panel de <span className="text-gold">Estilistas / Asistentes</span></h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Selecciona tu perfil para comenzar tu turno.</p>
        
        <div className="animate-page-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', maxWidth: '600px', margin: '0 auto' }}>
          {staff
            .filter(s => {
              const roleName = (s.role?.split('|')[0] || '').toLowerCase();
              return !roleName.includes('admin') && 
                     !roleName.includes('recepcionista') && 
                     !roleName.includes('caja');
            })
            .map(s => {
              const displayRole = (s.role?.split('|')[0] || 'Estilista').trim();
              return (
              <button 
                key={s.id} 
                onClick={() => {
                  setSelectedStylist(s);
                  setActiveView('work');
                  window.dispatchEvent(new CustomEvent('jana_active_staff_changed', { detail: s }));
                }}
                className="glass-card hover-item" 
                style={{ padding: '30px 10px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%' }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--pink-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--pink-glow)', marginBottom: '4px' }}>
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={32} color="black" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{s.name}</span>
                  <span style={{ 
                    fontSize: '9.5px', 
                    fontWeight: '700', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0px',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    width: '100%',
                    textWrap: 'balance'
                  }}>{displayRole}</span>
                </div>
              </button>
            )})}
        </div>
      </div>
    );
  }

  const isStylist = selectedStylist?.role?.toLowerCase().includes('asistente');
  const getGreeting = () => {
    const options = { timeZone: 'America/Caracas', hour: 'numeric', hour12: false };
    const hour = parseInt(new Date().toLocaleString('en-US', options), 10);
    if (hour >= 5 && hour < 12) return '¡Buenos días,';
    if (hour >= 12 && hour < 19) return '¡Buenas tardes,';
    return '¡Buenas noches,';
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: isMobile ? '580px' : '1100px', margin: '0 auto', paddingBottom: '100px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isStylist ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'var(--pink-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedStylist.image_url ? (
                <img src={selectedStylist.image_url} alt={selectedStylist.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                isStylist ? <Droplets size={20} color="white" /> : <Sparkles size={20} color="black" />
              )}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>¡Hola, <span className="text-gold">{selectedStylist.name.split(' ')[0]}!</span></h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {isStylist ? "Gestiona las estaciones de tratamiento del día." : "Gestiona tus servicios activos y citas."}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { loadMyWork(); showToast("Sincronizado"); }}
            disabled={loading}
            style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', color: 'var(--pink-primary)', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Sincronizar silla"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setSelectedStylist(null);
              setActiveView('work');
              window.dispatchEvent(new CustomEvent('jana_active_staff_changed', { detail: null }));
            }}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = 'rgba(255,77,77,0.3)'; e.currentTarget.style.background = 'rgba(255,77,77,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: '7px', padding: '4px', marginBottom: '24px', width: 'fit-content', maxWidth: '100%', borderRadius: '13px', background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'work', label: isStylist ? 'Panel de tratamiento' : 'Mi silla', icon: <LayoutDashboard size={15} /> },
          { id: 'history', label: 'Mi historial', icon: <ReceiptText size={15} /> }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '9px 15px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '850',
              color: activeView === view.id ? '#080808' : 'var(--text-secondary)',
              background: activeView === view.id ? 'var(--pink-primary)' : 'transparent'
            }}
          >
            {view.icon} {view.label}
          </button>
        ))}
      </nav>

      {activeView === 'work' ? (
      <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '3fr 2fr', gap: '28px', alignItems: 'start' }}>

        {/* ── LEFT COL: Silla activa ───────────────────────────── */}
        <div>
        {/* Active Services List */}
        {isStylist ? (
          <section>
            {/* 1. Clientes Listos para Lavar (En Tratamiento) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Droplets size={18} color="#007aff" fill="#007aff" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>En Estación de Tratamiento</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '12px', 
                fontWeight: '900', 
                color: 'white', 
                background: 'rgba(0,122,255,0.15)', 
                padding: '4px 12px', 
                borderRadius: '20px',
                border: '1px solid rgba(0,122,255,0.3)'
              }}>{myServices.filter(app => app.status === 'En Tratamiento').length}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              {myServices.filter(app => app.status === 'En Tratamiento').length === 0 ? (
                <div className="glass-card" style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  borderRadius: '24px',
                  border: '2px dashed rgba(0, 122, 255, 0.4)',
                  background: 'radial-gradient(circle at center, rgba(0,122,255,0.08) 0%, transparent 70%)'
                }}>
                  <style>{`
                    @keyframes pulseBlue {
                      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(0,122,255,0.4)); opacity: 0.8; }
                      50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(0,122,255,0.8)); opacity: 1; }
                    }
                  `}</style>
                  <div style={{ display: 'inline-flex', animation: 'pulseBlue 2s infinite' }}>
                    <Droplets size={44} color="#007aff" style={{ marginBottom: '16px' }} />
                  </div>
                  <p style={{ fontSize: '15px', color: '#007aff', fontWeight: '800', letterSpacing: '0.3px', textShadow: '0 0 10px rgba(0,122,255,0.3)' }}>
                    Estación impecable y lista...
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '600' }}>
                    Esperando al próximo cliente.
                  </p>
                </div>
              ) : (
                myServices.filter(app => app.status === 'En Tratamiento').map(app => (
                  <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '28px', padding: '24px', border: '1px solid rgba(0, 122, 255, 0.25)', background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(0,122,255,0.05))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#007aff', textTransform: 'uppercase', letterSpacing: '1px' }}>Listo en Tratamiento</span>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px' }}>{app.clients?.name}</h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                          Estilista: <span style={{ color: 'white', fontWeight: '700' }}>{app.staff?.name || 'Otro'}</span> · Servicio: <span style={{ color: 'var(--pink-primary)', fontWeight: '700' }}>{app.services?.name}</span>
                        </div>
                        {app.services?.included_items && app.services.included_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                            {app.services.included_items.map((item, idx) => (
                              <span key={idx} style={{ fontSize: '10px', fontWeight: '800', color: item.toLowerCase().includes('tratamiento') ? '#007aff' : 'var(--text-secondary)', background: item.toLowerCase().includes('tratamiento') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px', border: item.toLowerCase().includes('tratamiento') ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.08)' }}>
                                {item.toLowerCase().includes('tratamiento') ? '💧' : '✦'} {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: 'white' }}>
                          {Math.round(Number(app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? app.total_price : (app.services?.price || 0)) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>
                          Ref: ${Number(app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? app.total_price : (app.services?.price || 0)).toFixed(2)} USD
                        </div>
                      </div>
                    </div>

                    {/* Extras and Products List for Treatment */}
                    {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {app.appointment_extras.map(ex => (
                          <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {editingExtraPriceId === ex.id ? (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800' }}>$</span>
                                  <input 
                                    type="number"
                                    autoFocus
                                    defaultValue={ex.price}
                                    onBlur={(e) => handleUpdateExtraPrice(ex.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(ex.id, e.target.value)}
                                    style={{ width: '60px', height: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--pink-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                  />
                                </div>
                              ) : (
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ color: 'var(--pink-primary)', fontWeight: '800', display: 'block' }}>
                                    +{Math.round(Number(ex.price || 0) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    Ref: ${Number(ex.price || 0).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <button 
                                onClick={() => handleDeleteExtra(ex.id)}
                                style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {app.appointment_products.map(pr => (
                          <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x{pr.quantity}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: 'var(--pink-primary)', fontWeight: '800', display: 'block' }}>
                                  +{Math.round((Number(pr.price) * (pr.quantity || 1)) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                  Ref: ${(Number(pr.price) * (pr.quantity || 1)).toFixed(2)}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleDeleteProduct(pr.id)}
                                style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Extras/Products Buttons for Treatment */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                      <button 
                        onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Plus size={14} color="var(--pink-primary)" /> Extra
                      </button>
                      <button 
                        onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <ShoppingBag size={14} color="var(--pink-primary)" /> Producto
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => handleReturnToStylist(app.id)}
                        disabled={loading}
                        className="hover-item"
                        style={{ 
                          flex: 1, 
                          height: '48px', 
                          borderRadius: '14px', 
                          fontSize: '13px', 
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <RefreshCw size={16} /> REGRESAR A ESTILISTA
                      </button>
                      <button 
                        onClick={() => handleAssistantSendToCheckout(app.id)}
                        disabled={loading}
                        className="hover-item"
                        style={{ 
                          flex: 1.2, 
                          height: '48px', 
                          borderRadius: '14px', 
                          fontSize: '13px', 
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #007aff, #00d2ff)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 15px rgba(0,122,255,0.3)'
                        }}
                      >
                        <CheckCircle size={16} /> COMPLETAR Y ENVIAR A CAJA
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 2. Clientes en Silla de Estilista (Con Tratamiento) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Sparkles size={18} color="var(--pink-primary)" />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>En Silla de Estilista (Con Tratamiento)</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '12px', 
                fontWeight: '900', 
                color: 'white', 
                background: 'rgba(236,72,153,0.1)', 
                padding: '4px 12px', 
                borderRadius: '20px',
                border: '1px solid rgba(236,72,153,0.2)'
              }}>{
                myServices.filter(app => 
                  app.status === 'En Silla' && (
                    app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || 
                    app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('tratamiento'))
                  )
                ).length
              }</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myServices.filter(app => 
                app.status === 'En Silla' && (
                  app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || 
                  app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('tratamiento'))
                )
              ).length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '30px', borderRadius: '20px', opacity: 0.4 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ningún estilista tiene clientes con tratamiento activo en este momento.</p>
                </div>
              ) : (
                myServices.filter(app => 
                  app.status === 'En Silla' && (
                    app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || 
                    app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('tratamiento'))
                  )
                ).map(app => (
                  <div key={app.id} className="glass-card animate-slide-up" style={{ borderRadius: '20px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.85, background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>{app.clients?.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Estilista: <span style={{ color: 'var(--pink-primary)', fontWeight: '700' }}>{app.staff?.name || 'Otro'}</span> · <span style={{ color: 'var(--text-muted)' }}>{app.services?.name}</span>
                      </p>
                      {app.services?.included_items && app.services.included_items.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {app.services.included_items.map((item, idx) => (
                            <span key={idx} style={{ fontSize: '9px', fontWeight: '800', color: item.toLowerCase().includes('tratamiento') ? '#007aff' : 'var(--text-muted)', background: item.toLowerCase().includes('tratamiento') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '12px', border: item.toLowerCase().includes('tratamiento') ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
                              {item.toLowerCase().includes('tratamiento') ? '💧' : '✦'} {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssistantStartTreatment(app.id)}
                      disabled={loading}
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: '900', 
                        color: 'white', 
                        background: 'linear-gradient(135deg, #007aff, #00d2ff)', 
                        padding: '8px 14px', 
                        borderRadius: '12px', 
                        border: 'none',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
                        flexShrink: 0
                      }}
                    >
                      <Droplets size={14} /> INICIAR TRATAMIENTO
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Sparkles 
                size={18} 
                color="var(--pink-primary)" 
                style={{ filter: 'drop-shadow(0 1px 3px rgba(212, 175, 55, 0.4))' }} 
              />
              <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>Tu Silla Hoy</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {myServices.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: isMobile ? '60px' : '36px 40px', borderRadius: '24px', border: '2px dashed rgba(236,72,153,0.2)', background: 'rgba(236,72,153,0.02)' }}>
                  <style>{`
                    @keyframes chair-float-small {
                      0%, 100% { transform: translateY(0px) rotate(0deg); }
                      50% { transform: translateY(-10px) rotate(3deg); }
                    }
                    @keyframes shadow-scale-small {
                      0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
                      50% { transform: translateX(-50%) scaleX(0.8) scaleY(0.9); opacity: 0.3; }
                    }
                  `}</style>
                  <div className="chair-entrance" style={{ position: 'relative', height: '110px', width: '80px', margin: '0 auto 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-8px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      width: '60px', 
                      height: '8px', 
                      background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.4) 0%, transparent 70%)',
                      zIndex: 1,
                      animation: 'shadow-scale-small 6s infinite ease-in-out'
                    }} />
                    <img 
                      src="/hero_banner.webp" 
                      alt="Salon" 
                      style={{ 
                        width: '80px', 
                        height: 'auto',
                        objectFit: 'contain',
                        zIndex: 3,
                        filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(212, 175, 55, 0.4))',
                        animation: 'chair-float-small 6s infinite ease-in-out'
                      }} 
                    />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Buscando clientes... La silla está libre.</p>
                </div>
              ) : (
                myServices.map(app => {
                  const includesTreatment = app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || 
                                          app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('tratamiento'));
                  return (
                    <div key={app.id} className="glass-card animate-slide-up" style={{ 
                      borderRadius: '28px', 
                      padding: '24px', 
                      background: app.status === 'En Silla' ? 'linear-gradient(135deg, rgba(28,28,30,0.98), rgba(236,72,153,0.02))' : 'var(--bg-secondary)',
                      border: app.status === 'En Silla' ? '1px solid rgba(236,72,153,0.15)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: '0 20px 45px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              color: app.status === 'En Tratamiento' ? '#007aff' : app.status === 'Agendado' ? '#ff9f0a' : 'var(--pink-primary)', 
                              textTransform: 'uppercase', 
                              letterSpacing: '1.5px',
                              background: app.status === 'En Tratamiento' ? 'rgba(0,122,255,0.12)' : app.status === 'Agendado' ? 'rgba(255,159,10,0.12)' : 'rgba(236,72,153,0.1)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: app.status === 'En Tratamiento' ? '1px solid rgba(0,122,255,0.2)' : app.status === 'Agendado' ? '1px solid rgba(255,159,10,0.25)' : '1px solid rgba(236,72,153,0.15)',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {app.status} 
                              {app.status === 'En Tratamiento' ? '💧' : app.status === 'Agendado' ? '📅' : (
                                <img 
                                  src="/hero_banner.webp" 
                                  alt="Silla" 
                                  style={{ 
                                    width: '16px', 
                                    height: '16px', 
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 1px 2px rgba(212, 175, 55, 0.6))'
                                  }} 
                                />
                              )}
                            </span>
                            {app.status === 'Agendado' && app.scheduled_at && (
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: '800', 
                                color: '#ff9f0a',
                                background: 'rgba(255,159,10,0.08)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,159,10,0.2)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={10} />
                                {new Date(app.scheduled_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Caracas' })}
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '24px', fontWeight: '900', marginTop: '10px', color: 'white', letterSpacing: '-0.3px' }}>{app.clients?.name}</h3>
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            color: 'var(--pink-primary)', 
                            fontSize: '13px', 
                            fontWeight: '800', 
                            marginTop: '6px',
                            background: 'rgba(236,72,153,0.06)',
                            padding: '4px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(236,72,153,0.12)'
                          }}>
                            {app.services?.name}
                          </div>
                          
                          {app.services?.included_items && app.services.included_items.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                              {app.services.included_items.map((item, idx) => {
                                const isTreatment = item.toLowerCase().includes('tratamiento');
                                return (
                                  <span 
                                    key={idx} 
                                    style={{ 
                                      fontSize: '10px', 
                                      fontWeight: '800', 
                                      color: isTreatment ? '#007aff' : 'rgba(255,255,255,0.6)', 
                                      background: isTreatment ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.03)', 
                                      padding: '4px 10px', 
                                      borderRadius: '12px', 
                                      border: isTreatment ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <span style={{ color: isTreatment ? '#007aff' : 'var(--pink-primary)', fontSize: '8px' }}>
                                      {isTreatment ? '💧' : '✦'}
                                    </span>
                                    {item}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>
                            {Math.round(Number(app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? app.total_price : (app.services?.price || 0)) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>
                            Ref: ${Number(app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? app.total_price : (app.services?.price || 0)).toFixed(2)} USD
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        {/* Polaroid Antes */}
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Antes' }); setShowCamera(true); }}
                          style={{ 
                            height: '120px', 
                            borderRadius: '20px', 
                            backgroundColor: 'rgba(0,0,0,0.4)', 
                            border: '1.5px dashed rgba(236,72,153,0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            overflow: 'hidden', 
                            position: 'relative',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id) ? (
                            <>
                              <img src={app.clients.work_gallery.find(p => p.type === 'Antes' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', color: 'var(--pink-primary)', border: '1px solid rgba(236,72,153,0.3)', letterSpacing: '0.5px' }}>ANTES</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(app.id, 'Antes'); }}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(255, 69, 58, 0.25)', 
                                  backdropFilter: 'blur(8px)', 
                                  border: '1px solid rgba(255, 69, 58, 0.4)', 
                                  color: '#ff453a', 
                                  borderRadius: '50%', 
                                  width: '28px', 
                                  height: '28px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(236,72,153,0.06)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(236,72,153,0.15)' }}>
                                <Camera size={20} color="var(--pink-primary)" />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>FOTO ANTES</span>
                            </>
                          )}
                        </div>

                        {/* Polaroid Después */}
                        <div 
                          onClick={() => { setCameraTarget({ appId: app.id, type: 'Después' }); setShowCamera(true); }}
                          style={{ 
                            height: '120px', 
                            borderRadius: '20px', 
                            backgroundColor: 'rgba(0,0,0,0.4)', 
                            border: '1.5px dashed rgba(236,72,153,0.25)', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            overflow: 'hidden', 
                            position: 'relative',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id) ? (
                            <>
                              <img src={app.clients.work_gallery.find(p => p.type === 'Después' && p.service_id === app.id).url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '900', color: '#32d74b', border: '1px solid rgba(50,215,75,0.3)', letterSpacing: '0.5px' }}>DESPUÉS</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(app.id, 'Después'); }}
                                style={{ 
                                  position: 'absolute', 
                                  top: '8px', 
                                  right: '8px', 
                                  background: 'rgba(255, 69, 58, 0.25)', 
                                  backdropFilter: 'blur(8px)', 
                                  border: '1px solid rgba(255, 69, 58, 0.4)', 
                                  color: '#ff453a', 
                                  borderRadius: '50%', 
                                  width: '28px', 
                                  height: '28px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ background: 'rgba(236,72,153,0.06)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(236,72,153,0.15)' }}>
                                <Camera size={20} color="var(--pink-primary)" />
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1px' }}>FOTO DESPUÉS</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Extras and Products List */}
                      {(app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {app.appointment_extras.map(ex => (
                            <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{ex.service_extras?.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {editingExtraPriceId === ex.id ? (
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: '6px', fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800' }}>$</span>
                                    <input 
                                      type="number"
                                      autoFocus
                                      defaultValue={ex.price}
                                      onBlur={(e) => handleUpdateExtraPrice(ex.id, e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(ex.id, e.target.value)}
                                      style={{ width: '60px', height: '24px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--pink-primary)', borderRadius: '4px', color: 'white', paddingLeft: '14px', fontSize: '12px', fontWeight: '800', textAlign: 'right' }}
                                    />
                                  </div>
                                ) : (
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: 'var(--pink-primary)', fontWeight: '800', display: 'block' }}>
                                      +{Math.round(Number(ex.price || 0) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                      Ref: ${Number(ex.price || 0).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                <button 
                                  onClick={() => handleDeleteExtra(ex.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {app.appointment_products.map(pr => (
                            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x{pr.quantity}</span></div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ color: 'var(--pink-primary)', fontWeight: '800', display: 'block' }}>
                                    +{Math.round((Number(pr.price) * (pr.quantity || 1)) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                                    Ref: ${(Number(pr.price) * (pr.quantity || 1)).toFixed(2)}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => handleDeleteProduct(pr.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Extras/Products */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('extra'); setShowAddModal(true); }}
                          style={{ 
                            flex: 1, 
                            padding: '14px', 
                            borderRadius: '16px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(236,72,153,0.15)', 
                            color: 'white', 
                            fontSize: '12px', 
                            fontWeight: '800', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Plus size={16} color="var(--pink-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(236,72,153,0.4))' }} /> Extra
                        </button>
                        <button 
                          onClick={() => { setActiveAppId(app.id); setAddMode('product'); setShowAddModal(true); }}
                          style={{ 
                            flex: 1, 
                            padding: '14px', 
                            borderRadius: '16px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(236,72,153,0.15)', 
                            color: 'white', 
                            fontSize: '12px', 
                            fontWeight: '800', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ShoppingBag size={15} color="var(--pink-primary)" style={{ filter: 'drop-shadow(0 0 5px rgba(236,72,153,0.4))' }} /> Producto
                        </button>
                      </div>

                      {app.status === 'En Silla' ? (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            onClick={() => handleSendToTreatment(app.id)}
                            disabled={loading}
                            className="hover-item"
                            style={{ 
                              flex: 1.2, 
                              height: '56px', 
                              borderRadius: '16px', 
                              fontSize: '13px', 
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 10px',
                              cursor: 'pointer',
                              background: includesTreatment ? 'linear-gradient(135deg, #007aff, #00d2ff)' : 'rgba(0,122,255,0.15)',
                              border: includesTreatment ? 'none' : '1px solid rgba(0,122,255,0.3)',
                              color: includesTreatment ? 'white' : '#007aff',
                              boxShadow: includesTreatment ? '0 4px 15px rgba(0,122,255,0.3)' : 'none',
                              transition: 'all 0.2s',
                              animation: includesTreatment ? 'pulse-blue 2s infinite' : 'none'
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: 'fit-content', margin: '0 auto' }}>
                              <Droplets size={16} style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', lineHeight: '1.1' }}>ENVIAR A TRATAMIENTO</span>
                            </div>
                          </button>
                          <button 
                            onClick={() => handleFinishService(app.id)}
                            disabled={loading}
                            className="btn-pink" 
                            style={{ 
                              flex: 1, 
                              height: '56px', 
                              borderRadius: '16px', 
                              fontSize: '14px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              gap: '8px' 
                            }}
                          >
                            <CheckCircle size={18} /> A CAJA
                          </button>
                        </div>
                      ) : app.status === 'En Tratamiento' ? (
                        <button 
                          disabled
                          style={{ width: '100%', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(0,122,255,0.1)', color: '#007aff', border: '1px solid rgba(0,122,255,0.2)', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <Droplets size={18} className="animate-pulse" /> EN PROCESO DE TRATAMIENTO...
                        </button>
                      ) : app.status === 'Agendado' ? (
                        <button 
                          onClick={() => handleStartScheduled(app.id)}
                          disabled={loading}
                          className="hover-item"
                          style={{ 
                            width: '100%', 
                            height: '56px', 
                            borderRadius: '16px', 
                            background: 'linear-gradient(135deg, #ff9f0a, #ff6b00)', 
                            border: 'none', 
                            color: 'white', 
                            fontWeight: '900',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 15px rgba(255,159,10,0.35)',
                            animation: 'pulse-orange 2s infinite'
                          }}
                        >
                          <Zap size={18} /> INICIAR CITA
                        </button>
                      ) : (
                        <button 
                          disabled
                          style={{ width: '100%', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'none', fontWeight: '700' }}
                        >
                          ESPERANDO AL CLIENTE...
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        </div>{/* end left col */}

        {/* ── RIGHT COL: Stats + Completados ──────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <section style={{
          display: 'grid',
          gridTemplateColumns: isStylist ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)', 
          gap: '16px' 
        }}>
          <div className="glass-card" style={{ padding: isMobile ? '20px 16px' : '28px 20px', borderRadius: '24px', textAlign: 'center' }}>
            <TrendingUp size={24} color={isStylist ? '#007aff' : "var(--pink-primary)"} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isStylist ? "Comisiones Hoy" : "Producción Hoy"}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: isStylist ? '#007aff' : 'var(--pink-primary)', textShadow: isStylist ? '0 0 15px rgba(0,122,255,0.4)' : '0 0 15px rgba(236,72,153,0.4)' }}>
                {Math.round(stats.production * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>
                Ref: ${stats.production.toFixed(2)} USD
              </div>
            </div>
          </div>

          {!isStylist && (
            <div className="glass-card animate-scale-in" style={{ padding: isMobile ? '20px 16px' : '28px 20px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(50, 215, 75, 0.2)', background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(50,215,75,0.02))' }}>
              <Award size={24} color="#32d74b" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Ganancia Hoy
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#32d74b', textShadow: '0 0 15px rgba(50,215,75,0.4)' }}>
                  {Math.round(stats.earnings * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>
                  Ref: ${stats.earnings.toFixed(2)} USD
                </div>
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: isMobile ? '20px 16px' : '28px 20px', borderRadius: '24px', textAlign: 'center' }}>
            {isStylist ? (
              <Droplets size={24} color="#007aff" style={{ margin: '0 auto 12px' }} />
            ) : (
              <Sparkles size={24} color="var(--pink-primary)" style={{ margin: '0 auto 12px' }} />
            )}
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {isStylist ? "Tratamientos" : "Servicios"}
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '8px', color: 'white' }}>{stats.services}</div>
          </div>

          <div className="glass-card animate-scale-in" style={{ padding: isMobile ? '20px 16px' : '28px 20px', borderRadius: '24px', textAlign: 'center', border: '1px solid rgba(255, 159, 10, 0.2)', background: 'linear-gradient(135deg, rgba(28,28,30,0.95), rgba(255, 159, 10, 0.02))' }}>
            <Coins size={24} color="#ff9f0a" style={{ margin: '0 auto 12px', filter: 'drop-shadow(0 0 5px rgba(255, 159, 10, 0.4))' }} />
            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Propinas Hoy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#ff9f0a', textShadow: '0 0 15px rgba(255, 159, 10, 0.4)' }}>
                {Math.round(stats.tips * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>
                Ref: ${stats.tips.toFixed(2)} USD
              </div>
            </div>
          </div>
        </section>

        {/* Completed Today Section */}
        <section style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CheckCircle size={18} color={isStylist ? "#007aff" : "#32d74b"} />
            <span style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {isStylist ? "Tratamientos Completados Hoy" : "Trabajos Completados Hoy"}
            </span>
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              fontWeight: '900', 
              color: isStylist ? '#007aff' : 'var(--pink-primary)', 
              background: isStylist ? 'rgba(0,122,255,0.1)' : 'rgba(236,72,153,0.1)', 
              padding: '4px 12px', 
              borderRadius: '20px',
              border: isStylist ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(236,72,153,0.2)'
            }}>{completedToday.length}</span>
          </div>

          {completedToday.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px', borderRadius: '20px', opacity: 0.4 }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {isStylist ? "Aún no has realizado tratamientos hoy." : "Aún no has completado servicios hoy."}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(() => {
                const totalItems = completedToday;
                const visibleItems = totalItems.slice(0, visibleCompletedCount);
                
                return (
                  <>
                    {visibleItems.map(app => {
                const extrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
                const productsTotal = app.appointment_products?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0;
                const calcUsd = (Number(app.services?.price) || 0) + extrasTotal + productsTotal;
                const totalUsd = Number(app.total_price || 0) > 0 ? Number(app.total_price) : calcUsd;
                const completedTime = app.completed_at ? new Date(app.completed_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                const startedTime = app.started_at ? new Date(app.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
                let durationMin = 0;
                if (app.started_at && app.completed_at) {
                  durationMin = Math.round((new Date(app.completed_at) - new Date(app.started_at)) / 60000);
                }

                // If assistant, show commission earned instead of total usd
                const myRecord = app.appointment_staff?.find(as => String(as.staff_id) === String(selectedStylist.id));
                const displayVal = isStylist ? (Number(myRecord?.commission_earned) || 0) : totalUsd;

                return (
                  <div key={app.id} className="glass-card" onClick={() => setSelectedCompletedApp(app)} style={{ 
                    padding: '16px 20px', 
                    borderRadius: '20px',
                    border: isStylist ? '1px solid rgba(0, 122, 255, 0.15)' : '1px solid rgba(50, 215, 75, 0.15)',
                    background: isStylist ? 'linear-gradient(135deg, rgba(0,122,255,0.05), rgba(0,0,0,0.4))' : 'linear-gradient(135deg, rgba(50,215,75,0.05), rgba(0,0,0,0.4))',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = isStylist ? '0 8px 25px rgba(0,122,255,0.15)' : '0 8px 25px rgba(50,215,75,0.15)';
                    e.currentTarget.style.borderColor = isStylist ? 'rgba(0,122,255,0.4)' : 'rgba(50,215,75,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = isStylist ? 'rgba(0, 122, 255, 0.15)' : 'rgba(50, 215, 75, 0.15)';
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '12px', 
                          background: isStylist ? 'linear-gradient(135deg, rgba(0,122,255,0.2), rgba(0,122,255,0.05))' : 'linear-gradient(135deg, rgba(50,215,75,0.2), rgba(50,215,75,0.05))', 
                          border: isStylist ? '1px solid rgba(0,122,255,0.3)' : '1px solid rgba(50,215,75,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isStylist ? 'inset 0 0 10px rgba(0,122,255,0.2)' : 'inset 0 0 10px rgba(50,215,75,0.2)'
                        }}>
                          {isStylist ? <Droplets size={20} color="#007aff" style={{ filter: 'drop-shadow(0 0 5px rgba(0,122,255,0.5))' }} /> : <Sparkles size={20} color="#32d74b" style={{ filter: 'drop-shadow(0 0 5px rgba(50,215,75,0.5))' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '900', fontSize: '16px', color: 'white', letterSpacing: '0.3px' }}>{app.clients?.name || 'Cliente'}</div>
                          <div style={{ fontSize: '13px', color: 'var(--pink-primary)', fontWeight: '800' }}>
                            {isStylist ? `${app.services?.name} (${app.staff?.name || 'Estilista'})` : app.services?.name}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: isStylist ? '#007aff' : '#32d74b', textShadow: isStylist ? '0 0 10px rgba(0,122,255,0.4)' : '0 0 10px rgba(50,215,75,0.4)' }}>
                          {Math.round(displayVal * (rates?.usd || 550)).toLocaleString('es-VE')} Bs. {isStylist && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(Comisión)</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '2px' }}>
                          Ref: ${displayVal.toFixed(2)} USD
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(236,72,153,0.25)' }}>
                      {startedTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '800' }}>⏱ {startedTime} → {completedTime}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '900', color: isStylist ? '#007aff' : 'var(--pink-primary)', background: isStylist ? 'rgba(0,122,255,0.1)' : 'rgba(236,72,153,0.1)', padding: '4px 10px', borderRadius: '12px', border: isStylist ? '1px solid rgba(0,122,255,0.2)' : '1px solid rgba(236,72,153,0.2)' }}>
                            {durationMin > 0 ? `${durationMin} min` : 'Completado'}
                          </span>
                        </div>
                      )}
                      {!isStylist && (app.appointment_extras?.length > 0 || app.appointment_products?.length > 0) && (
                        <span style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '700', marginLeft: 'auto' }}>
                          +{(app.appointment_extras?.length || 0) + (app.appointment_products?.length || 0)} items
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {completedToday.length > visibleCompletedCount && (
                <button 
                  onClick={() => setVisibleCompletedCount(prev => prev + 5)}
                  style={{
                    background: isStylist ? 'rgba(0,122,255,0.05)' : 'rgba(50,215,75,0.05)',
                    border: isStylist ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)',
                    color: isStylist ? '#007aff' : '#32d74b',
                    padding: '12px',
                    borderRadius: '16px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    transition: 'all 0.2s',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = isStylist ? 'rgba(0,122,255,0.15)' : 'rgba(50,215,75,0.15)';
                    e.target.style.border = isStylist ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(50,215,75,0.4)';
                    e.target.style.boxShadow = isStylist ? '0 0 15px rgba(0,122,255,0.2)' : '0 0 15px rgba(50,215,75,0.2)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = isStylist ? 'rgba(0,122,255,0.05)' : 'rgba(50,215,75,0.05)';
                    e.target.style.border = isStylist ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Ver más antiguos ({completedToday.length - visibleCompletedCount})
                </button>
              )}
              </>
              );
              })()}
            </div>
          )}
        </section>

        </div>{/* end right col */}
      </div>
      ) : (
        <StaffTransactionHistory staffMember={selectedStylist} rates={rates} isMobile={isMobile} />
      )}

      {/* Add Extra/Product Modal */}
      <AnimatedModal isOpen={showAddModal}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`glass-card ${cardClass}`} style={{ maxWidth: '400px', width: '100%', borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: '900' }}>Añadir <span className="text-gold">{addMode === 'extra' ? 'Extra' : 'Producto'}</span></h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                {(addMode === 'extra' ? allExtras : inventory).map(item => (
                  <button
                    key={item.id}
                    onClick={() => addMode === 'extra' ? handleAddExtra(item) : handleAddProduct(item)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontWeight: '700' }}>{item.name}</span>
                    <span style={{ color: 'var(--pink-primary)', fontWeight: '800' }}>${item.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

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

      {/* Detail Modal for Completed Service */}
      <AnimatedModal isOpen={!!selectedCompletedApp}>
        {(overlayClass, cardClass) => {
          const app = selectedCompletedApp;
          if (!app) return null;
          const extrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (Number(e.price) || 0), 0) || 0;
          const productsTotal = app.appointment_products?.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.quantity || 1)), 0) || 0;
          const servicePrice = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (Number(app.services?.price) || 0);
          const calcUsd = servicePrice + extrasTotal + productsTotal;
          const totalUsd = Number(app.total_price || 0) > 0 ? Number(app.total_price) : calcUsd;
          const totalBs = totalUsd * (rates?.usd || 550);
          const completedTime = app.completed_at ? new Date(app.completed_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
          const startedTime = app.started_at ? new Date(app.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
          let durationMin = 0;
          if (app.started_at && app.completed_at) {
            durationMin = Math.round((new Date(app.completed_at) - new Date(app.started_at)) / 60000);
          }
          const beforePhoto = app.clients?.work_gallery?.find(p => p.type === 'Antes' && p.service_id === app.id);
          const afterPhoto = app.clients?.work_gallery?.find(p => p.type === 'Después' && p.service_id === app.id);

          return (
            <div 
              className={overlayClass}
              onClick={() => setSelectedCompletedApp(null)}
              style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.85)', 
                backdropFilter: 'blur(12px)', 
                zIndex: 99999, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '20px' 
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className={cardClass}
                style={{ 
                  maxWidth: '480px', 
                  width: '100%', 
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  borderRadius: '28px', 
                  background: 'linear-gradient(180deg, rgba(28,28,30,0.98), rgba(20,20,22,0.99))', 
                  border: isStylist ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.7)'
                }}
              >
              {/* Header */}
              <div style={{ 
                padding: '24px 24px 20px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: isStylist ? 'linear-gradient(135deg, rgba(0,122,255,0.08), transparent)' : 'linear-gradient(135deg, rgba(50,215,75,0.08), transparent)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {isStylist ? <Droplets size={16} color="#007aff" /> : <CheckCircle size={16} color="#32d74b" />}
                      <span style={{ fontSize: '10px', fontWeight: '900', color: isStylist ? '#007aff' : '#32d74b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {isStylist ? "TRATAMIENTO COMPLETADO" : "SERVICIO COMPLETADO"}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0 }}>{app.clients?.name || 'Cliente'}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {app.clients?.phone || ''}{app.clients?.id_card ? ` · C.I. ${app.clients.id_card}` : ''}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedCompletedApp(null)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px' }}>

                {/* Service Info */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>SERVICIO REALIZADO</div>
                  <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.12)', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{app.services?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Estilista: {app.staff?.name || 'Otro'}
                        </div>
                        {app.services?.included_items && app.services.included_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {app.services.included_items.map((item, idx) => (
                              <span key={idx} style={{ fontSize: '9px', fontWeight: '800', color: item.toLowerCase().includes('tratamiento') ? '#007aff' : 'var(--text-muted)', background: item.toLowerCase().includes('tratamiento') ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '12px', border: item.toLowerCase().includes('tratamiento') ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
                                {item.toLowerCase().includes('tratamiento') ? '💧' : '✦'} {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--pink-primary)' }}>${servicePrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Extras */}
                {app.appointment_extras?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>EXTRAS AGREGADOS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {app.appointment_extras.map(ex => (
                        <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{ex.service_extras?.name}</span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>+${Number(ex.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products */}
                {app.appointment_products?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>PRODUCTOS VENDIDOS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {app.appointment_products.map(pr => (
                        <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{pr.inventory?.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>x{pr.quantity}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>+${(Number(pr.price) * (pr.quantity || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos Before/After */}
                {(beforePhoto || afterPhoto) && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>GALERÍA</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {beforePhoto && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                          <img src={beforePhoto.url} alt="Antes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: 'white' }}>ANTES</div>
                        </div>
                      )}
                      {afterPhoto && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                          <img src={afterPhoto.url} alt="Después" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: '#32d74b' }}>DESPUÉS</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-secondary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>TIEMPOS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>INICIO</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{startedTime}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>FIN</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{completedTime}</div>
                    </div>
                    <div style={{ background: 'rgba(236,72,153,0.06)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(236,72,153,0.12)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '700', marginBottom: '4px' }}>DURACIÓN</div>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--pink-primary)' }}>{durationMin > 0 ? `${durationMin} min` : '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div style={{ 
                  background: isStylist ? 'linear-gradient(135deg, rgba(0,122,255,0.08), rgba(0,122,255,0.02))' : 'linear-gradient(135deg, rgba(50,215,75,0.08), rgba(50,215,75,0.02))', 
                  border: isStylist ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)', 
                  borderRadius: '16px', 
                  padding: '20px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Servicio base</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>${servicePrice.toFixed(2)}</span>
                  </div>
                  {extrasTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Extras ({app.appointment_extras.length})</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>+${extrasTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {productsTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Productos ({app.appointment_products.length})</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>+${productsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: isStylist ? '1px solid rgba(0,122,255,0.15)' : '1px solid rgba(50,215,75,0.15)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: isStylist ? '#007aff' : '#32d74b' }}>TOTAL</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: '950', color: isStylist ? '#007aff' : '#32d74b' }}>
                        {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '800' }}>
                        Ref: ${totalUsd.toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            </div>
          );
        }}
      </AnimatedModal>

      <style>{`
        .hover-item:hover {
          border-color: var(--pink-primary) !important;
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); transform: scale(1); }
          70% { box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); transform: scale(1); }
        }
        @keyframes pulse-orange {
          0% { box-shadow: 0 4px 15px rgba(255,159,10,0.35); transform: scale(1); }
          70% { box-shadow: 0 4px 25px rgba(255,159,10,0.6); transform: scale(1.01); }
          100% { box-shadow: 0 4px 15px rgba(255,159,10,0.35); transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default BarberPanel;
