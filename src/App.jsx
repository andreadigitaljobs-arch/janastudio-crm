import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import {
  BarChart3,
  UserCircle,
  Users,
  Sparkles,
  Star,
  Package,
  Wallet,
  Calendar,
  X,
  Receipt,
  Menu,
  MoreHorizontal,
  LogOut,
  Sliders,
  Percent,
  FileText,
  Plus,
  Home,
  Crown,
  ChevronRight,
  Activity,
  Calculator
} from 'lucide-react';
import LaserGunIcon from './components/LaserGunIcon';
import { dataService } from './services/dataService';

import ParticleBackground from './components/ParticleBackground';
import JanaLoader from './components/JanaLoader';
import MiniLoader from './components/MiniLoader';
import Login from './components/Login';
import OnboardingModule from './components/OnboardingModule';
import { useAuth } from './context/AuthContext';
import TopBar from './components/TopBar';
import NotificationsPage from './components/NotificationsPage';
import NotificationsDrawer from './components/NotificationsDrawer';
import { notificationService } from './services/notificationService';
import { useDialog } from './context/DialogContext';
import { useScrollLock } from './hooks/useScrollLock';
import { useModal } from './context/ModalContext';
import { canAccessModule } from './utils/roles';

const DashboardModule = lazy(() => import('./components/DashboardModule'));
const ClientModule = lazy(() => import('./components/ClientModule'));
const SchedulingModule = lazy(() => import('./components/SchedulingModule'));
const CheckoutPOS = lazy(() => import('./components/CheckoutPOS'));
const CapillaryDiagnosisModule = lazy(() => import('./components/CapillaryDiagnosisModule'));

const PersonnelModule = lazy(() => import('./components/PersonnelModule'));
const FinanceModule = lazy(() => import('./components/FinanceModule'));
const ServicesModule = lazy(() => import('./components/ServicesModule'));
const InventoryModule = lazy(() => import('./components/InventoryModule'));
const CostingModule = lazy(() => import('./components/CostingModule'));
const ReceptionModule = lazy(() => import('./components/ReceptionModule'));
const ReportsModule = lazy(() => import('./components/ReportsModule'));
const LaserModule = lazy(() => import('./components/LaserModule'));
const ScheduleModal = lazy(() => import('./components/ScheduleModal'));

const ModuleFallback = () => <MiniLoader text="Preparando vista..." />;
const AccountingModule = lazy(() => import('./components/AccountingModule'));
const PromotionsModule = lazy(() => import('./components/PromotionsModule'));
const SettingsModule = lazy(() => import('./components/SettingsModule'));


