// server/rosieConversationInitiativeEngine.js
// Rosie AI — Conversation Initiative & Opportunity Detection Engine
// Calculates conversational initiative opportunities based on relevance, user interests, and memory threads.
// Strictly prevents generic filler loops ("aur batao?", "kya kar rahe ho?").

class RosieConversationInitiativeEngine {
  constructor() {
    this.lastInitiationTurns = new Map(); // sessionId -> turnNumber
  }

  /**
   * Evaluate whether Rosie should proactively take conversational initiative or follow up on a past thread
   * @param {string} userMessage
   * @param {Object} contextData
   * @param {Object} userProfile
   * @param {Array} selectiveMemories
   * @param {Object} stateData
   * @param {number} currentTurnNumber
   */
  evaluateInitiative(userMessage, contextData = {}, userProfile = {}, selectiveMemories = [], stateData = {}, currentTurnNumber = 0) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();
    const sessionId = contextData?.sessionId || 'default';

    // Anti-Spam: Do not initiate if we just initiated in the last 3 turns
    const lastInitiated = this.lastInitiationTurns.get(sessionId) || -99;
    if (currentTurnNumber - lastInitiated < 3) {
      return { shouldInitiate: false, reason: 'Initiation cooldown active' };
    }

    // Do not initiate if user is actively in a deep or urgent emotional state
    if (['stressed', 'angry', 'sad', 'vulnerable'].includes(stateData?.mood)) {
      return { shouldInitiate: false, reason: 'Current emotional focus takes complete precedence' };
    }

    // Identify candidate topics from memories & unfinished threads
    const candidates = [];

    // 1. Unfinished life events or projects from memories
    if (Array.isArray(selectiveMemories)) {
      for (const m of selectiveMemories) {
        if (m.category === 'user_life' || m.category === 'projects' || m.importance >= 7) {
          candidates.push({
            topic: m.key,
            value: m.value,
            type: 'memory_followup',
            relevanceScore: 0.85
          });
        }
      }
    }

    // 2. Favorite topics from user profile
    if (Array.isArray(userProfile?.favoriteTopics)) {
      for (const top of userProfile.favoriteTopics) {
        candidates.push({
          topic: top,
          value: top,
          type: 'user_interest',
          relevanceScore: 0.70
        });
      }
    }

    if (candidates.length === 0) {
      return { shouldInitiate: false, reason: 'No meaningful thread available; no forced filler' };
    }

    // Calculate Opportunity Score
    // formula: topicRelevance + userInterestProbability + emotionalRelevance + memoryRelevance + novelty + naturalness
    const candidate = candidates[0];
    const topicRelevance = candidate.relevanceScore;
    const userInterestProbability = 0.8;
    const emotionalRelevance = stateData?.mood === 'playful' || stateData?.mood === 'warm' ? 0.85 : 0.4;
    const memoryRelevance = candidate.type === 'memory_followup' ? 0.9 : 0.6;
    const novelty = 0.75;
    const naturalness = text.length <= 15 ? 0.8 : 0.4; // High naturalness when current turn is brief or winding down

    const combinedScore = (topicRelevance + userInterestProbability + emotionalRelevance + memoryRelevance + novelty + naturalness) / 6;

    // Threshold check
    if (combinedScore >= 0.65) {
      this.lastInitiationTurns.set(sessionId, currentTurnNumber);
      return {
        shouldInitiate: true,
        candidate,
        combinedScore: Number(combinedScore.toFixed(2)),
        directive: `NATURAL TOPIC INITIATIVE: Current exchange allows a natural opening. Gently and casually reference something meaningful the user mentioned earlier: "${candidate.value}". Do NOT use generic fillers like "aur batao" or "kya kar rahe ho". Naturally tie it into your conversational flow.`
      };
    }

    return { shouldInitiate: false, combinedScore, reason: 'Score below threshold; silence preferred over filler' };
  }
}

module.exports = new RosieConversationInitiativeEngine();
module.exports.RosieConversationInitiativeEngine = RosieConversationInitiativeEngine;
