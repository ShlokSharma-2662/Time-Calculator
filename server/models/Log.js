const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Store as YYYY-MM-DD
    startTime: { type: String },
    logInput: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure one log per user per day if needed, 
// but for now we allow multiple entries or just overwrite in sync.
module.exports = mongoose.model('Log', LogSchema);