function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { alert, confirm } = useDialog();
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('jana_onboarding_completed') !== 'true');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const mainContentRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('jana_active_tab') || 'dashboard';
    const isMobileDevice = typeof window !== 'undefined' ? (window.innerWidth < 600 || window.screen.width < 600) : false;
    if (saved === 'notifications' && !isMobileDevice) {
      return 'dashboard';
    }
    return saved;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 600 || window.screen.width < 600;
    }
    return false;
  });
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 600 && window.innerWidth < 1024;
    }
    return false;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 600 && window.innerWidth < 1024;
    }
    return false;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabParams, setTabParams] = useState(() => {
    try {
      const saved = sessionStorage.getItem('jana_tab_params');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [hideSidebar, setHideSidebar] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showFabHint, setShowFabHint] = useState(false);
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false);
  const [hasQuickScheduleMounted, setHasQuickScheduleMounted] = useState(false);
  const { isModalOpen } = useModal();

  useEffect(() => {
    window.isJanaAppLoading = isAppLoading;
  }, [isAppLoading]);

  useEffect(() => {
    if (!isMobile || !user) return;
    if (localStorage.getItem('jana_fab_hint_seen')) return;
    const showTimer = setTimeout(() => setShowFabHint(true), 600);
    const hideTimer = setTimeout(() => {
      setShowFabHint(false);
      localStorage.setItem('jana_fab_hint_seen', 'true');
    }, 5600);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [isMobile, user]);

  const dismissFabHint = () => {
    setShowFabHint(false);
    localStorage.setItem('jana_fab_hint_seen', 'true');
  };

  const allMenuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'scheduling', label: 'Agenda', icon: Calendar },
    { id: 'reception', label: 'Recepción', icon: UserCircle },
    { id: 'laser', label: 'Centro Láser', icon: LaserGunIcon },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'diagnosis', label: 'Diagnóstico Capilar', icon: Activity },
    { id: 'services', label: 'Servicios', icon: Star },
    { id: 'personnel', label: 'Equipo', icon: Sparkles },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'costing', label: 'Estruct. de Costos', icon: Calculator },
    { id: 'finance', label: 'Finanzas', icon: Wallet },
    { id: 'accounting', label: 'Contabilidad', icon: Receipt },
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'promotions', label: 'Promociones', icon: Percent },
    { id: 'settings', label: 'Configuración', icon: Sliders },
  ], []);

  const allowedMenuItems = useMemo(() => {
    return allMenuItems.filter(item => canAccessModule(user?.role, item.id));
  }, [user?.role, allMenuItems]);

  const mobileVisibleItems = useMemo(() => {
    if (allowedMenuItems.length <= 5) {
      return allowedMenuItems;
    }
    return allowedMenuItems.slice(0, 4);
  }, [allowedMenuItems]);

  const mobileHiddenItems = useMemo(() => {
    const bottomBarIds = ['dashboard', 'scheduling', 'clients'];
    return allowedMenuItems.filter(item => !bottomBarIds.includes(item.id));
  }, [allowedMenuItems]);

  useScrollLock(isReceptionModalOpen);

  const [currency, setCurrency] = useState('USD'); 
  const [rates, setRates] = useState({ bcv: 0, usdt: 0, updated_at: null });
  const [activeRateType, setActiveRateType] = useState(() => {
    return 'bcv';
  });

  const exchangeGap = rates.bcv > 0 ? ((rates.usdt - rates.bcv) / rates.bcv) * 100 : 0;

  const effectiveRates = useMemo(() => ({ 
    usd: rates.bcv,
    bcv: rates.bcv,
    usdt: rates.usdt,
    gap: exchangeGap,
    activeType: activeRateType,
    updated_at: rates.updated_at 
  }), [rates.bcv, rates.usdt, exchangeGap, activeRateType, rates.updated_at]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const handleOpenNotifications = () => {
    if (isMobile) {
      handleTabChange('notifications');
    } else {
      setIsNotificationsOpen(true);
    }
  };

  useEffect(() => {
    // Desktop safeguard on mount: if saved tab was notifications, force open the drawer
    const savedTab = localStorage.getItem('jana_active_tab');
    if (savedTab === 'notifications' && !isMobile) {
      setIsNotificationsOpen(true);
      localStorage.setItem('jana_active_tab', 'dashboard');
    }

    const syncRates = async () => {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) setRates(ratesData);
    };
    syncRates();
    const interval = setInterval(syncRates, 10 * 60 * 1000);

    const handleHideSidebar = () => setHideSidebar(true);
    const handleShowSidebar = () => setHideSidebar(false);
    window.addEventListener('jana:open-notifications', handleOpenNotifications);
    window.addEventListener('jana:hide-sidebar', handleHideSidebar);
    window.addEventListener('jana:show-sidebar', handleShowSidebar);

    return () => {
      clearInterval(interval);
      window.removeEventListener('jana:open-notifications', handleOpenNotifications);
      window.removeEventListener('jana:hide-sidebar', handleHideSidebar);
      window.removeEventListener('jana:show-sidebar', handleShowSidebar);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = dataService.supabase.channel('jana-notifications-v2')
      .on('broadcast', { event: 'crm-notification' }, ({ payload }) => {
        const userRole = user?.role || '';
        const roleName = userRole.split('|')[0];
        let shouldShow = false;
        if (roleName === 'Admin') shouldShow = true;
        else if (payload.recipientId && String(payload.recipientId) === String(user.id)) shouldShow = true;
        if (shouldShow) notificationService.sendNotification(payload.title, payload.body);
      })
      .subscribe();
    return () => { dataService.supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let refreshTimer;
    const publishDataChange = (table, payload) => {
      dataService.invalidateSpecificCache(table);
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('jana:data-changed', {
          detail: { table, eventType: payload.eventType, payload }
        }));
      }, 250);
    };

    const channel = dataService.supabase
      .channel(`jana-operational-${user.id}`)
      .on('postgres_changes', { event: 'INSERT,UPDATE,DELETE', schema: 'janastudio', table: 'appointments' }, payload => publishDataChange('appointments', payload))
      .on('postgres_changes', { event: 'INSERT,UPDATE,DELETE', schema: 'janastudio', table: 'transactions' }, payload => publishDataChange('transactions', payload))
      .on('postgres_changes', { event: 'INSERT,UPDATE,DELETE', schema: 'janastudio', table: 'clients' }, payload => publishDataChange('clients', payload))
      .subscribe();
    return () => { clearTimeout(refreshTimer); dataService.supabase.removeChannel(channel); };
  }, [user]);

  const handleSetActiveRateType = useCallback(() => {
    setActiveRateType('bcv');
    localStorage.setItem('jana_active_rate', 'bcv');
  }, []);

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [stats, setStats] = useState({ income: 0, clients: 0, expenses: 0, appointments: 0 });
  const [dbData, setDbData] = useState({ clients: [], services: [], staff: [], inventory: [] });

  const [chartData, setChartData] = useState({
    labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
    datasets: [{
      label: 'Ingresos ($)',
      data: [0, 0, 0, 0, 0, 0, 0],
      borderColor: '#c48b9f',
      backgroundColor: 'rgba(196, 139, 159, 0.1)',
      fill: true,
      tension: 0.4
    }]
  });

  useEffect(() => {
    if (!user) return;
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 600);
      setIsTablet(width >= 600 && width < 1024);
      if (width >= 1024) {
        setIsCollapsed(false);
        setIsSidebarOpen(false);
      } else if (width < 600) {
        setIsSidebarOpen(false);
      } else {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let cancelled = false;
    const initApp = async () => {
      try {
        await fetchCriticalData();
        // Check for active laser package expirations (non-blocking)
        dataService.checkLaserPackageExpirations().catch(err => {
          console.warn('Error checking laser package expirations:', err);
        });
      } catch (error) {
        console.error('Initial app load failed:', error);
      } finally {
        if (!cancelled) setIsAppLoading(false);
      }
      try {
        await fetchSecondaryData();
      } catch (e) {
        console.warn('Secondary data load failed:', e);
      }
    };

    initApp();
    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
    };
  }, [user]);

  async function fetchCriticalData() {
    const [c, s, st] = await Promise.allSettled([
      dataService.getClients(),
      dataService.getServices(),
      dataService.getStaff()
    ]);
    const clients = c.status === 'fulfilled' ? c.value : [];
    const services = s.status === 'fulfilled' ? s.value : [];
    let staff = st.status === 'fulfilled' ? st.value : [];
    if (!staff.length && user?.id) {
      try {
        const own = await dataService.getStaffByAuthUserId((await dataService.supabase.auth.getUser()).data?.user?.id);
        if (own) staff = [own];
      } catch (_) {}
    }
    setDbData(prev => ({ ...prev, clients, services, staff }));
  }

  async function fetchSecondaryData(changedTable = null) {
    try {
      const currentWeekStartISO = getStartOfCurrentWeek().toISOString();
      const currentMonthStartISO = getStartOfCurrentMonth().toISOString();
      const dashboardStartISO = new Date(Math.min(
        new Date(currentWeekStartISO).getTime(),
        new Date(currentMonthStartISO).getTime()
      )).toISOString();

      const fetchAll = !changedTable;
      const fetchAppts = fetchAll || changedTable === 'appointments';
      const fetchTrans = fetchAll || changedTable === 'transactions' || changedTable === 'appointments';
      const fetchClients = fetchAll || changedTable === 'clients';

      const [t, inv, apps, fullClients, st] = await Promise.all([
        fetchTrans ? dataService.getTransactions(dashboardStartISO) : Promise.resolve(null),
        fetchAll ? dataService.getInventory() : Promise.resolve(null),
        fetchAppts ? dataService.getAppointmentsByState(['Completado'], dashboardStartISO) : Promise.resolve(null),
        fetchClients ? dataService.getClients() : Promise.resolve(null),
        fetchAll ? dataService.getStaff() : Promise.resolve(null)
      ]);

      setDbData(prev => {
        const currentTransactions = t || prev.transactions || [];
        const currentClients = fetchClients ? fullClients : prev.clients;
        const currentStaff = fetchAll ? (st || []) : prev.staff;
        const currentApps = fetchAppts ? (apps || []) : prev.appointments;

        setTimeout(() => {
          const today = new Date().toISOString().split('T')[0];
          const todayTransactions = currentTransactions.filter(trans => trans.created_at?.startsWith(today));
          setStats({
            income: todayTransactions.filter(tr => tr.type === 'income').reduce((acc, tr) => acc + Number(tr.amount), 0),
            weeklyIncome: currentTransactions.filter(tr => tr.type === 'income' && tr.created_at >= currentWeekStartISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
            monthlyIncome: currentTransactions.filter(tr => tr.type === 'income' && tr.created_at >= currentMonthStartISO).reduce((acc, tr) => acc + Number(tr.amount), 0),
            expenses: todayTransactions.filter(tr => tr.type === 'expense').reduce((acc, tr) => acc + Number(tr.amount), 0),
            clients: currentClients.length,
            appointments: todayTransactions.length 
          });

          const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
          });
          const dailyTotals = last7Days.map(day => 
            currentTransactions.filter(tr => tr.created_at?.startsWith(day) && tr.type === 'income')
              .reduce((acc, tr) => acc + Number(tr.amount), 0)
          );
          setChartData({
            labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
            datasets: [{
              label: 'Ingresos ($)',
              data: dailyTotals,
              borderColor: '#c48b9f',
              backgroundColor: 'rgba(196, 139, 159, 0.1)',
              fill: true,
              tension: 0.4
            }]
          });
        }, 0);

        return { 
          ...prev,
          clients: currentClients, 
          staff: currentStaff, 
          inventory: fetchAll ? (inv || []) : prev.inventory,
          appointments: currentApps,
          transactions: currentTransactions
        };
      });
    } catch (error) { console.error('Error fetching secondary data:', error); }
  }

  async function fetchInitialData() {
    await fetchCriticalData();
    await fetchSecondaryData();
  }

  const isInitialMount = useRef(true);
  const restoredScroll = useRef(false);

  // Restore scroll position on first mount, then disable restore flag
  useEffect(() => {
    if (isInitialMount.current) {
      const saved = sessionStorage.getItem('jana_scroll_position');
      if (saved && mainContentRef.current) {
        const target = Number(saved);
        restoredScroll.current = true;
        requestAnimationFrame(() => {
          if (mainContentRef.current) {
            mainContentRef.current.scrollTop = target;
          }
        });
      }
      isInitialMount.current = false;
    }
  }, []);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    const el = mainContentRef.current;
    if (!el) return;
    let timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sessionStorage.setItem('jana_scroll_position', String(Math.round(el.scrollTop)));
      }, 200);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => { el.removeEventListener('scroll', handleScroll); clearTimeout(timeout); };
  }, []);

  // Every time a new "page" opens (main tab switch, or a deep-link like a client id),
  // start scrolled at the top instead of wherever the previous page left off.
  useEffect(() => {
    if (restoredScroll.current) {
      restoredScroll.current = false;
      return;
    }
    mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab, tabParams]);

  const handleTabChange = useCallback((tabId, params = {}) => {
    if (!canAccessModule(user?.role, tabId)) return;
    
    // Safeguard: on desktop, never navigate to the full page notifications module.
    // Instead, trigger the slide-out side drawer and stay on the current view!
    if (tabId === 'notifications' && !isMobile) {
      setIsNotificationsOpen(true);
      return;
    }

    setTabParams(params);
    sessionStorage.setItem('jana_tab_params', JSON.stringify(params));
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    localStorage.setItem('jana_active_tab', tabId);
    if (isMobile) setIsSidebarOpen(false);
  }, [user?.role, activeTab, isMobile]);

  const handleSeedData = async () => {
    if (!await confirm('¿Quieres cargar datos de prueba para ver el CRM funcionando?')) return;
    try {
      await dataService.addStaff({ name: 'María García', role: 'Manicurista', commission_pct: 40 });
      await dataService.addStaff({ name: 'Ana López', role: 'Lashista', commission_pct: 40 });
      await dataService.addService({ name: 'Manicuría Francesa', price: 35, category: 'Uñas', duration_minutes: 60 });
      await dataService.addService({ name: 'Pestañas Rusa', price: 45, category: 'Pestañas', duration_minutes: 120 });
      await dataService.addService({ name: 'Alisado Premium', price: 120, category: 'Cabello', duration_minutes: 180 });
      await dataService.addClient({ name: 'Laura Demo', phone: '555-0123', skin_type: 'Normal' });
      await alert('Datos de demo cargados!');
      fetchInitialData();
    } catch (error) { console.error('Error seeding:', error); }
  };

  const renderContent = () => {
    const authorizedTab = canAccessModule(user?.role, activeTab) ? activeTab : 'dashboard';
    switch (authorizedTab) {
      case 'dashboard':
        return <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}><DashboardModule
          isMobile={isMobile}
          isTablet={isTablet}
          isCollapsed={isCollapsed}
          onOpenSale={() => handleTabChange('scheduling', { openScheduleModal: true, modalKey: Date.now() })}
          stats={stats}
          chartData={chartData}
          dbData={dbData}
          handleSeedData={handleSeedData}
          rates={effectiveRates}
          onNavigate={handleTabChange}
          onRefresh={fetchInitialData}
          onOpenNotifications={handleOpenNotifications}
        /></div>;
      case 'scheduling': return <div className="p-container p-container-agenda"><SchedulingModule isMobile={isMobile} isTablet={isTablet} isCollapsed={isCollapsed} rates={effectiveRates} openScheduleModal={tabParams.openScheduleModal} modalKey={tabParams.modalKey} onOpenNotifications={handleOpenNotifications} onNavigate={handleTabChange} /></div>;
      case 'reception': return <div className="p-container"><ReceptionModule isMobile={isMobile} onNavigate={handleTabChange} /></div>;
      case 'laser': return <div className="p-container"><LaserModule isMobile={isMobile} /></div>;
      case 'checkout': return <div className="p-container"><CheckoutPOS isMobile={isMobile} rates={effectiveRates} initialAppointmentId={tabParams.appointmentId} onOpenSale={() => setIsSaleModalOpen(true)} onNavigate={handleTabChange} /></div>;
      case 'services': return <div className="p-container"><ServicesModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'costing': return <div className="p-container"><CostingModule isMobile={isMobile} services={dbData.services} inventory={dbData.inventory} /></div>;
      case 'inventory': return <div className="p-container"><InventoryModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'finance': return <div className="p-container"><FinanceModule isMobile={isMobile} currency={currency} rates={effectiveRates} staff={dbData.staff} /></div>;
      case 'accounting': return <div className="p-container"><AccountingModule isMobile={isMobile} /></div>;
      case 'promotions': return <div className="p-container"><PromotionsModule isMobile={isMobile} /></div>;
      case 'settings': return <div className="p-container"><SettingsModule isMobile={isMobile} /></div>;
      case 'reports': return <div className="p-container"><ReportsModule isMobile={isMobile} rates={effectiveRates} staff={dbData.staff || []} services={dbData.services || []} clients={dbData.clients || []} /></div>;
      case 'clients': return <div className="p-container"><ClientModule isMobile={isMobile} isTablet={isTablet} clients={dbData.clients} onRefresh={fetchInitialData} initialClientId={tabParams.clientId} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
      case 'diagnosis': return <div className="p-container"><CapillaryDiagnosisModule isMobile={isMobile} clients={dbData.clients} onNavigate={handleTabChange} prefillClientId={tabParams.clientId} /></div>;
      case 'personnel': return <div className="p-container"><PersonnelModule isMobile={isMobile} inventory={dbData.inventory || []} /></div>;
      case 'notifications': return <div className="p-container"><NotificationsPage isMobile={isMobile} onNavigate={handleTabChange} /></div>;
      default: return <div className="p-container"><DashboardModule isMobile={isMobile} currency={currency} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
    }
  };

  const totalMobileButtons = allowedMenuItems.length > 5 ? 5 : allowedMenuItems.length;
  const activeMobileIndex = useMemo(() => {
    if (isMoreOpen) {
      return totalMobileButtons - 1;
    }
    const idx = mobileVisibleItems.findIndex(item => item.id === activeTab);
    if (idx !== -1) return idx;
    if (allowedMenuItems.length > 5) {
      return totalMobileButtons - 1;
    }
    return -1;
  }, [activeTab, mobileVisibleItems, isMoreOpen, totalMobileButtons, allowedMenuItems.length]);

  const hasSessionKey = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
  
  if (showOnboarding && !user && !hasSessionKey) {
    return <OnboardingModule onComplete={() => {
      localStorage.setItem('jana_onboarding_completed', 'true');
      setShowOnboarding(false);
    }} />;
  }

  if (authLoading && !user) {
    if (!hasSessionKey) return <Login />;
    return <JanaLoader visible={true} />;
  }
  if (!user) return <Login />;

  return (
    <div className="app-container no-scrollbar" style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      <ParticleBackground />
      <JanaLoader visible={isAppLoading} />

      {!isMobile && (
        <div style={{ display: isReceptionModalOpen || hideSidebar ? 'none' : 'block' }}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(id) => handleTabChange(id, {})}
            rates={effectiveRates}
            isMobile={false}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
            activeRateType={activeRateType}
            onToggleRateType={handleSetActiveRateType}
          />
        </div>
      )}

      <main ref={mainContentRef} className="main-content no-scrollbar" style={{ 
        flex: 1, 
        paddingTop: isMobile ? 'calc(var(--spacing-sm) + env(safe-area-inset-top, 0px))' : 'var(--spacing-xl)', 
        paddingLeft: isMobile ? '16px' : 'var(--spacing-xl)', 
        paddingRight: isMobile ? '16px' : 'var(--spacing-xl)', 
        paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom, 12px))' : 'var(--spacing-xl)',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        transition: 'all 0.3s ease'
      }}>

        <div key={activeTab} className={isAppLoading ? "opacity-0" : "animate-page-fade-in"} style={{ 
          height: activeTab === 'dashboard' ? 'calc(100% - 0px)' : 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!(isMobile && activeTab === 'dashboard') && (
            <TopBar
              activeTab={activeTab}
              rates={effectiveRates}
              onOpenSale={() => setIsReceptionModalOpen(true)}
              activeRateType={activeRateType}
              onToggleRateType={handleSetActiveRateType}
              onOpenNotifications={handleOpenNotifications}
              isMobile={isMobile}
              dbData={dbData}
              onNavigate={handleTabChange}
            />
          )}
          <Suspense fallback={<ModuleFallback />}>
            {renderContent()}
          </Suspense>
        </div>
      </main>

      {/* Reception Modal */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 3000, 
        backgroundColor: 'rgba(0,0,0,0.9)', 
        backdropFilter: isReceptionModalOpen ? 'blur(20px)' : 'blur(0px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: isMobile ? '0' : '20px',
        opacity: isReceptionModalOpen ? 1 : 0,
        visibility: isReceptionModalOpen ? 'visible' : 'hidden',
        pointerEvents: isReceptionModalOpen ? 'auto' : 'none',
        transition: 'opacity 0.35s ease, backdrop-filter 0.35s ease, visibility 0.35s'
      }}>
        <div className="glass-card" style={{ 
          width: '100%', 
          maxWidth: '1400px', 
          height: isMobile ? '100%' : '90vh', 
          overflowY: isModalOpen ? 'hidden' : 'auto', 
          borderRadius: isMobile ? '0' : '32px', 
          border: '1px solid rgba(212,160,154,0.35)', 
          position: 'relative', 
          background: 'var(--bg-primary)',
          transform: isReceptionModalOpen ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(20px)',
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
          opacity: isReceptionModalOpen ? 1 : 0
        }}>
          <button 
            onClick={() => setIsReceptionModalOpen(false)}
            style={{ position: 'absolute', right: '20px', top: '20px', zIndex: 3001, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
          {isReceptionModalOpen && (
            <div style={{ padding: isMobile ? '20px' : '40px' }}>
              <Suspense fallback={<ModuleFallback />}>
                <ReceptionModule isMobile={isMobile} rates={effectiveRates} onNavigate={handleTabChange} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* Checkout POS Modal */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 3000, 
        backgroundColor: 'rgba(253, 248, 247, 0.99)', 
        display: 'flex', 
        alignItems: 'stretch', 
        justifyContent: 'center', 
        opacity: isSaleModalOpen ? 1 : 0,
        visibility: isSaleModalOpen ? 'visible' : 'hidden',
        pointerEvents: isSaleModalOpen ? 'auto' : 'none',
        transition: 'opacity 0.25s ease, visibility 0.25s'
      }}>
        <div style={{ 
          width: '100%', 
          height: '100%', 
          overflowY: 'auto', 
          position: 'relative', 
          background: '#fdf8f7',
          padding: isMobile ? '20px' : '40px',
        }}>
          {/* Close Button */}
          <button 
            onClick={() => setIsSaleModalOpen(false)}
            style={{ 
              position: 'fixed', 
              right: '20px', 
              top: '20px', 
              zIndex: 3001, 
              background: 'rgba(74, 48, 54, 0.08)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              color: 'var(--text-primary)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(74, 48, 54, 0.05)'
            }}
          >
            <X size={20} />
          </button>
          
          {isSaleModalOpen && (
            <Suspense fallback={<ModuleFallback />}>
              <CheckoutPOS 
                isMobile={isMobile} 
                rates={effectiveRates} 
                onNavigate={(tab, params) => {
                  handleTabChange(tab, params);
                  setIsSaleModalOpen(false);
                }} 
              />
            </Suspense>
          )}
        </div>
      </div>

      {!isMobile && (
        <NotificationsDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          isMobile={false}
        />
      )}

      {/* Quick "agendar cita" modal — opens as an overlay from the FAB without leaving the current tab.
          Stays mounted once opened (instead of `isQuickScheduleOpen &&`) so AnimatedModal
          can play its exit animation instead of being yanked out instantly on close. */}
      {hasQuickScheduleMounted && (
        <Suspense fallback={null}>
          <ScheduleModal
            isOpen={isQuickScheduleOpen}
            onClose={() => setIsQuickScheduleOpen(false)}
            clients={dbData.clients}
            services={dbData.services}
            staff={dbData.staff}
            rates={effectiveRates}
            defaultDate={new Date()}
            onSave={() => setIsQuickScheduleOpen(false)}
          />
        </Suspense>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && user && (
        <div style={{
          position: 'fixed', 
          left: '16px', 
          right: '16px', 
          bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          height: '66px',
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(212, 160, 154, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(160, 80, 106, 0.12)',
          zIndex: 997,
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center',
          padding: '0 8px',
        }}>
          {/* Inicio */}
          <button
            onClick={() => {
              handleTabChange('dashboard', {});
              setIsMoreOpen(false);
            }}
            className={`mobile-nav-btn ${activeTab === 'dashboard' && !isMoreOpen ? 'active' : ''}`}
          >
            <div className="mobile-nav-icon-container">
              <Home size={20} style={{ color: activeTab === 'dashboard' && !isMoreOpen ? 'var(--magenta-primary)' : 'var(--text-muted)' }} />
            </div>
            <span>Inicio</span>
          </button>

          {/* Agenda */}
          <button
            onClick={() => {
              handleTabChange('scheduling', {});
              setIsMoreOpen(false);
            }}
            className={`mobile-nav-btn ${activeTab === 'scheduling' && !isMoreOpen ? 'active' : ''}`}
          >
            <div className="mobile-nav-icon-container">
              <Calendar size={20} style={{ color: activeTab === 'scheduling' && !isMoreOpen ? 'var(--magenta-primary)' : 'var(--text-muted)' }} />
            </div>
            <span>Agenda</span>
          </button>

          {/* Floating Central Plus (+) Button — main CTA to book an appointment */}
          <div style={{
            position: 'relative',
            width: '72px',
            height: '54px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {showFabHint && (
              <div className="mobile-fab-hint" onClick={dismissFabHint}>
                Toca aquí para agendar una cita ✨
                <div className="mobile-fab-hint-arrow" />
              </div>
            )}
            <div className="mobile-fab-ring" />
            <button
              onClick={() => {
                dismissFabHint();
                setHasQuickScheduleMounted(true);
                setIsQuickScheduleOpen(true);
                setIsMoreOpen(false);
              }}
              className="mobile-fab-btn"
              aria-label="Agendar nueva cita"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>

          {/* Clientes */}
          <button
            onClick={() => {
              handleTabChange('clients', {});
              setIsMoreOpen(false);
            }}
            className={`mobile-nav-btn ${activeTab === 'clients' && !isMoreOpen ? 'active' : ''}`}
          >
            <div className="mobile-nav-icon-container">
              <Users size={20} style={{ color: activeTab === 'clients' && !isMoreOpen ? 'var(--magenta-primary)' : 'var(--text-muted)' }} />
            </div>
            <span>Clientes</span>
          </button>

          {/* Más */}
          <button
            onClick={() => setIsMoreOpen(prev => !prev)}
            className={`mobile-nav-btn ${isMoreOpen || (activeTab !== 'dashboard' && activeTab !== 'scheduling' && activeTab !== 'clients') ? 'active' : ''}`}
          >
            <div className="mobile-nav-icon-container">
              <MoreHorizontal size={20} style={{ color: isMoreOpen || (activeTab !== 'dashboard' && activeTab !== 'scheduling' && activeTab !== 'clients') ? 'var(--magenta-primary)' : 'var(--text-muted)' }} />
            </div>
            <span>Más</span>
          </button>
        </div>
      )}

      {/* Mobile More Bottom Drawer */}
      {isMobile && isMoreOpen && (
        <div
          onClick={() => setIsMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1999,
            backgroundColor: 'rgba(74, 48, 54, 0.4)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.25s ease'
          }}
        />
      )}

      {isMobile && (
        <div className="mobile-more-drawer" style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, #fffbfa 0%, #fff2f4 55%, #fce8ea 100%)',
          backdropFilter: 'blur(20px)',
          borderTopLeftRadius: '32px', borderTopRightRadius: '32px',
          borderTop: '1px solid rgba(212, 160, 154, 0.3)',
          boxShadow: '0 -10px 40px rgba(74, 48, 54, 0.12)',
          zIndex: 2000,
          padding: '16px 16px calc(20px + env(safe-area-inset-bottom, 12px)) 16px',
          transform: isMoreOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          {/* Header indicator bar */}
          <div
            className="mobile-more-handle btn-press"
            style={{
              width: '40px', height: '4px', background: 'rgba(160, 80, 106, 0.25)',
              borderRadius: '10px', alignSelf: 'center', marginBottom: '4px', cursor: 'pointer'
            }}
            onClick={() => setIsMoreOpen(false)}
          />

          {/* User profile */}
          <div className="mobile-more-profile">
            <Crown size={18} className="mobile-more-crown" />
            {user?.image_url ? (
              <img src={user.image_url} alt="" className="mobile-more-avatar" />
            ) : (
              <div className="mobile-more-avatar mobile-more-avatar-fallback">
                {user?.name?.charAt(0) || 'A'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mobile-more-profile-name">{user?.name || 'Jana'}</div>
              <div className="mobile-more-profile-role">{user?.role || 'Admin'}</div>
            </div>
          </div>

          {/* Remaining menu items */}
          <div className="mobile-more-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {mobileHiddenItems.map((item, itemIdx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleTabChange(item.id, {});
                    setIsMoreOpen(false);
                  }}
                  className="mobile-more-tile"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #fff0f2 0%, #ffe4e8 100%)' : '#ffffff',
                    border: isActive ? '1.5px solid rgba(201, 114, 130, 0.35)' : '1px solid rgba(212, 160, 154, 0.14)',
                    '--tile-delay': `${0.06 + itemIdx * 0.05}s`,
                  }}
                >
                  <div className="mobile-more-tile-icon" style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #e8a2a9 0%, #a0506a 100%)'
                      : 'rgba(232,162,169,0.14)',
                  }}>
                    <Icon size={20} strokeWidth={1.75} style={{ color: isActive ? '#fff' : 'var(--magenta-primary)' }} />
                  </div>
                  <span className="mobile-more-tile-label" style={{ color: isActive ? 'var(--magenta-primary)' : '#3d2b30' }}>{item.label}</span>
                  <ChevronRight size={16} className="mobile-more-tile-chevron" />
                </button>
              );
            })}
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              setIsMoreOpen(false);
              logout();
            }}
            className="mobile-more-logout"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>

          {/* Brand signature */}
          <div className="mobile-more-brand">
            <span className="mobile-more-brand-arrow">—</span>
            <img src="/logo.webp" alt="Jana Studio" className="mobile-more-brand-logo" />
            <span className="mobile-more-brand-arrow">—</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getStartOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default App;
