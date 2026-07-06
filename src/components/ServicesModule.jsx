import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Clock, Rocket,
  Droplets, Zap, Check, X, Loader2,
  Settings, DollarSign, LayoutList, Star, Crown,
  LayoutGrid, Table, Eye, Info, Pencil,
  Sparkles, Smile, Heart, Wind, Palette,
  Brush, Flower2, UserRound, Waves, Feather,
  ChevronDown, ArrowUpDown
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useDialog } from '../context/DialogContext';
import { useNotifs } from '../context/NotificationContext';
import JanaSelect from './JanaSelect';
import AnimatedModal from './AnimatedModal';

// Custom SVG: nail polish bottle
const NailPolishIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Cap */}
    <rect x="8" y="2" width="8" height="4" rx="1" />
    {/* Neck */}
    <rect x="10" y="6" width="4" height="3" />
    {/* Bottle body */}
    <rect x="6" y="9" width="12" height="11" rx="2" />
    {/* Brush line at bottom */}
    <line x1="12" y1="20" x2="12" y2="23" />
  </svg>
);

const AVAILABLE_ICONS = [
  { name: 'Scissors',    label: 'Corte general' },
  { name: 'UserRound',   label: 'Estilismo / Barba' },
  { name: 'Wind',        label: 'Secado / Blower' },
  { name: 'Palette',     label: 'Colorimetría / Tintes' },
  { name: 'NailPolish',  label: 'Manicura / Esmalte' },
  { name: 'Droplets',    label: 'Tratamiento / Hidratación' },
  { name: 'Brush',       label: 'Maquillaje / Cejas' },
  { name: 'Sparkles',    label: 'Estilismo / Peinados' },
  { name: 'Flower2',     label: 'Spa / Masajes' },
  { name: 'Feather',     label: 'Tratamientos suaves' },
  { name: 'Heart',       label: 'Depilación / Bienestar' },
  { name: 'Waves',       label: 'Keratina / Alaciado' },
  { name: 'Crown',       label: 'VIP / Jana Elite' },
  { name: 'Smile',       label: 'Faciales / Afeitado' },
  { name: 'Star',        label: 'Tendencias / Adicional' }
];

const getIconComponent = (iconName, size = 20) => {
  switch (iconName) {
    case 'Scissors':    return <Sparkles size={size} />;
    case 'UserRound':   return <UserRound size={size} />;
    case 'Wind':        return <Wind size={size} />;
    case 'Palette':     return <Palette size={size} />;
    case 'NailPolish':  return <NailPolishIcon size={size} />;
    case 'Droplets':    return <Droplets size={size} />;
    case 'Brush':       return <Brush size={size} />;
    case 'Sparkles':    return <Sparkles size={size} />;
    case 'Flower2':     return <Flower2 size={size} />;
    case 'Feather':     return <Feather size={size} />;
    case 'Heart':       return <Heart size={size} />;
    case 'Waves':       return <Waves size={size} />;
    case 'Crown':       return <Crown size={size} />;
    case 'Star':        return <Star size={size} />;
    case 'Smile':       return <Smile size={size} />;
    default:            return <Zap size={size} />;
  }
};

