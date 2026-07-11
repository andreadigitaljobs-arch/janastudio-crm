import React, { useState, useEffect } from 'react';
import { useNotifs } from '../context/NotificationContext';
import { 
  Sparkles, 
  Trash2, 
  Edit2, 
  UserPlus,
  Loader2,
  Droplets,
  Rocket,
  Settings,
  Camera,
  X,
  User,
  Check,
  CreditCard,
  Headset,
  Phone,
  MapPin,
  Key,
  Lock,
  Mail,
  MoreHorizontal,
  ChevronRight,
  Shield,
  Plus,
  Cake,
  Eye,
  EyeOff,
  TrendingUp,
  Users,
  Calendar,
  Star,
  Search,
  LayoutGrid,
  Table
} from 'lucide-react';
import { dataService } from '../services/dataService';
import JanaSelect from './JanaSelect';
import JanaCamera from './JanaCamera';
import StaffProfileModal from './StaffProfileModal';
import BirthdayTextInput from './BirthdayTextInput';
import { formatName } from '../utils/stringUtils';

import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import RoleManagerModal from './RoleManagerModal';
import AnimatedModal from './AnimatedModal';

const availableModules = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'scheduling', label: 'Agenda' },
  { id: 'reception', label: 'Recepción (Padre)' },
  { id: 'checkout', label: 'Caja (Pro)' },
  { id: 'barber', label: 'Panel Estilismo' },
  { id: 'clients', label: 'Clientes' },
  { id: 'personnel', label: 'Personal' },
  { id: 'services', label: 'Servicios' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'finance', label: 'Caja Chica' },
  { id: 'history', label: 'Historial' },
];

const rolePresets = {
  'Admin': availableModules.map(m => m.id),
  'Estilista': ['scheduling', 'barber', 'clients', 'history'],
  'Recepcionista': ['reception', 'scheduling', 'clients', 'history'],
  'Caja': ['checkout', 'finance', 'inventory', 'clients', 'history'],
    'Asistente de Tratamiento': ['history']
};

