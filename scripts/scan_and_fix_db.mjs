import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno antes de ejecutar este script.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'janastudio' }
});

function fixText(str) {
  if (!str) return str;
  return str
    .replaceAll('Depilaci??n', 'Depilación')
    .replaceAll('depilaci??n', 'depilación')
    .replaceAll('Dise??o', 'Diseño')
    .replaceAll('dise??o', 'diseño')
    .replaceAll('U??as', 'Uñas')
    .replaceAll('u??as', 'uñas')
    .replaceAll('Pesta??as', 'Pestañas')
    .replaceAll('pesta??as', 'pestañas')
    .replaceAll('Hidrataci??n', 'Hidratación')
    .replaceAll('hidrataci??n', 'hidratación')
    .replaceAll('??rea', 'área')
    .replaceAll('aplicaci??n', 'aplicación')
    .replaceAll('exfoliaci??n', 'exfoliación')
    .replaceAll('manicur??a', 'manicura')
    .replaceAll('pedicur??a', 'pedicura')
    .replaceAll('??tem', 'Ítem')
    .replaceAll('Â¿', '¿')
    .replaceAll('Â¡', '¡');
}

async function main() {
  console.log('Fetching services...');
  const { data: services, error: sErr } = await supabase.from('services').select('*');
  if (sErr) throw sErr;
  
  for (const s of services) {
    const newName = fixText(s.name);
    const newDesc = fixText(s.description);
    if (newName !== s.name || newDesc !== s.description) {
      console.log(`Fixing service: "${s.name}" -> "${newName}"`);
      const { error } = await supabase.from('services').update({ name: newName, description: newDesc }).eq('id', s.id);
      if (error) console.error(`Error updating service ${s.id}:`, error.message);
    }
  }

  console.log('Fetching inventory...');
  const { data: inventory, error: iErr } = await supabase.from('inventory').select('*');
  if (iErr) throw iErr;

  for (const item of inventory) {
    const newName = fixText(item.name);
    const newCategory = fixText(item.category);
    if (newName !== item.name || newCategory !== item.category) {
      console.log(`Fixing inventory item: "${item.name}" -> "${newName}"`);
      const { error } = await supabase.from('inventory').update({ name: newName, category: newCategory }).eq('id', item.id);
      if (error) console.error(`Error updating inventory ${item.id}:`, error.message);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