const ServicesModule = ({ isMobile, currency, rates }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [isBillableExtrasModalOpen, setIsBillableExtrasModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isStrategiesModalOpen, setIsStrategiesModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState('Scissors');
  const [editingCategory, setEditingCategory] = useState(null);
  const [newStrategyValue, setNewStrategyValue] = useState('');
  const [newStrategyLabel, setNewStrategyLabel] = useState('');
  const [baseItems, setBaseItems] = useState([]);
  const [billableExtras, setBillableExtras] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editingExtra, setEditingExtra] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('0.00');
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('2.00');
  const [newExtraCost, setNewExtraCost] = useState('0.50');
  const [selectedServiceDetail, setSelectedServiceDetail] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('mostBooked');
  const [sortByOpen, setSortByOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { showToast } = useNotifs();
  const { confirm } = useDialog();

  useEffect(() => {
    fetchServices();
    fetchBaseItems();
    fetchBillableExtras();
    fetchCategories();
    fetchStrategies();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await dataService.getServices();
      setServices(data || []);
    } catch (e) {
      showToast('Error al cargar servicios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseItems = async () => {
    try {
      const items = await dataService.getChecklistItems();
      setBaseItems(items || []);
    } catch (e) {
      showToast('Error al cargar ítems incluidos.', 'error');
    }
  };

  const fetchBillableExtras = async () => {
    try {
      const data = await dataService.getExtras();
      setBillableExtras(data?.filter(e => e.name !== 'SYSTEM_CONFIG_RATES') || []);
    } catch (e) {
      showToast('Error al cargar extras cobrables.', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await dataService.getServiceCategories();
      setCategories(data || []);
    } catch (e) {
      showToast('Error al cargar categorías.', 'error');
    }
  };

  const fetchStrategies = async () => {
    try {
      const data = await dataService.getServiceStrategies();
      setStrategies(data || []);
    } catch (e) {
      showToast('Error al cargar estrategias.', 'error');
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      if (editingCategory) {
        await dataService.updateServiceCategory(
          editingCategory.name, 
          editingCategory.icon, 
          newCategoryName.trim(), 
          selectedCategoryIcon
        );
        showToast('Categoría actualizada.');
        setEditingCategory(null);
      } else {
        await dataService.addServiceCategory(newCategoryName.trim(), selectedCategoryIcon);
        showToast('Nueva categoría creada.');
      }
      setNewCategoryName('');
      setSelectedCategoryIcon('Scissors');
      await fetchCategories();
      await fetchServices();
    } catch (e) {
      showToast(editingCategory ? 'Error al actualizar categoría.' : 'Error al crear categoría.', 'error');
    }
  };

  const handleEditCategoryClick = (catObj) => {
    setEditingCategory(catObj);
    setNewCategoryName(catObj.name);
    setSelectedCategoryIcon(catObj.icon || getFallbackIconName(catObj.name));
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setSelectedCategoryIcon('Scissors');
  };

  const handleDeleteCategory = async (catObj) => {
    if (!await confirm(`Â¿Estás seguro de eliminar la categoría "${catObj.name}"?`)) return;
    try {
      await dataService.deleteServiceCategory(catObj.name, catObj.icon);
      await fetchCategories();
      showToast('Categoría eliminada.');
    } catch (e) {
      showToast('Error al eliminar categoría.', 'error');
    }
  };

  const handleAddStrategy = async () => {
    if (!newStrategyValue.trim() || !newStrategyLabel.trim()) {
      showToast('Debe ingresar el valor y la etiqueta.', 'warning');
      return;
    }
    try {
      await dataService.addServiceStrategy(newStrategyValue.trim(), newStrategyLabel.trim());
      setNewStrategyValue('');
      setNewStrategyLabel('');
      await fetchStrategies();
      showToast('Nueva estrategia creada.');
    } catch (e) {
      showToast('Error al crear estrategia.', 'error');
    }
  };

  const handleDeleteStrategy = async (value) => {
    if (!await confirm('Â¿Estás seguro de eliminar esta estrategia?')) return;
    try {
      await dataService.deleteServiceStrategy(value);
      await fetchStrategies();
      showToast('Estrategia eliminada.');
    } catch (e) {
      showToast('Error al eliminar estrategia.', 'error');
    }
  };

  const handleAddMasterChecklistItem = async () => {
    if (!newItemName) return;
    try {
      await dataService.addChecklistItem(newItemName, Number(newItemCost));
      setNewItemName('');
      setNewItemCost('0.50');
      setShowAddItemInput(false);
      await fetchBaseItems();
      showToast('Nuevo extra agregado al maestro.');
    } catch (e) {
      showToast('Error al agregar extra.', 'error');
    }
  };

  const handleUpdateMasterItem = async (id, name, base_cost) => {
    try {
      await dataService.updateChecklistItem(id, { name, base_cost: Number(base_cost) });
      await fetchBaseItems();
      showToast('Átem del checklist actualizado.');
    } catch (e) {
      showToast('Error al actualizar ítem.', 'error');
    }
  };

  const handleDeleteMasterItem = async (e, id, name) => {
    e.stopPropagation();
    if (!await confirm(`Â¿Eliminar "${name}" del checklist maestro?`)) return;
    try {
      await dataService.deleteChecklistItem(id);
      await fetchBaseItems();
      showToast('Átem eliminado.');
    } catch (e) {
      showToast('Error al eliminar ítem.', 'error');
    }
  };

  const handleAddBillableExtra = async () => {
    if (!newExtraName) return;
    try {
      await dataService.addExtra({
        name: newExtraName,
        price: Number(newExtraPrice),
        cost: Number(newExtraCost)
      });
      setNewExtraName('');
      setNewExtraPrice('2.00');
      setNewExtraCost('0.50');
      await fetchBillableExtras();
      showToast('Servicio adicional (Extra) creado.');
    } catch (e) {
      showToast('Error al crear extra.', 'error');
    }
  };

  const handleUpdateBillableExtra = async (id, updates) => {
    try {
      await dataService.updateExtra(id, updates);
      await fetchBillableExtras();
      showToast('Extra actualizado.');
    } catch (e) {
      showToast('Error al actualizar extra.', 'error');
    }
  };

  const handleDeleteBillableExtra = async (e, id, name) => {
    e.stopPropagation();
    if (!await confirm(`Â¿Archivar el extra "${name}"? Se mantendrá en el historial pero ya no se podrá seleccionar para nuevos servicios.`)) return;
    try {
      await dataService.deleteExtra(id);
      await fetchBillableExtras();
      showToast('Extra archivado correctamente.');
    } catch (e) {
      showToast('Error al archivar el extra.', 'error');
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!await confirm(`Â¿Archivar el servicio "${name}"? Se mantendrá en el historial pero ya no se podrá seleccionar.`)) return;
    try {
      setLoading(true);
      await dataService.deleteService(id);
      await fetchServices();
      showToast(`Servicio "${name}" archivado.`);
    } catch (e) {
      showToast('Error al archivar el servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newService, setNewService] = useState({ 
    name: '', 
    price: '', 
    icon: 'Scissors',
    category: 'Estilismo',
    strategy_type: 'MVP',
    duration: 30,
    insumo_cost: 0,
    variable_cost: 0.50,
    included_items: [],
    commission_stylist: 40,
    commission_washer: 0,
    commission_cashier: 0,
    commission_receptionist: 0
  });

  const totalCommissions = 
    (Number(newService.commission_stylist) || 0) + 
    (Number(newService.commission_washer) || 0) + 
    (Number(newService.commission_cashier) || 0) + 
    (Number(newService.commission_receptionist) || 0);
  const netMargin = (Number(newService.price) || 0) - ((Number(newService.price) || 0) * totalCommissions / 100);

  const handleEditClick = (service) => {
    setIsEditing(true);
    setNewService({
      id: service.id,
      name: service.name,
      price: service.price,
      icon: service.icon || 'Scissors',
      category: service.category,
      strategy_type: service.strategy_type || 'MVP',
      duration: service.duration || 30,
      description: service.description || '',
      included_items: service.included_items || [],
      commission_stylist: service.commission_stylist !== undefined ? service.commission_stylist : 40,
      commission_washer: service.commission_washer || 0,
      commission_cashier: service.commission_cashier || 0,
      commission_receptionist: service.commission_receptionist || 0
    });
    setShowAddForm(true);
  };

  const handleCreateService = async () => {
    if (!newService.name || !newService.price) return;
    try {
      setLoading(true);
      if (isEditing && newService.id) {
        await dataService.updateService(newService.id, newService);
        showToast(`Â¡Servicio ${newService.name} actualizado!`);
      } else {
        await dataService.addService(newService);
        showToast(`Â¡Servicio ${newService.name} agregado al catálogo!`);
      }
      setNewService({ 
        name: '', 
        price: '', 
        category: 'Estilismo',
        strategy_type: 'MVP',
        duration: 30,
        insumo_cost: 0,
        variable_cost: 0.50,
        description: '',
        included_items: [],
        commission_stylist: 40,
        commission_washer: 0,
        commission_cashier: 0,
        commission_receptionist: 0
      });
      setIsEditing(false);
      setShowAddForm(false);
      await fetchServices();
    } catch (e) {
      showToast('Error al guardar el servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };

   // Effect to auto-calculate insumo_cost based on items + variable
  useEffect(() => {
    const itemsTotal = baseItems
      .filter(item => newService.included_items?.includes(item.name))
      .reduce((sum, item) => sum + (Number(item.base_cost) || 0), 0);
    
    setNewService(prev => ({
      ...prev,
      insumo_cost: Number((itemsTotal + (Number(prev.variable_cost) || 0)).toFixed(2))
    }));
  }, [newService.included_items, newService.variable_cost, baseItems]);

  const getFallbackIconName = (catName) => {
    switch(catName) {
      case 'Estilismo': return 'Scissors';
      case 'Estilismo': return 'Sparkles';
      case 'Tratamientos': return 'Droplets';
      default: return 'Wind';
    }
  };

  const getCategoryIcon = (catName) => {
    const catObj = categories.find(c => c.name === catName);
    const iconName = catObj ? catObj.icon : null;
    return getIconComponent(iconName || getFallbackIconName(catName), 20);
  };

  const formatBs = (price) => {
    return `${(Number(price) * (rates?.usd || 550)).toLocaleString('es-VE')} Bs.`;
  };

  const itemsPerPage = 8;

  const activeServices = services.filter(s => s.active !== false);
  const activeServicesCount = activeServices.length;

  const uniqueCategories = [...new Set(activeServices.map(s => s.category).filter(Boolean))];
  const categoriesCount = uniqueCategories.length;

  const mostBookedService = activeServices.length > 0
    ? activeServices.reduce((max, s) => (s.total_bookings || 0) > (max.total_bookings || 0) ? s : max, activeServices[0])
    : { name: '-', total_bookings: 0 };

  const avgTicket = activeServices.length > 0
    ? activeServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0) / activeServices.length
    : 0;

  const defaultCategories = ['Cabello', 'Uñas', 'Pestañas', 'Facial', 'Combos'];
  const allCategories = [...new Set([...defaultCategories, ...uniqueCategories])];

  const sortOptions = [
    { value: 'mostBooked', label: 'Más reservados' },
    { value: 'name', label: 'Nombre' },
    { value: 'priceAsc', label: 'Menor precio' },
    { value: 'priceDesc', label: 'Mayor precio' },
    { value: 'newest', label: 'Más recientes' },
  ];

  const filteredServices = activeServices.filter(s => {
    const matchCategory = categoryFilter === 'Todas' || s.category === categoryFilter;
    const matchSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'mostBooked') return (b.total_bookings || 0) - (a.total_bookings || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'priceAsc') return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === 'priceDesc') return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return 0;
  });

  const getBaseName = (name) => {
    if (name.includes('(')) {
      return name.split('(')[0].trim();
    }
    return name;
  };

  const getSubServiceName = (name) => {
    if (name.includes('(')) {
      return name.split('(')[1].replace(')', '').trim();
    }
    return null;
  };

  const getGroupedServices = () => {
    const grouped = [];
    const groupsMap = {};

    filteredServices.forEach(s => {
      const baseName = getBaseName(s.name);
      const subName = getSubServiceName(s.name);
      
      if (subName) {
        if (!groupsMap[baseName]) {
          groupsMap[baseName] = {
            id: `group-${baseName}`,
            name: baseName,
            category: s.category,
            description: s.description || `Variedades de ${baseName}`,
            icon: s.icon,
            isGroup: true,
            variations: [],
            total_bookings: 0,
            created_at: s.created_at,
            active: true,
            commission_pct: s.commission_pct,
            commission_stylist: s.commission_stylist || s.commission_pct || 40,
            strategy_type: s.strategy_type
          };
          grouped.push(groupsMap[baseName]);
        }
        groupsMap[baseName].variations.push({
          ...s,
          subName
        });
        groupsMap[baseName].total_bookings += (s.total_bookings || 0);
        if (groupsMap[baseName].price === undefined) {
          groupsMap[baseName].minPrice = Number(s.price);
          groupsMap[baseName].maxPrice = Number(s.price);
        } else {
          groupsMap[baseName].minPrice = Math.min(groupsMap[baseName].minPrice, Number(s.price));
          groupsMap[baseName].maxPrice = Math.max(groupsMap[baseName].maxPrice, Number(s.price));
        }
        groupsMap[baseName].price = groupsMap[baseName].minPrice;
        
        const dur = s.duration_minutes || s.duration || 30;
        if (groupsMap[baseName].minDuration === undefined) {
          groupsMap[baseName].minDuration = dur;
          groupsMap[baseName].maxDuration = dur;
        } else {
          groupsMap[baseName].minDuration = Math.min(groupsMap[baseName].minDuration, dur);
          groupsMap[baseName].maxDuration = Math.max(groupsMap[baseName].maxDuration, dur);
        }
        groupsMap[baseName].duration = groupsMap[baseName].minDuration;
      } else {
        grouped.push({
          ...s,
          isGroup: false
        });
      }
    });
    return grouped;
  };

  const groupedServices = getGroupedServices();
  const totalPages = Math.ceil(groupedServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = groupedServices.slice(startIndex, startIndex + itemsPerPage);

  const formatServicePrice = (s) => {
    if (s.isGroup) {
      if (s.minPrice === s.maxPrice) return formatBs(s.minPrice);
      return `Desde ${formatBs(s.minPrice)}`;
    }
    return formatBs(s.price);
  };

  const getBadge = (service) => {
    if (service.isGroup) {
      return { label: `${service.variations.length} opciones`, color: 'var(--pink-primary)', bg: 'rgba(196,139,159,0.1)' };
    }
    if ((service.total_bookings || 0) >= 100) return { label: 'Top', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
    if ((service.total_bookings || 0) >= 50) return { label: 'Popular', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
    if ((service.total_bookings || 0) >= 10) return { label: 'Nuevo', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' };
    return null;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '120px' : '60px' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
          <Loader2 className="animate-spin" color="var(--pink-primary)" size={40} />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <Star size={64} color="rgba(212, 160, 154, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Tu catálogo está vacío</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando los servicios que definirán tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
          
          {/* │││ LEFT COLUMN │││ */}
          <div style={{ flex: isMobile ? 1 : 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Header */}
            <div>
              <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Servicios</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Define tu oferta y servicios adicionales.</p>
            </div>
            
            {/* Action Buttons Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  backgroundColor: viewMode === 'grid' ? 'var(--pink-primary)' : '#faf5f5',
                  color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                <LayoutGrid size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Tarjetas
              </button>
              <button 
                onClick={() => setViewMode('table')}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  backgroundColor: viewMode === 'table' ? 'var(--pink-primary)' : '#faf5f5',
                  color: viewMode === 'table' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                <Table size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Tabla
              </button>
              <button 
                onClick={() => setIsCategoriesModalOpen(true)}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  backgroundColor: '#faf5f5', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                Categorías
              </button>
              <button 
                onClick={() => setIsStrategiesModalOpen(true)}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  backgroundColor: '#faf5f5', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                Estrategias
              </button>
              <button 
                onClick={() => setIsBillableExtrasModalOpen(true)}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  backgroundColor: '#faf5f5', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                Extras
              </button>
              <button 
                className="btn-pink"
                onClick={() => {
                  setIsEditing(false);
                  setNewService({ 
                    name: '', price: '', icon: 'Scissors', category: 'Estilismo',
                    strategy_type: 'MVP', duration: 30, insumo_cost: 0, variable_cost: 0.50,
                    description: '', included_items: [],
                    commission_stylist: 40, commission_washer: 0, commission_cashier: 0, commission_receptionist: 0
                  });
                  setShowAddForm(true);
                }}
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', fontWeight: '700', marginLeft: 'auto'
                }}
              >
                <Plus size={14} /> Nuevo Servicio
              </button>
            </div>
            
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
              {/* Servicios activos */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c48b9f' }}>
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Servicios activos</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeServicesCount}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>→‘ 12% vs mes anterior</div>
              </div>
              
              {/* Categorías */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Settings size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Categorías</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{categoriesCount}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Sin cambios</div>
              </div>
              
              {/* Más reservado */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <Heart size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Más reservado</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{mostBookedService?.name || '-'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{mostBookedService?.total_bookings || 0} reservas este mes</div>
              </div>
              
              {/* Ticket promedio */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Ticket promedio</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatBs(avgTicket)}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>→‘ 8% vs mes anterior</div>
              </div>
            </div>
            
            {/* Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  className="form-input"
                  placeholder="Buscar servicio..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', paddingLeft: '38px', height: '40px', borderRadius: '12px', fontSize: '13px', background: 'white', border: '1px solid var(--border-color)' }}
                />
              </div>
              
              {/* Category Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {allCategories.slice(0, 6).map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: '700', transition: 'all 0.2s',
                      backgroundColor: categoryFilter === cat ? 'var(--pink-primary)' : '#faf5f5',
                      color: categoryFilter === cat ? 'white' : 'var(--text-muted)',
                      border: categoryFilter === cat ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              {/* Sort Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setSortByOpen(!sortByOpen)}
                  style={{
                    padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border-color)',
                    backgroundColor: 'white', color: 'var(--text-secondary)', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {sortOptions.find(o => o.value === sortBy)?.label || 'Más reservados'}
                  <ChevronDown size={14} />
                </button>
                {sortByOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                    background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden', minWidth: '180px'
                  }}>
                    {sortOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setSortByOpen(false); setCurrentPage(1); }}
                        style={{
                          display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                          background: sortBy === opt.value ? 'rgba(196,139,159,0.1)' : 'transparent',
                          color: sortBy === opt.value ? 'var(--pink-primary)' : 'var(--text-secondary)',
                          fontSize: '13px', fontWeight: sortBy === opt.value ? '700' : '500',
                          textAlign: 'left', cursor: 'pointer'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* │││ SERVICE CARDS GRID │││ */}
            {viewMode === 'grid' || isMobile ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {paginatedServices.map(service => {
                  const badge = getBadge(service);
                  return (
                    <div 
                      key={service.id}
                      className="glass-card"
                      style={{ 
                        background: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid var(--border-color)', padding: '20px',
                        display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setSelectedServiceDetail(service)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c48b9f' }}>
                          {service.icon ? getIconComponent(service.icon, 20) : getCategoryIcon(service.category)}
                        </div>
                        {badge && (
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '800',
                            backgroundColor: badge.bg, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {service.name}
                      </h4>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#c48b9f' }}>
                        {service.category}
                      </span>
                      {service.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {service.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <Clock size={14} /> {service.isGroup ? (service.minDuration === service.maxDuration ? `${service.minDuration} min` : `${service.minDuration}-${service.maxDuration} min`) : `${service.duration || 30} min`}
                        </div>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '15px' }}>
                          {formatServicePrice(service)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#c48b9f', fontWeight: '600' }}>
                          <Heart size={14} fill="currentColor" /> {service.total_bookings || 0} reservas este mes
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                          {service.isGroup ? (
                            <button 
                              onClick={() => setSelectedServiceDetail(service)}
                              className="action-btn"
                              style={{ width: 'auto', height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: '700', borderRadius: '8px', color: 'var(--pink-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              Ver opciones
                            </button>
                          ) : (
                            <>
                              <button 
                                className="action-btn" 
                                onClick={() => handleEditClick(service)} 
                                style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="action-btn" 
                                style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteService(service.id, service.name)} 
                                className="action-btn" 
                                style={{ width: '32px', height: '32px', borderRadius: '8px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* │││ TABLE VIEW │││ */
              <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#faf5f5', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duración</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reservas</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedServices.map(service => (
                      <tr key={service.id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c48b9f', flexShrink: 0 }}>
                              {service.icon ? getIconComponent(service.icon, 16) : getCategoryIcon(service.category)}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>
                                {service.name}
                                {service.isGroup && (
                                  <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(196,139,159,0.1)', color: 'var(--pink-primary)', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                    {service.variations.length} opciones
                                  </span>
                                )}
                              </div>
                              {service.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.description}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#c48b9f', backgroundColor: 'rgba(196,139,159,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                            {service.category}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {service.isGroup ? (service.minDuration === service.maxDuration ? `${service.minDuration} min` : `${service.minDuration}-${service.maxDuration} min`) : `${service.duration || 30} min`}
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatServicePrice(service)}</td>
                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {service.total_bookings || 0}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {service.isGroup ? (
                              <button 
                                onClick={() => setSelectedServiceDetail(service)}
                                className="action-btn"
                                style={{ width: 'auto', height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: '700', borderRadius: '8px', color: 'var(--pink-primary)' }}
                              >
                                Ver Opciones
                              </button>
                            ) : (
                              <>
                                <button className="action-btn" onClick={() => handleEditClick(service)} style={{ width: '32px', height: '32px' }}>
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteService(service.id, service.name)} className="action-btn" style={{ width: '32px', height: '32px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}>
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {groupedServices.length > itemsPerPage && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, groupedServices.length)} de {groupedServices.length} servicios
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', cursor: currentPage === 1 ? 'default' : 'pointer', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '14px', fontWeight: '700', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    &laquo;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: '700',
                        backgroundColor: currentPage === page ? 'var(--pink-primary)' : 'white',
                        color: currentPage === page ? 'white' : 'var(--text-secondary)',
                        boxShadow: currentPage === page ? '0 2px 6px rgba(196,139,159,0.3)' : 'none'
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'white', cursor: currentPage === totalPages ? 'default' : 'pointer', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '14px', fontWeight: '700', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    &raquo;
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {itemsPerPage} por página
                </div>
              </div>
            )}
            
          </div>
          
          {/* │││ RIGHT SIDEBAR │││ */}
          {!isMobile && (
            <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* CATEGORÁAS MÁS VENDIDAS */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Categorías más vendidas</h4>
                {[
                  { name: 'Cabello', pct: 54, color: '#c48b9f' },
                  { name: 'Uñas', pct: 21, color: '#6366f1' },
                  { name: 'Pestañas', pct: 12, color: '#ef4444' },
                  { name: 'Facial', pct: 8, color: '#f59e0b' },
                  { name: 'Combos', pct: 5, color: '#22c55e' },
                ].map(cat => (
                  <div key={cat.name} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{cat.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{cat.pct}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f5f5f5', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${cat.pct}%`, backgroundColor: cat.color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* SERVICIO DESTACADO DEL MES */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Servicio destacado del mes</h4>
                <div style={{ width: '100%', height: '100px', borderRadius: '12px', backgroundColor: 'rgba(196,139,159,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Sparkles size={32} color="#c48b9f" />
                </div>
                <h5 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>Corte Suprema</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: '1.4' }}>El servicio estrella del mes con la mejor valoración por parte de nuestras clientas.</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '12px', color: '#c48b9f', fontWeight: '600' }}>
                  <Heart size={14} fill="currentColor" /> 142 reservas
                </div>
                <button 
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: 'rgba(196,139,159,0.1)', color: 'var(--pink-primary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  Ver detalles
                </button>
              </div>
              
              {/* EXTRAS MÁS AÁ‘ADIDOS */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Extras más añadidos</h4>
                {[
                  { name: 'Ampolla de Keratina', count: 88 },
                  { name: 'Diseño de Cejas', count: 72 },
                  { name: 'Tratamiento de Manos', count: 64 },
                  { name: 'Retiro de Acrílico', count: 52 },
                ].map((extra, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < 3 ? '1px solid var(--border-color)' : 'none' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{extra.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--pink-primary)', backgroundColor: 'rgba(196,139,159,0.1)', padding: '3px 8px', borderRadius: '8px' }}>{extra.count}</span>
                  </div>
                ))}
              </div>
              
              {/* PAQUETES RECOMENDADOS */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Paquetes recomendados</h4>
                {[
                  { name: 'Pack Cabello Premium', desc: 'Corte + Keratina + Secado', price: '$45' },
                  { name: 'Combo Manicura & Pestañas', desc: 'Manicura gel + Extensiones', price: '$38' },
                ].map((pkg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(196,139,159,0.04)', marginBottom: idx === 0 ? '10px' : 0, border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Star size={20} color="#c48b9f" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{pkg.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pkg.desc}</div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)', marginTop: '2px' }}>{pkg.price}</div>
                    </div>
                  </div>
                ))}
                <button style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}>
                  Ver todos los paquetes →’
                </button>
              </div>
              
            </div>
          )}
          
        </div>
      )}

      {/* Extras Manager Modal */}
      <AnimatedModal isOpen={isExtrasModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMobile ? '12px' : '20px'
          }}>
            <div className={`${cardClass} glass-card jana-scrollbar`} style={{
              width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', flexDirection: 'column', padding: isMobile ? '20px 16px' : '24px',
              borderRadius: '28px', border: '1px solid var(--border-color)',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.2)',
              backgroundColor: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                   <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}><span className="text-pink">Items</span></h3>
                </div>
                <button 
                  onClick={() => setIsExtrasModalOpen(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {baseItems.map(item => (
                    <div key={item.id} style={{ 
                      display: 'flex', gap: '8px', alignItems: 'center', 
                      padding: '6px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <input 
                        className="form-input" 
                        value={editingItem?.id === item.id ? editingItem.name : item.name} 
                        onChange={(e) => setEditingItem({ ...(editingItem || item), id: item.id, name: e.target.value })}
                        onFocus={() => setEditingItem(item)}
                        style={{ flex: 1, fontSize: '13px', height: '36px', background: 'transparent', border: 'none', fontWeight: '600', minWidth: 0 }}
                      />

                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {editingItem?.id === item.id ? (
                          <>
                            <button onClick={e => handleUpdateMasterItem(item.id, editingItem.name, item.base_cost)} style={{ background: 'transparent', border: 'none', color: '#32d74b', cursor: 'pointer' }}>
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingItem(null)} style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer' }}>
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <button onClick={(e) => handleDeleteMasterItem(e, item.id, item.name)} style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer', opacity: 0.7 }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agregar nuevo */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Nuevo ítem..." 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    style={{ flex: 1, height: '40px', fontSize: '13px', minWidth: 0 }}
                  />

                  <button onClick={handleAddMasterChecklistItem} className="btn-pink" style={{ width: '40px', height: '40px', borderRadius: '10px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Billable Extras Management Modal */}
      <AnimatedModal isOpen={isBillableExtrasModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : '20px' }}>
            <div className={`${cardClass} glass-card jana-scrollbar`} style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '20px 16px' : '32px', borderRadius: '32px', border: '1px solid var(--border-color)', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Rocket size={24} color="var(--pink-primary)" /> Servicios Extras
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Servicios con costo extra que se añaden en caja.</p>
                </div>
                <button onClick={() => setIsBillableExtrasModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="jana-scrollbar" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {billableExtras.map(extra => (
                    <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input 
                          className="form-input"
                          value={editingExtra?.id === extra.id ? editingExtra.name : extra.name}
                          onChange={e => setEditingExtra({ ...(editingExtra || extra), id: extra.id, name: e.target.value })}
                          readOnly={editingExtra?.id !== extra.id}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            padding: 0, 
                            height: 'auto', 
                            fontSize: '14px', 
                            fontWeight: '700', 
                            width: '100%',
                            color: editingExtra?.id === extra.id ? 'var(--pink-primary)' : 'white',
                            pointerEvents: editingExtra?.id === extra.id ? 'auto' : 'none'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: 'var(--pink-primary)', marginTop: '4px', fontWeight: '800' }}>PRECIO EN CAJA</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: '80px' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-primary)', fontSize: '11px', fontWeight: '800' }}>$</span>
                          <input 
                            className="form-input"
                            type="number"
                            step="0.01"
                            value={editingExtra?.id === extra.id ? editingExtra.price : extra.price}
                            onChange={e => setEditingExtra({ ...(editingExtra || extra), id: extra.id, price: e.target.value })}
                            readOnly={editingExtra?.id !== extra.id}
                            style={{ 
                              height: '36px', 
                              paddingLeft: '22px', 
                              fontSize: '13px', 
                              fontWeight: '800', 
                              textAlign: 'right', 
                              background: editingExtra?.id === extra.id ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)', 
                              border: editingExtra?.id === extra.id ? '1px solid var(--pink-primary)' : '1px solid transparent', 
                              width: '100%',
                              pointerEvents: editingExtra?.id === extra.id ? 'auto' : 'none'
                            }}
                          />
                        </div>
                        
                        {editingExtra?.id === extra.id ? (
                          <button onClick={() => { handleUpdateBillableExtra(extra.id, { name: editingExtra.name, price: Number(editingExtra.price) }); setEditingExtra(null); }} className="action-btn" style={{ backgroundColor: '#32d74b', color: 'black', flexShrink: 0 }}>
                            <Check size={16} strokeWidth={3} />
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingExtra(extra)} className="action-btn" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', flexShrink: 0 }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={(e) => handleDeleteBillableExtra(e, extra.id, extra.name)} className="action-btn" style={{ backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a', flexShrink: 0 }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="extra-add-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>NOMBRE DEL EXTRA</label>
                    <input className="form-input" placeholder="Ej. Mascarilla..." value={newExtraName} onChange={e => setNewExtraName(e.target.value)} style={{ height: '44px', fontSize: '13px', width: '100%' }} />
                  </div>
                  <div style={{ width: '90px', flexShrink: 0 }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>PRECIO</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-primary)', fontSize: '12px', fontWeight: '800' }}>$</span>
                      <input className="form-input" type="number" step="0.01" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} style={{ height: '44px', paddingLeft: '24px', fontSize: '13px', fontWeight: '800', width: '100%' }} />
                    </div>
                  </div>
                  <button onClick={handleAddBillableExtra} className="btn-pink" style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>
       {/* Details Modal */}
      <AnimatedModal isOpen={!!selectedServiceDetail}>
        {(overlayClass, cardClass) => (
          selectedServiceDetail && (
            <div className={overlayClass} style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 99999, padding: isMobile ? '12px' : '20px'
            }}>
              <div className={`${cardClass} glass-card jana-scrollbar`} style={{
                width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
                padding: isMobile ? '20px 16px' : '24px', borderRadius: '28px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.2)',
                backgroundColor: 'white',
                position: 'relative'
              }}>
                <button 
                  onClick={() => setSelectedServiceDetail(null)} 
                  style={{ position: 'absolute', right: isMobile ? '32px' : '48px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingRight: '40px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pink-primary)' }}>
                    {selectedServiceDetail.icon ? getIconComponent(selectedServiceDetail.icon, 20) : getCategoryIcon(selectedServiceDetail.category)}
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedServiceDetail.category}</span>
                    {selectedServiceDetail.strategy_type && (
                      <span style={{ marginLeft: '8px', fontSize: '9px', fontWeight: '900', backgroundColor: 'rgba(196,139,159,0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(196,139,159,0.2)', color: 'var(--pink-primary)' }}>
                        {selectedServiceDetail.strategy_type}
                      </span>
                    )}
                  </div>
                </div>

                 <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', paddingRight: '40px' }}>{selectedServiceDetail.name}</h3>

                {!selectedServiceDetail.isGroup ? (
                  <>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(196,139,159,0.05)', padding: '6px 12px', borderRadius: '10px' }}>
                        <Clock size={14} color="var(--pink-primary)" />
                        <strong>Duración:</strong> {selectedServiceDetail.duration || 30} min
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(196,139,159,0.05)', padding: '6px 12px', borderRadius: '10px' }}>
                        <Sparkles size={14} color="var(--pink-primary)" />
                        <strong>Comisión:</strong> {selectedServiceDetail.commission_stylist || selectedServiceDetail.commission_pct}%
                      </div>
                    </div>

                    {selectedServiceDetail.description && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Descripción</div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0, padding: '12px', borderRadius: '12px', backgroundColor: '#faf5f5', fontStyle: 'italic', border: '1px solid rgba(196,139,159,0.1)' }}>
                          "{selectedServiceDetail.description}"
                        </p>
                      </div>
                    )}

                    {selectedServiceDetail.included_items && selectedServiceDetail.included_items.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Checklist Incluido ({selectedServiceDetail.included_items.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {selectedServiceDetail.included_items.map((item, idx) => (
                            <span key={idx} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(196,139,159,0.05)', color: 'var(--text-primary)', border: '1px solid rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Check size={12} color="var(--pink-primary)" strokeWidth={3} /> {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="details-price-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#faf5f5', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(196,139,159,0.1)' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio Base</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>{formatBs(selectedServiceDetail.price)}</div>
                      </div>
                      {rates?.usd > 0 && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio en Bolívares</div>
                          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--pink-primary)' }}>
                            {Math.round(selectedServiceDetail.price * rates.usd).toLocaleString()} Bs.
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => {
                          setSelectedServiceDetail(null);
                          handleEditClick(selectedServiceDetail);
                        }} 
                        className="btn-pink" 
                        style={{ flex: 1, height: '44px', borderRadius: '12px' }}
                      >
                        Editar Servicio
                      </button>
                      <button 
                        onClick={() => setSelectedServiceDetail(null)} 
                        style={{ flex: 1, height: '44px', borderRadius: '12px', backgroundColor: '#e5e5e5', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '700' }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                      Opciones y Subservicios ({selectedServiceDetail.variations.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                      {selectedServiceDetail.variations.map(variation => (
                        <div 
                          key={variation.id}
                          style={{
                            padding: '12px 14px', borderRadius: '14px', backgroundColor: '#faf5f5',
                            border: '1px solid rgba(196,139,159,0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '13px' }}>
                              {variation.subName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Clock size={11} /> {variation.duration_minutes || variation.duration || 30} min</span>
                              <span>•</span>
                              <span>Comisión: {variation.commission_stylist || variation.commission_pct || 40}%</span>
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: '800', color: 'var(--pink-primary)', fontSize: '13px' }}>
                              {formatBs(variation.price)}
                            </div>
                            {rates?.usd > 0 && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                {Math.round(variation.price * rates.usd).toLocaleString()} Bs.
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button 
                              className="action-btn"
                              onClick={() => {
                                setSelectedServiceDetail(null);
                                handleEditClick(variation);
                              }}
                              style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedServiceDetail(null);
                                handleDeleteService(variation.id, variation.name);
                              }} 
                              className="action-btn" 
                              style={{ width: '28px', height: '28px', borderRadius: '6px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => setSelectedServiceDetail(null)} 
                        className="btn-pink" 
                        style={{ flex: 1, height: '44px', borderRadius: '12px' }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal de Categorías */}
      <AnimatedModal isOpen={isCategoriesModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMobile ? '12px' : '20px'
          }}>
            <div className={`${cardClass} glass-card jana-scrollbar`} style={{
              width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
              padding: isMobile ? '20px 16px' : '28px', borderRadius: '28px',
              border: '1px solid rgba(212,160,154,0.2)',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setIsCategoriesModalOpen(false)} 
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>

              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '40px' }}>
                <Settings size={20} color="var(--pink-primary)" /> Categorías
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>Agrega o elimina las categorías disponibles para clasificar tus servicios.</p>

              {/* Agregar Categoría */}
              <div style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  {editingCategory ? 'EDITAR CATEGORÁA' : 'NUEVA CATEGORÁA'}
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Ej. Manicura, Masajes" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    style={{ height: '44px', flex: 1 }} 
                  />
                  {editingCategory && (
                    <button 
                      onClick={handleCancelEditCategory} 
                      className="btn-pink" 
                      style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  )}
                  <button 
                    onClick={handleSaveCategory} 
                    className="btn-pink" 
                    style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    {editingCategory ? <Check size={20} /> : <Plus size={24} />}
                  </button>
                </div>

                <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>ICONO ASOCIADO</label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(6, 1fr)', 
                  gap: '8px', 
                  backgroundColor: 'rgba(0,0,0,0.2)', 
                  padding: '10px', 
                  borderRadius: '12px' 
                }}>
                  {AVAILABLE_ICONS.map(icon => {
                    const isSelected = selectedCategoryIcon === icon.name;
                    return (
                      <button
                        key={icon.name}
                        title={icon.label}
                        type="button"
                        onClick={() => setSelectedCategoryIcon(icon.name)}
                        style={{
                          height: '40px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid var(--pink-primary)' : '1px solid transparent',
                          background: isSelected ? 'rgba(196, 139, 159, 0.15)' : 'transparent',
                          color: isSelected ? 'var(--pink-primary)' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        {getIconComponent(icon.name, 18)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Listado de Categorías */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {categories.map((catObj, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ color: 'var(--pink-primary)' }}>
                        {getIconComponent(catObj.icon || getFallbackIconName(catObj.name), 20)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{catObj.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEditCategoryClick(catObj)} 
                        style={{ background: 'rgba(196,139,159,0.1)', border: 'none', color: 'var(--pink-primary)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(catObj)} 
                        style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <button 
                  onClick={() => setIsCategoriesModalOpen(false)} 
                  className="btn-pink" 
                  style={{ flex: 1, height: '44px', borderRadius: '12px' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Modal de Estrategias */}
      <AnimatedModal isOpen={isStrategiesModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMobile ? '12px' : '20px'
          }}>
            <div className={`${cardClass} glass-card jana-scrollbar`} style={{
              width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
              padding: isMobile ? '20px 16px' : '28px', borderRadius: '28px',
              border: '1px solid rgba(212,160,154,0.2)',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setIsStrategiesModalOpen(false)} 
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>

              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '40px' }}>
                <Crown size={20} color="var(--pink-primary)" /> Estrategias de Venta
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>Configura los tipos de estrategias de venta cruzada y retención para tus servicios.</p>

              {/* Agregar Estrategia */}
              <div style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="strategy-add-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>VALOR CLAVE</label>
                    <input 
                      className="form-input" 
                      placeholder="Ej. VIP, Promo" 
                      value={newStrategyValue} 
                      onChange={e => setNewStrategyValue(e.target.value)} 
                      style={{ height: '44px', width: '100%' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>ETIQUETA VISIBLE</label>
                    <input 
                      className="form-input" 
                      placeholder="Ej. Servicio VIP Jana" 
                      value={newStrategyLabel} 
                      onChange={e => setNewStrategyLabel(e.target.value)} 
                      style={{ height: '44px', width: '100%' }} 
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddStrategy} 
                  className="btn-pink" 
                  style={{ height: '44px', width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Plus size={18} /> Agregar Estrategia
                </button>
              </div>

              {/* Listado de Estrategias */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {strategies.map((strat, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{strat.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '900' }}>VALOR: {strat.value}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteStrategy(strat.value)} 
                      style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
                <button 
                  onClick={() => setIsStrategiesModalOpen(false)} 
                  className="btn-pink" 
                  style={{ flex: 1, height: '44px', borderRadius: '12px' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Modal para Crear/Editar Servicio */}
      <AnimatedModal isOpen={showAddForm}>
        {(overlayClass, cardClass) => (
          showAddForm && (
            <div className={overlayClass} style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 99999, padding: isMobile ? '12px' : '20px'
            }}>
              <div className={`${cardClass} glass-card jana-scrollbar`} style={{
                width: '100%', maxWidth: '900px',
                maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                padding: isMobile ? '20px 16px' : '32px', borderRadius: '28px',
                border: '1px solid rgba(212,160,154,0.2)',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
                position: 'relative'
              }}>
                <button 
                  onClick={() => { setShowAddForm(false); setIsEditing(false); }} 
                  style={{ position: 'absolute', right: isMobile ? '32px' : '48px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>

                <div className="jana-scrollbar" style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, paddingRight: '8px' }}><h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '24px', paddingRight: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--pink-primary)', display: 'flex', alignItems: 'center' }}>
                    {getIconComponent(newService.icon || 'Scissors', 22)}
                  </span>
                  {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
                </h3>
                
                <div className="modal-main-grid">
                  {/* Left Column: Form Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE DEL SERVICIO</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pink-primary)', display: 'flex', alignItems: 'center' }}>
                          {getIconComponent(newService.icon || 'Scissors', 18)}
                        </span>
                        <input className="form-input" placeholder="Ej. Corte Suprema" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                      </div>
                    </div>

                    {/* Icon Picker */}
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '1px' }}>ÁCONO ASOCIADO</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {AVAILABLE_ICONS.map(ic => (
                          <button
                            key={ic.name}
                            title={ic.label}
                            onClick={() => setNewService({...newService, icon: ic.name})}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              border: newService.icon === ic.name
                                ? '2px solid var(--pink-primary)'
                                : '1px solid rgba(255,255,255,0.08)',
                              background: newService.icon === ic.name
                                ? 'rgba(196,139,159,0.15)'
                                : 'rgba(255,255,255,0.04)',
                              color: newService.icon === ic.name ? 'var(--pink-primary)' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.18s',
                              flexShrink: 0
                            }}
                          >
                            {getIconComponent(ic.name, 17)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DESCRIPCIÁ“N DEL SERVICIO</label>
                      <textarea 
                        className="form-input" 
                        placeholder="Describe los beneficios premium del servicio..." 
                        value={newService.description || ''} 
                        onChange={e => setNewService({...newService, description: e.target.value})} 
                        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                        style={{ width: '100%', minHeight: '80px', paddingTop: '12px', resize: 'none', fontSize: '13px', lineHeight: '1.5', overflow: 'hidden' }} 
                      />
                    </div>

                    <div className="modal-grid-2col">
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>PRECIO ($)</label>
                        <div className="premium-price-input-container">
                          <span className="price-currency-symbol">$</span>
                          <input 
                            className="price-input-field" 
                            type="number" 
                            placeholder="25" 
                            value={newService.price === 0 ? '' : newService.price} 
                            onChange={e => setNewService({...newService, price: e.target.value === '' ? '' : Number(e.target.value)})} 
                          />
                          {rates?.usd > 0 && (
                            <div className="price-bs-equivalent">
                              â‰ˆ {Math.round((Number(newService.price) || 0) * rates.usd).toLocaleString()} Bs.
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px' }}>DURACIÁ“N (MIN)</label>
                        <input className="form-input" type="number" placeholder="45" value={newService.duration === 0 ? '' : newService.duration} onChange={e => setNewService({...newService, duration: e.target.value === '' ? '' : Number(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>

                    <div className="modal-grid-2col">
                      <JanaSelect 
                        label="CATEGORÁA"
                        value={newService.category}
                        onChange={val => setNewService({...newService, category: val})}
                        options={categories.map(c => ({ label: c.name, value: c.name }))}
                      />
                      <JanaSelect 
                        label="ESTRATEGIA"
                        value={newService.strategy_type}
                        onChange={val => setNewService({...newService, strategy_type: val})}
                        options={strategies.map(strat => ({ label: strat.label, value: strat.value }))}
                      />
                    </div>

                    {/* Commissions Distribution */}
                    <div className="modal-commissions">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '16px', letterSpacing: '1px' }}>
                        <DollarSign size={14} /> DISTRIBUCIÁ“N DE INGRESOS (%)
                      </label>
                      
                      <div className="commissions-fields-grid" style={{ marginBottom: '16px' }}>
                        <div className="form-group">
                          <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>COMISIÁ“N ESTILISTA (%)</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            placeholder="40"
                            value={newService.commission_stylist === 0 ? '' : newService.commission_stylist} 
                            onChange={e => setNewService({...newService, commission_stylist: e.target.value === '' ? 0 : Number(e.target.value)})} 
                            style={{ width: '100%', fontSize: '15px', fontWeight: '800', height: '48px', color: 'var(--pink-primary)' }} 
                          />
                        </div>

                        <div className="form-group">
                          <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>GANANCIA SALÁ“N (%)</label>
                          <input 
                            className="form-input" 
                            type="number" 
                            readOnly
                            value={100 - (Number(newService.commission_stylist) || 0)} 
                            style={{ width: '100%', fontSize: '15px', fontWeight: '800', height: '48px', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.01)', cursor: 'not-allowed' }} 
                          />
                        </div>
                      </div>
                      
                      {/* Business Net Margin Indicator */}
                      {(newService.price > 0) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                          
                          {/* Row 1: Ganancia Estilismo */}
                          <div style={{ 
                            padding: '12px 16px', 
                            borderRadius: '14px', 
                            background: 'rgba(50, 215, 75, 0.05)', 
                            border: '1px solid rgba(50, 215, 75, 0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: '800', color: '#32d74b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Ganancia Real Estilismo
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                                ${((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0) / 100)).toFixed(2)}
                              </div>
                            </div>
                            {rates?.usd > 0 && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>EQUIVALENTE BS.</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#32d74b', marginTop: '2px' }}>
                                  {Math.round(((Number(newService.price) || 0) - ((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0) / 100)) * rates.usd).toLocaleString()} Bs.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Row 2: Pago Estilista */}
                          <div style={{ 
                            padding: '12px 16px', 
                            borderRadius: '14px', 
                            background: 'rgba(196, 139, 159, 0.05)', 
                            border: '1px solid rgba(196, 139, 159, 0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--pink-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Pago Real Estilista
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                                ${(((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0)) / 100).toFixed(2)}
                              </div>
                            </div>
                            {rates?.usd > 0 && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: '700' }}>EQUIVALENTE BS.</div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--pink-primary)', marginTop: '2px' }}>
                                  {Math.round((((Number(newService.price) || 0) * (Number(newService.commission_stylist) || 0)) / 100) * rates.usd).toLocaleString()} Bs.
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Checklist */}
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1px' }}>
                        <LayoutList size={16} /> CHECKLIST (INCLUIDO)
                      </label>
                      <button 
                        onClick={() => setIsExtrasModalOpen(true)}
                        style={{ 
                          background: 'rgba(196,139,159,0.1)', 
                          border: '1px solid rgba(212,160,154,0.2)', 
                          borderRadius: '8px', 
                          padding: '4px 12px', 
                          fontSize: '10px',
                          fontWeight: '800',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          cursor: 'pointer', 
                          color: 'var(--pink-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        <Settings size={12} /> Items
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                      {baseItems.map(item => (
                        <div key={item.id} style={{ position: 'relative' }} className="group">
                          <button 
                            onClick={() => {
                              const current = newService.included_items || [];
                              const next = current.includes(item.name) 
                                ? current.filter(i => i !== item.name)
                                : [...current, item.name];
                              setNewService({...newService, included_items: next});
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              background: newService.included_items?.includes(item.name) ? 'rgba(196,139,159,0.15)' : 'rgba(255,255,255,0.02)',
                              border: newService.included_items?.includes(item.name) ? '1px solid var(--pink-primary)' : '1px solid rgba(255,255,255,0.05)',
                              color: newService.included_items?.includes(item.name) ? 'white' : 'var(--text-muted)'
                            }}
                          >
                            <div style={{ 
                              width: '18px', 
                              height: '18px', 
                              borderRadius: '4px', 
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: newService.included_items?.includes(item.name) ? 'var(--pink-primary)' : 'transparent'
                            }}>
                              {newService.included_items?.includes(item.name) && <Check size={12} color="black" strokeWidth={4} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700' }}>{item.name}</div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="modal-actions-wrapper">
                  <button 
                    onClick={() => { setShowAddForm(false); setIsEditing(false); }} 
                    style={{ height: '54px', padding: '0 30px', fontSize: '16px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Cancelar
                  </button>
                  <button className="btn-pink" onClick={handleCreateService} style={{ height: '54px', padding: '0 40px', fontSize: '16px', borderRadius: '16px' }}>
                    {isEditing ? 'Guardar Cambios' : 'Lanzar Servicio al Catálogo'}
                  </button>
                </div>
              </div> {/* Closing jana-scrollbar */}
              </div>
            </div>
          )
        )}
      </AnimatedModal>
    </div>
  );
};

export default ServicesModule;
