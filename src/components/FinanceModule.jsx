import React, {  useState, useEffect , useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { getStaffDisplayName } from '../utils/stringUtils';
import { 
  Plus, 
  Minus, 
  Search, 
  Download, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Filter,
  Wallet,
  Calendar,
  ChevronRight,
  Trash2,
  Edit2,
  Eye,
  WalletCards,
  List,
  RefreshCw,
  User,
  Sparkles,
  TrendingUp
} from 'lucide-react';

import { dataService } from '../services/dataService';
import JanaDialog from './JanaDialog';
import JanaDatePicker from './JanaDatePicker';
import MiniLoader from './MiniLoader';
import JanaSelect from './JanaSelect';
import AnimatedModal from './AnimatedModal';
const isTreatment = (val) => String(val).toLowerCase().includes('tratamiento') || String(val).toLowerCase().includes('si');

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getEndOfDay = (date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const parseLocalDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getDateRangeForFilter = (filter, customStart = '', customEnd = '') => {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = getEndOfDay(today);

  if (filter === 'today') return { start: startOfToday, end: endOfToday };

  if (filter === 'yesterday') {
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: yesterday, end: getEndOfDay(yesterday) };
  }

  if (filter === 'this_week') {
    return { start: getStartOfWeek(), end: endOfToday };
  }

  if (filter === 'last_week') {
    const startOfThisWeek = getStartOfWeek();
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - 7);
    const end = new Date(startOfThisWeek);
    end.setMilliseconds(-1);
    return { start, end };
  }

  if (filter === 'this_month') {
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfToday };
  }

  if (filter === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (filter === 'custom') {
    const start = parseLocalDate(customStart);
    const endBase = parseLocalDate(customEnd);
    return {
      start: start ? new Date(start.setHours(0, 0, 0, 0)) : null,
      end: endBase ? getEndOfDay(endBase) : null
    };
  }

  return { start: null, end: null };
};

