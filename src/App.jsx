import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
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
  Menu
} from 'lucide-react';
import { dataService } from './services/dataService';

import ParticleBackground from './components/ParticleBackground';
import JanaLoader from './components/JanaLoader';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import TopBar from './components/TopBar';
import NotificationsDrawer from './components/NotificationsDrawer';
import { notificationService } from './services/notificationService';
import { useDialog } from './context/DialogContext';
import { useScrollLock } from './hooks/useScrollLock';
import { useModal } from './context/ModalContext';
import { canAccessModule } from './utils/roles';

const DashboardModule = lazy(() => import('./components/DashboardModule'));
const ClientModule = lazy(() => import('./components/ClientModule'));
const PersonnelModule = lazy(() => import('./components/PersonnelModule'));
const FinanceModule = lazy(() => import('./components/FinanceModule'));
const ServicesModule = lazy(() => import('./components/ServicesModule'));
const InventoryModule = lazy(() => import('./components/InventoryModule'));
const CostingModule = lazy(() => import('./components/CostingModule'));
const SchedulingModule = lazy(() => import('./components/SchedulingModule'));
const CheckoutPOS = lazy(() => import('./components/CheckoutPOS'));
const ReceptionModule = lazy(() => import('./components/ReceptionModule'));
const ReportsModule = lazy(() => import('./components/ReportsModule'));

