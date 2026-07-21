import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  Sparkles, 
  TrendingUp, 
  Loader2,
  ChevronDown,
  Package,
  Camera
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotificationContext';

const HistoryModule = ({ isMobile, rates, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [selectedId, setSelectedId] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const isAdmin = user?.role?.toLowerCase().includes('admin');

  const normalizeTransaction = (tx) => {
    const meta = tx.metadata || {};
    const desc = tx.description || '';
    const clientName = meta.clientName || desc.split(' - Cliente: ')[1]?.split(' - ')[0] || 'S/N';
    const serviceName = meta.serviceName || desc.split(' - Servi: ')[1] || tx.category || 'Transacción';
    const estilista = meta.staffInvolved?.find(s => s.role?.includes('Estilista'))?.name ||
                    meta.staffInvolved?.[0]?.name || null;
    const rate = Number(tx.exchange_rate || 550);

    return {
      id: tx.id,
      created_at: tx.created_at,
      _type: 'transaction',
      _appointmentId: meta.appointment_id || meta.appointmentId || null,
      clients: {
        name: clientName,
        phone: null,
        id_card: meta.clientCedula || null
      },
      services: {
        name: serviceName,
        price: tx.amount || 0
      },
      appointment_extras: [],
      appointment_products: [],
      appointment_staff: estilista ? [{
        commission_earned: 0,
        tip_amount: 0,
        staff: { name: estilista }
      }] : [],
      exchange_rate: rate,
      _txType: tx.type,
      _category: tx.category,
      _paymentMethod: meta.paymentMethod || meta.method_usd || meta.method_bs || null,
      _amountUSD: tx.amount || 0,
      _totalBs: Number(meta.transfer_bs) || ((tx.amount || 0) * rate)
    };
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      let data = [];

      let startDate = null;
      if (dateRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate = startDate.toISOString();
      } else if (dateRange === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        lastWeek.setHours(0, 0, 0, 0);
        startDate = lastWeek.toISOString();
      }

      if (isAdmin) {
        // Fetch completed appointments with calculated startDate limit
        const allAppointments = await dataService.getAppointmentsByState(['Completado'], startDate);
        const appointments = allAppointments.filter(a => a.service_id !== null && a.service_id !== undefined);

        // Fetch transactions with calculated startDate limit
        let txQuery = dataService.supabase
          .from('transactions')
          .select('id, client_id, created_at, amount, exchange_rate, currency, type, category, description, metadata');
        if (startDate) {
          txQuery = txQuery.gte('created_at', startDate);
        }
        const { data: txData, error: txError } = await txQuery.order('created_at', { ascending: false });

        if (txError) throw txError;

        const txRecords = (txData || [])
          .filter(tx => tx.metadata?.type !== 'weekly_close' && tx.description !== 'Cierre Semanal Automático')
          .map(normalizeTransaction);

        // Let's create a map of appointment_id -> transaction for enrichment
        const txMap = {};
        (txData || []).forEach(tx => {
          const appId = tx.metadata?.appointment_id || tx.metadata?.appointmentId;
          if (appId) {
            txMap[String(appId)] = tx;
          }
        });

        // Enrich appointments with transaction exchange rate and transfer_bs
        const enrichedAppointments = appointments.map(app => {
          const relatedTx = txMap[String(app.id)];
          if (relatedTx) {
            return {
              ...app,
              exchange_rate: Number(relatedTx.exchange_rate) || app.exchange_rate,
              _totalBsOverride: Number(relatedTx.metadata?.transfer_bs) || null,
              _paymentMethod: relatedTx.metadata?.paymentMethod || relatedTx.metadata?.method_usd || relatedTx.metadata?.method_bs || null
            };
          }
          return app;
        });

        // Merge: appointments + transactions (deduplicate by linking appointment_id)
        const appointmentIds = new Set(appointments.map(a => String(a.id)));
        const orphans = txRecords.filter(tx => 
          !tx._txType?.startsWith('_') && 
          (!tx._appointmentId || !appointmentIds.has(String(tx._appointmentId)))
        );

        data = [...enrichedAppointments, ...orphans];
      } else {
        // Fetch from appointment_staff with calculated startDate limit
        let staffQuery = dataService.supabase
          .from('appointment_staff')
          .select(`
            id, staff_id, appointment_id, commission_earned, product_commission, tip_amount,
            appointments!inner (
              id, client_id, staff_id, service_id, status, total_price, scheduled_at, started_at, completed_at, created_at,
              clients(id, name, phone, id_card),
              services(name, price, included_items, commission_stylist, commission_stylist, commission_cashier, commission_receptionist),
              appointment_extras(id, price, service_extras(name)),
              appointment_products(id, quantity, price, inventory(id, name))
            )
          `)
          .eq('staff_id', user.id)
          .eq('appointments.status', 'Completado');

        if (startDate) {
          staffQuery = staffQuery.gte('appointments.created_at', startDate);
        }

        const { data: staffData, error } = await staffQuery;

        if (error) throw error;

        data = staffData.map(record => {
          const item = record.appointments;
          if (!item || item.service_id === null || item.service_id === undefined) return null;

          return {
            ...item,
            commission_earned: Number(record.commission_earned || 0),
            tip_amount: Number(record.tip_amount || 0),
            isStaffView: true
          };
        }).filter(Boolean);
      }

      // Sort by date (newest first)
      data.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast('Error al cargar historial', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id, dateRange]);

  const filteredHistory = history.filter(item => {
    const searchMatch = (item.clients?.name || '').toLowerCase().includes(filter.toLowerCase()) ||
                       (item.services?.name || '').toLowerCase().includes(filter.toLowerCase());
    if (!searchMatch) return false;
    if (dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return item.created_at?.startsWith(today);
    }
    if (dateRange === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return new Date(item.created_at) >= lastWeek;
    }
    return true;
  });

  const totalIncome = filteredHistory.reduce((acc, item) => {
    if (!isAdmin) return acc + (item.commission_earned || 0) + (item.tip_amount || 0);

    // Transaction records (CSV imports, manual entries)
    if (item._type === 'transaction') {
      if (item._txType === 'income') return acc + (item._amountUSD || 0);
      if (item._txType === 'expense') return acc - (item._amountUSD || 0);
      return acc;
    }

    // Admin: Sum everything including tips from appointment_staff
    const serviceBase = item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0 
      ? Number(item.total_price) 
      : Number(item.services?.price || 0);
    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
    const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
    const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
    return acc + serviceBase + extras + products + tips;
  }, 0);

  const renderExpandedDetails = (item) => {
    // Simplified view for imported transactions
    if (item._type === 'transaction') {
      const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
      return (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: isMobile ? '20px' : '32px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
            {/* Client Card */}
            <div className="glass-card animate-card-1" style={{
              padding: isMobile ? '16px' : '24px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderLeft: `4px solid ${item._txType === 'expense' ? '#f87171' : '#34d399'}`,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '20px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: item._txType === 'expense' ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)', color: item._txType === 'expense' ? '#f87171' : '#34d399', display: 'flex' }}>
                  <User size={16} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {item._txType === 'expense' ? 'Egreso' : 'Ingreso'} Manual
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile ? '12px' : '20px' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Cliente</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--pink-primary)' }}>{item.clients?.name || 'S/N'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Categoría</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{item._category || 'Sin categoría'}</span>
                </div>
              </div>
              {item._paymentMethod && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Método de Pago</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{item._paymentMethod}</span>
                </div>
              )}
            </div>
            {/* Service Card */}
            <div className="glass-card animate-card-2" style={{
              padding: isMobile ? '16px' : '24px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderLeft: '4px solid var(--pink-primary)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '20px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236,72,153,0.1)', color: 'var(--pink-primary)', display: 'flex' }}>
                  <Sparkles size={16} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Detalles de la Transacción
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Concepto</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{item.services?.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: item._txType === 'expense' ? '#f87171' : '#34d399', whiteSpace: 'nowrap' }}>
                    ${item._txType === 'expense' ? '-' : '+'}${formatCurrency(item._amountUSD)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>
                    Ref: {item._txType === 'expense' ? '-' : ''}{formatCurrency(item._totalBs)} Bs.
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* RIGHT COLUMN: Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-card animate-card-3" style={{
              padding: isMobile ? '16px' : '24px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(20,20,22,0.85) 0%, rgba(10,10,12,0.95) 100%)',
              border: '1px solid rgba(236,72,153,0.15)',
              boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236,72,153,0.1)', color: 'var(--pink-primary)', display: 'flex' }}>
                  <TrendingUp size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
                    Resumen
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    Tasa: {rate} Bs.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Monto USD</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>${formatCurrency(item._amountUSD)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '10px', background: item._txType === 'expense' ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Bs.</span>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: item._txType === 'expense' ? '#f87171' : '#34d399' }}>
                    {item._txType === 'expense' ? '-' : ''}{formatCurrency(item._totalBs)} Bs.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: isMobile ? '20px' : '32px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Client, Services and Extras */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
          
          {/* 1. Client Card */}
          <div className="glass-card animate-card-1" style={{
            padding: isMobile ? '16px' : '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: '4px solid var(--pink-primary)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '20px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236,72,153,0.1)', color: 'var(--pink-primary)', display: 'flex' }}>
                <User size={16} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Detalles del Cliente
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr', gap: isMobile ? '12px' : '20px' }}>
              <div 
                onClick={() => onNavigate('clients', { clientId: item.clients?.id })}
                className="client-link"
                style={{ cursor: 'pointer' }}
              >
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Nombre</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--pink-primary)', textDecoration: 'underline' }}>{item.clients?.name || 'Cliente sin registrar'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Cédula</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{item.clients?.id_card || 'No registrada'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Teléfono</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{item.clients?.phone || 'No registrado'}</span>
              </div>
            </div>
          </div>

          {/* 2. Service and Extras Card */}
          <div className="glass-card animate-card-2" style={{
            padding: isMobile ? '16px' : '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: '4px solid var(--pink-primary)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isMobile ? '14px' : '20px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236,72,153,0.1)', color: 'var(--pink-primary)', display: 'flex' }}>
                <Sparkles size={16} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Servicio y Extras Realizados
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                gap: '8px',
                paddingBottom: '12px', 
                borderBottom: '1px dashed rgba(255,255,255,0.08)' 
              }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Servicio Principal</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{item.services?.name}</span>
                </div>
                {user.role !== 'Asistente de Tratamiento' && (
                  <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                      ${formatCurrency(item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0 ? Number(item.total_price) : Number(item.services?.price || 0))}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '750' }}>
                      Ref: {formatCurrency((item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0 ? Number(item.total_price) : Number(item.services?.price || 0)) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Extras, Adicionales y Productos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {item.appointment_extras?.map(ex => (
                    <div key={ex.id} style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      gap: isMobile ? '4px' : '12px',
                      fontSize: '13px', 
                      background: 'rgba(255,255,255,0.01)', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255,255,255,0.04)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--pink-primary)', background: 'rgba(236,72,153,0.1)', borderRadius: '4px', padding: '2px 4px' }}>EXTRA</span>
                        <span style={{ color: 'white', fontWeight: '700' }}>{ex.service_extras?.name}</span>
                      </div>
                      <span style={{ fontWeight: '800', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                        +${ex.price} (Ref: +{formatCurrency(Number(ex.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.)
                      </span>
                    </div>
                  ))}
                  {item.appointment_products?.map(pr => (
                    <div key={pr.id} style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      gap: isMobile ? '4px' : '12px',
                      fontSize: '13px', 
                      background: 'rgba(255,255,255,0.01)', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(255,255,255,0.04)' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '8px', fontWeight: '900', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', borderRadius: '4px', padding: '2px 4px' }}>PRODUCTO</span>
                        <span style={{ color: 'white', fontWeight: '700' }}>{pr.inventory?.name} <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>({pr.quantity}u)</span></span>
                      </div>
                      <span style={{ fontWeight: '800', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                        +${pr.price} (Ref: +{formatCurrency(Number(pr.price) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.)
                      </span>
                    </div>
                  ))}
                  {(!item.appointment_extras?.length && !item.appointment_products?.length) && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ninguno adicional registrado</div>
                  )}
                </div>
              </div>

              {/* Total Propinas */}
              {(() => {
                const totalTips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
                if (totalTips > 0) {
                  const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                  return (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Propinas Recibidas</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>Total Propinas ({item.appointment_staff?.filter(s => Number(s.tip_amount) > 0).length} pers.)</span>
                        <span style={{ fontWeight: '700', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                          +${formatCurrency(totalTips)} (Ref: +{formatCurrency(totalTips * rate)} Bs.)
                        </span>
                      </div>
                    </div>
                  )
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Receipt, Settlements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 3. Ticket Card */}
          <div className="glass-card animate-card-3" style={{
            padding: isMobile ? '16px' : '24px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(20,20,22,0.85) 0%, rgba(10,10,12,0.95) 100%)',
            border: '1px solid rgba(236,72,153,0.15)',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)'
          }}>
            {/* Ticket Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236,72,153,0.1)', color: 'var(--pink-primary)', display: 'flex' }}>
                <TrendingUp size={16} />
              </div>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
                  Liquidación de Caja
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  Tasa de cambio: {item.exchange_rate || rates?.bcv || rates?.usd || 550} Bs.
                </span>
              </div>
            </div>

            {/* Detalle Cobrado */}
            {user.role !== 'Asistente de Tratamiento' && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>Conceptos cobrados</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(() => {
                    const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                    const servicePrice = item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0
                      ? Number(item.total_price)
                      : Number(item.services?.price || 0);
                    const receiptLines = [
                      { label: item.services?.name || 'Servicio', type: 'Servicio', amount: servicePrice }
                    ];
                    item.appointment_extras?.forEach(ex => {
                      receiptLines.push({
                        label: ex.service_extras?.name || 'Extra',
                        type: 'Extra',
                        amount: Number(ex.price || 0)
                      });
                    });
                    item.appointment_products?.forEach(pr => {
                      const quantity = Number(pr.quantity || 1);
                      receiptLines.push({
                        label: `${pr.inventory?.name || 'Prod'} x${quantity}`,
                        type: 'Producto',
                        amount: Number(pr.price || 0) * quantity
                      });
                    });
                    item.appointment_staff?.forEach(st => {
                      const tip = Number(st.tip_amount || 0);
                      if (tip > 0) {
                        receiptLines.push({
                          label: `Propina ${st.staff?.name.split(' ')[0]}`,
                          type: 'Propina',
                          amount: tip,
                          isTip: true
                        });
                      }
                    });

                    const totalReceipt = receiptLines.reduce((sum, line) => sum + line.amount, 0);

                    return (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {receiptLines.map((line, idx) => (
                            <ReceiptLine key={`${line.type}-${idx}`} line={line} rate={rate} formatCurrency={formatCurrency} />
                          ))}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                          <span style={{ fontSize: '12px', color: 'white', fontWeight: '900', letterSpacing: '0.5px' }}>TOTAL COBRADO</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                              ${formatCurrency(totalReceipt)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', whiteSpace: 'nowrap' }}>
                              Ref: {formatCurrency(item._totalBsOverride || (totalReceipt * rate))} Bs.
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Totales de Liquidacion */}
            {isAdmin ? (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Distribución de Fondos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {item.appointment_staff?.length > 0 ? item.appointment_staff.map((st, sidx) => {
                    const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                    const commission = Number(st.commission_earned || 0);
                    const tip = Number(st.tip_amount || 0);
                    const staffTotal = commission + tip;
                    const firstName = (st.staff?.name || 'Personal').split(' ')[0];
                    return (
                      <div key={sidx} style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>Total {firstName}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                              +${formatCurrency(staffTotal)}
                            </span>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                              Ref: +{formatCurrency(staffTotal * rate)} Bs.
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '8px', padding: '6px' }}>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Comisión</div>
                            <div style={{ fontSize: '10.5px', color: 'white', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {formatCurrency(commission * rate)} Bs.
                            </div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '8px', padding: '6px' }}>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Propina</div>
                            <div style={{ fontSize: '10.5px', color: 'white', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap' }}>
                              {formatCurrency(tip * rate)} Bs.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No hay personal registrado en esta venta.</div>
                  )}

                  {/* Jana Net Profit */}
                  {(() => {
                    const serviceBase = item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0
                      ? Number(item.total_price)
                      : Number(item.services?.price || 0);
                    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                    const products = item.appointment_products?.reduce((sum, pr) => sum + (Number(pr.price || 0) * (pr.quantity || 1)), 0) || 0;
                    const totalVenta = serviceBase + extras + products;
                    const commissions = item.appointment_staff?.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0) || 0;
                    const janaProfit = totalVenta - commissions;
                    const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);

                    return (
                      <div style={{ marginTop: '8px', padding: '14px', borderRadius: '16px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.18)', boxShadow: 'inset 0 0 12px rgba(236,72,153,0.05)' }}>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: isMobile ? 'column' : 'row', 
                          justifyContent: 'space-between', 
                          alignItems: isMobile ? 'flex-start' : 'center', 
                          gap: '8px' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pink-primary)' }} />
                            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '0.5px' }}>Total Jana (Neto)</span>
                          </div>
                          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: '950', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                              +${formatCurrency(janaProfit)}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '800', whiteSpace: 'nowrap' }}>
                              Ref: +{formatCurrency(janaProfit * rate)} Bs.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* Staff view */
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>Tu Liquidación</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                      {user.role === 'Asistente de Tratamiento' ? 'Tarifa de Tratamiento' : 'Tu Comisión'}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'white', whiteSpace: 'nowrap' }}>
                        ${formatCurrency(item.commission_earned || 0)}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                        Ref: {formatCurrency((item.commission_earned || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(236,72,153,0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(236,72,153,0.1)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--pink-primary)', fontWeight: '900' }}>Tu Propina</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                        +${formatCurrency(item.tip_amount || 0)}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '750', whiteSpace: 'nowrap' }}>
                        Ref: +{formatCurrency((item.tip_amount || 0) * Number(item.exchange_rate || rates?.bcv || rates?.usd || 550))} Bs.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>



        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      <header className="animate-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 className="jana-page-title">
            {isAdmin ? 'Historial' : 'Mi Historial'} Jana
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isAdmin ? 'Registro completo de servicios y transacciones.' : 'Consulta tus servicios realizados y propinas.'}
          </p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: '12px' }}>
             <div className="glass-card" style={{ padding: '12px 24px', borderRadius: '16px', textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {isAdmin ? 'VENTAS FILTRADAS' : 'MIS GANANCIAS'}
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--pink-primary)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span>${formatCurrency(totalIncome)}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
                    Ref: {formatCurrency(totalIncome * (rates?.bcv || rates?.usd || 550))} Bs.
                  </span>
                </div>
             </div>
          </div>
        )}
      </header>

      {/* Filters Bar */}
      <div className="glass-card animate-slide-up" style={{ padding: '16px', borderRadius: '20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
          <input 
            className="form-input" 
            placeholder="Buscar por cliente o servicio..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '100%', height: '48px', paddingLeft: '48px', borderRadius: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'today', 'week'].map(range => (
            <button 
              key={range}
              onClick={() => setDateRange(range)}
              style={{ 
                padding: '10px 16px', 
                borderRadius: '10px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: dateRange === range ? 'var(--pink-primary)' : 'transparent', 
                color: dateRange === range ? 'black' : 'white', 
                fontWeight: '700', 
                fontSize: '13px', 
                cursor: 'pointer'
              }}
            >
              {range === 'all' ? 'Todo' : range === 'today' ? 'Hoy' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--pink-primary)" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="glass-card" style={{ padding: '80px', textAlign: 'center', borderRadius: '32px', opacity: 0.5 }}>
          <History size={48} style={{ margin: '0 auto 20px', color: 'var(--text-muted)' }} />
          <h3>No hay registros</h3>
          <p>No se encontraron servicios que coincidan con los filtros.</p>
        </div>
      ) : isMobile ? (
        /* Mobile Card List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredHistory.map(item => {
            const isSelected = selectedId === item.id;
            const isTx = item._type === 'transaction';

            // Calculate total/gain amount
            let val = 0;
            if (isTx) {
              val = item._amountUSD || 0;
            } else if (!isAdmin) {
              val = ((item.commission_earned || 0) + (item.tip_amount || 0));
            } else {
              const serviceBase = item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0
                ? Number(item.total_price)
                : Number(item.services?.price || 0);
              const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
              const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
              const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
              val = (serviceBase + extras + products + tips);
            }
            const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
            const finalBs = item._totalBsOverride !== undefined && item._totalBsOverride !== null 
               ? item._totalBsOverride 
               : val * rate;

            return (
              <div 
                key={item.id} 
                className="glass-card animate-slide-up"
                style={{
                  padding: '16px',
                  borderRadius: '20px',
                  background: isSelected ? 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(28,28,30,0.98) 100%)' : 'rgba(28, 28, 30, 0.98)',
                  border: isSelected ? '1px solid rgba(236,72,153,0.25)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isSelected ? '0 8px 32px 0 rgba(236,72,153,0.05)' : '0 4px 16px 0 rgba(0,0,0,0.25)'
                }}
              >
                {/* Clickable Header Area */}
                <div 
                  onClick={() => setSelectedId(isSelected ? null : item.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>
                        {new Date(item.created_at).toLocaleDateString([], {day: '2-digit', month: 'numeric'})}
                      </span>
                      {isTx && (
                        <span style={{ fontSize: '9px', fontWeight: '900', color: item._txType === 'expense' ? '#f87171' : '#34d399', background: item._txType === 'expense' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {item._txType === 'expense' ? 'Egreso' : 'Ingreso'}
                        </span>
                      )}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('clients', { clientId: item.clients?.id });
                        }}
                        style={{ fontSize: '14px', fontWeight: '850', color: 'white', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {item.clients?.name || 'Cliente sin registrar'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                      {item.services?.name || 'Servicio'}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                        ${formatCurrency(val)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', whiteSpace: 'nowrap' }}>
                        Ref: {formatCurrency(finalBs)} Bs.
                      </div>
                    </div>
                    <div style={{ color: isSelected ? 'var(--pink-primary)' : 'var(--text-muted)', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)' }}>
                      <ChevronDown size={15} />
                    </div>
                  </div>
                </div>

                {/* Expanded Details Area */}
                {isSelected && (
                  <div className="animate-history-expand" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                    {renderExpandedDetails(item)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="glass-card animate-slide-up" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio</th>
                  <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>{isAdmin ? 'Total' : 'Ganancia'}</th>
                  <th style={{ padding: '20px 24px', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => {
                  const isSelected = selectedId === item.id;
                  const isTx = item._type === 'transaction';

                  // Calculate total/gain amount
                  let val = 0;
                  if (isTx) {
                    val = item._amountUSD || 0;
                  } else if (!isAdmin) {
                    val = ((item.commission_earned || 0) + (item.tip_amount || 0));
                  } else {
                    const serviceBase = item.total_price !== undefined && item.total_price !== null && Number(item.total_price) > 0
                      ? Number(item.total_price)
                      : Number(item.services?.price || 0);
                    const extras = item.appointment_extras?.reduce((sum, e) => sum + Number(e.price || 0), 0) || 0;
                    const products = item.appointment_products?.reduce((sum, p) => sum + (Number(p.price || 0) * (p.quantity || 1)), 0) || 0;
                    const tips = item.appointment_staff?.reduce((sum, s) => sum + Number(s.tip_amount || 0), 0) || 0;
                    val = (serviceBase + extras + products + tips);
                  }
                  const rate = Number(item.exchange_rate || rates?.bcv || rates?.usd || 550);
                  const finalBs = item._totalBsOverride !== undefined && item._totalBsOverride !== null 
                    ? item._totalBsOverride 
                    : val * rate;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                        className="history-table-row"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(236,72,153,0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {new Date(item.created_at).toLocaleDateString([], {day: '2-digit', month: 'numeric'})}
                            {isTx && (
                              <span style={{ fontSize: '9px', fontWeight: '900', color: item._txType === 'expense' ? '#f87171' : '#34d399', background: item._txType === 'expense' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {item._txType === 'expense' ? 'Egreso' : 'Ingreso'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('clients', { clientId: item.clients?.id });
                            }}
                            className="client-link"
                            style={{ fontSize: '15px', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'inline-block' }}
                          >
                            {item.clients?.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.clients?.id_card}</div>
                        </td>
                        <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                          {item.services?.name}
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '850', color: 'var(--pink-primary)' }}>
                            ${formatCurrency(val)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                            Ref: {formatCurrency(finalBs)} Bs.
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ color: isSelected ? 'var(--pink-primary)' : 'var(--text-muted)', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)' }}>
                            <ChevronDown size={18} />
                          </div>
                        </td>
                      </tr>
                      {isSelected && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                          <td colSpan="5" style={{ padding: '0' }}>
                            <div className="animate-history-expand" style={{ padding: '32px 40px' }}>
                              {renderExpandedDetails(item)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .history-table-row:hover {
          background-color: rgba(255,255,255,0.03) !important;
        }
        .client-link:hover {
          color: var(--pink-primary) !important;
        }
        .glass-card {
          transition: none !important;
        }
        .glass-card:hover {
          transform: none !important;
        }
        @keyframes historyExpand {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-history-expand {
          animation: historyExpand 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          transform-origin: top;
        }
        @keyframes cardPopIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-1 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.04s;
        }
        .animate-card-2 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.1s;
        }
        .animate-card-3 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.16s;
        }
        .animate-card-4 {
          animation: cardPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.22s;
        }
      `}</style>
    </div>
  );
};

const SectionHeader = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
    <div style={{ color: 'var(--pink-primary)' }}>{icon}</div>
    <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</div>
  </div>
);

const MiniBreakdown = ({ label, amount, rate, formatCurrency }) => (
  <div style={{ background: 'rgba(0,0,0,0.16)', borderRadius: '10px', padding: '8px' }}>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800' }}>
      ${formatCurrency(Number(amount || 0))}
    </div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
      Ref: {formatCurrency(Number(amount || 0) * rate)} Bs.
    </div>
  </div>
);

const ReceiptLine = ({ line, rate, formatCurrency }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', padding: '9px 0', borderBottom: '1px dashed rgba(255,255,255,0.07)' }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span style={{ fontSize: '9px', fontWeight: '900', color: line.isTip ? 'var(--pink-primary)' : 'var(--text-muted)', textTransform: 'uppercase', background: line.isTip ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '3px 6px', flexShrink: 0 }}>
          {line.type}
        </span>
        <span style={{ fontSize: '12px', fontWeight: '800', color: 'white', whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {line.label}
        </span>
      </div>
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: '900', color: line.isTip ? 'var(--pink-primary)' : 'white', whiteSpace: 'nowrap' }}>
        {line.isTip ? '+' : ''}${formatCurrency(Number(line.amount || 0))}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px', whiteSpace: 'nowrap' }}>
        Ref: {line.isTip ? '+' : ''}{formatCurrency(Number(line.amount || 0) * rate)} Bs.
      </div>
    </div>
  </div>
);

const DetailItem = ({ label, value, subValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{value}</span>
      {subValue && <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--pink-primary)' }}>{subValue}</span>}
    </div>
  </div>
);

export default HistoryModule;
