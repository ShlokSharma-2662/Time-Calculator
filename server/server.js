const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/logs', require('./routes/logs'));

app.get('/', (req, res) => {
  res.json({ msg: 'WorkShift API v3.0 — File-Based Storage' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
