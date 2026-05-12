// ============================================================
// SIRIAI PM — Store (Supabase data layer)
// ============================================================

/* globals CONFIG, supabase */

const { createClient } = supabase;
const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ── in-memory cache ──────────────────────────────────────────
const cache = {
  campaigns: [],
  clients: [],
  loaded: false,
};

// ── helpers ──────────────────────────────────────────────────
function computeFields(c) {
  const today = new Date(); today.setHours(0,0,0,0);
  const end   = c.date_end ? new Date(c.date_end) : null;
  c._profit    = (c.revenue || 0) - (c.fee || 0);
  c._margin    = c.revenue ? Math.round(c._profit / c.revenue * 100) : 0;
  c._upload_rate = c.count_select ? Math.round((c.count_upload || 0) / c.count_select * 100) : 0;
  if (end) {
    end.setHours(0,0,0,0);
    c._dday = Math.round((end - today) / 86400000);
  } else {
    c._dday = null;
  }
  return c;
}

// ── CAMPAIGNS ────────────────────────────────────────────────
const Store = {

  async init() {
    await Promise.all([Store.loadCampaigns(), Store.loadClients()]);
    cache.loaded = true;
    Store.subscribeRealtime();
  },

  async loadCampaigns() {
    const { data, error } = await sb
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('loadCampaigns', error); return []; }
    cache.campaigns = (data || []).map(computeFields);
    return cache.campaigns;
  },

  async loadClients() {
    const { data, error } = await sb
      .from('clients')
      .select('*')
      .order('name');
    if (error) { console.error('loadClients', error); return []; }
    cache.clients = data || [];
    return cache.clients;
  },

  getCampaigns() { return cache.campaigns; },
  getClients()   { return cache.clients; },

  getCampaignById(id) { return cache.campaigns.find(c => c.id === id) || null; },

  async createCampaign(data) {
    const payload = { ...data };
    delete payload.id;
    const { data: row, error } = await sb.from('campaigns').insert(payload).select().single();
    if (error) throw error;
    const computed = computeFields(row);
    cache.campaigns.unshift(computed);
    await Store.log('campaign', row.id, row.name, 'created', null, row.status);
    return computed;
  },

  async updateCampaign(id, updates) {
    const old = Store.getCampaignById(id);
    const { data: row, error } = await sb
      .from('campaigns').update(updates).eq('id', id).select().single();
    if (error) throw error;
    const computed = computeFields(row);
    const idx = cache.campaigns.findIndex(c => c.id === id);
    if (idx >= 0) cache.campaigns[idx] = computed;
    // log changed fields
    for (const [k, v] of Object.entries(updates)) {
      if (old && String(old[k]) !== String(v)) {
        await Store.log('campaign', id, row.name, k, String(old[k] ?? ''), String(v ?? ''));
      }
    }
    return computed;
  },

  async updateStatus(id, newStatus, reason = '') {
    const old = Store.getCampaignById(id);
    const oldStatus = old?.status;
    const row = await Store.updateCampaign(id, { status: newStatus });
    if (reason) {
      await Store.log('campaign', id, old?.name, 'status_reason',
        `${oldStatus} → ${newStatus}`, reason);
    }
    return row;
  },

  async archiveCampaign(id) {
    return Store.updateCampaign(id, { is_archived: true });
  },

  async deleteCampaign(id) {
    const { error } = await sb.from('campaigns').delete().eq('id', id);
    if (error) throw error;
    cache.campaigns = cache.campaigns.filter(c => c.id !== id);
  },

  // ── INFLUENCERS ──────────────────────────────────────────
  async getInfluencers(campaignId) {
    const { data, error } = await sb
      .from('influencers').select('*')
      .eq('campaign_id', campaignId).order('created_at');
    if (error) throw error;
    return data || [];
  },

  async createInfluencer(data) {
    const { data: row, error } = await sb.from('influencers').insert(data).select().single();
    if (error) throw error;
    await Store.syncInfluencerCounts(data.campaign_id);
    return row;
  },

  async updateInfluencer(id, updates, campaignId) {
    const { data: row, error } = await sb
      .from('influencers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    if (campaignId) await Store.syncInfluencerCounts(campaignId);
    return row;
  },

  async bulkImportInfluencers(campaignId, rows) {
    const payload = rows.map(r => ({ ...r, campaign_id: campaignId }));
    const { data, error } = await sb.from('influencers').insert(payload).select();
    if (error) throw error;
    await Store.syncInfluencerCounts(campaignId);
    return data;
  },

  async syncInfluencerCounts(campaignId) {
    const infl = await Store.getInfluencers(campaignId);
    const count_select = infl.filter(i => i.status !== '드랍').length;
    const count_upload = infl.filter(i => i.uploaded_at || i.status === '업로드완료').length;
    await Store.updateCampaign(campaignId, { count_select, count_upload });
  },

  // ── LOGS ─────────────────────────────────────────────────
  async log(entityType, entityId, entityName, field, oldVal, newVal) {
    const { error } = await sb.from('change_logs').insert({
      entity_type: entityType,
      entity_id:   entityId,
      entity_name: entityName || '',
      field,
      old_value: oldVal,
      new_value: newVal,
    });
    if (error) console.warn('log error', error);
  },

  async getLogs(entityId, limit = 30) {
    const { data, error } = await sb
      .from('change_logs').select('*')
      .eq('entity_id', entityId)
      .order('changed_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  },

  // ── CLIENTS ──────────────────────────────────────────────
  async ensureClient(name) {
    if (!name) return null;
    const existing = cache.clients.find(c => c.name === name);
    if (existing) return existing;
    const { data, error } = await sb.from('clients').insert({ name }).select().single();
    if (error) return null;
    cache.clients.push(data);
    return data;
  },

  // ── REALTIME ─────────────────────────────────────────────
  subscribeRealtime() {
    sb.channel('pm-campaigns')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        async () => {
          await Store.loadCampaigns();
          App.renderCurrentView();
          App.renderNotifications();
        })
      .subscribe();
  },

  // ── GOOGLE SHEETS IMPORT ─────────────────────────────────
  sheetUrlToCsv(url) {
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return null;
    const id = m[1];
    const gidM = url.match(/[#&?]gid=(\d+)/);
    const gid  = gidM ? gidM[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  },

  async fetchSheetCsv(url) {
    const csvUrl = Store.sheetUrlToCsv(url);
    if (!csvUrl) throw new Error('올바른 구글 시트 URL이 아닙니다');
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error('시트를 불러올 수 없습니다. 공개 공유 여부를 확인하세요.');
    const text = await res.text();
    return Store.parseCSV(text);
  },

  parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const rows = lines.slice(1).map(line => {
      const cells = [];
      let cur = ''; let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cells.push(cur.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = cells[i] || '');
      return obj;
    });
    return { headers, rows };
  },
};
