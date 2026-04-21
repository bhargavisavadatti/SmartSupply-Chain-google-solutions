// ============================================
// main_supply.js — v2
// Role-based routing, persistent auth,
// India map, route planner, finance analytics,
// notification system
// ============================================

// ============================================================
// PAGE ROUTER
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const cls = document.body.className;
  if (cls.includes('login-page')) initLogin();
  else if (cls.includes('dashboard-page')) initDashboard();
  else if (cls.includes('map-page')) initMap();
  else if (cls.includes('route-page')) initRoute();
  else if (cls.includes('disruption-page')) initDisruption();
  else if (cls.includes('recommendation-page')) initRecommendation();
  else if (cls.includes('forecast-page')) initForecast();
  else if (cls.includes('finance-page')) initFinance();
  else if (cls.includes('supplier-page')) initSupplier();
});

// ============================================================
// AUTH (localStorage persistence)
// ============================================================
function authGuard() {
  const user = getSession();
  if (!user || !user.email || !user.role) {
    window.location.href = 'index_supply.html';
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index_supply.html';
}

// ============================================================
// NAV BUILDER (role-based)
// ============================================================
const NAV_LINKS = {
  'Supply Chain Manager': [
    { href: 'map_supply.html', label: '🗺 Map' },
    { href: 'dashboard_supply.html', label: 'Dashboard' },
    { href: 'forecast_supply.html', label: 'Forecast' },
    { href: 'supplier_supply.html', label: 'Suppliers' },
  ],
  'Finance Officer': [
    { href: 'map_supply.html', label: '🗺 Map' },
    { href: 'dashboard_supply.html', label: 'Dashboard' },
    { href: 'finance_supply.html', label: 'Finance' },
  ],
  'Executive': [
    { href: 'map_supply.html', label: '🗺 Map' },
    { href: 'dashboard_supply.html', label: 'Dashboard' },
  ]
};

function buildNav(role, activePage) {
  const container = document.getElementById('navLinks');
  if (!container) return;
  const links = NAV_LINKS[role] || NAV_LINKS['Executive'];
  const currentFile = activePage || window.location.pathname.split('/').pop();
  container.innerHTML = links.map(l => {
    const isActive = currentFile === l.href || currentFile.includes(l.href.replace('.html', ''));
    return `<a class="nav-link ${isActive ? 'active' : ''}" href="${l.href}">${l.label}</a>`;
  }).join('') + `<button class="nav-link logout-btn" onclick="logout()">⏻ Logout</button>`;
}

function setUserPill(user) {
  const el = document.getElementById('userEmail');
  if (el) el.textContent = user.email;
}

// ============================================================
// NOTIFICATION BELL
// ============================================================
async function initNotifBell(role) {
  const btn = document.getElementById('notifBtn');
  const badge = document.getElementById('notifBadge');
  const dropdown = document.getElementById('notifDropdown');
  const list = document.getElementById('notifList');
  if (!btn) return;

  let notifs = [];
  try {
    notifs = await getUnreadNotifications(role);
  } catch (err) {
    // Firestore composite index may not exist yet — fall back to simple query
    try {
      const snap = await db.collection('notifications')
        .where('to', '==', role)
        .where('read', '==', false)
        .get();
      notifs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    } catch { notifs = []; }
  }

  if (notifs.length > 0) {
    badge.textContent = notifs.length > 9 ? '9+' : notifs.length;
    badge.classList.remove('hidden');
    list.innerHTML = notifs.map(n => {
      const icon = n.type === 'financial' ? '💰' : '🚚';
      return `<div class="notif-item notif-unread">
        <div class="notif-item-title">${icon} Alert from ${n.from}</div>
        <div class="notif-item-body">${n.message}</div>
        <div class="notif-item-time">${formatTimestamp(n.timestamp)}</div>
      </div>`;
    }).join('');
  } else {
    badge.classList.add('hidden');
    list.innerHTML = '<div class="notif-empty">✓ No new notifications</div>';
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden') && notifs.length > 0) {
      markNotificationsRead(role).catch(() => { });
      badge.classList.add('hidden');
    }
  });

  document.addEventListener('click', () => dropdown.classList.add('hidden'));
}

function formatTimestamp(ts) {
  if (!ts || !ts.seconds) return 'Just now';
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' · ' +
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ============================================================
// LOGIN
// ============================================================
async function initLogin() {
  // Auto-redirect if already logged in
  const existing = getSession();
  if (existing && existing.email) {
    window.location.href = 'map_supply.html'; // first page is map
    return;
  }

  await seedShipmentsIfEmpty();

  let selectedRole = '';
  const cards = document.querySelectorAll('.role-card');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRole = card.dataset.role;
    });
  });

  // Default select first
  if (cards.length) {
    cards[0].classList.add('selected');
    selectedRole = cards[0].dataset.role;
  }

  const loginBtn = document.getElementById('loginBtn');
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) return showLoginError('Please fill in email and password.');
    if (!email.includes('@')) return showLoginError('Please enter a valid email address.');
    if (!selectedRole) return showLoginError('Please select a role above.');

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span style="animation:pulse 1s infinite;display:inline-block">Signing in…</span>';

    try {
      await saveUser(email, selectedRole);
      saveSession(email, selectedRole);
      window.location.href = 'map_supply.html'; // land on map first
    } catch (err) {
      console.error('Login error:', err);
      showLoginError('Could not connect to Firebase. Check your config.');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In →';
    }
  });

  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click();
  });
}

function showLoginError(msg) {
  let err = document.getElementById('loginError');
  if (!err) {
    err = document.createElement('p');
    err.id = 'loginError';
    err.style.cssText = 'color:var(--danger);font-size:0.82rem;margin-top:10px;text-align:center';
    document.getElementById('loginBtn').after(err);
  }
  err.textContent = msg;
}

// ============================================================
// DASHBOARD (role-aware)
// ============================================================
let currentFilter = 'all';

async function initDashboard() {
  const user = authGuard();
  if (!user) return;

  buildNav(user.role, 'dashboard_supply.html');
  setUserPill(user);
  setDateDisplay();
  initNotifBell(user.role);

  // Hide filter buttons for non-SCM roles (they use one-shot queries, not onSnapshot)
  if (user.role !== 'Supply Chain Manager') {
    const filterRow = document.querySelector('.filter-btns');
    if (filterRow) filterRow.style.display = 'none';
  }

  if (user.role === 'Supply Chain Manager') {
    await initSCMDashboard();
  } else if (user.role === 'Finance Officer') {
    await initFinanceDashboard();
  } else {
    await initExecDashboard(user);
  }
}

