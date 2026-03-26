const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'workshift_secret_2024_premium';

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

// Sync logs (batch upsert)
router.post('/sync', auth, (req, res) => {
  try {
    const { logs } = req.body;
    if (!logs || !Array.isArray(logs)) return res.status(400).json({ msg: 'Invalid logs data' });
    
    db.upsertLogs(req.user, logs);
    res.json({ msg: 'Sync successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
