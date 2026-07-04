import React, {  useState, useEffect , useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../hooks/useScrollLock';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
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
import AstroDialog from './AstroDialog';
import AstroDatePicker from './AstroDatePicker';
import AstroSelect from './AstroSelect';
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
  
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' or 'analysis'

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

  useEffect(() => {
    fetchTransactions();
  }, [filterDate, startDate, endDate, payrollFilterDate, payrollStartDate, payrollEndDate]);

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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: isMobile ? '120px' : '80px' }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Finanzas
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Control de flujo y conciliación.</p>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          width: isMobile ? '100%' : 'auto',
          flexDirection: isMobile ? 'row' : 'row' // Keep side-by-side if refined enough
        }}>
          <button className="btn-pink" onClick={() => handleManualTransaction('income')} style={{ 
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
          <button onClick={() => handleManualTransaction('expense')} style={{ 
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

      {/* Tab Selector */}
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? '8px' : '20px', 
        marginBottom: '32px', 
        borderBottom: '1px solid var(--border-color)',
        width: '100%'
      }}>
        <button 
          onClick={() => setActiveTab('transactions')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'transactions' ? 'var(--pink-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'transactions' ? '2px solid var(--pink-primary)' : '2px solid transparent',
            transition: '0.2s'
          }}
        >
          {isMobile ? 'MOVIMIENTOS' : 'TRANSACCIONES'}
        </button>
        <button 
          onClick={() => setActiveTab('payroll')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'payroll' ? 'var(--pink-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'payroll' ? '2px solid var(--pink-primary)' : '2px solid transparent',
            transition: '0.2s'
          }}
        >
          {isMobile ? 'NÓMINA' : 'NÓMINA Y PAGOS'}
        </button>
        <button 
          onClick={() => setActiveTab('analysis')}
          style={{ 
            padding: isMobile ? '12px 4px' : '12px 20px', 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'analysis' ? 'var(--pink-primary)' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: isMobile ? '12px' : '14px',
            cursor: 'pointer',
            flex: isMobile ? 1 : 'none',
            textAlign: 'center',
            borderBottom: activeTab === 'analysis' ? '2px solid var(--pink-primary)' : '2px solid transparent',
            transition: '0.2s'
          }}
        >
          {isMobile ? 'ANÁLISIS' : 'RENTABILIDAD Y OCUPACIÓN'}
        </button>
      </div>

      {activeTab === 'transactions' && (
        <>
        {/* Stats Cards Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
        <div className="glass-card" style={{ 
          textAlign: 'center', 
          padding: isMobile ? '24px' : '32px',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(28, 28, 30, 0.95) 0%, rgba(35, 35, 38, 0.98) 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
        }}>
          <div>
            <div style={{ fontSize: isMobile ? '12px' : '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Actual</div>
            <div style={{ fontSize: isMobile ? '38px' : '44px', fontWeight: '950', color: 'var(--pink-primary)', letterSpacing: '-1px' }}>
              {formatCurrency(balance * (rates?.usd || 550), '')} Bs.
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '4px' }}>
              Ref: ${formatCurrency(balance, '')}
            </div>
          </div>
        </div>
        
        <div className="glass-card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          padding: '24px',
          borderRadius: '24px' 
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            backgroundColor: 'rgba(50, 215, 75, 0.1)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowUpCircle size={28} color="#32d74b" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>INGRESOS (HOY)</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>
              {formatCurrency(todayIncome * (rates?.usd || 550), '')} Bs.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
              Ref: ${formatCurrency(todayIncome, '')}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          padding: '24px',
          borderRadius: '24px' 
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            backgroundColor: 'rgba(255, 69, 58, 0.1)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowDownCircle size={28} color="#ff453a" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EGRESOS (HOY)</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>
              {formatCurrency(todayExpense * (rates?.usd || 550), '')} Bs.
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
              Ref: ${formatCurrency(todayExpense, '')}
            </div>
          </div>
        </div>
      </section>

      {/* Astro Cash Closing (AUTOCONCILIATION) */}
      <section className="glass-card animate-slide-up" style={{ 
        marginBottom: '40px', 
        padding: '32px', 
        borderRadius: '28px',
        background: 'linear-gradient(135deg, rgba(28,28,30,0.8), rgba(217,70,168,0.05))',
        border: '1px solid rgba(217,70,168,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color="black" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '900' }}>Cierre de Caja <span className="text-gold">JanaStudio</span></h3>
          </div>
          <div style={{ width: isMobile ? '100%' : '260px' }}>
            <AstroSelect
              label="Rango de Cierre"
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
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderRadius: '16px',
            flexWrap: 'wrap',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : '1' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
              <AstroDatePicker
                value={cashCloseStartDate}
                onChange={(e) => setCashCloseStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: isMobile ? '1 1 100%' : '1' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
              <AstroDatePicker
                value={cashCloseEndDate}
                onChange={(e) => setCashCloseEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '20px' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>EFECTIVO ($)</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#32d74b' }}>
              {formatCurrency(cashCloseCashUsd * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseCashUsd, '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>PAGO MÓVIL (BS)</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--pink-primary)' }}>
              {formatCurrency(cashCloseTransferBs, '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseTransferBs / (rates?.usd || 550), '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(255,69,58,0.05)', borderRadius: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px' }}>COMISIONES DEUDA</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#ff453a' }}>
              {formatCurrency(cashCloseCommissionDebtUsd * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '11px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseCommissionDebtUsd, '')}
            </div>
          </div>
          <div style={{ padding: '20px', backgroundColor: 'rgba(217,70,168,0.1)', borderRadius: '20px', border: '1px solid var(--pink-primary)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'black', backgroundColor: 'var(--pink-primary)', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginBottom: '4px' }}>NETO REAL</div>
            <div style={{ fontSize: '24px', fontWeight: '950', color: 'white' }}>
              {formatCurrency(cashCloseNetRealUsd * (rates?.usd || 550), '')} <span style={{fontSize: '12px'}}>BS</span>
            </div>
            <div style={{ fontSize: '12px', color: 'white', marginTop: '4px' }}>
              REF: ${formatCurrency(cashCloseNetRealUsd, '')}
            </div>
          </div>
        </div>
      </section>

      {/* Transactions Section */}
      <div className="glass-card" style={{ padding: isMobile ? '20px' : '32px', borderRadius: '28px' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          gap: isMobile ? '16px' : '0',
          marginBottom: '32px',
          alignItems: isMobile ? 'flex-start' : 'center'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Historial de Transacciones</h3>
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={handleExport} style={{ 
              flex: 1,
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px'
            }}>
              <Download size={16} /> Exportar
            </button>
            <button onClick={() => setShowFilterPanel(!showFilterPanel)} style={{ 
              flex: 1,
              background: showFilterPanel ? 'var(--pink-primary)' : 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: showFilterPanel ? 'black' : 'var(--text-secondary)', 
              padding: '10px 16px', 
              borderRadius: '12px', 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: showFilterPanel ? '850' : '600'
            }}>
              <Filter size={16} /> {showFilterPanel ? 'Ocultar Filtros' : 'Filtros'}
            </button>
          </div>
        </div>

        {/* HIGH-END TRANSACTIONS FILTER PANEL */}
        {showFilterPanel && (() => {
          return (
            <div className="glass-card animate-fade-in" style={{
              padding: '20px',
              borderRadius: '20px',
              marginBottom: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                {/* Search Input (Cliente) */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Buscar por Cliente</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej. Luis, Juan..."
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Service Filter */}
                {/* Service Filter */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Servicio"
                    value={filterService}
                    onChange={setFilterService}
                    options={[
                      { value: 'all', label: 'Todos los Servicios' },
                      ...uniqueServices.map(s => ({ value: s, label: s }))
                    ]}
                  />
                </div>

                {/* Type Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Tipo de Movimiento"
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'all', label: 'Todos los Movimientos' },
                      { value: 'income', label: 'Ingresos (+)' },
                      { value: 'expense', label: 'Egresos (-)' }
                    ]}
                  />
                </div>

                {/* Stylist Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Estilista Asignado"
                    value={filterStylist}
                    onChange={setFilterStylist}
                    options={[
                      { value: 'all', label: 'Cualquier Estilista' },
                      ...staff.filter(s => {
                        const role = s.role?.toLowerCase() || '';
                        return role.includes('stylist') || role.includes('estilista') || role.includes('socio') || role.includes('lider');
                      }).map(s => ({ value: s.id, label: s.name }))
                    ]}
                  />
                </div>

                {/* Date Select */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <AstroSelect 
                    label="Fecha"
                    value={filterDate}
                    onChange={setFilterDate}
                    options={[
                      { value: 'all', label: 'Todo el Historial' },
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

              {/* Custom Date Range Picker */}
              {filterDate === 'custom' && (
                <div className="animate-fade-in" style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Desde:</span>
                    <AstroDatePicker 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>Hasta:</span>
                    <AstroDatePicker 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {isMobile ? (
          /* Mobile Card List */
          <div className="astro-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '8px' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No hay transacciones registradas que coincidan.</div>
            ) : filteredTransactions.map((t, idx) => {
              const txDate = new Date(t.created_at);
              const currentTxDateStr = txDate.toLocaleDateString();
              const prevTxDateStr = idx > 0 ? new Date(filteredTransactions[idx-1].created_at).toLocaleDateString() : null;
              const showDateHeader = currentTxDateStr !== prevTxDateStr;
              
              let dateLabel = currentTxDateStr;
              if (showDateHeader) {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (txDate.toDateString() === today.toDateString()) dateLabel = 'Hoy';
                else if (txDate.toDateString() === yesterday.toDateString()) dateLabel = 'Ayer';
                else dateLabel = txDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'short' });
              }

                    const { clientName, serviceName, estilista, paymentMethod, didTreatment } = parseTxExcel(t);
              const isSelected = selectedTxId === t.id;
              
              const isTx = t.category === 'Ingreso Manual' || t.category === 'Gasto Manual' || !t.metadata?.appointment_id;
              
              const rate = Number(t.exchange_rate || rates?.usd || 550);
              const finalBs = t.metadata?.transfer_bs || t.metadata?.transferBs || (t.amount * rate);

              return (
                <React.Fragment key={t.id}>
                  {showDateHeader && (
                    <div style={{ padding: '8px 4px 0px 4px', color: 'var(--pink-primary)', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: idx === 0 ? '0' : '16px' }}>
                      {dateLabel}
                    </div>
                  )}
                  <div 
                    className="glass-card animate-slide-up"
                    style={{
                      padding: '16px',
                      borderRadius: '20px',
                      background: isSelected ? 'linear-gradient(135deg, rgba(217,70,168,0.06) 0%, rgba(28,28,30,0.98) 100%)' : 'rgba(28, 28, 30, 0.98)',
                      border: isSelected ? '1px solid rgba(217,70,168,0.25)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isSelected ? '0 8px 32px 0 rgba(217,70,168,0.05)' : '0 4px 16px 0 rgba(0,0,0,0.25)',
                      marginBottom: '8px'
                    }}
                  >
                    {/* Clickable Header Area */}
                    <div 
                      onClick={() => setSelectedTxId(isSelected ? null : t.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: '6px' }}>
                            {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: '900', color: t.type === 'expense' ? '#f87171' : '#34d399', background: t.type === 'expense' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {t.type === 'expense' ? 'Egreso' : 'Ingreso'}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '850', color: 'white' }}>
                            {clientName || 'S/N'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          {serviceName || t.category}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'right', flexShrink: 0 }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                            {t.type === 'expense' ? '-' : '+'}{formatCurrency(finalBs, '')} Bs.
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', whiteSpace: 'nowrap' }}>
                            Ref: {t.type === 'expense' ? '-' : ''}${formatCurrency(t.amount, '')}
                          </div>
                        </div>
                        <div style={{ color: isSelected ? 'var(--pink-primary)' : 'var(--text-muted)', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                          <span style={{ display: 'block', transform: 'rotate(90deg)' }}>&#10148;</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details Area */}
                    {isSelected && (
                      <div className="animate-history-expand" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                          {/* Detalles del Cliente */}
                          <div className="glass-card" style={{
                            padding: '16px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderLeft: '4px solid var(--pink-primary)'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: 'white', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalles del Cliente</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div>
                                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre</span>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>{clientName}</div>
                              </div>
                              <div>
                                <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cédula</span>
                                <div style={{ fontSize: '13px', fontWeight: '750', color: 'white' }}>{t.metadata?.clientCedula || 'No registrada'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Servicio y Extras */}
                          <div className="glass-card" style={{
                            padding: '16px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderLeft: '4px solid var(--pink-primary)'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: 'white', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicios y Extras</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                              <div>
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio Base</span>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{serviceName}</div>
                              </div>
                              {!isTx && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)' }}>
                                    {formatCurrency(Math.max(0, (t.amount - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0))) * rate, '')} Bs.
                                  </div>
                                </div>
                              )}
                            </div>

                            {t.metadata?.extras?.map((ex, i) => (
                              <div key={`ex-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>+ {ex.name || ex.service_extras?.name} (Extra)</span>
                                <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>+{formatCurrency(ex.price * rate, '')} Bs.</span>
                              </div>
                            ))}

                            {t.metadata?.products_sold?.map((pr, i) => (
                              <div key={`pr-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>+ {pr.name || pr.inventory?.name} x{pr.quantity}</span>
                                <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>+{formatCurrency(pr.price * rate, '')} Bs.</span>
                              </div>
                            ))}

                            {t.metadata?.tips_total > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '6px' }}>
                                <span style={{ color: 'var(--pink-primary)', fontWeight: '700' }}>Propinas Recibidas</span>
                                <span style={{ fontWeight: '850', color: 'var(--pink-primary)' }}>+{formatCurrency(t.metadata.tips_total * rate, '')} Bs.</span>
                              </div>
                            )}
                          </div>

                          {/* Liquidación de Caja */}
                          <div className="glass-card" style={{
                            padding: '16px',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, rgba(20,20,22,0.85) 0%, rgba(10,10,12,0.95) 100%)',
                            border: '1px solid rgba(217,70,168,0.15)'
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Liquidación de Caja</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Venta Bruta</span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>{formatCurrency((t.amount - (t.metadata?.tips_total || 0)) * rate, '')} Bs.</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>TOTAL COBRADO</span>
                              <span style={{ fontSize: '14px', fontWeight: '950', color: 'var(--pink-primary)' }}>{formatCurrency(finalBs, '')} Bs.</span>
                            </div>

                            <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Método de Pago: {paymentMethod}</div>
                            
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '10px' }}>
                              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Distribución de Fondos</span>
                              {t.metadata?.staffInvolved?.map((s, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                  <span>{s.name.split(' ')[0]} ({s.role?.split('|')[0] || 'Personal'})</span>
                                  <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>+{formatCurrency((s.commissionEarned || 0) * rate, '')} Bs.</span>
                                </div>
                              ))}
                              {(!t.metadata?.staffInvolved?.length) && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Operación manual sin personal.</div>
                              )}
                            </div>
                          </div>

                          {isAdmin && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleDeleteTransaction(t)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '8px 14px', color: '#f87171', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          /* Desktop Table View - Ported from HistoryModule styling */
          <div className="glass-card animate-slide-up" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Estilista</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicio</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Método de Pago</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Tratamiento</th>
                    <th style={{ padding: '20px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Monto</th>
                    <th style={{ padding: '20px 24px', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay transacciones registradas que coincidan.</td>
                    </tr>
                  ) : filteredTransactions.map((t, idx) => {
              const { clientName, serviceName, estilista, paymentMethod, didTreatment } = parseTxExcel(t);
                    const isSelected = selectedTxId === t.id;
                    
                    const isTx = t.category === 'Ingreso Manual' || t.category === 'Gasto Manual' || !t.metadata?.appointment_id;
                    const rate = Number(t.exchange_rate || rates?.usd || 550);
                    const finalBs = t.metadata?.transfer_bs || t.metadata?.transferBs || (t.amount * rate);

                    return (
                      <React.Fragment key={t.id}>
                        <tr
                          onClick={() => setSelectedTxId(isSelected ? null : t.id)}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(217,70,168,0.05)' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {new Date(t.created_at).toLocaleDateString([], {day: '2-digit', month: 'numeric'})}
                              <span style={{ fontSize: '9px', fontWeight: '900', color: t.type === 'expense' ? '#f87171' : '#34d399', background: t.type === 'expense' ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t.type === 'expense' ? 'Egreso' : 'Ingreso'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '18px 24px', fontSize: '15px', fontWeight: '800', color: 'white' }}>
                            {clientName}
                          </td>
                          <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            {estilista}
                          </td>
                          <td style={{ padding: '18px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            {serviceName}
                          </td>
                          <td style={{ padding: '18px 24px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                            {paymentMethod}
                          </td>
                          <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '6px', 
                              backgroundColor: didTreatment === 'Si' ? 'rgba(50, 215, 75, 0.1)' : 'rgba(255,255,255,0.05)',
                              color: didTreatment === 'Si' ? '#32d74b' : 'var(--text-muted)',
                              fontWeight: '900',
                              fontSize: '11px'
                            }}>
                              {didTreatment}
                            </span>
                          </td>
                          <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: '950', color: 'var(--pink-primary)' }}>
                              {t.type === 'expense' ? '-' : '+'}{formatCurrency(finalBs, '')} Bs.
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '750', marginTop: '2px' }}>
                              Ref: {t.type === 'expense' ? '-' : ''}${formatCurrency(t.amount, '')}
                            </div>
                          </td>
                          <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                              {isAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(t); }}
                                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Eliminar transacción"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <div style={{ color: isSelected ? 'var(--pink-primary)' : 'var(--text-muted)', transform: isSelected ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size={16} style={{ transform: isSelected ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isSelected && (
                          <tr>
                            <td colSpan="8" style={{ padding: '0 0 16px 0' }}>
                              <div className="glass-card animate-slide-down" style={{ 
                                margin: '0 16px', 
                                padding: '32px 40px', 
                                borderRadius: '0 0 20px 20px',
                                background: 'linear-gradient(180deg, rgba(217,70,168,0.02), transparent)',
                                border: '1px solid rgba(217,70,168,0.08)',
                                borderTop: 'none'
                              }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '32px', alignItems: 'start' }}>
                                  
                                  {/* LEFT COLUMN: Client Details (Top) & Services/Extras (Bottom) */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    
                                    {/* DETALLES DEL CLIENTE */}
                                    <div className="glass-card" style={{
                                      padding: '24px',
                                      borderRadius: '20px',
                                      background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                                      border: '1px solid rgba(255,255,255,0.05)',
                                      borderLeft: '4px solid var(--pink-primary)',
                                      boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{ 
                                          width: '32px', 
                                          height: '32px', 
                                          borderRadius: '10px', 
                                          background: 'rgba(217,70,168,0.15)', 
                                          color: 'var(--pink-primary)', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          border: '1px solid rgba(217,70,168,0.3)'
                                        }}>
                                          <User size={16} color="var(--pink-primary)" />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                          DETALLES DEL CLIENTE
                                        </span>
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px' }}>
                                        <div>
                                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>NOMBRE</span>
                                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--pink-primary)' }}>{clientName}</span>
                                        </div>
                                        <div>
                                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>CÉDULA</span>
                                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{t.metadata?.clientCedula || 'No registrada'}</span>
                                        </div>
                                        <div>
                                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>TELÉFONO</span>
                                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{t.metadata?.clientPhone || 'No registrado'}</span>
                                        </div>
                                      </div>
                                    </div>
 
                                    {/* SERVICIO Y EXTRAS REALIZADOS */}
                                    <div className="glass-card" style={{
                                      padding: '24px',
                                      borderRadius: '20px',
                                      background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                                      border: '1px solid rgba(255,255,255,0.05)',
                                      borderLeft: '4px solid var(--pink-primary)',
                                      boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{ 
                                          width: '32px', 
                                          height: '32px', 
                                          borderRadius: '10px', 
                                          background: 'rgba(217,70,168,0.15)', 
                                          color: 'var(--pink-primary)', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          justifyContent: 'center', 
                                          border: '1px solid rgba(217,70,168,0.3)'
                                        }}>
                                          <Sparkles size={16} color="var(--pink-primary)" />
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                          SERVICIO Y EXTRAS REALIZADOS
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                                          <div>
                                            <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>SERVICIO PRINCIPAL</span>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{serviceName} 🪙</span>
                                          </div>
                                          {!isTx && (
                                            <div style={{ textAlign: 'right' }}>
                                              <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                                                {formatCurrency(Math.max(0, (t.amount - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0))) * rate, '')} Bs.
                                              </span>
                                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>Ref: ${formatCurrency(Math.max(0, (t.amount - (t.metadata?.tips_total || 0) - (t.metadata?.extras?.reduce((acc, ex) => acc + (ex.price || 0), 0) || 0) - (t.metadata?.products_sold?.reduce((acc, pr) => acc + (pr.price || 0), 0) || 0))), '')}</span>
                                            </div>
                                          )}
                                        </div>
 
                                        {/* Extras y productos en listado premium */}
                                        <div>
                                          <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>EXTRAS, ADICIONALES Y PRODUCTOS</span>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {t.metadata?.extras?.map((ex, idx) => (
                                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                  <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--pink-primary)', background: 'rgba(217,70,168,0.1)', borderRadius: '4px', padding: '2px 4px' }}>EXTRA</span>
                                                  <span style={{ color: 'white', fontWeight: '700' }}>{ex.name || ex.service_extras?.name}</span>
                                                </div>
                                                <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>+{formatCurrency(ex.price * rate, '')} Bs.</span>
                                              </div>
                                            ))}
                                            {t.metadata?.products_sold?.map((pr, idx) => (
                                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                  <span style={{ fontSize: '8px', fontWeight: '900', color: '#60a5fa', background: 'rgba(96,165,250,0.1)', borderRadius: '4px', padding: '2px 4px' }}>PRODUCTO</span>
                                                  <span style={{ color: 'white', fontWeight: '700' }}>{pr.name || pr.inventory?.name} ({pr.quantity}u)</span>
                                                </div>
                                                <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>+{formatCurrency(pr.price * rate, '')} Bs.</span>
                                              </div>
                                            ))}
                                            {(!t.metadata?.extras?.length && !t.metadata?.products_sold?.length) && (
                                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ninguno adicional registrado</div>
                                            )}
                                          </div>
                                        </div>
 
                                        {t.metadata?.tips_total > 0 && (
                                          <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--pink-primary)', fontWeight: '700' }}>Propinas Recibidas</span>
                                            <span style={{ fontWeight: '800', color: 'var(--pink-primary)' }}>+{formatCurrency(t.metadata.tips_total * rate, '')} Bs.</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
 
                                  {/* RIGHT COLUMN: LIQUIDACIÓN DE CAJA */}
                                  <div className="glass-card" style={{
                                    padding: '24px',
                                    borderRadius: '24px',
                                    background: 'linear-gradient(135deg, rgba(20,20,22,0.85) 0%, rgba(10,10,12,0.95) 100%)',
                                    border: '1px solid rgba(217,70,168,0.15)',
                                    borderLeft: '4px solid var(--pink-primary)',
                                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
                                      <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        borderRadius: '10px', 
                                        background: 'rgba(217,70,168,0.15)', 
                                        color: 'var(--pink-primary)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        border: '1px solid rgba(217,70,168,0.3)'
                                      }}>
                                        <TrendingUp size={16} color="var(--pink-primary)" />
                                      </div>
                                      <div>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
                                          LIQUIDACIÓN DE CAJA
                                        </span>
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                          Tasa de cambio: {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs.
                                        </span>
                                      </div>
                                    </div>
 
                                    <div>
                                      <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>CONCEPTOS COBRADOS</span>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px dashed rgba(255,255,255,0.06)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', padding: '3px 6px' }}>SERVICIO</span>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: 'white' }}>{serviceName} 🪙</span>
                                          </div>
                                          <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '900', color: 'white' }}>{formatCurrency((t.amount - (t.metadata?.tips_total || 0)) * rate, '')} Bs.</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Ref: ${formatCurrency(t.amount - (t.metadata?.tips_total || 0), '')}</span>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                                          <span style={{ fontSize: '12px', color: 'white', fontWeight: '900', letterSpacing: '0.5px' }}>TOTAL COBRADO</span>
                                          <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '18px', fontWeight: '950', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                                              {formatCurrency(finalBs, '')} Bs.
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>
                                              Ref: ${formatCurrency(t.amount, '')}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
 
                                    {/* Distribución de Fondos */}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                                      <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'block' }}>DISTRIBUCIÓN DE FONDOS</span>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {t.metadata?.staffInvolved?.length > 0 ? t.metadata.staffInvolved.map((s, idx) => {
                                          const commission = Number(s.commissionEarned || 0);
                                          const tip = Number(s.tip || 0);
                                          const staffTotal = commission + tip;
                                          return (
                                            <div key={idx} style={{ padding: '12px', borderRadius: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                                  <span style={{ fontSize: '13px', fontWeight: '850', color: 'white' }}>Total {s.name.split(' ')[0]}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                  <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)' }}>
                                                    +{formatCurrency(staffTotal * rate, '')} Bs.
                                                  </span>
                                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Ref: +${formatCurrency(staffTotal)}</span>
                                                </div>
                                              </div>
                                              
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                                <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '8px', padding: '6px' }}>
                                                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Comisión</div>
                                                  <div style={{ fontSize: '11px', color: 'white', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(commission * rate, '')} Bs.
                                                  </div>
                                                </div>
                                                <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '8px', padding: '6px' }}>
                                                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Propina</div>
                                                  <div style={{ fontSize: '11px', color: 'white', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(tip * rate, '')} Bs.
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }) : (
                                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Operación manual sin personal.</div>
                                        )}
 
                                         {/* Total JanaStudio (Neto) */}
                                        {(() => {
                                          const serviceBase = Math.max(0, (t.amount - (t.metadata?.tips_total || 0)));
                                          const commissions = t.metadata?.staffInvolved?.reduce((sum, s) => sum + Number(s.commissionEarned || 0), 0) || 0;
                                          const astroProfit = serviceBase - commissions;
                                          return (
                                            <div style={{ marginTop: '8px', padding: '14px', borderRadius: '16px', background: 'rgba(217,70,168,0.06)', border: '1px solid rgba(217,70,168,0.15)', boxShadow: 'inset 0 0 12px rgba(217,70,168,0.05)' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pink-primary)' }} />
                                                   <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '0.5px' }}>Total JanaStudio (Neto)</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                  <div style={{ fontSize: '14px', fontWeight: '950', color: 'var(--pink-primary)', whiteSpace: 'nowrap' }}>
                                                    +{formatCurrency(astroProfit * rate, '')} Bs.
                                                  </div>
                                                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                                    Ref: +${formatCurrency(astroProfit)}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
 
                                </div>
                                {isAdmin && (
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <button
                                      onClick={() => handleDeleteTransaction(t)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '8px 14px', color: '#f87171', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={14} /> Eliminar Transacción
                                    </button>
                                  </div>
                                )}
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
      </div>
      </>
      )}


      {activeTab === 'payroll' && (
          <div className="animate-fade-in">
             <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px', margin: 0 }}>NÓMINA Y CORTE SEMANAL</h3>
                
                {/* DATE RANGE FILTER */}
                <div style={{ width: isMobile ? '100%' : '240px' }}>
                  <AstroSelect
                    value={payrollFilterDate}
                    onChange={setPayrollFilterDate}
                    options={[
                      { value: 'this_week', label: 'Esta Semana (Actual)' },
                      { value: 'last_week', label: 'Semana Pasada' },
                      { value: 'custom', label: 'Rango Personalizado' }
                    ]}
                  />
                </div>
                {payrollFilterDate === 'custom' && (
                  <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Desde:</span>
                    <AstroDatePicker 
                      value={payrollStartDate}
                      onChange={(e) => setPayrollStartDate(e.target.value)}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hasta:</span>
                    <AstroDatePicker 
                      value={payrollEndDate}
                      onChange={(e) => setPayrollEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                <button 
                  onClick={() => setIsConfiguringPayroll(true)} 
                  style={{ 
                    padding: '14px 16px', 
                    fontSize: '13px', 
                    borderRadius: '12px',
                    background: 'rgba(217,70,168,0.1)',
                    border: '1px solid rgba(217,70,168,0.3)',
                    color: 'var(--pink-primary)',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: isMobile ? '100%' : 'auto',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <WalletCards size={16} /> Salario Asistente
                </button>
                <button 
                  onClick={() => setWeeklyCloseModal({ isOpen: true, loading: false, success: false, error: null })} 
                  style={{ 
                    padding: '14px 16px', 
                    fontSize: '13px', 
                    borderRadius: '12px', 
                    background: 'rgba(255, 69, 58, 0.1)', 
                    border: '1px solid rgba(255, 69, 58, 0.3)', 
                    color: '#ff453a',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  <RefreshCw size={16} className={weeklyCloseModal.loading ? "animate-spin" : ""} /> Cierre Semanal
                </button>
              </div>
            </div>

            {/* JANASTUDIO GENERAL RESULTS (Resultados JanaStudio) */}
            <div className="glass-card animate-fade-in" style={{ 
              background: 'linear-gradient(135deg, rgba(217,70,168,0.15) 0%, rgba(217,70,168,0.02) 100%)', 
              border: '1px solid rgba(217,70,168,0.3)',
              borderRadius: '24px',
              padding: isMobile ? '20px' : '24px',
              marginBottom: '32px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '16px' : '24px'
            }}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pink-primary)' }}></div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--pink-primary)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Resultados JanaStudio ({
                      payrollFilterDate === 'this_week' ? 'Semanal' :
                      payrollFilterDate === 'last_week' ? 'Semana Pasada' : 'Personalizado'
                    })
                  </span>
                </div>
                <h4 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: 'white', margin: 0, lineHeight: '1.3' }}>Rendimiento General del Salón</h4>
              </div>
              
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '40px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-start' : 'flex-end', background: isMobile ? 'rgba(0,0,0,0.2)' : 'transparent', padding: isMobile ? '16px' : '0', borderRadius: isMobile ? '16px' : '0' }}>
                <div style={{ textAlign: 'left', display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-start', width: '100%', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Ingreso Bruto</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', color: 'white', whiteSpace: 'nowrap' }}>{formatCurrency(janaGrossIncomeBs, '')} Bs</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>REF: ${formatCurrency(janaGrossIncomeBs / payrollRate, '')}</div>
                  </div>
                </div>
                {isMobile && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }}></div>}
                <div style={{ textAlign: 'left', display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-start', width: '100%', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end' }}>
                  <div style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: isMobile ? '0' : '4px' }}>Ganancia Neta</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: '#32d74b', whiteSpace: 'nowrap' }}>{formatCurrency(janaNetProfitBs, '')} Bs</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>REF: ${janaNetProfitUsd.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stylist Yield Summary Card */}
            <div className="glass-card animate-fade-in" style={{
              padding: '24px',
              borderRadius: '24px',
              marginBottom: '32px',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '850', color: 'white', marginBottom: '16px' }}>
                Rendimiento Neto por Estilista ({payrollFilterDate === 'this_week' ? 'Esta Semana' : payrollFilterDate === 'last_week' ? 'Semana Pasada' : 'Personalizado'})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                {processedPayroll.filter(s => s.isStylist).map(s => {
                  const yieldBs = Math.max(0, (s.grossIncomeBs - s.treatmentDeductionBs) * (1 - (Number(s.commission_pct || 60) / 100)));
                  const yieldUsd = yieldBs / payrollRate;
                  const margin = s.grossIncomeBs > 0 ? (yieldBs / s.grossIncomeBs) * 100 : 0;
                  return (
                    <div key={s.id} style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontWeight: '800', color: 'var(--pink-primary)', fontSize: '14px', marginBottom: '8px' }}>{s.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Total Creado:</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: 'white', fontWeight: '700', display: 'block' }}>{formatCurrency(s.grossIncomeBs, '')} Bs</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>REF: ${formatCurrency(s.grossIncomeBs / payrollRate, '')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Costo Estilista:</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#ff453a', fontWeight: '700', display: 'block' }}>-{formatCurrency(s.netIncomeBs, '')} Bs</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>REF: ${formatCurrency(s.netIncomeBs / payrollRate, '')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '6px' }}>
                        <span style={{ color: 'white', fontWeight: '800' }}>Ganancia JanaStudio:</span>
                        <span style={{ color: '#32d74b', fontWeight: '900' }}>+{formatCurrency(yieldBs, '')} Bs</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span>REF USD:</span>
                        <span>${formatCurrency(yieldUsd, '')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {processedPayroll.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay saldos pendientes.</div>
              ) : processedPayroll.map(st => (
                <div key={st.id} className="glass-card animate-fade-in" style={{ 
                  padding: '24px', 
                  borderRadius: '24px',
                  border: st.isAssistant ? '1px solid rgba(0, 191, 255, 0.2)' : '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        background: st.isAssistant ? 'rgba(0,191,255,0.1)' : 'rgba(217,70,168,0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: st.isAssistant ? '#00bfff' : 'var(--pink-primary)', 
                        fontWeight: '900', 
                        fontSize: '18px' 
                      }}>
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>{st.name}</div>
                        <div style={{ fontSize: '11px', color: st.isAssistant ? '#00bfff' : 'var(--pink-primary)', fontWeight: '800', textTransform: 'uppercase' }}>
                          {st.role?.split('|')[0] || 'Miembro'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
                    {st.isStylist ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{st.servicesCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tratamientos (#)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{st.treatmentsCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tratamiento (Bs)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'var(--pink-primary)' }}>{formatCurrency(st.treatmentDeductionBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Bruto</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{formatCurrency(st.grossIncomeBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Deducción Asistencia</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#ff453a' }}>-{formatCurrency(st.weeklyAssistanceBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Neto</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: 'white' }}>{formatCurrency(st.netIncomeBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF (USD)</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)' }}>${formatCurrency(st.netIncomeUsd, '')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#32d74b', fontWeight: '800' }}>Propinas (+)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#32d74b' }}>+{formatCurrency(st.propinasBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#ff453a', fontWeight: '800' }}>Vales / Adelantos (-)</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#ff453a' }}>-{formatCurrency(st.valesBs, '')} Bs.</span>
                        </div>
                      </>
                    ) : st.isAssistant ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tratamientos Realizados</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{st.treatmentsCount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Asistencia Semanal</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#00bfff' }}>{formatCurrency(st.weeklyAssistanceBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisión Tratamientos</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{formatCurrency(st.earnedBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingreso Neto</span>
                          <span style={{ fontSize: '12px', fontWeight: '900', color: 'white' }}>{formatCurrency(st.netIncomeBs, '')} Bs.</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF (USD)</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#00bfff' }}>${formatCurrency(st.netIncomeUsd, '')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisiones Acumuladas</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: 'white' }}>{formatCurrency(st.earnedBs, '')} Bs.</span>
                        </div>
                      </>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pagado/Deducido (Bs)</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#ff453a' }}>-{formatCurrency(st.paidBs, '')} Bs.</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)' }}>Por Pagar (Bs)</span>
                      <span style={{ fontSize: '16px', fontWeight: '950', color: '#32d74b' }}>{formatCurrency(st.balanceBs, '')} Bs.</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REF (USD)</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)' }}>${formatCurrency(st.balanceBs / payrollRate, '')}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button 
                      onClick={() => setPayrollDetail({ isOpen: true, staff: st, transactions: st.staffTransactions })}
                      style={{ flex: 1, minWidth: '70px', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <Eye size={16} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Detalle</span>
                    </button>
                    
                    {(st.isStylist || st.isAssistant) && (
                      <button 
                        onClick={() => {
                          setValeModal({
                            isOpen: true,
                            staff: st,
                            amountBs: '',
                            paymentMethod: 'Efectivo ($)',
                            maxBalance: st.balanceBs
                          });
                        }}
                        style={{ flex: 1, minWidth: '70px', padding: '10px', borderRadius: '10px', background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', border: '1px solid rgba(255, 69, 58, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <Minus size={16} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Vale</span>
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setPayrollModal({
                          isOpen: true,
                          staff: st,
                          earnedBs: st.balanceBs,
                          deductionBs: 0,
                          paymentAmountBs: Math.round(st.balanceBs / 2),
                          isAbono: true,
                          file: null,
                          paymentMethod: 'Efectivo ($)'
                        });
                      }}
                      disabled={st.balanceBs <= 0}
                      style={{ flex: 1, minWidth: '70px', padding: '10px', borderRadius: '10px', background: 'rgba(217,70,168,0.1)', color: 'var(--pink-primary)', border: '1px solid var(--pink-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: st.balanceBs > 0 ? 'pointer' : 'not-allowed', opacity: st.balanceBs > 0 ? 1 : 0.5 }}
                    >
                      <WalletCards size={16} /> <span style={{fontSize: '11px', fontWeight: '800'}}>Abonar</span>
                    </button>

                    <button 
                      onClick={() => {
                        setPayrollModal({
                          isOpen: true,
                          staff: st,
                          earnedBs: st.balanceBs,
                          deductionBs: 0,
                          paymentAmountBs: st.balanceBs,
                          isAbono: false,
                          file: null,
                          paymentMethod: 'Efectivo ($)'
                        });
                      }}
                      disabled={st.balanceBs <= 0}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', background: st.balanceBs > 0 ? 'var(--pink-primary)' : 'rgba(255,255,255,0.05)', color: st.balanceBs > 0 ? '#000' : 'var(--text-muted)', fontWeight: '950', border: 'none', cursor: st.balanceBs > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {st.balanceBs > 0 ? 'Realizar Pago Total' : 'Al Día'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

      {activeTab === 'analysis' && (() => {
        // Ejecución de Fórmulas Financieras (Basadas en el Excel de Rentabilidad)
        const ingresosTotales = operationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
        const egresosEstilistas = operationalTransactions.filter(t => t.type === 'income').reduce((acc, t) => {
          return acc + (t.metadata?.staffInvolved?.reduce((sum, s) => sum + (s.commissionEarned || 0), 0) || 0);
        }, 0);
        
        const profitBruto = ingresosTotales - egresosEstilistas;
        const costosVariables = totalExpense; // Usamos los gastos registrados como variables
        const utilidadNetaCalculada = profitBruto - totalFixedCosts - costosVariables;
        const rentabilidadReal = ingresosTotales > 0 ? (utilidadNetaCalculada / ingresosTotales) * 100 : 0;
        
        const serviciosTotales = Object.values(analysisData.stylistStats).reduce((acc, b) => acc + b.services, 0) || 0;
        const ticketProm = serviciosTotales > 0 ? ingresosTotales / serviciosTotales : 0;
        
        // Ocupación
        const sillas = Number(fixedCosts.workstations || 3);
        const capacidadMensual = sillas * 6 * 4 * 13; // 6 dias, 4 semanas, 13 servicios por silla
        const ocupacionPct = capacidadMensual > 0 ? (serviciosTotales / capacidadMensual) * 100 : 0;
        
        // Punto de Equilibrio
        const margenContribucion = ingresosTotales - costosVariables - egresosEstilistas;
        const margenPct = ingresosTotales > 0 ? margenContribucion / ingresosTotales : 0;
        const ptoEquilibrio = margenPct > 0 ? totalFixedCosts / margenPct : 0;

        return (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '16px' : '0', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>DASHBOARD DE RENTABILIDAD Y OCUPACIÓN</h3>
              <button onClick={() => setIsEditingCosts(true)} className="btn-pink" style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '10px', width: isMobile ? '100%' : 'auto' }}>
                Configurar Costos Fijos
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '20px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>UTILIDAD NETA</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>
                  ${formatCurrency(utilidadNetaCalculada)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>RENTABILIDAD</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900', color: rentabilidadReal >= 0 ? 'var(--pink-primary)' : '#ff453a' }}>
                  {rentabilidadReal.toFixed(1)}%
                </div>
              </div>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>PTO. DE EQUILIBRIO</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>
                  ${formatCurrency(ptoEquilibrio)}
                </div>
                <div style={{ fontSize: isMobile ? '8px' : '10px', color: 'var(--text-muted)' }}>Facturación Necesaria</div>
              </div>
              <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: isMobile ? '16px' : '24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? '9px' : '10px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>TICKET PROMEDIO</div>
                <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '900' }}>
                  ${formatCurrency(ticketProm)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
              {/* Estructura de Gastos e Ingresos */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Estructura de Gastos Mensuales</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'white', fontWeight: '700' }}>Ingresos Brutos (Facturación)</span>
                     <span style={{ fontWeight: '800', color: '#32d74b' }}>${formatCurrency(ingresosTotales)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Egresos Totales a Estilistas</span>
                     <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(egresosEstilistas)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Fijos Operativos</span>
                      <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(totalFixedCosts)}</span>
                   </div>
                   
                   {/* Grilla de Desglose de Costos (2 columnas para ahorrar espacio) */}
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', margin: '8px 0' }}>
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
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatCurrency(fixedCosts[c.key] || 0)}</span>
                       </div>
                     ))}

                     {fixedCosts.extraCosts?.map((c, i) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>↳ {c.label || 'Sin nombre'}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '8px' }}>-${formatCurrency(c.value)}</span>
                       </div>
                     ))}
                   </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Costos Variables (Caja Chica)</span>
                     <span style={{ fontWeight: '700', color: '#ff453a' }}>-${formatCurrency(costosVariables)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: '900', marginTop: '10px', fontSize: '18px' }}>
                     <span style={{ color: 'var(--pink-primary)' }}>Utilidad Neta</span>
                     <span style={{ color: utilidadNetaCalculada >= 0 ? '#32d74b' : '#ff453a' }}>${formatCurrency(utilidadNetaCalculada)}</span>
                  </div>
                </div>
              </div>

              {/* Occupancy Logic */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px' }}>Capacidad y Ocupación</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sillas / Estaciones Activas</span>
                    <span style={{ fontWeight: '700' }}>{sillas}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Servicios Realizados</span>
                    <span style={{ fontWeight: '700' }}>{serviciosTotales}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Capacidad Máxima Mensual</span>
                    <span style={{ fontWeight: '700' }}>{capacidadMensual}</span>
                  </div>
                  {/* Proyección de Ocupación */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800' }}>NIVEL DE OCUPACIÓN REAL</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--pink-primary)' }}>{ocupacionPct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(ocupacionPct, 100)}%`, height: '100%', background: 'var(--pink-gradient)' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rendimiento por Estilista */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px' }}>Rendimiento por Estilista (Bs)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Estilista</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Servicios</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total Creado (Bs)</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Costo Estilista (Bs)</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Ganancia Salón (Bs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(analysisData.stylistStats).filter(b => b.services > 0 || b.incomeBs > 0).map(b => {
                      const staffMember = staff.find(s => String(s.id) === String(b.id));
                      const staffName = staffMember?.name || `Eliminado (${String(b.id).substring(0, 5)})`;
                      
                      // Calculate commission and deductions for this stylist from operationalTransactions
                      const stylistTx = operationalTransactions.filter(t => t.type === 'income' && t.metadata?.staffInvolved?.some(x => String(x.staffId) === String(b.id)));
                      const earnedBs = stylistTx.reduce((sum, t) => {
                        const s = t.metadata?.staffInvolved?.find(x => String(x.staffId) === String(b.id));
                        return sum + (s ? (s.commissionBs || 0) + (s.productCommissionBs || 0) : 0);
                      }, 0);
                      
                      const treatmentsCount = stylistTx.filter(t => isTreatment(t.metadata?.didTreatment)).length;
                      const treatmentDeductionBs = treatmentsCount * payrollRate;
                      const weeklyAssistanceUsd = assistantConfig?.splits?.[b.id] || 0;
                      const weeklyAssistanceBs = weeklyAssistanceUsd * payrollRate;
                      const netCostoBs = (b.incomeBs * (Number(staffMember?.commission_pct || 60) / 100)) - (treatmentDeductionBs / 1.666) - weeklyAssistanceBs;
                      const gananciaSalonBs = Math.max(0, (b.incomeBs - treatmentDeductionBs) * (1 - (Number(staffMember?.commission_pct || 60) / 100)));

                      return (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', fontWeight: '700' }}>
                            {staffName}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{b.services}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'white', fontWeight: '700' }}>
                            {formatCurrency(b.incomeBs, '')} Bs
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#ff453a', fontWeight: '700' }}>
                            -{formatCurrency(netCostoBs, '')} Bs
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#32d74b', fontWeight: '800' }}>
                            {formatCurrency(gananciaSalonBs, '')} Bs
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</span>
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
                    <AstroSelect 
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
                    <AstroSelect 
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
                                <div style={{ color: '#ff453a', fontWeight: '950', fontSize: '16px' }}>-{formatCurrency(amountBs, '')} Bs</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}>-${formatCurrency(amountUsd, '')} USD</div>
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
                              <div style={{ color: '#32d74b', fontWeight: '900', fontSize: '20px', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>+{formatCurrency(totalEarningsBs, '')} Bs</div>
                              <div style={{ color: '#32d74b', opacity: 0.9, fontSize: '12px', fontWeight: '800', background: 'rgba(50, 215, 75, 0.15)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', whiteSpace: 'nowrap' }}>+${formatCurrency(totalEarningsUsd, '')} USD</div>
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
        

      <AstroDialog 
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
