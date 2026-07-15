import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Edit2, 
  Plus, 
  Trash2, 
  Check, 
  Shield, 
  Key,
  Info,
  Crown,
  Sparkles,
  UserCheck,
  Package,
  Users,
  ChevronRight
} from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { useDialog } from '../context/DialogContext';
import AnimatedModal from './AnimatedModal';

// Map role names to icons & accent colors
const ROLE_STYLES = {
  'Admin':          { icon: Crown,     color: '#c48b9f', bg: 'rgba(196,139,159,0.12)' },
  'Estilista':      { icon: Sparkles,  color: '#c48b9f', bg: 'rgba(196,139,159,0.12)' },
  'Recepcionista':  { icon: UserCheck, color: '#30d158', bg: 'rgba(48,209,88,0.12)'  },
  'Caja':           { icon: Package,   color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' },
  'Asistente de Lavado': { icon: Users, color: '#64d2ff', bg: 'rgba(100,210,255,0.12)' },
};

const getRoleStyle = (name) => {
  for (const key of Object.keys(ROLE_STYLES)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return ROLE_STYLES[key];
  }
  return { icon: Shield, color: 'var(--pink-primary)', bg: 'rgba(196,139,159,0.1)' };
};

const RoleManagerModal = ({ isOpen, onClose, roles, onSaveRole, onDeleteRole, availableModules }) => {
  const { confirm } = useDialog();
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] });

  useScrollLock(isOpen);

  const handleEditClick = (roleName, perms) => {
    setEditingRole(roleName);
    setFormData({ name: roleName, permissions: [...perms] });
  };

  const handleCreateClick = () => {
    setEditingRole('__NEW__');
    setFormData({ name: '', permissions: [] });
  };

  const togglePermission = (modId) => {
    const newPerms = formData.permissions.includes(modId)
      ? formData.permissions.filter(p => p !== modId)
      : [...formData.permissions, modId];
    setFormData({ ...formData, permissions: newPerms });
  };

  const handleSave = () => {
    if (!formData.name) return;
    onSaveRole(formData.name, formData.permissions, editingRole === '__NEW__' ? null : editingRole);
    setEditingRole(null);
  };

  const handleDeleteRole = async (roleName) => {
    const accepted = await confirm(`¿Seguro que deseas eliminar el rol "${roleName}"? Esta acción puede afectar permisos del equipo.`);
    if (!accepted) return;
    onDeleteRole(roleName);
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(74, 48, 54, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div className={`${cardClass}`} style={{
            width: '100%', maxWidth: '680px', maxHeight: '90vh',
            borderRadius: '28px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid rgba(223, 178, 140, 0.3)',
            boxShadow: '0 24px 60px rgba(74, 48, 54, 0.15)'
          }}>

            {/* Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(223, 178, 140, 0.15)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(90deg, rgba(201, 114, 130, 0.05) 0%, transparent 60%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(196,139,159,0.2), rgba(196,139,159,0.05))',
                  border: '1px solid rgba(196,139,159,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(196,139,159,0.15)'
                }}>
                  <Shield size={22} color="var(--pink-primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '900', margin: 0, letterSpacing: '-0.3px', color: '#2d1b22' }}>Gestión de Roles</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0', fontWeight: '500' }}>Define accesos y permisos por cargo</p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(201, 114, 130, 0.08)', border: '1px solid rgba(201, 114, 130, 0.12)',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,69,58,0.15)'; e.currentTarget.style.color = '#ff453a'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)'; e.currentTarget.style.color = '#2d1b22'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }} className="jana-scrollbar">
              {!editingRole ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      Roles Actuales
                    </span>
                    <button
                      onClick={handleCreateClick}
                      className="btn-pink" style={{ color: 'white' }}
                      style={{ padding: '8px 18px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={15} /> Nuevo Rol
                    </button>
                  </div>

                  {Object.entries(roles).map(([name, perms]) => {
                    const style = getRoleStyle(name);
                    const RoleIcon = style.icon;
                    return (
                      <div key={name} style={{
                        padding: '16px 20px',
                        borderRadius: '18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(201, 114, 130, 0.04)',
                        border: '1px solid rgba(223, 178, 140, 0.2)',
                        transition: 'all 0.2s',
                        gap: '12px'
                      }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)'; e.currentTarget.style.borderColor = 'rgba(223, 178, 140, 0.35)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(201, 114, 130, 0.04)'; e.currentTarget.style.borderColor = 'rgba(223, 178, 140, 0.2)'; }}
                      >
                        {/* Role icon badge */}
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '12px',
                          background: style.bg,
                          border: `1px solid ${style.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <RoleIcon size={20} color={style.color} />
                        </div>

                        {/* Role info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: '#2d1b22' }}>{name}</div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {perms.slice(0, 4).map(p => (
                              <span key={p} style={{
                                fontSize: '10px',
                                background: `${style.color}18`,
                                color: style.color,
                                border: `1px solid ${style.color}30`,
                                padding: '2px 10px',
                                borderRadius: '50px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                {availableModules.find(m => m.id === p)?.label || p}
                              </span>
                            ))}
                            {perms.length > 4 && (
                              <span style={{
                                fontSize: '10px', color: 'var(--text-muted)',
                                background: 'rgba(201, 114, 130, 0.08)',
                                padding: '2px 10px', borderRadius: '50px',
                                fontWeight: '700', border: '1px solid rgba(223, 178, 140, 0.2)'
                              }}>+{perms.length - 4} más</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => handleEditClick(name, perms)}
                            style={{
                              background: 'rgba(201, 114, 130, 0.06)', border: '1px solid rgba(201, 114, 130, 0.12)',
                              padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', color: 'var(--pink-primary)',
                              transition: 'all 0.2s', display: 'flex', alignItems: 'center'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(201, 114, 130, 0.15)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(201, 114, 130, 0.06)'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(name)}
                            style={{
                              background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.15)',
                              padding: '8px 10px', borderRadius: '10px', cursor: 'pointer', color: '#ff453a',
                              transition: 'all 0.2s', display: 'flex', alignItems: 'center'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,69,58,0.18)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,69,58,0.08)'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Nombre del Rol</label>
                    <input
                      className="form-input"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Especialista de Color"
                      style={{ width: '100%', height: '50px', borderRadius: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ padding: '20px', backgroundColor: 'rgba(201, 114, 130, 0.04)', borderRadius: '20px', border: '1px solid rgba(223, 178, 140, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <Key size={16} color="var(--pink-primary)" />
                      <label style={{ fontSize: '11px', fontWeight: '900', color: '#2d1b22', letterSpacing: '1px', textTransform: 'uppercase' }}>Permisos</label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {availableModules.map(mod => {
                        const active = formData.permissions.includes(mod.id);
                        return (
                          <div
                            key={mod.id}
                            onClick={() => togglePermission(mod.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              backgroundColor: active ? 'rgba(196,139,159,0.12)' : '#fff',
                              border: `1px solid ${active ? 'rgba(196,139,159,0.55)' : 'rgba(223, 178, 140, 0.2)'}`,
                              cursor: 'pointer', transition: 'all 0.18s'
                            }}
                          >
                            <div style={{
                              width: '20px', height: '20px', borderRadius: '6px',
                              border: `1.5px solid ${active ? 'var(--pink-primary)' : 'rgba(223, 178, 140, 0.4)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              backgroundColor: active ? 'var(--pink-primary)' : 'transparent',
                              transition: 'all 0.18s'
                            }}>
                              {active && <Check size={13} color="black" strokeWidth={3} />}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: active ? '#2d1b22' : 'var(--text-secondary)' }}>{mod.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                    <button
                      onClick={() => setEditingRole(null)}
                      style={{ flex: 1, height: '50px', borderRadius: '14px', border: '1px solid rgba(201, 114, 130, 0.12)', background: 'rgba(201, 114, 130, 0.08)', color: '#2d1b22', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(201, 114, 130, 0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(201, 114, 130, 0.08)'}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      className="btn-pink"
                      style={{ flex: 2, height: '50px', borderRadius: '14px', fontWeight: '800' }}
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 28px',
              background: 'linear-gradient(90deg, rgba(201, 114, 130, 0.05) 0%, transparent 70%)',
              borderTop: '1px solid rgba(223, 178, 140, 0.15)',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <Info size={15} color="var(--pink-primary)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '11px', color: '#6b5a60', margin: 0, fontWeight: '600' }}>
                Los cambios en los permisos se aplicarán a los nuevos miembros que se unan con este rol.
              </p>
            </div>

          </div>
        </div>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default RoleManagerModal;
