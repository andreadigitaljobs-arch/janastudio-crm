import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://supabase.somosdostudio.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa2VhZ3VhbXl6aWFtcGp2d2NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjIwODcsImV4cCI6MjA5ODcyMjA4N30.69WjpEEUZvjDHyeE-5_8qUhxuf3BR35cOOXb43EI6jo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function backup() {
  console.log('Fetching services...');
  const { data: services, error: err1 } = await supabase.from('services').select('*');
  if (err1) {
    console.error('Error fetching services:', err1);
  }

  console.log('Fetching inventory...');
  const { data: inventory, error: err2 } = await supabase.from('inventory').select('*');
  if (err2) {
    console.error('Error fetching inventory:', err2);
  }

  console.log('Fetching service_costs...');
  const { data: costs, error: err3 } = await supabase.from('service_costs').select('*');
  if (err3) {
    console.error('Error fetching service_costs:', err3);
  }

  const backupData = {
    timestamp: new Date().toISOString(),
    services: services || [],
    inventory: inventory || [],
    service_costs: costs || []
  };

  const backupPath = path.join(__dirname, 'backup_mock_data.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`Backup saved to ${backupPath}`);
  console.log(`Backed up ${services?.length || 0} services, ${inventory?.length || 0} inventory items, and ${costs?.length || 0} cost mappings.`);
}

backup().catch(console.error);
