// server/conversationContext.js
// 3. Conversation Context & Tracking Service for Rosie AI Companion
// Manages multi-turn conversation flow, current & previous topics, contextual disambiguation,
// unresolved questions, emotional trajectories, dry-message tracking, response memory, relationship progression,
// and disk-backed persistence across server restarts and client reloads.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'conversation_sessions.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class ConversationContextService {
  constructor() {
    this.sessions = this.loadSessions();
    this.dryTokens = new Set([
      'acha', 'achha', 'achhaaa', 'haan', 'ha', 'hmm', 'hmmm', 'ok', 'okay',
      'fine', 'kuch nahi', 'kuch nhi', 'nahi', 'nhi', 'yes', 'no', 'lol',
      'thik hai', 'theek hai', 'cool', 'k', 'kk', 'sahi hai', 'accha'
    ]);
  }

  loadSessions() {
    const map = new Map();
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            map.set(k, v);
          }
        }
      }
    } catch (err) {
      console.error('[ConversationContext] Error loading sessions file:', err.message);
    }
    return map;
  }

  saveSessions() {
    try {
      const obj = {};
      for (const [k, v] of this.sessions.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[ConversationContext] Failed to save sessions:', err.message);
    }
  }

  /**
   * Get or initialize context for session
   */
  getContext(sessionId = 'default') {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        currentTopic: 'general_greeting',
        previousTopic: null,
        unresolvedQuestions: [],
        unresolvedStatements: [],
        peopleMentioned: [],
        recentRomanticContext: false,
        recentTeasing: false,
        emotionalDirection: 'casual_flow',
        recentEvents: [],
        topicSwitched: false,
        lastUserEmotion: 'neutral',
        turnCount: 0,
        consecutiveDryCount: 0,
        relationshipCloseness: 0.35,
        familiarityLevel: 'new',
        recentRosieReplies: [],
        recentRosieStrategies: [],
        recentPreferences: []
      });
      this.saveSessions();
    }
    const sess = this.sessions.get(sessionId);
    if (!sess.peopleMentioned) sess.peopleMentioned = [];
    if (!sess.unresolvedStatements) sess.unresolvedStatements = [];
    return sess;
  }

  /**
   * Update context on incoming user message
   */
  updateOnUserMessage(sessionId = 'default', userMessage, emotionAnalysis, intentAnalysis, history = []) {
    const ctx = this.getContext(sessionId);
    ctx.turnCount += 1;

    const clean = (userMessage || '').trim();
    const lower = clean.toLowerCase();
    ctx.topicSwitched = false;

    // 1. Dry Message & Pattern Detection
    const isExactDryToken = this.dryTokens.has(lower);
    const words = lower.split(/\s+/).filter(Boolean);
    const isShortDry = (words.length <= 2 && (isExactDryToken || words.every(w => this.dryTokens.has(w))));

    if (isShortDry) {
      ctx.consecutiveDryCount += 1;
    } else {
      ctx.consecutiveDryCount = 0;
    }

    const isDryMessage = isShortDry;
    const isRepeatedDryPattern = ctx.consecutiveDryCount >= 2;

    // 2. Relationship Familiarity Progression
    ctx.relationshipCloseness = Math.min(0.95, Number((ctx.relationshipCloseness + 0.02).toFixed(2)));
    if (['sad', 'vulnerable', 'anxious', 'romantic'].includes(emotionAnalysis.emotion)) {
      ctx.relationshipCloseness = Math.min(0.95, Number((ctx.relationshipCloseness + 0.04).toFixed(2)));
    }

    if (ctx.turnCount < 4) {
      ctx.familiarityLevel = 'new';
    } else if (ctx.turnCount < 12) {
      ctx.familiarityLevel = 'acquainted';
    } else if (ctx.turnCount < 25) {
      ctx.familiarityLevel = 'close_companion';
    } else {
      ctx.familiarityLevel = 'bonded';
    }

    // 3. Detect Topic & Context Events
    let detectedTopic = ctx.currentTopic;
    if (/(?:interview|job interview|round 2|technical round)/i.test(lower)) {
      detectedTopic = 'job_interview';
      this.addEvent(ctx, 'User has an upcoming interview');
    } else if (/(?:office|boss|deadline|kaam bohot|workload|client|meeting)/i.test(lower)) {
      detectedTopic = 'work_pressure';
      this.addEvent(ctx, 'User is dealing with work/office pressure');
    } else if (/(?:exam|studies|padhai|college|test)/i.test(lower)) {
      detectedTopic = 'academics_exam';
      this.addEvent(ctx, 'User has exams/studies going on');
    } else if (/(?:chai|coffee|tea|khana|dinner|lunch|breakfast|bhook|pizza|pasta)/i.test(lower)) {
      detectedTopic = 'food_and_drink';
    } else if (/(?:music|song|gaana|playlist|lofi|guitar)/i.test(lower)) {
      detectedTopic = 'music';
    } else if (/(?:cricket|football|match|ipl|gaming|pubg)/i.test(lower)) {
      detectedTopic = 'sports_and_games';
    } else if (/(?:movie|film|series|netflix|web series)/i.test(lower)) {
      detectedTopic = 'movies_entertainment';
    } else if (/(?:meaning of life|sacrifice|happiness|career|philosophy|existential)/i.test(lower)) {
      detectedTopic = 'philosophy_and_life';
    } else if (/(?:how do i make an ai app|build an ai|architecture|monolithic|microservices|coding|software|algorithm|react|node|api|database)/i.test(lower)) {
      detectedTopic = 'technology_engineering';
    } else if (/(?:breakup|ex|relationship|single|pyar|pyaar|dil toot|miss you|miss u)/i.test(lower)) {
      detectedTopic = 'relationship_and_heart';
    }

    // Explicit topic shift cues (only when not in a vulnerable/sad state)
    const isVulnerable = ['sad', 'stressed', 'angry'].includes(emotionAnalysis.emotion) || /theek nahi/i.test(lower);
    if (!isVulnerable && /(?:chalo ye chhod|chhodo ye|topic change|by the way|waise (?:tumhe|ek baat|kya|aap|tum))/i.test(lower)) {
      ctx.topicSwitched = true;
      if (detectedTopic !== ctx.currentTopic) {
        ctx.previousTopic = ctx.currentTopic;
        ctx.currentTopic = detectedTopic;
      }
    } else if (detectedTopic !== ctx.currentTopic && detectedTopic !== 'general_greeting' && !isVulnerable) {
      ctx.previousTopic = ctx.currentTopic;
      ctx.currentTopic = detectedTopic;
    }

    // 4. Contextual Nuance Resolution (e.g. Nervousness related to interview)
    let contextualDisambiguation = null;
    if (/(?:nervous|darr lag raha|dar lag raha|tension ho rahi|frightened)/i.test(lower)) {
      const interviewEvent = ctx.recentEvents.find(e => /interview/i.test(e.event));
      const examEvent = ctx.recentEvents.find(e => /exam/i.test(e.event));
      const workEvent = ctx.recentEvents.find(e => /work|office|boss/i.test(e.event));

      if (interviewEvent) {
        contextualDisambiguation = 'User is explicitly nervous about the upcoming interview they mentioned earlier. DO NOT ask "why are you nervous?". Directly address and soothe the interview nervousness.';
      } else if (examEvent) {
        contextualDisambiguation = 'User is nervous about their exams. DO NOT ask "why are you nervous?". Reassure them about their preparation.';
      } else if (workEvent) {
        contextualDisambiguation = 'User is feeling anxiety related to the work/boss pressure they mentioned.';
      }
    }

    // 4.1 Contextual Past Reference Resolution ("kal wala plan")
    if (/(?:kal wala plan|plan yaad hai|woh baat yaad hai|kal wali baat)/i.test(lower)) {
      const planEvent = ctx.recentEvents.slice().reverse().find(e => /interview|movie|outing|plan|project|meet/i.test(e.event));
      if (planEvent) {
        contextualDisambiguation = `User is referring to: "${planEvent.event}". Respond understanding what they are referring to without asking what plan they mean.`;
      }
    }

    // 5. Emotional Direction & Conflict Tracking
    const prevEmotion = ctx.lastUserEmotion;
    const curEmotion = emotionAnalysis.emotion;
    ctx.lastUserEmotion = curEmotion;

    // 4.2 Feeling > Words Conflict Detection (Section 25)
    let feelingConflict = false;
    let feelingDirective = null;
    const isDismissivePositive = /^(?:theek hoon|thik hu|thik hoon|fine|kuch nahi|kuch nhi|sab theek hai|i am okay|i'?m fine|all good)\b/i.test(lower);
    if (isDismissivePositive && ['sad', 'stressed', 'anxious', 'lonely', 'frustrated', 'angry'].includes(prevEmotion)) {
      feelingConflict = true;
      feelingDirective = 'User says "theek hoon" / "fine", but context shows they were sad/upset. Do NOT blindly accept it. Gently see through it with warm care (e.g. "hmm... pakka? mujhe toh nahi lag raha", "mujhse bhi chhupaoge ab?").';
    }

    let emotionalDirection = 'casual_flow';
    if (['sad', 'stressed', 'anxious', 'frustrated', 'angry'].includes(curEmotion)) {
      if (['sad', 'stressed', 'anxious'].includes(prevEmotion)) {
        emotionalDirection = 'deep_venting';
      } else {
        emotionalDirection = 'venting_phase';
      }
    } else if (['playful'].includes(curEmotion)) {
      emotionalDirection = 'playful_banter';
    } else if (['romantic', 'happy'].includes(curEmotion)) {
      emotionalDirection = 'deepening_affection';
    } else if (['sad', 'angry'].includes(prevEmotion) && ['happy', 'playful', 'casual'].includes(curEmotion)) {
      emotionalDirection = 'sudden_mood_rebound';
    } else if (['playful', 'happy'].includes(prevEmotion) && ['sad', 'stressed'].includes(curEmotion)) {
      emotionalDirection = 'sudden_drop_to_vulnerable';
    }
    ctx.emotionalDirection = emotionalDirection;

    // 6. Track unresolved questions
    if (intentAnalysis.isQuestion) {
      ctx.unresolvedQuestions.push(userMessage);
      if (ctx.unresolvedQuestions.length > 3) {
        ctx.unresolvedQuestions.shift();
      }
    }

    this.saveSessions();

    return {
      currentTopic: ctx.currentTopic,
      previousTopic: ctx.previousTopic,
      topicSwitched: ctx.topicSwitched,
      emotionalDirection: ctx.emotionalDirection,
      recentEvents: ctx.recentEvents.slice(-4).map(e => e.event),
      contextualDisambiguation,
      feelingConflict,
      feelingDirective,
      turnCount: ctx.turnCount,
      isDryMessage,
      consecutiveDryCount: ctx.consecutiveDryCount,
      isRepeatedDryPattern,
      relationshipCloseness: ctx.relationshipCloseness,
      familiarityLevel: ctx.familiarityLevel,
      recentRosieReplies: ctx.recentRosieReplies.slice(0, 8),
      recentRosieStrategies: ctx.recentRosieStrategies.slice(0, 6)
    };
  }

  /**
   * Record generated Rosie turn into context memory for duplicate prevention and strategy rotation
   */
  recordRosieTurn(sessionId = 'default', replyText, strategy = 'NORMAL') {
    const ctx = this.getContext(sessionId);
    ctx.recentRosieReplies.unshift(replyText);
    if (ctx.recentRosieReplies.length > 10) {
      ctx.recentRosieReplies.pop();
    }
    ctx.recentRosieStrategies.unshift(strategy);
    if (ctx.recentRosieStrategies.length > 10) {
      ctx.recentRosieStrategies.pop();
    }
    this.saveSessions();
  }

  addEvent(ctx, eventDesc) {
    const exists = ctx.recentEvents.some(e => e.event === eventDesc);
    if (!exists) {
      ctx.recentEvents.push({ event: eventDesc, timestamp: Date.now() });
      if (ctx.recentEvents.length > 8) {
        ctx.recentEvents.shift();
      }
      this.saveSessions();
    }
  }

  clearContext(sessionId = 'default') {
    this.sessions.delete(sessionId);
    this.saveSessions();
  }
}
const conversationContextService = new ConversationContextService();

module.exports = conversationContextService;
module.exports.ConversationContextService = ConversationContextService;
module.exports.RosieContextManager = ConversationContextService;
module.exports.RosieConversationMemory = ConversationContextService;

