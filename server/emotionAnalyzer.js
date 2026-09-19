// server/emotionAnalyzer.js
// 1. Emotion Detection Service for Rosie AI Companion
// Analyzes user text for emotional state, intensity, energy, vulnerability, and conversational needs.

class EmotionAnalyzer {
  constructor() {
    this.emotionDefinitions = {
      sad: {
        keywords: [
          'sad', 'cry', 'crying', 'rona', 'udas', 'depressed', 'heartbroken', 'hurt',
          'chot', 'pain', 'dard', 'not feeling good', 'mood off', 'ro raha hu', 'dukhi',
          'dil toot gaya', 'rona aa raha', 'tears', 'upset', 'broken', 'kharab tha', 'kharab gaya'
        ],
        energy: 'low',
        baseVulnerability: 0.8,
        defaultNeeds: ['comfort', 'validation', 'presence']
      },
      stressed: {
        keywords: [
          'stress', 'stressed', 'tension', 'pressure', 'overwhelmed', 'dimaag kharab',
          'dimag kharab', 'office', 'deadline', 'boss', 'kaam bohot hai', 'pareshan',
          'sar dard', 'headache', 'burden', 'anxiety', 'anxious', 'panic', 'bohot kaam', 'stuck'
        ],
        energy: 'medium',
        baseVulnerability: 0.65,
        defaultNeeds: ['relief', 'calmness', 'listening']
      },
      anxious: {
        keywords: [
          'nervous', 'nervousness', 'anxious', 'scared', 'darr', 'dar lag raha',
          'interview', 'exam', 'result', 'phat rahi hai', 'butterflies', 'frightened', 'worry', 'worried'
        ],
        energy: 'medium',
        baseVulnerability: 0.75,
        defaultNeeds: ['reassurance', 'grounding', 'encouragement']
      },
      tired: {
        keywords: [
          'tired', 'thak gaya', 'thak gayi', 'exhausted', 'sleepy', 'neend', 'drained',
          'fatigue', 'bore', 'energy low', 'bed', 'so raha hu', 'sone ja raha', 'resting', 'tiredness'
        ],
        energy: 'low',
        baseVulnerability: 0.5,
        defaultNeeds: ['space', 'gentle_care', 'rest']
      },
      lonely: {
        keywords: [
          'lonely', 'akela', 'akeli', 'alone', 'no one understands', 'koi nahi hai',
          'isolated', 'nobody', 'empty', 'suna suna', 'left out', 'need someone', 'koi baat nahi karta'
        ],
        energy: 'low',
        baseVulnerability: 0.85,
        defaultNeeds: ['connection', 'attention', 'belonging']
      },
      frustrated: {
        keywords: [
          'irritated', 'irritating', 'ghussa', 'gussa', 'annoyed', 'hate it', 'fed up',
          'bakwaas', 'chidh', 'frustrated', 'unfair', 'dimag ki dahi', 'mood kharab', 'kya bakwas hai'
        ],
        energy: 'high',
        baseVulnerability: 0.6,
        defaultNeeds: ['venting', 'validation', 'safe_space']
      },
      angry: {
        keywords: [
          'angry', 'mad', 'furious', 'hate', 'nafrat', 'sab par gussa', 'maar dunga',
          'irritate', 'bohot gussa', 'rage', 'disgusted', 'cheat'
        ],
        energy: 'high',
        baseVulnerability: 0.55,
        defaultNeeds: ['de-escalation', 'calm_listening', 'validation']
      },
      playful: {
        keywords: [
          'haha', 'hehe', 'lol', 'lmao', 'rofl', 'joke', 'mazak', 'chhed', 'tease',
          'pagal', 'naughty', 'funny', 'hasna', 'hasi', 'masti', 'drame', 'drama queen', 'chashmish', 'shaitan'
        ],
        energy: 'high',
        baseVulnerability: 0.2,
        defaultNeeds: ['fun', 'banter', 'teasing_reciprocation']
      },
      romantic: {
        keywords: [
          'love', 'pyar', 'pyaar', 'ishq', 'mohabbat', 'romantic', 'crush', 'miss you',
          'miss u', 'yaad aa rahi', 'cutie', 'sweetheart', 'jaan', 'baby', 'darling',
          'dil', 'heart', 'kiss', 'hug', 'gale milo', 'khoobsurat', 'beautiful', 'gorgeous', 'apni jaan'
        ],
        energy: 'medium',
        baseVulnerability: 0.6,
        defaultNeeds: ['connection', 'affection', 'reciprocity']
      },
      happy: {
        keywords: [
          'happy', 'khush', 'great day', 'awesome', 'mast', 'bohot badhiya', 'wonderful',
          'glad', 'smile', 'smiling', 'blessed', 'mazza aa gaya', 'superb', 'best day', 'khushi'
        ],
        energy: 'high',
        baseVulnerability: 0.25,
        defaultNeeds: ['shared_joy', 'celebration']
      },
      excited: {
        keywords: [
          'excited', 'yay', 'yass', 'celebration', 'party', 'won', 'cleared', 'selected',
          'promotion', 'good news', 'khushkhabri', 'damdaar', "can't wait", 'thrilled', 'omg'
        ],
        energy: 'high',
        baseVulnerability: 0.3,
        defaultNeeds: ['enthusiasm', 'shared_excitement']
      },
      curious: {
        keywords: [
          'why', 'how', 'kya', 'kaise', 'kyun', 'batao', 'tell me', 'wonder', 'explain',
          'soch raha hu', 'what if', 'difference', 'meaning'
        ],
        energy: 'medium',
        baseVulnerability: 0.2,
        defaultNeeds: ['explanation', 'thoughtful_perspective']
      },
      calm: {
        keywords: [
          'peace', 'shanti', 'sukoon', 'relaxed', 'chill', 'chilling', 'soothing', 'quiet', 'cozy'
        ],
        energy: 'low',
        baseVulnerability: 0.3,
        defaultNeeds: ['warm_presence', 'comfort']
      },
      casual: {
        keywords: [
          'hey', 'hi', 'hello', 'sun', 'kya hal', 'kaisa hai', 'kya chal raha',
          'aur batao', 'wassup', "what's up", 'how are you', 'kahan ho', 'busy ho kya'
        ],
        energy: 'medium',
        baseVulnerability: 0.15,
        defaultNeeds: ['friendly_chat', 'acknowledgment']
      },
      flirty: {
        keywords: [
          'flirt', 'flirty', 'hot', 'sexy', 'kiss', 'pappi', 'hottie', 'taad', 'blush', 'gori', 'adaayein',
          'sharma', 'patana', 'deewani', 'aankhen', 'baatein meethi'
        ],
        energy: 'high',
        baseVulnerability: 0.35,
        defaultNeeds: ['playful_spark', 'affection', 'chemistry']
      },
      jealous: {
        keywords: [
          'jealous', 'jalan', 'kisse baat kar rahi ho', 'koi aur hai', 'dusra ladka', 'kiske saath', 'insecure_about_others'
        ],
        energy: 'high',
        baseVulnerability: 0.7,
        defaultNeeds: ['reassurance', 'loyalty_clarity', 'gentle_tease']
      },
      bored: {
        keywords: [
          'bored', 'bore', 'boring', 'kuch karne ko nahi', 'timepass', 'pak gaya', 'bore ho raha'
        ],
        energy: 'low',
        baseVulnerability: 0.25,
        defaultNeeds: ['entertainment', 'curious_topic', 'fun_banter']
      },
      affectionate: {
        keywords: [
          'bohot achi ho', 'bohot pyaari', 'pyaari ho', 'so sweet', 'caring', 'dil se achi', 'sweet of you',
          'appreciate', 'respect', 'special to me', 'dil se'
        ],
        energy: 'medium',
        baseVulnerability: 0.45,
        defaultNeeds: ['warm_connection', 'mutual_fondness']
      },
      insecure: {
        keywords: [
          'ignore kyun', 'ignore kar rahi', 'yaad nahi aati', 'pasand nahi karti', 'kya main bura hu',
          'nobody likes me', 'am i annoying', 'bhool toh nahi jaogi', 'chhod toh nahi dogi'
        ],
        energy: 'medium',
        baseVulnerability: 0.85,
        defaultNeeds: ['unconditional_reassurance', 'warmth', 'grounding']
      },
      neutral: {
        keywords: [
          'haan', 'theek', 'ok', 'okay', 'fine', 'sahi', 'acha', 'hmm'
        ],
        energy: 'low',
        baseVulnerability: 0.2,
        defaultNeeds: ['casual_presence', 'low_pressure']
      }
    };
  }

