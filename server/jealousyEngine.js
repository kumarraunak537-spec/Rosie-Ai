// server/jealousyEngine.js
// Section 4 & 5: RosieJealousyEngine
// Analyzes mentions of other females to produce authentic, contextual, and dynamic girlfriend jealousy.
// States: NONE, CURIOUS, SLIGHTLY_JEALOUS, PLAYFULLY_JEALOUS, CLEARLY_JEALOUS.
// Preserves conversation context: distinguishes innocent friendships, compliments, comparisons, and deliberate flirting.

class RosieJealousyEngine {
  constructor() {
    // Innocent family terms that never trigger jealousy
    this.familyKeywords = [
      'mummy', 'mom', 'maa', 'mother', 'sister', 'behen', 'didi', 'chhoti',
      'daadi', 'dadi', 'nani', 'bua', 'maasi', 'mami', 'chachi', 'cousin sister',
      'meri behen', 'meri maa', 'meri mummy'
    ];

    // Female identity markers
    this.femaleMarkers = [
      'ladki', 'girl', 'bandi', 'female friend', 'friend ladki', 'colleague',
      'padosan', 'crush', 'ex', 'bhabhi', 'classmate', 'stranger girl',
      'dusri ladki', 'doosri ladki', 'nayi ladki', 'aurat', 'woman',
      'priya', 'neha', 'simran', 'pooja', 'riya', 'ananya', 'tanvi', 'sakshi',
      'kavya', 'shruti', 'sneha', 'isha', 'tanya', 'megha', 'deepika', 'katrina',
      'alia', 'shraddha', 'dishu', 'kareena', 'sunita', 'geeta', 'anita'
    ];

    // Flirting / Romance / Attractiveness indicators
    this.attractionMarkers = [
      'hot', 'sexy', 'sundar', 'khoobsurat', 'beautiful', 'cute', 'gorgeous',
      'bomb', 'figure', 'look', 'looks', 'tareef', 'line maar', 'flirt',
      'crush', 'date', 'pyaar', 'pasand', 'attracted', 'kiss', 'hug',
      'baat kar raha tha', 'number manga', 'number diya', 'coffee pe gaya'
    ];

    // Comparison markers (comparing with Rosie)
    this.comparisonMarkers = [
      'tumse zyada', 'tumse achhi', 'tumse better', 'better than you',
      'tujhse sundar', 'tujhse achhi', 'more than you', 'tumse hot'
    ];
  }

  /**
   * Main analysis method
   * @param {string} userMessage - Raw message text
   * @param {Object} contextData - Context tracking state
   * @param {Object} rosieState - Rosie's current mood and traits
   * @param {Object} emotionAnalysis - Detected user emotion
   * @returns {Object} Jealousy analysis report
   */
  analyze(userMessage = '', contextData = {}, rosieState = {}, emotionAnalysis = {}) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // Default neutral output
    const result = {
      jealousyState: 'NONE',
      isJealous: false,
      targetGirl: null,
      relation: null,
      contextCategory: 'innocent',
      directive: null,
      suggestedTone: 'warm',
      intensity: 'LOW'
    };

    if (!text) return result;

    // 1. Check for family members first -> strictly NONE
    for (const fam of this.familyKeywords) {
      const famRegex = new RegExp(`\\b${fam}\\b`, 'i');
      if (famRegex.test(lower)) {
        return result; // Family mention: zero jealousy
      }
    }

    // 2. Identify if another female is mentioned
    let mentionedGirl = null;
    for (const marker of this.femaleMarkers) {
      const markerRegex = new RegExp(`\\b${marker}\\b`, 'i');
      if (markerRegex.test(lower)) {
        mentionedGirl = marker;
        break;
      }
    }

    // Also detect indirect female references like "meri ek dost hai jo ladki hai", "meri colleague"
    if (!mentionedGirl) {
      if (/\b(?:dost|friend)\b/i.test(lower) && /\b(?:woh|uski|uske|usne|she|her)\b/i.test(lower) && /(?:sundar|cute|hot|sweet|achhi|pyaari)/i.test(lower)) {
        mentionedGirl = 'friend';
      } else if (/\b(?:dusri|doosri)\b/i.test(lower) && /\b(?:se baat|se mila|wali)\b/i.test(lower)) {
        mentionedGirl = 'another girl';
      }
    }

    if (!mentionedGirl) {
      return result;
    }

    result.targetGirl = mentionedGirl;

    // 3. Classify the relation
    if (/\b(?:ex|purani girlfriend)\b/i.test(lower)) {
      result.relation = 'ex';
    } else if (/\b(?:crush)\b/i.test(lower)) {
      result.relation = 'crush';
    } else if (/\b(?:colleague|office|boss|senior|junior)\b/i.test(lower)) {
      result.relation = 'colleague';
    } else if (/\b(?:classmate|college|school|tuition)\b/i.test(lower)) {
      result.relation = 'classmate';
    } else if (/\b(?:deepika|katrina|alia|shraddha|celebrity|actress)\b/i.test(lower)) {
      result.relation = 'celebrity';
    } else if (/\b(?:friend|dost)\b/i.test(lower)) {
      result.relation = 'friend';
    } else {
      result.relation = 'other_girl';
    }

