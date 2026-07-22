import { Plus, Trash2 } from 'lucide-react';

const inputStyle = { height: '38px', borderRadius: '9px', border: '1px solid rgba(212,160,154,.3)', padding: '0 10px', background: 'white', color: 'var(--text-primary)', fontSize: '12px' };

const ServiceRecipeEditor = ({ inventory = [], value = [], onChange }) => {
  const addItem = (inventoryId) => {
    const item = inventory.find((candidate) => candidate.id === inventoryId);
    if (!item || value.some((row) => row.inventory_item_id === item.id)) return;
    onChange([...value, { inventory_item_id: item.id, item_name: item.name, quantity_per_service: 1, unit_cost: (Number(item.cost) || 0) / Math.max(Number(item.package_size) || 1, 0.000001), unit: item.unit || 'unidad' }]);
  };
  const updateItem = (id, patch) => onChange(value.map((row) => row.inventory_item_id === id ? { ...row, ...patch } : row));

  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#a0506a', marginBottom: '8px', textTransform: 'uppercase' }}>Insumos que consume este servicio</label>
      <select defaultValue="" onChange={(event) => { addItem(event.target.value); event.target.value = ''; }} style={{ ...inputStyle, width: '100%', marginBottom: '10px' }}>
        <option value="" disabled>Seleccionar del inventario...</option>
        {inventory.filter((item) => item.active !== false).map((item) => <option key={item.id} value={item.id}>{item.name} · stock {Number(item.stock || 0)}</option>)}
      </select>
      {value.length === 0 ? <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}><Plus size={11} /> Sin insumos. Úsalo solo para recargos sin material.</p> : value.map((row) => (
        <div key={row.inventory_item_id} style={{ display: 'grid', gridTemplateColumns: '1fr 86px 32px', gap: '7px', alignItems: 'center', marginBottom: '7px' }}>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.item_name}</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>${Number(row.unit_cost || 0).toFixed(4)} / {row.unit}</div></div>
          <input aria-label={`Cantidad de ${row.item_name}`} type="number" min="0" step="0.001" value={row.quantity_per_service} onChange={(event) => updateItem(row.inventory_item_id, { quantity_per_service: event.target.value })} style={{ ...inputStyle, width: '100%' }} />
          <button type="button" aria-label={`Quitar ${row.item_name}`} onClick={() => onChange(value.filter((item) => item.inventory_item_id !== row.inventory_item_id))} style={{ border: 0, background: 'rgba(239,68,68,.08)', color: '#ef4444', borderRadius: '8px', height: '32px', cursor: 'pointer' }}><Trash2 size={14} /></button>
        </div>
      ))}
      {value.length > 0 && <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 800, color: '#a0506a' }}>Costo estimado: ${value.reduce((sum, row) => sum + Number(row.quantity_per_service || 0) * Number(row.unit_cost || 0), 0).toFixed(2)}</div>}
    </div>
  );
};

export default ServiceRecipeEditor;
