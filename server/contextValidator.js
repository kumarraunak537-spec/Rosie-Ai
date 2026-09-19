// server/contextValidator.js
// Section 9 & 22: ContextValidator (Response Relevance Check)
// Checks: CURRENT USER MESSAGE + CURRENT TOPIC + RECENT CONTEXT + EMOTIONAL CONTEXT
// Ensures Rosie never sends a canned, off-topic, or context-destroying response.

class ContextValidator {
  /**
   * Validate whether bot response directly and naturally relates to the user message and context
   * @param {string} botReply - Candidate bot response
   * @param {string} userMessage - What user literally said
   * @param {Object} contextData - Context tracking state (currentTopic, emotionalDirection, etc.)
   * @param {Object} emotionAnalysis - User emotion
   * @param {Object} intentAnalysis - User intent
   * @returns {{ isRelevant: boolean, reason: string|null, correctiveDirective: string|null }}
   */
  validate(botReply = '', userMessage = '', contextData = {}, emotionAnalysis = {}, intentAnalysis = {}) {
    const reply = (botReply || '').trim().toLowerCase();
    const input = (userMessage || '').trim().toLowerCase();
    const emotion = emotionAnalysis?.emotion || 'neutral';
    const topic = contextData?.currentTopic || 'general';

    // 1. Emotional mismatch checks
    // If user is clearly sad, distressed, or angry, bot should not give an inappropriately cheerful, flirty or unrelated joke
    if (['sad', 'lonely', 'depressed', 'crying'].includes(emotion) || /(?:rona aa raha|bura lag raha|dil toot)/i.test(input)) {
      if (/(?:party|joke sunoge|six-pack|haha pagal|dating pe|movie suggest)/i.test(reply)) {
        return {
          isRelevant: false,
          reason: 'emotional_incongruence_sadness',
          correctiveDirective: 'CRITICAL: User is sad/distressed. Respond with gentle, warm empathy and quiet presence. Do NOT joke, flirt, or change the topic.'
        };
      }
    }

    if (['angry', 'frustrated'].includes(emotion) || /(?:gussa|frustrated|dimaag kharab)/i.test(input)) {
      if (/(?:haha|romantic|chhed|masti)/i.test(reply)) {
        return {
          isRelevant: false,
          reason: 'emotional_incongruence_anger',
          correctiveDirective: 'CRITICAL: User is angry or frustrated. Stay calm, grounded, and listen. Do NOT tease or act cheeky.'
        };
      }
    }

    // 2. Jealousy / Another girl context check (Section 5)
    // If user mentions another girl, bot reply should address her presence or react naturally, not talk about unrelated weather or coding
    if (/(?:dusri ladki|doosri ladki|nayi ladki|meri friend|meri colleague|ex|crush)\b/i.test(input) && /(?:ladki|bandi|girl)/i.test(input)) {
      if (/(?:weather|react|python|movie|khana kya khaya|chai piyo)/i.test(reply) && !/(?:ladki|uski|kaun|woh|friend|dost|jealous|jalan|mera)/i.test(reply)) {
        return {
          isRelevant: false,
          reason: 'ignored_female_mention',
          correctiveDirective: 'CRITICAL: User mentioned another girl. Rosie must react directly to this statement with natural curiosity, playful jealousy, or feminine possessiveness.'
        };
      }
    }

    // 3. Topic discontinuity check (Section 6)
    // User is discussing coding/tech and bot suddenly asks about random romance or movies
    if (intentAnalysis?.isFactOrTechnical || /(?:react|node|api|javascript|code|coding|database)/i.test(input)) {
      if (!/(?:code|tech|developer|logic|build|app|programming|project|react|api|state|sql|database|query|data)/i.test(reply)) {
        return {
          isRelevant: false,
          reason: 'ignored_technical_topic',
          correctiveDirective: 'CRITICAL: User asked a technical/coding question. Respond directly to the technical topic.'
        };
      }
      if (/(?:tumhare baare mein|bed pe leti|miss|jaan|babu|shaitani|pyaar)/i.test(reply)) {
        return {
          isRelevant: false,
          reason: 'inappropriate_romantic_preamble',
          correctiveDirective: 'CRITICAL: User asked a technical/factual question. Do NOT include romantic preambles, flirting, or unrelated emotional hooks. Answer directly.'
        };
      }
    }

    // 4. Artificial engagement check (Section 19)
    // Checking for forced generic hooks that break flow
    if (reply.includes('ab meri baari hai tumse kuch poochne ki') && input.length < 5) {
      // Allow for dry messages if planned, but flag if repeated
    }

    return {
      isRelevant: true,
      reason: null,
      correctiveDirective: null
    };
  }
}

const contextValidator = new ContextValidator();

module.exports = contextValidator;
module.exports.ContextValidator = ContextValidator;
module.exports.contextValidator = contextValidator;