// SCM dashboard: shipments table + live ticker
async function initSCMDashboard() {
  // Cache shipments so filter buttons can re-render without waiting for snapshot
  let cachedShipments = [];

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      // Immediately re-render with new filter
      if (cachedShipments.length) renderTable(cachedShipments, currentFilter);
    });
  });

  db.collection('shipments').onSnapshot(snap => {
    cachedShipments = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
    updateStatCards(cachedShipments);
    updateTicker(cachedShipments);
    renderTable(cachedShipments, currentFilter);
  });
}

// Finance Officer dashboard: financial KPIs + mini table
async function initFinanceDashboard() {
  const shipments = await getShipments();
  const decisions = await getDecisions();

  const totalExposure = getTotalRisk(shipments);
  const recovered = decisions.reduce((s, d) => s + (d.moneySaved || 0), 0);
  const atRiskCount = getAtRiskCount(shipments) + getDisruptedCount(shipments);
  const paymentRisk = shipments.filter(s => s.status !== 'on-time').reduce((s, sh) => s + (sh.value || 0) * 0.15, 0);

  // Override stat cards with financial labels and values
  setStatCardFull('totalShipments', atRiskCount, 'Shipments at Risk', 'warning');
  setStatCardFull('disrupted', formatINR(totalExposure), 'Financial Exposure', 'danger');
  setStatCardFull('atRisk', formatINR(paymentRisk), 'Payments at Risk', 'warning');
  setStatCardFull('totalRisk', formatINR(recovered), 'Savings Recovered', 'safe');

  updateTicker(shipments);
  renderTable(shipments.filter(s => s.status !== 'on-time'), 'all');
}

function setStatCard(id, value, label) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
  const labelEl = el?.closest('.stat-card')?.querySelector('.stat-card-label');
  if (labelEl && label) labelEl.textContent = label;
}

/** Set stat card value + label + color class */
function setStatCardFull(id, value, label, colorCls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  // Reset color classes and apply new one
  el.classList.remove('accent', 'safe', 'danger', 'warning');
  if (colorCls) el.classList.add(colorCls);
  const labelEl = el.closest('.stat-card')?.querySelector('.stat-card-label');
  if (labelEl && label) labelEl.textContent = label;
}

// Executive dashboard
async function initExecDashboard(user) {
  const shipments = await getShipments();
  const decisions = await getDecisions();
  const alerts = await getExecutiveAlerts();

  const disrupted = getDisruptedCount(shipments);
  const atRisk = getAtRiskCount(shipments);
  const totalLoss = getTotalRisk(shipments);
  const totalSaved = decisions.reduce((s, d) => s + (d.moneySaved || 0), 0);

  setStatCardFull('totalShipments', shipments.length, 'Total Shipments', 'accent');
  setStatCardFull('disrupted', disrupted, 'Disrupted', 'danger');
  setStatCardFull('atRisk', atRisk, 'At Risk', 'warning');
  setStatCardFull('totalRisk', formatINR(totalLoss), 'Total Risk', 'warning');

  updateTicker(shipments);
  renderTable(shipments, 'all');

  // Show exec alert log panel
  const section = document.getElementById('execAlertSection');
  if (section) section.style.display = 'block';

  const logContainer = document.getElementById('execAlertLog');
  if (logContainer) {
    if (!alerts.length) {
      logContainer.innerHTML = '<p class="alert-log-empty">No alerts sent yet. Use the Map page to alert your Finance or SCM teams.</p>';
    } else {
      logContainer.innerHTML = alerts.map(a => {
        const icon = a.type === 'financial' ? '💰' : '🚚';
        const cls = a.type === 'financial' ? 'finance' : 'supplier';
        return `<div class="alert-log-item">
          <div class="alert-log-icon ${cls}">${icon}</div>
          <div class="alert-log-content">
            <div class="alert-log-desc">${a.message}</div>
            <div class="alert-log-meta">To: ${a.to} · ${formatTimestamp(a.timestamp)}</div>
          </div>
        </div>`;
      }).join('');
    }
  }
}