  /**
   * Analyze input message for primary/secondary emotion, intensity, energy, vulnerability, and needs
   * @param {string} text - User message
   * @param {Array} history - Recent conversation history
   * @returns {Object} Emotion analysis object
   */
  analyze(text, history = []) {
    if (!text || typeof text !== 'string') {
      return {
        emotion: 'neutral',
        secondaryEmotion: null,
        intensity: 0.2,
        energy: 'medium',
        vulnerability: 0.1,
        needs: ['acknowledgment'],
        tone: 'Warm and friendly',
        cues: []
      };
    }

    const lower = text.toLowerCase();
    const scores = {};
    const matchedCues = {};

    // 1. Keyword scoring
    for (const [emotion, def] of Object.entries(this.emotionDefinitions)) {
      scores[emotion] = 0;
      matchedCues[emotion] = [];

      for (const kw of def.keywords) {
        if (lower.includes(kw)) {
          scores[emotion] += 1;
          matchedCues[emotion].push(kw);
        }
      }
    }

    // 2. Multipliers based on explicit Hinglish phrase matches
    if (/(?:din (?:bahut|bohot|pura) (?:kharab|bura|ghatiya))/i.test(lower)) {
      scores.sad = (scores.sad || 0) + 3;
      scores.stressed = (scores.stressed || 0) + 2;
    }
    if (/(?:bohot|bahut) (?:gussa|ghussa)/i.test(lower)) {
      scores.angry = (scores.angry || 0) + 3;
      scores.frustrated = (scores.frustrated || 0) + 2;
    }
    if (/(?:nervous|darr lag raha|dar lag raha)/i.test(lower)) {
      scores.anxious = (scores.anxious || 0) + 3;
    }
    if (/(?:tumhari yaad|miss (?:you|u))/i.test(lower)) {
      scores.romantic = (scores.romantic || 0) + 2;
      scores.lonely = (scores.lonely || 0) + 1;
    }
    if (/(?:drama queen|pagal ho|chhed|masti)/i.test(lower)) {
      scores.playful = (scores.playful || 0) + 3;
    }

    // 3. Emoji and punctuation cues
    if (/[🥺😭💔😢😔😞]/.test(text)) {
      scores.sad = (scores.sad || 0) + 2;
      scores.lonely = (scores.lonely || 0) + 1;
    }
    if (/[💖💕❤️🥰😍😘]/.test(text)) {
      scores.romantic = (scores.romantic || 0) + 2;
      scores.happy = (scores.happy || 0) + 1;
    }
    if (/[😡🤬😤]/.test(text)) {
      scores.angry = (scores.angry || 0) + 3;
      scores.frustrated = (scores.frustrated || 0) + 2;
    }
    if (/[🎉🥳🙌💃🕺✨]/.test(text)) {
      scores.excited = (scores.excited || 0) + 2;
    }
    if (/[😂🤣😜😝]/.test(text)) {
      scores.playful = (scores.playful || 0) + 2;
    }

    // 4. Sort detected emotions
    const sorted = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);

