const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const MAX_LOGS_PER_SYNC = 500;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};

function validateSyncLog(log, index) {
  if (typeof log !== 'object' || log === null || Array.isArray(log)) {
    return `logs[${index}] must be an object`;
  }

  if (typeof log.date !== 'string' || !DATE_RE.test(log.date)) {
    return `logs[${index}].date must be YYYY-MM-DD`;
  }

  if (log.in !== undefined && (typeof log.in !== 'string' || !TIME_RE.test(log.in))) {
    return `logs[${index}].in must be HH:MM (24-hour)`;
  }

  if (log.out !== undefined && (typeof log.out !== 'string' || !TIME_RE.test(log.out))) {
    return `logs[${index}].out must be HH:MM (24-hour)`;
  }

  if (log.breakMinutes !== undefined) {
    if (!Number.isInteger(log.breakMinutes) || log.breakMinutes < 0 || log.breakMinutes > 720) {
      return `logs[${index}].breakMinutes must be an integer between 0 and 720`;
    }
  }

  if (log.idempotencyKey !== undefined) {
    if (typeof log.idempotencyKey !== 'string' || log.idempotencyKey.length < 4 || log.idempotencyKey.length > 200) {
      return `logs[${index}].idempotencyKey must be a string (4-200 chars)`;
    }
  }

  return null;
}

router.post('/sync-logs', auth, (req, res) => {
  try {
    const extensionIdHeader = req.header('x-extension-id');
    if (process.env.EXTENSION_ID && extensionIdHeader !== process.env.EXTENSION_ID) {
      return res.status(403).json({ msg: 'Extension is not allowed' });
    }

    const { source, deviceId, logs } = req.body || {};
    if (source !== 'chrome-extension') {
      return res.status(400).json({ msg: 'source must be "chrome-extension"' });
    }
    if (typeof deviceId !== 'string' || deviceId.length < 6 || deviceId.length > 120) {
      return res.status(400).json({ msg: 'deviceId must be a string (6-120 chars)' });
    }
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ msg: 'logs must be a non-empty array' });
    }
    if (logs.length > MAX_LOGS_PER_SYNC) {
      return res.status(400).json({ msg: `Too many entries: max ${MAX_LOGS_PER_SYNC} per sync` });
    }

    for (let i = 0; i < logs.length; i += 1) {
      const validationError = validateSyncLog(logs[i], i);
      if (validationError) {
        return res.status(400).json({ msg: validationError });
      }
    }

    const result = db.upsertExtensionLogs(req.user, deviceId, logs);
    return res.json({
      msg: 'Extension sync successful',
      ...result,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
