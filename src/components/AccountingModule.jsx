import React from 'react';

export default function AccountingModule({ isMobile }) {
  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--bg-primary)', borderRadius: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>Contabilidad y Conciliación</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Módulo en construcción: Conciliación bancaria, cuentas por pagar/cobrar, e impuestos.</p>
    </div>
  );
}
