import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

// ─── Smart In-Memory Cache ────────────────────────────────────────────────────
const _cache = {};
const STAFF_LIST_SELECT = 'id, auth_user_id, email, name, role, commission_pct, active, created_at, phone, address, specialties, birth_date';
const STAFF_DETAIL_SELECT = `${STAFF_LIST_SELECT}, image_url`;

async function _invokeAdminStaff(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('admin-staff', {
    body: { action, ...payload }
  });
  if (error) throw new Error(error.message || 'Admin operation failed');
  if (data?.error) throw new Error(data.error);
  return data?.data;
}

function _cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete _cache[key];
    return null;
  }
  return entry.data;
}

function _cacheSet(key, data, ttlMs = 45000) {
  _cache[key] = { data, expiresAt: Date.now() + ttlMs };
}

function _cacheInvalidate(...keys) {
  keys.forEach(k => delete _cache[k]);
}

function _cacheInvalidateAppts() {
  Object.keys(_cache).filter(k => k.startsWith('appts_')).forEach(k => delete _cache[k]);
  delete _cache.clients;
}

function _asArray(value) {
  return Array.isArray(value) ? value : [];
}

function _normalizeAppointment(app) {
  if (!app || typeof app !== 'object') return app;
  return {
    ...app,
    clients: app.clients || null,
    services: app.services || null,
    appointment_staff: _asArray(app.appointment_staff)
  };
}