function setDateDisplay() {
  const el = document.getElementById('dateDisplay');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function updateStatCards(shipments) {
  setText('totalShipments', shipments.length);
  setText('disrupted', getDisruptedCount(shipments));
  setText('atRisk', getAtRiskCount(shipments));
  setText('totalRisk', formatINR(getTotalRisk(shipments)));
}

function updateTicker(shipments) {
  const el = document.getElementById('tickerContent');
  if (!el) return;
  const items = shipments.map(s => {
    const dest = s.destination || s.dest || '';
    if (s.status === 'disrupted')
      return `<span class="ticker-item danger">🔴 ${s.id} [${s.origin}→${dest}] DISRUPTED — ${s.disruption}</span>`;
    if (s.status === 'at-risk')
      return `<span class="ticker-item warning">🟡 ${s.id} [${s.origin}→${dest}] AT RISK — ${s.disruption}</span>`;
    return `<span class="ticker-item safe">🟢 ${s.id} [${s.origin}→${dest}] ON TIME</span>`;
  });
  el.innerHTML = [...items, ...items].join('');
}

function renderTable(shipments, filter) {
  const tbody = document.getElementById('shipmentsBody');
  if (!tbody) return;

  const filtered = filter === 'all' ? shipments :
    shipments.filter(s => s.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const o = { disrupted: 0, 'at-risk': 1, 'on-time': 2 };
    return (o[a.status] || 2) - (o[b.status] || 2);
  });

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <p>No shipments found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(s => {
    const { label, cls } = getStatusInfo(s.status);
    const dest = s.destination || s.dest || '';
    const loss = ((s.penaltyPerDay || 0) + (s.holdingCostPerDay || 0)) * (s.delayDays || 0);
    // Only SCM can click Analyse — Executive and Finance see read-only table
    const userRole = getSession()?.role;
    const canAnalyse = (s.status === 'disrupted' || s.status === 'at-risk') &&
      userRole === 'Supply Chain Manager';

    return `<tr>
      <td><span class="shipment-id">${s.id}</span></td>
      <td class="route-cell hide-mobile">${s.origin} <span class="route-arrow">→</span> ${dest}</td>
      <td class="hide-mobile">${s.supplier || '—'}</td>
      <td class="hide-mobile">${s.goods}</td>
      <td class="value-cell">${formatINR(s.value)}</td>
      <td><span class="status-badge ${cls}">${label}</span></td>
      <td class="hide-mobile">${loss > 0 ? formatINR(loss) : '—'}</td>
      <td>
        <button class="action-btn ${canAnalyse ? 'danger-btn' : ''}"
          onclick="${canAnalyse ? `analyseShipment('${s.id}')` : 'void(0)'}"
          ${canAnalyse ? '' : 'disabled'}>
          ${canAnalyse ? 'Analyse' : '✓ View'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

function analyseShipment(id) {
  sessionStorage.setItem('fs_shipment_id', id);
  window.location.href = 'disruption_supply.html';
}

// ============================================================
// INDIA MAP
// ============================================================
let leafletMap = null;

async function initMap() {
  const user = authGuard();
  if (!user) return;

  buildNav(user.role, 'map_supply.html');
  setUserPill(user);
  initNotifBell(user.role);

  // Init Leaflet
  leafletMap = L.map('mapContainer', {
    center: [20.5937, 78.9629],
    zoom: 5,
    zoomControl: true,
    attributionControl: true,
    maxBounds: [[6, 60], [40, 100]],
    minZoom: 4, maxZoom: 12
  });

  // CartoDB Dark Matter — political map style, grey borders/highways
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(leafletMap);

  // Load shipments data
  const shipments = await getShipments();

  // Draw highway route lines
  drawRouteLines(shipments);

  // Draw warehouse markers
  drawWarehouseMarkers(shipments, user.role);

  // Role-specific setup
  if (user.role === 'Executive') setupExecutiveMap(user, shipments);

  // Close info panel button
  const closeBtn = document.getElementById('mapInfoClose');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    document.getElementById('mapInfoPanel').classList.add('hidden');
  });
}

function drawRouteLines(shipments) {
  const statusMap = {};
  shipments.forEach(s => { statusMap[s.id] = s.status; });

  highwayRoutes.forEach(route => {
    const status = statusMap[route.shipmentId] || 'on-time';
    const color = getStatusColor(status);
    const weight = status === 'disrupted' ? 3 : 2;
    const dash = status === 'at-risk' ? '8, 6' : null;

    const line = L.polyline(route.waypoints, {
      color, weight, opacity: 0.75,
      dashArray: dash
    }).addTo(leafletMap);

    line.bindTooltip(
      `<div style="font-family:'DM Sans',sans-serif;font-size:0.8rem;padding:4px 6px">
        <b>${route.highway}</b><br>
        ${route.from} → ${route.to}<br>
        <span style="color:${color}">${status.toUpperCase()}</span>
      </div>`,
      { sticky: true, direction: 'top' }
    );
  });
}

function drawWarehouseMarkers(shipments, role) {
  Object.keys(warehouseLocations).forEach(city => {
    const coords = warehouseLocations[city];
    const status = getWarehouseStatus(city, shipments);
    const weather = weatherData[city] || { type: 'sunny', icon: '☀' };

    // Weather icon with animation class
    const weatherClass = weather.type === 'rainy' ? 'rain-icon' :
      weather.type === 'cloudy' ? 'cloud-icon' : 'sun-icon';

    const icon = L.divIcon({
      className: '',
      html: `<div class="wh-marker ${status}">
        <div class="wh-dot"></div>
        <div class="wh-pulse"></div>
        <div class="wh-weather ${weatherClass}">${weather.icon}</div>
        <div class="wh-label">${city}</div>
      </div>`,
      iconSize: [80, 64],
      iconAnchor: [40, 30]
    });

    const marker = L.marker([coords.lat, coords.lng], { icon, title: city })
      .addTo(leafletMap);

    // Role-specific click behavior
    if (role === 'Supply Chain Manager') {
      marker.on('click', () => openSCMWarehousePanel(city, status, weather, shipments));
    } else if (role === 'Finance Officer') {
      marker.on('click', () => openFinanceWarehousePanel(city, status, shipments));
    }
    // Executive: no warehouse click — controlled via panel
  });
}

// SCM: click warehouse → show info → button to route planner
function openSCMWarehousePanel(city, status, weather, shipments) {
  const panel = document.getElementById('mapInfoPanel');
  const cityName = document.getElementById('infoCityName');
  const body = document.getElementById('mapInfoBody');
  if (!panel || !cityName || !body) return;

  cityName.textContent = `📦 ${city} Warehouse`;

  const relatedShipments = shipments.filter(s => s.origin === city || (s.destination || s.dest) === city);
  const { label } = getStatusInfo(status);
  const color = getStatusColor(status);

  body.innerHTML = `
    <div class="map-info-row">
      <span class="map-info-label">Status</span>
      <span class="map-info-value" style="color:${color}">${label}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Weather</span>
      <span class="map-info-value">${weather.icon} ${weather.type.charAt(0).toUpperCase() + weather.type.slice(1)} · ${weather.temp || ''}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Condition</span>
      <span class="map-info-value" style="font-size:0.78rem;font-family:'DM Sans',sans-serif;font-weight:400;color:var(--muted)">${weather.desc || '—'}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Active Shipments</span>
      <span class="map-info-value">${relatedShipments.length}</span>
    </div>
    ${relatedShipments.map(s => `
    <div class="map-info-row">
      <span class="map-info-label">${s.id}</span>
      <span class="map-info-value" style="font-size:0.78rem;color:${getStatusColor(s.status)}">${(getStatusInfo(s.status)).label}</span>
    </div>`).join('')}
    <button class="map-info-action" onclick="goToRoutePlanner('${city}')">
      🗺 Plan Route from ${city}
    </button>
  `;

  panel.classList.remove('hidden');
}

function goToRoutePlanner(city) {
  sessionStorage.setItem('fs_route_origin', city);
  window.location.href = 'route_supply.html';
}

// Finance: click warehouse → show financial popup
function openFinanceWarehousePanel(city, status, shipments) {
  const panel = document.getElementById('mapInfoPanel');
  const cityName = document.getElementById('infoCityName');
  const body = document.getElementById('mapInfoBody');
  if (!panel || !cityName || !body) return;

  cityName.textContent = `💰 ${city} — Financial Risk`;

  const fin = cityFinancialData[city] || { riskAmount: 0, pendingPayments: 0, dispute: false, inbound: 0 };
  const relatedShipments = shipments.filter(s => s.origin === city || (s.destination || s.dest) === city);
  const exposure = relatedShipments.reduce((sum, s) => {
    if (s.status !== 'on-time')
      return sum + ((s.penaltyPerDay || 0) + (s.holdingCostPerDay || 0)) * (s.delayDays || 0);
    return sum;
  }, 0);
  const { label } = getStatusInfo(status);
  const color = getStatusColor(status);

  const saving = exposure > 0 ? Math.round(exposure * 0.65) : 0;

  body.innerHTML = `
    <div class="map-info-row">
      <span class="map-info-label">Warehouse Status</span>
      <span class="map-info-value" style="color:${color}">${label}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Financial Exposure</span>
      <span class="map-info-value ${exposure > 0 ? 'danger' : 'safe'}">${formatINR(exposure)}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Pending Payments</span>
      <span class="map-info-value warning">${fin.pendingPayments} invoice(s)</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Payment Dispute</span>
      <span class="map-info-value ${fin.dispute ? 'danger' : 'safe'}">${fin.dispute ? '⚠ Active Dispute' : '✓ Clear'}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">If Resolved Now</span>
      <span class="map-info-value safe">${saving > 0 ? 'Save ' + formatINR(saving) : '—'}</span>
    </div>
    <div class="map-info-row">
      <span class="map-info-label">Active Shipments</span>
      <span class="map-info-value">${relatedShipments.length}</span>
    </div>
    ${fin.dispute ? `<div style="margin-top:8px;padding:8px;background:rgba(239,83,80,0.08);border-radius:6px;font-size:0.77rem;color:var(--danger)">
      ⚠ Financial dispute detected. Immediate review recommended.</div>` : ''}
    ${exposure > 0 ? `<div style="margin-top:8px;padding:8px;background:rgba(255,183,77,0.08);border-radius:6px;font-size:0.77rem;color:var(--warning)">
      💡 Resolving disruptions here could recover up to ${formatINR(saving)}.</div>` : ''}
  `;

  panel.classList.remove('hidden');
}

// Executive panel setup
function setupExecutiveMap(user, shipments) {
  const panel = document.getElementById('execPanel');
  if (!panel) return;
  panel.classList.remove('hidden');

  // Risk summary cards
  const totalFin = getTotalRisk(shipments);
  const disrupted = getDisruptedCount(shipments);
  const atRisk = getAtRiskCount(shipments);

  const cards = document.getElementById('execRiskCards');
  if (cards) {
    cards.innerHTML = `
      <div class="exec-risk-card">
        <span class="exec-risk-name">Financial Exposure</span>
        <span class="exec-risk-val" style="color:var(--danger)">${formatINR(totalFin)}</span>
      </div>
      <div class="exec-risk-card">
        <span class="exec-risk-name">Disrupted / At Risk</span>
        <span class="exec-risk-val" style="color:var(--warning)">${disrupted} / ${atRisk}</span>
      </div>`;
  }

  // Toggle buttons
  const toggles = document.querySelectorAll('.exec-toggle');
  toggles.forEach(t => {
    t.addEventListener('click', () => {
      toggles.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      // Visual feedback only (color overlays could be enhanced)
    });
  });

  // Alert buttons
  const alertFin = document.getElementById('alertFinanceBtn');
  const alertSCM = document.getElementById('alertSCMBtn');

  if (alertFin) {
    alertFin.addEventListener('click', async () => {
      await saveNotification(
        'Executive', 'Finance Officer',
        `Executive Alert: Financial risk of ${formatINR(totalFin)} detected across supply chain. ${disrupted} disrupted shipments require immediate financial review.`,
        'financial'
      );
      showExecAlert(alertFin, '✓ Finance Team Alerted!');
    });
  }

  if (alertSCM) {
    alertSCM.addEventListener('click', async () => {
      await saveNotification(
        'Executive', 'Supply Chain Manager',
        `Executive Alert: ${disrupted} disrupted and ${atRisk} at-risk shipments detected. Total financial exposure: ${formatINR(totalFin)}. Immediate action required.`,
        'supplier'
      );
      showExecAlert(alertSCM, '✓ SCM Team Alerted!');
    });
  }
}

function showExecAlert(btn, msg) {
  const orig = btn.innerHTML;
  btn.innerHTML = msg;
  btn.style.opacity = '0.7';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.style.opacity = '';
    btn.disabled = false;
  }, 3000);
}

// ============================================================
// ROUTE PLANNER (SCM only)
// ============================================================
let routeMap = null;
let routeLayer = null;

async function initRoute() {
  const user = authGuard();
  if (!user || user.role !== 'Supply Chain Manager') {
    window.location.href = 'dashboard_supply.html';
    return;
  }

  buildNav(user.role, 'route_supply.html');

  // Pre-fill origin from map click
  const preOrigin = sessionStorage.getItem('fs_route_origin');
  if (preOrigin) {
    const sel = document.getElementById('routeOrigin');
    if (sel) sel.value = preOrigin;
  }

  const calcBtn = document.getElementById('calcRouteBtn');
  const loadingBox = document.getElementById('routeLoadingBox');
  const results = document.getElementById('routeResults');

  calcBtn.addEventListener('click', async () => {
    const origin = document.getElementById('routeOrigin').value;
    const dest = document.getElementById('routeDest').value;
    const goods = document.getElementById('routeGoods').value;

    if (!origin || !dest || origin === dest) {
      return showRouteError('Please select different origin and destination.');
    }

    calcBtn.disabled = true;
    loadingBox.classList.remove('hidden');
    results.classList.add('hidden');

    await calculateRoute(origin, dest, goods, user);

    loadingBox.classList.add('hidden');
    results.classList.remove('hidden');
    calcBtn.disabled = false;
  });
}

async function calculateRoute(origin, dest, goods, user) {
  // Find route
  const route = highwayRoutes.find(r =>
    (r.from === origin && r.to === dest) ||
    (r.from === dest && r.to === origin)
  );

  // Distance estimate (rough km based on route)
  const distMap = {
    'Mumbai-Delhi': 1400, 'Delhi-Mumbai': 1400,
    'Chennai-Bangalore': 340, 'Bangalore-Chennai': 340,
    'Kolkata-Hyderabad': 1490, 'Hyderabad-Kolkata': 1490,
    'Pune-Ahmedabad': 665, 'Ahmedabad-Pune': 665,
    'Delhi-Jaipur': 270, 'Jaipur-Delhi': 270,
    'Bangalore-Mumbai': 980, 'Mumbai-Bangalore': 980
  };
  const key = `${origin}-${dest}`;
  const dist = distMap[key] || Math.round(Math.random() * 800 + 300);
  const time = Math.round(dist / 55); // ~55 km/h avg

  const shipments = await getShipments();
  const status = route ? (shipments.find(s => s.id === route.shipmentId)?.status || 'on-time') : 'on-time';

  const riskLabel = status === 'disrupted' ? '🔴 HIGH' : status === 'at-risk' ? '🟡 MEDIUM' : '🟢 LOW';
  const riskCls = status === 'disrupted' ? 'danger' : status === 'at-risk' ? 'warning' : 'safe';

  // Best departure (avoid rain if possible)
  const origWeather = weatherData[origin] || {};
  const destWeather = weatherData[dest] || {};
  const bestDep = origWeather.type === 'rainy' ? '05:30 AM (before rain peaks)' :
    origWeather.type === 'sunny' && origWeather.temp?.includes('38') ? '06:00 AM (beat heat)' :
      '08:00 AM';

  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + Math.ceil(time / 12)); // ~12 driving hours/day
  const eta = etaDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  setText('routeHighway', route?.highway || 'National Highway');
  setText('routeDistance', dist + ' km');
  setText('routeTime', Math.ceil(time / 12) + ' day(s) · ' + time + ' hrs total');
  const riskEl = document.getElementById('routeRisk');
  if (riskEl) { riskEl.textContent = riskLabel; riskEl.className = 'route-info-value ' + riskCls; }
  setText('routeDeparture', bestDep);
  setText('routeETA', eta);

  // Weather strip
  renderWeatherStrip([origin, dest]);

  // Mini map
  renderRouteMiniMap(route, origin, dest);

  // AI recommendation
  generateRouteRecommendation(origin, dest, goods, status, dist, time, origWeather, destWeather);
}

function renderWeatherStrip(cities) {
  const container = document.getElementById('weatherCities');
  if (!container) return;
  container.innerHTML = cities.map(city => {
    const w = weatherData[city] || { icon: '☀', type: 'sunny', temp: '30°C' };
    return `<div class="weather-city-card">
      <span class="weather-city-icon">${w.icon}</span>
      <div class="weather-city-name">${city}</div>
      <div class="weather-city-temp">${w.temp || ''}</div>
      <div class="weather-city-type ${w.type}">${w.type.toUpperCase()}</div>
    </div>`;
  }).join('');
}

function renderRouteMiniMap(route, origin, dest) {
  if (routeMap) { routeMap.remove(); routeMap = null; }

  const originCoords = warehouseLocations[origin];
  const destCoords = warehouseLocations[dest];
  if (!originCoords || !destCoords) return;

  const center = [
    (originCoords.lat + destCoords.lat) / 2,
    (originCoords.lng + destCoords.lng) / 2
  ];

  routeMap = L.map('routeMapContainer', {
    center, zoom: 5,
    zoomControl: false, attributionControl: false,
    dragging: false, scrollWheelZoom: false
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19
  }).addTo(routeMap);

  // Draw route line
  const waypoints = route?.waypoints || [
    [originCoords.lat, originCoords.lng],
    [destCoords.lat, destCoords.lng]
  ];
  L.polyline(waypoints, { color: '#ecdfcc', weight: 2.5, opacity: 0.8 }).addTo(routeMap);

  // Origin marker
  L.circleMarker([originCoords.lat, originCoords.lng], {
    radius: 8, fillColor: '#4caf50', color: '#4caf50',
    weight: 2, fillOpacity: 0.9
  }).addTo(routeMap).bindTooltip(origin, { permanent: true, direction: 'top', className: 'leaflet-mini-tooltip' });

  // Dest marker
  L.circleMarker([destCoords.lat, destCoords.lng], {
    radius: 8, fillColor: '#ecdfcc', color: '#ecdfcc',
    weight: 2, fillOpacity: 0.9
  }).addTo(routeMap).bindTooltip(dest, { permanent: true, direction: 'top', className: 'leaflet-mini-tooltip' });

  // Fit bounds
  routeMap.fitBounds(L.latLngBounds(waypoints), { padding: [30, 30] });
}

async function generateRouteRecommendation(origin, dest, goods, status, dist, time, origWeather, destWeather) {
  const el = document.getElementById('aiRouteText');
  if (!el) return;
  el.textContent = 'Generating AI route recommendation…';

  const prompt = `You are a supply chain logistics expert in India. 
Give a concise 3-sentence route recommendation for:
- Route: ${origin} → ${dest}
- Distance: ~${dist} km, estimated ${Math.ceil(time / 12)} day(s)
- Goods: ${goods}
- Route status: ${status}
- Origin weather: ${origWeather.type} (${origWeather.temp || ''}) — ${origWeather.desc || ''}
- Destination weather: ${destWeather.type} (${destWeather.temp || ''}) — ${destWeather.desc || ''}

Include: optimal departure timing, key risks to watch, and one specific advice for the goods type.`;

  try {
    const rec = await callGemini(prompt);
    el.textContent = rec;
  } catch {
    el.textContent = `For this ${origin}–${dest} route (${dist} km), departure before 07:00 AM is recommended to avoid peak traffic near city limits. ${origWeather.type === 'rainy' ? 'Rainy conditions at origin may cause 2-3 hour delays — ensure waterproof packaging for ' + goods + '.' : 'Weather conditions are generally favourable.'}  Monitor NH status updates and carry backup contact for alternate truck dispatch if needed.`;
  }
}

function showRouteError(msg) {
  let el = document.getElementById('routeErr');
  if (!el) {
    el = document.createElement('p');
    el.id = 'routeErr';
    el.style.cssText = 'color:var(--danger);font-size:0.82rem;margin-top:8px;text-align:center';
    document.getElementById('calcRouteBtn').after(el);
  }
  el.textContent = msg;
  setTimeout(() => el.textContent = '', 3000);
}

// ============================================================
// DISRUPTION PAGE
// ============================================================
async function initDisruption() {
  const user = authGuard();
  if (!user) return;
  buildNav(user.role, '');

  const id = sessionStorage.getItem('fs_shipment_id');
  if (!id) { window.location.href = 'dashboard_supply.html'; return; }

  const shipment = await getShipmentById(id);
  if (!shipment) { window.location.href = 'dashboard_supply.html'; return; }

  setText('shipId', shipment.id);
  setText('origin', shipment.origin);
  setText('dest', shipment.destination || shipment.dest || '');
  setText('supplier', shipment.supplier || '—');
  setText('goods', shipment.goods);
  setText('value', formatINR(shipment.value));
  setText('delivery', shipment.expectedDelivery || '—');
  setText('delayDays', (shipment.delayDays || 0) + ' day(s)');
  setText('penalty', '₹' + (shipment.penaltyPerDay || 0).toLocaleString('en-IN') + '/day');
  setText('disruptionText', shipment.disruption || 'No disruption reported');

  const badge = document.getElementById('statusBadge');
  const stTxt = document.getElementById('statusText');
  if (badge && stTxt) {
    const { label, cls } = getStatusInfo(shipment.status);
    badge.className = 'status-badge ' + cls;
    stTxt.textContent = label;
  }

  const analyseBtn = document.getElementById('analyseBtn');
  const loadingBox = document.getElementById('loadingBox');
  const resultsBox = document.getElementById('resultsBox');

  analyseBtn.addEventListener('click', async () => {
    analyseBtn.disabled = true;
    loadingBox.classList.remove('hidden');
    resultsBox.classList.add('hidden');

    const [analysis, impact] = await Promise.all([
      analyseDisruption(shipment),
      calculateFinancialImpact(shipment)
    ]);

    setText('aiSummary', analysis.summary);
    setText('t-delay', shipment.delayDays + ' day(s)');
    setText('t-penalty', '₹' + (impact.penaltyCost || 0).toLocaleString('en-IN'));
    setText('t-holding', '₹' + (impact.holdingCost || 0).toLocaleString('en-IN'));
    setText('t-total', '₹' + (impact.totalLoss || 0).toLocaleString('en-IN'));

    sessionStorage.setItem('fs_analysis', JSON.stringify({
      summary: analysis.summary,
      penaltyCost: impact.penaltyCost,
      holdingCost: impact.holdingCost,
      totalLoss: impact.totalLoss
    }));

    loadingBox.classList.add('hidden');
    resultsBox.classList.remove('hidden');
  });

  document.getElementById('proceedBtn').addEventListener('click', () => {
    window.location.href = 'recommendation_supply.html';
  });
}

// ============================================================
// RECOMMENDATION PAGE
// ============================================================
async function initRecommendation() {
  const user = authGuard();
  if (!user) return;
  buildNav(user.role, '');

  const id = sessionStorage.getItem('fs_shipment_id');
  if (!id) { window.location.href = 'dashboard_supply.html'; return; }

  const shipment = await getShipmentById(id);
  if (!shipment) { window.location.href = 'dashboard_supply.html'; return; }

  const analysis = (() => { try { return JSON.parse(sessionStorage.getItem('fs_analysis')); } catch { return {}; } })() || {};

  setText('ctxId', shipment.id);
  setText('ctxRoute', shipment.origin + ' → ' + (shipment.destination || ''));
  setText('ctxLoss', '₹' + (analysis.totalLoss || 0).toLocaleString('en-IN'));
  setText('ctxDelay', (shipment.delayDays || 0) + ' day(s)');

  const genBtn = document.getElementById('genBtn');
  const loadingBox = document.getElementById('loadingBox');
  const recsGrid = document.getElementById('recsGrid');

  genBtn.addEventListener('click', async () => {
    genBtn.disabled = true;
    loadingBox.classList.remove('hidden');
    recsGrid.classList.add('hidden');

    const result = await getRecommendations(shipment, analysis.totalLoss || 0);
    loadingBox.classList.add('hidden');
    renderRecs(result.recommendations, shipment, user, analysis.totalLoss || 0);
    recsGrid.classList.remove('hidden');
  });
}

function renderRecs(recs, shipment, user, totalLoss) {
  const grid = document.getElementById('recsGrid');
  if (!grid || !recs) return;

  grid.innerHTML = recs.map((rec, i) => {
    const isTop = i === 0;
    const confCls = rec.confidence === 'High' ? 'accent' : rec.confidence === 'Low' ? '' : 'warning';
    return `<div class="rec-card ${isTop ? 'top-pick' : ''}">
      ${isTop ? '<span class="top-pick-ribbon">⭐ Top Pick</span>' : ''}
      <div class="rec-card-title">${rec.title}</div>
      <div class="rec-card-desc">${rec.description}</div>
      <div class="rec-metrics">
        <div class="rec-metric"><div class="rec-metric-label">Time Saved</div><div class="rec-metric-value">${rec.timeSaved}</div></div>
        <div class="rec-metric"><div class="rec-metric-label">Cost Saving</div><div class="rec-metric-value">₹${(rec.costSaving || 0).toLocaleString('en-IN')}</div></div>
        <div class="rec-metric"><div class="rec-metric-label">Confidence</div><div class="rec-metric-value ${confCls}">${rec.confidence}</div></div>
      </div>
      <div class="rec-actions">
        <button class="btn-accept" onclick="acceptRec('${shipment.id}',\`${rec.title.replace(/`/g, "'")}\`,${rec.costSaving || 0},'${user.email}')">✓ Accept &amp; Implement</button>
        <button class="btn-dismiss">Dismiss</button>
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('.btn-dismiss').forEach(btn => {
    btn.addEventListener('click', function () {
      const card = this.closest('.rec-card');
      card.style.opacity = '0.38';
      card.querySelectorAll('button').forEach(b => b.disabled = true);
    });
  });
}

async function acceptRec(shipmentId, title, saving, email) {
  await saveDecision(shipmentId, title, saving, email);
  await updateShipmentStatus(shipmentId, 'on-time');
  const toast = document.getElementById('successToast');
  const msg = toast?.querySelector('.toast-msg');
  if (msg) msg.textContent = `₹${saving.toLocaleString('en-IN')} in expected savings. Redirecting…`;
  toast?.classList.remove('hidden');
  setTimeout(() => window.location.href = 'dashboard_supply.html', 2200);
}

// ============================================================
// FORECAST PAGE (Finance Officer)
// ============================================================
let forecastChart = null;
let fullCashflow = null;

async function initForecast() {
  const user = authGuard();
  if (!user) return;
  buildNav(user.role, 'forecast_supply.html');
  setUserPill(user);
  initNotifBell(user.role);

  fullCashflow = await getCashFlow();
  buildForecastChart(30);
  updateForecastStats(30);
  await populateRiskTable();
  generateForecastInsight();

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const days = parseInt(btn.dataset.days);
      buildForecastChart(days);
      updateForecastStats(days);
    });
  });
}

