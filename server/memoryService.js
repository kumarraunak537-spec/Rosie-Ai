// server/memoryService.js
// Two-Tier Persistent Memory Architecture for Rosie AI Companion
// Tier 1: Short-Term Session Cache & Conversation Context
// Tier 2: Long-Term Semantic Persistent Facts with Metadata, Relevance Ranking & Conflict Resolution

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DATA_DIR = path.join(__dirname, 'data');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'user_state.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class MemoryService {
  constructor() {
    this.shortTermMemory = new Map(); // sessionId -> array of recent messages
    this.longTermMemories = this.loadMemories();
    this.chatHistory = this.loadChatHistory();
    this.userState = this.loadUserState();

    // Initialize Embedding model for RAG with standard Google model name
    const apiKey = process.env.GEMINI_API_KEY;
    this.embedModelName = process.env.MODEL_EMBEDDING || 'text-embedding-004';
    if (apiKey && apiKey.trim().length > 15) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.embedModel = genAI.getGenerativeModel({ model: this.embedModelName });
        console.log(`[MemoryService] RAG Embedding model initialized: ${this.embedModelName}`);
      } catch (err) {
        console.warn('[MemoryService] Embedding model init note:', err.message);
        this.embedModel = null;
      }
    }
  }

  // ----------------------------------------------------
  // VECTOR & SEMANTIC UTILITIES
  // ----------------------------------------------------

  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async computeEmbedding(text) {
    if (!this.embedModel || !text) return null;
    try {
      const res = await this.embedModel.embedContent(text);
      return res.embedding?.values || null;
    } catch (e) {
      return null;
    }
  }

  // ----------------------------------------------------
  // DISK PERSISTENCE & INITIALIZATION
  // ----------------------------------------------------

  loadMemories() {
    try {
      if (fs.existsSync(MEMORIES_FILE)) {
        const raw = fs.readFileSync(MEMORIES_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('[MemoryService] Error loading memories file:', err.message);
    }

    // Default baseline memories
    const initial = [
      {
        id: 'mem_default_vibe',
        userId: 'default',
        category: 'user_preference',
        key: 'user_vibe',
        value: 'Appreciates cozy conversations and warm company',
        importance: 6,
        confidence: 0.9,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        sourceText: 'Default companion context'
      },
      {
        id: 'mem_default_drink',
        userId: 'default',
        category: 'user_preference',
        key: 'favorite_drink',
        value: 'Chai (kadak cutting chai)',
        importance: 8,
        confidence: 0.95,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        sourceText: 'Default preference'
      },
      {
        id: 'mem_default_routine',
        userId: 'default',
        category: 'life_context',
        key: 'daily_routine',
        value: 'Busy with work during daytime, relaxes in the evening',
        importance: 6,
        confidence: 0.85,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        sourceText: 'Default routine'
      }
    ];
    this.saveMemoriesToFile(initial);
    return initial;
  }

  saveMemoriesToFile(memories) {
    try {
      // Save clean memories with metadata
      fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), 'utf8');
    } catch (err) {
      console.error('[MemoryService] Failed to save memories to disk:', err.message);
    }
  }

  loadChatHistory() {
    try {
      if (fs.existsSync(CHAT_HISTORY_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error('[MemoryService] Error loading chat history:', err.message);
    }
    return [];
  }

  saveChatHistoryToFile(history) {
    try {
      const trimmed = history.slice(-300);
      fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (err) {
      console.error('[MemoryService] Failed to save chat history:', err.message);
    }
  }

  loadUserState() {
    try {
      if (fs.existsSync(USER_STATE_FILE)) {
        return JSON.parse(fs.readFileSync(USER_STATE_FILE, 'utf8'));
      }
    } catch (err) {
      console.error('[MemoryService] Error loading user state:', err.message);
    }
    return {
      userName: 'Friend',
      subscriptionPlan: 'free',
      isVip: false,
      voiceEnabled: false,
      chatTheme: 'soft-rose',
      notificationsEnabled: true
    };
  }

  saveUserStateToFile() {
    try {
      fs.writeFileSync(USER_STATE_FILE, JSON.stringify(this.userState, null, 2), 'utf8');
    } catch (err) {
      console.error('[MemoryService] Failed to save user state:', err.message);
    }
  }

  // ----------------------------------------------------
  // TIER 1: SHORT TERM CONVERSATION MEMORY
  // ----------------------------------------------------

  /**
   * Get short-term session context (last 12 turns)
   */
  getShortTermContext(sessionId = 'default') {
    if (!this.shortTermMemory.has(sessionId)) {
      // Filter chat history for this specific session, or recent history if default
      const sessionHistory = this.chatHistory.filter(m => !m.sessionId || m.sessionId === sessionId);
      const recent = sessionHistory.slice(-12);
      this.shortTermMemory.set(sessionId, recent);
    }
    return this.shortTermMemory.get(sessionId);
  }

  /**
   * Add user message to short-term session and persistent history
   */
  addUserMessage(sessionId = 'default', userMessage, userId = 'default') {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const userEntry = {
      id: 'msg_u_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      sessionId,
      userId,
      sender: 'user',
      text: userMessage,
      time: timestamp,
      timestamp: nowIso
    };

    const sessionMsgs = this.getShortTermContext(sessionId);
    sessionMsgs.push(userEntry);
    if (sessionMsgs.length > 24) {
      sessionMsgs.splice(0, sessionMsgs.length - 24);
    }
    this.shortTermMemory.set(sessionId, sessionMsgs);

    this.chatHistory.push(userEntry);
    this.saveChatHistoryToFile(this.chatHistory);

    return userEntry;
  }

  /**
   * Add bot reply to short-term session and persistent history
   */
  addBotReply(sessionId = 'default', parentUserMessageId, botReply, emotion = 'neutral', userId = 'default', chunks = []) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const formattedChunks = (Array.isArray(chunks) && chunks.length > 0)
      ? chunks.map(c => ({
        text: c.text,
        emotion: c.emotion || emotion,
        time: timestamp,
        parentUserMessageId
      }))
      : [{ text: botReply, emotion, time: timestamp, parentUserMessageId }];

    const botEntry = {
      id: 'msg_r_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      sessionId,
      userId,
      sender: 'rosie',
      text: botReply,
      chunks: formattedChunks,
      time: timestamp,
      timestamp: nowIso,
      emotion,
      parentUserMessageId
    };

    const sessionMsgs = this.getShortTermContext(sessionId);
    sessionMsgs.push(botEntry);
    if (sessionMsgs.length > 24) {
      sessionMsgs.splice(0, sessionMsgs.length - 24);
    }
    this.shortTermMemory.set(sessionId, sessionMsgs);

    this.chatHistory.push(botEntry);
    this.saveChatHistoryToFile(this.chatHistory);

    return botEntry;
  }

  // ----------------------------------------------------
  // TIER 2: LONG TERM MEMORY EXTRACTION & INTEL
  // ----------------------------------------------------

  /**
   * Evaluates if text is purely speculative (should NOT be remembered)
   */
  isSpeculative(text) {
    const lower = text.toLowerCase();
    const speculativePatterns = [
      /\b(?:maybe|might|perhaps|probably|possibly)\b/i,
      /\b(?:thinking (?:of|about)|considering|planning to)\b/i,
      /\b(?:soch raha|soch rahi|kya pata|shayad|lagta hai shaayad)\b/i,
      /\b(?:not sure|don't know if|koshish karunga|koshish karungi)\b/i
    ];
    return speculativePatterns.some(p => p.test(lower));
  }

  /**
   * Extract permanent user facts across Profile, Preference, Life, and Relationship
   */
  extractAndPromoteMemories(text, userId = 'default') {
    if (!text || typeof text !== 'string') return [];
    const clean = text.trim();
    if (!clean) return [];

    // 1. Safety check: do not extract from questions or speculative statements
    const isQuestion = /[?]|^(?:kya|who|what|why|where|how|koun|kab|kahan|kyun)\b/i.test(clean);
    if (isQuestion || this.isSpeculative(clean)) {
      return [];
    }

    const updatedKeys = [];
    const lower = clean.toLowerCase();

    // 2. Name Extraction
    const nameMatch = clean.match(/(?:my name is|mera naam|call me|i am|i'm)\s+([A-Za-z0-9_\u0900-\u097F]+)/i);
    if (nameMatch && nameMatch[1]) {
      const candidateName = nameMatch[1].trim();
      const blacklist = [
        'tired', 'sad', 'happy', 'back', 'here', 'going', 'fine', 'good', 'thak',
        'bored', 'really', 'yaad', 'kya', 'batao', 'pata', 'bhi', 'toh', 'nahi',
        'ab', 'building', 'working', 'making', 'planning', 'doing', 'using', 'living'
      ];
      if (!blacklist.includes(candidateName.toLowerCase()) && candidateName.length > 1) {
        const formatted = candidateName.charAt(0).toUpperCase() + candidateName.slice(1);
        this.upsertMemory({
          userId,
          category: 'user_profile',
          key: 'user_name',
          value: formatted,
          importance: 10,
          confidence: 0.98,
          sourceText: clean
        });
        this.userState.userName = formatted;
        this.saveUserStateToFile();
        updatedKeys.push('user_name');
      }
    }

    // 3. Favorite Color Extraction & Correction ("My favorite color is blue", "Actually, my favorite color is black now")
    const colorMatch = clean.match(/(?:favorite|favourite|pasandida)\s+color\s+(?:is|=)?\s*([a-zA-Z]+)/i) ||
      clean.match(/(?:color|colour)\s+(?:i like|i love|i prefer)\s+(?:is)?\s*([a-zA-Z]+)/i) ||
      clean.match(/(?:actually[,\s]+)?(?:my favorite color is|i prefer|mujhe)\s+([a-zA-Z]+)\s*(?:color|colour)?\s*(?:now|pasand hai|more)/i);

    if (colorMatch && colorMatch[1]) {
      const colCandidate = colorMatch[1].trim().toLowerCase();
      const validColors = [
        'black', 'blue', 'red', 'green', 'white', 'purple', 'pink', 'yellow',
        'orange', 'grey', 'gray', 'brown', 'violet', 'teal', 'maroon', 'kala', 'neela', 'laal'
      ];
      if (validColors.includes(colCandidate)) {
        const formattedCol = colCandidate.charAt(0).toUpperCase() + colCandidate.slice(1);
        this.upsertMemory({
          userId,
          category: 'user_preference',
          key: 'favorite_color',
          value: formattedCol,
          importance: 8,
          confidence: 0.95,
          sourceText: clean
        });
        updatedKeys.push('favorite_color');
      }
    }

    // 4. Projects / Apps Being Built ("I am building an AI chat app called Rosie", "Working on a project called X")
    const projectMatch = clean.match(/(?:i am|i'm|main)\s+(?:building|working on|making|developing|bana raha hu|bana raha hoon)\s+(?:an?|my)?\s*([^.!,?]+)/i);
    if (projectMatch && projectMatch[1]) {
      const projText = projectMatch[1].trim();
      if (projText.length > 3 && !this.isSpeculative(projText)) {
        const formattedProj = projText.charAt(0).toUpperCase() + projText.slice(1);
        this.upsertMemory({
          userId,
          category: 'life_context',
          key: 'project',
          value: formattedProj,
          importance: 9,
          confidence: 0.95,
          sourceText: clean
        });
        updatedKeys.push('project');
      }
    }

    // 5. Favorite Drink ("chai lover", "i love coffee", "tea pasand hai")
    const drinkMatch = clean.match(/(chai|tea|coffee|cold coffee|matcha|greentea|cappuccino|latte)/i);
    const hasDrinkSentiment = /(?:love|like|prefer|pasand|favorite|favourite|fan of|peeta|peeti)/i.test(clean);
    if (drinkMatch && hasDrinkSentiment) {
      let drink = drinkMatch[1].toLowerCase();
      if (drink === 'tea') drink = 'chai';
      const formattedDrink = drink.charAt(0).toUpperCase() + drink.slice(1);
      this.upsertMemory({
        userId,
        category: 'user_preference',
        key: 'favorite_drink',
        value: formattedDrink,
        importance: 8,
        confidence: 0.95,
        sourceText: clean
      });
      updatedKeys.push('favorite_drink');
    }

    // 6. Food Preferences ("favorite food is pizza", "i love biryani")
    const foodMatch = clean.match(/(?:favorite|favourite|pasandida)\s+(?:food|dish|cuisine)\s+(?:is)?\s*([a-zA-Z\s]+)/i) ||
      clean.match(/(?:love eating|pasand hai khana|favorite hai)\s+([a-zA-Z\s]+)/i);
    if (foodMatch && foodMatch[1]) {
      const food = foodMatch[1].trim();
      if (food.length > 2) {
        this.upsertMemory({
          userId,
          category: 'user_preference',
          key: 'favorite_food',
          value: food.charAt(0).toUpperCase() + food.slice(1),
          importance: 7,
          confidence: 0.9,
          sourceText: clean
        });
        updatedKeys.push('favorite_food');
      }
    }

    // 7. Work & Profession
    const workMatch = clean.match(/(?:i work (?:on|as|at)|i am an?|mera kaam|mai kaam karta hu|software engineer|developer|designer|doctor|student|college|office mein)/i);
    if (workMatch) {
      if (/(?:android|mobile app|software|coding|developer|engineer)/i.test(clean)) {
        this.upsertMemory({
          userId,
          category: 'life_context',
          key: 'profession',
          value: 'Builds Android apps and software',
          importance: 9,
          confidence: 0.95,
          sourceText: clean
        });
        updatedKeys.push('profession');
      } else if (/student|college|exam|study|padhai/i.test(clean)) {
        this.upsertMemory({
          userId,
          category: 'life_context',
          key: 'profession',
          value: 'Student preparing for exams and studies',
          importance: 8,
          confidence: 0.9,
          sourceText: clean
        });
        updatedKeys.push('profession');
      }
    }

    // 8. Hobbies & Sports
    if (/(?:gym|workout|running|cricket|football|gaming|music|guitar|lo-fi|reading|books)/i.test(clean)) {
      const hobbyMatch = clean.match(/(gym|workout|running|cricket|football|gaming|guitar|music|reading|books)/i);
      if (hobbyMatch) {
        const hobby = hobbyMatch[1].toLowerCase();
        this.upsertMemory({
          userId,
          category: 'user_preference',
          key: 'hobby_' + hobby,
          value: 'Enjoys ' + hobby,
          importance: 7,
          confidence: 0.9,
          sourceText: clean
        });
        updatedKeys.push('hobby');
      }
    }

    // 9. Location / City
    const cityMatch = clean.match(/(?:i live in|i am from|rehta hu|rehti hu|mera ghar)\s+([A-Za-z\u0900-\u097F]+)/i);
    if (cityMatch && cityMatch[1]) {
      const city = cityMatch[1].trim();
      const blacklistedCities = ['delhi', 'mumbai', 'bangalore', 'pune', 'hyderabad', 'london', 'new york', 'india'];
      const isKnown = blacklistedCities.includes(city.toLowerCase()) || city.length > 2;
      if (isKnown && !this.isSpeculative(clean)) {
        this.upsertMemory({
          userId,
          category: 'user_profile',
          key: 'city',
          value: city.charAt(0).toUpperCase() + city.slice(1),
          importance: 8,
          confidence: 0.95,
          sourceText: clean
        });
        updatedKeys.push('city');
      }
    }

    // 10. Relationship / Nickname Preferences ("aap mujhe hasband ji bulaya kro", "call me jaan")
    const titleMatch = clean.match(/(?:aap mujhe|mujhe)\s+([a-zA-Z\s]+?)\s*(?:bulaya kro|bulao|kahakar bulao)/i) ||
      clean.match(/call me\s+([a-zA-Z\s]+?)\s*(?:from now on|ab se)/i);
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      if (title.length > 1 && !blacklistWord(title)) {
        this.upsertMemory({
          userId,
          category: 'relationship',
          key: 'preferred_title',
          value: title,
          importance: 9,
          confidence: 0.95,
          sourceText: clean
        });
        updatedKeys.push('preferred_title');
      }
    }

    return updatedKeys;
  }

  // ----------------------------------------------------
  // MEMORY DEDUPLICATION & CONFLICT RESOLUTION
  // ----------------------------------------------------

  /**
   * Upsert memory with deduplication, conflict resolution, and metadata
   */
  upsertMemory({
    userId = 'default',
    category = 'user_preference',
    key,
    value,
    importance = 7,
    confidence = 0.9,
    sourceText = ''
  }) {
    if (!key || !value) return null;
    const safeKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanValue = value.trim();
    const now = new Date().toISOString();

    // Find existing memory for this user with exact or equivalent key
    const existingIndex = this.longTermMemories.findIndex(
      m => (m.userId === userId || !m.userId) && (m.key === safeKey || this.areKeysEquivalent(m.key, safeKey))
    );

    if (existingIndex !== -1) {
      const existing = this.longTermMemories[existingIndex];
      // Deduplication check: If value is identical, don't duplicate; just refresh
      if (existing.value.toLowerCase() === cleanValue.toLowerCase()) {
        existing.confidence = Math.min(1.0, (existing.confidence || 0.8) + 0.05);
        existing.lastUsedAt = now;
        this.saveMemoriesToFile(this.longTermMemories);
        return existing;
      }

      // Conflict resolution / Update: New confirmed information overrides old value
      existing.value = cleanValue;
      existing.category = category || existing.category;
      existing.confidence = confidence;
      existing.importance = Math.max(existing.importance || 5, importance);
      existing.updatedAt = now;
      existing.lastUsedAt = now;
      existing.sourceText = sourceText || existing.sourceText;
      existing.status = 'confirmed';

      this.saveMemoriesToFile(this.longTermMemories);
      return existing;
    }

    // Create fresh memory entry
    const newMemory = {
      id: 'mem_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId,
      category,
      key: safeKey,
      value: cleanValue,
      importance,
      confidence,
      status: 'confirmed',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      sourceText
    };

    this.longTermMemories.push(newMemory);
    this.saveMemoriesToFile(this.longTermMemories);
    return newMemory;
  }

  areKeysEquivalent(keyA, keyB) {
    if (keyA === keyB) return true;
    const aliases = [
      ['user_name', 'name'],
      ['favorite_color', 'color'],
      ['favorite_drink', 'drink', 'beverage'],
      ['favorite_food', 'food', 'dish'],
      ['project', 'app', 'building_app', 'current_project'],
      ['profession', 'job', 'work', 'career']
    ];
    for (const group of aliases) {
      if (group.includes(keyA) && group.includes(keyB)) {
        return true;
      }
    }
    return false;
  }

  // ----------------------------------------------------
  // RELEVANT MEMORY RETRIEVAL & RANKING PIPELINE
  // ----------------------------------------------------

  /**
   * Selectively retrieve memories strictly relevant to the current user message and topic.
   * Prevents database dumping while guaranteeing high precision on explicit questions.
   */
  async getMemoriesForPrompt(queryText = '', userId = 'default') {
    const userMemories = this.longTermMemories.filter(m => !m.userId || m.userId === userId);
    if (userMemories.length === 0) {
      return 'No long-term memories recorded yet.';
    }

    const lower = (queryText || '').toLowerCase().trim();

    // ----------------------------------------------------
    // STEP 1: EXPLICIT RECALL QUERIES (Guaranteed Precision)
    // ----------------------------------------------------
    // 1. Name query
    if (/(?:what is my name|who am i|mera naam|mera name|naam kya hai|call me by my name)/i.test(lower)) {
      const nameMem = userMemories.find(m => m.key === 'user_name');
      if (nameMem) {
        nameMem.lastUsedAt = new Date().toISOString();
        return `- name: ${nameMem.value} (Confidence: confirmed)`;
      }
    }

    // 2. Favorite color query
    if (/(?:favorite color|favourite color|favourite colour|favorite colour|mera favorite color|color kya hai)/i.test(lower)) {
      const colorMem = userMemories.find(m => m.key === 'favorite_color');
      if (colorMem) {
        colorMem.lastUsedAt = new Date().toISOString();
        return `- favorite color: ${colorMem.value} (Confidence: confirmed)`;
      }
    }

    // 3. Project / App query ("What app am I building?", "remember that thing I was building", "which app")
    if (/(?:what app|which app|what project|remember that thing|kya bana raha|kya project|app am i building|thing i was building)/i.test(lower)) {
      const projMem = userMemories.find(m => m.key === 'project' || m.key === 'app');
      if (projMem) {
        projMem.lastUsedAt = new Date().toISOString();
        return `- project: ${projMem.value} (Confidence: confirmed)`;
      }
    }

    // 4. Favorite drink / tea query
    if (/(?:favorite drink|kya peena pasand|chai pasand|tea or coffee)/i.test(lower)) {
      const drinkMem = userMemories.find(m => m.key === 'favorite_drink');
      if (drinkMem) {
        drinkMem.lastUsedAt = new Date().toISOString();
        return `- favorite drink: ${drinkMem.value} (Confidence: confirmed)`;
      }
    }

    // 5. City / Location query
    if (/(?:where do i live|where am i from|rehta hu kahan|mera city)/i.test(lower)) {
      const cityMem = userMemories.find(m => m.key === 'city');
      if (cityMem) {
        cityMem.lastUsedAt = new Date().toISOString();
        return `- city: ${cityMem.value} (Confidence: confirmed)`;
      }
    }

    // 6. Broad general recall ("what do you remember about me?", "mere baare mein kya yaad hai?")
    if (/(?:yaad (?:hai|rakhti)|remember about me|kya pata hai|kya yaad|bhool gayi|mere baare mein kya)/i.test(lower)) {
      return userMemories
        .slice(0, 4)
        .map(m => `- ${m.key.replace(/_/g, ' ')}: ${m.value}`)
        .join('\n');
    }

    // ----------------------------------------------------
    // STEP 2: SELECTIVE RELEVANCE SCORING FOR CONVERSATION
    // ----------------------------------------------------
    const scoredMemories = [];

    const topicKeywords = {
      user_name: ['name', 'naam', 'identity', 'who am i'],
      favorite_color: ['color', 'colour', 'blue', 'black', 'red', 'green', 'white', 'paint', 'shade'],
      project: ['app', 'code', 'coding', 'software', 'project', 'build', 'building', 'rosie', 'feature', 'bug'],
      favorite_drink: ['chai', 'coffee', 'tea', 'drink', 'peena', 'cappuccino', 'cup', 'beverage'],
      favorite_food: ['food', 'lunch', 'dinner', 'pizza', 'pasta', 'biryani', 'khana', 'bhook'],
      profession: ['work', 'job', 'office', 'career', 'android', 'engineer', 'developer', 'college', 'exam', 'boss'],
      city: ['city', 'shehar', 'delhi', 'mumbai', 'bangalore', 'pune', 'traffic', 'weather', 'live'],
      preferred_title: ['husband', 'jaan', 'babu', 'call me', 'bulana']
    };

    const queryWords = lower.split(/[^a-zA-Z0-9_\u0900-\u097F]+/).filter(w => w.length > 2);

    for (const mem of userMemories) {
      let score = 0;
      const memKeywords = topicKeywords[mem.key] || [];

      // Token overlap with memory key & keywords
      for (const w of queryWords) {
        if (memKeywords.includes(w)) {
          score += 0.4;
        }
        if (mem.key.includes(w)) {
          score += 0.5;
        }
        if (mem.value.toLowerCase().includes(w)) {
          score += 0.3;
        }
      }

      // Exact phrase match
      if (lower.includes(mem.key.replace(/_/g, ' '))) {
        score += 0.6;
      }

      // Importance weighting
      score += ((mem.importance || 5) / 10) * 0.15;

      // Threshold check
      if (score >= 0.45) {
        scoredMemories.push({ memory: mem, score });
      }
    }

    // If no memory meets the relevance threshold, DO NOT dump unrelated memories!
    if (scoredMemories.length === 0) {
      return 'No memories directly relevant to this specific message. DO NOT force or inject any random memory into this turn.';
    }

    // Sort by relevance score descending and pick TOP 1-2
    scoredMemories.sort((a, b) => b.score - a.score);
    const topMemories = scoredMemories.slice(0, 2).map(sm => {
      sm.memory.lastUsedAt = new Date().toISOString();
      return `- ${sm.memory.key.replace(/_/g, ' ')}: ${sm.memory.value}`;
    });

    return topMemories.join('\n');
  }

  // ----------------------------------------------------
  // CRUD API METHODS FOR MEMORY INSPECTOR
  // ----------------------------------------------------

  getAllMemories(userId = 'default') {
    return this.longTermMemories.filter(m => !m.userId || m.userId === userId);
  }

  addMemory(key, value, category = 'user_preference', userId = 'default') {
    if (!key || !value) throw new Error('Key and value required');
    return this.upsertMemory({
      userId,
      category,
      key,
      value,
      importance: 7,
      confidence: 0.9,
      sourceText: 'Manual entry'
    });
  }

  updateMemory(id, key, value, category) {
    const mem = this.longTermMemories.find(m => m.id === id);
    if (!mem) throw new Error('Memory not found');
    if (key) mem.key = key.trim().toLowerCase().replace(/\s+/g, '_');
    if (value) mem.value = value.trim();
    if (category) mem.category = category.trim();
    mem.updatedAt = new Date().toISOString();
    this.saveMemoriesToFile(this.longTermMemories);
    return mem;
  }

  deleteMemory(id) {
    const initialLen = this.longTermMemories.length;
    this.longTermMemories = this.longTermMemories.filter(m => m.id !== id);
    this.saveMemoriesToFile(this.longTermMemories);
    return this.longTermMemories.length < initialLen;
  }

  clearAllMemories(userId = null) {
    if (userId) {
      this.longTermMemories = this.longTermMemories.filter(m => m.userId && m.userId !== userId);
    } else {
      this.longTermMemories = [];
    }
    this.saveMemoriesToFile(this.longTermMemories);
    return true;
  }

  getPersistedChatHistory(sessionId = null) {
    if (sessionId) {
      return this.chatHistory.filter(m => !m.sessionId || m.sessionId === sessionId);
    }
    return this.chatHistory;
  }

  clearChatHistory(sessionId = 'default') {
    if (sessionId === 'all') {
      this.chatHistory = [];
      this.shortTermMemory.clear();
    } else {
      this.chatHistory = this.chatHistory.filter(m => m.sessionId !== sessionId);
      this.shortTermMemory.delete(sessionId);
    }
    this.saveChatHistoryToFile(this.chatHistory);
    return true;
  }

  getUserState() {
    return this.userState;
  }

  updateUserState(updates) {
    this.userState = { ...this.userState, ...updates };
    this.saveUserStateToFile();
    return this.userState;
  }
}

function blacklistWord(word) {
  const list = ['tired', 'sad', 'happy', 'good', 'fine', 'nahi', 'kya', 'bhi', 'toh'];
  return list.includes(word.toLowerCase());
}
const memoryService = new MemoryService();

module.exports = memoryService;
module.exports.MemoryService = MemoryService;
module.exports.RosieMemoryService = MemoryService;

