// ============================================
// data_supply.js — Static Reference Data v2
// Includes: supplier data, warehouse geo,
// weather, highway routes
// ============================================

// ---- Supplier reference data ----
const suppliers = [
  { name: "TechParts India Pvt. Ltd.", location: "Mumbai",    onTimeRate: 68, recentDisruptions: 3 },
  { name: "Textile Hub Co.",           location: "Chennai",   onTimeRate: 82, recentDisruptions: 1 },
  { name: "FreshFarm Exports",         location: "Kolkata",   onTimeRate: 55, recentDisruptions: 4 },
  { name: "AutoComp Systems",          location: "Pune",      onTimeRate: 94, recentDisruptions: 0 },
  { name: "GemCraft Exports",          location: "Delhi",     onTimeRate: 97, recentDisruptions: 0 },
  { name: "PharmaDist Ltd.",           location: "Bangalore", onTimeRate: 76, recentDisruptions: 2 }
];

// ---- Warehouse geo coordinates ----
const warehouseLocations = {
  'Mumbai':    { lat: 19.0760, lng: 72.8777 },
  'Delhi':     { lat: 28.6139, lng: 77.2090 },
  'Chennai':   { lat: 13.0827, lng: 80.2707 },
  'Kolkata':   { lat: 22.5726, lng: 88.3639 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Pune':      { lat: 18.5204, lng: 73.8567 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Jaipur':    { lat: 26.9124, lng: 75.7873 }
};

// ---- Weather data per city ----
const weatherData = {
  'Mumbai':    { type: 'rainy',  icon: '🌧', temp: '28°C', desc: 'Heavy rain — coastal flooding risk' },
  'Delhi':     { type: 'sunny',  icon: '☀', temp: '35°C', desc: 'Clear skies — good visibility' },
  'Chennai':   { type: 'cloudy', icon: '☁', temp: '31°C', desc: 'Overcast — moderate conditions' },
  'Kolkata':   { type: 'rainy',  icon: '🌧', temp: '29°C', desc: 'Pre-monsoon showers' },
  'Hyderabad': { type: 'cloudy', icon: '⛅', temp: '33°C', desc: 'Partly cloudy — normal operations' },
  'Bangalore': { type: 'cloudy', icon: '☁', temp: '26°C', desc: 'Light clouds — mild weather' },
  'Pune':      { type: 'sunny',  icon: '☀', temp: '32°C', desc: 'Clear and warm' },
  'Ahmedabad': { type: 'sunny',  icon: '☀', temp: '38°C', desc: 'Hot and dry — heat advisory' },
  'Jaipur':    { type: 'sunny',  icon: '☀', temp: '37°C', desc: 'Sunny — safe for transit' }
};

// ---- Highway routes between cities ----
const highwayRoutes = [
  { from: 'Mumbai',    to: 'Delhi',     highway: 'NH48',  shipmentId: 'SHP-001', waypoints: [[19.0760,72.8777],[21.1702,72.8311],[22.6916,75.8441],[23.1815,76.1314],[25.4484,78.5685],[28.6139,77.2090]] },
  { from: 'Chennai',   to: 'Bangalore', highway: 'NH48',  shipmentId: 'SHP-002', waypoints: [[13.0827,80.2707],[12.8185,79.6947],[12.9716,77.5946]] },
  { from: 'Kolkata',   to: 'Hyderabad', highway: 'NH16',  shipmentId: 'SHP-003', waypoints: [[22.5726,88.3639],[20.2961,85.8245],[17.6868,83.2185],[17.3850,78.4867]] },
  { from: 'Pune',      to: 'Ahmedabad', highway: 'NH48',  shipmentId: 'SHP-004', waypoints: [[18.5204,73.8567],[19.9975,72.8328],[21.1702,72.8311],[23.0225,72.5714]] },
  { from: 'Delhi',     to: 'Jaipur',   highway: 'NH48',  shipmentId: 'SHP-005', waypoints: [[28.6139,77.2090],[27.5950,76.5750],[26.9124,75.7873]] },
  { from: 'Bangalore', to: 'Mumbai',   highway: 'NH748', shipmentId: 'SHP-006', waypoints: [[12.9716,77.5946],[15.8497,74.4977],[18.9220,72.9630],[19.0760,72.8777]] }
];

// ---- Financial risk data per city (Finance Officer popups) ----
const cityFinancialData = {
  'Mumbai':    { inbound: 2, riskAmount: 524000, pendingPayments: 3, dispute: false },
  'Delhi':     { inbound: 1, riskAmount: 312000, pendingPayments: 2, dispute: false },
  'Chennai':   { inbound: 1, riskAmount: 84600,  pendingPayments: 1, dispute: true  },
  'Kolkata':   { inbound: 1, riskAmount: 176000, pendingPayments: 2, dispute: false },
  'Hyderabad': { inbound: 1, riskAmount: 96000,  pendingPayments: 1, dispute: false },
  'Bangalore': { inbound: 2, riskAmount: 228000, pendingPayments: 3, dispute: true  },
  'Pune':      { inbound: 1, riskAmount: 0,      pendingPayments: 0, dispute: false },
  'Ahmedabad': { inbound: 1, riskAmount: 0,      pendingPayments: 0, dispute: false },
  'Jaipur':    { inbound: 1, riskAmount: 0,      pendingPayments: 1, dispute: false }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get worst risk status for a city from shipments array
 * @param {string} city
 * @param {Array} shipments
 * @returns {'disrupted'|'at-risk'|'on-time'}
 */
function getWarehouseStatus(city, shipments) {
  let status = 'on-time';
  for (const s of shipments) {
    const dest = s.destination || s.dest || '';
    if (s.origin === city || dest === city) {
      if (s.status === 'disrupted') return 'disrupted';
      if (s.status === 'at-risk') status = 'at-risk';
    }
  }
  return status;
}

/**
 * Get color hex for a status string
 * @param {string} status
 * @returns {string}
 */
function getStatusColor(status) {
  if (status === 'disrupted') return '#ef5350';
  if (status === 'at-risk')   return '#ffb74d';
  return '#4caf50';
}

/**
 * Get total estimated financial risk (penalty + holding) across disrupted/at-risk shipments
 * @param {Array} shipments
 * @returns {number}
 */
function getTotalRisk(shipments) {
  return shipments.reduce((sum, s) => {
    if (s.status === 'disrupted' || s.status === 'at-risk') {
      return sum + ((s.penaltyPerDay || 0) + (s.holdingCostPerDay || 0)) * (s.delayDays || 0);
    }
    return sum;
  }, 0);
}

/**
 * Count disrupted shipments
 * @param {Array} shipments
 * @returns {number}
 */
function getDisruptedCount(shipments) {
  return shipments.filter(s => s.status === 'disrupted').length;
}

/**
 * Count at-risk shipments
 * @param {Array} shipments
 * @returns {number}
 */
function getAtRiskCount(shipments) {
  return shipments.filter(s => s.status === 'at-risk').length;
}

/**
 * Generate date label array for Chart.js
 * @param {number} days
 * @returns {string[]}
 */
function buildChartLabels(days) {
  const labels = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
  }
  return labels;
}

/**
 * Format INR currency
 * @param {number} amount
 * @returns {string}
 */
function formatINR(amount) {
  if (!amount) return '₹0';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000)   return '₹' + (amount / 1000).toFixed(1) + 'K';
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * Get status display label and CSS class
 * @param {string} status
 * @returns {{label: string, cls: string}}
 */
function getStatusInfo(status) {
  const map = {
    'on-time':   { label: 'On Time',   cls: 'status-on-time' },
    'at-risk':   { label: 'At Risk',   cls: 'status-at-risk' },
    'disrupted': { label: 'Disrupted', cls: 'status-disrupted' }
  };
  return map[status] || { label: status, cls: 'status-on-time' };
}

/**
 * Get all cities between two cities along a route (approximate)
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
function getRouteCities(from, to) {
  const route = highwayRoutes.find(r =>
    (r.from === from && r.to === to) ||
    (r.from === to && r.to === from)
  );
  if (!route) return [from, to];
  return [route.from, route.to];
}