function buildForecastChart(days) {
  const ctx = document.getElementById('forecastChart');
  if (!ctx || !fullCashflow) return;
  const labels = buildChartLabels(days);
  const normal = fullCashflow.normal.slice(-days);
  const disrupted = fullCashflow.disrupted.slice(-days);
  if (forecastChart) forecastChart.destroy();
  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Normal', data: normal, borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.07)', borderWidth: 2, pointRadius: 2, pointHoverRadius: 5, tension: 0.4, fill: true },
        { label: 'Disrupted', data: disrupted, borderColor: '#ef5350', backgroundColor: 'rgba(239,83,80,0.05)', borderWidth: 2, pointRadius: 2, pointHoverRadius: 5, tension: 0.4, fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2a2c27', borderColor: '#3c3d37', borderWidth: 1,
          titleColor: '#ecdfcc', bodyColor: '#697565', padding: 11,
          callbacks: { label: c => ` ${c.dataset.label}: ₹${c.parsed.y.toLocaleString('en-IN')}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(60,61,55,0.5)' }, ticks: { color: '#697565', font: { size: 11 }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(60,61,55,0.5)' }, ticks: { color: '#697565', font: { size: 11 }, callback: v => '₹' + (v / 1000).toFixed(0) + 'K' } }
      }
    }
  });
}

function updateForecastStats(days) {
  if (!fullCashflow) return;
  const n = fullCashflow.normal.slice(-days);
  const d = fullCashflow.disrupted.slice(-days);
  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const gap = avg(n) - avg(d);
  setText('statNormal', formatINR(avg(n)));
  setText('statDisrupted', formatINR(avg(d)));
  setText('statGap', formatINR(gap));
  setText('statRisk', formatINR(gap * days));
}

async function populateRiskTable() {
  const shipments = await getShipments();
  const tbody = document.getElementById('riskTableBody');
  if (!tbody) return;
  const atRisk = shipments.filter(s => s.status !== 'on-time').slice(0, 4);
  tbody.innerHTML = atRisk.map(s => {
    const loss = ((s.penaltyPerDay || 0) + (s.holdingCostPerDay || 0)) * (s.delayDays || 0);
    const dest = s.destination || s.dest || '';
    return `<tr>
      <td class="font-syne fw-700 text-accent">${s.id}</td>
      <td>${s.origin} → ${dest}</td>
      <td>${s.delayDays || 0} day(s)</td>
      <td class="font-syne fw-700">${formatINR(loss)}</td>
      <td><span class="risk-tag ${s.status === 'disrupted' ? 'high' : 'medium'}">${s.status === 'disrupted' ? 'High' : 'Medium'}</span></td>
    </tr>`;
  }).join('');
}

async function generateForecastInsight() {
  const el = document.getElementById('insightText');
  if (!el || !fullCashflow) return;
  const gap = Math.round((fullCashflow.normal.slice(-30).reduce((a, b) => a + b, 0) - fullCashflow.disrupted.slice(-30).reduce((a, b) => a + b, 0)) / 30);
  try {
    const text = await callGemini(`In 2-3 concise sentences, advise a Finance Officer about a supply chain cash flow gap of ₹${gap.toLocaleString('en-IN')}/day. Focus on risk mitigation and actionable steps.`);
    el.textContent = text;
  } catch {
    el.textContent = `The daily cash flow shortfall of ${formatINR(gap)} is compounding risk across the 30-day window. Priority should be placed on resolving the disrupted shipments immediately while accelerating receivables from on-time routes. Establishing a short-term credit facility of ${formatINR(gap * 10)} would provide adequate buffer.`;
  }
}

// ============================================================
// FINANCE ANALYTICS PAGE (Finance Officer)
// ============================================================
async function initFinance() {
  const user = authGuard();
  if (!user || user.role !== 'Finance Officer') {
    window.location.href = 'dashboard_supply.html';
    return;
  }
  buildNav(user.role, 'finance_supply.html');
  setUserPill(user);
  initNotifBell(user.role);

  const [shipments, decisions, cashflow] = await Promise.all([
    getShipments(), getDecisions(), getCashFlow()
  ]);

  // KPI cards
  const totalExposure = getTotalRisk(shipments);
  const recovered = decisions.reduce((s, d) => s + (d.moneySaved || 0), 0);
  const paymentRisk = shipments.filter(s => s.status !== 'on-time').reduce((s, sh) => s + (sh.value || 0) * 0.12, 0);
  const n14 = cashflow.normal.slice(-14).reduce((a, b) => a + b, 0);
  const d14 = cashflow.disrupted.slice(-14).reduce((a, b) => a + b, 0);
  const cashGap = Math.round((n14 - d14) / 14);

  setText('finTotalExposure', formatINR(totalExposure));
  setText('finPaymentRisk', formatINR(paymentRisk));
  setText('finCashGap', formatINR(cashGap) + '/day');
  setText('finRecovered', formatINR(recovered));

  // Payment risk table
  renderPaymentRiskTable(shipments);

  // Charts
  buildFinanceCashChart(cashflow);
  buildFinanceDonutChart(shipments);

  // AI recommendations for finance
  generateFinanceAIRecommendation(shipments, totalExposure, cashGap);
}

function renderPaymentRiskTable(shipments) {
  const tbody = document.getElementById('paymentRiskBody');
  if (!tbody) return;

  const atRisk = shipments.filter(s => s.status !== 'on-time');
  if (!atRisk.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:20px">All payments are on track.</td></tr>';
    return;
  }

  tbody.innerHTML = atRisk.map(s => {
    const dest = s.destination || s.dest || '';
    const loss = ((s.penaltyPerDay || 0) + (s.holdingCostPerDay || 0)) * (s.delayDays || 0);
    const risk = s.status === 'disrupted' ? 'high' : 'medium';
    const { label, cls } = getStatusInfo(s.status);
    return `<tr>
      <td><span class="shipment-id">${s.id}</span></td>
      <td class="route-cell">${s.origin} → ${dest}</td>
      <td class="value-cell">${formatINR(s.value)}</td>
      <td><span class="status-badge ${cls}">${label}</span></td>
      <td style="color:var(--danger)">₹${(s.penaltyPerDay || 0).toLocaleString('en-IN')}</td>
      <td style="color:var(--warning)">₹${(s.holdingCostPerDay || 0).toLocaleString('en-IN')}</td>
      <td>${s.delayDays || 0} day(s)</td>
      <td class="font-syne fw-700" style="color:var(--danger)">${formatINR(loss)}</td>
      <td><span class="risk-tag ${risk}">${risk === 'high' ? 'High' : 'Medium'}</span></td>
    </tr>`;
  }).join('');
}

function buildFinanceCashChart(cashflow) {
  const ctx = document.getElementById('finCashChart');
  if (!ctx) return;
  const labels = buildChartLabels(14);
  const normal = cashflow.normal.slice(-14);
  const disrupted = cashflow.disrupted.slice(-14);
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Normal', data: normal, borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.06)', borderWidth: 1.5, pointRadius: 2, tension: 0.4, fill: true },
        { label: 'Disrupted', data: disrupted, borderColor: '#ef5350', backgroundColor: 'rgba(239,83,80,0.05)', borderWidth: 1.5, pointRadius: 2, tension: 0.4, fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#2a2c27', borderColor: '#3c3d37', borderWidth: 1, titleColor: '#ecdfcc', bodyColor: '#697565', callbacks: { label: c => ` ${c.dataset.label}: ₹${c.parsed.y.toLocaleString('en-IN')}` } }
      },
      scales: {
        x: { grid: { color: 'rgba(60,61,55,0.4)' }, ticks: { color: '#697565', font: { size: 10 }, maxTicksLimit: 6 } },
        y: { grid: { color: 'rgba(60,61,55,0.4)' }, ticks: { color: '#697565', font: { size: 10 }, callback: v => '₹' + (v / 1000).toFixed(0) + 'K' } }
      }
    }
  });
}

function buildFinanceDonutChart(shipments) {
  const ctx = document.getElementById('finDonutChart');
  if (!ctx) return;
  const disrupted = getDisruptedCount(shipments);
  const atRisk = getAtRiskCount(shipments);
  const safe = shipments.length - disrupted - atRisk;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Disrupted', 'At Risk', 'On Time'],
      datasets: [{
        data: [disrupted, atRisk, safe],
        backgroundColor: ['rgba(239,83,80,0.8)', 'rgba(255,183,77,0.8)', 'rgba(76,175,80,0.7)'],
        borderColor: '#2a2c27', borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: '#697565', font: { size: 11 }, padding: 14, boxWidth: 12 } },
        tooltip: { backgroundColor: '#2a2c27', borderColor: '#3c3d37', borderWidth: 1, titleColor: '#ecdfcc', bodyColor: '#697565' }
      }
    }
  });
}

async function generateFinanceAIRecommendation(shipments, totalExposure, cashGap) {
  const el = document.getElementById('aiFinanceText');
  const actContainer = document.getElementById('aiFinanceActions');
  if (!el) return;

  const disrupted = shipments.filter(s => s.status === 'disrupted');

  const prompt = `You are a supply chain finance expert. 
Total financial exposure: ₹${totalExposure.toLocaleString('en-IN')} 
Daily cash flow gap: ₹${cashGap.toLocaleString('en-IN')}
Disrupted shipments: ${disrupted.length} (${disrupted.map(s => s.goods).join(', ')})

Provide 2-3 sentences of financial advisory, then suggest exactly 3 specific actions as a JSON array: [{"action":"...","priority":"High|Medium","saving":"₹X"}]
Return the advisory text first, then the JSON on a new line.`;

  try {
    const raw = await callGemini(prompt);
    const parts = raw.split('\n');
    const jsonLine = parts.find(l => l.trim().startsWith('['));
    const text = parts.filter(l => !l.trim().startsWith('[') && l.trim()).join(' ');

    el.textContent = text || raw;

    if (jsonLine && actContainer) {
      const actions = JSON.parse(jsonLine);
      actContainer.innerHTML = actions.map(a => {
        const cls = a.priority === 'High' ? 'danger' : 'warning';
        return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:0.83rem;color:var(--text);margin-bottom:3px">${a.action}</div>
            <div style="font-size:0.72rem;color:var(--muted)">Priority: <span style="color:var(--${cls})">${a.priority}</span></div>
          </div>
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.88rem;color:var(--safe)">${a.saving}</div>
        </div>`;
      }).join('');
    }
  } catch {
    el.textContent = `With ${formatINR(totalExposure)} at risk and a daily cash flow gap of ${formatINR(cashGap)}, immediate financial controls are needed. Prioritise resolving the ${disrupted.length} disrupted shipments and activate invoice financing facilities. Consider renegotiating penalty clauses with partners for the at-risk routes.`;
    if (actContainer) {
      actContainer.innerHTML = [
        { action: 'Activate invoice financing for at-risk shipments', priority: 'High', saving: formatINR(Math.round(totalExposure * 0.35)) },
        { action: 'Renegotiate penalty clauses on delayed routes', priority: 'High', saving: formatINR(Math.round(totalExposure * 0.25)) },
        { action: 'Accelerate receivables from on-time routes', priority: 'Medium', saving: formatINR(Math.round(cashGap * 5)) }
      ].map(a => `<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:0.83rem;color:var(--text);margin-bottom:3px">${a.action}</div>
          <div style="font-size:0.72rem;color:var(--muted)">Priority: <span style="color:var(--${a.priority === 'High' ? 'danger' : 'warning'})">${a.priority}</span></div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:0.88rem;color:var(--safe)">${a.saving}</div>
      </div>`).join('');
    }
  }
}

