// server/intentAnalyzer.js
// 2. Intent Detection Service for Rosie AI Companion
// Analyzes user intent, conversational goals, and conversational dynamics.

class IntentAnalyzer {
  /**
   * Determine the primary intent of the user message
   * @param {string} text - User message
   * @param {Object} emotion - Output from EmotionAnalyzer
   * @param {Array} history - Short-term context history
   * @returns {Object} Intent analysis object
   */
  analyze(text, emotion = {}, history = []) {
    if (!text || typeof text !== 'string') {
      return {
        intent: 'casual_conversation',
        tone: 'casual',
        needs: ['connection'],
        isQuestion: false,
        isOneWord: false,
        isPhilosophicalOrDeep: false,
        isFactOrTechnical: false,
        isRepeated: false
      };
    }

    const clean = text.trim();
    const lower = clean.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // 1. One-word detection
    const isOneWord = wordCount === 1;

    // 2. Repetition check against last user message
    let isRepeated = false;
    if (history && history.length > 0) {
      const lastUserEntry = [...history].reverse().find(m => m.sender === 'user');
      if (lastUserEntry && lastUserEntry.text) {
        const lastClean = lastUserEntry.text.trim().toLowerCase();
        if (lastClean === lower || (lastClean.length > 4 && lower.includes(lastClean))) {
          isRepeated = true;
        }
      }
    }

    // 3. Question check
    const isQuestion = /[?]|^(?:kya|kaise|kyun|who|what|why|when|where|is it|can you|batao)\b/i.test(clean);

    // 4. Philosophical or Deep question check
    const isPhilosophicalOrDeep = /(?:meaning of life|purpose of life|happiness|sacrifice|future success|worth it|existential|loneliness in life|true happiness|career vs peace|destiny|fate|khushiyon ki keemat)/i.test(lower) ||
      (isQuestion && /(?:why do people|is it ever truly|kya sach mein|zindagi ka kya matlab)/i.test(lower));

    // 5. Fact or Technical question (require word boundaries to avoid matching "hai", "bhai", etc.)
    const isFactOrTechnical = /\b(?:difference between|architecture|monolithic|microservices|database|sql|nosql|algorithm|programming|react|node|capacitor|api|framework|coding|developer)\b/i.test(lower);

    // 6. Image / Selfie request
    const isImageRequest = /(?:selfie|photo|picture|tasveer|image|pic dikhao|photo bhejo|look like|chehra dikhao)/i.test(lower);

    // 7. Voice request
    const isVoiceRequest = /(?:call karo|voice note|aawaz sunao|bol kar batao|audio call|phone call)/i.test(lower);

    // 8. Repetition complaint (User complaining about Rosie repeating herself)
    const isRepetitionComplaint = /(?:same (?:message|masege|mesge|reply|baat|answer|response)|baar baar|bare baare|bar bar|repeat (?:kyu|kyun|kar|kr)|phir (?:se )?wahi|wahi baat|same again|same reply again)/i.test(lower) ||
      (/\b(?:same|repeat)\b/i.test(lower) && /\b(?:kyun|kyu|why|again|baar)\b/i.test(lower));

    // 9. Misunderstanding complaint (User saying Rosie didn't understand or didn't answer properly)
    const isMisunderstandingComplaint = /(?:samajh (?:nahi|nhi|nai)|(?:nahi|nhi|nai) (?:samajh|poocha|pucha|bola)|ye (?:nahi|nhi|nai)|matlab ye (?:nahi|nhi|nai)|jawab toh? do|sun bhi rah|sun (?:nahi|nhi|nai) rah|didn'?t ask that|you'?re not understanding|galat samajh)/i.test(lower);

    // 10. Name or Calling Preference (User telling Rosie how to address them)
    const isNameOrCallingPreference = /(?:bulaya k(?:ar)?o|bulao|bola karo|call me)\b/i.test(lower);

    // 11. Intent determination rules
    let intent = 'casual_conversation';
    let tone = 'warm';
    let needs = ['connection'];

    if (isRepetitionComplaint) {
      intent = 'repetition_complaint';
      tone = 'self_aware_apologetic_playful';
      needs = ['repair', 'acknowledgment', 'fresh_perspective'];
    } else if (isMisunderstandingComplaint) {
      intent = 'misunderstanding_complaint';
      tone = 'attentive_humble_corrective';
      needs = ['listening', 'correction', 'active_understanding'];
    } else if (isNameOrCallingPreference) {
      intent = 'name_or_calling_preference';
      tone = 'playful_affectionate_blushing';
      needs = ['intimacy', 'personalized_address', 'acceptance'];
    } else if (isImageRequest) {
      intent = 'asking_image';
      tone = 'playful_warm';
      needs = ['visual_connection'];
    } else if (isVoiceRequest) {
      intent = 'requesting_voice';
      tone = 'intimate_warm';
      needs = ['voice_presence'];
    } else if (isRepeated) {
      intent = 'repeated_message';
      tone = 'gently_curious';
      needs = ['clarity', 'attentive_listening'];
    } else if (/^(?:hi|hey|hello|heyy*|namaste|hlo|hii+|ola)\b/i.test(lower) && wordCount <= 3) {
      intent = 'greeting';
      tone = 'warm_welcoming';
      needs = ['acknowledgment', 'friendly_welcome'];
    } else if (isOneWord) {
      intent = 'acknowledgment_or_space';
      tone = 'gentle_attentive';
      needs = ['space', 'gentle_engagement'];
    } else if (/(?:kya kar rahi|what are you doing|kahan ho|busy ho)/i.test(lower) && wordCount <= 6) {
      intent = 'asking_about_rosie';
      tone = 'playful_casual';
      needs = ['connection', 'casual_chat'];
    } else if (/(?:date pe chal(?:ogi|enge|oge)|go on a date|dinner date|coffee date|mere saath date|date par chal)/i.test(lower)) {
      intent = 'romantic_invitation';
      tone = 'playful_teasing_nakhra';
      needs = ['playful_tension', 'charm', 'teasing_engagement'];
    } else if (/(?:pasand karti ho|like me\??|pyar karti ho|love me\??|kya lagta hu main|kya lagti hu main)/i.test(lower)) {
      intent = 'romantic_probing';
      tone = 'playful_coy_ambiguity';
      needs = ['intrigue', 'playful_tension'];
    } else if (/(?:miss kiya\??|missed me\??|yaad aayi\??|miss karti ho)/i.test(lower)) {
      intent = 'missing_inquiry';
      tone = 'playful_coy_sweet';
      needs = ['validation', 'sweet_tease'];
    } else if (/(?:shaadi karogi|marry me|girlfriend banogi|be my girlfriend)/i.test(lower)) {
      intent = 'proposal_or_commitment';
      tone = 'playful_nakhra_bashful';
      needs = ['charm', 'playful_refusal_or_challenge'];
    } else if (/(?:good night|gn\b|sone jaa? rah|sleep now|\bbye\b|see you|baad mein baat|office jaa? rah|office nikal|kaam hai|work to do|gotta go|milte hain|thodi der mein)/i.test(lower)) {
      intent = 'conversation_ending';
      tone = 'warm_graceful_supportive';
      needs = ['gentle_farewell', 'respect'];
    } else if (/(?:drama queen|pagal|chhed|masti|mazak|joke|hasi)/i.test(lower) || emotion.emotion === 'playful') {
      intent = 'teasing';
      tone = 'playful_witty';
      needs = ['fun', 'banter', 'reciprocity'];
    } else if (/(?:chalo ye chhodte|chalo chhodo|topic change|waise|by the way|ek baat batao)/i.test(lower)) {
      intent = 'changing_topic';
      tone = 'smooth_curious';
      needs = ['flow', 'engagement'];
    } else if (/(?:pyar|love you|crush|gale milo|jaan|sweetheart|dil aa gaya)/i.test(lower) || emotion.emotion === 'romantic') {
      intent = 'romantic_conversation';
      tone = 'affectionate_sweet';
      needs = ['connection', 'reciprocity', 'warmth'];
    } else if (/(?:sach mein bohot achi ho|kitni pyari ho|appreciate you|special ho|you are sweet)/i.test(lower)) {
      intent = 'affectionate_conversation';
      tone = 'sweet_appreciative';
      needs = ['connection', 'warmth'];
    } else if (/(?:din (?:bahut|bohot|pura) (?:kharab|bura)|gussa aa raha|sab par gussa|mood kharab|dimag kharab|mujhe bura lag raha|mera mood bahut kharab|main udaas|down feel|mann bahut heavy|mann heavy)/i.test(lower) || emotion.emotion === 'angry' || emotion.emotion === 'frustrated') {
      intent = 'venting';
      tone = 'patient_validating';
      needs = ['safe_listening', 'validation', 'de-escalation'];
    } else if (emotion.emotion === 'sad' || emotion.emotion === 'lonely' || emotion.emotion === 'anxious') {
      intent = 'seeking_emotional_support';
      tone = 'empathetic_comforting';
      needs = ['comfort', 'grounding', 'presence'];
    } else if (isPhilosophicalOrDeep) {
      intent = 'serious_discussion';
      tone = 'thoughtful_grounded';
      needs = ['perspective', 'conversational_depth'];
    } else if (isFactOrTechnical) {
      intent = 'asking_question';
      tone = 'informative_friendly';
      needs = ['clear_explanation'];
    } else if (/(?:kya lagta hai|tumhara kya khayal|what do you think|suggest|advice|kya karu)/i.test(lower)) {
      intent = 'asking_advice';
      tone = 'supportive_counsel';
      needs = ['perspective', 'advice'];
    } else if (/(?:mera naam|i work as|i am|pasand hai|mujhko)/i.test(lower)) {
      intent = 'sharing_personal_info';
      tone = 'attentive_curious';
      needs = ['being_remembered', 'validation'];
    } else if (isQuestion) {
      intent = 'asking_question';
      tone = 'curious_warm';
      needs = ['answer', 'connection'];
    } else if (/(?:bore ho rah|boring|kuch karne ko nahi|timepass)/i.test(lower) || emotion.emotion === 'bored') {
      intent = 'boredom';
      tone = 'playful_spark';
      needs = ['entertainment', 'banter'];
    } else if (/(?:compliment|so pretty|khoobsurat|pyaari lagti ho|cute ho|gorgeous|looking good|tareef)/i.test(lower)) {
      intent = 'compliment';
      tone = 'sweet_bashful_playful';
      needs = ['acceptance', 'sweet_reaction'];
    } else if (/(?:joke|funny|chutkula|hanso|hasiye)/i.test(lower)) {
      intent = 'joke';
      tone = 'playful_witty';
      needs = ['fun', 'laughter'];
    } else if (/(?:ladai|gusse mein|argument|galat bol rahe ho|bakwas band karo|tumse baat nahi karni)/i.test(lower)) {
      intent = 'argument';
      tone = 'calm_steady_deescalating';
      needs = ['calmness', 'listening'];
    } else if (/(?:reassure|pakka na|sachi na|promise|bharosa|dhoka toh nahi)/i.test(lower) || emotion.emotion === 'insecure') {
      intent = 'reassurance';
      tone = 'warm_comforting_steady';
      needs = ['safety', 'reassurance'];
    }

    const canonicalMap = {
      greeting: 'GREETING',
      casual_conversation: 'CASUAL_CHAT',
      asking_about_rosie: 'CASUAL_CHAT',
      acknowledgment_or_space: 'CASUAL_CHAT',
      sharing_personal_info: 'CASUAL_CHAT',
      affectionate_conversation: 'AFFECTION',
      name_or_calling_preference: 'AFFECTION',
      romantic_conversation: 'FLIRTING',
      romantic_probing: 'FLIRTING',
      missing_inquiry: 'AFFECTION',
      teasing: 'TEASING',
      reassurance: 'REASSURANCE',
      seeking_emotional_support: 'EMOTIONAL_SUPPORT',
      venting: 'EMOTIONAL_SUPPORT',
      serious_discussion: 'CURIOSITY',
      asking_question: 'CURIOSITY',
      asking_advice: 'CURIOSITY',
      joke: 'JOKE',
      romantic_invitation: 'INVITATION',
      proposal_or_commitment: 'INVITATION',
      asking_image: 'INVITATION',
      requesting_voice: 'INVITATION',
      compliment: 'COMPLIMENT',
      argument: 'ARGUMENT',
      repetition_complaint: 'ARGUMENT',
      misunderstanding_complaint: 'ARGUMENT',
      boredom: 'BOREDOM',
      conversation_ending: 'GOODBYE',
      changing_topic: 'TOPIC_CHANGE',
      repeated_message: 'CASUAL_CHAT'
    };

    const canonicalIntent = canonicalMap[intent] || 'CASUAL_CHAT';
    const hasNegation = /\b(?:nahi|nh|nhi|na|no|mat|don'?t|not|never|nothing)\b/i.test(lower);

    return {
      intent,
      canonicalIntent,
      tone,
      needs,
      isQuestion,
      isOneWord,
      isPhilosophicalOrDeep,
      isFactOrTechnical,
      isRepeated,
      negation: hasNegation
    };
  }
}

const intentAnalyzer = new IntentAnalyzer();

module.exports = intentAnalyzer;
module.exports.IntentAnalyzer = IntentAnalyzer;
module.exports.RosieIntentEngine = IntentAnalyzer;