function _normalizeStaff(member) {
  if (!member || typeof member !== 'object') return member;
  return {
    ...member,
    specialties: _asArray(member.specialties)
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export const dataService = {
  supabase,
  invalidateOperationalCache() {
    _cacheInvalidate('clients', 'clients_lite', 'staff', 'staff_with_images', 'services', 'transactions', 'inventory', 'sale_inventory');
    _cacheInvalidateAppts();
  },

  invalidateSpecificCache(table) {
    if (table === 'appointments') {
      _cacheInvalidateAppts();
    } else if (table === 'transactions') {
      _cacheInvalidate('transactions');
    } else if (table === 'clients') {
      _cacheInvalidate('clients', 'clients_lite');
    } else if (table === 'inventory') {
      _cacheInvalidate('inventory', 'sale_inventory');
    } else if (table === 'services') {
      _cacheInvalidate('services');
    } else if (table === 'staff') {
      _cacheInvalidate('staff', 'staff_with_images');
    } else if (table === 'service_costs') {
      _cacheInvalidate('service_costs');
    }
  },

  invalidateClientsCache() {
    _cacheInvalidate('clients', 'clients_lite');
  },

  // ─── Clients ────────────────────────────────────────────────────────────────
  async getClients() {
    const cached = _cacheGet('clients');
    if (cached) return cached;

    const { data, error } = await supabase.rpc('get_clients_with_stats');
    if (error) {
      console.error("Error fetching clients via RPC:", error);
      return this.getClientsLite();
    }

    const result = _asArray(data);
    _cacheSet('clients', result, 45000);
    return result;
  },

  async getClientsLite() {
    const cached = _cacheGet('clients_lite');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone, id_card, created_at, active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const result = _asArray(data).map(c => ({ ...c, total_visits: 0, total_spent: 0 }));
    _cacheSet('clients_lite', result, 45000);
    return result;
  },

  async addClient(client) {
    _cacheInvalidate('clients', 'clients_lite');
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        ...client,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ? 
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();
    if (error) throw error;

    try {
      notificationService.sendNotification(
        'Nueva Cliente Registrada 👤',
        `Se ha registrado a ${data.name || 'una nueva cliente'} (Tlf: ${data.phone || 'No registrado'}) en el sistema.`
      );
    } catch (e) {
      console.error('Error al enviar notificacion:', e);
    }

    return data;
  },

  async updateClient(id, updates) {
    _cacheInvalidate('clients', 'clients_lite');
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id) {
    _cacheInvalidate('clients', 'clients_lite');
    const { data: apps } = await supabase
      .from('appointments')
      .select('id')
      .eq('client_id', id);

    if (apps && apps.length > 0) {
      const appIds = _asArray(apps).map(a => a.id);
      await Promise.all([
        supabase.from('appointment_staff').delete().in('appointment_id', appIds),
        supabase.from('appointments').delete().in('id', appIds)
      ]);
    }

    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Staff ──────────────────────────────────────────────────────────────────
  async getStaff({ includeImages = false } = {}) {
    const cacheKey = includeImages ? 'staff_with_images' : 'staff';
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;
    const { data, error } = await supabase
      .from('staff')
      .select(includeImages ? STAFF_DETAIL_SELECT : STAFF_LIST_SELECT)
      .order('name');
    if (error) throw error;
    const result = _asArray(data).map(_normalizeStaff).filter(s => !s.role?.startsWith('ARCHIVED|'));
    _cacheSet(cacheKey, result, 45000);
    return result;
  },

  async getStaffByAuthUserId(authUserId) {
    const { data, error } = await supabase
      .from('staff')
      .select(STAFF_DETAIL_SELECT)
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.role?.startsWith('ARCHIVED|')) return null;
    return _normalizeStaff(data);
  },

  async addStaff(member) {
    _cacheInvalidate('staff', 'staff_with_images');
    const { data, error } = await supabase
      .from('staff')
      .insert([member])
      .select(STAFF_DETAIL_SELECT)
      .single();
    if (error) throw error;
    return data;
  },

  async createStaffWithAuth(member) {
    if (!member.email) throw new Error('El email es obligatorio para crear acceso.');
    if (!member.username) throw new Error('La contraseña es obligatoria para crear acceso.');
    _cacheInvalidate('staff', 'staff_with_images');
    const { username: password, ...safeMember } = member;
    return _invokeAdminStaff('create', { member: safeMember, email: member.email, password });
  },

  async updateStaff(id, updates) {
    _cacheInvalidate('staff', 'staff_with_images');
    const { username: _password, ...safeUpdates } = updates;
    return _invokeAdminStaff('update', { staffId: id, updates: safeUpdates });
  },

  async updateStaffAuthCredentials(authUserId, { email, password } = {}) {
    if (!authUserId || (!email && !password)) return;
    return _invokeAdminStaff('credentials', { authUserId, email, password });
  },

  async linkAuthToStaff(staffId, email, password) {
    return _invokeAdminStaff('link', { staffId, email, password });
  },

  async deleteStaff(id) {
    _cacheInvalidate('staff', 'staff_with_images');
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Services ───────────────────────────────────────────────────────────────
  async getServices() {
    const cached = _cacheGet('services');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('name');
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet('services', result, 45000);
    return result;
  },

  async addService(service) {
    _cacheInvalidate('services');
    const { data, error } = await supabase
      .from('services')
      .insert([service])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateService(id, updates) {
    _cacheInvalidate('services');
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteService(id) {
    _cacheInvalidate('services');
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Service Costs (Costeo) ────────────────────────────────────────────────
  async getServiceCosts(serviceId) {
    const { data, error } = await supabase.rpc('get_service_costs', { p_service_id: serviceId });
    if (error) throw error;
    return _asArray(data);
  },

  async calculateServiceProfit(serviceId) {
    const { data, error } = await supabase.rpc('calculate_service_profit', { p_service_id: serviceId });
    if (error) throw error;
    return data;
  },

  async addServiceCost(cost) {
    _cacheInvalidate('service_costs');
    const { data, error } = await supabase
      .from('service_costs')
      .insert([cost])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateServiceCost(id, updates) {
    _cacheInvalidate('service_costs');
    const { data, error } = await supabase
      .from('service_costs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteServiceCost(id) {
    _cacheInvalidate('service_costs');
    const { error } = await supabase.from('service_costs').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Appointments ───────────────────────────────────────────────────────────
  async getAppointments(startDate, endDate) {
    const cacheKey = `appts_${startDate}_${endDate}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone),
        services (id, name, price, duration_minutes),
        staff (id, name, role),
        appointment_staff (id, staff_id, commission_earned, tip_amount)
      `)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at');
    if (error) throw error;
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async getTodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    return this.getAppointments(`${today}T00:00:00`, `${today}T23:59:59`);
  },

  async getAppointmentsByState(states, startDate) {
    const cacheKey = `appts_state_${states.join('_')}_${startDate || 'all'}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients (id, name, phone),
        services (id, name, price, duration_minutes),
        staff (id, name, role),
        appointment_staff (id, staff_id, commission_earned, tip_amount)
      `)
      .in('status', states);

    if (startDate) {
      query = query.gte('scheduled_at', startDate);
    }

    const { data, error } = await query.order('scheduled_at', { ascending: false });
    if (error) throw error;
    const result = _asArray(data).map(_normalizeAppointment);
    _cacheSet(cacheKey, result, 15000);
    return result;
  },

  async addAppointment(appointment) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointment,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ?
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAppointment(id, updates) {
    _cacheInvalidateAppts();
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAppointment(id) {
    _cacheInvalidateAppts();
    await supabase.from('appointment_staff').delete().eq('appointment_id', id);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Transactions ───────────────────────────────────────────────────────────
  async getTransactions(startDate) {
    const cacheKey = `transactions_${startDate || 'all'}`;
    const cached = _cacheGet(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet(cacheKey, result, 30000);
    return result;
  },

  async addTransaction(transaction) {
    _cacheInvalidate('transactions');
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        created_by_staff_id: (await supabase.auth.getUser()).data?.user?.id ?
          (await supabase.from('staff').select('id').eq('auth_user_id', (await supabase.auth.getUser()).data.user.id).single()).data?.id : null
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTransaction(id, updates) {
    _cacheInvalidate('transactions');
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTransaction(id) {
    _cacheInvalidate('transactions');
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Inventory ──────────────────────────────────────────────────────────────
  async getInventory() {
    const cached = _cacheGet('inventory');
    if (cached) return cached;
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    const result = _asArray(data);
    _cacheSet('inventory', result, 45000);
    return result;
  },

  async addInventoryItem(item) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory')
      .insert([item])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(id) {
    _cacheInvalidate('inventory');
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
  },

  async addInventoryMovement(movement) {
    _cacheInvalidate('inventory');
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert([movement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ─── Worker Stats ───────────────────────────────────────────────────────────
  async getWorkerStats(startDate) {
    const { data, error } = await supabase.rpc('get_worker_stats', { p_start_date: startDate });
    if (error) throw error;
    return _asArray(data);
  },

  // ─── Exchange Rates ─────────────────────────────────────────────────────────
  async getExchangeRates() {
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares');
      const data = await response.json();
      const oficial = data.find(d => d.fuente === 'oficial');
      const paralelo = data.find(d => d.fuente === 'paralelo');
      const bcv = oficial?.promedio || 0;
      const usdt = paralelo?.promedio || 0;
      return { bcv, usdt, updated_at: new Date().toISOString() };
    } catch (e) {
      console.error('Error fetching exchange rates:', e);
      return { bcv: 0, usdt: 0, updated_at: null };
    }
  },

  // ─── Notifications ──────────────────────────────────────────────────────────
  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return _asArray(data);
  },

  async markNotificationRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  // ─── System Settings ────────────────────────────────────────────────────────
  async getSystemSetting(key, fallback = '') {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    return data?.value ?? fallback;
  },

  async setSystemSetting(key, value) {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ value: String(value || '').trim(), updated_at: new Date().toISOString() })
      .eq('key', key)
      .select('key, value')
      .single();
    if (error) throw error;
    return data.value;
  },

  // ─── Auth ───────────────────────────────────────────────────────────────────
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
};
