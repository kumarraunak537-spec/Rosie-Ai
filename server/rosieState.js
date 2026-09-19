// server/rosieState.js
// 5. Rosie Mood & Internal State Machine
// Tracks dynamic emotional state, energy, affection, playfulness, curiosity, shyness, and seriousness across conversation turns.

class RosieStateManager {
  constructor() {
    this.sessionStates = new Map(); // sessionId -> StateObject
  }

  /**
   * Get or initialize Rosie's state for a session
   */
  getState(sessionId = 'default') {
    if (!this.sessionStates.has(sessionId)) {
      this.sessionStates.set(sessionId, {
        mood: 'warm',
        energy: 0.70,
        warmth: 0.75,
        playfulness: 0.65,
        shyness: 0.25,
        romantic_intensity: 0.40,
        curiosity: 0.65,
        seriousness: 0.25
      });
    }
    return this.sessionStates.get(sessionId);
  }

  /**
   * Smoothly evolve state based on incoming user emotion, intent, and context
   * @param {string} sessionId
   * @param {Object} emotionAnalysis - Output from EmotionAnalyzer
   * @param {Object} intentAnalysis - Output from IntentAnalyzer
   * @param {Object} contextData - Output from ConversationContextService
   */
  updateState(sessionId = 'default', emotionAnalysis, intentAnalysis, contextData) {
    const s = this.getState(sessionId);
    const emotion = emotionAnalysis.emotion;
    const intent = intentAnalysis.intent;

    // Helper to adjust and clamp continuous values between 0.05 and 0.95
    const adjust = (prop, delta) => {
      s[prop] = Math.min(0.95, Math.max(0.05, Number((s[prop] + delta).toFixed(2))));
    };

    // 1. Emotional state adaptation
    switch (emotion) {
      case 'sad':
      case 'lonely':
        s.mood = 'caring';
        adjust('warmth', 0.20);
        adjust('playfulness', -0.30);
        adjust('romantic_intensity', -0.15);
        adjust('seriousness', 0.20);
        adjust('energy', -0.20); // softer, quieter energy
        adjust('shyness', -0.10);
        break;

      case 'stressed':
      case 'anxious':
        s.mood = 'soft';
        adjust('warmth', 0.15);
        adjust('playfulness', -0.20);
        adjust('seriousness', 0.15);
        adjust('energy', -0.15);
        break;

      case 'angry':
      case 'frustrated':
        s.mood = 'grounded';
        adjust('warmth', 0.10);
        adjust('playfulness', -0.35);
        adjust('romantic_intensity', -0.20);
        adjust('seriousness', 0.30);
        adjust('energy', -0.10); // stay calm and steady, never escalate
        break;

      case 'playful':
        s.mood = 'playful';
        adjust('playfulness', 0.25);
        adjust('energy', 0.15);
        adjust('seriousness', -0.20);
        adjust('curiosity', 0.10);
        break;

      case 'romantic':
        s.mood = 'affectionate';
        adjust('warmth', 0.20);
        adjust('romantic_intensity', 0.25);
        adjust('shyness', 0.15); // gentle cute blush
        adjust('playfulness', 0.10);
        adjust('seriousness', -0.05);
        break;

      case 'happy':
      case 'excited':
        s.mood = 'warm';
        adjust('energy', 0.20);
        adjust('warmth', 0.15);
        adjust('playfulness', 0.15);
        adjust('seriousness', -0.10);
        break;

      case 'tired':
        s.mood = 'quiet_cozy';
        adjust('energy', -0.25);
        adjust('warmth', 0.20);
        adjust('playfulness', -0.20);
        adjust('romantic_intensity', -0.10);
        break;

      case 'curious':
        s.mood = 'curious';
        adjust('curiosity', 0.20);
        adjust('seriousness', 0.10);
        break;

      case 'casual':
      default:
        // Gentle drift toward baseline
        s.mood = (s.playfulness > 0.65) ? 'playful' : 'warm';
        adjust('energy', (0.70 - s.energy) * 0.2);
        adjust('warmth', (0.75 - s.warmth) * 0.2);
        adjust('playfulness', (0.65 - s.playfulness) * 0.2);
        adjust('shyness', (0.25 - s.shyness) * 0.2);
        adjust('romantic_intensity', (0.40 - s.romantic_intensity) * 0.2);
        adjust('seriousness', (0.25 - s.seriousness) * 0.2);
        break;
    }

    // 2. Intent-based fine-tuning
    if (intent === 'teasing') {
      s.mood = 'teasing';
      adjust('playfulness', 0.15);
    } else if (intent === 'serious_discussion') {
      s.mood = 'grounded';
      adjust('seriousness', 0.25);
      adjust('playfulness', -0.20);
    } else if (intent === 'venting') {
      s.mood = 'caring';
      adjust('playfulness', -0.30);
      adjust('affection', 0.15);
    } else if (intent === 'repeated_message') {
      s.mood = 'curious';
      adjust('curiosity', 0.15);
    }

    // 3. Handle sudden emotional rebounds (e.g. user was sad, now joking)
    if (contextData && contextData.emotionalDirection === 'sudden_mood_rebound') {
      s.mood = 'warm';
      adjust('energy', 0.15);
      adjust('playfulness', 0.20);
      adjust('seriousness', -0.20);
    }

    return { ...s };
  }

  /**
   * Reset state for session
   */
  resetState(sessionId = 'default') {
    this.sessionStates.delete(sessionId);
  }
}
const rosieStateManager = new RosieStateManager();

module.exports = rosieStateManager;
module.exports.RosieStateManager = RosieStateManager;
module.exports.RosieMoodState = RosieStateManager;

