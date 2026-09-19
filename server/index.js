// server/index.js
// Express API server for Rosie AI Chat Application

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const aiService = require('./aiService');
const memoryService = require('./memoryService');
const emotionService = require('./emotionService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// --- API ROUTES ---

// 1. Health & Status
app.get('/api/health', (req, res) => {
  const aiStatus = aiService.getStatus();
  const memoriesCount = memoryService.getAllMemories().length;
  res.json({
    ok: true,
    name: 'Rosie AI Chat Backend',
    version: '1.0.0',
    ai: aiStatus,
    memoriesStored: memoriesCount,
    timestamp: new Date().toISOString()
  });
});

// 2. Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default', userId = 'default' } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const response = await aiService.generateResponse(message.trim(), sessionId, userId);
    res.json(response);
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// 3. Chat History
app.get('/api/chat/history', (req, res) => {
  const { sessionId = null } = req.query;
  const history = memoryService.getPersistedChatHistory(sessionId);
  res.json({ history });
});

app.delete('/api/chat/history', (req, res) => {
  const { sessionId = 'default' } = req.query;
  memoryService.clearChatHistory(sessionId);
  res.json({ ok: true, message: 'Chat history cleared' });
});

// 4. Memory Inspector Endpoints
app.get('/api/memories', (req, res) => {
  const { userId = 'default' } = req.query;
  const memories = memoryService.getAllMemories(userId);
  res.json({
    count: memories.length,
    memories
  });
});

app.post('/api/memories', (req, res) => {
  try {
    const { key, value, category = 'custom' } = req.body;
    if (!key || !value) {
      return res.status(400).json({ error: 'Both key and value are required' });
    }
    const memories = memoryService.addMemory(key, value, category);
    res.status(201).json({ ok: true, memories });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/memories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { key, value, category } = req.body;
    const updated = memoryService.updateMemory(id, key, value, category);
    res.json({ ok: true, memory: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/memories/:id', (req, res) => {
  const { id } = req.params;
  const removed = memoryService.deleteMemory(id);
  res.json({ ok: true, removed });
});

app.delete('/api/memories', (req, res) => {
  memoryService.clearAllMemories();
  res.json({ ok: true, message: 'All memories cleared' });
});

// 5. Auth / Session Login
app.post('/api/auth/login', (req, res) => {
  const { identity, password } = req.body;
  // Simple session login for mobile app
  let userName = 'Friend';
  if (identity) {
    const clean = identity.split('@')[0].replace(/[0-9+]/g, '').trim();
    if (clean.length > 1) {
      userName = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  const updatedState = memoryService.updateUserState({
    userName: userName || 'Friend',
    lastLogin: new Date().toISOString()
  });

  res.json({
    ok: true,
    token: 'rosie_sess_' + Date.now(),
    user: updatedState
  });
});

// 6. User State & Settings
app.get('/api/user/state', (req, res) => {
  res.json(memoryService.getUserState());
});

app.put('/api/user/state', (req, res) => {
  const updated = memoryService.updateUserState(req.body);
  res.json({ ok: true, user: updated });
});

// 7. Subscription
app.post('/api/subscription', (req, res) => {
  const { plan = 'trial' } = req.body;
  const isVip = plan === 'vip' || plan === 'trial';
  const updated = memoryService.updateUserState({
    subscriptionPlan: plan,
    isVip,
    subscriptionDate: new Date().toISOString()
  });

  res.json({
    ok: true,
    plan,
    isVip,
    message: plan === 'trial' ? 'Starter Trial activated! Enjoy 7 days of Rosie VIP 💖' : 'Monthly VIP Pass activated! Boundless heart unlocked 💕',
    user: updated
  });
});

// 8. Single Page App fallback for routes like /login, /chat, /profile, /subscription
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🌸 Rosie AI Chat Server running on http://localhost:${PORT}`);
  console.log(`📱 Web/Mobile UI accessible at http://localhost:${PORT}`);
});
