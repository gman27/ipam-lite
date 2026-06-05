/* ═══════════════════════════════════════════════════
   IPAM — Algorhythm  |  app.js
   ═══════════════════════════════════════════════════ */

const API = '';
let allSubnets = [];
let filteredSubnets = [];
let statsData = {};
let sortState = { col: 'site', dir: 'asc' };
let deleteTarget = null;
let currentView = 'dashboard';

// ── Theme toggle ──────────────────────────────────────
(function(){
  const toggle = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;
  const preferred = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (!html.getAttribute('data-theme')) html.setAttribute('data-theme', preferred);
  if (toggle) {
    updateToggleIcon(toggle, html.getAttribute('data-theme'));
    toggle.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      updateToggleIcon(toggle, next);
    });
  }
  function updateToggleIcon(btn, theme) {
    btn.innerHTML = theme === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
})();

// ── Sidebar toggle ────────────────────────────────────
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Navigation ────────────────────────────────────────
document.querySelectorAll('.nav-item[data-view]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchView(el.dataset.view);
    document.getElementById('sidebar').classList.remove('open');
  });
});

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-view="${view}"]`).classList.add('active');

  const titles = { dashboard: 'Dashboard', subnets: 'Subnet Registry', sites: 'Sites Overview', import: 'Import Data' };
  document.getElementById('viewTitle').textContent = titles[view] || view;

  const showAdd = view === 'subnets';
  const showExport = view === 'subnets';
  document.getElementById('btnAddSubnet').style.display = showAdd ? '' : 'none';
  document.getElementById('exportGroup').style.display = showExport ? '' : 'none';

  if (view === 'dashboard') renderDashboard();
  if (view === 'subnets')   renderSubnets();
  if (view === 'sites')     renderSites();
}

// ── API helpers ───────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API error');
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadAll() {
  [allSubnets, statsData] = await Promise.all([
    apiFetch('/api/subnets'),
    apiFetch('/api/stats')
  ]);
  populateSiteFilter();
}

// ── Dashboard ─────────────────────────────────────────
async function renderDashboard() {
  await loadAll();
  const { total, by_type, by_site, by_status, sites } = statsData;

  // KPI cards
  const kpi = document.getElementById('kpiGrid');
  const statusColors = { active: 'var(--color-success)', reserved: 'var(--color-warning)', deprecated: 'var(--color-error)', planned: 'var(--color-purple)' };
  const typeColors = { 'Clinic': 'var(--color-teal)', 'Data Centre': 'var(--color-gold)', 'IPSEC/VPN': 'var(--color-purple)', 'Cloud': 'var(--color-primary)', 'Head Office': 'var(--color-success)' };

  kpi.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Total Subnets</div>
      <div class="kpi-value" style="color:var(--color-primary)">${total}</div>
      <div class="kpi-sub">across all sites</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Sites</div>
      <div class="kpi-value" style="color:var(--color-teal)">${sites.length}</div>
      <div class="kpi-sub">unique locations</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active</div>
      <div class="kpi-value" style="color:var(--color-success)">${by_status.active || 0}</div>
      <div class="kpi-sub">subnets in use</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reserved</div>
      <div class="kpi-value" style="color:var(--color-warning)">${by_status.reserved || 0}</div>
      <div class="kpi-sub">held for future use</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Deprecated</div>
      <div class="kpi-value" style="color:var(--color-error)">${by_status.deprecated || 0}</div>
      <div class="kpi-sub">decommissioned</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">IPSEC/VPN</div>
      <div class="kpi-value" style="color:var(--color-purple)">${by_type['IPSEC/VPN'] || 0}</div>
      <div class="kpi-sub">tunnel subnets</div>
    </div>
  `;

  // By Type bar chart
  const maxType = Math.max(...Object.values(by_type));
  document.getElementById('chartByType').innerHTML = Object.entries(by_type)
    .sort((a,b) => b[1]-a[1])
    .map(([label, count]) => `
      <div class="bar-row">
        <span class="bar-label" title="${label}">${label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/maxType*100).toFixed(1)}%;background:${typeColors[label]||'var(--color-primary)'}"></div></div>
        <span class="bar-count">${count}</span>
      </div>`).join('');

  // By Site bar chart (top 10)
  const topSites = Object.entries(by_site).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxSite = Math.max(...topSites.map(s=>s[1]));
  document.getElementById('chartBySite').innerHTML = topSites
    .map(([label, count]) => `
      <div class="bar-row">
        <span class="bar-label" title="${label}">${label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/maxSite*100).toFixed(1)}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>`).join('');

  // Status pills
  const dotColors = { active: 'var(--color-success)', reserved: 'var(--color-warning)', deprecated: 'var(--color-error)', planned: 'var(--color-purple)' };
  document.getElementById('chartByStatus').innerHTML = Object.entries(by_status)
    .map(([s,c]) => `
      <div class="status-pill">
        <span class="dot" style="background:${dotColors[s]||'var(--color-text-faint)'}"></span>
        <span class="count">${c}</span>
        <span class="lbl">${s}</span>
      </div>`).join('');
}