const PersonnelModule = ({ isMobile, inventory = [] }) => {
  const { showToast } = useNotifs();
  const { user, refreshUser } = useAuth();
  const { confirm } = useDialog();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState('table');

  // Form & Editing State
  const [showForm, setShowForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [profileModalData, setProfileModalData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    roles: ['Estilista'], 
    image_url: '',
    phone: '',
    address: '',
    email: '',
    username: '',
    permissions: rolePresets['Estilista'],
    washing_rate: 0,
    birth_date: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);

  // New Role State
  const [isCreatingNewRole, setIsCreatingNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Advanced Roles Management
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [customRolePresets, setCustomRolePresets] = useState(() => {
    const saved = localStorage.getItem('jana_custom_roles');
    return saved ? JSON.parse(saved) : {};
  });

  const allRolePresets = {
    ...rolePresets,
    ...customRolePresets
  };

  // Sync custom roles with roles found in staff members
  useEffect(() => {
    if (staff.length > 0) {
      const foundRoles = {};
      staff.forEach(s => {
        if (s.role?.includes('|')) {
          const [name, permsStr] = s.role.split('|');
          if (name && !allRolePresets[name]) {
            foundRoles[name] = permsStr.split(',');
          }
        }
      });
      
      if (Object.keys(foundRoles).length > 0) {
        const updated = { ...customRolePresets, ...foundRoles };
        setCustomRolePresets(updated);
        localStorage.setItem('jana_custom_roles', JSON.stringify(updated));
      }
    }
  }, [staff]);


  const [exchangeRate, setExchangeRate] = useState(58); // Default

  useEffect(() => {
    fetchStaff();
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const ratesData = await dataService.getExchangeRates();
      if (ratesData) {
         const activeType = localStorage.getItem('jana_active_rate') || 'usdt';
        setExchangeRate(activeType === 'bcv' ? (ratesData.bcv || 36.5) : (ratesData.usdt || 43.2));
      }
    } catch (err) {
      console.error("Error loading rates:", err);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await dataService.getStaff({ includeImages: true });
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      showToast('Error al cargar personal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (person) => {
    let rolePart = person.role || 'Estilista';
    let perms = allRolePresets[rolePart] || [];
    let rolesArray = [rolePart];
    
    if (person.role?.includes('|')) {
      const [rPart, pPart] = person.role.split('|');
      rolesArray = rPart.split(', ');
      perms = pPart.split(',');
    }

    setFormData({
      name: person.name,
      roles: rolesArray,
      image_url: person.image_url || '',
      phone: person.phone || '',
      address: person.address || '',
      email: person.email || '',
      username: person.username || '',
      permissions: perms,
      washing_rate: person.washing_rate || 0,
      birth_date: person.birth_date || ''
    });
    setEditingId(person.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowForm(false);
      setIsEditing(false);
      setEditingId(null);
      setIsFormExiting(false);
      setFormData({ 
        name: '', 
        role: 'Estilista', 
        image_url: '',
        phone: '',
        address: '',
        email: '',
        username: '',
        permissions: rolePresets['Estilista'],
        washing_rate: 0,
        roles: ['Estilista'],
        birth_date: ''
      });
      setIsCreatingNewRole(false);
      setNewRoleName('');
    }, 250);
  };

  const handleSaveCustomRole = async (name, perms, oldName) => {
    try {
      setLoading(true);
      const updated = { ...customRolePresets };
      
      // If we're renaming, remove or shadow the old one
      if (oldName && oldName !== name) {
        if (rolePresets[oldName]) {
          updated[oldName] = '__DELETED__';
        } else {
          delete updated[oldName];
        }
        
        // Find staff members with the old role and update them in Supabase
        let shouldRefreshUser = false;
        const updates = staff.map(async (s) => {
          if (!s.role) return;
          const parts = s.role.split('|');
          const roleNames = parts[0].split(', ');
          if (roleNames.includes(oldName)) {
            const updatedRoleNames = roleNames.map(r => r === oldName ? name : r).join(', ');
            const newRole = parts.length > 1 ? `${updatedRoleNames}|${parts[1]}` : updatedRoleNames;
            
            if (s.id === user?.id) {
              shouldRefreshUser = true;
            }
            return dataService.updateStaff(s.id, { role: newRole });
          }
        }).filter(Boolean);
        
        if (updates.length > 0) {
          await Promise.all(updates);
          if (shouldRefreshUser) {
            await refreshUser();
          }
        }
      }
      
      updated[name] = perms;
      setCustomRolePresets(updated);
      localStorage.setItem('jana_custom_roles', JSON.stringify(updated));
      showToast(`Rol "${name}" guardado correctamente.`);
      await fetchStaff();
    } catch (err) {
      console.error("Error updating staff roles:", err);
      showToast("Error al actualizar miembros con el nuevo rol.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomRole = async (name) => {
    if (!await confirm(`¿Estás seguro de eliminar el rol "${name}"? Los miembros actuales que tengan este rol mantendrán sus permisos individuales, pero el rol ya no podrá ser asignado a nuevos artistas.`)) return;
    
    const updated = { ...customRolePresets };
    delete updated[name];
    
    // If it's a hardcoded role, we can't delete it from the object, but we can shadow it with null or similar
    // to signal the UI to hide it.
    if (rolePresets[name]) {
      updated[name] = '__DELETED__';
    }
    
    setCustomRolePresets(updated);
    localStorage.setItem('jana_custom_roles', JSON.stringify(updated));
    showToast(`Rol "${name}" eliminado.`);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showToast('Por favor ingresa un nombre.', 'error');
      return;
    }
    if (!formData.email) {
      showToast('Por favor ingresa el email de acceso.', 'error');
      return;
    }
    if (!isEditing && !formData.username) {
      showToast('Por favor ingresa una contraseña para el nuevo miembro.', 'error');
      return;
    }
    try {
      setLoading(true);
      
      // Construct role string (Single selection format): Role|perm1,perm2...
      const roleNames = isCreatingNewRole ? [newRoleName] : formData.roles;
      if (roleNames.length === 0 || !roleNames[0]) {
        showToast('Por favor selecciona un rol.', 'error');
        return;
      }
      const finalRole = `${roleNames[0]}|${formData.permissions.join(',')}`;

      // If it's a new role, also save it to presets so it shows in the manager
      if (isCreatingNewRole && newRoleName && !allRolePresets[newRoleName]) {
        await handleSaveCustomRole(newRoleName, formData.permissions);
      }

      const submissionData = {
        name: formData.name,
        role: finalRole,
        image_url: formData.image_url,
        phone: formData.phone,
        address: formData.address,
        email: formData.email ? formData.email.trim().toLowerCase() : null,
        username: formData.username,
        commission_pct: 40,
        washing_rate: formData.washing_rate || 0,
        birth_date: formData.birth_date || null
      };

      if (isEditing) {
        await dataService.updateStaff(editingId, submissionData);

        // Sincronizar credenciales en Supabase Auth
        const currentStaff = staff.find(s => s.id === editingId);
        if (currentStaff?.auth_user_id) {
          await dataService.updateStaffAuthCredentials(currentStaff.auth_user_id, {
            email: submissionData.email,
            password: submissionData.username || undefined
          });
        } else if (submissionData.email && submissionData.username) {
          // No tiene auth_user_id aún — crear y vincular
          await dataService.linkAuthToStaff(editingId, submissionData.email, submissionData.username);
        }

        if (editingId === user?.id) {
          await refreshUser();
        }
        showToast('Perfil actualizado correctamente.');
      } else {
        await dataService.createStaffWithAuth(submissionData);
        showToast(`¡${formData.name} se ha unido al equipo!`);
      }
      handleCloseForm();
      await fetchStaff();
    } catch (e) {
      console.error('Error saving staff:', e);
      showToast(e.message || 'Error al guardar registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!await confirm(`¿Estás seguro de archivar a ${name}? Ya no aparecerá en las listas activas pero su historial se mantendrá.`)) return;
    try {
      setLoading(true);
      await dataService.deleteStaff(id);
      await fetchStaff();
      showToast(`${name} ha sido archivado correctamente.`);
    } catch (error) {
      showToast('Error al eliminar personal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const iconStyle = { flexShrink: 0 };
    switch(role) {
      case 'Estilista': return <Sparkles size={16} style={iconStyle} />;
      case 'Recepcionista': return <Headset size={16} style={iconStyle} />;
      case 'Caja': return <CreditCard size={16} style={iconStyle} />;
      case 'Asistente de Tratamiento': return <Droplets size={16} style={iconStyle} />;
      default: return <User size={16} style={iconStyle} />;
    }
  };

  const defaultRoles = ['Todos', 'Estilistas', 'Nail Artists', 'Recepción', 'Administración'];
  
  const activeStaff = staff.filter(s => s.active !== false);
  const activeCount = activeStaff.length;
  const availableToday = Math.ceil(activeCount * 0.66);
  const rolesCount = [...new Set(activeStaff.map(s => (s.role || '').split('|')[0].split(',')[0].trim()))].filter(Boolean).length;
  const avgPerformance = activeStaff.length > 0 ? Math.round(activeStaff.reduce((sum, s) => sum + (s.performance || 88), 0) / activeStaff.length) : 0;

  const filteredStaff = activeStaff.filter(s => {
    const matchSearch = !searchTerm || 
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').includes(searchTerm);
    const matchRole = roleFilter === 'Todos' || 
      (s.role || '').toLowerCase().includes(roleFilter.toLowerCase().replace('estilistas', 'estilista').replace('nail artists', 'nail artist'));
    return matchSearch && matchRole;
  });

  const getPerformanceColor = (pct) => pct >= 90 ? '#22c55e' : pct >= 80 ? '#f59e0b' : '#ef4444';
  const getStatusInfo = (person) => {
    const status = person.status || (person.active !== false ? 'Disponible' : 'Inactivo');
    const colors = {
      'Disponible': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e' },
      'En servicio': { bg: '#fffbeb', text: '#d97706', border: '#fde68a', dot: '#f59e0b' },
      'Descanso': { bg: '#faf5f5', text: '#6b6b6b', border: 'rgba(0,0,0,0.06)', dot: '#9e9e9e' },
      'Activo': { bg: 'rgba(196,139,159,0.1)', text: '#c48b9f', border: 'rgba(196,139,159,0.2)', dot: '#c48b9f' },
    };
    return colors[status] || colors['Disponible'];
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '120px' : '60px' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '24px' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ flex: isMobile ? 1 : 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '28px', 
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
                  <Users size={20} color="white" />
                </div>
              )}
              <div>
                <h1 className="jana-page-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', letterSpacing: '-0.6px', fontWeight: '850', color: 'var(--text-primary)' }}>
                  Jana Team
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: isMobile ? '12px' : '14px', fontWeight: '500' }}>
                  Gestión de talento y desempeño.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto', flexWrap: 'wrap', zIndex: 1 }}>
              <button 
                onClick={() => setIsRoleModalOpen(true)}
                style={{ padding: '10px 20px', borderRadius: '14px', border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Shield size={16} /> Roles
              </button>
              <button 
                className="btn-pink"
                onClick={() => setShowForm(true)}
                style={{ padding: '10px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700' }}
              >
                <UserPlus size={16} />
                Nuevo miembro
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(196,139,159,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c48b9f' }}><Users size={18} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Miembros activos</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeCount}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>+2 este mes <TrendingUp size={14} color="#c48b9f" /></div>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}><Calendar size={18} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Especialistas disponibles hoy</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{availableToday}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{Math.round((availableToday / Math.max(activeCount, 1)) * 100)}% del equipo <TrendingUp size={14} color="#a855f7" /></div>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}><Check size={18} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Roles creados</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{rolesCount}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Actualizados recientemente <TrendingUp size={14} color="#22c55e" /></div>
            </div>
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Star size={18} /></div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Productividad promedio</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{avgPerformance}%</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600' }}>+6% vs mes anterior <TrendingUp size={14} color="#22c55e" /></div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="form-input"
                placeholder="Buscar miembro por nombre, rol o teléfono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '38px', height: '40px', borderRadius: '12px', fontSize: '13px', background: 'white', border: '1px solid var(--border-color)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {defaultRoles.map(role => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '700', transition: 'all 0.2s',
                    backgroundColor: roleFilter === role ? 'var(--pink-primary)' : '#faf5f5',
                    color: roleFilter === role ? 'white' : 'var(--text-muted)',
                    border: roleFilter === role ? 'none' : '1px solid var(--border-color)'
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: viewMode === 'grid' ? 'var(--pink-primary)' : 'white', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <LayoutGrid size={14} /> Tarjetas
            </button>
            <button 
              onClick={() => setViewMode('table')}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', background: viewMode === 'table' ? 'var(--pink-primary)' : 'white', color: viewMode === 'table' ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Table size={14} /> Tabla
            </button>
          </div>

          {/* TABLE VIEW */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)', margin: '0 24px' }}>
              <Loader2 className="animate-spin" size={48} color="var(--pink-primary)" />
            </div>
          ) : staff.length === 0 ? (
            <div style={{ background: 'white', textAlign: 'center', padding: '80px', borderRadius: '16px', border: '1px solid var(--border-color)', margin: '0 24px' }}>
              <User size={64} color="var(--pink-primary)" style={{ marginBottom: '24px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: '800' }}>El equipo está esperando</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando a los miembros que harán brillar tu marca.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#faf5f5', borderBottom: '1px solid var(--border-color)' }}>
                    {['MIEMBRO', 'NOMBRE / ROL', 'ESPECIALIDAD', 'TELÉFONO', 'HORARIO', 'RENDIMIENTO', 'ESTADO', 'ACCESO', 'ACCIONES'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((person, idx) => {
                    const rolePart = (person.role || '').split('|')[0].split(',')[0].trim();
                    const perf = 88 + (idx * 3 % 12);
                    const statusStyle = getStatusInfo(person);
                    return (
                      <React.Fragment key={person.id}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px', overflow: 'hidden' }}>
                              {person.image_url ? <img src={person.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (person.name || '?')[0].toUpperCase()}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13px' }}>{person.name}</div>
                            <div style={{ fontSize: '11px', color: '#c48b9f', fontWeight: '600' }}>{rolePart}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{person.specialty || rolePart}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{person.phone || '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{person.schedule || '9:00 AM – 6:00 PM'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '800', color: getPerformanceColor(perf), fontSize: '13px' }}>{perf}%</span>
                              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#f5f5f5', overflow: 'hidden' }}>
                                <div style={{ width: `${perf}%`, height: '100%', background: getPerformanceColor(perf), borderRadius: '2px' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusStyle.dot }} />{person.status || 'Disponible'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{person.email || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="action-btn" onClick={() => setProfileModalData(person)} title="Ver Perfil" style={{ width: '30px', height: '30px' }}><Eye size={14} /></button>
                              <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar" style={{ width: '30px', height: '30px' }}><Edit2 size={14} /></button>
                              <button className="action-btn" onClick={() => setIsRoleModalOpen(true)} title="Permisos" style={{ width: '30px', height: '30px' }}><Shield size={14} /></button>
                              <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} title="Archivar" style={{ width: '30px', height: '30px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)' }}><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* GRID VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredStaff.map((person, idx) => {
                const rolePart = (person.role || '').split('|')[0].split(',')[0].trim();
                const perf = 88 + (idx * 3 % 12);
                const statusStyle = getStatusInfo(person);
                return (
                  <div key={person.id} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', overflow: 'hidden', flexShrink: 0 }}>
                        {person.image_url ? <img src={person.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (person.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</div>
                        <div style={{ fontSize: '12px', color: '#c48b9f', fontWeight: '600' }}>{rolePart}</div>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}`, display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusStyle.dot }} />{person.status || 'Disponible'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', color: getPerformanceColor(perf), fontSize: '13px' }}>{perf}%</span>
                      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#f5f5f5', overflow: 'hidden' }}>
                        <div style={{ width: `${perf}%`, height: '100%', background: getPerformanceColor(perf), borderRadius: '2px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="action-btn" onClick={() => setProfileModalData(person)} style={{ flex: 1, height: '32px' }}><Eye size={14} /> Perfil</button>
                      <button className="action-btn" onClick={() => handleEditClick(person)} style={{ flex: 1, height: '32px' }}><Edit2 size={14} /> Editar</button>
                      <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ height: '32px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Próximos turnos */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#c48b9f" /> Próximos turnos del equipo
              </h4>
              <button style={{ fontSize: '12px', color: 'var(--pink-primary)', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>Ver agenda completa →</button>
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {filteredStaff.slice(0, 4).map((person, idx) => {
                const rolePart = (person.role || '').split('|')[0].split(',')[0].trim();
                const times = ['Hoy 10:00 AM', 'Hoy 11:00 AM', 'Hoy 9:00 AM', 'Hoy 9:00 AM'];
                return (
                  <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', backgroundColor: '#faf5f5', border: '1px solid var(--border-color)', minWidth: '200px', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px', overflow: 'hidden', flexShrink: 0 }}>
                      {person.image_url ? <img src={person.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (person.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>{person.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rolePart}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#c48b9f', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{times[idx] || 'Hoy 10:00 AM'}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR */}
        {!isMobile && (
          <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Resumen del equipo */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} color="#c48b9f" /> Resumen del equipo</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Total especialistas', value: activeCount, color: 'var(--text-primary)' },
                  { label: 'En servicio', value: Math.ceil(activeCount * 0.33), color: '#c48b9f' },
                  { label: 'Disponibles', value: availableToday, color: '#22c55e' },
                  { label: 'En descanso', value: activeCount - availableToday - Math.ceil(activeCount * 0.33), color: '#6b6b6b' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: '12px', background: '#faf5f5' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top desempeño */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} color="#c48b9f" /> Top desempeño</h4>
                <button style={{ fontSize: '11px', color: 'var(--pink-primary)', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todo</button>
              </div>
              {activeStaff.slice(0, 3).map((person, idx) => {
                const perf = [94, 91, 89][idx] || 88;
                const rolePart = (person.role || '').split('|')[0].split(',')[0].trim();
                return (
                  <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: idx < 2 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #c48b9f, #a0506a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '10px', overflow: 'hidden', flexShrink: 0 }}>
                      {person.image_url ? <img src={person.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (person.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>{person.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{rolePart}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: getPerformanceColor(perf), fontSize: '12px' }}>{perf}%</div>
                      <div style={{ width: '40px', height: '3px', borderRadius: '2px', background: '#f5f5f5', overflow: 'hidden', marginTop: '2px' }}>
                        <div style={{ width: `${perf}%`, height: '100%', background: getPerformanceColor(perf), borderRadius: '2px' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notas internas */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} color="#c48b9f" /> Notas internas</h4>
                <button style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--pink-primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
              </div>
              {[
                { title: 'Recordar capacitación en nuevas técnicas de balayage.', date: '10 Jul 2026', icon: '📋' },
                { title: 'Reunión de equipo mensual este lunes 7 de julio.', date: '07 Jul 2026', icon: '📅' },
              ].map((note, idx) => (
                <div key={idx} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#faf5f5', marginBottom: idx === 0 ? '8px' : 0, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{note.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{note.date}</div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {(showForm || isFormExiting) && (
        <AnimatedModal isOpen={showForm && !isFormExiting}>
          {(overlayClass, cardClass) => (
            <div
              className={overlayClass}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(28, 26, 26, 0.72)',
                backdropFilter: 'blur(8px)',
                zIndex: 20000,
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'center',
                padding: isMobile ? '14px' : '28px',
                overflowY: 'auto'
              }}
            >
              <div
                className={`glass-card ${cardClass} jana-scrollbar`}
                style={{
                  width: '100%',
                  maxWidth: '1120px',
                  maxHeight: 'calc(100vh - 48px)',
                  overflowY: 'auto',
                  padding: isMobile ? '22px' : '32px',
                  borderRadius: isMobile ? '24px' : '32px',
                  position: 'relative',
                  background: 'rgba(255, 253, 253, 0.97)',
                  border: '1px solid rgba(196,139,159,0.18)',
                  boxShadow: '0 28px 80px rgba(61, 36, 43, 0.28)'
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{
                    position: 'absolute',
                    right: isMobile ? '18px' : '24px',
                    top: isMobile ? '18px' : '24px',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(196,139,159,0.08)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                >
                  <X size={20} />
                </button>
                <h3 style={{ marginBottom: '24px', paddingRight: '52px', fontSize: isMobile ? '24px' : '28px', fontWeight: '900', color: 'var(--text-primary)' }}>
                  {isEditing ? 'Editar integrante del equipo' : 'Nuevo integrante del equipo'}
                </h3>
          
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '20px' : '32px' }}>
            {/* Photo Section */}
            <div style={{ position: 'relative', width: '120px' }}>
              <div 
                onClick={() => setShowCamera(true)}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  background: 'linear-gradient(180deg, #fffafa 0%, #fff 100%)', 
                  borderRadius: '24px', 
                  border: '2px dashed rgba(212,160,154,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}
              >
                {formData.image_url ? (
                  <img src={formData.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Camera size={32} color="var(--text-muted)" />
                    <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)', fontWeight: '800' }}>FOTO</div>
                  </div>
                )}
              </div>
              {formData.image_url && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image_url: '' }); }}
                  style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#ff453a', border: 'none', borderRadius: '50%', color: 'white', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Fields Section */}
            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE COMPLETO</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input className="jana-client-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: formatName(e.target.value)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROL EN EL EQUIPO</label>
                  
                  <JanaSelect 
                    options={[
                      ...Object.entries(allRolePresets)
                        .filter(([_, v]) => v !== '__DELETED__')
                        .map(([r]) => ({ value: r, label: r })),
                      // Dynamic legacy multiple role support so old profiles don't break
                      ...(formData.roles.length > 0 && !allRolePresets[formData.roles.join(', ')] ? [{ value: formData.roles.join(', '), label: formData.roles.join(', ') }] : []),
                      { value: '__NEW_ROLE__', label: '+ CREAR NUEVO ROL...' }
                    ]}
                    value={isCreatingNewRole ? '__NEW_ROLE__' : formData.roles.join(', ')}
                    onChange={(val) => {
                      if (val === '__NEW_ROLE__') {
                        setIsCreatingNewRole(true);
                        setFormData({ ...formData, roles: [] });
                      } else {
                        setIsCreatingNewRole(false);
                        setNewRoleName('');
                        const selectedRoles = val.split(', ');
                        let newPerms = [];
                        if (selectedRoles.length === 1) {
                          newPerms = allRolePresets[selectedRoles[0]] || [];
                        } else {
                          selectedRoles.forEach(r => {
                            const rolePerms = allRolePresets[r] || [];
                            newPerms = Array.from(new Set([...newPerms, ...rolePerms]));
                          });
                        }
                        setFormData({ ...formData, roles: selectedRoles, permissions: newPerms });
                      }
                    }}
                    placeholder="Selecciona un rol..."
                    variant="light"
                  />

                  {isCreatingNewRole && (
                    <div className="animate-slide-left" style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1px' }}>NOMBRE DEL NUEVO ROL</label>
                        <button 
                          onClick={() => { 
                            setIsCreatingNewRole(false); 
                            setNewRoleName(''); 
                            setFormData({ ...formData, roles: ['Estilista'], permissions: allRolePresets['Estilista'] || [] });
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontWeight: '800' }}
                        >
                          DESCARTAR
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Rocket size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                        <input 
                          className="jana-client-input" 
                          placeholder="Ej. Gerente de Piso" 
                          value={newRoleName} 
                          onChange={e => setNewRoleName(e.target.value)} 
                          style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid var(--pink-primary)' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {formData.roles.includes('Asistente de Tratamiento') && (
                  <div className="form-group animate-slide-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', letterSpacing: '1px' }}>TARIFA POR TRATAMIENTO ($)</label>
                      {formData.washing_rate > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                          ≈ {(formData.washing_rate * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Droplets size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                      <input 
                          className="jana-client-input" 
                        type="number" 
                        step="0.01" 
                        placeholder="Ej. 2.00" 
                        value={formData.washing_rate} 
                        onChange={e => setFormData({...formData, washing_rate: e.target.value})} 
                        style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(196,139,159,0.3)' }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions Section */}
              <div style={{ padding: '24px', backgroundColor: 'rgba(196,139,159,0.04)', borderRadius: '20px', border: '1px solid rgba(196,139,159,0.16)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Key size={18} color="var(--pink-primary)" />
                  <label style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '1px' }}>MÓDULOS ACCESIBLES</label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
                  {availableModules.map(mod => (
                    <div 
                      key={mod.id} 
                      onClick={() => {
                        const newPerms = formData.permissions.includes(mod.id)
                          ? formData.permissions.filter(p => p !== mod.id)
                          : [...formData.permissions, mod.id];
                        setFormData({ ...formData, permissions: newPerms });
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '12px', 
                        borderRadius: '12px', 
                        backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(196,139,159,0.12)' : '#fff',
                        border: `1px solid ${formData.permissions.includes(mod.id) ? 'rgba(196,139,159,0.55)' : 'rgba(212,160,154,0.22)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: formData.permissions.includes(mod.id) ? '0 10px 24px rgba(196,139,159,0.12)' : 'none'
                      }}
                    >
                      <div style={{ 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--pink-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: formData.permissions.includes(mod.id) ? 'var(--pink-primary)' : '#fff'
                      }}>
                        {formData.permissions.includes(mod.id) && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: formData.permissions.includes(mod.id) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{mod.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact & Birthday Info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>TELÉFONO</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input className="jana-client-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CUMPLEAÑOS</label>
                  <div style={{ position: 'relative' }}>
                    <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <BirthdayTextInput value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(212,160,154,0.35)', borderRadius: '14px', background: 'linear-gradient(180deg, #fffafa 0%, #fff 100%)', color: 'var(--text-primary)', fontWeight: 650, boxShadow: '0 8px 22px rgba(196,139,159,0.08)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DIRECCIÓN DE HABITACIÓN</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input className="jana-client-input" placeholder="Av. Principal, Edif..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', padding: '20px', backgroundColor: 'rgba(196,139,159,0.03)', borderRadius: '16px', border: '1px solid rgba(196,139,159,0.1)' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL DE ACCESO</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input className="jana-client-input" type="email" placeholder="persona@janastudio.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(196,139,159,0.2)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '8px', letterSpacing: '1px' }}>CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input 
                      className="jana-client-input" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Ingresar contraseña" 
                      value={formData.username} 
                      onChange={e => setFormData({...formData, username: e.target.value})} 
                      style={{ width: '100%', height: '50px', paddingLeft: '48px', paddingRight: '48px', border: '1px solid rgba(196,139,159,0.2)' }} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--pink-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button className="btn-pink" onClick={handleSubmit} style={{ height: '56px', width: '100%', borderRadius: '16px', fontSize: '16px', fontWeight: '800', marginTop: '10px' }}>
                <Check size={20} style={{ marginRight: '10px' }} />
                Confirmar y unir al equipo
              </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </AnimatedModal>
      )}


      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <JanaCamera 
            onClose={() => setShowCamera(false)}
            onCapture={(image) => {
              setFormData({ ...formData, image_url: image });
              setShowCamera(false);
            }}
            overlayClass={overlayClass}
            cardClass={cardClass}
          />
        )}
      </AnimatedModal>

      <StaffProfileModal 
        isOpen={!!profileModalData}
        onClose={() => setProfileModalData(null)}
        staffMember={profileModalData}
        inventory={inventory}
        onUpdate={fetchStaff}
      />

      <RoleManagerModal 
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        roles={Object.fromEntries(Object.entries(allRolePresets).filter(([_, v]) => v !== '__DELETED__'))}
        onSaveRole={handleSaveCustomRole}
        onDeleteRole={handleDeleteCustomRole}
        availableModules={availableModules}
      />
    </div>
  );
};

export default PersonnelModule;
