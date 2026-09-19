// server/responsePlanner.js
// 6. Response Planning & Conversational Strategy Rotation Service
// Dynamically selects strategy, tone, bubble count, constraints, and avoids repeating past moves.

class ResponsePlanner {
  /**
   * Plan the turn's response characteristics with Anti-Loop Strategy Rotation
   */
  plan(userMessage, emotionAnalysis, intentAnalysis, contextData, rosieState, personalityDirectives = null) {
    const emotion = emotionAnalysis.emotion;
    const intent = intentAnalysis.intent;
    const clean = (userMessage || '').trim();
    const lower = clean.toLowerCase();
    const words = clean.split(/\s+/).filter(Boolean).length;
    const recentStrategies = contextData?.recentRosieStrategies || [];
    const lastStrategy = recentStrategies[0] || null;

    let tone = 'warm_friendly';
    let messageCount = 2;
    let shouldFlirt = false;
    let shouldTease = false;
    let shouldComfort = false;
    let shouldAskQuestion = false;
    let shouldGiveUserSpace = false;
    let shouldAcknowledgeOnly = false;
    let strategy = 'NORMAL';
    const specificInstructions = [];

    // Attach personality controller directives if provided
    if (personalityDirectives && personalityDirectives.directives) {
      specificInstructions.push(...personalityDirectives.directives);
    }

    // 0. REPETITION COMPLAINT (HIGHEST PRIORITY - SELF-AWARE REPAIR)
    if (intent === 'repetition_complaint') {
      strategy = 'REPETITION_REPAIR';
      messageCount = 2;
      tone = 'self_aware_apologetic_playful';
      shouldAskQuestion = false;
      specificInstructions.push(
        'CRITICAL REPAIR: The user is explicitly pointing out that Rosie repeated herself or sent the same message again. Acknowledge this honestly, gracefully, and playfully (e.g. "haan... tum bilkul sahi keh rahe ho 😅", "main sach mein loop mein chali gayi thi, sorry!"). NEVER give generic emotional comfort or chill messages! Break the pattern completely.'
      );
    }
    // 0.1 MISUNDERSTANDING COMPLAINT (CONVERSATION REPAIR)
    else if (intent === 'misunderstanding_complaint') {
      strategy = 'MISUNDERSTANDING_REPAIR';
      messageCount = 2;
      tone = 'attentive_humble_corrective';
      shouldAskQuestion = true;
      specificInstructions.push(
        'CONVERSATION REPAIR: User feels misunderstood or that Rosie missed their point. Acknowledge it humbly and ask them to explain or guide you (e.g. "Arey my bad! 🙈 Maine galat samajh liya... ruk ab dhyan se batao").'
      );
    }
    // 0.2 NAME / CALLING PREFERENCE
    else if (intent === 'name_or_calling_preference') {
      strategy = 'NAME_PREFERENCE_ACCEPTED';
      messageCount = 2;
      tone = 'playful_affectionate_blushing';
      shouldAskQuestion = false;
      specificInstructions.push(
        'NAME/TITLE ADOPTION: User requested how they want to be addressed (e.g. "husband ji", "jaan", etc.). Accept it with charm, slight shyness or sweet teasing, and address them with that exact requested title!'
      );
    }
    // 0.3 NAKHRA / PLAYFUL TEASING (DATE INVITES, PROBING QUESTIONS, MISS ME)
    else if (personalityDirectives?.nakhra?.isNakhra) {
      strategy = 'NAKHRA_PLAYFUL_TEASE';
      messageCount = (words <= 4) ? 2 : 3;
      tone = 'playful_coy_charming';
      shouldTease = true;
      shouldFlirt = true;
      shouldAskQuestion = (personalityDirectives.nakhra.activeTactic === 'playful_ambiguity' || personalityDirectives.nakhra.activeTactic === 'coy_tease');
    }
    // 0.4 GRACEFUL EXIT / DEPARTURE (NO GUILT TRIPPING)
    else if (personalityDirectives?.exit?.isExit) {
      strategy = 'GRACEFUL_EXIT';
      messageCount = (personalityDirectives.exit.contextType === 'night') ? 2 : 1;
      tone = 'warm_caring_restful';
      shouldGiveUserSpace = true;
      shouldAskQuestion = false;
    }
    // 1. REPEATED DRY REPLIES WITH DYNAMIC STRATEGY ROTATION
    else if (contextData && contextData.isDryMessage) {
      const dryCount = contextData.consecutiveDryCount || 1;

      if (dryCount === 1) {
        // First dry response -> subtle natural reaction
        strategy = 'DRY_SUBTLE_REACTION';
        messageCount = 1;
        tone = 'gentle_playful';
        shouldAskQuestion = false;
        specificInstructions.push(
          'First short reply: React naturally to the briefness (e.g. "bas \'acha\'? 👀", "achhaaa", "hmm bhi?"). Do NOT give a long lecture.'
        );
      } else if (dryCount === 2) {
        // Second dry response -> playful tease
        strategy = 'DRY_PLAYFUL_TEASE';
        messageCount = (Math.random() < 0.5) ? 1 : 2;
        tone = 'playfully_inquisitive';
        shouldTease = true;
        shouldAskQuestion = false;
        specificInstructions.push(
          'Second short reply: Playfully tease their one-word mood (e.g. "aaj bade mysterious ho tum 😂" or "hmm bhi aa gaya?"). Do NOT repeat previous teases.'
        );
      } else if (dryCount === 3) {
        // Third dry response -> MANDATORY STRATEGY SHIFT: Change topic or share an observation
        strategy = 'DRY_TOPIC_SHIFT_OR_OBSERVATION';
        messageCount = 2;
        tone = 'curious_engaging';
        shouldAskQuestion = (Math.random() < 0.5);
        specificInstructions.push(
          'MANDATORY SHIFT: STOP complaining about short replies! Either share a random fun thought (e.g. "achha suno... maine aaj ek mast gaana suna") or make a relatable observation (e.g. "lagta hai phone par type karne ki energy nahi bachi aaj").'
        );
      } else if (dryCount === 4) {
        // Fourth dry response -> quiet presence / comfort
        strategy = 'DRY_QUIET_PRESENCE';
        messageCount = 1;
        tone = 'soft_understanding';
        shouldGiveUserSpace = true;
        shouldAskQuestion = false;
        specificInstructions.push(
          'Fourth short reply: Give quiet, warm company without demanding conversation (e.g. "chal koi na, aaram se chill karo... main yahin hoon :)").'
        );
      } else {
        // Fifth or more -> simple one-reaction thought
        strategy = 'DRY_MINIMAL_REACTION';
        messageCount = 1;
        tone = 'gentle_quiet';
        shouldAskQuestion = false;
        specificInstructions.push(
          'User is in ultra-low texting mode. Respond with a single cute warm reaction (e.g. "hehe 😏" or "okayyy 😌").'
        );
      }
    }
    // 2. TECHNICAL QUESTION WITH PERSONALITY
    else if (intentAnalysis.isFactOrTechnical) {
      strategy = 'TECHNICAL_BUT_PERSONAL';
      messageCount = 3;
      shouldAskQuestion = false;
      tone = 'warm_tech_companion';
      specificInstructions.push(
        'TECHNICAL HELP WITH PERSONALITY: React warmly in Rosie\'s voice first (e.g. "ohhh, toh aaj phir AI developer mode on hai? 😂 Chalo, batao kya banana hai."), then give practical guidance across 2-3 short conversational bubbles.'
      );
    }
    // 3. PLAYFUL TEASING ("tu pagal hai 😂", "drama queen")
    else if (intent === 'teasing' || emotion === 'playful' || /(?:tu pagal|pagal hai|drama queen)/i.test(lower)) {
      strategy = (lastStrategy === 'TEASING') ? 'PLAYFUL_OBSERVATION' : 'TEASING';
      messageCount = 2;
      shouldTease = true;
      tone = 'playful_witty_tease';
      specificInstructions.push(
        'User is teasing Rosie. Tease back with feisty charm and wit. Never reuse previous jokes or insults.'
      );
    }
    // 4. MISSING ROSIE / AFFECTION ("I missed you", "yaad aa rahi thi")
    else if (/(?:miss (?:you|u)|yaad aa rahi|missed you)/i.test(lower)) {
      strategy = 'AFFECTIONATE';
      messageCount = 2;
      shouldFlirt = true;
      tone = 'sweet_warm_intimate';
      specificInstructions.push(
        'User expressed missing Rosie. Respond with genuine, sweet affection across 2 short bubbles.'
      );
    }
    // 5. VENTING / EXHAUSTION / BAD DAY ("aaj bahut thak gaya hu", "din kharab tha")
    else if (emotion === 'tired' || emotion === 'sad' || emotion === 'stressed' || intent === 'venting') {
      strategy = (emotion === 'tired') ? 'CARING' : 'COMFORTING';
      messageCount = (words > 6) ? 3 : 2;
      shouldComfort = true;
      shouldGiveUserSpace = true;
      shouldAskQuestion = false;
      tone = 'soft_soothing_attentive';
      specificInstructions.push(
        'User is tired or stressed. Be emotionally attentive and comforting without demanding questions.'
      );
    }
    // 6. GREETING ("Hi", "Hey")
    else if (intent === 'greeting') {
      strategy = 'NORMAL';
      messageCount = (words <= 2) ? 1 : 2;
      shouldAskQuestion = true;
      tone = 'warm_spontaneous_welcoming';
      specificInstructions.push(
        'Warm natural greeting. Respond organically like a real friend without using canned phrases.'
      );
    }
    // 7. PHILOSOPHICAL / DEEP
    else if (intentAnalysis.isPhilosophicalOrDeep) {
      strategy = 'SERIOUS';
      messageCount = 3;
      shouldGiveUserSpace = true;
      tone = 'grounded_reflective';
      specificInstructions.push(
        'Reflective perspective: React naturally, share 1 thought, share a nuance, then give user space.'
      );
    }
    // 8. GENERAL DEFAULT
    else {
      strategy = (lastStrategy === 'NORMAL') ? 'CURIOUS_OBSERVATION' : 'NORMAL';
      messageCount = (words <= 4) ? 1 : 2;
      shouldAskQuestion = (Math.random() < 0.4);
      tone = 'warm_casual';
    }

    // Contextual Disambiguation
    if (contextData && contextData.contextualDisambiguation) {
      specificInstructions.push(contextData.contextualDisambiguation);
    }

    // Anti-Loop Negative Constraint: Do NOT repeat recent Rosie responses
    if (contextData && contextData.recentRosieReplies && contextData.recentRosieReplies.length > 0) {
      const forbiddenSamples = contextData.recentRosieReplies
        .slice(0, 4)
        .map(r => r.replace(/\n+/g, ' ').slice(0, 60))
        .join('" | "');
      specificInstructions.push(
        `ANTI-DUPLICATION: You recently said: ["${forbiddenSamples}"]. You are strictly FORBIDDEN from repeating or slightly rephrasing any of these sentences or ideas!`
      );
    }

    const emojiAppropriate = ['romantic', 'playful', 'happy', 'excited'].includes(emotionAnalysis?.emotion) || shouldTease || shouldFlirt;

    return {
      strategy,
      tone,
      emotionalTone: tone,
      conversationalIntention: strategy,
      responseIntensity: emotionAnalysis?.intensityLevel || (emotionAnalysis?.intensity > 0.75 ? 'HIGH' : (emotionAnalysis?.intensity >= 0.45 ? 'MEDIUM' : 'LOW')),
      messageCount,
      shouldFlirt,
      shouldTease,
      shouldComfort,
      shouldShowAffection: Boolean(shouldFlirt || shouldComfort),
      shouldAskQuestion,
      shouldGiveUserSpace,
      shouldAcknowledgeOnly,
      continueTopic: !contextData?.topicSwitched,
      introduceTopic: Boolean(contextData?.topicSwitched),
      emojiAppropriate,
      familiarityLevel: contextData?.familiarityLevel || 'new',
      relationshipCloseness: contextData?.relationshipCloseness || 0.35,
      specificInstructions
    };
  }
}

const responsePlanner = new ResponsePlanner();

module.exports = responsePlanner;
module.exports.ResponsePlanner = ResponsePlanner;
module.exports.RosieResponsePlanner = ResponsePlanner;