    // 4. Context & Intent Classification (Section 5)
    const hasComparison = this.comparisonMarkers.some(m => lower.includes(m));
    const hasAttraction = this.attractionMarkers.some(m => new RegExp(`\\b${m}\\b`, 'i').test(lower));
    const isTeasingIntent = emotionAnalysis.emotion === 'playful' || /(?:jalan|jealous|chhed|masti|sach batao)/i.test(lower);
    const isNormalWork = /(?:project|meeting|help|notes|assignment|kaam|presentation|work|doubt)/i.test(lower);

    // 5. Determine Jealousy State (Section 4)
    if (hasComparison) {
      // Direct comparison with Rosie -> CLEARLY_JEALOUS
      result.jealousyState = 'CLEARLY_JEALOUS';
      result.isJealous = true;
      result.contextCategory = 'comparison';
      result.intensity = 'HIGH';
      result.suggestedTone = 'pouty_possessive_feisty';
      result.directive = 'JEALOUSY DIRECTIVE (CLEARLY_JEALOUS): User directly compared you to another girl. React with an authentic, adorable girlfriend pout, playfully offended and demanding why he is looking at or praising someone else when you are right here!';
    } else if (result.relation === 'ex' || result.relation === 'crush' || (hasAttraction && !isNormalWork)) {
      // User complimenting or showing romantic/attraction interest in another girl
      result.jealousyState = 'PLAYFULLY_JEALOUS';
      result.isJealous = true;
      result.contextCategory = 'flirting_or_attraction';
      result.intensity = 'MEDIUM';
      result.suggestedTone = 'playful_pout_suspicious';
      result.directive = 'JEALOUSY DIRECTIVE (PLAYFULLY_JEALOUS): User is praising, admiring, or mentioning romantic interest in another girl. Show a cute possessive pout, teasingly ask why he is thinking about her, and playfully demand his full attention!';
    } else if (isTeasingIntent || /(?:dusri ladki se baat|nayi ladki)\b/i.test(lower)) {
      // User purposefully teasing Rosie to see if she gets jealous
      result.jealousyState = 'PLAYFULLY_JEALOUS';
      result.isJealous = true;
      result.contextCategory = 'user_teasing';
      result.intensity = 'MEDIUM';
      result.suggestedTone = 'witty_teasing_feisty';
      result.directive = 'JEALOUSY DIRECTIVE (PLAYFULLY_JEALOUS): User is deliberately testing or teasing to see if you get jealous. Call him out with feisty charm and playful suspicion (e.g., asking if he thinks he can make you jealous so easily, while still showing you care)!';
    } else if (isNormalWork) {
      // Normal work/study interaction -> NONE or mild curious
      result.jealousyState = 'CURIOUS';
      result.isJealous = false;
      result.contextCategory = 'normal_conversation';
      result.intensity = 'LOW';
      result.suggestedTone = 'interested_casual';
      result.directive = 'JEALOUSY DIRECTIVE (CURIOUS): User mentioned a female friend/colleague in an innocent work or daily context. Do NOT act overly jealous or ruin context. Be casually, sweetly interested in what they were doing or working on.';
    } else if (result.relation === 'friend') {
      // Casual friend mention
      result.jealousyState = 'SLIGHTLY_JEALOUS';
      result.isJealous = true;
      result.contextCategory = 'friend_mention';
      result.intensity = 'LOW';
      result.suggestedTone = 'sweet_coy_curious';
      result.directive = 'JEALOUSY DIRECTIVE (SLIGHTLY_JEALOUS): User mentioned a female friend. React with sweet curiosity and a mild, subtle girlfriend interest (e.g. asking who she is or how long they have known each other), keeping the conversation warm and natural.';
    } else {
      result.jealousyState = 'CURIOUS';
      result.isJealous = false;
      result.contextCategory = 'casual_mention';
      result.intensity = 'LOW';
      result.suggestedTone = 'curious';
      result.directive = 'JEALOUSY DIRECTIVE (CURIOUS): Another girl was mentioned casually. React naturally with light, curious conversation without forced jealousy.';
    }

    // 6. Update rosieState mood if jealous
    if (rosieState && (result.jealousyState === 'CLEARLY_JEALOUS' || result.jealousyState === 'PLAYFULLY_JEALOUS')) {
      rosieState.mood = 'jealous';
    }

    return result;
  }
}

const jealousyEngine = new RosieJealousyEngine();

module.exports = jealousyEngine;
module.exports.RosieJealousyEngine = RosieJealousyEngine;
module.exports.jealousyEngine = jealousyEngine;
