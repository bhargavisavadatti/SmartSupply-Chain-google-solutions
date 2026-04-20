// ============================================
// firebase_supply.js
// Firebase init, Firestore CRUD, seeding logic
// ============================================

// ---- PASTE YOUR FIREBASE CONFIG HERE ----
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ---- PASTE YOUR GEMINI API KEY HERE ----
const GEMINI_KEY = "YOUR_GEMINI_API_KEY";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ---- Initialize Firebase ----
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================================
// SEED DATA — 6 Shipments
// ============================================================
const SEED_SHIPMENTS = [
  {
    id: "SHP-001",
    origin: "Mumbai",
    destination: "Delhi",
    supplier: "TechParts India Pvt. Ltd.",
    goods: "Electronics",
    value: 500000,
    expectedDelivery: "2026-04-15",
    status: "disrupted",
    disruption: "Severe weather on NH48 near Vadodara causing road closure",
    delayDays: 3,
    penaltyPerDay: 8000,
    holdingCostPerDay: 2500
  },
  {
    id: "SHP-002",
    origin: "Chennai",
    destination: "Bangalore",
    supplier: "Textile Hub Co.",
    goods: "Garments",
    value: 180000,
    expectedDelivery: "2026-04-13",
    status: "at-risk",
    disruption: "Supplier production backlog delaying dispatch",
    delayDays: 1,
    penaltyPerDay: 3500,
    holdingCostPerDay: 1200
  },
  {
    id: "SHP-003",
    origin: "Kolkata",
    destination: "Hyderabad",
    supplier: "FreshFarm Exports",
    goods: "Perishable Goods",
    value: 90000,
    expectedDelivery: "2026-04-12",
    status: "disrupted",
    disruption: "Primary truck breakdown on NH16, awaiting replacement vehicle",
    delayDays: 2,
    penaltyPerDay: 5000,
    holdingCostPerDay: 3000
  },
  {
    id: "SHP-004",
    origin: "Pune",
    destination: "Ahmedabad",
    supplier: "AutoComp Systems",
    goods: "Auto Components",
    value: 320000,
    expectedDelivery: "2026-04-16",
    status: "on-time",
    disruption: "",
    delayDays: 0,
    penaltyPerDay: 6000,
    holdingCostPerDay: 2000
  },
  {
    id: "SHP-005",
    origin: "Delhi",
    destination: "Jaipur",
    supplier: "GemCraft Exports",
    goods: "Jewellery",
    value: 750000,
    expectedDelivery: "2026-04-14",
    status: "on-time",
    disruption: "",
    delayDays: 0,
    penaltyPerDay: 12000,
    holdingCostPerDay: 4000
  },
  {
    id: "SHP-006",
    origin: "Bangalore",
    destination: "Mumbai",
    supplier: "PharmaDist Ltd.",
    goods: "Pharmaceuticals",
    value: 420000,
    expectedDelivery: "2026-04-17",
    status: "at-risk",
    disruption: "Port congestion at JNPT delaying container clearance",
    delayDays: 2,
    penaltyPerDay: 7000,
    holdingCostPerDay: 2200
  }
];

// ============================================================
// SHIPMENTS
// ============================================================

/**
 * Fetch all shipments from Firestore
 * @returns {Promise<Array>}
 */
