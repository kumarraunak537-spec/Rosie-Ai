// server/rosieBehaviorLearningEngine.js
// Rosie AI — Behavioral Learning Engine
// Detects conversational habits, user response signals, and accumulates behavioral preferences with confidence.

const userProfile = require('./rosieUserProfile');

class RosieBehaviorLearningEngine {
  /**
   * Observe a conversation turn and update learned user behavioral profile
   * @param {string} userMessage - User input
   * @param {Object} emotionAnalysis - Detected emotion
   * @param {Object} intentAnalysis - Detected intent
   * @param {Object} contextData - Conversational context
   * @param {string} userId - User identifier
   */
  observeTurn(userMessage, emotionAnalysis, intentAnalysis, contextData, userId = 'default') {
    if (!userMessage || typeof userMessage !== 'string') return;
    const text = userMessage.trim();
    const lower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    // 1. Message Length Preference Detection
    if (wordCount <= 4 && !/[?]/.test(text)) {
      // User habitually writes concise short messages
      userProfile.updatePreference(userId, 'prefersShortBubbles', true, 'short_message_frequency');
    } else if (wordCount > 35) {
      // User writes detailed, elaborate paragraphs
      userProfile.updatePreference(userId, 'prefersShortBubbles', false, 'long_message_frequency');
    }

    // 2. Playful Teasing Acceptance
    if (
      intentAnalysis?.intent === 'playful_banter' ||
      emotionAnalysis?.emotion === 'playful' ||
      /(?:haha|hehe|lol|rofl|😂|😜|😏|chup|pagal|mazaak|satana)/i.test(lower)
    ) {
      userProfile.updatePreference(userId, 'likesTeasing', true, 'playful_response_positive');
    } else if (/(?:don't tease|mazak mat karo|serious hu|gussa aa raha|mat satao)/i.test(lower)) {
      userProfile.updatePreference(userId, 'likesTeasing', false, 'user_explicitly_disliked_tease');
    }

    // 3. Romantic Appetite
    if (
      emotionAnalysis?.emotion === 'romantic' ||
      intentAnalysis?.intent === 'romantic_intimacy' ||
      /(?:pyaar|jaan|meri jaan|sweetheart|kiss|hug|baahon me|romantic|love you)/i.test(lower)
    ) {
      userProfile.updatePreference(userId, 'romanticAppetite', 'high', 'romantic_reciprocation');
    }

    // 4. Repetitive Questions & Formality Dislike
    if (/(?:formal mat bano|itni formal kyu|baar baar wahi|kitne sawaal puchti ho|interview le rahi ho kya)/i.test(lower)) {
      userProfile.updatePreference(userId, 'dislikesQuestions', true, 'user_complained_about_formality');
    }

    // 5. Frequent Topic Tracking
    if (intentAnalysis?.topic) {
      userProfile.trackTopic(userId, intentAnalysis.topic);
    }

    // 6. Explicit User Dislikes & Likes
    const dislikeMatch = text.match(/(?:i hate|mujhe nafrat hai|bilkul pasand nahi|i dislike)\s+([a-zA-Z0-9_\s]+)/i);
    if (dislikeMatch && dislikeMatch[1]) {
      userProfile.addAffinity(userId, 'dislike', dislikeMatch[1].trim().toLowerCase());
    }

    const likeMatch = text.match(/(?:i love|mujhe bohot pasand hai|bohot achha lagta hai|favourite is)\s+([a-zA-Z0-9_\s]+)/i);
    if (likeMatch && likeMatch[1]) {
      userProfile.addAffinity(userId, 'like', likeMatch[1].trim().toLowerCase());
    }
  }
}

module.exports = new RosieBehaviorLearningEngine();
module.exports.RosieBehaviorLearningEngine = RosieBehaviorLearningEngine;
