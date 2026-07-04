import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, CreditCard, Loader2, Calendar } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { ModalShield } from '../context/ModalContext';
import AstroDatePicker from './AstroDatePicker';
import AnimatedModal from './AnimatedModal';
import { formatName } from '../utils/stringUtils';
import { useScrollLock } from '../hooks/useScrollLock';

const NewClientModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useNotifs();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    id_card: '',
    birth_date: ''
  });

  useScrollLock(isOpen);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.id_card) {
      showToast('Por favor completa todos los campos.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Check for duplicate id_card
      const existing = await dataService.checkClientExists(formData.id_card);
      if (existing) {
        showToast(`La cédula ${formData.id_card} ya está registrada a nombre de ${existing.name}.`, 'warning');
        setLoading(false);
        return;
      }

      const newClient = await dataService.addClient(formData);
      
      showToast(`Cliente ${newClient.name} registrado con éxito`);
      if (onSuccess) onSuccess(newClient);
      onClose();
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation code
        showToast('Esta cédula ya está registrada en el sistema.', 'error');
      } else {
        showToast('Error de conexión con la base de datos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <ModalShield active={true}>
          <div className={overlayClass} style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(10px)', 
            zIndex: 10000, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '20px' 
          }}>
            <div className={`glass-card ${cardClass}`} style={{ 
              maxWidth: '450px', 
              width: '100%', 
              borderRadius: '32px', 
              border: '1.5px solid rgba(196,139,159,0.3)',
              padding: '32px',
              position: 'relative'
            }}>
              <button 
                onClick={onClose} 
                style={{ 
                  position: 'absolute', 
                  top: '24px', 
                  right: '24px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: 'none', 
                  color: 'white', 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <X size={18} />
              </button>

              <header style={{ marginBottom: '32px' }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '900', 
                  color: 'white', 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <User size={24} color="var(--pink-primary)" />
                  <span>Nuevo <span className="text-gold">Cliente</span></span>
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Completa los datos para registrarlo en el sistema.
                </p>
              </header>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Nombre y Apellido
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--pink-primary)" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Ej. Juan Pérez" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: formatName(e.target.value)})}
                      style={{ width: '100%', paddingLeft: '48px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Teléfono
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--pink-primary)" />
                    <input 
                      type="tel" 
                      placeholder="Ej. 04121234567" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      style={{ width: '100%', paddingLeft: '48px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Cédula de Identidad
                  </label>
                  <div style={{ position: 'relative' }}>
                    <CreditCard style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--pink-primary)" />
                    <input 
                      type="text" 
                      placeholder="Ej. 25.123.456" 
                      value={formData.id_card}
                      onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                      style={{ width: '100%', paddingLeft: '48px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Fecha de Nacimiento
                  </label>
                  <AstroDatePicker
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button 
                    type="button"
                    onClick={onClose} 
                    style={{ 
                      flex: 1, 
                      background: 'none', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: 'white', 
                      height: '56px',
                      borderRadius: '16px', 
                      fontWeight: '700', 
                      cursor: 'pointer' 
                    }}
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-pink" 
                    style={{ flex: 1.5, height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'REGISTRAR CLIENTE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalShield>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default NewClientModal;