async function getShipments() {
  try {
    const snapshot = await db.collection('shipments').get();
    return snapshot.docs.map(doc => ({ _docId: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('getShipments error:', err);
    return [];
  }
}

/**
 * Fetch a single shipment by its id field
 * @param {string} id - e.g. "SHP-001"
 * @returns {Promise<Object|null>}
 */
async function getShipmentById(id) {
  try {
    const snapshot = await db.collection('shipments').where('id', '==', id).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { _docId: doc.id, ...doc.data() };
  } catch (err) {
    console.error('getShipmentById error:', err);
    return null;
  }
}

/**
 * Update a shipment's status by its id field
 * @param {string} id - e.g. "SHP-001"
 * @param {string} status - "on-time" | "at-risk" | "disrupted"
 */
async function updateShipmentStatus(id, status) {
  try {
    const snapshot = await db.collection('shipments').where('id', '==', id).limit(1).get();
    if (snapshot.empty) return;
    await snapshot.docs[0].ref.update({ status });
  } catch (err) {
    console.error('updateShipmentStatus error:', err);
  }
}

/**
 * Seeds 6 shipments into Firestore if the collection is empty
 */
async function seedShipmentsIfEmpty() {
  try {
    const snapshot = await db.collection('shipments').limit(1).get();
    if (!snapshot.empty) return; // already seeded

    console.log('Seeding shipments...');
    const batch = db.batch();
    SEED_SHIPMENTS.forEach(shipment => {
      const ref = db.collection('shipments').doc();
      batch.set(ref, {
        ...shipment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    console.log('Shipments seeded successfully.');
  } catch (err) {
    console.error('seedShipmentsIfEmpty error:', err);
  }
}

// ============================================================
// DECISIONS
// ============================================================

/**
 * Save an accepted recommendation decision to Firestore
 * @param {string} shipmentId
 * @param {string} recommendationChosen
 * @param {number} moneySaved
 * @param {string} userId
 */
async function saveDecision(shipmentId, recommendationChosen, moneySaved, userId) {
  try {
    await db.collection('decisions').add({
      shipmentId,
      recommendationChosen,
      moneySaved,
      userId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('saveDecision error:', err);
  }
}

/**
 * Fetch all decisions from Firestore
 * @returns {Promise<Array>}
 */
async function getDecisions() {
  try {
    const snapshot = await db.collection('decisions').orderBy('timestamp', 'desc').get();
    return snapshot.docs.map(doc => ({ _docId: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('getDecisions error:', err);
    return [];
  }
}

// ============================================================
// USERS
// ============================================================

/**
 * Save or update user document in Firestore users collection
 * @param {string} email
 * @param {string} role
 */
async function saveUser(email, role) {
  try {
    await db.collection('users').doc(email).set({
      email,
      role,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('saveUser error:', err);
  }
}

/**
 * Read user document from Firestore
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function getUser(email) {
  try {
    const doc = await db.collection('users').doc(email).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (err) {
    console.error('getUser error:', err);
    return null;
  }
}

// ============================================================
// CASHFLOW
// ============================================================

// Default seed data for cash flow forecast
const DEFAULT_CASHFLOW = {
  normal: [
    820000, 845000, 860000, 835000, 890000, 920000, 910000, 875000, 900000, 935000,
    950000, 965000, 940000, 955000, 980000, 1010000, 990000, 975000, 1005000, 1040000,
    1025000, 1060000, 1080000, 1070000, 1095000, 1110000, 1090000, 1120000, 1140000, 1155000
  ],
  disrupted: [
    790000, 780000, 760000, 745000, 770000, 800000, 785000, 755000, 780000, 810000,
    825000, 840000, 815000, 830000, 855000, 880000, 860000, 845000, 870000, 900000,
    885000, 920000, 935000, 925000, 940000, 960000, 945000, 970000, 985000, 1000000
  ]
};

/**
 * Get cash flow forecast from Firestore.
 * Seeds default data if document doesn't exist.
 * @returns {Promise<Object>}
 */
async function getCashFlow() {
  try {
    const doc = await db.collection('cashflow').doc('forecast').get();
    if (!doc.exists) {
      await db.collection('cashflow').doc('forecast').set(DEFAULT_CASHFLOW);
      return DEFAULT_CASHFLOW;
    }
    return doc.data();
  } catch (err) {
    console.error('getCashFlow error:', err);
    return DEFAULT_CASHFLOW;
  }
}

// ============================================================
// PERSISTENT AUTH (localStorage helpers)
// ============================================================

/** Save session to localStorage */
function saveSession(email, role) {
  localStorage.setItem('fs_user', JSON.stringify({ email, role }));
}

/** Read session from localStorage */
function getSession() {
  try { return JSON.parse(localStorage.getItem('fs_user')); }
  catch { return null; }
}

/** Clear session from localStorage */
function clearSession() {
  localStorage.removeItem('fs_user');
}

// ============================================================
// NOTIFICATIONS (Executive → Finance / SCM)
// ============================================================

/**
 * Save a notification to Firestore
 * @param {string} from - role sending
 * @param {string} to - role receiving ('Finance Officer' | 'Supply Chain Manager')
 * @param {string} message
 * @param {string} type - 'financial' | 'supplier'
 */
async function saveNotification(from, to, message, type) {
  try {
    await db.collection('notifications').add({
      from, to, message, type,
      read: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('saveNotification error:', err);
  }
}

/**
 * Get unread notifications for a given role
 * @param {string} role
 * @returns {Promise<Array>}
 */
async function getUnreadNotifications(role) {
  try {
    const snap = await db.collection('notifications')
      .where('to', '==', role)
      .where('read', '==', false)
      .limit(15)
      .get();
    // Sort client-side to avoid composite index requirement
    return snap.docs
      .map(d => ({ _docId: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  } catch (err) {
    console.error('getUnreadNotifications error:', err);
    return [];
  }
}

/**
 * Mark all notifications for a role as read
 * @param {string} role
 */
async function markNotificationsRead(role) {
  try {
    const snap = await db.collection('notifications')
      .where('to', '==', role)
      .where('read', '==', false)
      .get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (err) {
    console.error('markNotificationsRead error:', err);
  }
}

/**
 * Get all notifications sent by Executive (for Executive dashboard alert log)
 * @returns {Promise<Array>}
 */
async function getExecutiveAlerts() {
  try {
    const snap = await db.collection('notifications')
      .where('from', '==', 'Executive')
      .limit(10)
      .get();
    // Sort client-side to avoid composite index requirement
    return snap.docs
      .map(d => ({ _docId: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  } catch (err) {
    console.error('getExecutiveAlerts error:', err);
    return [];
  }
}
