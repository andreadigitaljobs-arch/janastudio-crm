import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  EyeOff
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AstroSelect from './AstroSelect';
import AstroCamera from './AstroCamera';
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

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}>Jana <span className="text-pink">Team</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Gestión de talento y desempeño.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isMobile && (
            <button 
              className="btn-pink" 
              onClick={() => setIsRoleModalOpen(true)}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Shield size={18} style={{ marginRight: '8px' }} /> Roles
            </button>
          )}
          <button className="btn-pink" onClick={() => showForm ? handleCloseForm() : setShowForm(true)}>
            {showForm ? <X size={18} style={{ marginRight: '8px' }} /> : <UserPlus size={18} style={{ marginRight: '8px' }} />}
            {showForm ? 'Cancelar' : 'Nuevo miembro'}
          </button>
        </div>
      </div>

      {(showForm || isFormExiting) && !isEditing && (
        <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} style={{ 
          marginBottom: '32px', 
          padding: '32px', 
          borderRadius: '28px', 
          position: 'relative', 
          zIndex: 999,
          overflow: 'visible' 
        }}>
          <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800' }}>
            Nuevo integrante del equipo
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
            {/* Photo Section */}
            <div style={{ position: 'relative', width: '120px' }}>
              <div 
                onClick={() => setShowCamera(true)}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  borderRadius: '24px', 
                  border: '2px dashed var(--border-color)',
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
                    <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: formatName(e.target.value)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROL EN EL EQUIPO</label>
                  
                  <AstroSelect 
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
                          className="form-input" 
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
                        className="form-input" 
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
              <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Key size={18} color="var(--pink-primary)" />
                  <label style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>MÓDULOS ACCESIBLES</label>
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
                        backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(196,139,159,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${formData.permissions.includes(mod.id) ? 'var(--pink-primary)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
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
                        backgroundColor: formData.permissions.includes(mod.id) ? 'var(--pink-primary)' : 'transparent'
                      }}>
                        {formData.permissions.includes(mod.id) && <Check size={14} color="black" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: formData.permissions.includes(mod.id) ? 'white' : 'var(--text-secondary)' }}>{mod.label}</span>
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
                    <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CUMPLEAÑOS</label>
                  <div style={{ position: 'relative' }}>
                    <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <BirthdayTextInput value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DIRECCIÓN DE HABITACIÓN</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input className="form-input" placeholder="Av. Principal, Edif..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                  </div>
                </div>
              </div>

              {/* Login Credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', padding: '20px', backgroundColor: 'rgba(196,139,159,0.03)', borderRadius: '16px', border: '1px solid rgba(196,139,159,0.1)' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL DE ACCESO</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input className="form-input" type="email" placeholder="persona@janastudio.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(196,139,159,0.2)' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '8px', letterSpacing: '1px' }}>CONTRASEÑA</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                    <input 
                      className="form-input" 
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
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--pink-primary)" />
        </div>
      ) : staff.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <User size={64} color="rgba(212, 175, 55, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>El equipo está esperando</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando a los miembros que harán brillar tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr auto' : '80px 1.5fr 1fr 1.5fr 1.2fr 140px', 
            gap: '20px', 
            padding: '0 24px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            {!isMobile && (
              <>
                <div>MIEMBRO</div>
                <div>NOMBRE / ROL</div>
                <div>TELÉFONO</div>
                <div>DIRECCIÓN</div>
                <div>ACCESO</div>
                <div style={{ textAlign: 'right' }}>ACCIONES</div>
              </>
            )}
          </div>
 
          {staff.map(person => (
            <React.Fragment key={person.id}>
              {isMobile ? (
                <div className="glass-card animate-slide-up" style={{ 
                  padding: '16px', 
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.3s'
                }}>
                  {/* Top section: Photo + Name/Role + Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Photo */}
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                    flexShrink: 0
                      }}>
                        {person.image_url ? (
                          <img src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--pink-primary)', opacity: 0.5 }}>
                            {person.name.substring(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      {/* Name and Role */}
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--pink-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>
                          {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.role?.split('|')[0]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button className="action-btn" onClick={() => setProfileModalData(person)} title="Ver Perfil" style={{ color: 'var(--pink-primary)', backgroundColor: 'rgba(196,139,159,0.1)', width: '34px', height: '34px', borderRadius: '8px' }}>
                        <User size={15} />
                      </button>
                      <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar Miembro" style={{ width: '34px', height: '34px', borderRadius: '8px' }}>
                        <Edit2 size={15} />
                      </button>
                      <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)', width: '34px', height: '34px', borderRadius: '8px' }} title="Dar de baja">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }} />

                  {/* Details Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    {/* Phone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      <Phone size={13} color={person.phone ? "var(--pink-primary)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.phone || 'Sin teléfono'}</span>
                    </div>

                    {/* Address */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      <MapPin size={13} color={person.address ? "var(--pink-primary)" : "rgba(255,255,255,0.2)"} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person.address || 'Sin dirección'}
                      </span>
                    </div>

                    {/* Access */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={13} color={person.email ? '#32d74b' : '#ff453a'} style={{ flexShrink: 0 }} />
                      {person.email ? (
                        <span style={{ color: '#32d74b', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.email}</span>
                      ) : (
                        <span style={{ color: '#ff453a', fontWeight: '700' }}>Sin email de acceso</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card animate-slide-up" style={{ 
                  padding: '16px 24px', 
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  display: 'grid',
                  gridTemplateColumns: '80px 1.5fr 1fr 1.5fr 1.2fr 140px',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'all 0.3s'
                }}>
                  {/* Photo Column */}
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '14px', 
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    {person.image_url ? (
                      <img src={person.image_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--pink-primary)', opacity: 0.5 }}>
                        {person.name.substring(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Name/Role Column */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--pink-primary)', fontSize: '11px', fontWeight: '700', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getRoleIcon(person.role?.split('|')[0]?.split(', ')[0])}
                      <span>{person.role?.split('|')[0]}</span>
                      {person.role?.split('|')[0]?.includes(', ') && (
                        <span style={{ 
                          padding: '2px 6px', 
                          backgroundColor: 'rgba(196,139,159,0.1)', 
                          borderRadius: '4px', 
                          fontSize: '9px',
                          marginLeft: '4px',
                          border: '1px solid rgba(196,139,159,0.2)',
                          flexShrink: 0
                        }}>
                          MULTI-ROL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone Column */}
                  <div style={{ color: person.phone ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '14px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color={person.phone ? "var(--pink-primary)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.phone || 'Sin teléfono'}</span>
                    </div>
                    {person.birth_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '11px', color: 'var(--pink-primary)' }}>
                        <Cake size={12} fill="var(--pink-primary)" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{new Date(person.birth_date + 'T00:00:00').toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Address Column */}
                  <div style={{ color: person.address ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '13px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={14} color={person.address ? "var(--pink-primary)" : "rgba(255,255,255,0.2)"} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {person.address || 'Sin dirección'}
                      </span>
                    </div>
                  </div>

                  {/* Access Column */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    {person.email ? (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        backgroundColor: 'rgba(50, 215, 75, 0.08)', 
                        color: '#32d74b', 
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        maxWidth: '100%'
                      }}>
                        <Mail size={12} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{person.email}</span>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '4px 10px', 
                        backgroundColor: 'rgba(255, 69, 58, 0.08)', 
                        color: '#ff453a', 
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        maxWidth: '100%'
                      }}>
                        <Lock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>SIN EMAIL AUTH</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="action-btn" onClick={() => setProfileModalData(person)} title="Ver Perfil" style={{ color: 'var(--pink-primary)', backgroundColor: 'rgba(196,139,159,0.1)' }}>
                      <User size={18} />
                    </button>
                    <button className="action-btn" onClick={() => handleEditClick(person)} title="Editar Miembro">
                      <Edit2 size={18} />
                    </button>
                    <button className="action-btn" onClick={() => handleDeleteStaff(person.id, person.name)} style={{ color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.05)' }} title="Dar de baja">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Edit Form directly under the card being edited */}
              {(showForm || isFormExiting) && isEditing && editingId === person.id && (
                <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} style={{ 
                  marginTop: '-8px',
                  marginBottom: '24px', 
                  marginLeft: isMobile ? '0' : '20px',
                  padding: '32px', 
                  borderRadius: '28px', 
                  position: 'relative', 
                  zIndex: 998,
                  overflow: 'visible',
                  border: '1px solid rgba(196,139,159,0.3)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                      Editar Perfil de <span className="text-gold">{formData.name}</span>
                    </h3>
                    <button 
                      onClick={handleCloseForm}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: 'white', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                    {/* Photo Section */}
                    <div style={{ position: 'relative', width: '120px' }}>
                      <div 
                        onClick={() => setShowCamera(true)}
                        style={{ 
                          width: '120px', 
                          height: '120px', 
                          backgroundColor: 'rgba(255,255,255,0.05)', 
                          borderRadius: '24px', 
                          border: '2px dashed var(--border-color)',
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
                            <input className="form-input" placeholder="Ej. Marco Silva" value={formData.name} onChange={e => setFormData({...formData, name: formatName(e.target.value)})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>ROL EN EL EQUIPO</label>
                          
                          <AstroSelect 
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
                                  className="form-input" 
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
                                className="form-input" 
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
              <div style={{ padding: '24px', backgroundColor: '#faf5f5', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <Key size={18} color="var(--pink-primary)" />
                          <label style={{ fontSize: '12px', fontWeight: '900', color: 'white', letterSpacing: '1px' }}>MÓDULOS ACCESIBLES</label>
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
                                backgroundColor: formData.permissions.includes(mod.id) ? 'rgba(196,139,159,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${formData.permissions.includes(mod.id) ? 'var(--pink-primary)' : 'rgba(255,255,255,0.05)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
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
                        backgroundColor: formData.permissions.includes(mod.id) ? 'var(--pink-primary)' : 'transparent'
                              }}>
                                {formData.permissions.includes(mod.id) && <Check size={14} color="black" strokeWidth={3} />}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: formData.permissions.includes(mod.id) ? 'white' : 'var(--text-secondary)' }}>{mod.label}</span>
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
                            <input className="form-input" placeholder="+58 412..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>CUMPLEAÑOS</label>
                          <div style={{ position: 'relative' }}>
                            <Cake size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                            <BirthdayTextInput value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>DIRECCIÓN DE HABITACIÓN</label>
                          <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                            <input className="form-input" placeholder="Av. Principal, Edif..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px' }} />
                          </div>
                        </div>
                      </div>

                      {/* Login Credentials */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', padding: '20px', backgroundColor: 'rgba(196,139,159,0.03)', borderRadius: '16px', border: '1px solid rgba(196,139,159,0.1)' }}>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '8px', letterSpacing: '1px' }}>EMAIL DE ACCESO</label>
                          <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                            <input className="form-input" type="email" placeholder="persona@janastudio.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', height: '50px', paddingLeft: '48px', border: '1px solid rgba(196,139,159,0.2)' }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--pink-primary)', marginBottom: '8px', letterSpacing: '1px' }}>CONTRASEÑA</label>
                          <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--pink-primary)' }} />
                            <input 
                              className="form-input" 
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
                        Actualizar Perfil de Miembro
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <AstroCamera 
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