const ModuleFallback = () => (
  <div style={{ minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>
    Cargando...
  </div>
);

function App() {
  const { user, loading: authLoading } = useAuth();
  const { alert, confirm } = useDialog();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('jana_active_tab') || 'dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabParams, setTabParams] = useState({});
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isModalOpen } = useModal();

  useScrollLock(isReceptionModalOpen);

  const [currency, setCurrency] = useState('USD'); 
  const [rates, setRates] = useState({ bcv: 0, usdt: 0, updated_at: null });
  const [activeRateType, setActiveRateType] = useState(() => {
    return localStorage.getItem('jana_active_rate') || 'usdt';
  });

  const exchangeGap = rates.bcv > 0 ? ((rates.usdt - rates.bcv) / rates.bcv) * 100 : 0;

  const effectiveRates = useMemo(() => ({ 
    usd: activeRateType === 'bcv' ? rates.bcv : rates.usdt, 
    bcv: rates.bcv,
    usdt: rates.usdt,
    gap: exchangeGap,
    activeType: activeRateType,
    updated_at: rates.updated_at 
  }), [rates.bcv, rates.usdt, exchangeGap, activeRateType, rates.updated_at]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const syncRates = async () => {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) setRates(ratesData);
    };
    syncRates();
    const interval = setInterval(syncRates, 10 * 60 * 1000);
    return () => clearInterval(interval);
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

  const handleSetActiveRateType = useCallback((type) => {
    setActiveRateType(type);
    localStorage.setItem('jana_active_rate', type);
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
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width >= 1024) {
        setIsCollapsed(false);
        setIsSidebarOpen(false);
      } else if (width < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);

    let cancelled = false;
    const initApp = async () => {
      try {
        await fetchCriticalData();
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

  const handleTabChange = useCallback((tabId, params = {}) => {
    if (!canAccessModule(user?.role, tabId)) return;
    setTabParams(params);
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
          onOpenSale={() => setIsSaleModalOpen(true)}
          stats={stats}
          chartData={chartData}
          dbData={dbData}
          handleSeedData={handleSeedData}
          rates={effectiveRates}
          onNavigate={handleTabChange}
          onRefresh={fetchInitialData}
        /></div>;
      case 'scheduling': return <div className="p-container"><SchedulingModule isMobile={isMobile} rates={effectiveRates} /></div>;
      case 'reception': return <div className="p-container"><ReceptionModule isMobile={isMobile} /></div>;
      case 'checkout': return <div className="p-container"><CheckoutPOS isMobile={isMobile} rates={effectiveRates} onOpenSale={() => setIsSaleModalOpen(true)} onNavigate={handleTabChange} /></div>;
      case 'services': return <div className="p-container"><ServicesModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'costing': return <div className="p-container"><CostingModule isMobile={isMobile} services={dbData.services} inventory={dbData.inventory} /></div>;
      case 'inventory': return <div className="p-container"><InventoryModule isMobile={isMobile} currency={currency} rates={effectiveRates} /></div>;
      case 'finance': return <div className="p-container"><FinanceModule isMobile={isMobile} currency={currency} rates={effectiveRates} staff={dbData.staff} /></div>;
      case 'reports': return <div className="p-container"><ReportsModule isMobile={isMobile} rates={effectiveRates} staff={dbData.staff || []} services={dbData.services || []} clients={dbData.clients || []} /></div>;
      case 'clients': return <div className="p-container"><ClientModule isMobile={isMobile} clients={dbData.clients} onRefresh={fetchInitialData} initialClientId={tabParams.clientId} rates={effectiveRates} /></div>;
      case 'personnel': return <div className="p-container"><PersonnelModule isMobile={isMobile} inventory={dbData.inventory || []} /></div>;
      default: return <div className="p-container"><DashboardModule isMobile={isMobile} currency={currency} rates={effectiveRates} onNavigate={handleTabChange} /></div>;
    }
  };

  const hasSessionKey = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
  if (authLoading && !user) {
    if (!hasSessionKey) return <Login />;
    return <JanaLoader visible={true} />;
  }
  if (!user) return <Login />;

  const sidebarWidth = isMobile ? 0 : (isCollapsed ? 70 : 220);

  return (
    <div className="app-container no-scrollbar" style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      <ParticleBackground />
      <JanaLoader visible={isAppLoading} />

      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {isMobile && (
        <div style={{
          position: 'fixed', left: 0, top: 0, bottom: 0,
          width: '260px', zIndex: 999,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(id) => handleTabChange(id, {})}
            rates={effectiveRates}
            isMobile={true}
            isCollapsed={false}
            setIsCollapsed={setIsCollapsed}
            activeRateType={activeRateType}
            onToggleRateType={handleSetActiveRateType}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      {!isMobile && (
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
      )}

      <main className="main-content no-scrollbar" style={{ 
        flex: 1, 
        paddingTop: isMobile ? 'calc(var(--spacing-sm) + env(safe-area-inset-top, 0px))' : 'var(--spacing-xl)', 
        paddingLeft: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-xl)', 
        paddingRight: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-xl)', 
        paddingBottom: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-xl)',
        height: '100vh',
        overflowY: activeTab === 'dashboard' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        transition: 'all 0.3s ease'
      }}>
        {isMobile && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              position: 'fixed', left: '12px', top: 'calc(12px + env(safe-area-inset-top, 0px))', zIndex: 100,
              background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(196,139,159,0.2)',
              borderRadius: '12px', width: '42px', height: '42px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <Menu size={20} color="var(--pink-primary)" />
          </button>
        )}

        <div key={activeTab} className={isAppLoading ? "opacity-0" : "animate-page-fade-in"} style={{ 
          height: activeTab === 'dashboard' ? 'calc(100% - 0px)' : 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <TopBar
            activeTab={activeTab}
            rates={effectiveRates}
            onOpenSale={() => setIsReceptionModalOpen(true)}
            activeRateType={activeRateType}
            onToggleRateType={handleSetActiveRateType}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            isMobile={isMobile}
          />
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
          border: '1px solid rgba(217,70,168,0.3)', 
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
                <ReceptionModule isMobile={isMobile} rates={effectiveRates} />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {isSaleModalOpen && (
        <Suspense fallback={null}>
          <CheckoutPOS 
            isOpen={isSaleModalOpen} 
            onClose={() => setIsSaleModalOpen(false)} 
            clients={dbData.clients}
            services={dbData.services}
            staff={dbData.staff}
            inventory={dbData.inventory || []}
            onRefresh={fetchInitialData}
            rates={rates}
            currency={currency}
          />
        </Suspense>
      )}
      <NotificationsDrawer 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
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
