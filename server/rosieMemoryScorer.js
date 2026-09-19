// server/rosieMemoryScorer.js
// Rosie AI — Memory Importance Scorer
// Classifies incoming information into TEMPORARY, USEFUL_FOR_LATER, or IMPORTANT_USER_PREFERENCE.

class RosieMemoryImportanceScorer {
  /**
   * Score and classify a user statement
   * @param {string} text - Raw user input
   * @param {Object} contextData - Current conversation context
   * @returns {Object} classification and importance score
   */
  score(text, contextData = {}) {
    if (!text || typeof text !== 'string') {
      return { classification: 'TEMPORARY', score: 1, shouldPersist: false };
    }

    const clean = text.trim();
    const lower = clean.toLowerCase();

    // 1. Explicit Memory Request ("ye baat yaad rakhna", "remember this", "bhoolna mat")
    const isExplicitRequest = /(?:yaad rakhna|yaad rakho|remember this|don't forget|bhoolna mat|note kar lo)/i.test(lower);
    if (isExplicitRequest) {
      return {
        classification: 'IMPORTANT_USER_PREFERENCE',
        score: 10,
        shouldPersist: true,
        isExplicit: true,
        reason: 'User explicitly requested Rosie to remember this fact'
      };
    }

    // 2. Core Identity & User Preference Patterns
    const isCorePreference =
      /(?:favorite|favourite|pasandida|meri pasand|mujhe pasand|love|hate|nafrat|i am a|main ek|mera profession|mera naam|my name|mera birthday|my birthday|my favorite)/i.test(lower) &&
      !/(?:kya hai|pata hai|yaad hai)/i.test(lower); // Exclude recall questions

    if (isCorePreference) {
      return {
        classification: 'IMPORTANT_USER_PREFERENCE',
        score: 9,
        shouldPersist: true,
        isExplicit: false,
        reason: 'Core profile, permanent preference, identity or like/dislike'
      };
    }

    // 3. Useful for Later (Upcoming plans, projects, life events)
    const isUsefulForLater =
      /(?:kal mera|tomorrow is|kal interview|going to buy|khareedne wala|planning to|project pe kaam|exam hai|trip pe|family me|behen ki shaadi|friend ki)/i.test(lower) ||
      /(?:bike|car|job offer|interview|resignation|exam|switch kar raha)/i.test(lower);

    if (isUsefulForLater) {
      return {
        classification: 'USEFUL_FOR_LATER',
        score: 7,
        shouldPersist: true,
        isExplicit: false,
        reason: 'Ongoing life event, upcoming plan, or project worth following up'
      };
    }

    // 4. Temporary / Ephemeral Actions (Do NOT persist permanently)
    const isTemporary =
      /(?:abhi|right now|filhal|just now|drinking|eating|kha raha|pee raha|baitha hu|so raha|chala gaya|rasta me|traffic me|phone charge|bahar hu)/i.test(lower) ||
      clean.length < 15;

    return {
      classification: 'TEMPORARY',
      score: 3,
      shouldPersist: false,
      isExplicit: false,
      reason: isTemporary ? 'Transient real-time action' : 'Casual remark without persistent value'
    };
  }
}

module.exports = new RosieMemoryImportanceScorer();
module.exports.RosieMemoryImportanceScorer = RosieMemoryImportanceScorer;