// ============================================================
// SUPPLIER PAGE (SCM)
// ============================================================
let supplierData = [];
let activeHealthFilter = 'all';

async function initSupplier() {
  const user = authGuard();
  if (!user) return;
  buildNav(user.role, 'supplier_supply.html');
  setUserPill(user);
  initNotifBell(user.role);

  const loadingBox = document.getElementById('supplierLoadingBox');
  const grid = document.getElementById('suppliersGrid');
  if (loadingBox) loadingBox.classList.remove('hidden');
  if (grid) grid.innerHTML = '';

  const scored = await Promise.all(
    suppliers.map(async s => {
      const score = await getSupplierHealthScore(s);
      return { ...s, ...score };
    })
  );
  supplierData = scored;

  if (loadingBox) loadingBox.classList.add('hidden');
  renderSuppliers(supplierData);

  document.getElementById('supplierSearch')?.addEventListener('input', filterAndRenderSuppliers);

  document.querySelectorAll('.health-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.health-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeHealthFilter = btn.dataset.health;
      filterAndRenderSuppliers();
    });
  });
}

function filterAndRenderSuppliers() {
  const q = (document.getElementById('supplierSearch')?.value || '').toLowerCase();
  let list = supplierData;
  if (activeHealthFilter !== 'all') list = list.filter(s => s.label === activeHealthFilter);
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q));
  renderSuppliers(list);
}

