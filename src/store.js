// ============================================================
// PRO BELIEVERS GYM - Optimized Database Engine
// KEY FIX: Singleton DB connection (was opening new conn every query!)
// KEY FIX: In-memory cache (avoids repeated IndexedDB reads)
// ============================================================

const DB_NAME = 'GymProDatabase';
const DB_VERSION = 1;
const STORES = { MEMBERS: 'members', TRANSACTIONS: 'transactions', PLANS: 'plans', CONFIG: 'config' };

// SINGLETON: One connection reused everywhere
let _db = null;
let _dbPromise = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.values(STORES).forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => { _dbPromise = null; reject(req.error); };
    req.onblocked = () => { _dbPromise = null; reject(new Error('DB blocked')); };
  });
  return _dbPromise;
}

function perform(storeName, mode, callback) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = callback(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ---- IN-MEMORY CACHE ----
const cache = { members: null, transactions: null, plans: null, config: null };
const invalidate = (key) => { cache[key] = null; };

// ---- MEMBERS ----
export async function getMembers() {
  if (cache.members) return cache.members;
  const list = await perform(STORES.MEMBERS, 'readonly', s => s.getAll());
  list.sort((a, b) => a.name.localeCompare(b.name));
  cache.members = list;
  return list;
}

export async function addMember(data) {
  const newMember = {
    ...data,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    createdAt: new Date().toISOString()
  };
  await perform(STORES.MEMBERS, 'readwrite', s => s.add(newMember));
  invalidate('members');
  return newMember;
}

export async function updateMember(id, updates) {
  const member = await perform(STORES.MEMBERS, 'readonly', s => s.get(id));
  await perform(STORES.MEMBERS, 'readwrite', s => s.put({ ...member, ...updates }));
  invalidate('members');
}

export async function deleteMember(id) {
  await perform(STORES.MEMBERS, 'readwrite', s => s.delete(id));
  invalidate('members');
}

// ---- TRANSACTIONS ----
export async function getTransactions() {
  if (cache.transactions) return cache.transactions;
  const list = await perform(STORES.TRANSACTIONS, 'readonly', s => s.getAll());
  list.sort((a, b) => new Date(b.date) - new Date(a.date));
  cache.transactions = list;
  return list;
}

export async function addTransaction(data) {
  const newTrans = { ...data, id: Date.now().toString(36), createdAt: new Date().toISOString() };
  await perform(STORES.TRANSACTIONS, 'readwrite', s => s.add(newTrans));
  invalidate('transactions');
  return newTrans;
}

// ---- PLANS ----
export async function getPlans() {
  if (cache.plans) return cache.plans;
  let list = await perform(STORES.PLANS, 'readonly', s => s.getAll());
  if (list.length === 0) {
    const defaults = [
      { id: 'p1', name: '1 Month', price: 1200, duration: 30 },
      { id: 'p2', name: '3 Months', price: 3000, duration: 90 },
      { id: 'p3', name: '6 Months', price: 5500, duration: 180 },
      { id: 'p4', name: '12 Months', price: 9999, duration: 365 }
    ];
    for (const p of defaults) await perform(STORES.PLANS, 'readwrite', s => s.add(p));
    list = defaults;
  }
  cache.plans = list;
  return list;
}

export async function addPlan(data) {
  await perform(STORES.PLANS, 'readwrite', s => s.add({ ...data, id: Date.now().toString() }));
  invalidate('plans');
}

export async function updatePlan(id, updates) {
  const plan = await perform(STORES.PLANS, 'readonly', s => s.get(id));
  await perform(STORES.PLANS, 'readwrite', s => s.put({ ...plan, ...updates }));
  invalidate('plans');
}

export async function deletePlan(id) {
  await perform(STORES.PLANS, 'readwrite', s => s.delete(id));
  invalidate('plans');
}

// ---- CONFIG ----
export async function getConfig() {
  if (cache.config) return cache.config;
  const config = await perform(STORES.CONFIG, 'readonly', s => s.get('gym'));
  cache.config = config || { id: 'gym', name: 'PRO BELIEVERS GYM' };
  return cache.config;
}

export async function saveConfig(data) {
  const current = await getConfig();
  const updated = { ...current, ...data };
  await perform(STORES.CONFIG, 'readwrite', s => s.put(updated));
  cache.config = updated;
}

// ---- BACKUP / RESTORE ----
export async function backupData() {
  const data = {};
  for (const s of Object.values(STORES)) {
    data[s] = await perform(s, 'readonly', store => store.getAll());
  }
  return data;
}

export async function restoreData(data) {
  for (const s of Object.values(STORES)) {
    if (data[s]) {
      await perform(s, 'readwrite', store => store.clear());
      for (const item of data[s]) await perform(s, 'readwrite', store => store.add(item));
    }
  }
  Object.keys(cache).forEach(k => { cache[k] = null; });
}

export async function bulkDeleteMembers() {
  await perform(STORES.MEMBERS, 'readwrite', s => s.clear());
  invalidate('members');
}

// ---- IMAGE COMPRESSION ----
export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 300; // Reduced from 400 — faster render, smaller storage
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.65));
      };
    };
  });
}