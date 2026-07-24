import React, { useState, useEffect } from 'react';
import goldChairImg from '../assets/gold_chair.png';
import { 
  Wallet, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  RefreshCcw, 
  Plus, 
  Minus, 
  CheckCircle,
  CreditCard,
  History,
  TrendingUp,
  User,
  Zap,
  Droplets,
  Edit3,
  XCircle,
  Sparkles,
  Flame,
  Eye,
  Smile,
  RefreshCw,
  Wind,
  Clock
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import JanaSelect from './JanaSelect';
import { notificationService } from '../services/notificationService';
import JanaDialog from './JanaDialog';
import NewClientModal from './NewClientModal';
import { UserPlus, ChevronDown, VenetianMask, Ear, ScanFace, ShowerHead, Waves } from 'lucide-react';
import { ModalShield, useModal } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import { normalizeForSearch } from '../utils/stringUtils';
import { useScrollLock } from '../hooks/useScrollLock';
import offlineService from '../services/offlineService';
import { selectPayableAppointments } from '../domain/checkoutRules';

const CartSellerSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative', marginLeft: '8px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          color: 'var(--pink-primary)',
          fontSize: '11px',
          fontWeight: '800',
          borderRadius: '10px',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          whiteSpace: 'nowrap',
          minWidth: '105px',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 2px rgba(212,160,154,0.2)' : 'none'
        }}
      >
        <span>{selected ? selected.label : '+ Vendedor'}</span>
        <ChevronDown size={14} strokeWidth={3} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: '#1c1c1e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          zIndex: 9999,
          minWidth: '120px',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div 
            onClick={() => { onChange(''); setIsOpen(false); }}
            style={{ padding: '10px 14px', fontSize: '11px', color: !value ? 'var(--pink-primary)' : 'white', cursor: 'pointer', background: !value ? 'rgba(212,160,154,0.1)' : 'transparent', fontWeight: !value ? '800' : '500', transition: '0.2s' }}
            onMouseEnter={e => { if(value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if(value) e.currentTarget.style.background = 'transparent' }}
          >
            + Vendedor
          </div>
          {options.map(opt => (
            <div 
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{ padding: '10px 14px', fontSize: '11px', color: value === opt.value ? 'var(--pink-primary)' : 'white', cursor: 'pointer', background: value === opt.value ? 'rgba(212,160,154,0.1)' : 'transparent', fontWeight: value === opt.value ? '800' : '500', transition: '0.2s' }}
              onMouseEnter={e => { if(value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if(value !== opt.value) e.currentTarget.style.background = 'transparent' }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
const CheckoutPOS = ({ isMobile, rates, initialAppointmentId, embedded = false, onNavigate }) => {
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const [pendingServices, setPendingServices] = useState([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const checkoutSubmissionRef = React.useRef(false);

  useEffect(() => {
    offlineService.initOfflineService();
    const unsubscribe = offlineService.subscribeToQueue((count) => {
      setPendingSyncCount(count);
    });
    return () => unsubscribe();
  }, []);
  const [inventory, setInventory] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isExpressService, setIsExpressService] = useState(true);
  const [isDirectSale, setIsDirectSale] = useState(false);
  const [idSearch, setIdSearch] = useState('');
  const [directSaleIdSearch, setDirectSaleIdSearch] = useState('');
  const [directSaleSearchResults, setDirectSaleSearchResults] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const { isModalOpen } = useModal();
  
  // Checkout Multi-State
  const [fixedRate, setFixedRate] = useState(rates?.usd || 0);
  const [tips, setTips] = useState([]); // Array of { id, staffId, amount }
  const [cart, setCart] = useState([]); // Sold products
  const [itemSalesAssociations, setItemSalesAssociations] = useState({}); // { itemId: staffId }
  const [paymentMode, setPaymentMode] = useState('full_bs'); // or 'mixed', 'financed'
  const [packageSales, setPackageSales] = useState({}); // { appointmentId: boolean }
  const [initialPaymentUsd, setInitialPaymentUsd] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState('Efectivo');
  const [cashUsd, setCashUsd] = useState(0);
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  const [selectedTreatmentStaffId, setSelectedTreatmentStaffId] = useState('');
  const [isTreatmentStaffDropdownOpen, setIsTreatmentStaffDropdownOpen] = useState(false);
  const [openTipDropdownId, setOpenTipDropdownId] = useState(null);
  const [treatmentCount, setTreatmentCount] = useState(0);
  const [recurrenceChoice, setRecurrenceChoice] = useState('');
  const [customRecurrenceDays, setCustomRecurrenceDays] = useState('');
  const [bundledApps, setBundledApps] = useState([]);
  const [linkedApps, setLinkedApps] = useState([]);
  const [totalAppsInCheckout, setTotalAppsInCheckout] = useState([]);
  const [activePackages, setActivePackages] = useState([]);
  const [packageConsumptions, setPackageConsumptions] = useState({});

  useEffect(() => {
    const currentClientId = selectedApp?.client_id || selectedClient?.id;
    if (currentClientId) {
      dataService.getClientPackages(currentClientId).then(pkgs => {
        setActivePackages((pkgs || []).filter(p => p.status === 'active' && (p.total_sessions - p.used_sessions) > 0));
      }).catch(err => console.error("Error loading packages for POS client:", err));
    } else {
      setActivePackages([]);
    }
    setPackageConsumptions({});
  }, [selectedApp?.client_id, selectedClient?.id]);

  // Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showStylistModal, setShowStylistModal] = useState(false);
  const [selectedServiceForStylist, setSelectedServiceForStylist] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog State
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [isChangingStylist, setIsChangingStylist] = useState(false);
  const [editingAppPrice, setEditingAppPrice] = useState(null);
  const [newAppPriceVal, setNewAppPriceVal] = useState('');

  const handleUpdateExtraPrice = async (extraId, newPriceBs) => {
    try {
      setLoading(true);
      const priceBs = parseFloat(newPriceBs) || 0;
      const priceUsd = fixedRate > 0 ? (priceBs / fixedRate) : 0;
      await dataService.updateAppointmentExtraPrice(extraId, priceUsd);
      showToast("Precio actualizado");
      const filtered = await loadData();
      if (selectedApp) {
        const updatedSelected = filtered.find(a => a.id === selectedApp.id);
        setSelectedApp(updatedSelected);
      }
    } catch (e) {
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
      setEditingExtraPriceId(null);
    }
  };
  const handleSaveServicePrice = async () => {
    if (!editingAppPrice) return;
    try {
      setLoading(true);
      const newPriceBs = parseFloat(newAppPriceVal) || 0;
      const newPriceUsd = fixedRate > 0 ? (newPriceBs / fixedRate) : 0;
      await dataService.updateAppointment(editingAppPrice.id, { total_price: newPriceUsd });
      showToast("Precio del servicio actualizado");
      const filtered = await loadData();
      
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
      
      setEditingAppPrice(null);
    } catch (e) {
      console.error(e);
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (rates?.usd) setFixedRate(rates.usd);
  }, [rates?.usd, rates?.bcv, rates?.usdt]);

  useEffect(() => {
    if (selectedApp) {
      setBundledApps(selectPayableAppointments(selectedApp, pendingServices));
    } else {
      setBundledApps([]);
    }
  }, [selectedApp, pendingServices]);

  useEffect(() => {
    setLinkedApps([]);
  }, [selectedApp]);

  useEffect(() => {
    const uniquePayableApps = new Map();
    [...bundledApps, ...linkedApps].forEach((appointment) => {
      if (appointment?.id && appointment.status === 'Por Pagar') {
        uniquePayableApps.set(appointment.id, appointment);
      }
    });
    setTotalAppsInCheckout([...uniquePayableApps.values()]);
  }, [bundledApps, linkedApps]);

  useEffect(() => {
    if (totalAppsInCheckout.length > 0) {
      // 1. Merge products
      const mergedProducts = [];
      totalAppsInCheckout.forEach(app => {
        app.appointment_products?.forEach(ap => {
          const exists = mergedProducts.find(p => p.id === ap.inventory?.id);
          if (exists) {
            exists.quantity += ap.quantity;
            if (ap.id) exists.dbIds.push(ap.id);
          } else {
            mergedProducts.push({
              id: ap.inventory?.id,
              name: ap.inventory?.name,
              price: ap.price,
              quantity: ap.quantity,
              commission_pct: ap.inventory?.commission_pct,
              dbIds: ap.id ? [ap.id] : []
            });
          }
        });
      });
      setCart(mergedProducts);

      // 2. Initialize tips for all unique staff in the bundle, preserving existing values
      const uniqueStaffIds = Array.from(new Set(totalAppsInCheckout.flatMap(app => (
        app.appointment_services?.length
          ? app.appointment_services.map(service => service.staff_id)
          : [app.staff_id]
      )).filter(Boolean)));
      setTips(prevTips => {
        const existingMap = {};
        prevTips.forEach(t => {
          if (t.staffId) existingMap[t.staffId] = t;
        });

        const newTips = uniqueStaffIds.map((staffId, idx) => {
          const existing = existingMap[staffId];
          if (existing) {
            return existing;
          }
          return {
            id: (Date.now() + idx).toString(),
            staffId: staffId,
            amount: 0,
            currency: 'USD'
          };
        });

        // Preservar propinas agregadas manualmente para staff que no sea el principal de las citas
        prevTips.forEach(t => {
          if (t.staffId && !uniqueStaffIds.includes(t.staffId)) {
            newTips.push(t);
          }
        });

        return newTips;
      });

      // 3. Auto-detect washing count
      const treatmentEligibleCount = totalAppsInCheckout.filter(app => 
        app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || 
        app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('tratamiento'))
      ).length;
      setTreatmentCount(treatmentEligibleCount);
      
      // Check if there is already a treatmentStaff associated in database
      const existingTreatmentStaffRecord = totalAppsInCheckout
        .flatMap(a => a.appointment_staff || [])
        .find(as => as.staff?.role?.toLowerCase().includes('estilista'));

      let currentTreatmentStaffId = '';
      if (existingTreatmentStaffRecord) {
        currentTreatmentStaffId = existingTreatmentStaffRecord.staff_id;
      } else {
        // Default wash assistant selection (ONLY if exactly one is available)
        const treatmentStaffArr = allStaff.filter(s => s.role?.toLowerCase().includes('estilista'));
        if (treatmentStaffArr.length === 1) {
          currentTreatmentStaffId = treatmentStaffArr[0].id;
        }
      }

      // Use functional update to avoid needing selectedTreatmentStaffId in deps
      setSelectedTreatmentStaffId(prev => prev !== currentTreatmentStaffId ? currentTreatmentStaffId : prev);

      // 4. Initialize item sales associations intelligently
      // Use functional update to avoid needing itemSalesAssociations in deps
      const finalTreatmentStaffId = currentTreatmentStaffId;
      setItemSalesAssociations(prev => {
        const newAssociations = { ...prev };
        let changed = false;

        totalAppsInCheckout.forEach(app => {
          // Products default association
          app.appointment_products?.forEach(ap => {
            const itemId = ap.inventory?.id;
            if (itemId && !newAssociations[itemId]) {
              newAssociations[itemId] = app.staff_id || '';
              changed = true;
            }
          });

          // Extras default association
          app.appointment_extras?.forEach(ex => {
            const itemId = ex.id;
            if (itemId && !newAssociations[itemId]) {
              const isWashExtra = ex.service_extras?.name?.toLowerCase().includes('tratamiento');
              if (isWashExtra && finalTreatmentStaffId) {
                newAssociations[itemId] = finalTreatmentStaffId;
              } else {
                newAssociations[itemId] = app.staff_id || '';
              }
              changed = true;
            }
          });
        });

        return changed ? newAssociations : prev;
      });
    } else if (!selectedApp && !isDirectSale) {
      setCart([]);
      setTips([]);
      setTreatmentCount(0);
      setSelectedTreatmentStaffId(prev => prev === '' ? prev : '');
      setItemSalesAssociations(prev => Object.keys(prev).length === 0 ? prev : {});
    }
  }, [totalAppsInCheckout, isDirectSale, allStaff, selectedApp]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, inv, ext, cls, staff, srv, promo] = await Promise.all([
        dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Tratamiento']),
        dataService.getSaleInventoryCatalog(),
        dataService.getExtras(),
        dataService.getClientsLite(),
        dataService.getStaff(),
        dataService.getServices(),
        dataService.getPromotions({ includeInactive: false })
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const filtered = (apps || []).filter(a => 
        a.status !== 'Agendado' || 
        (a.scheduled_at?.startsWith(today) || a.created_at?.startsWith(today))
      );

      setPendingServices(filtered);
      setSelectedApp(current => current
        ? (filtered.find(app => String(app.id) === String(current.id)) || null)
        : null
      );
      setInventory((inv || []).filter(i => i.category === 'Venta'));
      setAllExtras(ext?.filter(e => e.name !== 'SYSTEM_CONFIG_RATES') || []);
      setAllServices(srv || []);
      setPromotions(promo || []);
      setAllClients(cls || []);
      setAllStaff(staff || []);
      return filtered;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let refreshTimer;
    const refreshOperationalData = () => {
      dataService.invalidateOperationalCache();
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadData(), 300);
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
  }, []);

  useEffect(() => {
    if (!initialAppointmentId || selectedApp) return;
    const requestedAppointment = pendingServices.find(
      (appointment) => String(appointment.id) === String(initialAppointmentId)
    );
    if (requestedAppointment) setSelectedApp(requestedAppointment);
  }, [initialAppointmentId, pendingServices, selectedApp]);

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en silla.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGroupAppointments = async (apps) => {
    try {
      setLoading(true);
      for (const app of apps) {
        await dataService.updateAppointmentStatus(app.id, 'En Silla');
      }
      showToast("¡Servicios iniciados! El cliente ya está en silla.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicios", "error");
    } finally {
      setLoading(false);
    }
  };

  const servicePrice = totalAppsInCheckout.reduce((acc, app) => {
    if (packageConsumptions[app.id]) return acc;
    return acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0));
  }, 0);
  const productsTotal = cart.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const extrasTotal = totalAppsInCheckout.reduce((acc, app) => acc + (app.appointment_extras?.reduce((subAcc, e) => subAcc + (e.price || 0), 0) || 0), 0);
  const totalTips = tips.reduce((acc, t) => {
    const isBs = t.currency === 'BS';
    const amountVal = Number(t.amount || 0);
    const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
    return acc + usdVal;
  }, 0);
  const eligiblePromotions = promotions.filter(p => totalAppsInCheckout.some(app => {
    const service = allServices.find(s => s.id === app.service_id) || app.services || {};
    return p.scope === 'all' || (p.scope === 'service' && p.service_id === app.service_id) || (p.scope === 'category' && p.category === service.category);
  }));
  const appliedPromotion = eligiblePromotions.map(p => ({ ...p, calculated: p.discount_type === 'percent' ? servicePrice * Number(p.discount_value) / 100 : Number(p.discount_value) })).sort((a,b)=>b.calculated-a.calculated)[0] || null;
  const promotionDiscount = Math.min(servicePrice, Number(appliedPromotion?.calculated || 0));
  const totalBeforeDiscount = servicePrice + productsTotal + extrasTotal + totalTips;
  const totalUsd = Math.max(0, totalBeforeDiscount - promotionDiscount);
  const totalBs = (totalUsd * fixedRate).toFixed(2);
  
  const remainingBs = Math.max(0, (totalUsd - Number(cashUsd)) * fixedRate).toFixed(2);
  const checkoutClient = selectedApp?.clients || selectedClient;
  const checkoutHasService = totalAppsInCheckout.some(app => app.service_id !== null && app.service_id !== undefined);
  const hasConfiguredRecurrence = Boolean(
    checkoutClient?.recurrence_enabled && Number(checkoutClient?.recurrence_days) > 0
  );
  const recurrenceDaysToSave = recurrenceChoice === 'custom'
    ? Number(customRecurrenceDays)
    : Number(recurrenceChoice || 0);

  useEffect(() => {
    setRecurrenceChoice('');
    setCustomRecurrenceDays('');
  }, [checkoutClient?.id]);

  const treatmentEligibleCount = totalAppsInCheckout.filter(app => 
    app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || 
    app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('tratamiento'))
  ).length;

  const didTreatment = treatmentCount > 0;

  const handleAddToCart = async (product) => {
    if (loading) return;
    if (!selectedApp) {
      const exists = cart.find(p => p.id === product.id);
      if (exists) {
        setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      } else {
        setCart([...cart, {...product, quantity: 1}]);
      }
      showToast(`${product.name} añadido`);
      return;
    }

    try {
      setLoading(true);
      // Check if product already exists in selectedApp's products
      const existingProductRecord = selectedApp.appointment_products?.find(
        ap => ap.inventory?.id === product.id
      );

      if (existingProductRecord) {
        await dataService.updateAppointmentProductQuantity(
          existingProductRecord.id,
          (existingProductRecord.quantity || 0) + 1
        );
      } else {
        await dataService.addProductToAppointment(
          selectedApp.id,
          product.id,
          1,
          product.price
        );
      }

      showToast(`${product.name} añadido a la cuenta.`);
      const filtered = await loadData();
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al añadir producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (product) => {
    if (!selectedApp) {
      setCart(cart.filter(item => item.id !== product.id));
      showToast("Producto eliminado del carrito");
      return;
    }

    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        for (const dbId of product.dbIds) {
          await dataService.removeProductFromAppointment(dbId);
        }
      }
      showToast(`${product.name} eliminado de la cuenta.`);
      const filtered = await loadData();
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementProduct = async (product) => {
    if (!selectedApp) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      return;
    }
    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        const record = selectedApp.appointment_products?.find(ap => ap.id === product.dbIds[0]);
        if (record) {
          await dataService.updateAppointmentProductQuantity(record.id, (record.quantity || 0) + 1);
        }
      }
      const filtered = await loadData();
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al incrementar cantidad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrementProduct = async (product) => {
    if (product.quantity <= 1) {
      handleRemoveProduct(product);
      return;
    }
    if (!selectedApp) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity - 1} : p));
      return;
    }
    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        const record = selectedApp.appointment_products?.find(ap => ap.id === product.dbIds[0]);
        if (record) {
          await dataService.updateAppointmentProductQuantity(record.id, (record.quantity || 0) - 1);
        }
      }
      const filtered = await loadData();
      const updatedSelected = filtered.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al disminuir cantidad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExtra = async (extra) => {
    if (loading) return;
    if (!selectedApp) {
      setCart([...cart, { id: 'extra_' + extra.id, name: extra.name, price: extra.price, quantity: 1, type: 'extra' }]);
      showToast(`${extra.name} añadido al carrito`);
      setShowExtraModal(false);
      return;
    }
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(selectedApp.id, null, extra.id, extra.price);
      showToast(`${extra.name} añadido a la cuenta.`);
      const filtered = await loadData();
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExtra = async (extraId) => {
    try {
      setLoading(true);
      await dataService.removeExtraFromAppointment(extraId);
      showToast("Extra eliminado.");
      const filtered = await loadData();
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al eliminar extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkApp = (appId) => {
    setLinkedApps(linkedApps.filter(a => a.id !== appId));
    showToast("Cita desenlazada de la cuenta.");
  };

  const handleCancelOrder = () => {
    // In direct sale mode there are no appointments — just reset and close panel
    if (isDirectSale) {
      setIsDirectSale(false);
      setSelectedClient(null);
      setSelectedApp(null);
      setCart([]);
      setTips([]);
      setCashUsd(0);
      setPaymentMode('full_bs');
      setDirectSaleIdSearch('');
      setDirectSaleSearchResults([]);
      showToast('Venta directa cancelada', 'info');
      return;
    }

    if (totalAppsInCheckout.length === 0) return;
    
    setDialog({
      isOpen: true,
      title: "Cancelar Orden",
      message: `¿Seguro que deseas cancelar toda la orden de este cliente? Se marcarán los servicios como 'Cancelado'.`,
      type: "confirm",
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          
          for (const app of totalAppsInCheckout) {
            await dataService.updateAppointmentStatus(app.id, 'Cancelado');
          }
          
          showToast("Orden cancelada correctamente", "success");
          setSelectedApp(null);
          setSelectedClient(null);
          await loadData();
        } catch (e) {
          console.error(e);
          showToast("Error al cancelar la orden", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleProcessCheckout = async () => {
    if (loading || checkoutSubmissionRef.current) return;
    if (!selectedApp && !selectedClient) {
      showToast("Selecciona un cliente para la venta directa", "warning");
      return;
    }
    if (!selectedApp && cart.length === 0) {
      showToast("Agrega al menos un producto al carrito", "warning");
      return;
    }
    if (recurrenceChoice === 'custom' && (!Number.isInteger(recurrenceDaysToSave) || recurrenceDaysToSave < 1 || recurrenceDaysToSave > 365)) {
      showToast("La recurrencia personalizada debe ser de 1 a 365 dias", "warning");
      return;
    }

    try {
      checkoutSubmissionRef.current = true;
      setLoading(true);
      
      const checkoutAppointments = totalAppsInCheckout.filter(app =>
        (app.service_id !== null && app.service_id !== undefined)
        || (app.appointment_extras?.length || 0) > 0
        || (app.appointment_products?.length || 0) > 0
        || Number(app.total_price || 0) > 0
      );

      let finalCashUsd = Number(cashUsd);
      let finalTransferBs = Number(remainingBs);

      if (paymentMode === 'financed') {
        finalCashUsd = Number(initialPaymentUsd);
        finalTransferBs = 0;
      }

      const paymentData = {
        appointmentId: checkoutAppointments[0]?.id || null,
        appointmentIds: checkoutAppointments.map(a => a.id),
        clientId: selectedApp?.client_id || selectedClient?.id,
        clientName: selectedApp?.clients?.name || selectedClient?.name,
        clientCedula: selectedApp?.clients?.id_card || selectedClient?.id_card,
        serviceName: totalAppsInCheckout.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos',
        totalUsd: totalUsd,
        originalAmount: totalBeforeDiscount,
        promotionId: appliedPromotion?.id || null,
        promotionName: appliedPromotion?.name || null,
        discountAmount: promotionDiscount,
        fixedRate: fixedRate,
        isMixed: paymentMode === 'mixed' || paymentMode === 'financed',
        cashUsd: finalCashUsd,
        transferBs: finalTransferBs,
        totalTips: totalTips,
        didTreatment: treatmentCount > 0,
        treatmentCount: treatmentCount,
        extras: totalAppsInCheckout.flatMap(a => a.appointment_extras || []),
        soldPackages: checkoutAppointments
          .filter(app => packageSales[app.id] && app.service_id)
          .map(app => ({
            serviceId: app.service_id,
            totalSessions: 8,
            totalAmount: Number(app.total_price || app.services?.price || 0)
          })),
        packageConsumptions: Object.entries(packageConsumptions)
          .filter(([appId, pkgId]) => pkgId && checkoutAppointments.some(a => a.id === appId))
          .map(([appId, pkgId]) => ({
            clientPackageId: pkgId,
            appointmentId: appId
          })),
        isFinanced: paymentMode === 'financed',
        totalInstallments: paymentMode === 'financed' ? Number(installmentsCount) : 0,
        remainingBalance: paymentMode === 'financed' ? (totalUsd - Number(initialPaymentUsd)) : 0,
        initialPaymentAmount: paymentMode === 'financed' ? Number(initialPaymentUsd) : 0,
        initialPaymentMethod: paymentMode === 'financed' ? initialPaymentMethod : null,
        appointments: totalAppsInCheckout
          .filter(app => app.service_id !== null && app.service_id !== undefined)
          .map(app => {
            const appExtrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
            const servicePrice = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
            const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento')) || false;
            return {
              id: app.id,
              staff_id: app.staff_id,
              clientName: app.clients?.name || 'Cliente',
              clientCedula: app.clients?.id_card || 'S/C',
              stylistName: app.staff?.name || 'Estilista',
              serviceName: app.services?.name || 'Servicio',
              servicePrice: servicePrice,
              extrasPrice: appExtrasTotal,
              totalPrice: servicePrice + appExtrasTotal,
              didTreatment: includesWashing || (treatmentCount > 0),
              extras: app.appointment_extras?.map(e => e.service_extras?.name).filter(Boolean).join(', ') || ''
            };
          }),
        staffInvolved: (() => {
          const involved = [];
          const treatmentStaff = allStaff.find(s => s.id === selectedTreatmentStaffId);
          const treatmentRate = treatmentStaff ? Number(treatmentStaff.treatment_rate || 0) : 0;
          const performedServices = totalAppsInCheckout.flatMap(app => (
            app.appointment_services?.length
              ? app.appointment_services.map(service => ({
                  ...app,
                  ...service,
                  services: service.services || app.services,
                  staff: service.staff || app.staff,
                  total_price: Number(service.price_paid ?? service.services?.price ?? 0),
                }))
              : [app]
          ));
          
          let appliedWashes = 0;
          performedServices
            .filter(app => app.service_id !== null && app.service_id !== undefined)
            .forEach(app => {
              if (!app.staff_id) return;
              const role = app.staff?.role;
              let price = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
              let grossBase = price;

              const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('tratamiento'));
              if (includesWashing && appliedWashes < treatmentCount && treatmentRate > 0) {
                grossBase = Math.max(0, grossBase - treatmentRate);
                appliedWashes++;
              }

            let pct = 40;
            if (role === 'Estilista') pct = app.services?.commission_stylist ?? 40;
            else if (role === 'Estilista de Tratamiento') pct = app.services?.commission_treatmentStaff ?? 10;
            else if (role === 'Caja') pct = app.services?.commission_cashier ?? 0;
            else if (role === 'Recepcionista') pct = app.services?.commission_receptionist ?? 0;
            else pct = app.staff?.commission_pct ?? 40;

            const comm = grossBase * (pct / 100);
            const tipVal = tips.filter(t => t.staffId === app.staff_id).reduce((acc, t) => {
              const isBs = t.currency === 'BS';
              const amountVal = Number(t.amount || 0);
              const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
              return acc + usdVal;
            }, 0);

            const existing = involved.find(i => i.staffId === app.staff_id);
            if (existing) {
              existing.commissionEarned += comm;
              existing.commissionBs += comm * fixedRate;
            } else {
              involved.push({
                staffId: app.staff_id,
                name: app.staff?.name || 'Estilista',
                role: app.staff?.role || 'Estilista',
                commissionEarned: comm,
                commissionBs: comm * fixedRate,
                productCommissionEarned: 0,
                productCommissionBs: 0,
                tip: tipVal,
                tipBs: tipVal * fixedRate
              });
            }
          });

          if (treatmentCount > 0 && selectedTreatmentStaffId) {
            const treatmentCommission = treatmentCount * treatmentRate;
            const existing = involved.find(i => i.staffId === selectedTreatmentStaffId);
            if (existing) {
              existing.commissionEarned += treatmentCommission;
              existing.commissionBs += treatmentCommission * fixedRate;
            } else {
              const tipValW = tips.filter(t => t.staffId === selectedTreatmentStaffId).reduce((acc, t) => {
                const isBs = t.currency === 'BS';
                const amountVal = Number(t.amount || 0);
                const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
                return acc + usdVal;
              }, 0);
              involved.push({
                staffId: selectedTreatmentStaffId,
                name: treatmentStaff?.name || 'Estilista',
                role: treatmentStaff?.role || 'Estilista de Tratamiento',
                commissionEarned: treatmentCommission,
                commissionBs: treatmentCommission * fixedRate,
                productCommissionEarned: 0,
                tip: tipValW,
                tipBs: tipValW * fixedRate
              });
            }
          }

          tips.forEach(t => {
            if (!t.staffId) return;
            const existing = involved.find(i => i.staffId === t.staffId);
            if (!existing) {
              const staffObj = allStaff.find(s => s.id === t.staffId);
              const isBs = t.currency === 'BS';
              const tipValT = isBs ? (Number(t.amount || 0) / fixedRate) : Number(t.amount || 0);
              involved.push({
                staffId: t.staffId,
                name: staffObj?.name || 'Staff',
                role: staffObj?.role || 'Estilista',
                commissionEarned: 0,
                productCommissionEarned: 0,
                tip: tipValT,
                tipBs: tipValT * fixedRate
              });
            }
          });


 
          // 5. Products Commission Assignment (10% standard product commission)
          cart.forEach(p => {
            const assignedStaffId = itemSalesAssociations[p.id];
            if (!assignedStaffId) return;
 
            const staffObj = allStaff.find(s => s.id === assignedStaffId);
            const commPct = typeof p.commission_pct === 'number' ? p.commission_pct : 10;
            const productComm = (p.price || 0) * (p.quantity || 1) * (commPct / 100);
 
            const existing = involved.find(i => i.staffId === assignedStaffId);
            if (existing) {
              existing.productCommissionEarned = (existing.productCommissionEarned || 0) + productComm;
              existing.productCommissionBs = (existing.productCommissionBs || 0) + (productComm * fixedRate);
            } else {
              involved.push({
                staffId: assignedStaffId,
                name: staffObj?.name || 'Staff',
                role: staffObj?.role || 'Staff',
                commissionEarned: 0,
                commissionBs: 0,
                productCommissionEarned: productComm,
                productCommissionBs: productComm * fixedRate,
                tip: 0,
                tipBs: 0
              });
            }
          });

          return involved;
        })(),
        products: cart.map(p => {
          const sellerId = itemSalesAssociations[p.id];
          const seller = allStaff.find(s => s.id === sellerId);
          return {
            ...p,
            sellerName: seller ? seller.name : 'Venta Directa'
          };
        }),
        methodUsd: methodUsd,
        methodBs: methodBs
      };

      // Save the preference before completing the appointment so the database
      // trigger can schedule exactly one reminder for this visit.
      if (!hasConfiguredRecurrence && recurrenceDaysToSave > 0 && paymentData.clientId && checkoutHasService) {
        await dataService.updateClient(paymentData.clientId, {
          recurrence_enabled: true,
          recurrence_days: recurrenceDaysToSave
        });
      }

      // Encolar el pago en la cola offline local de Dexie
      await offlineService.enqueuePayment(paymentData);

      showToast("Cobro recibido. Se está sincronizando de forma segura.", "success");
      
      // Limpiar estados de forma inmediata para agilizar la interfaz
      setSelectedApp(null);
      setSelectedClient(null);
      setIsDirectSale(false);
      setCart([]);
      setTips([]);
      setCashUsd(0);
      setPaymentMode('full_bs');
      
      // Remover visualmente del listado local de citas de inmediato
      if (paymentData.appointmentIds && paymentData.appointmentIds.length > 0) {
        setPendingServices(prev => prev.filter(app => !paymentData.appointmentIds.includes(app.id)));
      }

      try {
        triggerRocket?.();
      } catch (visualError) {
        console.warn("El cobro se registró, pero la animación no pudo mostrarse:", visualError);
      }
      
      // Recargar datos en segundo plano después de 3 segundos para confirmar la sincronización
      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (err) {
      console.error("Error en checkout:", err);
      const detail = err?.message ? `: ${err.message}` : '';
      showToast(`No se pudo registrar el cobro${detail}`, "error");
    } finally {
      checkoutSubmissionRef.current = false;
      setLoading(false);
    }
  };

  const handleManualSale = () => {
    setIsDirectSale(true);
    setSelectedApp(null);
    setSelectedClient(null);
    setDirectSaleIdSearch('');
    setCart([]);
    showToast("Venta Directa activada. Identifica al cliente si lo deseas.");
  };

  const handleAddService = (service) => {
    if (!selectedApp && !selectedClient) {
      showToast("Por favor, identifica al cliente primero en la barra superior.", "warning");
      return;
    }
    setSelectedServiceForStylist(service);
    setShowServiceModal(false);
    setShowStylistModal(true);
  };

  const handleConfirmServiceStylist = async (stylistId) => {
    if (loading) return;
    try {
      setLoading(true);
      setShowStylistModal(false);
      
      const clientId = selectedClient?.id || selectedApp?.client_id;
      if (!clientId) {
        showToast("Error: No hay cliente seleccionado", "error");
        return;
      }

      let newApp = null;
      if (selectedApp) {
        // Add service to existing appointment
        await dataService.addServiceToAppointment(selectedApp.id, {
          service_id: selectedServiceForStylist.id,
          staff_id: stylistId,
          price_paid: selectedServiceForStylist.price,
          scheduled_at: isExpressService ? null : selectedApp.scheduled_at,
          duration_minutes: selectedServiceForStylist.duration_minutes
        });
      } else {
        newApp = await dataService.createAppointment({
          client_id: clientId,
          service_id: selectedServiceForStylist.id,
          staff_id: stylistId,
          status: 'En Silla',
          total_price: selectedServiceForStylist.price
        });
      }
      
      // MIGRAR ITEMS EN CART (Extras o Productos) A LA NUEVA CITA
      if (!selectedApp && newApp && cart && cart.length > 0) {
        for (const item of cart) {
          if (item.type === 'extra') {
            const realExtraId = item.id.replace('extra_', '');
            await dataService.addExtraToAppointment(newApp.id, null, realExtraId, item.price);
          } else {
            await dataService.addProductToAppointment(newApp.id, item.id, item.quantity, item.price);
          }
        }
      }

      const filtered = await loadData();
      
      if (selectedApp) {
        const currentAppResel = filtered.find(a => a.id === selectedApp.id);
        if (currentAppResel) setSelectedApp(currentAppResel);
        showToast(isExpressService ? "Servicio Express añadido a la cita sin agendar." : "Servicio añadido y estilista asignado.");
      } else {
        if (newApp) {
          const fullyLoadedApp = filtered.find(a => a.id === newApp.id);
          if (fullyLoadedApp) {
            setIsDirectSale(false);
            setSelectedApp(fullyLoadedApp);
            showToast("Servicio añadido y estilista asignado.");
          } else {
            showToast("Cita creada. Selecciona el servicio en la lista.");
          }
        }
      }
      setSelectedServiceForStylist(null);
    } catch (e) {
      console.error(e);
      showToast("Error al asignar estilista", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangeStylist = () => {
    if (!selectedApp) return;
    setIsChangingStylist(true);
    setShowStylistModal(true);
  };

  const handleOpenChangeBundledStylist = (app) => {
    setActiveAppForStylistChange(app);
    setIsChangingStylist(true);
    setShowStylistModal(true);
  };

  const handleChangeStylist = async (stylistId) => {
    const appToChange = activeAppForStylistChange || selectedApp;
    if (!appToChange) return;

    try {
      setLoading(true);
      setShowStylistModal(false);
      setIsChangingStylist(false);
      setActiveAppForStylistChange(null);
      
      await dataService.updateAppointment(appToChange.id, { staff_id: stylistId });
      showToast("Estilista actualizado correctamente");
      const filtered = await loadData();
      
      const updatedSelected = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al cambiar de estilista", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBundledService = (app) => {
    if (!app) return;
    
    setDialog({
      isOpen: true,
      title: "Eliminar Servicio",
      message: `¿Seguro que deseas eliminar el servicio "${app.services?.name}" de esta cita?`,
      type: "confirm",
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          
          const remainingTotal = Math.max(0, (app.total_price || 0) - (app.services?.price || 0));
          const hasExtras = (app.appointment_extras?.length || 0) > 0;
          const hasProducts = (app.appointment_products?.length || 0) > 0;

          if (remainingTotal === 0 && !hasExtras && !hasProducts) {
            await dataService.deleteAppointment(app.id);
          } else {
            await dataService.updateAppointment(app.id, {
              service_id: null,
              total_price: remainingTotal
            });
          }
          
          showToast("Servicio eliminado de la cita.");
          const filtered = await loadData();
          
          const currentAppResel = selectedApp ? filtered.find(a => a.id === selectedApp.id) : null;
          if (currentAppResel) {
            setSelectedApp(currentAppResel);
          } else {
            const nextApp = selectedApp ? filtered.find(a => a.client_id === selectedApp.client_id) : null;
            if (nextApp) {
              setSelectedApp(nextApp);
            } else {
              setSelectedApp(null);
            }
          }
        } catch (e) {
          console.error(e);
          showToast("Error al eliminar el servicio", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDirectSaleSearchInput = (val) => {
    setDirectSaleIdSearch(val);
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = allClients.filter(c => {
        const normalizedName = normalizeForSearch(c.name || '');
        const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
        const idMatches = (c.id_card || '').toLowerCase().includes(term);
        return nameMatches || idMatches;
      });
      setDirectSaleSearchResults(results.slice(0, 5));
    } else {
      setDirectSaleSearchResults([]);
    }
  };

  const handleSelectDirectSaleClient = (client) => {
    setSelectedClient(client);
    setDirectSaleIdSearch('');
    setDirectSaleSearchResults([]);
    showToast(`Cliente enlazado: ${client.name}`);
  };

  const handleDirectSaleIdSearch = () => {
    if (directSaleSearchResults.length === 1) {
      handleSelectDirectSaleClient(directSaleSearchResults[0]);
    } else {
      const exact = allClients.find(c => c.id_card === directSaleIdSearch || c.name.toLowerCase() === directSaleIdSearch.toLowerCase());
      if (exact) {
        handleSelectDirectSaleClient(exact);
      } else if (directSaleSearchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. ¿Es un cliente nuevo?", "warning");
      }
    }
  };

  const handleNewClientSuccess = (newClient) => {
    setAllClients([...allClients, newClient]);
    setSelectedClient(newClient);
    setShowNewClientModal(false);
    showToast(`¡Cliente ${newClient.name} registrado y enlazado!`);
  };

  // Caja solo debe mostrar servicios que ya fueron finalizados.
  const activeServices = pendingServices.filter(a => a.status === 'Por Pagar');
  const groupedActiveServices = [];
  activeServices.forEach(app => {
    const existing = groupedActiveServices.find(g => g.client_id === app.client_id);
    if (existing) {
      existing.apps.push(app);
    } else {
      groupedActiveServices.push({
        client_id: app.client_id,
        client_name: app.clients?.name || 'Cliente',
        status: app.status,
        apps: [app]
      });
    }
  });

  // Group scheduled services (status === 'Agendado') by client
  const scheduledServices = pendingServices.filter(a => a.status === 'Agendado');
  const groupedScheduledServices = [];
  scheduledServices.forEach(app => {
    const existing = groupedScheduledServices.find(g => g.client_id === app.client_id);
    if (existing) {
      existing.apps.push(app);
    } else {
      groupedScheduledServices.push({
        client_id: app.client_id,
        client_name: app.clients?.name || 'Cliente',
        apps: [app]
      });
    }
  });

  if (!rates?.usd && !loading) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <RefreshCcw className="animate-spin" style={{ marginBottom: '20px' }} />
        <p>Sincronizando tasa de cambio oficial...</p>
      </div>
    );
  }

  return (
    <div className={`checkout-pos-shell animate-fade-in${embedded ? ' checkout-pos-shell--embedded' : ''}`} style={{ paddingBottom: embedded ? '24px' : '100px', maxWidth: '100%' }}>
      {!embedded && (
        <header style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: isMobile ? '20px' : '32px', 
        padding: '12px 0 16px 0', 
        flexWrap: 'wrap', 
        gap: '20px',
        position: 'relative'
      }}>
        {/* Background Ambient Glow */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(212,160,154,0.18) 0%, rgba(212,160,154,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', borderRadius: isMobile ? '12px' : '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
            <CreditCard size={isMobile ? 16 : 20} color="white" />
          </div>
          <div>
            <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
              Caja Jana Pro
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
              Liquidación de servicios y venta de productos.
            </p>
          </div>
        </div>
        {pendingSyncCount > 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(212,160,154,0.1)', 
            border: '1px solid rgba(212,160,154,0.3)', 
            padding: '8px 16px', 
            borderRadius: '16px', 
            color: 'var(--pink-primary)', 
            fontSize: '11px', 
            fontWeight: '900',
            letterSpacing: '0.5px'
          }}>
            <RefreshCw className="animate-spin" size={14} />
            <span>SINCRONIZANDO {pendingSyncCount} COBRO{pendingSyncCount > 1 ? 'S' : ''}...</span>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'rgba(76,175,80,0.1)', 
            border: '1px solid rgba(76,175,80,0.3)', 
            padding: '8px 16px', 
            borderRadius: '16px', 
            color: '#4caf50', 
            fontSize: '11px', 
            fontWeight: '900',
            letterSpacing: '0.5px'
          }}>
            <CheckCircle size={14} />
            <span>TODO AL DÍA</span>
          </div>
        )}
        </header>
      )}

      <div className="checkout-pos-container">
        <div className="checkout-pos-grid">
        
        <section>
          <div className="glass-card" style={{ marginBottom: isMobile ? '12px' : '32px', borderRadius: '24px' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center', 
              justifyContent: 'space-between', 
              gap: isMobile ? '12px' : '0',
              marginBottom: '20px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={20} color="var(--pink-primary)" />
                <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cola de Cobro</span>
              </div>
              <button 
                className="btn-pink" 
                onClick={handleManualSale}
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '10px' }}
              >
                <Plus size={14} /> VENTA DIRECTA
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--pink-primary)" />
              <input 
                type="text" 
                placeholder="Buscar por Cédula o Nombre..." 
                value={idSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdSearch(val);
                  
                  const activeMatch = pendingServices.find(app => app.status === 'Por Pagar' && app.clients?.id_card === val);
                  if (activeMatch) {
                    setSelectedApp(activeMatch);
                    return;
                  }

                  const scheduledMatch = !embedded
                    ? pendingServices.find(app => app.status === 'Agendado' && app.clients?.id_card === val)
                    : null;
                  if (scheduledMatch) {
                    setDialog({
                      isOpen: true,
                      type: 'confirm',
                      title: 'Cita Encontrada',
                      message: `El cliente ${scheduledMatch.clients?.name} tiene una cita agendada para hoy. ¿Deseas iniciar su servicio ahora?`,
                      onConfirm: () => {
                        const clientApps = pendingServices.filter(app => app.client_id === scheduledMatch.client_id && app.status === 'Agendado');
                        handleStartGroupAppointments(clientApps);
                        setDialog({ ...dialog, isOpen: false });
                        setIdSearch('');
                      }
                    });
                  }
                }}
                style={{ width: '100%', paddingLeft: '48px', backgroundColor: 'rgba(212,160,154,0.05)', border: '1px solid rgba(212,160,154,0.2)', height: '48px', borderRadius: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp size={16} color="var(--text-muted)" />
              <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lista de Espera por Cobrar</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupedActiveServices.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes por cobrar.</div>
              ) : (
                groupedActiveServices.map(group => {
                  const isSelected = selectedApp?.client_id === group.client_id;
                  const badgeStatus = group.apps.some(a => a.status === 'En Silla') ? 'En Silla' : (group.apps.some(a => a.status === 'En Tratamiento') ? 'En Tratamiento' : 'Por Pagar');
                  const serviceNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos';
                  const staffNames = Array.from(new Set(group.apps.map(a => a.staff?.name?.split(' ')[0]).filter(Boolean))).join(', ') || 'Caja';
                  const totalUsd = group.apps.reduce((acc, a) => acc + (a.total_price !== undefined && a.total_price !== null && Number(a.total_price) > 0 ? Number(a.total_price) : (a.services?.price || 0)), 0);
                  
                  return (
                    <div 
                      key={group.client_id} 
                      onClick={() => setSelectedApp(group.apps[0])}
                      className="checkout-queue-card"
                      style={{ 
                        padding: '16px', 
                        borderRadius: '16px', 
                        border: isSelected ? '1px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)',
                        background: isSelected ? 'rgba(212,160,154,0.05)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="checkout-queue-card-title-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '800' }}>{group.client_name}</span>
                        <span style={{ 
                          fontSize: '10px', 
                          backgroundColor: badgeStatus === 'En Silla' ? 'var(--pink-primary)' : (badgeStatus === 'En Tratamiento' ? 'rgba(0,122,255,0.15)' : '#4caf50'), 
                          color: badgeStatus === 'En Silla' ? 'black' : (badgeStatus === 'En Tratamiento' ? '#007aff' : 'white'), 
                          border: badgeStatus === 'En Tratamiento' ? '1px solid rgba(0,122,255,0.3)' : 'none',
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontWeight: '900' 
                        }}>{badgeStatus === 'En Silla' ? <><img src={goldChairImg} alt="silla" style={{ width: '12px', height: '12px', objectFit: 'contain', marginRight: '3px', verticalAlign: 'middle' }} />En Silla</> : badgeStatus}</span>
                      </div>
                      <div className="checkout-queue-card-detail-row" style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="checkout-queue-card-service" style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '70%', lineHeight: '1.3' }}>
                          <Sparkles size={12} /> {serviceNames} • <span style={{ fontWeight: '600' }}>{staffNames}</span>
                        </div>
                        <div className="checkout-queue-card-total" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--pink-primary)' }}>${Number(totalUsd).toFixed(2)}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: {(totalUsd * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!embedded && (
              <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '16px', letterSpacing: '1px' }}>PRÓXIMAS CITAS (AGENDA HOY)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedScheduledServices.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  groupedScheduledServices.map(group => {
                    const firstApp = group.apps[0];
                    const serviceNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos';
                    const staffNames = Array.from(new Set(group.apps.map(a => a.staff?.name?.split(' ')[0]).filter(Boolean))).join(', ') || 'Caja';
                    const timeString = new Date(firstApp.scheduled_at || firstApp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    
                    return (
                      <div 
                        key={group.client_id} 
                        style={{ 
                          padding: '16px', 
                          borderRadius: '16px', 
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{ fontWeight: '800', fontSize: '14px' }}>{group.client_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                            {timeString} • {serviceNames} • {staffNames}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            handleStartGroupAppointments(group.apps);
                            triggerRocket();
                          }}
                          className="btn-pink"
                          style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}
                        >
                          Iniciar
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              </div>
            )}
          </div>

          {(selectedApp || isDirectSale) && (
            <div className="glass-card animate-slide-up checkout-action-tiles" style={{ borderRadius: isMobile ? '18px' : '24px', padding: isMobile ? '10px' : '16px', display: 'flex', gap: isMobile ? '8px' : '12px', width: '100%', boxSizing: 'border-box' }}>
              <button 
                onClick={() => setShowProductModal(true)}
                style={{ flex: 1, padding: isMobile ? '12px 8px' : '16px', borderRadius: isMobile ? '14px' : '16px', border: '1px solid rgba(160,80,106,0.16)', background: '#fffafa', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '6px' : '8px', transition: 'all 0.25s ease', boxShadow: '0 6px 18px rgba(100,54,68,0.05)', minWidth: 0 }}
                className="hover-item"
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(212,160,154,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(100,54,68,0.05)'; }}
              >
                <div style={{ background: 'var(--pink-primary)', width: isMobile ? '36px' : '42px', height: isMobile ? '36px' : '42px', borderRadius: isMobile ? '10px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(160,80,106,0.2)', flexShrink: 0 }}>
                  <ShoppingBag size={isMobile ? 18 : 24} strokeWidth={2.5} />
                </div>
                <div style={{ fontWeight: '800', fontSize: isMobile ? '9px' : '11px', letterSpacing: '0.5px', textAlign: 'center' }}>PRODUCTOS</div>
              </button>

              <button 
                onClick={() => setShowExtraModal(true)}
                style={{ flex: 1, padding: isMobile ? '12px 8px' : '16px', borderRadius: isMobile ? '14px' : '16px', border: '1px solid rgba(160,80,106,0.16)', background: '#fffafa', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '6px' : '8px', transition: 'all 0.25s ease', boxShadow: '0 6px 18px rgba(100,54,68,0.05)', minWidth: 0 }}
                className="hover-item"
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(212,160,154,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(100,54,68,0.05)'; }}
              >
                <div style={{ background: 'var(--pink-primary)', width: isMobile ? '36px' : '42px', height: isMobile ? '36px' : '42px', borderRadius: isMobile ? '10px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(160,80,106,0.2)', flexShrink: 0 }}>
                  <Zap size={isMobile ? 18 : 24} strokeWidth={2.5} />
                </div>
                <div style={{ fontWeight: '800', fontSize: isMobile ? '9px' : '11px', letterSpacing: '0.5px', textAlign: 'center' }}>EXTRAS</div>
              </button>

              <button 
                onClick={() => setShowServiceModal(true)}
                style={{ flex: 1, padding: isMobile ? '12px 8px' : '16px', borderRadius: isMobile ? '14px' : '16px', border: '1px solid rgba(160,80,106,0.16)', background: '#fffafa', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '6px' : '8px', transition: 'all 0.25s ease', boxShadow: '0 6px 18px rgba(100,54,68,0.05)', minWidth: 0 }}
                className="hover-item"
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(212,160,154,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(100,54,68,0.05)'; }}
              >
                <div style={{ background: 'var(--pink-primary)', width: isMobile ? '36px' : '42px', height: isMobile ? '36px' : '42px', borderRadius: isMobile ? '10px' : '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(160,80,106,0.2)', flexShrink: 0 }}>
                  <Sparkles size={isMobile ? 18 : 24} strokeWidth={2.5} />
                </div>
                <div style={{ fontWeight: '800', fontSize: isMobile ? '9px' : '11px', letterSpacing: '0.5px', textAlign: 'center' }}>SERVICIOS</div>
              </button>
            </div>
          )}
        </section>

        <section className="checkout-summary-column">
          {(!selectedApp && !isDirectSale) ? (
            <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: '24px', color: 'var(--text-muted)' }}>
              <CreditCard size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
              <h3>Selecciona un cliente de la lista para cobrar</h3>
            </div>
          ) : (
            <div className="glass-card animate-scale-in checkout-summary-card" style={{ borderRadius: isMobile ? '20px' : '32px', padding: isMobile ? '16px' : '32px', border: '1.5px solid rgba(212,160,154,0.3)', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)' }}>
              <div className="checkout-summary-identity" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? '12px' : '0', marginBottom: isMobile ? '16px' : '32px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="checkout-summary-kicker">Cobro activo</div>
                  <h3 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>{selectedApp ? 'Resumen de Cobro' : 'Venta Directa'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {selectedApp ? (
                      <>
                        {selectedApp.clients?.name || 'Cliente'}
                        {bundledApps.length > 0 && bundledApps.map(a => a.services?.name).filter(Boolean).length > 0 ? (
                          ` • ${bundledApps.map(a => a.services?.name).filter(Boolean).join(' + ')}`
                        ) : ''}
                      </>
                    ) : (
                      <>
                        {selectedClient ? (
                          <div className="animate-scale-in" style={{ padding: '12px 16px', background: 'rgba(212,160,154,0.1)', borderRadius: '12px', border: '1px solid rgba(212,160,154,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: isMobile ? '14px' : '16px' }}>{selectedClient.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{selectedClient.id_card}</div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }}>CAMBIAR</button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                <Search style={{ position: 'absolute', left: '10px', top: '12px' }} size={14} color="var(--text-muted)" />
                                <input 
                                  className="checkout-client-search-input"
                                  type="text" 
                                  placeholder={isMobile ? 'Cédula o nombre...' : 'Cédula o nombre del cliente...'} 
                                  value={directSaleIdSearch}
                                  onChange={(e) => handleDirectSaleSearchInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleDirectSaleIdSearch()}
                                  style={{ width: '100%', paddingLeft: '34px', height: '40px', fontSize: isMobile ? '12px' : '13px', boxSizing: 'border-box' }}
                                />
                              </div>
                              <button onClick={handleDirectSaleIdSearch} className="btn-pink" style={{ padding: '0 10px', height: '40px', flexShrink: 0, fontSize: isMobile ? '10px' : '12px' }}>{isMobile ? 'OK' : 'ENLAZAR'}</button>
                              <button 
                                className="checkout-client-add"
                                onClick={() => setShowNewClientModal(true)} 
                                style={{ padding: '0 10px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                                aria-label="Registrar cliente nuevo"
                              >
                                <UserPlus size={16} />
                              </button>
                            </div>
                            
                            {/* Autocomplete Dropdown */}
                            {directSaleSearchResults.length > 0 && (
                              <div className="animate-scale-in checkout-client-search-results" style={{ 
                                position: 'absolute', top: '100%', left: 0, right: 0, 
                                marginTop: '8px', borderRadius: '14px', 
                                overflow: 'hidden', zIndex: 10
                              }}>
                                {directSaleSearchResults.map(c => (
                                  <button
                                    type="button"
                                    key={c.id} 
                                    onClick={() => handleSelectDirectSaleClient(c)}
                                    className="checkout-client-search-option"
                                  >
                                    <span>{c.name}</span>
                                    <small>V-{c.id_card}</small>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', whiteSpace: 'nowrap' }}>TASA MANUAL ($)</label>
                  <input 
                    type="number" 
                    value={fixedRate} 
                    onChange={(e) => setFixedRate(e.target.value)}
                    style={{ width: isMobile ? '90px' : '100px', textAlign: 'right', fontWeight: '900', color: 'var(--pink-primary)', background: 'none', border: '1px solid rgba(212,160,154,0.3)', marginLeft: isMobile ? '0' : '10px' }}
                  />
                </div>
              </div>

              <div className="checkout-quick-total">
                <div>
                  <span>Total preparado</span>
                  <strong className="checkout-total-amount">${formatCurrency(totalUsd)}</strong>
                  <small>Ref. {formatCurrency(totalBs)} Bs.</small>
                </div>
                <button
                  type="button"
                  className="btn-pink checkout-quick-pay"
                  onClick={handleProcessCheckout}
                  disabled={loading}
                >
                  {loading ? <RefreshCcw className="animate-spin" size={18} /> : <CreditCard size={18} />}
                  {loading ? 'Procesando…' : 'Cobrar ahora'}
                </button>
              </div>

              <div className="checkout-service-ledger" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px', marginBottom: '24px', padding: isMobile ? '12px 10px' : '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                {totalAppsInCheckout.map(app => {
                  const sPrice = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
                  const isLinked = app.client_id !== selectedApp?.client_id;
                  return (
                    <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px' }}>
                          {isLinked ? (
                            <button 
                              onClick={() => handleUnlinkApp(app.id)} 
                              style={{ background: 'none', border: 'none', color: '#ff9500', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                              title="Desenlazar cita"
                            >
                              <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRemoveBundledService(app)} 
                              style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                              title={app.services ? "Eliminar servicio" : "Eliminar extras"}
                            >
                              <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                            </button>
                          )}
                          {isLinked && <span style={{ color: 'var(--pink-primary)', fontWeight: '800', fontSize: '10px', flexShrink: 0 }}>({app.clients?.name?.split(' ')[0]}):</span>}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)' }}>
                            {app.services ? `Servicio: ${app.services.name}` : 'Extras'}
                          </span>
                          {' • '}
                          <span 
                            onClick={() => handleOpenChangeBundledStylist(app)}
                            style={{ 
                              color: 'var(--pink-primary)', 
                              fontWeight: '700', 
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '1px',
                              fontSize: '10px',
                              flexShrink: 0
                            }}
                            title="Click para cambiar estilista"
                          >
                            {app.staff?.name?.split(' ')[0] || 'Caja'}
                            <Edit3 size={8} />
                          </span>
                        </div>
                        {app.services && (() => {
                          const matchingPkg = activePackages.find(pkg => pkg.service_id === app.service_id);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px', marginTop: '2px' }}>
                              <label style={{ fontSize: '10px', color: 'var(--pink-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}>
                                <input 
                                  type="checkbox" 
                                  checked={!!packageSales[app.id]} 
                                  disabled={!!packageConsumptions[app.id]}
                                  onChange={(e) => setPackageSales({ ...packageSales, [app.id]: e.target.checked })}
                                  style={{ accentColor: 'var(--pink-primary)' }}
                                />
                                <span>Vender como Paquete (8 Sesiones)</span>
                              </label>
                              {matchingPkg && (
                                <label style={{ fontSize: '10px', color: '#34c759', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!packageConsumptions[app.id]} 
                                    disabled={!!packageSales[app.id]}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setPackageConsumptions({ ...packageConsumptions, [app.id]: matchingPkg.id });
                                      } else {
                                        const copy = { ...packageConsumptions };
                                        delete copy[app.id];
                                        setPackageConsumptions(copy);
                                      }
                                    }}
                                    style={{ accentColor: '#34c759' }}
                                  />
                                  <span>Consumir sesión de paquete ({matchingPkg.total_sessions - matchingPkg.used_sessions} disp.)</span>
                                </label>
                              )}
                            </div>
                          );
                        })()}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px', flexShrink: 0 }}>
                        {app.services ? (
                          <>
                            {editingAppPrice?.id === app.id ? (
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '800' }}>Bs.</span>
                                <input 
                                  type="number"
                                  autoFocus
                                  defaultValue={(sPrice * fixedRate).toFixed(2)}
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    const newPriceBs = parseFloat(val) || 0;
                                    const newPriceUsd = fixedRate > 0 ? (newPriceBs / fixedRate) : 0;
                                    try {
                                      setLoading(true);
                                      await dataService.updateAppointment(app.id, { total_price: newPriceUsd });
                                       showToast("Precio del servicio actualizado");
                                       const filtered = await loadData();
                                       const updatedSelected = filtered.find(a => a.id === selectedApp?.id);
                                       if (updatedSelected) setSelectedApp(updatedSelected);
                                    } catch (err) {
                                      console.error(err);
                                      showToast("Error al actualizar precio", "error");
                                    } finally {
                                      setLoading(false);
                                      setEditingAppPrice(null);
                                    }
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const val = e.target.value;
                                      const newPriceBs = parseFloat(val) || 0;
                                      const newPriceUsd = fixedRate > 0 ? (newPriceBs / fixedRate) : 0;
                                      try {
                                        setLoading(true);
                                        await dataService.updateAppointment(app.id, { total_price: newPriceUsd });
                                        showToast("Precio del servicio actualizado");
                                        const filtered = await loadData();
                                        const updatedSelected = filtered.find(a => a.id === selectedApp?.id);
                                        if (updatedSelected) setSelectedApp(updatedSelected);
                                      } catch (err) {
                                        console.error(err);
                                        showToast("Error al actualizar precio", "error");
                                      } finally {
                                        setLoading(false);
                                        setEditingAppPrice(null);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setEditingAppPrice(null);
                                    }
                                  }}
                                  style={{ width: '95px', height: '28px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--pink-primary)', borderRadius: '6px', color: 'white', paddingLeft: '28px', paddingRight: '6px', fontSize: '12px', fontWeight: '800', textAlign: 'right', outline: 'none' }}
                                />
                              </div>
                            ) : (
                              <div 
                                onClick={() => setEditingAppPrice(app)}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', transition: 'all 0.2s' }}
                                onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                                  <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', color: 'white' }}>
                                    ${Number(sPrice).toFixed(2)}
                                  </span>
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: {isMobile ? `${Math.round(sPrice * fixedRate).toLocaleString('es-VE')} Bs.` : `${(sPrice * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}</span>
                                </div>
                                <Edit3 size={12} color="var(--pink-primary)" style={{ opacity: 0.8 }} />
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Monto en extras</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {selectedApp && (
                  <button 
                    onClick={() => setShowLinkModal(true)}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '10px', 
                      border: '1px dashed var(--pink-primary)', 
                      background: 'rgba(212,160,154,0.05)', 
                      color: 'var(--pink-primary)', 
                      fontWeight: '800', 
                      fontSize: '10px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '2px',
                      marginBottom: '4px'
                    }}
                  >
                    🔗 ENLAZAR OTRAS CITAS (PAGO GRUPAL)
                  </button>
                )}
                 {cart.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                      <button onClick={() => handleRemoveProduct(p)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                      </button>
                      <span style={{ lineHeight: '1.3', color: 'rgba(255,255,255,0.9)' }}>{p.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                        <button 
                          onClick={() => handleDecrementProduct(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                          <Minus size={8} />
                        </button>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: 'white', minWidth: '10px', textAlign: 'center' }}>{p.quantity}</span>
                        <button 
                          onClick={() => handleIncrementProduct(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                      
                      {/* Staff Selector for Product Sale */}
                      <CartSellerSelect
                        value={itemSalesAssociations[p.id] || ''}
                        onChange={(val) => setItemSalesAssociations({ ...itemSalesAssociations, [p.id]: val })}
                        options={allStaff.filter(s => !(s.role || '').toLowerCase().includes('admin')).map(s => ({ value: s.id, label: s.name?.split(' ')[0] }))}
                      />
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px', flexShrink: 0 }}>
                      <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', color: 'white' }}>
                        ${(p.price * p.quantity).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: {isMobile ? `${Math.round(p.price * p.quantity * fixedRate).toLocaleString('es-VE')} Bs.` : `${(p.price * p.quantity * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}</span>
                    </div>
                  </div>
                ))}
 
                {totalAppsInCheckout.flatMap(app => 
                  app.appointment_extras?.map(extra => ({
                    ...extra,
                    appId: app.id
                  })) || []
                ).map(extra => (
                  <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pink-primary)', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                      <button onClick={() => handleRemoveExtra(extra.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                      </button>
                      <span style={{ lineHeight: '1.3', color: 'var(--pink-primary)' }}>{extra.service_extras?.name}</span>
                      
                      {/* Staff Selector for Extra */}
                      <CartSellerSelect
                        value={itemSalesAssociations[extra.id] || ''}
                        onChange={(val) => setItemSalesAssociations({ ...itemSalesAssociations, [extra.id]: val })}
                        options={allStaff.filter(s => !(s.role || '').toLowerCase().includes('admin')).map(s => ({ value: s.id, label: s.name?.split(' ')[0] }))}
                      />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      {editingExtraPriceId === extra.id ? (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '800' }}>Bs.</span>
                          <input 
                            type="number"
                            autoFocus
                            defaultValue={(extra.price * fixedRate).toFixed(2)}
                            onBlur={(e) => handleUpdateExtraPrice(extra.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(extra.id, e.target.value)}
                            style={{ width: '95px', height: '28px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--pink-primary)', borderRadius: '6px', color: 'white', paddingLeft: '28px', paddingRight: '6px', fontSize: '12px', fontWeight: '800', textAlign: 'right', outline: 'none' }}
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingExtraPriceId(extra.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', transition: 'all 0.2s' }}
                          onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                          onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                            <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px' }}>
                              ${Number(extra.price).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: {isMobile ? `${Math.round(extra.price * fixedRate).toLocaleString('es-VE')} Bs.` : `${(extra.price * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}</span>
                          </div>
                          <Edit3 size={12} color="var(--pink-primary)" style={{ opacity: 0.8 }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Washing Section */}
                {treatmentEligibleCount > 0 && (
                  <div className="glass-card animate-slide-up" style={{ padding: isMobile ? '12px 14px' : '24px', borderRadius: '16px', marginBottom: isMobile ? '16px' : '24px', border: '1px solid rgba(10,132,255,0.15)', background: 'rgba(10,132,255,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '8px', marginBottom: isMobile ? '10px' : '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', borderRadius: '8px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Droplets size={isMobile ? 16 : 20} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: isMobile ? '12px' : '15px', fontWeight: '800', color: 'white', margin: 0 }}>Tratamientos de Cabello</h4>
                          <p style={{ fontSize: isMobile ? '9px' : '11px', color: 'var(--text-secondary)', margin: 0 }}>Selecciona la cantidad de tratamientos.</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                        {Array.from({ length: treatmentEligibleCount + 1 }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setTreatmentCount(idx)}
                            style={{
                              padding: isMobile ? '4px 8px' : '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: treatmentCount === idx ? '#0a84ff' : 'rgba(255,255,255,0.05)',
                              color: treatmentCount === idx ? 'white' : 'var(--text-muted)',
                              fontWeight: '900',
                              fontSize: isMobile ? '10px' : '12px',
                              cursor: 'pointer',
                              transition: '0.2s',
                              flex: isMobile ? 1 : 'none'
                            }}
                          >
                            {idx} {idx === 1 ? 'tratamiento' : 'tratamientos'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {treatmentCount > 0 && (
                      <div className="animate-fade-in" style={{ position: 'relative' }}>
                        {/* Selected value button */}
                        <div 
                          onClick={() => setIsTreatmentStaffDropdownOpen(!isTreatmentStaffDropdownOpen)}
                          style={{
                            width: '100%',
                            padding: isMobile ? '10px 12px' : '14px 16px',
                            borderRadius: '12px',
                            background: 'rgba(212, 175, 55, 0.04)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            color: 'white',
                            fontSize: isMobile ? '12px' : '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,160,154,0.6)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(212,160,154,0.25)'}
                        >
                          <span>
                            {selectedTreatmentStaffId 
                              ? (() => {
                                  const treatmentStaff = allStaff.find(s => s.id === selectedTreatmentStaffId);
                                  return treatmentStaff ? `${treatmentStaff.name} ($${treatmentStaff.treatment_rate || 0}/tratamiento) - Disponible` : 'Seleccionar Estilista de Tratamiento';
                                })()
                              : 'Seleccionar Estilista de Tratamiento'
                            }
                          </span>
                          <ChevronDown size={16} color="var(--pink-primary)" style={{
                            transform: isTreatmentStaffDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }} />
                        </div>

                        {/* Custom Dropdown Menu */}
                        {isTreatmentStaffDropdownOpen && (
                          <>
                            {/* Transparent overlay to close dropdown */}
                            <div 
                              onClick={() => setIsTreatmentStaffDropdownOpen(false)}
                              style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                            />
                            
                            <div className="animate-scale-in" style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: '8px',
                              background: 'rgba(30, 30, 35, 0.96)',
                              backdropFilter: 'blur(30px)',
                              border: '1.5px solid rgba(212, 175, 55, 0.3)',
                              borderRadius: '16px',
                              overflowY: 'auto',
                              maxHeight: '180px',
                              zIndex: 1000,
                              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)'
                            }}>
                              {/* Option: Seleccionar Estilista de Tratamiento */}
                              <div
                                onClick={() => {
                                  setSelectedTreatmentStaffId('');
                                  setIsTreatmentStaffDropdownOpen(false);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  fontSize: isMobile ? '12px' : '14px',
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                Seleccionar Estilista de Tratamiento
                              </div>
                              
                              {allStaff
                                .filter(s => s.role?.toLowerCase().includes('estilista'))
                                .map(s => (
                                  <div
                                    key={s.id}
                                    onClick={() => {
                                      setSelectedTreatmentStaffId(s.id);
                                      setIsTreatmentStaffDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      cursor: 'pointer',
                                      fontSize: isMobile ? '12px' : '14px',
                                      color: 'white',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      transition: 'background-color 0.2s',
                                      backgroundColor: selectedTreatmentStaffId === s.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedTreatmentStaffId === s.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent'}
                                  >
                                    <span style={{ fontWeight: selectedTreatmentStaffId === s.id ? '800' : '500' }}>{s.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--pink-primary)' }}>${s.treatment_rate || 0}/tratamiento</span>
                                  </div>
                                ))
                              }
                            </div>
                          </>
                        )}
                        {allStaff.filter(s => s.role?.toLowerCase().includes('estilista')).length > 1 && !selectedTreatmentStaffId && (
                          <div style={{ marginTop: '6px', fontSize: '9px', color: '#ff9500', fontWeight: '800' }}>
                            ⚠️ Hay múltiples estilistas. Por favor selecciona una.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Tips Section */}
                <div style={{ paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <TrendingUp size={14} color="var(--pink-primary)" /> PROPINAS
                    </span>
                    <button 
                      onClick={() => setTips([...tips, { id: Date.now().toString(), staffId: allStaff[0]?.id || '', amount: 0, currency: 'USD' }])}
                      style={{ background: 'rgba(212,160,154,0.1)', border: 'none', color: 'var(--pink-primary)', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> AGREGAR PROPINA
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tips.map((t, idx) => (
                       <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative', width: '100%' }} className="animate-fade-in">
                        {/* Custom Dropdown Trigger */}
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div
                            onClick={() => setOpenTipDropdownId(openTipDropdownId === t.id ? null : t.id)}
                            style={{
                              height: '36px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '10px',
                              fontSize: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: 'white',
                              padding: '0 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,160,154,0.4)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                          >
                            <span>
                              {t.staffId 
                                ? allStaff.find(s => s.id === t.staffId)?.name || 'Seleccionar Integrante'
                                : 'Seleccionar Integrante'
                              }
                            </span>
                            <ChevronDown size={14} color="var(--pink-primary)" style={{
                              transform: openTipDropdownId === t.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              flexShrink: 0
                            }} />
                          </div>

                          {/* Custom Dropdown Menu */}
                          {openTipDropdownId === t.id && (
                            <>
                              <div 
                                onClick={() => setOpenTipDropdownId(null)}
                                style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                              />
                              <div className="animate-scale-in" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                background: 'rgba(30, 30, 35, 0.96)',
                                backdropFilter: 'blur(30px)',
                                border: '1.5px solid rgba(212, 175, 55, 0.3)',
                                borderRadius: '12px',
                                overflowY: 'auto',
                                maxHeight: '180px',
                                zIndex: 1000,
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                              }}>
                                <div
                                  onClick={() => {
                                    const newTips = [...tips];
                                    newTips[idx].staffId = '';
                                    setTips(newTips);
                                    setOpenTipDropdownId(null);
                                  }}
                                  style={{
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  Seleccionar Integrante
                                </div>
                                {allStaff.filter(s => !(s.role || '').toLowerCase().includes('admin')).map(s => (
                                  <div
                                    key={s.id}
                                    onClick={() => {
                                      const newTips = [...tips];
                                      newTips[idx].staffId = s.id;
                                      setTips(newTips);
                                      setOpenTipDropdownId(null);
                                    }}
                                    style={{
                                      padding: '10px 12px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      color: 'white',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                      transition: 'background-color 0.2s',
                                      backgroundColor: t.staffId === s.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = t.staffId === s.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent'}
                                  >
                                    {s.name}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Currency Selector (USD/BS Toggle) */}
                        <button
                          type="button"
                          onClick={() => {
                            const newTips = [...tips];
                            newTips[idx].currency = newTips[idx].currency === 'BS' ? 'USD' : 'BS';
                            setTips(newTips);
                          }}
                          style={{ 
                            width: '44px', 
                            height: '36px', 
                            background: t.currency === 'BS' ? 'rgba(255,255,255,0.05)' : 'rgba(212,160,154,0.15)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '10px', 
                            color: t.currency === 'BS' ? '#ffffff' : 'var(--pink-primary)', 
                            fontWeight: '900', 
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {t.currency === 'BS' ? 'Bs' : '$'}
                        </button>
                        
                        <div style={{ position: 'relative', width: '80px' }}>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={t.amount || ''} 
                            onChange={(e) => {
                              const newTips = [...tips];
                              newTips[idx].amount = parseFloat(e.target.value) || 0;
                              setTips(newTips);
                            }}
                            style={{ width: '100%', height: '36px', textAlign: 'right', background: 'rgba(212,160,154,0.1)', border: 'none', borderRadius: '10px', color: 'var(--pink-primary)', fontWeight: '800', paddingRight: '12px' }} 
                          />
                        </div>
                        <button 
                          onClick={() => setTips(tips.filter(item => item.id !== t.id))}
                          style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '4px' }}
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {appliedPromotion && <div style={{display:'flex',justifyContent:'space-between',marginTop:12,padding:'9px 12px',borderRadius:10,background:'rgba(201,114,130,.1)',color:'var(--pink-primary)',fontSize:12,fontWeight:800}}><span>Promoción: {appliedPromotion.name}</span><span>- ${formatCurrency(promotionDiscount)}</span></div>}
                <div className="checkout-total-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                  <span style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: '900' }}>TOTAL A PAGAR</span>
                  <div style={{ textAlign: 'right' }}>
                    <div className="checkout-total-amount" style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '800', color: 'var(--pink-primary)' }}>${formatCurrency(totalUsd)}</div>
                    <div style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--text-muted)' }}>Ref: {formatCurrency(totalBs)} Bs.</div>
                  </div>
                </div>
              </div>

              <div className="checkout-payment-panel" style={{ marginBottom: '24px' }}>
                <div className="checkout-payment-modes" style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    onClick={() => { setPaymentMode('full_usd'); setCashUsd(totalUsd); }}
                    className={`checkout-payment-mode${paymentMode === 'full_usd' ? ' is-active' : ''}`}
                    style={{ flex: '1 0 45%', height: '38px', borderRadius: '10px', border: paymentMode === 'full_usd' ? '2px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_usd' ? 'rgba(212,160,154,0.1)' : 'none', color: paymentMode === 'full_usd' ? 'var(--pink-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >TODO EN $</button>
                  <button 
                    type="button"
                    onClick={() => { setPaymentMode('full_bs'); setCashUsd(0); }}
                    className={`checkout-payment-mode${paymentMode === 'full_bs' ? ' is-active' : ''}`}
                    style={{ flex: '1 0 45%', height: '38px', borderRadius: '10px', border: paymentMode === 'full_bs' ? '2px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'full_bs' ? 'rgba(212,160,154,0.1)' : 'none', color: paymentMode === 'full_bs' ? 'var(--pink-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >TODO EN BS</button>
                  <button 
                    type="button"
                    onClick={() => setPaymentMode('mixed')}
                    className={`checkout-payment-mode${paymentMode === 'mixed' ? ' is-active' : ''}`}
                    style={{ flex: '1 0 45%', height: '38px', borderRadius: '10px', border: paymentMode === 'mixed' ? '2px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'mixed' ? 'rgba(212,160,154,0.1)' : 'none', color: paymentMode === 'mixed' ? 'var(--pink-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >PAGO MIXTO</button>
                  <button 
                    type="button"
                    onClick={() => { setPaymentMode('financed'); setInitialPaymentUsd(Math.round(totalUsd / 3)); }}
                    className={`checkout-payment-mode${paymentMode === 'financed' ? ' is-active' : ''}`}
                    style={{ flex: '1 0 45%', height: '38px', borderRadius: '10px', border: paymentMode === 'financed' ? '2px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentMode === 'financed' ? 'rgba(212,160,154,0.1)' : 'none', color: paymentMode === 'financed' ? 'var(--pink-primary)' : 'white', fontWeight: '800', cursor: 'pointer', fontSize: '9px' }}
                  >FINANCIADO</button>
                </div>

                {paymentMode === 'full_usd' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', marginBottom: '12px' }}>
                    <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>MÉTODO DE PAGO ($)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodUsd(m)}
                          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: methodUsd === m ? '1.5px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodUsd === m ? 'rgba(212,160,154,0.1)' : 'rgba(255,255,255,0.02)', color: methodUsd === m ? 'var(--pink-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'full_bs' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>TOTAL EN BOLÍVARES (BS)</label>
                      <div style={{ fontWeight: '900', color: 'var(--pink-primary)', fontSize: '16px' }}>{formatCurrency(totalBs)} BS</div>
                    </div>
                    <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>MÉTODO DE PAGO (BS)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Pago Móvil', 'Efectivo', 'Transferencia'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodBs(m)}
                          style={{ flex: 1, padding: '8px', borderRadius: '10px', border: methodBs === m ? '1.5px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodBs === m ? 'rgba(212,160,154,0.1)' : 'rgba(255,255,255,0.02)', color: methodBs === m ? 'var(--pink-primary)' : 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'mixed' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>1. PAGO EN DÓLARES ($)</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input 
                          type="number" 
                          value={cashUsd} 
                          onChange={(e) => setCashUsd(e.target.value)}
                          style={{ flex: 1, height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'right', paddingRight: '10px', fontSize: '12px' }} 
                        />
                        <div style={{ display: 'flex', flex: 2, gap: '4px', flexWrap: 'wrap' }}>
                          {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodUsd(m)}
                              style={{ flex: '1 0 45%', padding: '6px', borderRadius: '8px', border: methodUsd === m ? '1.5px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)', background: methodUsd === m ? 'rgba(212,160,154,0.1)' : 'rgba(255,255,255,0.02)', color: methodUsd === m ? 'var(--pink-primary)' : 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>2. RESTANTE EN BOLÍVARES (BS)</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '900', color: 'var(--pink-primary)', fontSize: '16px' }}>{formatCurrency(remainingBs)} BS</div>
                        <div style={{ display: 'flex', flex: 1.5, gap: '4px', flexWrap: 'wrap', marginLeft: '10px' }}>
                          {['Pago Móvil', 'Efectivo', 'Transfe'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodBs(m === 'Transfe' ? 'Transferencia' : m)}
                              style={{ flex: '1 0 45%', padding: '6px', borderRadius: '8px', border: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? '1.5px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)', background: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? 'rgba(212,160,154,0.1)' : 'rgba(255,255,255,0.02)', color: (methodBs === m || (m==='Transfe' && methodBs==='Transferencia')) ? 'var(--pink-primary)' : 'white', fontSize: '9px', fontWeight: '700', cursor: 'pointer' }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMode === 'financed' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>CUOTAS TOTALES</label>
                        <select 
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                          style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '0 8px', fontSize: '12px', fontWeight: '800' }}
                        >
                          <option value="2" style={{ backgroundColor: 'black' }}>2 Cuotas</option>
                          <option value="3" style={{ backgroundColor: 'black' }}>3 Cuotas (Estándar)</option>
                          <option value="4" style={{ backgroundColor: 'black' }}>4 Cuotas</option>
                          <option value="6" style={{ backgroundColor: 'black' }}>6 Cuotas</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>PAGO INICIAL ($)</label>
                        <input 
                          type="number" 
                          value={initialPaymentUsd} 
                          onChange={(e) => setInitialPaymentUsd(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', height: '36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'right', paddingRight: '10px', fontSize: '12px', color: 'white', fontWeight: '800' }} 
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>MÉTODO PAGO INICIAL</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['Efectivo', 'Zelle', 'Binance', 'Pago Móvil'].map(m => (
                          <button 
                            key={m}
                            type="button"
                            onClick={() => setInitialPaymentMethod(m)}
                            style={{ flex: 1, padding: '8px', borderRadius: '10px', border: initialPaymentMethod === m ? '1.5px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)', background: initialPaymentMethod === m ? 'rgba(212,160,154,0.1)' : 'rgba(255,255,255,0.02)', color: initialPaymentMethod === m ? 'var(--pink-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                          >{m}</button>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Saldo Financiado:</span>
                      <span style={{ color: 'var(--pink-primary)' }}>${(totalUsd - initialPaymentUsd).toFixed(2)} USD</span>
                    </div>
                  </div>
                )}
              </div>

              {checkoutClient && checkoutHasService && (
                <div style={{ marginTop: '12px', padding: '14px', borderRadius: '14px', background: 'rgba(212,160,154,0.07)', border: '1px solid rgba(212,160,154,0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: hasConfiguredRecurrence ? 0 : '10px' }}>
                    <Clock size={16} color="var(--pink-primary)" />
                    <div>
                      <div style={{ color: 'white', fontWeight: '900', fontSize: '12px' }}>Recordatorio de proximo corte</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>
                        {hasConfiguredRecurrence
                          ? `Configurado cada ${checkoutClient.recurrence_days} dias`
                          : 'Este cliente todavia no tiene una recurrencia definida'}
                      </div>
                    </div>
                  </div>
                  {!hasConfiguredRecurrence && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[10, 14].map(days => (
                          <button key={days} type="button" onClick={() => setRecurrenceChoice(String(days))}
                            style={{ padding: '9px 4px', borderRadius: '9px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', color: recurrenceChoice === String(days) ? '#111' : 'white', background: recurrenceChoice === String(days) ? 'var(--pink-primary)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {days} dias
                          </button>
                        ))}
                        <button type="button" onClick={() => setRecurrenceChoice('custom')}
                          style={{ padding: '9px 4px', borderRadius: '9px', cursor: 'pointer', fontSize: '10px', fontWeight: '900', color: recurrenceChoice === 'custom' ? '#111' : 'white', background: recurrenceChoice === 'custom' ? 'var(--pink-primary)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          Personalizado
                        </button>
                      </div>
                      {recurrenceChoice === 'custom' && (
                        <input type="number" min="1" max="365" inputMode="numeric" value={customRecurrenceDays}
                          onChange={event => setCustomRecurrenceDays(event.target.value)} placeholder="Cantidad de dias"
                          style={{ width: '100%', marginTop: '8px', height: '38px', borderRadius: '9px', padding: '0 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,160,154,0.25)', color: 'white', fontWeight: '800' }} />
                      )}
                      {recurrenceDaysToSave > 0 && (
                        <div style={{ marginTop: '8px', color: '#30d158', fontSize: '10px', fontWeight: '800' }}>
                          Se enviara un mensaje {recurrenceDaysToSave} dias despues de completar esta visita.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="checkout-action-dock" style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button 
                  onClick={handleCancelOrder}
                  disabled={loading}
                  style={{ 
                    flex: '1', 
                    minWidth: 0,
                    height: isMobile ? '44px' : '54px', 
                    borderRadius: '14px', 
                    fontSize: isMobile ? '11px' : '14px', 
                    gap: '4px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 69, 58, 0.1)',
                    border: '1.5px solid rgba(255, 69, 58, 0.4)',
                    color: '#ff453a',
                    fontWeight: '900',
                    cursor: 'pointer',
                    transition: '0.3s',
                    padding: isMobile ? '0 10px' : '0 16px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 69, 58, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 69, 58, 0.1)'}
                >
                  <XCircle size={isMobile ? 14 : 20} style={{ flexShrink: 0 }} /> {isMobile ? 'CANCELAR' : 'CANCELAR'}
                </button>

                <button 
                  onClick={handleProcessCheckout}
                  disabled={loading}
                  className="btn-pink" 
                  style={{ flex: '2', height: isMobile ? '44px' : '54px', borderRadius: '14px', fontSize: isMobile ? '13px' : '15px', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {loading ? (
                    <>
                      <RefreshCcw className="animate-spin" size={isMobile ? 18 : 22} /> PROCESANDO...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={isMobile ? 18 : 22} /> FINALIZAR COBRO
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>

      <JanaDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      {/* Product Selection Modal */}
      <AnimatedModal isOpen={showProductModal}>
        {(overlayClass, cardClass) => (
          <div className={`${overlayClass} checkout-subdialog-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 6200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`${cardClass}`} style={{ maxWidth: '680px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,160,154,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(160deg, var(--bg-secondary, #ffffff) 0%, var(--bg-tertiary, #f6eee9) 100%)', boxShadow: '0 40px 80px rgba(74, 48, 54, 0.15)', color: 'var(--text-primary, #4a3036)' }}>
              
              {/* Header */}
              <div style={{ padding: '28px 28px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(212,160,154,0.2), rgba(212,160,154,0.05))', border: '1px solid rgba(212,160,154,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={18} color="var(--pink-primary)" />
                      </div>
                      <h2 style={{ fontWeight: '900', fontSize: '22px', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Seleccionar Producto</h2>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '46px' }}>
                      {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).length} productos disponibles
                    </p>
                  </div>
                  <button onClick={() => {setShowProductModal(false); setSearchTerm('');}} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(74,48,54,0.06)', border: 'none', color: 'var(--text-primary)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>×</button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} size={16} color="var(--pink-primary)" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', height: '44px', padding: '0 44px', background: 'rgba(212,160,154,0.03)', border: '1px solid rgba(212,160,154,0.2)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Product Grid */}
              <div style={{ padding: '0 28px 28px', overflowY: 'auto', flex: 1 }}>
                {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ShoppingBag size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                    <p>Sin resultados para "{searchTerm}"</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
                    {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                      const isOutOfStock = (item.stock || 0) <= 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => !isOutOfStock && handleAddToCart(item)}
                          disabled={isOutOfStock}
                          style={{
                            padding: '0',
                            borderRadius: '20px',
                            border: isOutOfStock ? '1px solid rgba(255,59,48,0.2)' : '1px solid rgba(212,160,154,0.15)',
                            background: isOutOfStock ? 'rgba(255,59,48,0.03)' : 'rgba(212,160,154,0.02)',
                            textAlign: 'left',
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            opacity: isOutOfStock ? 0.55 : 1,
                            overflow: 'hidden',
                            transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                          }}
                          onMouseEnter={e => { if (!isOutOfStock) { e.currentTarget.style.border = '1px solid rgba(212,160,154,0.5)'; e.currentTarget.style.background = 'rgba(212,160,154,0.06)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(74,48,54,0.08)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.border = isOutOfStock ? '1px solid rgba(255,59,48,0.2)' : '1px solid rgba(212,160,154,0.15)'; e.currentTarget.style.background = isOutOfStock ? 'rgba(255,59,48,0.03)' : 'rgba(212,160,154,0.02)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {/* Image area */}
                          <div style={{ width: '100%', height: '110px', background: 'rgba(212,160,154,0.03)', overflow: 'hidden', position: 'relative' }}>
                            {item.image_url
                              ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isOutOfStock ? 'grayscale(80%)' : 'none', transition: 'transform 0.3s' }} alt="" />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <ShoppingBag size={32} color="rgba(212,160,154,0.2)" />
                                </div>
                            }
                            {/* Stock badge */}
                            <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '3px 8px', borderRadius: '20px', background: isOutOfStock ? 'rgba(255,59,48,0.85)' : 'rgba(48,209,88,0.85)', backdropFilter: 'blur(6px)', fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.3px' }}>
                              {isOutOfStock ? 'AGOTADO' : `×${item.stock}`}
                            </div>
                          </div>

                          {/* Info area */}
                          <div style={{ padding: '12px 14px 14px' }}>
                            <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.3' }}>{item.name}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <span style={{ color: 'var(--pink-primary)', fontWeight: '900', fontSize: '18px' }}>${item.price}</span>
                            </div>
                            {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>≈ {Math.round(item.price * rates.usd).toLocaleString()} Bs.</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Extras Selection Modal */}
      <AnimatedModal isOpen={showExtraModal}>
        {(overlayClass, cardClass) => (
          <div className={`${overlayClass} checkout-subdialog-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 6200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`${cardClass}`} style={{ maxWidth: '520px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,160,154,0.25)', overflow: 'hidden', background: 'linear-gradient(160deg, var(--bg-secondary, #ffffff) 0%, var(--bg-tertiary, #f6eee9) 100%)', boxShadow: '0 40px 80px rgba(74, 48, 54, 0.15)', color: 'var(--text-primary, #4a3036)' }}>
              {/* Header */}
              <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(212,160,154,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(212,160,154,0.2), rgba(212,160,154,0.05))', border: '1px solid rgba(212,160,154,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={20} color="var(--pink-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontWeight: '900', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '2px' }}>Servicios Extras</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{allExtras.length} extras disponibles</p>
                    </div>
                  </div>
                  <button onClick={() => setShowExtraModal(false)} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(74,48,54,0.06)', border: 'none', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>
              {/* Items in a 2-column grid */}
              <div style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                {allExtras.map((extra) => {
                  // Function to get a minimalist Lucide icon based on the service name
                  const getExtraItemConfig = (name) => {
                    const cleanName = name.toLowerCase();
                    if (cleanName.includes('alisado') || cleanName.includes('planchado')) {
                      return { Icon: Wind };
                    }
                    if (cleanName.includes('hidratación') || cleanName.includes('hidratacion') || cleanName.includes('capilar')) {
                      return { Icon: Droplets };
                    }
                    if (cleanName.includes('profundo')) {
                      return { Icon: Waves };
                    }
                    if (cleanName.includes('tratamiento') || cleanName.includes('express')) {
                      return { Icon: ShowerHead };
                    }
                    if (cleanName.includes('mask') || cleanName.includes('mascarilla')) {
                      return { Icon: VenetianMask };
                    }
                    if (cleanName.includes('nariz')) {
                      return { Icon: ScanFace };
                    }
                    if (cleanName.includes('oido') || cleanName.includes('oído') || cleanName.includes('oreja')) {
                      return { Icon: Ear };
                    }
                    if (cleanName.includes('exfoliacion') || cleanName.includes('exfoliación') || cleanName.includes('facial') || cleanName.includes('cutis') || cleanName.includes('limpieza')) {
                      return { Icon: Sparkles };
                    }
                    if (cleanName.includes('barba') || cleanName.includes('afeitado') || cleanName.includes('perfilado') || cleanName.includes('epilacion') || cleanName.includes('epilación') || cleanName.includes('ceja')) {
                      return { Icon: Sparkles };
                    }
                    return { Icon: Zap };
                  };

                  const config = getExtraItemConfig(extra.name);
                  const IconComponent = config.Icon;

                  return (
                    <button
                      key={extra.id}
                      onClick={() => handleAddExtra(extra)}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', 
                        padding: '16px', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(212,160,154,0.15)', 
                        background: 'linear-gradient(145deg, rgba(212,160,154,0.02), rgba(212,160,154,0.01))', 
                        cursor: 'pointer', 
                        textAlign: 'left', 
                        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                        position: 'relative',
                        boxShadow: '0 4px 15px rgba(74,48,54,0.04)'
                      }}
                      onMouseEnter={e => { 
                        e.currentTarget.style.background = 'rgba(212,160,154,0.06)'; 
                        e.currentTarget.style.border = '1px solid rgba(212,160,154,0.6)'; 
                        e.currentTarget.style.transform = 'translateY(-4px)'; 
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(212,160,154,0.1)';
                      }}
                      onMouseLeave={e => { 
                        e.currentTarget.style.background = 'linear-gradient(145deg, rgba(212,160,154,0.02), rgba(212,160,154,0.01))'; 
                        e.currentTarget.style.border = '1px solid rgba(212,160,154,0.15)'; 
                        e.currentTarget.style.transform = 'translateY(0)'; 
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(74,48,54,0.04)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(212,160,154,0.1)' }}>
                          <IconComponent size={20} color="var(--pink-primary)" strokeWidth={1.5} />
                        </div>
                        <div style={{ fontWeight: '900', fontSize: '18px', color: 'var(--pink-primary)', background: 'rgba(212,160,154,0.1)', padding: '4px 10px', borderRadius: '10px' }}>${extra.price}</div>
                      </div>
                      
                      <div style={{ width: '100%' }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: '1.3' }}>{extra.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          {rates?.usd > 0 ? (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>~ {Math.round(extra.price * rates.usd).toLocaleString()} Bs.</div>
                          ) : (
                            <div />
                          )}
                          <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '900', letterSpacing: '0.5px' }}>+ AGREGAR</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Service Modal */}
      <AnimatedModal isOpen={showServiceModal}>
        {(overlayClass, cardClass) => (
          <div className={`${overlayClass} checkout-subdialog-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(74, 48, 54, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 6200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`${cardClass}`} style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,160,154,0.25)', overflow: 'hidden', background: 'linear-gradient(160deg, var(--bg-secondary, #ffffff) 0%, var(--bg-tertiary, #f6eee9) 100%)', boxShadow: '0 40px 80px rgba(74, 48, 54, 0.15)', color: 'var(--text-primary, #4a3036)' }}>
              {/* Header */}
              <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(212,160,154,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(212,160,154,0.25), rgba(212,160,154,0.05))', border: '1px solid rgba(212,160,154,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={20} color="var(--pink-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontWeight: '900', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '2px' }}>Catálogo de Servicios</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{allServices.length} servicios disponibles</p>
                    </div>
                  </div>
                  <button onClick={() => setShowServiceModal(false)} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(74,48,54,0.06)', border: 'none', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>
              {/* Items grid */}
              <div style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
                {allServices.map((service, i) => (
                  <button
                    key={service.id}
                    onClick={() => handleAddService(service)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '18px', borderRadius: '18px', border: '1px solid rgba(212,160,154,0.15)', background: 'rgba(212,160,154,0.03)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,154,0.09)'; e.currentTarget.style.border = '1px solid rgba(212,160,154,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,160,154,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,154,0.03)'; e.currentTarget.style.border = '1px solid rgba(212,160,154,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Accent stripe */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: `linear-gradient(to bottom, hsl(${45 + i * 15}, 80%, 55%), hsl(${45 + i * 15}, 60%, 30%))`, borderRadius: '0 0 0 0' }} />
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(212,160,154,0.12)', border: '1px solid rgba(212,160,154,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <Sparkles size={15} color="var(--pink-primary)" />
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px', lineHeight: '1.3' }}>{service.name}</div>
                    <div style={{ fontWeight: '900', fontSize: '20px', color: 'var(--pink-primary)' }}>${service.price}</div>
                    {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>



      {/* Stylist Select Modal */}
      <AnimatedModal isOpen={showStylistModal}>
        {(overlayClass, cardClass) => (
          <div className={`${overlayClass} checkout-subdialog-overlay checkout-catalog-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 6200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <section className={`${cardClass} checkout-stylist-dialog`} role="dialog" aria-modal="true" aria-labelledby="checkout-stylist-title">
              <header className="checkout-stylist-header">
                <div className="checkout-stylist-heading">
                  <span className="checkout-stylist-icon" aria-hidden="true">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h2 id="checkout-stylist-title">Seleccionar Estilista</h2>
                    <p>
                      {isChangingStylist
                        ? 'Elige la profesional que continuará con esta cita.'
                        : <>Asigna la comisión de <strong>{selectedServiceForStylist?.name || 'este servicio'}</strong>.</>}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="checkout-catalog-close"
                  onClick={() => { setShowStylistModal(false); setIsChangingStylist(false); }}
                  aria-label="Cerrar selección de estilista"
                >
                  &times;
                </button>
              </header>

              {selectedApp && !isChangingStylist && (
                <div className="checkout-express-option">
                  <input 
                    type="checkbox" 
                    id="isExpressCheckbox"
                    checked={isExpressService}
                    onChange={(e) => setIsExpressService(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--pink-primary)' }}
                  />
                  <label htmlFor="isExpressCheckbox">
                    Servicio Express / Add-on (No agendar visualmente)
                  </label>
                </div>
              )}

              <div className="checkout-stylist-grid">
                {allStaff.filter(s => {
                  const roleName = (s.role?.split('|')[0] || '').toLowerCase();
                  return !roleName.includes('admin') && 
                         !roleName.includes('recepcionista') && 
                         !roleName.includes('caja');
                }).map(stylist => (
                  <button 
                    key={stylist.id} 
                    onClick={() => isChangingStylist ? handleChangeStylist(stylist.id) : handleConfirmServiceStylist(stylist.id)} 
                    className="checkout-stylist-card"
                  >
                    <span className="checkout-stylist-avatar" aria-hidden="true">
                      <Sparkles size={18} />
                    </span>
                    <span className="checkout-stylist-name">{stylist.name}</span>
                    <span className="checkout-stylist-select">Seleccionar</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </AnimatedModal>

      <NewClientModal 
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={handleNewClientSuccess}
      />

      {/* Link Citas Modal (Pago Grupal) */}
      <AnimatedModal isOpen={showLinkModal}>
        {(overlayClass, cardClass) => (
          <div className={`${overlayClass} checkout-subdialog-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 6200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`${cardClass} glass-card`} style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', border: '1.5px solid rgba(212,160,154,0.3)', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontWeight: '900', fontSize: '20px' }}>Enlazar Citas en Espera</h2>
                <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px' }}>
                Selecciona los clientes que están en silla o pendientes de cobro para cargarlos a la cuenta de <strong>{selectedApp?.clients?.name}</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }} className="jana-scrollbar">
                {groupedActiveServices.filter(g => g.client_id !== selectedApp?.client_id && !linkedApps.some(la => la.client_id === g.client_id)).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay otros clientes pendientes en silla o por pagar.
                  </div>
                ) : (
                  groupedActiveServices
                    .filter(g => g.client_id !== selectedApp?.client_id && !linkedApps.some(la => la.client_id === g.client_id))
                    .map(group => {
                      const sNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Servicio';
                      const tPrice = group.apps.reduce((acc, a) => acc + (a.total_price !== undefined && a.total_price !== null && Number(a.total_price) > 0 ? Number(a.total_price) : (a.services?.price || 0)), 0);
                      return (
                        <div 
                          key={group.client_id}
                          style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{group.client_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sNames}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '700', color: 'var(--pink-primary)', fontSize: '13px' }}>${Number(tPrice).toFixed(2)}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: {(tPrice * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                            </div>
                            <button 
                              onClick={() => {
                                setLinkedApps([...linkedApps, ...group.apps]);
                                showToast(`Cita de ${group.client_name} enlazada.`);
                              }}
                              className="btn-pink"
                              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900' }}
                            >
                              Enlazar
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowLinkModal(false)} 
                  className="btn-pink" 
                  style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '800' }}
                >
                  LISTO
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      <style>{`
        .hover-item:hover {
          border-color: var(--pink-primary) !important;
          background-color: rgba(212,160,154,0.05) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default CheckoutPOS;