function renderSuppliers(list) {
  const grid = document.getElementById('suppliersGrid');
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><p>No suppliers match.</p></div>';
    return;
  }
  grid.innerHTML = list.map(s => {
    const badgeCls = s.label === 'Reliable' ? 'reliable' : s.label === 'Watch' ? 'watch' : 'high-risk';
    const scoreCls = s.score >= 80 ? 'green' : s.score >= 60 ? 'yellow' : 'red';
    const barCls = scoreCls;
    const onTimeCls = s.onTimeRate >= 80 ? 'green' : s.onTimeRate >= 60 ? 'yellow' : 'red';
    return `<div class="supplier-card">
      <div class="supplier-card-header">
        <div>
          <div class="supplier-name">${s.name}</div>
          <div class="supplier-location">📍 ${s.location}</div>
        </div>
        <span class="health-badge ${badgeCls}">${s.label}</span>
      </div>
      <div class="score-bar-wrap">
        <div class="score-bar-header">
          <span class="score-bar-label">On-Time Rate</span>
          <span class="score-bar-value">${s.onTimeRate}%</span>
        </div>
        <div class="score-bar"><div class="score-bar-fill ${onTimeCls}" style="width:${s.onTimeRate}%"></div></div>
      </div>
      <div class="score-bar-wrap">
        <div class="ai-score-row">
          <span class="score-bar-label">AI Health Score</span>
          <span class="ai-score-value ${scoreCls}">${s.score}<small style="font-size:0.55em">/100</small></span>
        </div>
        <div class="score-bar"><div class="score-bar-fill ${barCls}" style="width:${s.score}%"></div></div>
      </div>
      <div class="supplier-explanation">${s.explanation}</div>
    </div>`;
  }).join('');
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