const FinanceModule = ({ isMobile, currency, rates, staff = [] }) => {
  const payrollRate = Number(rates?.bcv) || Number(rates?.usd) || 550;
  const { showToast } = useNotifs();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes('admin');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions', 'payroll', 'analysis', 'receivables'

  // Accounts Receivable States
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [installmentMethod, setInstallmentMethod] = useState('Efectivo');

  // Transaction Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'
  const [filterStylist, setFilterStylist] = useState('all'); // 'all' or staff ID
  const [filterDate, setFilterDate] = useState('this_week'); // 'all', 'today', 'this_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Cash Closing Filter States
  const [cashCloseDate, setCashCloseDate] = useState('today');
  const [cashCloseStartDate, setCashCloseStartDate] = useState('');
  const [cashCloseEndDate, setCashCloseEndDate] = useState('');
  
  // Payroll Date Filter States
  const [payrollFilterDate, setPayrollFilterDate] = useState('this_week'); // 'this_week', 'last_week', 'custom'
  const [payrollStartDate, setPayrollStartDate] = useState('');
  const [payrollEndDate, setPayrollEndDate] = useState('');
  
  // Custom Dialog State
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'prompt',
    title: '',
    message: '',
    placeholder: '',
    onConfirm: null,
    step: 1, // To handle sequential prompts (desc -> amount)
    tempData: {}
  });

  // Business Logic States (from Excel 2)
  const [fixedCosts, setFixedCosts] = useState(() => {
    const saved = localStorage.getItem('jana_fixed_costs');
    const defaults = { 
      rent: 522, 
      services: 300, 
      payroll: 60, 
      software: 45, 
      marketing: 60, 
      tax: 200, 
      workstations: 3, 
      avgServiceTime: 45, 
      extraCosts: [],
      customLabels: {
        rent: 'Alquiler ($)',
        services: 'Servicios ($)',
        payroll: 'Nómina Fija ($)',
        software: 'Software ($)',
        marketing: 'Marketing ($)',
        tax: 'Impuestos ($)',
        workstations: 'Sillas Activas',
        avgServiceTime: 'Tiempo Prom. (min)'
      }
    };
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return { ...defaults, ...parsed, customLabels: { ...defaults.customLabels, ...parsed.customLabels } };
  });
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [isCostsLocked, setIsCostsLocked] = useState(true);
  const [selectedTxId, setSelectedTxId] = useState(null);

  // Payroll / Nómina States
  const [assistantConfig, setAssistantConfig] = useState(() => {
    const saved = localStorage.getItem('jana_assistant_config');
    const defaults = {
      weeklyVacaUsd: 20,
      splits: {}
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old config if necessary
        if (parsed.baseSalaryUsd && !parsed.weeklyVacaUsd) {
          const weeklyTotal = parsed.baseSalaryUsd / 4;
          const newSplits = {};
          Object.entries(parsed.splits || {}).forEach(([id, pct]) => {
            newSplits[id] = Number((weeklyTotal * (pct / 100)).toFixed(2));
          });
          return {
            weeklyVacaUsd: weeklyTotal,
            splits: newSplits
          };
        }
        return { ...defaults, ...parsed, splits: { ...defaults.splits, ...parsed.splits } };
      } catch (e) {
        console.error("Error parsing assistant config", e);
      }
    }
    return defaults;
  });
  const [isConfiguringPayroll, setIsConfiguringPayroll] = useState(false);
  const [weeklyCloseModal, setWeeklyCloseModal] = useState({
    isOpen: false,
    loading: false,
    success: false,
    error: null
  });
  const [payrollModal, setPayrollModal] = useState({ 
    isOpen: false, 
    staff: null, 
    earnedBs: 0, 
    deductionBs: 0, 
    paymentAmountBs: 0,
    isAbono: false,
    file: null,
    paymentMethod: 'Efectivo ($)'
  });
  const [payrollDetail, setPayrollDetail] = useState({ isOpen: false, staff: null, transactions: [] });
  const [valeModal, setValeModal] = useState({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' });

  useScrollLock(
    isEditingCosts || 
    isConfiguringPayroll || 
    weeklyCloseModal.isOpen || 
    payrollModal.isOpen || 
    payrollDetail.isOpen || 
    valeModal.isOpen ||
    dialog.isOpen
  );

  const handleRegisterVale = async () => {
    if (!valeModal.amountBs || Number(valeModal.amountBs) <= 0) {
      showToast("Ingresa un monto válido para el vale", "warning");
      return;
    }
    
    if (valeModal.maxBalance !== undefined && Number(valeModal.amountBs) > valeModal.maxBalance) {
      showToast(`No puedes dar un vale mayor al saldo disponible (${valeModal.maxBalance} Bs)`, "warning");
      return;
    }

    try {
      setLoading(true);
      const amountBs = Number(valeModal.amountBs);
      const amountUsd = amountBs / payrollRate;
      const chosenMethod = valeModal.paymentMethod || 'Efectivo ($)';
      
      const newTx = {
        description: `ADELANTO VALE - Estilista: ${valeModal.staff.name} (${chosenMethod})`,
        amount: amountUsd,
        type: 'expense',
        category: 'Vales Estilistas',
        currency: 'USD',
        exchange_rate: payrollRate,
        metadata: {
          staffId: valeModal.staff.id,
          amountBs: amountBs,
          isVale: true,
          paymentMethod: chosenMethod
        }
      };
      
      await dataService.addTransaction(newTx);
      
      // Sincronizar Vale con Google Sheets de forma dinámica
      try {
        const isUsdMethod = ['Efectivo ($)', 'Zelle', 'Binance', 'Zinli'].includes(chosenMethod);
        const formattedMethod = chosenMethod.includes('($)') || chosenMethod.includes('(Bs)')
          ? chosenMethod
          : `${chosenMethod} (${isUsdMethod ? '$' : 'Bs'})`;

        await dataService.syncValeToSheets({
          fecha: new Date().toLocaleDateString('es-VE'),
          estilista: valeModal.staff.name,
          vale: amountBs,
          montoUsd: isUsdMethod ? `${amountUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}$` : "0,00$",
          montoBs: !isUsdMethod ? `${amountBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}Bs.` : "0,00Bs.",
          metodoPagoUsd: isUsdMethod ? formattedMethod : "No aplica",
          metodoPagoBs: !isUsdMethod ? formattedMethod : "No aplica",
          servicio: "Adelanto (Vale)",
          cliente: "ADELANTO VALE",
          cedula: "S/C",
          tratamiento: 0,
          tasa: `${payrollRate.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}Bs./$`
        });
      } catch (sheetErr) {
        console.error("Error al sincronizar vale a Sheets:", sheetErr);
      }

      showToast(`Vale de ${amountBs} Bs registrado con éxito para ${valeModal.staff.name} en ${chosenMethod}`, 'success');
      setValeModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' });
      fetchTransactions();
    } catch (err) {
      console.error(err);
      showToast("Error al registrar vale", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyCloseExecute = async () => {
    setWeeklyCloseModal(prev => ({ ...prev, loading: true, error: null }));
    try {
      const success = await dataService.triggerWeeklyClosing();
      if (success) {
        setWeeklyCloseModal(prev => ({ ...prev, loading: false, success: true }));
        showToast("Cierre semanal ejecutado en Google Sheets con éxito", "success");
      } else {
        throw new Error("El URL de Google Sheets no está configurado.");
      }
    } catch (e) {
      console.error(e);
      setWeeklyCloseModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: e.message || "Error al ejecutar el cierre en Google Sheets." 
      }));
      showToast("Error al ejecutar cierre semanal", "error");
    }
  };

  const eligibleStylists = staff.filter(s => {
    const rolePart = (s.role?.split('|')[0] || '').toLowerCase();
    const isAssistant = rolePart.includes('asistente') || rolePart.includes('tratamiento') || rolePart.includes('operaciones');
    return !isAssistant && (rolePart.includes('estilista') || rolePart.includes('stylist')) && !rolePart.includes('archived') && !rolePart.includes('admin');
  });

  const handleWeeklyTotalChange = (val) => {
    const numVal = Number(val) || 0;
    const count = eligibleStylists.length || 1;
    const equalShare = Number((numVal / count).toFixed(2));
    
    const newSplits = {};
    eligibleStylists.forEach(s => {
      newSplits[s.id] = equalShare;
    });
    
    setAssistantConfig({
      weeklyVacaUsd: numVal,
      splits: newSplits
    });
  };

  const handleStylistSplitChange = (staffId, val) => {
    const numVal = val === '' ? '' : Number(val);
    const newSplits = {
      ...(assistantConfig?.splits || {}),
      [staffId]: numVal
    };
    
    const newTotal = Number(Object.values(newSplits).reduce((sum, v) => sum + (Number(v) || 0), 0).toFixed(2));
    
    setAssistantConfig({
      weeklyVacaUsd: newTotal,
      splits: newSplits
    });
  };

  const loadPaymentPlans = async () => {
    try {
      setLoadingPlans(true);
      const plans = await dataService.getPendingPaymentPlans();
      setPaymentPlans(plans || []);
    } catch (err) {
      console.error("Error loading payment plans:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    if (activeTab === 'receivables') {
      loadPaymentPlans();
    }
  }, [filterDate, startDate, endDate, payrollFilterDate, payrollStartDate, payrollEndDate, activeTab]);

  const handleSaveAssistantConfig = (e) => {
    e.preventDefault();
    const normalizedConfig = {
      ...assistantConfig,
      splits: Object.fromEntries(
        Object.entries(assistantConfig?.splits || {}).map(([staffId, value]) => [staffId, value === '' ? 0 : Number(value) || 0])
      )
    };
    setAssistantConfig(normalizedConfig);
    localStorage.setItem('jana_assistant_config', JSON.stringify(normalizedConfig));
    setIsConfiguringPayroll(false);
    showToast('Configuración de Asistente guardada', 'success');
  };

  const handleProcessPayroll = async () => {
    try {
      setLoading(true);
      const finalAmountBs = payrollModal.isAbono ? payrollModal.paymentAmountBs : (payrollModal.earnedBs - payrollModal.deductionBs);
      const amountUsd = finalAmountBs / payrollRate;
      const chosenMethod = payrollModal.paymentMethod || 'Efectivo ($)';
      
      const newTx = {
        description: `Pago Nómina: ${payrollModal.staff.name}${payrollModal.isAbono ? ' (Abono)' : ''} (Descuento Asist. ${payrollModal.isAbono ? 0 : payrollModal.deductionBs}Bs) [${chosenMethod}]`,
        amount: amountUsd,
        type: 'expense',
        category: 'Pago Nómina',
        currency: 'USD',
        exchange_rate: payrollRate,
        metadata: {
          staffId: payrollModal.staff.id,
          amountBs: finalAmountBs,
          deductionBs: payrollModal.isAbono ? 0 : payrollModal.deductionBs,
          isAbono: payrollModal.isAbono,
          voucherImage: payrollModal.file,
          paymentMethod: chosenMethod
        }
      };
      
      await dataService.addTransaction(newTx);
      showToast(`Nómina pagada con éxito (${chosenMethod})`, 'success');
      setPayrollModal(prev => ({ ...prev, isOpen: false }));
      fetchTransactions();
    } catch(err) {
      console.error(err);
      showToast('Error al pagar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Compress slightly by drawing to canvas
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setPayrollModal(prev => ({ ...prev, file: compressedBase64 }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Calculate earliest required start date based on active filters
      let earliestStart = null;
      
      // 1. Check transaction date filter
      const txRange = getDateRangeForFilter(filterDate, startDate, endDate);
      if (txRange.start) {
        earliestStart = txRange.start;
      }
      
      // 2. Check payroll date filter
      let pStart = null;
      if (payrollFilterDate === 'this_week') {
        pStart = getStartOfWeek();
      } else if (payrollFilterDate === 'last_week') {
        const startOfThisWeek = getStartOfWeek();
        pStart = new Date(startOfThisWeek);
        pStart.setDate(startOfThisWeek.getDate() - 7);
      } else if (payrollFilterDate === 'custom' && payrollStartDate) {
        pStart = new Date(payrollStartDate + 'T00:00:00');
      } else {
        pStart = getStartOfWeek();
      }
      
      if (pStart) {
        if (!earliestStart || pStart < earliestStart) {
          earliestStart = pStart;
        }
      }
      
      // If 'all' is selected for transactions and payroll is not custom, default to last 30 days
      if (filterDate === 'all' && payrollFilterDate !== 'custom') {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        last30Days.setHours(0, 0, 0, 0);
        if (!earliestStart || last30Days < earliestStart) {
          earliestStart = last30Days;
        }
      }

      const startDateStr = earliestStart ? earliestStart.toISOString() : null;
      const data = await dataService.getTransactions(startDateStr);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTransaction = (type) => {
    setDialog({
      isOpen: true,
      type: 'prompt',
      title: type === 'income' ? 'Registrar Ingreso' : 'Registrar Gasto',
      message: 'Ingresa una descripción para este movimiento:',
      placeholder: 'Ej. Compra de Insumos, Propina...',
      step: 1,
      tempData: { type },
      onConfirm: (desc) => {
        if (!desc) {
          setDialog(prev => ({ ...prev, isOpen: false }));
          return;
        }
        // Move to step 2: Amount
        setDialog({
          isOpen: true,
          type: 'prompt',
          title: 'Monto de la Operación',
          message: `¿Cuánto es el monto para: "${desc}"?`,
          placeholder: 'Monto en $ (USD)',
          step: 2,
          tempData: { type, desc },
          onConfirm: async (amount) => {
            if (!amount || isNaN(amount)) {
              showToast("Monto inválido", "error");
              setDialog(prev => ({ ...prev, isOpen: false }));
              return;
            }
            try {
              await dataService.addTransaction({
                description: desc,
                amount: parseFloat(amount),
                type: type,
                category: type === 'income' ? 'Ingreso Manual' : 'Gasto Manual',
                currency: 'USD',
                exchange_rate: 1
              });
              fetchTransactions();
              showToast(`${type === 'income' ? 'Ingreso' : 'Gasto'} registrado correctamente.`);
            } catch (e) {
              showToast('Error al registrar transacción.', 'error');
            } finally {
              setDialog(prev => ({ ...prev, isOpen: false }));
            }
          }
        });
      }
    });
  };

  const handleExport = () => {
    try {
      const headers = ['ID', 'Fecha', 'Descripción', 'Tipo', 'Monto', 'Categoría'];
      const rows = filteredTransactions.map(t => [
        t.id, 
        new Date(t.created_at).toLocaleString('es-VE', { hour12: true }), 
        t.description, 
        t.type, 
        t.amount, 
        t.category
      ]);
      
      let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `finanzas_janastudio_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Reporte exportado con éxito.');
    } catch (e) {
      showToast('Error al exportar reporte.', 'error');
    }
  };

  const handleDeleteTransaction = async (tx) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Eliminar Transacción',
      message: `¿Eliminar esta transacción de ${tx.type === 'expense' ? 'egreso' : 'ingreso'} por $${tx.amount}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await dataService.deleteTransaction(tx.id);
          setTransactions(prev => prev.filter(t => t.id !== tx.id));
          setSelectedTxId(null);
          setDialog(prev => ({ ...prev, isOpen: false }));
          showToast('Transacción eliminada.', 'success');
        } catch (e) {
          showToast('Error al eliminar: ' + e.message, 'error');
        }
      }
    });
  };

  const handleImportHistory = () => {
    showToast("Función de importación de Excel en preparación...", "info");
    // This will trigger a script in the future to read the provided Excel files
  };

  const parseTxExcel = (t) => {
    const meta = t.metadata || {};
    const desc = t.description || "";
    
    let clientName = meta.clientName || desc.split(' - Cliente: ')[1]?.split(' - ')[0] || "S/N";
    let serviceName = meta.serviceName || desc.split(' - Servi: ')[1] || (t.category === 'Ventas JanaStudio' || t.category === 'Ventas Pro' ? "Servicio" : t.description);
    let estilista = meta.staffInvolved?.find(s => s.role?.includes('Estilista') || s.role?.includes('Stylist'))?.name || 
                  meta.staffInvolved?.[0]?.name || 
                  "N/A";
    
    let paymentMethod = meta.paymentMethod || meta.method_bs || meta.method_usd || "Efectivo ($)";
    if (!meta.paymentMethod && !meta.method_bs && !meta.method_usd) {
      const transferAmount = Number(meta.transfer_bs || meta.transferBs || 0);
      const isMixed = meta.mixed_payment || meta.isMixed;
      
      if (transferAmount > 0) {
        paymentMethod = isMixed ? "Mixto ($ + Bs)" : "Pago Móvil / Transferencia";
      } else if (isMixed) {
        paymentMethod = "Mixto ($ + Bs)";
      }
    }
    
    const didTreatment = isTreatment(meta.didTreatment) ? 'Si' : 'No';

    return { clientName, serviceName, estilista, paymentMethod, didTreatment };
  };

  const formatCurrency = (amount, currencySymbol = '$') => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const isHistoricalImport = (transaction) => transaction?.metadata?.importedHistorical === true;

  const operationalTransactions = useMemo(
    () => transactions.filter(t => !isHistoricalImport(t)),
    [transactions]
  );

  const totalIncome = operationalTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const totalExpense = operationalTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const balance = totalIncome - totalExpense;

  const todayOperationalTransactions = useMemo(() => {
    const today = new Date();
    return operationalTransactions.filter(t => new Date(t.created_at).toDateString() === today.toDateString());
  }, [operationalTransactions]);

  const todayIncome = todayOperationalTransactions.reduce((acc, t) => t.type === 'income' ? acc + (t.amount || 0) : acc, 0);
  const todayExpense = todayOperationalTransactions.reduce((acc, t) => t.type === 'expense' ? acc + (t.amount || 0) : acc, 0);

  const cashCloseDateRange = useMemo(
    () => getDateRangeForFilter(cashCloseDate, cashCloseStartDate, cashCloseEndDate),
    [cashCloseDate, cashCloseStartDate, cashCloseEndDate]
  );

  const cashCloseTransactions = useMemo(() => operationalTransactions.filter(t => {
    const txDate = new Date(t.created_at);
    if (cashCloseDateRange.start && txDate < cashCloseDateRange.start) return false;
    if (cashCloseDateRange.end && txDate > cashCloseDateRange.end) return false;
    return true;
  }), [operationalTransactions, cashCloseDateRange]);

  const cashCloseIncome = cashCloseTransactions.reduce((acc, t) => t.type === 'income' ? acc + (t.amount || 0) : acc, 0);
  const cashCloseExpense = cashCloseTransactions.reduce((acc, t) => t.type === 'expense' ? acc + (t.amount || 0) : acc, 0);
  const cashCloseCashUsd = cashCloseTransactions.reduce((acc, t) => (
    acc + Number(t.metadata?.cash_usd || t.metadata?.cashUsd || 0)
  ), 0);
  const cashCloseTransferBs = cashCloseTransactions.reduce((acc, t) => (
    acc + Number(t.metadata?.transfer_bs || t.metadata?.transferBs || 0)
  ), 0);
  const cashCloseCommissionDebtUsd = cashCloseTransactions.reduce((acc, t) => {
    if (t.type !== 'income') return acc;
    return acc + (t.metadata?.staffInvolved?.reduce((sum, s) => sum + Number(s.commissionEarned || 0), 0) || 0);
  }, 0);
  const cashCloseNetRealUsd = cashCloseIncome - cashCloseExpense;

  // Analysis Logic (Excel Replication)
  const analysisData = (() => {
    const stylistStats = {};
    const paymentStats = {};
    const serviceStats = {};

    operationalTransactions.forEach(t => {
      if (t.type !== 'income') return;

      const meta = t.metadata || {};
      const staffInvolved = meta.staffInvolved || [];
      const bsAmount = t.amount * (t.exchange_rate || payrollRate);

      // 1. Payment Methods
      const method = meta.method_usd || meta.method_bs || 'Otro';
      paymentStats[method] = (paymentStats[method] || 0) + t.amount;

      // 2. Stylist Stats (Based on staffInvolved)
      staffInvolved.forEach(s => {
        // Find staff name from staffId if possible, or use ID
        // Note: We might need the full staff list here or just use what's in metadata if we store names there.
        // For now, let's assume we can at least aggregate by ID and we'll need names later.
        const sId = s.staffId;
        if (!stylistStats[sId]) {
          stylistStats[sId] = { id: sId, services: 0, incomeBs: 0, treatments: 0 };
        }
        
        // If they earned commission and it's an appointment (not just tip)
        if (meta.appointment_id) {
          stylistStats[sId].services += 1;
          stylistStats[sId].incomeBs += bsAmount;
          
          // Washing Logic: If this staff member was involved and there was a washer selected
          if (meta.staffInvolved.some(si => si.staffId === sId && si.commissionEarned > 0)) {
             // This is a bit complex without knowing roles here. 
             // We'll simplify: if they are in staffInvolved, they did a service.
          }
        }
      });

      // 3. Service Stats
      if (meta.appointment_id) {
        // Extract service name from description or metadata
        const serviceName = t.description.split(' - ')[1]?.replace('Servi: ', '') || 'Varios';
        serviceStats[serviceName] = (serviceStats[serviceName] || 0) + 1;
      }
    });

    return { stylistStats, paymentStats, serviceStats };
  })();

  const totalFixedCosts = Object.entries(fixedCosts).reduce((acc, [key, val]) => {
    if (['workstations', 'avgServiceTime', 'extraCosts', 'customLabels'].includes(key)) return acc;
    return acc + Number(val || 0);
  }, 0) + (fixedCosts.extraCosts?.reduce((acc, c) => acc + Number(c.value || 0), 0) || 0);

  const netProfit = balance - totalFixedCosts;
  const breakEven = totalFixedCosts / 0.4; // Assuming 40% margin (after 60% commission)
  const avgTicket = totalIncome / (Object.values(analysisData.stylistStats).reduce((acc, b) => acc + b.services, 0) || 1);

  const filteredTransactions = useMemo(() => transactions.filter(t => {
    // 1. Filter by Type
    if (filterType !== 'all' && t.type !== filterType) return false;
    
    // Parse transaction details
    const { clientName, serviceName } = parseTxExcel(t);
    
    // 2. Filter by Service
    if (filterService !== 'all' && serviceName.toLowerCase() !== filterService.toLowerCase()) return false;

    // 3. Filter by Search Query (Client Name / Description)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchClient = clientName.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchClient && !matchDesc) return false;
    }
    
    // 4. Filter by Stylist
    if (filterStylist !== 'all') {
      const isAssociated = t.metadata?.staffInvolved?.some(s => String(s.staffId) === String(filterStylist));
      if (!isAssociated) return false;
    }
    
    // 5. Filter by Date
    if (filterDate !== 'all') {
      const txDate = new Date(t.created_at);
      const { start, end } = getDateRangeForFilter(filterDate, startDate, endDate);
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;
    }
    
    return true;
  }), [transactions, filterType, filterService, searchQuery, filterStylist, filterDate, startDate, endDate]);

  const uniqueServices = useMemo(() => (
    Array.from(new Set(transactions.map(t => parseTxExcel(t).serviceName).filter(Boolean)))
  ), [transactions]);

  const payrollDateRange = useMemo(() => {
    let dateFilterStart;
    let dateFilterEnd;

    if (payrollFilterDate === 'this_week') {
      dateFilterStart = getStartOfWeek();
      dateFilterEnd = new Date();
    } else if (payrollFilterDate === 'last_week') {
      const startOfThisWeek = getStartOfWeek();
      dateFilterStart = new Date(startOfThisWeek);
      dateFilterStart.setDate(startOfThisWeek.getDate() - 7);
      dateFilterEnd = new Date(startOfThisWeek);
      dateFilterEnd.setMilliseconds(-1);
    } else if (payrollFilterDate === 'custom') {
      dateFilterStart = payrollStartDate ? new Date(payrollStartDate + 'T00:00:00') : getStartOfWeek();
      dateFilterEnd = payrollEndDate ? new Date(payrollEndDate + 'T23:59:59') : new Date();
    } else {
      dateFilterStart = getStartOfWeek();
      dateFilterEnd = new Date();
    }

    return { dateFilterStart, dateFilterEnd };
  }, [payrollFilterDate, payrollStartDate, payrollEndDate]);

  const { dateFilterStart, dateFilterEnd } = payrollDateRange;

  const weeklyTransactions = useMemo(() => operationalTransactions.filter(t => {
    const d = new Date(t.created_at);
    return d >= dateFilterStart && d <= dateFilterEnd;
  }), [operationalTransactions, dateFilterStart, dateFilterEnd]);

  const processedPayroll = useMemo(() => staff.map(st => {
    const serviceTransactions = weeklyTransactions.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(st.id)));
    const valesTransactions = operationalTransactions.filter(t => {
      const d = new Date(t.created_at);
      return t.type === 'expense' &&
             t.category === 'Vales Estilistas' &&
             String(t.metadata?.staffId) === String(st.id) &&
             d >= dateFilterStart &&
             d <= dateFilterEnd;
    });
    const staffTransactions = [...serviceTransactions, ...valesTransactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const servicesCount = serviceTransactions.length;
    
    let earnedBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + (s ? (s.commissionBs || 0) + (s.productCommissionBs || 0) : 0);
    }, 0);

    const productCommissionBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + Number(s?.productCommissionBs || 0);
    }, 0);

    const propinasBs = serviceTransactions.reduce((sum, t) => {
      const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(st.id));
      return sum + (s ? (s.tipBs || 0) : 0);
    }, 0);

    const valesBs = valesTransactions.reduce((sum, t) => sum + (t.metadata?.amountBs || 0), 0);
    
    const paidBs = weeklyTransactions.filter(t => t.type === 'expense' && ['Pago Nómina', 'Pago NÃ³mina'].includes(t.category) && String(t.metadata?.staffId) === String(st.id)).reduce((sum, t) => sum + (t.metadata?.amountBs || 0) + (t.metadata?.deductionBs || 0), 0);
    
    const rolePart = (st.role?.split('|')[0] || '').toLowerCase();
    const isAssistant = rolePart.includes('asistente') || rolePart.includes('tratamiento') || rolePart.includes('operaciones');
    const isStylist = !isAssistant && (rolePart.includes('estilista') || rolePart.includes('stylist') || rolePart.includes('socio') || rolePart.includes('estilista') || rolePart.includes('lider'));
    
    let grossIncomeBs = 0;
    let treatmentsCount = 0;
    let treatmentDeductionBs = 0;
    let weeklyAssistanceUsd = 0;
    let weeklyAssistanceBs = 0;
    let netIncomeBs = 0;
    
    if (isStylist) {
      grossIncomeBs = serviceTransactions.reduce((sum, t) => sum + ((t.amount || 0) * (t.exchange_rate || payrollRate)), 0);
      treatmentsCount = serviceTransactions.filter(t => isTreatment(t.metadata?.didTreatment)).length;
      treatmentDeductionBs = treatmentsCount * payrollRate;
      weeklyAssistanceUsd = assistantConfig?.splits?.[st.id] || 0;
      weeklyAssistanceBs = weeklyAssistanceUsd * payrollRate;
      // Replicar la fórmula canónica de la hoja original. La hoja usa 1,666
      // (no 1,666...), por lo que multiplicar la deducción por 60 % introduce
      // pequeñas diferencias acumuladas en los cierres semanales.
      const commissionPct = Number(st.commission_pct || 60);
      netIncomeBs = (grossIncomeBs * (commissionPct / 100)) - (treatmentDeductionBs / 1.666) - weeklyAssistanceBs;
    } else if (isAssistant) {
      treatmentsCount = serviceTransactions.filter(t => isTreatment(t.metadata?.didTreatment)).length;
      const totalStylistAssistanceUsd = Object.values(assistantConfig?.splits || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
      weeklyAssistanceUsd = totalStylistAssistanceUsd;
      weeklyAssistanceBs = totalStylistAssistanceUsd * payrollRate;
      treatmentDeductionBs = treatmentsCount * payrollRate;
      earnedBs = treatmentDeductionBs + productCommissionBs;
      netIncomeBs = earnedBs + weeklyAssistanceBs;
    } else {
      netIncomeBs = earnedBs;
    }
    
    const balanceBs = netIncomeBs + propinasBs - valesBs - paidBs;
    const netIncomeUsd = netIncomeBs / payrollRate;
    
    return {
      ...st,
      isStylist,
      isAssistant,
      servicesCount,
      treatmentsCount,
      grossIncomeBs,
      treatmentDeductionBs,
      weeklyAssistanceUsd,
      weeklyAssistanceBs,
      earnedBs,
      propinasBs,
      valesBs,
      netIncomeBs,
      netIncomeUsd,
      paidBs,
      balanceBs,
      staffTransactions
    };
  }), [staff, weeklyTransactions, operationalTransactions, dateFilterStart, dateFilterEnd, payrollRate, assistantConfig])
    .filter(s => s.balanceBs !== 0 || s.earnedBs > 0 || s.paidBs > 0 || s.valesBs > 0);

  const janaGrossIncomeBs = processedPayroll.reduce((sum, s) => sum + (s.isStylist ? s.grossIncomeBs : 0), 0);
  const janaNetProfitBs = Math.max(0, processedPayroll.reduce((sum, s) => {
    if (!s.isStylist) return sum;
    const marginPct = 1 - (Number(s.commission_pct || 60) / 100);
    return sum + ((s.grossIncomeBs - s.treatmentDeductionBs) * marginPct);
  }, 0));
  const janaNetProfitUsd = janaNetProfitBs / payrollRate;

  const handleSaveCosts = (e) => {
    e.preventDefault();
    localStorage.setItem('jana_fixed_costs', JSON.stringify(fixedCosts));
    setIsEditingCosts(false);
    showToast("Estructura de costos actualizada.");
  };

  const formatBs = (amount) => {
    return Number(amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cashCloseTotal = cashCloseCashUsd + (cashCloseTransferBs / (rates?.usd || 550)) + cashCloseCommissionDebtUsd;
  const cashCloseCashPct = cashCloseTotal > 0 ? ((cashCloseCashUsd / cashCloseTotal) * 100).toFixed(1) : '0';
  const cashCloseTransferPct = cashCloseTotal > 0 ? (((cashCloseTransferBs / (rates?.usd || 550)) / cashCloseTotal) * 100).toFixed(1) : '0';
  const cashCloseCommissionPct = cashCloseTotal > 0 ? ((cashCloseCommissionDebtUsd / cashCloseTotal) * 100).toFixed(1) : '0';
  const cashCloseNetPct = cashCloseTotal > 0 ? ((cashCloseNetRealUsd / cashCloseTotal) * 100).toFixed(1) : '0';

  const todayMovements = todayOperationalTransactions.slice(0, 5).map(t => {
    const meta = t.metadata || {};
    const rate = Number(t.exchange_rate || rates?.usd || 550);
    const bsAmount = t.amount * rate;
    return {
      id: t.id,
      type: t.type,
      description: t.type === 'income' ? 'Ingreso por servicios' : t.description || 'Gasto',
      amountBs: bsAmount,
      time: new Date(t.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: new Date(t.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
    };
  });

  const daySales = todayIncome * (rates?.usd || 550);
  const dayExpenses = todayExpense * (rates?.usd || 550);
  const dayNet = daySales - dayExpenses;
  const dayTransactions = todayOperationalTransactions.length;
  const dayClients = new Set(todayOperationalTransactions.map(t => t.metadata?.clientName).filter(Boolean)).size || dayTransactions;
  const dayTicket = dayTransactions > 0 ? daySales / dayTransactions : 0;

  return (
    <div className="animate-fade-in mi-enter-up" style={{ paddingBottom: isMobile ? '120px' : '80px' }}>
      {/* Header Section */}
      <div className="mi-enter-up" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        padding: '12px 0 16px 0',
        flexWrap: 'wrap',
        gap: '20px',
        position: 'relative',
        width: '100%'
      }}>
        {/* Background Ambient Glow */}
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(212,160,154,0.18) 0%, rgba(212,160,154,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 }}>
          {!isMobile && (
            <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'var(--magenta-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(160, 80, 106, 0.15)', flexShrink: 0 }}>
              <Wallet size={20} color="white" />
            </div>
          )}
          <div>
            <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
              Finanzas
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
              Control de flujo, pagos y rentabilidad.
            </p>
          </div>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'row' : 'row'
        }}>
          <button className="btn-pink mi-btn" onClick={() => handleManualTransaction('income')} style={{
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px', 
            borderRadius: '12px',
            height: '44px',
            flex: 1,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <Plus size={16} /> Ingreso
          </button>
          <button className="mi-btn" onClick={() => handleManualTransaction('expense')} style={{
            background: 'linear-gradient(145deg, rgba(255, 69, 58, 0.15) 0%, rgba(255, 69, 58, 0.05) 100%)', 
            border: '1px solid rgba(255, 69, 58, 0.3)', 
            color: '#ff6961',
            height: '44px',
            padding: '0 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '14px',
            flex: 1,
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(255, 69, 58, 0.1)'
          }}>
            <Minus size={16} /> Gasto
          </button>
        </div>
      </div>

      {/* Tab Cards */}
      <div className="mi-enter-up mi-delay-1" style={{
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', 
        gap: '16px', 
        marginBottom: '28px'
      }}>
        {/* Transacciones Tab */}
        <div
          className="mi-card"
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: activeTab === 'transactions' ? '2px solid var(--pink-primary)' : '2px solid var(--border-color)',
            background: activeTab === 'transactions' ? 'rgba(196,139,159,0.06)' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: activeTab === 'transactions' ? 'rgba(196,139,159,0.15)' : 'rgba(196,139,159,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pink-primary)', flexShrink: 0
          }}>
            <Wallet size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>Transacciones</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Movimientos y cierres de caja</div>
          </div>
        </div>

        {/* Nómina y Pagos Tab */}
        <div
          className="mi-card"
          onClick={() => setActiveTab('payroll')}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: activeTab === 'payroll' ? '2px solid var(--pink-primary)' : '2px solid var(--border-color)',
            background: activeTab === 'payroll' ? 'rgba(196,139,159,0.06)' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: activeTab === 'payroll' ? 'rgba(196,139,159,0.15)' : 'rgba(196,139,159,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pink-primary)', flexShrink: 0
          }}>
            <List size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>Nómina y Pagos</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Salarios y pagos al equipo</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Pendiente</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--pink-primary)' }}>Bs. {formatBs(processedPayroll.reduce((sum, s) => sum + Math.max(0, s.balanceBs), 0))}</div>
          </div>
        </div>

        {/* Rentabilidad Tab */}
        <div
          className="mi-card"
          onClick={() => setActiveTab('analysis')}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: activeTab === 'analysis' ? '2px solid var(--pink-primary)' : '2px solid var(--border-color)',
            background: activeTab === 'analysis' ? 'rgba(196,139,159,0.06)' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: activeTab === 'analysis' ? 'rgba(196,139,159,0.15)' : 'rgba(196,139,159,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pink-primary)', flexShrink: 0
          }}>
            <TrendingUp size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>Rentabilidad</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Rendimiento general</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Ocupación Hoy</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--pink-primary)' }}>{(() => {
              const sillas = Number(fixedCosts.workstations || 3);
              const todayServices = todayOperationalTransactions.filter(t => t.type === 'income' && t.metadata?.appointment_id).length;
              const pct = sillas > 0 ? Math.min(100, (todayServices / (sillas * 6)) * 100) : 0;
              return `${pct.toFixed(0)}%`;
            })()}</div>
          </div>
        </div>

        {/* Cuentas por Cobrar Tab */}
        <div
          className="mi-card"
          onClick={() => setActiveTab('receivables')}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: activeTab === 'receivables' ? '2px solid var(--pink-primary)' : '2px solid var(--border-color)',
            background: activeTab === 'receivables' ? 'rgba(196,139,159,0.06)' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            backgroundColor: activeTab === 'receivables' ? 'rgba(196,139,159,0.15)' : 'rgba(196,139,159,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pink-primary)', flexShrink: 0
          }}>
            <WalletCards size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>Por Cobrar</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Cuotas y financiamientos</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Pendiente</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#ff453a' }}>
              ${paymentPlans.reduce((sum, p) => sum + Number(p.remaining_balance || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', gap: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
          {/* LEFT COLUMN — Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Stats Cards Grid */}
            <section className="mi-enter-up mi-delay-2" style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '28px'
            }}>
              <div className="mi-stat" style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                background: 'white'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={14} color="var(--pink-primary)" />
                  </div>
                  SALDO ACTUAL
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  ${formatBs(balance)} USD
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginTop: '4px' }}>Ref: Bs. {formatBs(balance * (rates?.usd || 550))}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '4px' }}>
                  vs ayer <span style={{ color: '#32d74b' }}>&#8593;</span> 5.6%
                </div>
              </div>

              <div className="mi-stat mi-delay-1" style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                background: 'white'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowUpCircle size={14} color="var(--pink-primary)" />
                  </div>
                  INGRESOS HOY
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  Bs. {formatBs(todayIncome * (rates?.usd || 550))}
                </div>
                <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '4px' }}>
                  vs ayer <span style={{ color: '#32d74b' }}>&#8593;</span> 12.4%
                </div>
              </div>

              <div style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                background: 'white'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowDownCircle size={14} color="var(--pink-primary)" />
                  </div>
                  EGRESOS HOY
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  Bs. {formatBs(todayExpense * (rates?.usd || 550))}
                </div>
                <div style={{ fontSize: '11px', color: '#ff453a', fontWeight: '700', marginTop: '4px' }}>
                  vs ayer <span style={{ color: '#ff453a' }}>&#8595;</span> 8.2%
                </div>
              </div>

              <div style={{
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                background: 'white'
              }}>
                <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WalletCards size={14} color="var(--pink-primary)" />
                  </div>
                  CAJA DISPONIBLE
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  Bs. {formatBs((balance - totalExpense) * (rates?.usd || 550))}
                </div>
                <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '4px' }}>
                  vs ayer <span style={{ color: '#32d74b' }}>&#8593;</span> 6.1%
                </div>
              </div>
            </section>

            {/* Cierre de Caja */}
            <section style={{ 
              marginBottom: '28px', 
              padding: '28px', 
              borderRadius: '20px',
              background: 'white',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(196,139,159,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={20} color="var(--pink-primary)" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Cierre de Caja <span style={{ color: 'var(--pink-primary)' }}>JanaStudio</span></h3>
                </div>
                <div style={{ width: isMobile ? '100%' : '220px' }}>
                  <JanaSelect
                    value={cashCloseDate}
                    onChange={setCashCloseDate}
                    options={[
                      { value: 'today', label: 'Hoy' },
                      { value: 'yesterday', label: 'Ayer' },
                      { value: 'this_week', label: 'Esta Semana' },
                      { value: 'last_week', label: 'Semana Pasada' },
                      { value: 'this_month', label: 'Este Mes' },
                      { value: 'last_month', label: 'Mes Pasado' },
                      { value: 'custom', label: 'Rango Personalizado' }
                    ]}
                  />
                </div>
              </div>

              {cashCloseDate === 'custom' && (
                <div className="animate-fade-in" style={{
                  display: 'flex', gap: '16px', alignItems: 'center', padding: '16px',
                  backgroundColor: '#faf5f5', borderRadius: '12px', flexWrap: 'wrap',
                  border: '1px solid var(--border-color)', marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : '1' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
                    <JanaDatePicker value={cashCloseStartDate} onChange={(e) => setCashCloseStartDate(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : '1' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
                    <JanaDatePicker value={cashCloseEndDate} onChange={(e) => setCashCloseEndDate(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ padding: '18px', backgroundColor: '#faf5f5', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EFECTIVO ($)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)' }}>
                    Bs. {formatBs(cashCloseCashUsd * (rates?.usd || 550))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {cashCloseCashPct}% del total
                  </div>
                </div>
                <div style={{ padding: '18px', backgroundColor: '#faf5f5', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAGO MÓVIL (Bs)</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)' }}>
                    Bs. {formatBs(cashCloseTransferBs)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {cashCloseTransferPct}% del total
                  </div>
                </div>
                <div style={{ padding: '18px', backgroundColor: '#faf5f5', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#ff453a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    COMISIONES / DEUDA
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#ff453a' }}>
                    Bs. {formatBs(cashCloseCommissionDebtUsd * (rates?.usd || 550))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {cashCloseCommissionPct}% del total
                  </div>
                </div>
                <div style={{ padding: '18px', backgroundColor: 'rgba(196,139,159,0.06)', borderRadius: '14px', border: '1px solid rgba(196,139,159,0.2)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>NETO REAL</div>
                  <div style={{ fontSize: '22px', fontWeight: '950', color: 'var(--text-primary)' }}>
                    Bs. {formatBs(cashCloseNetRealUsd * (rates?.usd || 550))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {cashCloseNetPct}% del total
                  </div>
                </div>
              </div>
            </section>

            {/* Transactions Section */}
            <div style={{ padding: isMobile ? '20px' : '28px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between', 
                gap: isMobile ? '16px' : '0',
                marginBottom: '24px',
                alignItems: isMobile ? 'flex-start' : 'center'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Historial de Transacciones</h3>
                <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                  <button onClick={handleExport} style={{ 
                    flex: 1,
                    background: '#faf5f5', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-secondary)', 
                    padding: '10px 16px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    gap: '8px', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    <Download size={14} /> Exportar
                  </button>
                  <button onClick={() => setShowFilterPanel(!showFilterPanel)} style={{ 
                    flex: 1,
                    background: showFilterPanel ? 'var(--pink-primary)' : '#faf5f5', 
                    border: '1px solid var(--border-color)', 
                    color: showFilterPanel ? 'white' : 'var(--text-secondary)', 
                    padding: '10px 16px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    gap: '8px', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}>
                    <Filter size={14} /> Filtros
                  </button>
                </div>
              </div>

              {/* Filter Panel */}
              {showFilterPanel && (
                <div className="animate-fade-in" style={{
                  padding: '20px', borderRadius: '14px', marginBottom: '20px',
                  backgroundColor: '#faf5f5', border: '1px solid var(--border-color)',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Buscar Cliente</label>
                      <div style={{ position: 'relative' }}>
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ej. María..." style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', backgroundColor: 'white', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                      </div>
                    </div>
                    <JanaSelect label="Servicio" value={filterService} onChange={setFilterService} options={[{ value: 'all', label: 'Todos' }, ...uniqueServices.map(s => ({ value: s, label: s }))]} />
                    <JanaSelect label="Tipo" value={filterType} onChange={setFilterType} options={[{ value: 'all', label: 'Todos' }, { value: 'income', label: 'Ingresos' }, { value: 'expense', label: 'Egresos' }]} />
                    <JanaSelect label="Estilista" value={filterStylist} onChange={setFilterStylist} options={[{ value: 'all', label: 'Todos' }, ...staff.filter(s => { const r = s.role?.toLowerCase() || ''; return r.includes('stylist') || r.includes('estilista'); }).map(s => ({ value: s.id, label: s.name }))]} />
                    <JanaSelect label="Fecha" value={filterDate} onChange={setFilterDate} options={[{ value: 'all', label: 'Todo' }, { value: 'today', label: 'Hoy' }, { value: 'this_week', label: 'Esta Semana' }, { value: 'this_month', label: 'Este Mes' }, { value: 'custom', label: 'Personalizado' }]} />
                  </div>
                  {filterDate === 'custom' && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
                      <JanaDatePicker value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
                      <JanaDatePicker value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Table */}
              {!isMobile && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>FECHA</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>CLIENTE</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>ESTILISTA</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>SERVICIO</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>MÉTODO DE PAGO</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>TRATAMIENTO</th>
                        <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>MONTO</th>
                        <th style={{ padding: '12px 16px', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay transacciones que coincidan.</td>
                        </tr>
                      ) : filteredTransactions.map((t) => {
                        const { clientName, serviceName, estilista, paymentMethod, didTreatment } = parseTxExcel(t);
                        const rate = Number(t.exchange_rate || rates?.usd || 550);
                        const finalBs = t.metadata?.transfer_bs || t.metadata?.transferBs || (t.amount * rate);
                        return (
                          <tr key={t.id} onClick={() => setSelectedTxId(selectedTxId === t.id ? null : t.id)} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.type === 'income' ? '#32d74b' : '#ff453a' }}></div>
                                <div>
                                  <div style={{ fontWeight: '600' }}>{new Date(t.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)', fontWeight: '800', fontSize: '12px', flexShrink: 0 }}>{(clientName || 'S').charAt(0)}</div>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{clientName}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cliente {t.metadata?.visitCount >= 10 ? 'frecuente' : t.metadata?.visitCount >= 3 ? 'frecuente' : 'nueva'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '11px', flexShrink: 0 }}>{(estilista || 'N').charAt(0)}</div>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{estilista}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{serviceName}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: paymentMethod?.includes('Móvil') || paymentMethod?.includes('Pago') ? 'rgba(196,139,159,0.12)' : 'rgba(50,215,75,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                  {paymentMethod?.includes('Móvil') || paymentMethod?.includes('Pago') ? '📱' : '💵'}
                                </div>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{paymentMethod}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{paymentMethod?.includes('Móvil') ? 'Banco de Venezuela' : paymentMethod?.includes('Transferencia') ? 'Mercantil' : ''}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: didTreatment === 'Si' ? 'var(--pink-primary)' : 'var(--text-muted)', backgroundColor: didTreatment === 'Si' ? 'rgba(196,139,159,0.1)' : 'transparent', padding: '4px 10px', borderRadius: '6px' }}>
                                {didTreatment === 'Si' ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: t.type === 'expense' ? '#ff453a' : 'var(--text-primary)' }}>
                                {t.type === 'expense' ? '-' : ''}{formatBs(finalBs)} Bs.
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>⋯</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile Cards */}
              {isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {filteredTransactions.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay transacciones.</div>
                  ) : filteredTransactions.map((t) => {
                    const { clientName, serviceName, estilista, paymentMethod, didTreatment } = parseTxExcel(t);
                    const rate = Number(t.exchange_rate || rates?.usd || 550);
                    const finalBs = t.metadata?.transfer_bs || t.metadata?.transferBs || (t.amount * rate);
                    return (
                      <div key={t.id} style={{ padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: t.type === 'income' ? '#32d74b' : '#ff453a' }}></div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{clientName}</span>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: t.type === 'expense' ? '#ff453a' : 'var(--text-primary)' }}>
                            {t.type === 'expense' ? '-' : ''}Bs. {formatBs(finalBs)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{serviceName} · {estilista}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span>{new Date(t.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })} {new Date(t.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          <span>{paymentMethod}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredTransactions.length > 5 && (
                <div style={{ textAlign: 'center', marginTop: '16px', padding: '10px' }}>
                  <button onClick={() => {}} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                    Ver todas las transacciones →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Métodos de Pago */}
            <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>Métodos de Pago</h4>
              <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 20px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '140px', height: '140px', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#32d74b" strokeWidth="3" strokeDasharray={`${Number(cashCloseCashPct)} ${100 - Number(cashCloseCashPct)}`} strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--pink-primary)" strokeWidth="3" strokeDasharray={`${Number(cashCloseTransferPct)} ${100 - Number(cashCloseTransferPct)}`} strokeDashoffset={`-${cashCloseCashPct}`} />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ff9500" strokeWidth="3" strokeDasharray={`${Number(cashCloseCommissionPct)} ${100 - Number(cashCloseCommissionPct)}`} strokeDashoffset={`-${Number(cashCloseCashPct) + Number(cashCloseTransferPct)}`} />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Total</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(cashCloseNetRealUsd * (rates?.usd || 550))}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#32d74b' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Efectivo ($)</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. {formatBs(cashCloseCashUsd * (rates?.usd || 550))}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>{cashCloseCashPct}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--pink-primary)' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Pago Móvil (Bs)</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. {formatBs(cashCloseTransferBs)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>{cashCloseTransferPct}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff9500' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Transferencias (Bs)</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. {formatBs(cashCloseCommissionDebtUsd * (rates?.usd || 550))}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>{cashCloseCommissionPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Últimos Movimientos */}
            <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>Últimos Movimientos</h4>
                <button onClick={() => setActiveTab('transactions')} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>Ver todo</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {todayMovements.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Sin movimientos hoy</div>
                ) : todayMovements.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: m.type === 'income' ? 'rgba(50,215,75,0.1)' : 'rgba(255,69,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.type === 'income' ? <ArrowUpCircle size={14} color="#32d74b" /> : <ArrowDownCircle size={14} color="#ff453a" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{m.description}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.date} · {m.time}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: m.type === 'income' ? '#32d74b' : '#ff453a' }}>
                      {m.type === 'income' ? '+' : '-'}Bs. {formatBs(m.amountBs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen del Día */}
            <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Resumen del Día</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Ventas (Bruto)</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--pink-primary)' }}>Bs. {formatBs(daySales)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Egresos</div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#ff453a' }}>Bs. {formatBs(dayExpenses)}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Neto del Día</div>
                  <div style={{ fontSize: '18px', fontWeight: '950', color: dayNet >= 0 ? '#32d74b' : '#ff453a' }}>Bs. {formatBs(dayNet)}</div>
                </div>
                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px' }}></div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Transacciones</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{dayTransactions}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Clientes Atendidos</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{dayClients}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Ticket Promedio</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--pink-primary)' }}>Bs. {formatBs(dayTicket)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'payroll' && (() => {
        const pendingPayroll = processedPayroll.reduce((sum, s) => sum + Math.max(0, s.balanceBs), 0);
        const paidThisWeek = processedPayroll.reduce((sum, s) => sum + s.paidBs, 0);
        const totalCommissions = processedPayroll.reduce((sum, s) => sum + (s.isStylist ? s.netIncomeBs : 0), 0);
        const totalBonuses = processedPayroll.reduce((sum, s) => sum + s.propinasBs, 0);
        const totalPayroll = processedPayroll.reduce((sum, s) => sum + s.netIncomeBs + s.paidBs + s.valesBs, 0);
        const netProfitPayroll = janaGrossIncomeBs - totalPayroll;
        const stylistCount = processedPayroll.filter(s => s.isStylist).length;
        const assistantCount = processedPayroll.filter(s => s.isAssistant).length;
        const totalMembers = processedPayroll.length;
        const paidCount = processedPayroll.filter(s => s.paidBs > 0 && s.balanceBs <= 0).length;
        const pendingCount = processedPayroll.filter(s => s.balanceBs > 0).length;

        const stylistPercent = totalPayroll > 0 ? (processedPayroll.filter(s => s.isStylist).reduce((sum, s) => sum + s.netIncomeBs, 0) / totalPayroll * 100) : 0;
        const isNailRole = (s) => { const r = (s.role?.split('|')[0] || '').toLowerCase(); return r.includes('uña') || r.includes('nail') || r.includes('manicur'); };
        const isLashRole = (s) => { const r = (s.role?.split('|')[0] || '').toLowerCase(); return r.includes('lash') || r.includes('pestañ'); };
        const nailMembers = processedPayroll.filter(s => !s.isStylist && !s.isAssistant && isNailRole(s));
        const lashMembers = processedPayroll.filter(s => !s.isStylist && !s.isAssistant && isLashRole(s));
        const nailCount = nailMembers.length;
        const lashCount = lashMembers.length;
        const nailPercent = totalPayroll > 0 ? (nailMembers.reduce((sum, s) => sum + s.netIncomeBs, 0) / totalPayroll * 100) : 0;
        const lashPercent = totalPayroll > 0 ? (lashMembers.reduce((sum, s) => sum + s.netIncomeBs, 0) / totalPayroll * 100) : 0;
        const estheticPercent = totalPayroll > 0 ? Math.max(0, 100 - stylistPercent - nailPercent - lashPercent) : 0;

        return (
          <div className="animate-fade-in" style={{ display: 'flex', gap: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* LEFT COLUMN — Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>NÓMINA Y CORTE SEMANAL</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: isMobile ? '100%' : '220px' }}>
                      <JanaSelect value={payrollFilterDate} onChange={setPayrollFilterDate} options={[
                        { value: 'this_week', label: 'Esta Semana (Actual)' },
                        { value: 'last_week', label: 'Semana Pasada' },
                        { value: 'custom', label: 'Rango Personalizado' }
                      ]} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', background: '#faf5f5', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--pink-primary)" />
                      {payrollDateRange.dateFilterStart.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })} - {payrollDateRange.dateFilterEnd.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {payrollFilterDate === 'custom' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Desde:</span>
                      <JanaDatePicker value={payrollStartDate} onChange={(e) => setPayrollStartDate(e.target.value)} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hasta:</span>
                      <JanaDatePicker value={payrollEndDate} onChange={(e) => setPayrollEndDate(e.target.value)} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                  <button onClick={() => setIsConfiguringPayroll(true)} className="btn-pink" style={{ padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                    <Plus size={16} /> Registrar Pago
                  </button>
                  <button onClick={handleExport} style={{ padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', background: '#faf5f5', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? 1 : 'none', justifyContent: 'center', cursor: 'pointer' }}>
                    <Download size={14} /> Exportar Nómina
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={13} color="var(--pink-primary)" />
                    </div>
                    NOMINA PENDIENTE
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(pendingPayroll)}</div>
                  <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '4px' }}>vs semana anterior <span>&#8593;</span> 12.6%</div>
                </div>
                <div style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowUpCircle size={13} color="var(--pink-primary)" />
                    </div>
                    PAGADO ESTA SEMANA
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(paidThisWeek)}</div>
                  <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '4px' }}>vs semana anterior <span>&#8593;</span> 18.4%</div>
                </div>
                <div style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <WalletCards size={13} color="var(--pink-primary)" />
                    </div>
                    COMISIONES DEL EQUIPO
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(totalCommissions)}</div>
                  <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '4px' }}>vs semana anterior <span>&#8593;</span> 9.7%</div>
                </div>
                <div style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={13} color="var(--pink-primary)" />
                    </div>
                    BONOS / AJUSTES
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(totalBonuses)}</div>
                  <div style={{ fontSize: '11px', color: '#ff453a', fontWeight: '700', marginTop: '4px' }}>vs semana anterior <span>&#8595;</span> 5.2%</div>
                </div>
              </div>

              {/* Resultados JanaStudio */}
              <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pink-primary)' }}></div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--pink-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    RESULTADOS JANASTUDIO ({payrollFilterDate === 'this_week' ? 'SEMANAL' : payrollFilterDate === 'last_week' ? 'SEMANA PASADA' : 'PERSONALIZADO'})
                  </span>
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Rendimiento General del Salón</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Resumen financiero del {payrollDateRange.dateFilterStart.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })} - {payrollDateRange.dateFilterEnd.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>INGRESO BRUTO</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(janaGrossIncomeBs)}</div>
                    <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '2px' }}>vs semana anterior <span>&#8593;</span> 14.7%</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>NÓMINA TOTAL</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(totalPayroll)}</div>
                    <div style={{ fontSize: '11px', color: '#ff453a', fontWeight: '700', marginTop: '2px' }}>vs semana anterior <span>&#8595;</span> 6.3%</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>GANANCIA NETA</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#32d74b' }}>Bs. {formatBs(netProfitPayroll > 0 ? netProfitPayroll : 0)}</div>
                    <div style={{ fontSize: '11px', color: '#32d74b', fontWeight: '700', marginTop: '2px' }}>vs semana anterior <span>&#8593;</span> 28.1%</div>
                  </div>
                </div>
              </div>

              {/* Rendimiento Neto por Estilista - Table */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-color)', marginBottom: '24px', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Rendimiento Neto por Estilista (Esta Semana)</h4>
                </div>
                {!isMobile && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>MIEMBRO</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>ROL</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>SERVICIOS / VENTAS</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>COMISIÓN %</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>BONOS</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>DESCUENTOS</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>TOTAL A PAGAR</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>ESTADO</th>
                          <th style={{ padding: '12px 16px', width: '80px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedPayroll.length === 0 ? (
                          <tr><td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay datos de nómina.</td></tr>
                        ) : processedPayroll.map(st => {
                          const status = st.balanceBs <= 0 && st.paidBs > 0 ? 'Pagado' : st.balanceBs > 0 && st.paidBs > 0 ? 'En revisión' : 'Pendiente';
                          const roleColor = st.isAssistant ? '#00bfff' : st.isStylist ? 'var(--pink-primary)' : 'var(--text-muted)';
                          const roleName = st.role?.split('|')[0] || 'Miembro';
                          return (
                            <tr key={st.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)', fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>{st.name.charAt(0)}</div>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{getStaffDisplayName(st)}</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: roleColor, backgroundColor: `${roleColor}12`, padding: '4px 10px', borderRadius: '6px' }}>{roleName}</span>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Bs. {formatBs(st.grossIncomeBs)}</td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{st.commission_pct || 60}%</td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#32d74b' }}>Bs. {formatBs(st.propinasBs)}</td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#ff453a' }}>Bs. {formatBs(st.valesBs)}</td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>${formatBs(st.balanceBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(st.balanceBs)}</span></td>
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', backgroundColor: status === 'Pagado' ? 'rgba(50,215,75,0.1)' : status === 'En revisión' ? 'rgba(255,149,0,0.1)' : 'rgba(255,69,58,0.1)', color: status === 'Pagado' ? '#32d74b' : status === 'En revisión' ? '#ff9500' : '#ff453a' }}>
                                  {status === 'Pagado' ? '✓ ' : status === 'En revisión' ? '◐ ' : '○ '}{status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                  <button onClick={() => setPayrollDetail({ isOpen: true, staff: st, transactions: st.staffTransactions })} style={{ background: 'rgba(196,139,159,0.08)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--pink-primary)' }} title="Ver detalle">
                                    <Eye size={14} />
                                  </button>
                                  <button onClick={() => { setPayrollModal({ isOpen: true, staff: st, earnedBs: st.balanceBs, deductionBs: 0, paymentAmountBs: st.balanceBs, isAbono: false, file: null, paymentMethod: 'Efectivo ($)' }); }} style={{ background: 'rgba(196,139,159,0.08)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--pink-primary)' }} title="Pagar">
                                    <WalletCards size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {isMobile && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {processedPayroll.map(st => {
                      const status = st.balanceBs <= 0 && st.paidBs > 0 ? 'Pagado' : st.balanceBs > 0 && st.paidBs > 0 ? 'En revisión' : 'Pendiente';
                      return (
                        <div key={st.id} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{getStaffDisplayName(st)}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: status === 'Pagado' ? 'rgba(50,215,75,0.1)' : status === 'En revisión' ? 'rgba(255,149,0,0.1)' : 'rgba(255,69,58,0.1)', color: status === 'Pagado' ? '#32d74b' : status === 'En revisión' ? '#ff9500' : '#ff453a' }}>{status}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{st.role?.split('|')[0]} · {st.servicesCount} servicios</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Por pagar:</span>
                            <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>${formatBs(st.balanceBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(st.balanceBs)}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {processedPayroll.length > 0 && (
                  <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <button onClick={() => setPayrollDetail({ isOpen: true, staff: processedPayroll[0], transactions: processedPayroll[0]?.staffTransactions || [] })} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      Ver detalle completo de nómina →
                    </button>
                  </div>
                )}
              </div>

              {/* Historial de Pagos Recientes */}
              <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <History size={14} color="var(--pink-primary)" />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Historial de Pagos Recientes</h4>
                </div>
                {!isMobile && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>FECHA</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>MIEMBRO</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>CONCEPTO</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' }}>MÉTODO DE PAGO</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>MONTO</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>ESTADO</th>
                          <th style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>COMPROBANTE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operationalTransactions.filter(t => t.type === 'expense' && ['Pago Nómina', 'Pago NÃ³mina'].includes(t.category)).slice(0, 10).map((t, idx) => {
                          const staffMember = staff.find(s => String(s.id) === String(t.metadata?.staffId));
                          return (
                            <tr key={t.id || idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                              <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {new Date(t.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(t.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '11px', flexShrink: 0 }}>{(staffMember?.name || 'U').charAt(0)}</div>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{staffMember?.name || 'Desconocido'}</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{t.metadata?.isAbono ? 'Abono' : 'Pago Nómina (Semanal)'}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                                    {(t.metadata?.paymentMethod || '').includes('Móvil') || (t.metadata?.paymentMethod || '').includes('Transferencia') ? '📱' : '💵'}
                                  </div>
                                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{t.metadata?.paymentMethod || 'Efectivo'}</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. {formatBs(t.metadata?.amountBs || 0)}</td>
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(50,215,75,0.1)', color: '#32d74b' }}>✓ Completado</span>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                {t.metadata?.voucherImage ? (
                                  <button style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', cursor: 'pointer' }}>
                                    <Download size={14} />
                                  </button>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {operationalTransactions.filter(t => t.type === 'expense' && ['Pago Nómina', 'Pago NÃ³mina'].includes(t.category)).length === 0 && (
                          <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay pagos registrados aún.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {isMobile && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {operationalTransactions.filter(t => t.type === 'expense' && ['Pago Nómina', 'Pago NÃ³mina'].includes(t.category)).slice(0, 5).map((t, idx) => {
                      const staffMember = staff.find(s => String(s.id) === String(t.metadata?.staffId));
                      return (
                        <div key={t.id || idx} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{staffMember?.name || 'Desconocido'}</span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>Bs. {formatBs(t.metadata?.amountBs || 0)}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.metadata?.isAbono ? 'Abono' : 'Pago Nómina'} · {new Date(t.created_at).toLocaleDateString('es-VE')}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {operationalTransactions.filter(t => t.type === 'expense' && ['Pago Nómina', 'Pago NÃ³mina'].includes(t.category)).length > 5 && (
                  <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <button onClick={() => setActiveTab('transactions')} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                      Ver todo el historial de pagos →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Distribución de Nómina */}
              <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>Distribución de Nómina</h4>
                <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 20px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '140px', height: '140px', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--pink-primary)" strokeWidth="3" strokeDasharray={`${stylistPercent} ${100 - stylistPercent}`} strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ff9500" strokeWidth="3" strokeDasharray={`${nailPercent} ${100 - nailPercent}`} strokeDashoffset={`-${stylistPercent}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#00bfff" strokeWidth="3" strokeDasharray={`${lashPercent} ${100 - lashPercent}`} strokeDashoffset={`-${stylistPercent + nailPercent}`} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#32d74b" strokeWidth="3" strokeDasharray={`${estheticPercent} ${100 - estheticPercent}`} strokeDashoffset={`-${stylistPercent + nailPercent + lashPercent}`} />
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Total</div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-primary)' }}>Bs. {formatBs(totalPayroll)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--pink-primary)' }}></div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Estilistas ({stylistCount})</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{stylistPercent.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff9500' }}></div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Nail Artist ({nailCount})</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{nailPercent.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00bfff' }}></div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Lash Expert ({lashCount})</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{lashPercent.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#32d74b' }}></div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Esteticistas ({Math.max(0, totalMembers - stylistCount - assistantCount - nailCount - lashCount)})</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{estheticPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Próximos Pagos */}
              <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Próximos Pagos</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {processedPayroll.filter(s => s.balanceBs > 0).slice(0, 3).map(st => (
                    <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)', fontWeight: '800', fontSize: '12px', flexShrink: 0 }}>{st.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{getStaffDisplayName(st)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{st.role?.split('|')[0]}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>${formatBs(st.balanceBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(st.balanceBs)}</span></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <Calendar size={10} /> 5 Jul 2026
                        </div>
                      </div>
                    </div>
                  ))}
                  {processedPayroll.filter(s => s.balanceBs > 0).length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Todos los pagos al día</div>
                  )}
                </div>
                {processedPayroll.filter(s => s.balanceBs > 0).length > 3 && (
                  <div style={{ marginTop: '14px', textAlign: 'center' }}>
                    <button onClick={() => setPayrollDetail({ isOpen: true, staff: processedPayroll[0], transactions: processedPayroll[0]?.staffTransactions || [] })} style={{ background: 'none', border: 'none', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                      Ver todos los próximos pagos →
                    </button>
                  </div>
                )}
              </div>

              {/* Resumen Semanal */}
              <div style={{ padding: '24px', borderRadius: '20px', background: 'white', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Resumen Semanal</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={12} color="var(--pink-primary)" />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Miembros liquidados</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#32d74b' }}>{paidCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(255,69,58,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={12} color="#ff453a" />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Pagos pendientes</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#ff453a' }}>{pendingCount}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(196,139,159,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={12} color="var(--pink-primary)" />
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Ticket promedio por estilista</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--pink-primary)' }}>${formatBs((totalMembers > 0 ? totalPayroll / totalMembers : 0) / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(totalMembers > 0 ? totalPayroll / totalMembers : 0)}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeTab === 'analysis' && (() => {
        const ingresosTotales = operationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
        const egresosEstilistas = operationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => {
          return acc + (t.metadata?.staffInvolved?.reduce((sum, s) => sum + (s.commissionEarned || 0), 0) || 0);
        }, 0);
        const profitBruto = ingresosTotales - egresosEstilistas;
        const costosVariables = totalExpense;
        const utilidadNetaCalculada = profitBruto - totalFixedCosts - costosVariables;
        const rentabilidadReal = ingresosTotales > 0 ? (utilidadNetaCalculada / ingresosTotales) * 100 : 0;
        const serviciosTotales = Object.values(analysisData.stylistStats).reduce((acc, b) => acc + b.services, 0) || 0;
        const ticketProm = serviciosTotales > 0 ? ingresosTotales / serviciosTotales : 0;
        const sillas = Number(fixedCosts.workstations || 3);
        const capacidadMensual = sillas * 6 * 4 * 13;
        const ocupacionPct = capacidadMensual > 0 ? (serviciosTotales / capacidadMensual) * 100 : 0;
        const margenContribucion = ingresosTotales - costosVariables - egresosEstilistas;
        const margenPct = ingresosTotales > 0 ? margenContribucion / ingresosTotales : 0;
        const ptoEquilibrio = margenPct > 0 ? totalFixedCosts / margenPct : 0;

        return (
          <div style={{ display: 'flex', gap: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DASHBOARD DE RENTABILIDAD Y OCUPACIÓN</h3>
                <button onClick={() => setIsEditingCosts(true)} className="btn-pink" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', width: isMobile ? '100%' : 'auto' }}>
                  Configurar Costos Fijos
                </button>
              </div>

              <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={14} color="var(--pink-primary)" />
                    </div>
                    UTILIDAD NETA
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a', letterSpacing: '-0.5px' }}>
                    ${formatBs(utilidadNetaCalculada / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(utilidadNetaCalculada)}</span>
                  </div>
                </div>
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={14} color="var(--pink-primary)" />
                    </div>
                    RENTABILIDAD
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: rentabilidadReal >= 0 ? 'var(--pink-primary)' : '#ff453a', letterSpacing: '-0.5px' }}>
                    {rentabilidadReal.toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={14} color="var(--pink-primary)" />
                    </div>
                    PTO. DE EQUILIBRIO
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                    ${formatBs(ptoEquilibrio / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(ptoEquilibrio)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Facturación Necesaria</div>
                </div>
                <div style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <div style={{ fontSize: '10px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={14} color="var(--pink-primary)" />
                    </div>
                    TICKET PROMEDIO
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                    ${formatBs(ticketProm / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(ticketProm)}</span>
                  </div>
                </div>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
                <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>Estructura de Gastos Mensuales</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '700' }}>Ingresos Brutos (Facturación)</span>
                      <span style={{ fontWeight: '800', color: '#32d74b' }}>${formatBs(ingresosTotales / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(ingresosTotales)}</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Egresos Totales a Estilistas</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatBs(egresosEstilistas / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(egresosEstilistas)}</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Fijos Operativos</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatBs(totalFixedCosts / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(totalFixedCosts)}</span></span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', padding: '12px 16px', background: '#faf5f5', borderRadius: '12px', margin: '4px 0' }}>
                      {[
                        { key: 'rent', defaultLabel: 'Alquiler' },
                        { key: 'services', defaultLabel: 'Servicios' },
                        { key: 'payroll', defaultLabel: 'Nómina Fija' },
                        { key: 'software', defaultLabel: 'Software' },
                        { key: 'marketing', defaultLabel: 'Marketing' },
                        { key: 'tax', defaultLabel: 'Impuestos' }
                      ].map(c => (
                        <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {fixedCosts.customLabels?.[c.key] || c.defaultLabel}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatBs((fixedCosts[c.key] || 0) / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(fixedCosts[c.key] || 0)}</span></span>
                        </div>
                      ))}
                      {fixedCosts.extraCosts?.map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {c.label || 'Sin nombre'}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatBs(c.value / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(c.value)}</span></span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Variables (Caja Chica)</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatBs(costosVariables / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(costosVariables)}</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: '900', marginTop: '4px', fontSize: '18px' }}>
                      <span style={{ color: 'var(--pink-primary)' }}>Utilidad Neta</span>
                      <span style={{ color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>${formatBs(utilidadNetaCalculada / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(utilidadNetaCalculada)}</span></span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '20px' }}>Capacidad y Ocupación</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sillas / Estaciones Activas</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{sillas}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{serviciosTotales}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Capacidad Máxima Mensual</span>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{capacidadMensual}</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>NIVEL DE OCUPACIÓN REAL</span>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--pink-primary)' }}>{ocupacionPct.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f0e4e8', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(ocupacionPct, 100)}%`, height: '100%', background: 'var(--pink-gradient)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Rendimiento por Estilista</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Estilista</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>Servicios</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>Total Creado</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>Costo Estilista</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700' }}>Ganancia Salón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(analysisData.stylistStats).filter(b => b.services > 0 || b.incomeBs > 0).map(b => {
                        const staffMember = staff.find(s => String(s.id) === String(b.id));
                        const staffName = staffMember?.name || `Eliminado (${String(b.id).substring(0, 5)})`;
                        const stylistTx = operationalTransactions.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(b.id)));
                        const treatmentsCount = stylistTx.filter(t => isTreatment(t.metadata?.didTreatment)).length;
                        const treatmentDeductionBs = treatmentsCount * payrollRate;
                        const weeklyAssistanceUsd = assistantConfig?.splits?.[b.id] || 0;
                        const weeklyAssistanceBs = weeklyAssistanceUsd * payrollRate;
                        const netCostoBs = (b.incomeBs * (Number(staffMember?.commission_pct || 60) / 100)) - (treatmentDeductionBs / 1.666) - weeklyAssistanceBs;
                        const gananciaSalonBs = Math.max(0, (b.incomeBs - treatmentDeductionBs) * (1 - (Number(staffMember?.commission_pct || 60) / 100)));
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--text-primary)' }}>{staffName}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-primary)' }}>{b.services}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: '700' }}>${formatBs(b.incomeBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(b.incomeBs)}</span></td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ff453a', fontWeight: '700' }}>-${formatBs(netCostoBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: -Bs. {formatBs(netCostoBs)}</span></td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#32d74b', fontWeight: '800' }}>${formatBs(gananciaSalonBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(gananciaSalonBs)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Resumen del Día</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Servicios Hoy</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{todayOperationalTransactions.filter(t => t.type === 'income' && t.metadata?.appointment_id).length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Clientes Atendidos</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{new Set(todayOperationalTransactions.map(t => t.metadata?.clientName).filter(Boolean)).size || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ticket Promedio Hoy</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>Bs. {formatBs(todayOperationalTransactions.filter(t => t.type === 'income').length > 0 ? todayOperationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0) / todayOperationalTransactions.filter(t => t.type === 'income').length : 0)}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Indicadores Clave</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Margen de Contribución</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: margenPct >= 0.3 ? '#32d74b' : '#ff453a' }}>{(margenPct * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f0e4e8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(margenPct * 100, 100)}%`, height: '100%', background: margenPct >= 0.3 ? '#32d74b' : '#ff453a', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Ocupación del Salón</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)' }}>{ocupacionPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f0e4e8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(ocupacionPct, 100)}%`, height: '100%', background: 'var(--pink-gradient)', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Rentabilidad Neta</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: rentabilidadReal >= 0 ? '#32d74b' : '#ff453a' }}>{rentabilidadReal.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#f0e4e8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(Math.abs(rentabilidadReal), 100)}%`, height: '100%', background: rentabilidadReal >= 0 ? '#32d74b' : '#ff453a', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'white' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>Próximos Pagos</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {processedPayroll.filter(s => s.balanceBs > 0).slice(0, 3).map(st => (
                    <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{getStaffDisplayName(st)}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#ff453a' }}>${formatBs(st.balanceBs / (rates?.usd || 550))} USD <span style={{fontSize:'10px', color:'var(--text-muted)'}}>Ref: Bs. {formatBs(st.balanceBs)}</span></span>
                    </div>
                  ))}
                  {processedPayroll.filter(s => s.balanceBs > 0).length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Todos al día</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}


          {/* Costs Config Modal */}
          <AnimatedModal isOpen={isEditingCosts}>
            {(overlayClass, cardClass) => (
              <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '850px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>Configuración de <span className="text-gold">Costos Fijos</span></h3>
                  <button 
                    type="button" 
                    onClick={() => setIsCostsLocked(!isCostsLocked)}
                    style={{ 
                      background: isCostsLocked ? 'rgba(217,70,168,0.1)' : 'var(--pink-primary)', 
                      color: isCostsLocked ? 'var(--pink-primary)' : 'black', 
                      border: 'none', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s ease',
                      boxShadow: !isCostsLocked ? '0 0 15px rgba(217,70,168,0.3)' : 'none'
                    }}
                    title={isCostsLocked ? "Desbloquear para editar" : "Bloquear edición"}
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
                <form onSubmit={handleSaveCosts} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { key: 'rent', defaultLabel: 'Alquiler ($)' },
                    { key: 'services', defaultLabel: 'Servicios ($)' },
                    { key: 'payroll', defaultLabel: 'Nómina Fija ($)' },
                    { key: 'software', defaultLabel: 'Software ($)' },
                    { key: 'marketing', defaultLabel: 'Marketing ($)' },
                    { key: 'tax', defaultLabel: 'Impuestos ($)' },
                    { key: 'workstations', defaultLabel: 'Sillas Activas' },
                    { key: 'avgServiceTime', defaultLabel: 'Tiempo Prom. (min)' },
                  ].map(field => (
                    <div key={field.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '4px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre</label>
                        <input 
                          type="text" 
                          disabled={isCostsLocked}
                          value={fixedCosts.customLabels?.[field.key] || field.defaultLabel} 
                          onChange={(e) => setFixedCosts({ 
                            ...fixedCosts, 
                            customLabels: { ...fixedCosts.customLabels, [field.key]: e.target.value } 
                          })}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{field.key === 'workstations' || field.key === 'avgServiceTime' ? 'Valor' : 'Monto ($)'}</label>
                        <input 
                          type="number" 
                          disabled={isCostsLocked}
                          value={fixedCosts[field.key]} 
                          onChange={(e) => setFixedCosts({ ...fixedCosts, [field.key]: parseFloat(e.target.value) || 0 })}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ gridColumn: 'span 2', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                  {fixedCosts.extraCosts?.map((cost, idx) => (
                    <div key={idx} style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '8px' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre del Gasto Extra</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Internet"
                          value={cost.label} 
                          disabled={isCostsLocked}
                          onChange={(e) => {
                            const newExtras = [...fixedCosts.extraCosts];
                            newExtras[idx].label = e.target.value;
                            setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                          }}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Monto ($)</label>
                        <input 
                          type="number" 
                          value={cost.value} 
                          disabled={isCostsLocked}
                          onChange={(e) => {
                            const newExtras = [...fixedCosts.extraCosts];
                            newExtras[idx].value = parseFloat(e.target.value) || 0;
                            setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                          }}
                          style={{ width: '100%', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 12px', opacity: isCostsLocked ? 0.6 : 1, cursor: isCostsLocked ? 'not-allowed' : 'text', transition: 'all 0.3s' }}
                        />
                      </div>
                      <button 
                        type="button" 
                        disabled={isCostsLocked}
                        onClick={() => {
                          const newExtras = fixedCosts.extraCosts.filter((_, i) => i !== idx);
                          setFixedCosts({ ...fixedCosts, extraCosts: newExtras });
                        }}
                        style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', borderRadius: '10px', width: '44px', height: '44px', cursor: isCostsLocked ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCostsLocked ? 0.4 : 1, transition: 'all 0.3s' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    disabled={isCostsLocked}
                    onClick={() => {
                      setFixedCosts({ 
                        ...fixedCosts, 
                        extraCosts: [...(fixedCosts.extraCosts || []), { label: '', value: 0 }] 
                      });
                    }}
                    style={{ gridColumn: 'span 2', background: 'rgba(217,70,168,0.1)', border: '1px dashed var(--pink-primary)', color: 'var(--pink-primary)', padding: '12px', borderRadius: '12px', cursor: isCostsLocked ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '12px', marginTop: '8px', opacity: isCostsLocked ? 0.5 : 1, transition: 'all 0.3s' }}
                  >
                    + AGREGAR COSTO ADICIONAL
                  </button>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="button" onClick={() => { setIsEditingCosts(false); setIsCostsLocked(true); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                    <button type="submit" disabled={isCostsLocked} className="btn-pink" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', opacity: isCostsLocked ? 0.5 : 1, cursor: isCostsLocked ? 'not-allowed' : 'pointer' }}>Guardar Cambios</button>
                  </div>
                </form>
              </div>
            </div>
            )}
          </AnimatedModal>
          
          {/* Assistant Config Modal */}
          <AnimatedModal isOpen={isConfiguringPayroll}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '500px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '24px' }}>Configuración <span className="text-gold">Sueldo Asistente</span></h3>
                <form onSubmit={handleSaveAssistantConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Monto Semanal del Salario (USD $)</label>
                    <input 
                      type="number" 
                      step="any"
                      value={assistantConfig.weeklyVacaUsd || ''} 
                      onChange={(e) => handleWeeklyTotalChange(e.target.value)} 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '16px' }} 
                    />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Aporte Semanal por Estilista (USD $)</h4>
                    {eligibleStylists.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{getStaffDisplayName(s)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({s.role?.split('|')[0] || 'Miembro'})
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>$</span>
                          <input 
                            type="number" 
                            step="any"
                            value={assistantConfig?.splits?.[s.id] ?? ''}
                            onChange={(e) => handleStylistSplitChange(s.id, e.target.value)} 
                            style={{ width: '100px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center' }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button type="button" onClick={() => setIsConfiguringPayroll(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
                    <button type="submit" className="btn-pink" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Guardar</button>
                  </div>
                </form>
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Weekly Close Modal */}
          <AnimatedModal isOpen={weeklyCloseModal.isOpen}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '450px', width: '100%', borderRadius: '32px', padding: '32px', textAlign: 'center' }}>
                {!weeklyCloseModal.success ? (
                  <>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 69, 58, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ff453a' }}>
                      <RefreshCw size={30} className={weeklyCloseModal.loading ? "animate-spin" : ""} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px' }}>Realizar <span style={{ color: '#ff453a' }}>Cierre Semanal</span></h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
                      {weeklyCloseModal.loading 
                        ? 'Archivando registros de la semana en Google Sheets... Por favor espera.'
                        : 'Esta acción moverá todos los registros de la pestaña "DATOS" a "HISTORIAL" en la hoja de cálculo de Google Sheets y limpiará la hoja activa para el nuevo ciclo.'
                      }
                    </p>

                    {weeklyCloseModal.error && (
                      <div style={{ background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', color: '#ff453a', padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', textAlign: 'left' }}>
                        <strong>Error:</strong> {weeklyCloseModal.error}
                      </div>
                    )}

                    {!weeklyCloseModal.loading && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          ⚠️ Asegúrate de haber completado y registrado todos los pagos de nómina en el CRM antes de archivar.
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        disabled={weeklyCloseModal.loading} 
                        onClick={() => setWeeklyCloseModal({ isOpen: false, loading: false, success: false, error: null })} 
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: weeklyCloseModal.loading ? 'not-allowed' : 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={weeklyCloseModal.loading} 
                        onClick={handleWeeklyCloseExecute} 
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#ff453a', border: 'none', color: 'white', fontWeight: '800', cursor: weeklyCloseModal.loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {weeklyCloseModal.loading ? 'Cerrando...' : 'Confirmar Cierre'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(50, 215, 75, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#32d74b' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px' }}><span style={{ color: '#32d74b' }}>Cierre Exitoso</span></h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                      Las transacciones de la semana se han archivado correctamente en la pestaña "HISTORIAL" de tu hoja de cálculo.
                    </p>
                    <button 
                      onClick={() => setWeeklyCloseModal({ isOpen: false, loading: false, success: false, error: null })} 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--pink-primary)', border: 'none', color: '#000', fontWeight: '900', cursor: 'pointer' }}
                    >
                      Entendido
                    </button>
                  </>
                )}
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Payroll Payment Modal */}
          <AnimatedModal isOpen={payrollModal.isOpen}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '400px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                  {payrollModal.isAbono ? 'Abono a' : 'Pago a'} <span className="text-gold">{payrollModal.staff?.name}</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  {payrollModal.isAbono ? 'Indica el monto que deseas abonar hoy.' : 'Realiza el descuento de asistencia y sube el comprobante.'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Por Cobrar:</span>
                    <span style={{ fontSize: '18px', fontWeight: '900' }}>{formatCurrency(payrollModal.earnedBs, '')} Bs</span>
                  </div>

                  {payrollModal.isAbono ? (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)', display: 'block', marginBottom: '8px' }}>Monto a Abonar (Bs)</label>
                      <input 
                        type="number" 
                        value={payrollModal.paymentAmountBs} 
                        onChange={(e) => setPayrollModal({...payrollModal, paymentAmountBs: Number(e.target.value)})} 
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--pink-primary)', color: 'white', fontSize: '18px', fontWeight: '900' }} 
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Deducción Asistente / Insumos (Bs)</label>
                      <input type="number" value={payrollModal.deductionBs} onChange={(e) => setPayrollModal({...payrollModal, deductionBs: Number(e.target.value)})} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', color: '#ff453a', fontSize: '16px', fontWeight: '900' }} />
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Monto sugerido basado en la configuración de la Vaca.</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--pink-primary)' }}>Total a Transferir:</span>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: '#32d74b' }}>
                      {formatCurrency(payrollModal.isAbono ? payrollModal.paymentAmountBs : (payrollModal.earnedBs - payrollModal.deductionBs), '')} Bs
                    </span>
                  </div>

                  <div>
                    <JanaSelect 
                      label="Método de Pago"
                      value={payrollModal.paymentMethod} 
                      onChange={(val) => setPayrollModal({...payrollModal, paymentMethod: val})} 
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Comprobante de Pago (Foto / Capture)</label>
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: payrollModal.file ? '12px' : '24px 16px', background: payrollModal.file ? 'rgba(50,215,75,0.05)' : 'rgba(217,70,168,0.05)', border: payrollModal.file ? '1px dashed rgba(50,215,75,0.3)' : '1px dashed rgba(217,70,168,0.3)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s' }}>
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: payrollModal.file ? '16px' : '24px' }}>{payrollModal.file ? '✅' : '📸'}</span>
                        <span style={{ color: payrollModal.file ? '#32d74b' : 'var(--pink-primary)', fontWeight: '800', fontSize: '12px' }}>
                          {payrollModal.file ? '¡Comprobante cargado! (Toca para cambiar)' : 'Toca para subir comprobante'}
                        </span>
                      </div>
                    </div>
                    {payrollModal.file && (
                      <div style={{ marginTop: '12px', height: '140px', borderRadius: '16px', overflow: 'hidden', backgroundImage: `url(${payrollModal.file})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid rgba(50,215,75,0.3)' }}></div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button onClick={() => setPayrollModal({...payrollModal, isOpen: false})} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700' }}>Cancelar</button>
                    <button onClick={handleProcessPayroll} className="btn-pink" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Confirmar {payrollModal.isAbono ? 'Abono' : 'Pago'}</button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Registrar Vale Modal */}
          <AnimatedModal isOpen={valeModal.isOpen}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '400px', width: '100%', borderRadius: '32px', padding: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
                  Registrar <span className="text-gold">Vale / Adelanto</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                  Ingresa el monto del adelanto en Bolívares (Bs) para <span style={{ fontWeight: '800', color: 'white' }}>{valeModal.staff?.name}</span>. Este monto se descontará automáticamente de su pago semanal.
                  <br /><br />
                  <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--pink-primary)' }}>Saldo Disponible: {formatCurrency(valeModal.maxBalance || 0, '')} Bs.</span>
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)', display: 'block', marginBottom: '8px' }}>Monto del Vale (Bs)</label>
                    <input 
                      type="number" 
                      value={valeModal.amountBs} 
                      onChange={(e) => setValeModal({...valeModal, amountBs: e.target.value})} 
                      placeholder="Ej. 500, 1000..."
                      style={{ 
                        width: '100%', 
                        padding: '14px', 
                        borderRadius: '12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--pink-primary)', 
                        color: 'white', 
                        fontSize: '18px', 
                        fontWeight: '900',
                        outline: 'none'
                      }} 
                    />
                  </div>

                  <div>
                    <JanaSelect 
                      label="Método de Pago"
                      value={valeModal.paymentMethod} 
                      onChange={(val) => setValeModal({...valeModal, paymentMethod: val})} 
                      options={[
                        { value: 'Efectivo ($)', label: 'Efectivo ($)' },
                        { value: 'Zelle', label: 'Zelle' },
                        { value: 'Pago Móvil', label: 'Pago Móvil' },
                        { value: 'Efectivo (Bs)', label: 'Efectivo (Bs)' },
                        { value: 'Binance', label: 'Binance' },
                        { value: 'Zinli', label: 'Zinli' }
                      ]}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      onClick={() => setValeModal({ isOpen: false, staff: null, amountBs: '', paymentMethod: 'Efectivo ($)' })} 
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleRegisterVale} 
                      className="btn-pink" 
                      style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Registrar Vale
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </AnimatedModal>

          {/* Payroll Detail Modal */}
          <AnimatedModal isOpen={payrollDetail.isOpen}>
            {(overlayClass, cardClass) => (
            <div className={overlayClass} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,12,0.96)', backdropFilter: 'blur(20px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className={`glass-card ${cardClass}`} style={{ maxWidth: '600px', width: '100%', borderRadius: '32px', padding: '32px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Detalle de Servicios: <span className="text-gold">{payrollDetail.staff?.name}</span></h3>
                  <button onClick={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {payrollDetail.transactions.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No hay transacciones registradas.</p>
                  ) : (
                    payrollDetail.transactions.map((t, idx) => {
                                // CASO 1: VALE / ADELANTO (Gasto - En Rojo)
                      if (t.type === 'expense' && t.category === 'Vales Estilistas') {
                        const amountBs = t.metadata?.amountBs || t.amount * payrollRate;
                        const amountUsd = t.amount;
                        const reason = t.description.replace(`ADELANTO VALE - Estilista: ${payrollDetail.staff?.name}`, '').replace(' - ', '').trim();
                        
                        return (
                          <div key={idx} style={{ background: 'rgba(255, 69, 58, 0.04)', padding: '20px', borderRadius: '20px', borderLeft: '4px solid #ff453a', border: '1px solid rgba(255, 69, 58, 0.12)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '900', fontSize: '15px', color: '#ff453a' }}>💸 VALE / ADELANTO</span>
                                {reason && reason !== 'Vale de efectivo' && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>{reason}</span>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#ff453a', fontWeight: '950', fontSize: '16px' }}>-${formatCurrency(amountUsd, '')} USD</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}>Ref: -{formatCurrency(amountBs, '')} Bs</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '12px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                                {t.created_at ? new Date(t.created_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/F'}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>ID: {t.id.slice(0,8)}</span>
                            </div>
                          </div>
                        );
                      }

                      // CASO 2: SERVICIO / VENTA (Ingresos)
                      const descParts = t.description.split(' - ');
                      const clientFromDesc = descParts.find(s => s.toLowerCase().includes('cliente:'))?.split(': ')[1];
                      const serviceFromDesc = descParts.find(s => s.toLowerCase().includes('servi:'))?.split(': ')[1];

                      const clientName = t.metadata?.clientName || clientFromDesc || 'S/N';
                      const serviceName = t.metadata?.serviceName || serviceFromDesc || (t.category === 'Ventas JanaStudio' ? 'Servicio' : t.description);
                      
                      const stInvolved = t.metadata?.staffInvolved?.find(s => String(s.staffId) === String(payrollDetail.staff.id));
                      const commBs = stInvolved?.commissionBs || 0;
                      const commUsd = stInvolved?.commissionEarned || 0;
                      const prodCommBs = stInvolved?.productCommissionBs || 0;
                      const prodCommUsd = stInvolved?.productCommissionEarned || 0;
                      const tipBs = stInvolved?.tipBs || 0;
                      const tipUsd = stInvolved?.tip || 0;
                      
                      const totalEarningsBs = commBs + prodCommBs;
                      const totalEarningsUsd = commUsd + prodCommUsd;

                      // Identificación inteligente del método de pago real basada en montos reales
                      let methodText = 'Efectivo';
                      const cashUsdAmount = Number(t.metadata?.cash_usd) || 0;
                      const transferBsAmount = Number(t.metadata?.transfer_bs) || 0;

                      if (t.metadata?.mixed_payment || (cashUsdAmount > 0 && transferBsAmount > 0)) {
                        const usdPart = t.metadata?.method_usd || 'Efectivo';
                        const bsPart = t.metadata?.method_bs || 'Pago Móvil';
                        methodText = `Mixto (${usdPart} + ${bsPart})`;
                      } else if (transferBsAmount > 0 && cashUsdAmount === 0) {
                        methodText = t.metadata?.method_bs || 'Pago Móvil';
                      } else if (cashUsdAmount > 0 && transferBsAmount === 0) {
                        methodText = t.metadata?.method_usd || 'Efectivo';
                      } else {
                        const mUsd = t.metadata?.method_usd;
                        const mBs = t.metadata?.method_bs;
                        if (mUsd && mUsd !== 'N/A' && mUsd !== 'No aplica') {
                          methodText = mUsd;
                        } else if (mBs && mBs !== 'N/A' && mBs !== 'No aplica') {
                          methodText = mBs;
                        } else {
                          methodText = t.description.split(' - ')[2] || 'Efectivo';
                        }
                      }

                      return (
                        <div key={idx} style={{ 
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)', 
                          padding: '24px', 
                          borderRadius: '24px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          position: 'relative',
                          overflow: 'hidden',
                          marginBottom: '16px'
                        }}>
                          {/* Accent line */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: isTreatment(t.metadata?.didTreatment) ? 'linear-gradient(to bottom, #007aff, #00c6ff)' : 'rgba(255,255,255,0.15)' }}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingLeft: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '900', fontSize: '18px', color: 'white', letterSpacing: '-0.5px' }}>{serviceName}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                                <span style={{ color: 'var(--pink-primary)', fontWeight: '800' }}>{clientName}</span> <span style={{opacity: 0.5, margin: '0 4px'}}>•</span> Costo Total: <span style={{ color: 'white', fontWeight: '800' }}>${(commUsd / 0.4).toFixed(2)} USD</span> <span style={{opacity: 0.6, whiteSpace: 'nowrap'}}>({(commBs / 0.4).toFixed(2)} Bs)</span>
                              </span>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                              <div style={{ color: '#32d74b', fontWeight: '900', fontSize: '20px', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>+${formatCurrency(totalEarningsUsd, '')} USD</div>
                              <div style={{ color: '#32d74b', opacity: 0.9, fontSize: '12px', fontWeight: '800', background: 'rgba(50, 215, 75, 0.15)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', whiteSpace: 'nowrap' }}>Ref: +{formatCurrency(totalEarningsBs, '')} Bs</div>
                            </div>
                          </div>
                          
                           {/* Desglose de ganancias reales del estilista */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px 0', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.03)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Comisión Servicio:</span>
                              <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>${commUsd.toFixed(2)} USD <span style={{opacity: 0.5, whiteSpace: 'nowrap'}}>({commBs.toFixed(2)} Bs)</span></span>
                            </div>
                            {prodCommUsd > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Comisión Productos:</span>
                                <span style={{ color: 'white', fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>${prodCommUsd.toFixed(2)} USD <span style={{opacity: 0.5, whiteSpace: 'nowrap'}}>({prodCommBs.toFixed(2)} Bs)</span></span>
                              </div>
                            )}
                            {tipUsd > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#32d74b', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(50,215,75,0.2)' }}>
                                <span style={{ fontWeight: '800' }}>🍬 Propina:</span>
                                <span style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '13px' }}>+${tipUsd.toFixed(2)} USD <span style={{opacity: 0.7, whiteSpace: 'nowrap'}}>(+{tipBs.toFixed(2)} Bs)</span></span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                              <span style={{opacity: 0.6}}>💳</span> {methodText.toUpperCase()}
                            </span>
                            {isTreatment(t.metadata?.didTreatment) && (
                              <span style={{ fontSize: '11px', background: 'linear-gradient(45deg, rgba(0,122,255,0.15), rgba(0,198,255,0.15))', color: '#64d2ff', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', border: '1px solid rgba(0,122,255,0.3)', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                                ✨ TRATAMIENTO
                              </span>
                            )}
                          </div>

                          {(t.metadata?.extras?.length > 0 || t.metadata?.products_sold?.length > 0) && (
                            <div style={{ padding: '16px', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '16px', marginBottom: '16px', border: '1px dashed rgba(212, 175, 55, 0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--pink-primary)' }}>🛍️</span>
                                <div style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalle de Venta</div>
                              </div>
                              {t.metadata?.extras?.map((ex, eidx) => (
                                <div key={eidx} style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>• {ex.service_extras?.name || 'Extra'} <span style={{opacity:0.5, fontSize:'10px'}}>(Extra)</span></span>
                                  <span style={{ color: 'var(--pink-primary)', fontWeight: '800', fontFamily: 'monospace' }}>+${ex.price.toFixed(2)}</span>
                                </div>
                              ))}
                              {t.metadata?.products_sold?.map((p, pidx) => (
                                <div key={pidx} style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>• {p.name} <span style={{color: 'var(--pink-primary)', opacity: 0.8}}>(x{p.quantity})</span></span>
                                  <span style={{ color: 'var(--pink-primary)', fontWeight: '800', fontFamily: 'monospace' }}>+${(p.price * p.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px', paddingLeft: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{opacity:0.5}}>🕒</span> {t.created_at ? new Date(t.created_at).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : 'S/F'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>ID: {t.id.slice(0,8)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button onClick={() => setPayrollDetail({ isOpen: false, staff: null, transactions: [] })} className="btn-pink" style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '12px', fontWeight: '800' }}>Cerrar</button>
              </div>
            </div>
            )}
          </AnimatedModal>

      {activeTab === 'receivables' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Summary card */}
          <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', padding: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>Financiamiento y Cuentas por Cobrar</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Realiza el seguimiento de saldos pendientes, financiamiento de cuotas y abonos de clientes.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: isMobile ? 'flex-start' : 'flex-end', alignItems: 'center' }}>
              <div style={{ padding: '12px 20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL POR COBRAR</div>
                <div style={{ fontSize: '20px', fontWeight: '950', color: '#ff453a', marginTop: '4px' }}>
                  ${paymentPlans.reduce((sum, p) => sum + Number(p.remaining_balance || 0), 0).toFixed(2)} USD
                </div>
              </div>
              <div style={{ padding: '12px 20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', minWidth: '150px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>PLANES ACTIVOS</div>
                <div style={{ fontSize: '20px', fontWeight: '950', color: 'var(--pink-primary)', marginTop: '4px' }}>
                  {paymentPlans.length} planes
                </div>
              </div>
            </div>
          </div>

          {/* List of plans */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WalletCards size={18} color="var(--pink-primary)" />
              <span>Planes de Pago Activos</span>
            </h4>
            {loadingPlans ? (
              <MiniLoader text="Cargando planes de pago..." />
            ) : paymentPlans.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No hay cuentas por cobrar pendientes.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '900' }}>
                      <th style={{ padding: '12px 8px' }}>CLIENTE</th>
                      <th style={{ padding: '12px 8px' }}>MONTO TOTAL</th>
                      <th style={{ padding: '12px 8px' }}>SALDO PENDIENTE</th>
                      <th style={{ padding: '12px 8px' }}>CUOTAS</th>
                      <th style={{ padding: '12px 8px' }}>ESTADO</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentPlans.map(plan => {
                      const clientName = plan.clients?.name || 'Cliente';
                      const clientCedula = plan.clients?.id_card || 'S/C';
                      const pctPaid = (plan.paid_installments / plan.total_installments) * 100;
                      return (
                        <tr key={plan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '13px' }} className="table-row-hover">
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ fontWeight: '800' }}>{clientName}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>V-{clientCedula}</div>
                          </td>
                          <td style={{ padding: '12px 8px', fontWeight: '700' }}>${Number(plan.total_amount).toFixed(2)} USD</td>
                          <td style={{ padding: '12px 8px', fontWeight: '800', color: '#ff453a' }}>${Number(plan.remaining_balance).toFixed(2)} USD</td>
                          <td style={{ padding: '12px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '800', minWidth: '35px' }}>{plan.paid_installments}/{plan.total_installments}</span>
                              <div style={{ width: '80px', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pctPaid}%`, height: '100%', backgroundColor: 'var(--pink-primary)' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px' }}>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '900',
                              backgroundColor: plan.status === 'completed' ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)',
                              color: plan.status === 'completed' ? '#34c759' : '#ff9500'
                            }}>
                              {plan.status === 'completed' ? 'PAGADO' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                            {plan.remaining_balance > 0 && (
                              <button 
                                onClick={() => {
                                  setSelectedPlanForPayment(plan);
                                  const remainingInstallments = plan.total_installments - plan.paid_installments;
                                  const defaultAmt = remainingInstallments > 0 ? (plan.remaining_balance / remainingInstallments) : plan.remaining_balance;
                                  setInstallmentAmount(Number(defaultAmt.toFixed(2)));
                                }}
                                className="btn-pink"
                                style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', fontWeight: '800' }}
                              >
                                Registrar Pago
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record installment modal */}
      <AnimatedModal isOpen={!!selectedPlanForPayment}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div className={`glass-card ${cardClass}`} style={{ maxWidth: '480px', width: '100%', padding: '28px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h3 style={{ fontWeight: '950', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <WalletCards size={20} color="var(--pink-primary)" />
                  <span>Registrar Cuota</span>
                </h3>
                <button onClick={() => setSelectedPlanForPayment(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {selectedPlanForPayment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>Cliente: {selectedPlanForPayment.clients?.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px' }}>
                      <span>Saldo Pendiente:</span>
                      <span style={{ fontWeight: '900', color: '#ff453a' }}>${Number(selectedPlanForPayment.remaining_balance).toFixed(2)} USD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Cuotas pagadas:</span>
                      <span>{selectedPlanForPayment.paid_installments} de {selectedPlanForPayment.total_installments}</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>MONTO A ABONAR ($)</label>
                    <input 
                      type="number" 
                      value={installmentAmount} 
                      onChange={(e) => setInstallmentAmount(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', height: '38px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0 10px', fontSize: '14px', color: 'white', fontWeight: '800', outline: 'none' }} 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>MÉTODO DE PAGO</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Efectivo', 'Zelle', 'Binance', 'Pago Móvil'].map(m => (
                        <button 
                          key={m}
                          type="button"
                          onClick={() => setInstallmentMethod(m)}
                          style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: installmentMethod === m ? '1.5px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)', background: installmentMethod === m ? 'rgba(212,160,154,0.1)' : 'rgba(255,255,255,0.02)', color: installmentMethod === m ? 'var(--pink-primary)' : 'white', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      if (installmentAmount <= 0) {
                        showToast("El monto a abonar debe ser mayor a 0", "warning");
                        return;
                      }
                      try {
                        setLoadingPlans(true);
                        await dataService.recordInstallmentPayment(selectedPlanForPayment.id, installmentAmount, installmentMethod);
                        showToast("¡Cuota registrada correctamente!", "success");
                        setSelectedPlanForPayment(null);
                        loadPaymentPlans();
                        fetchTransactions(); // Reload transactions lists too!
                      } catch (err) {
                        console.error(err);
                        showToast("Error al registrar cuota", "error");
                      } finally {
                        setLoadingPlans(false);
                      }
                    }}
                    className="btn-pink"
                    style={{ width: '100%', height: '46px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', marginTop: '8px' }}
                  >
                    Confirmar Pago de Cuota
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>
        

      <JanaDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        placeholder={dialog.placeholder}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      <style>{`
        .table-row-hover:hover {
          background-color: rgba(255,255,255,0.02);
        }
      `}</style>
    </div>
  );
};

export default FinanceModule;
