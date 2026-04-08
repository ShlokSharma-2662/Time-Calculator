const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// --- Validation Helpers ---
const MAX_LOGS_PER_SYNC = 500;
const MAX_LOG_VALUE_SIZE = 10000; // max characters for stringified log value
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    clean[key] = typeof obj[key] === 'object' ? sanitizeObject(obj[key]) : obj[key];
  }
  return clean;
}

function validateLogEntry(entry) {
  // Each entry must be [dateString, dataObject]
  if (!Array.isArray(entry) || entry.length !== 2) {
    return 'Each log entry must be an array of [date, data]';
  }
  const [date, data] = entry;
  if (typeof date !== 'string' || date.length === 0 || date.length > 20) {
    return 'Log date must be a non-empty string (max 20 chars)';
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'Log data must be a non-null object';
  }
  if (JSON.stringify(data).length > MAX_LOG_VALUE_SIZE) {
    return `Log data exceeds max size of ${MAX_LOG_VALUE_SIZE} characters`;
  }
  return null; // valid
}

// Fetch logs for user
router.get('/', auth, (req, res) => {
  try {
    const logs = db.getLogsByUserId(req.user);
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Sync logs (batch upsert) — with schema validation
router.post('/sync', auth, (req, res) => {
  try {
    const { logs } = req.body;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ msg: 'Invalid logs data: expected { logs: [...] }' });
    }

    if (logs.length > MAX_LOGS_PER_SYNC) {
      return res.status(400).json({ msg: `Too many entries: max ${MAX_LOGS_PER_SYNC} per sync, received ${logs.length}` });
    }

    // Validate each entry
    for (let i = 0; i < logs.length; i++) {
      const error = validateLogEntry(logs[i]);
      if (error) {
        return res.status(400).json({ msg: `Invalid log entry at index ${i}: ${error}` });
      }
    }

    // Sanitize to strip prototype-polluting keys
    const sanitizedLogs = logs.map(([date, data]) => [date, sanitizeObject(data)]);

    db.upsertLogs(req.user, sanitizedLogs);
    res.json({ msg: 'Sync successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
