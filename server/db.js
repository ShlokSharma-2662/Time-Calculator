const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const LOGS_FILE = path.join(DB_DIR, 'logs.json');
const EXT_SYNC_KEYS_FILE = path.join(DB_DIR, 'ext-sync-keys.json');

// Ensure data directory and files exist
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, '[]');
if (!fs.existsSync(EXT_SYNC_KEYS_FILE)) fs.writeFileSync(EXT_SYNC_KEYS_FILE, '[]');

const readJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

module.exports = {
  // --- Users ---
  findUserByEmail: (email) => {
    const users = readJSON(USERS_FILE);
    return users.find(u => u.email === email) || null;
  },

  findUserById: (id) => {
    const users = readJSON(USERS_FILE);
    return users.find(u => u.id === id) || null;
  },

  createUser: (user) => {
    const users = readJSON(USERS_FILE);
    const newUser = { ...user, id: Date.now().toString(), createdAt: new Date().toISOString() };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return newUser;
  },

  // --- Logs ---
  getLogsByUserId: (userId) => {
    const logs = readJSON(LOGS_FILE);
    return logs.filter(l => l.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
  },

  upsertLogs: (userId, newLogs) => {
    const allLogs = readJSON(LOGS_FILE);
    
    for (const log of newLogs) {
      const idx = allLogs.findIndex(l => l.userId === userId && l.date === log.date);
      if (idx >= 0) {
        allLogs[idx] = { ...log, userId, updatedAt: new Date().toISOString() };
      } else {
        allLogs.push({ ...log, userId, updatedAt: new Date().toISOString() });
      }
    }

    writeJSON(LOGS_FILE, allLogs);
  },

  upsertExtensionLogs: (userId, deviceId, logs) => {
    const allLogs = readJSON(LOGS_FILE);
    const syncKeys = readJSON(EXT_SYNC_KEYS_FILE);
    const keySet = new Set(syncKeys.filter(k => k.userId === userId).map(k => k.key));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const nowIso = new Date().toISOString();

    for (const log of logs) {
      const derivedKey = `${log.date}|${log.in || ''}|${log.out || ''}|${log.breakMinutes || 0}`;
      const idempotencyKey = `${deviceId}:${log.idempotencyKey || derivedKey}`;

      if (keySet.has(idempotencyKey)) {
        skipped += 1;
        continue;
      }

      const normalized = {
        userId,
        date: log.date,
        startTime: log.in || '',
        endTime: log.out || '',
        breakMinutes: Number.isInteger(log.breakMinutes) ? log.breakMinutes : 0,
        source: 'chrome-extension',
        deviceId,
        extensionIdempotencyKey: idempotencyKey,
        updatedAt: nowIso
      };

      const existingIndex = allLogs.findIndex(l => l.userId === userId && l.date === log.date);
      if (existingIndex >= 0) {
        allLogs[existingIndex] = { ...allLogs[existingIndex], ...normalized };
        updated += 1;
      } else {
        allLogs.push(normalized);
        inserted += 1;
      }

      keySet.add(idempotencyKey);
      syncKeys.push({ userId, key: idempotencyKey, createdAt: nowIso });
    }

    writeJSON(LOGS_FILE, allLogs);
    writeJSON(EXT_SYNC_KEYS_FILE, syncKeys);

    return { inserted, updated, skipped };
  }
};