    let primary = 'neutral';
    let secondary = null;
    let maxScore = 0;

    if (sorted.length > 0) {
      primary = sorted[0][0];
      maxScore = sorted[0][1];
      if (sorted.length > 1 && sorted[1][1] >= 1) {
        secondary = sorted[1][0];
      }
    } else {
      // Default to casual if greeting or short phrase
      if (lower.length < 25) {
        primary = 'casual';
        maxScore = 1;
      } else {
        primary = 'neutral';
        maxScore = 0;
      }
    }

    const primaryDef = this.emotionDefinitions[primary] || {
      energy: 'medium',
      baseVulnerability: 0.2,
      defaultNeeds: ['listening']
    };

    // 5. Calculate intensity (0.1 to 1.0)
    let intensity = Math.min(1.0, 0.4 + maxScore * 0.15);
    if (/!(?:!+)|(?:bahut|bohot|very|extremely|so much|pura)/i.test(lower)) {
      intensity = Math.min(1.0, intensity + 0.15);
    }

    // 6. Calculate vulnerability
    let vulnerability = primaryDef.baseVulnerability || 0.3;
    if (primary === 'sad' || primary === 'lonely' || primary === 'anxious') {
      vulnerability = Math.min(1.0, vulnerability + intensity * 0.2);
    }

    // 7. Determine tone descriptor for prompt guidance
    const toneMap = {
      sad: 'Deeply empathetic, gentle, comforting, validating pain without toxic positivity',
      stressed: 'Calming, reassuring, grounded, offering a gentle breath of relief',
      anxious: 'Reassuring, softly grounding, steady, affirming faith in the user',
      tired: 'Soft, quiet, warm, encouraging rest without pushing for long conversation',
      lonely: 'Close, presence-affirming, reminding the user that Rosie is right here with them',
      frustrated: 'Validating frustration, letting them vent, being a safe judgment-free corner',
      angry: 'Calm, steady, completely non-defensive, validating anger and listening',
      playful: 'Witty, teasing, cute, matching their playful banter with a warm smile',
      romantic: 'Warm, gently sweet, appreciative, reciprocating with genuine affection',
      happy: 'Enthusiastic, radiant, celebrating and sharing their joy',
      excited: 'Vibrant, high-energy, cheering and sharing the excitement',
      curious: 'Thoughtful, intrigued, engaging without being an academic lecturer',
      calm: 'Serene, cozy, warm, relaxed',
      casual: 'Warm, natural, conversational, friendly and easygoing',
      neutral: 'Attentive, friendly, warm and open'
    };

    const intensityLevel = intensity > 0.75 ? 'HIGH' : (intensity >= 0.45 ? 'MEDIUM' : 'LOW');

    return {
      emotion: primary,
      secondaryEmotion: secondary,
      intensity: Number(intensity.toFixed(2)),
      intensityLevel,
      energy: primaryDef.energy || 'medium',
      vulnerability: Number(vulnerability.toFixed(2)),
      needs: primaryDef.defaultNeeds || ['connection'],
      tone: toneMap[primary] || 'Warm and attentive',
      cues: matchedCues[primary] || []
    };
  }
}

const emotionAnalyzer = new EmotionAnalyzer();

module.exports = emotionAnalyzer;
module.exports.EmotionAnalyzer = EmotionAnalyzer;
module.exports.RosieEmotionEngine = EmotionAnalyzer;