// ── Subnet Table ──────────────────────────────────────
async function renderSubnets() {
  if (!allSubnets.length) await loadAll();
  filterSubnets();
}

function populateSiteFilter() {
  const sel = document.getElementById('filterSite');
  const current = sel.value;
  sel.innerHTML = '<option value="">All Sites</option>';
  (statsData.sites || []).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    if (s === current) opt.selected = true;
    sel.appendChild(opt);
  });

  // Also populate datalist for the modal
  const dl = document.getElementById('siteList');
  if (dl) {
    dl.innerHTML = '';
    (statsData.sites || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      dl.appendChild(opt);
    });
  }
}

function filterSubnets() {
  const q      = document.getElementById('searchInput').value.toLowerCase();
  const site   = document.getElementById('filterSite').value;
  const type   = document.getElementById('filterType').value;
  const status = document.getElementById('filterStatus').value;

  filteredSubnets = allSubnets.filter(r => {
    if (site   && r.site      !== site)   return false;
    if (type   && r.site_type !== type)   return false;
    if (status && r.status    !== status) return false;
    if (q) {
      const hay = [r.site,r.subnet,r.vlan,r.description,r.notes,r.site_type].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  sortSubnets();
  drawTable();
}

function sortTable(col) {
  if (sortState.col === col) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.col = col; sortState.dir = 'asc';
  }
  document.querySelectorAll('.data-table th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
  });
  const th = document.querySelector(`.data-table th[data-col="${col}"]`);
  if (th) th.classList.add('sort-' + sortState.dir);
  sortSubnets();
  drawTable();
}

function sortSubnets() {
  const { col, dir } = sortState;
  filteredSubnets.sort((a, b) => {
    let av = (a[col] || '').toString().toLowerCase();
    let bv = (b[col] || '').toString().toLowerCase();
    if (col === 'subnet') {
      // Sort by prefix length numerically, then IP
      const prefA = parseInt(av.split('/')[1]||'0');
      const prefB = parseInt(bv.split('/')[1]||'0');
      if (prefA !== prefB) return dir === 'asc' ? prefA - prefB : prefB - prefA;
    }
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
}

function drawTable() {
  const tbody = document.getElementById('subnetTbody');
  const empty = document.getElementById('emptyState');
  document.getElementById('recordCount').textContent = `${filteredSubnets.length} of ${allSubnets.length} entries`;

  if (!filteredSubnets.length) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filteredSubnets.map(r => {
    const statusClass = `badge-${r.status}`;
    const typeClass = `type-${(r.site_type||'').replace(/[\/\s]+/g,'-')}`;
    const hosts = r.host_count > 1 ? r.host_count.toLocaleString() : (r.host_count === 1 ? '1 host' : '–');
    return `<tr>
      <td class="truncate" title="${esc(r.site)}">${esc(r.site)}</td>
      <td class="mono">${esc(r.subnet)}</td>
      <td class="mono">${r.vlan ? esc(r.vlan) : '<span style="color:var(--color-text-faint)">–</span>'}</td>
      <td class="truncate" title="${esc(r.description)}">${r.description ? esc(r.description) : '<span style="color:var(--color-text-faint)">–</span>'}</td>
      <td><span class="type-badge ${typeClass}">${esc(r.site_type)}</span></td>
      <td class="mono" style="color:var(--color-text-muted)">${hosts}</td>
      <td><span class="badge ${statusClass}">${esc(r.status)}</span></td>
      <td class="truncate" title="${esc(r.notes)}" style="max-width:120px">${r.notes ? esc(r.notes) : '<span style="color:var(--color-text-faint)">–</span>'}</td>
      <td class="col-actions">
        <div class="actions-cell">
          <button class="btn btn-icon btn-icon-edit" onclick="openEdit(${r.id})" title="Edit">✏</button>
          <button class="btn btn-icon btn-icon-del" onclick="openDelete(${r.id},'${esc(r.subnet)}')" title="Delete">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Sites View ────────────────────────────────────────
async function renderSites() {
  if (!allSubnets.length) await loadAll();
  const grouped = {};
  allSubnets.forEach(r => {
    if (!grouped[r.site]) grouped[r.site] = { type: r.site_type, subnets: [] };
    grouped[r.site].subnets.push(r.subnet);
  });

  const typeColors = {
    'Clinic': 'var(--color-teal)',
    'Data Centre': 'var(--color-gold)',
    'IPSEC/VPN': 'var(--color-purple)',
    'Cloud': 'var(--color-primary)',
    'Head Office': 'var(--color-success)',
    'Cato Reserved': 'var(--color-text-muted)'
  };

  document.getElementById('sitesGrid').innerHTML = Object.entries(grouped)
    .sort((a,b) => b[1].subnets.length - a[1].subnets.length)
    .map(([site, data]) => {
      const preview = data.subnets.slice(0,4);
      const more = data.subnets.length - preview.length;
      const color = typeColors[data.type] || 'var(--color-text-muted)';
      return `
        <div class="site-card" onclick="filterBySite('${esc(site)}')">
          <div class="site-card-header">
            <div>
              <div class="site-name">${esc(site)}</div>
              <span class="type-badge type-${(data.type||'').replace(/[\/\s]+/g,'-')}" style="margin-top:4px;display:inline-block">${esc(data.type)}</span>
            </div>
            <div class="site-count" style="color:${color}">${data.subnets.length}</div>
          </div>
          <div class="site-subnets">
            ${preview.map(s => `<span class="site-subnet-row">${esc(s)}</span>`).join('')}
            ${more > 0 ? `<span class="site-subnet-row" style="color:var(--color-text-faint)">+${more} more…</span>` : ''}
          </div>
        </div>`;
    }).join('');
}

function filterBySite(site) {
  switchView('subnets');
  document.getElementById('filterSite').value = site;
  filterSubnets();
}

// ── Add/Edit Modal ────────────────────────────────────
document.getElementById('btnAddSubnet').addEventListener('click', openAdd);

function openAdd() {
  document.getElementById('modalTitle').textContent = 'Add Subnet';
  document.getElementById('editId').value = '';
  ['fSite','fSubnet','fVlan','fDesc','fNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fType').value = 'Clinic';
  document.getElementById('fStatus').value = 'active';
  document.getElementById('subnetHint').textContent = '';
  hideModalError();
  openModal('subnetModal','modalOverlay');
  document.getElementById('fSite').focus();
}

function openEdit(id) {
  const r = allSubnets.find(s => s.id === id);
  if (!r) return;
  document.getElementById('modalTitle').textContent = 'Edit Subnet';
  document.getElementById('editId').value = id;
  document.getElementById('fSite').value = r.site;
  document.getElementById('fSubnet').value = r.subnet;
  document.getElementById('fVlan').value = r.vlan || '';
  document.getElementById('fDesc').value = r.description || '';
  document.getElementById('fType').value = r.site_type || 'Clinic';
  document.getElementById('fStatus').value = r.status || 'active';
  document.getElementById('fNotes').value = r.notes || '';
  updateSubnetHint();
  hideModalError();
  openModal('subnetModal','modalOverlay');
  document.getElementById('fSite').focus();
}

document.getElementById('fSubnet').addEventListener('input', updateSubnetHint);

function updateSubnetHint() {
  const val = document.getElementById('fSubnet').value.trim();
  const hint = document.getElementById('subnetHint');
  if (!val) { hint.textContent = ''; return; }
  try {
    const [ip, prefix] = val.split('/');
    if (!prefix) { hint.textContent = ''; return; }
    const p = parseInt(prefix);
    if (isNaN(p) || p < 0 || p > 32) { hint.textContent = 'Invalid prefix'; hint.style.color = 'var(--color-error)'; return; }
    const hosts = Math.pow(2, 32-p);
    hint.textContent = `${hosts.toLocaleString()} addresses`;
    hint.style.color = 'var(--color-text-faint)';
  } catch { hint.textContent = ''; }
}

async function saveSubnet() {
  const id = document.getElementById('editId').value;
  const payload = {
    site:        document.getElementById('fSite').value.trim(),
    subnet:      document.getElementById('fSubnet').value.trim(),
    vlan:        document.getElementById('fVlan').value.trim(),
    description: document.getElementById('fDesc').value.trim(),
    site_type:   document.getElementById('fType').value,
    status:      document.getElementById('fStatus').value,
    notes:       document.getElementById('fNotes').value.trim()
  };

  if (!payload.site)   { showModalError('Site is required.'); return; }
  if (!payload.subnet) { showModalError('Subnet/CIDR is required.'); return; }

  try {
    if (id) {
      await apiFetch(`/api/subnets/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Subnet updated', 'success');
    } else {
      await apiFetch('/api/subnets', { method: 'POST', body: JSON.stringify(payload) });
      toast('Subnet added', 'success');
    }
    closeModal();
    await loadAll();
    renderSubnets();
    if (currentView === 'dashboard') renderDashboard();
  } catch (e) {
    showModalError(e.message);
  }
}

// ── Delete ────────────────────────────────────────────
function openDelete(id, label) {
  deleteTarget = id;
  document.getElementById('deleteSubnetLabel').textContent = label;
  openModal('deleteModal','deleteOverlay');
}

function cancelDelete() {
  deleteTarget = null;
  closeModal('deleteModal','deleteOverlay');
}

async function confirmDelete() {
  if (!deleteTarget) return;
  try {
    await apiFetch(`/api/subnets/${deleteTarget}`, { method: 'DELETE' });
    toast('Subnet deleted', 'info');
    deleteTarget = null;
    closeModal('deleteModal','deleteOverlay');
    await loadAll();
    renderSubnets();
    if (currentView === 'dashboard') renderDashboard();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Import ────────────────────────────────────────────
(function setupImportDrop() {
  const zone = document.getElementById('importZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) doImport(file);
  });
})();

function handleImport(input) {
  if (input.files[0]) doImport(input.files[0]);
  input.value = '';
}

async function doImport(file) {
  const result = document.getElementById('importResult');
  result.style.display = '';
  result.className = 'import-result';
  result.textContent = 'Importing…';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(API + '/api/import', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Import failed');
    result.className = 'import-result success';
    result.innerHTML = `
      <strong>Import complete</strong><br>
      ✅ Added: ${data.added}<br>
      ⏭ Skipped (duplicates): ${data.skipped}<br>
      ${data.errors.length ? '⚠ Errors: ' + data.errors.slice(0,5).join(', ') : ''}
    `;
    await loadAll();
    toast(`Imported ${data.added} subnets`, 'success');
  } catch (e) {
    result.className = 'import-result error';
    result.textContent = '❌ ' + e.message;
    toast('Import failed: ' + e.message, 'error');
  }
}

// ── Export ────────────────────────────────────────────
function exportData(fmt) {
  window.open(API + `/api/export/${fmt}`, '_blank');
}

// ── Modal helpers ─────────────────────────────────────
function openModal(modalId = 'subnetModal', overlayId = 'modalOverlay') {
  document.getElementById(overlayId).classList.add('open');
  const m = document.getElementById(modalId);
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('open'));
}

function closeModal(modalId = 'subnetModal', overlayId = 'modalOverlay') {
  document.getElementById(overlayId).classList.remove('open');
  const m = document.getElementById(modalId);
  m.classList.remove('open');
  setTimeout(() => { m.style.display = 'none'; }, 180);
}

function showModalError(msg) {
  const el = document.getElementById('modalError');
  el.textContent = msg; el.style.display = '';
}
function hideModalError() {
  document.getElementById('modalError').style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal(); closeModal('deleteModal','deleteOverlay');
  }
});

// ── Toast ─────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ── Utils ─────────────────────────────────────────────
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────
(async function init() {
  await loadAll();
  switchView('dashboard');
})();
