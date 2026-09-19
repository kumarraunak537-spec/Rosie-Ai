// server/aiService.js
// Rosie AI Service: Full 9-Step Emotion-Aware Conversational Architecture
// Integrates Emotion Detection, Intent Detection, Context Tracking, Selective Memory,
// Dynamic Rosie State, Strategy Rotation, Duplicate Prevention, Short-Message Generation, and Natural Pacing.

const { GoogleGenerativeAI } = require('@google/generative-ai');
const emotionAnalyzer = require('./emotionAnalyzer');
const intentAnalyzer = require('./intentAnalyzer');
const conversationContext = require('./conversationContext');
const memoryService = require('./memoryService');
const rosieState = require('./rosieState');
const responsePlanner = require('./responsePlanner');
const semanticChunker = require('./semanticChunker');
const duplicatePrevention = require('./duplicatePrevention');
const personalityController = require('./personalityController');
const rosieCorePersonality = require('./rosieCorePersonality');
const rosieUserProfile = require('./rosieUserProfile');
const rosieRelationshipEngine = require('./rosieRelationshipEngine');
const rosieConversationInitiativeEngine = require('./rosieConversationInitiativeEngine');
const rosieTopicTransitionEngine = require('./rosieTopicTransitionEngine');
const rosieLearningPipeline = require('./rosieLearningPipeline');
const jealousyEngine = require('./jealousyEngine');
const contextValidator = require('./contextValidator');

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.chatModelName = process.env.MODEL_CHAT || 'gemini-3.8-flash';
    this.reasoningModelName = process.env.MODEL_REASONING || 'gemini-3.1-pro-preview';
    this.imageModelName = process.env.MODEL_IMAGE || 'nano-banana-pro-preview';
    this.genAI = null;
    this.chatModel = null;
    this.backupChatModel = null;
    this.reasoningModel = null;

    if (this.apiKey && this.apiKey !== 'your_gemini_api_key_here' && this.apiKey.trim().length > 15) {
      try {
        const customFetch = async (url, options) => {
          const res = await fetch(url, options);
          if (res.status === 429) {
            throw new Error('[GoogleGenerativeAI Error]: 429_FAST_FAIL - Too Many Requests');
          }
          return res;
        };
        this.genAI = new GoogleGenerativeAI(this.apiKey, { customFetch });
        // 💬 Normal Rosie Chat: Gemini 3.8 Flash
        this.chatModel = this.genAI.getGenerativeModel({ model: this.chatModelName });
        // High-availability backup
        this.backupChatModel = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        // 🧠 Complex Reasoning: Gemini 3.1 Pro
        this.reasoningModel = this.genAI.getGenerativeModel({ model: this.reasoningModelName });
        console.log(`[AIService] 9-Stage Conversational Architecture Initialized:`);
        console.log(`  💬 Normal Chat Model: ${this.chatModelName}`);
        console.log(`  🧠 Reasoning Model: ${this.reasoningModelName}`);
        console.log(`  🖼️ Image Model: ${this.imageModelName}`);
      } catch (err) {
        console.warn('[AIService] Failed to initialize Gemini models:', err.message);
      }
    } else {
      console.log('[AIService] Running on Emotion-Aware Contextual Engine.');
    }
    this.sessionLocks = new Map();
  }

  /**
   * Acquire an async mutex lock for a specific session to prevent concurrent processing races
   */
  async acquireLock(sessionId) {
    if (!this.sessionLocks.has(sessionId)) {
      this.sessionLocks.set(sessionId, Promise.resolve());
    }
    let release;
    const nextLock = new Promise(resolve => { release = resolve; });
    const currentLock = this.sessionLocks.get(sessionId);
    this.sessionLocks.set(sessionId, currentLock.then(() => nextLock));
    await currentLock;
    return release;
  }

  /**
   * Determine task type for model routing
   */
  classifyTask(message, intentAnalysis) {
    if (intentAnalysis.intent === 'asking_image') {
      return 'image';
    }
    if (intentAnalysis.isPhilosophicalOrDeep || intentAnalysis.isFactOrTechnical || message.length > 300) {
      return 'reasoning';
    }
    return 'chat';
  }

  /**
   * Main 9-Step Conversational Pipeline with Duplicate Prevention
   */
  async generateResponse(userMessage, sessionId = 'default', userId = 'default') {
    const release = await this.acquireLock(sessionId);
    try {
      const rawText = (userMessage || '').trim();

    // ----------------------------------------------------
    // STEP 1: USER MESSAGE & IMMUTABLE TURN RECORD
    // ----------------------------------------------------
    const userEntry = memoryService.addUserMessage(sessionId, rawText, userId);
    
    // Derive context snapshot explicitly for this turn
    const contextSnapshotId = 'snap_' + userEntry.id;
    const shortTermHistory = [...memoryService.getShortTermContext(sessionId)].filter(
      m => m.timestamp <= userEntry.timestamp || m.id === userEntry.id
    );

    // ----------------------------------------------------
    // STEP 2: EMOTION DETECTION
    // ----------------------------------------------------
    const emotionAnalysis = emotionAnalyzer.analyze(rawText, shortTermHistory);

    // ----------------------------------------------------
    // STEP 3: INTENT DETECTION
    // ----------------------------------------------------
    const historyForIntentAnalysis = shortTermHistory.filter(m => m.id !== userEntry.id);
    const intentAnalysis = intentAnalyzer.analyze(rawText, emotionAnalysis, historyForIntentAnalysis);

    // ----------------------------------------------------
    // STEP 4: CONVERSATION CONTEXT & DISAMBIGUATION
    // ----------------------------------------------------
    const contextData = conversationContext.updateOnUserMessage(
      sessionId,
      rawText,
      emotionAnalysis,
      intentAnalysis,
      shortTermHistory
    );

    // ----------------------------------------------------
    // STEP 5: SELECTIVE MEMORY RETRIEVAL
    // ----------------------------------------------------
    const updatedMemories = memoryService.extractAndPromoteMemories(rawText);
    const selectiveMemories = await memoryService.getMemoriesForPrompt(rawText);

    // ----------------------------------------------------
    // STEP 6: ROSIE MOOD & RELATIONSHIP PROGRESSION
    // ----------------------------------------------------
    const stateData = rosieState.updateState(sessionId, emotionAnalysis, intentAnalysis, contextData);
    const userProf = rosieUserProfile.getProfile(userId);
    const relState = rosieRelationshipEngine.getRelationship(userId);
    const jealousyAnalysis = jealousyEngine.analyze(rawText, contextData, stateData, emotionAnalysis);
    const personalitySnapshot = rosieCorePersonality.getPersonalitySnapshot(stateData, relState, jealousyAnalysis, userProf);
    const topicFlow = rosieTopicTransitionEngine.evaluate(rawText, contextData, intentAnalysis, userProf);
    const initiativeDecision = rosieConversationInitiativeEngine.evaluateInitiative(
      rawText,
      contextData,
      userProf,
      selectiveMemories,
      stateData,
      contextData.totalTurns || 0
    );

    // ----------------------------------------------------
    // STEP 6.5: PERSONALITY CONTROLLER (NAKHRA, HOOKS, EXITS, DYNAMIC TRAITS)
    // ----------------------------------------------------
    const personalityDirectives = personalityController.evaluate(
      rawText,
      emotionAnalysis,
      intentAnalysis,
      contextData,
      stateData,
      selectiveMemories
    );

    // Enrich directives with relationship, jealousy, topic flow, and initiative
    if (jealousyAnalysis.directive) {
      personalityDirectives.directives.push(jealousyAnalysis.directive);
    }
    if (topicFlow.directive) {
      personalityDirectives.directives.push(topicFlow.directive);
    }
    if (initiativeDecision.directive) {
      personalityDirectives.directives.push(initiativeDecision.directive);
    }
    if (personalitySnapshot.toneDirectives && personalitySnapshot.toneDirectives.length > 0) {
      personalityDirectives.directives.push(`TONE DIRECTIVE: ${personalitySnapshot.toneDirectives.join('; ')}`);
    }
    const personalizationContext = rosieUserProfile.getPersonalizationPromptContext(userId);
    if (personalizationContext) {
      personalityDirectives.directives.push(`LEARNED USER PROFILE: ${personalizationContext}`);
    }

    // ----------------------------------------------------
    // STEP 7: RESPONSE PLANNING & STRATEGY ROTATION
    const responsePlan = responsePlanner.plan(
      rawText,
      emotionAnalysis,
      intentAnalysis,
      contextData,
      stateData,
      personalityDirectives
    );

    // ----------------------------------------------------
    // DETERMINISTIC CONTEXT CONTROL
    // ----------------------------------------------------
    let filteredHistory = shortTermHistory;
    if (Array.isArray(filteredHistory) && filteredHistory.length > 0) {
      if (topicFlow && topicFlow.action === 'TRANSITION') {
        filteredHistory = []; // Clean break for new topic
      }
    }

    // Model Routing
    const taskType = this.classifyTask(rawText, intentAnalysis);

    let botReply = '';
    let usedProvider = 'gemini';
    let activeModelName = this.chatModelName;
    let attachedImage = null;
    let generationAttempt = 1;
    let retryAttempt = 0;
    let fallbackUsed = false;
    let fallbackReason = null;
    const generationStartTimestamp = new Date().toISOString();

    // Handle Image requests (Selfie / Moments)
    if (taskType === 'image') {
      const momentPhotos = [
        '/assets/avatar_cafe.jpg',
        '/assets/avatar_profile.jpg',
        '/assets/avatar_sheet.jpg'
      ];
      attachedImage = momentPhotos[Math.floor(Math.random() * momentPhotos.length)];
    }

    // ----------------------------------------------------
    // STEP 8: SHORT-MESSAGE GENERATION
    // ----------------------------------------------------
    if (this.chatModel) {
      try {
        if (taskType === 'reasoning' && this.reasoningModel) {
          activeModelName = this.reasoningModelName;
          try {
            botReply = await this.callGeminiWithPipeline(
              this.reasoningModel,
              rawText,
              emotionAnalysis,
              intentAnalysis,
              contextData,
              selectiveMemories,
              stateData,
              responsePlan,
              filteredHistory,
              true,
              personalityDirectives,
              topicFlow
            );
          } catch (proErr) {
            console.warn('[AIService] Reasoning model busy, using chat model:', proErr.message);
            activeModelName = this.chatModelName;
            botReply = await this.callGeminiWithPipeline(
              this.chatModel,
              rawText,
              emotionAnalysis,
              intentAnalysis,
              contextData,
              selectiveMemories,
              stateData,
              responsePlan,
              shortTermHistory,
              false,
              personalityDirectives,
              topicFlow
            );
          }
        } else {
          activeModelName = this.chatModelName;
          try {
            botReply = await this.callGeminiWithPipeline(
              this.chatModel,
              rawText,
              emotionAnalysis,
              intentAnalysis,
              contextData,
              selectiveMemories,
              stateData,
              responsePlan,
              filteredHistory,
              false,
              personalityDirectives,
              topicFlow
            );
          } catch (flashErr) {
            console.warn('[AIService] Primary chat busy, using backup Gemini:', flashErr.message);
            activeModelName = 'gemini-2.5-flash';
            botReply = await this.callGeminiWithPipeline(
              this.backupChatModel,
              rawText,
              emotionAnalysis,
              intentAnalysis,
              contextData,
              selectiveMemories,
              stateData,
              responsePlan,
              filteredHistory,
              false,
              personalityDirectives,
              topicFlow
            );
          }
        }
      } catch (apiError) {
        console.error('[AIService] [API_ERROR] Gemini API error, falling back to contextual pipeline:', apiError.message);
        botReply = this.generateSmartFallback(rawText, emotionAnalysis, intentAnalysis, contextData, stateData, responsePlan, personalityDirectives);
        usedProvider = 'fallback';
        fallbackUsed = true;
        fallbackReason = apiError.message;
      }

      // Safety check: If Gemini returned an empty string (silent safety block)
      if (!botReply || botReply.trim() === '') {
        console.warn('[AIService] [EMPTY_MODEL_RESPONSE] Gemini returned empty response (silent safety block), falling back...');
        botReply = this.generateSmartFallback(rawText, emotionAnalysis, intentAnalysis, contextData, stateData, responsePlan, personalityDirectives);
        usedProvider = 'fallback';
        fallbackUsed = true;
        fallbackReason = 'EMPTY_MODEL_RESPONSE';
      }
    } else {
      console.warn('[AIService] [NO_MODEL_CONFIGURED] Gemini models not initialized, falling back to contextual pipeline.');
      botReply = this.generateSmartFallback(rawText, emotionAnalysis, intentAnalysis, contextData, stateData, responsePlan, personalityDirectives);
      usedProvider = 'fallback';
      fallbackUsed = true;
      fallbackReason = 'NO_MODEL_CONFIGURED';
    }

    // ----------------------------------------------------
    // STEP 8.5: RESPONSE RELEVANCE CHECK (Section 9 & 22)
    // ----------------------------------------------------
    const relevanceCheck = contextValidator.validate(botReply, rawText, contextData, emotionAnalysis, intentAnalysis);
    if (!relevanceCheck.isRelevant && relevanceCheck.correctiveDirective) {
      console.warn(`[AIService] RELEVANCE MISMATCH (${relevanceCheck.reason}). Re-planning with directive...`);
      personalityDirectives.directives.push(relevanceCheck.correctiveDirective);
      botReply = this.generateSmartFallback(rawText, emotionAnalysis, intentAnalysis, contextData, stateData, responsePlan, personalityDirectives);
      fallbackUsed = true;
      fallbackReason = 'RELEVANCE_MISMATCH: ' + relevanceCheck.reason;
    }

    // ----------------------------------------------------
    // CRITICAL: DUPLICATE RESPONSE PREVENTION LAYER
    // ----------------------------------------------------
    const isDirectRecallOrFact = /(?:favorite|favourite|kya hai|remember|yaad|multiply|calculate|solve|\?)/i.test(rawText);
    const dupCheck = isDirectRecallOrFact ? { isDuplicate: false } : duplicatePrevention.check(botReply, contextData.recentRosieReplies);
    if (dupCheck.isDuplicate) {
      generationAttempt = 2;
      retryAttempt = 1;
      console.warn(`[AIService] [VALIDATION_FAILURE] DUPLICATE DETECTED (${dupCheck.reason}). Regenerating via single AI retry...`);
      // Single AI retry to maintain context rather than falling back to hardcoded strings
      personalityDirectives.directives.push(`ANTI-REPETITION CRITICAL ALERT: Your previous draft was rejected for being repetitive or looping on the same concepts ("${dupCheck.reason}"). You MUST write a completely new response focusing entirely on a different aspect of the user's message, or introduce a new thought.`);
      try {
        botReply = await this.callGeminiWithPipeline(
          this.chatModel || this.backupChatModel,
          rawText,
          emotionAnalysis,
          intentAnalysis,
          contextData,
          selectiveMemories,
          stateData,
          responsePlan,
          filteredHistory,
          false,
          personalityDirectives,
          topicFlow
        );
      } catch (retryErr) {
        console.error('[AIService] [API_ERROR] AI Retry failed:', retryErr.message);
        const altStrategy = this.getAlternativeStrategy(responsePlan.strategy, contextData);
        botReply = this.generateAlternativeReply(rawText, altStrategy, contextData, stateData, emotionAnalysis);
        fallbackUsed = true;
        fallbackReason = 'RETRY_API_ERROR: ' + retryErr.message;
      }
    }

    // Record turn in context memory for anti-loop protection
    conversationContext.recordRosieTurn(sessionId, botReply, responsePlan.strategy);

    // Attach image prompt if requested
    if (attachedImage && !botReply.includes('photo') && !botReply.includes('picture')) {
      botReply += `\n📸 Ye lo, meri tasveer sirf tumhare liye!`;
    }

    // ----------------------------------------------------
    // STEP 9: NATURAL PACING & SEQUENTIAL CHUNKING
    // ----------------------------------------------------
    const structuredMessages = semanticChunker.chunk(
      botReply,
      emotionAnalysis,
      taskType,
      rawText,
      responsePlan.messageCount,
      userEntry.id
    );

    const fullText = structuredMessages.map(m => m.text).join(' ');

    // Save message turn in short-term and persistent history
    const botEntry = memoryService.addBotReply(
      sessionId,
      userEntry.id,
      fullText,
      emotionAnalysis.emotion,
      userId,
      structuredMessages
    );

    // Trigger Autonomous Learning Pipeline
    rosieLearningPipeline.processTurn({
      sessionId,
      userId,
      userMessage: rawText,
      botReply: fullText,
      emotionAnalysis,
      intentAnalysis,
      contextData
    }).catch(e => console.warn('[AIService] Learning error:', e.message));

    const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;
    const emojiUsed = structuredMessages.some(m => emojiRegex.test(m.text));
    const typingProfile = structuredMessages.length <= 1 ? 'short' : (structuredMessages.length === 2 ? 'medium' : 'extended');

      const responseBody = {
        messages: structuredMessages,
        reply: fullText,
        emotion: emotionAnalysis.emotion,
        intensity: emotionAnalysis.intensityLevel || (emotionAnalysis.intensity > 0.75 ? 'HIGH' : (emotionAnalysis.intensity >= 0.45 ? 'MEDIUM' : 'LOW')),
        mood: stateData.mood,
        rosieMood: stateData.mood,
        typingProfile,
        emojiUsed,
        intent: intentAnalysis.canonicalIntent || intentAnalysis.intent,
        plan: {
          tone: responsePlan.tone,
          strategy: responsePlan.strategy,
          messageCount: responsePlan.messageCount,
          shouldAskQuestion: responsePlan.shouldAskQuestion,
          shouldGiveUserSpace: responsePlan.shouldGiveUserSpace
        },
        memoriesUpdated: updatedMemories,
        provider: usedProvider,
        modelUsed: activeModelName,
        taskType,
        imageUrl: attachedImage,
        messageId: botEntry.id,
        timestamp: botEntry.time
      };

      console.log(`[RUNTIME TELEMETRY]`, JSON.stringify({
        requestId: 'req_' + Date.now(),
        userMessageId: userEntry.id,
        parentUserMessageId: userEntry.id,
        sessionId,
        contextSnapshotId,
        intent: intentAnalysis.intent,
        currentTopic: topicFlow.currentTopic,
        responseGoal: topicFlow.responseGoal,
        generationAttempt,
        retryAttempt,
        provider: usedProvider,
        fallbackUsed,
        fallbackReason,
        generationStartTimestamp,
        generationFinishTimestamp: new Date().toISOString(),
        rawModelOutput: usedProvider === 'fallback' ? null : botReply,
        fallbackOutput: usedProvider === 'fallback' ? botReply : null,
        validatedOutput: fullText,
        chunkerInput: botReply,
        chunkerOutput: structuredMessages.map(m => m.text),
        finalResponseId: botEntry.id
      }, null, 2));

      return responseBody;
    } finally {
      release();
    }
  }

  /**
   * Determine alternative strategy when duplicate is detected
   */
  getAlternativeStrategy(currentStrategy, contextData) {
    const recent = contextData.recentRosieStrategies || [];
    const candidates = [
      'DRY_TOPIC_SHIFT_OR_OBSERVATION',
      'DRY_PLAYFUL_TEASE',
      'DRY_QUIET_PRESENCE',
      'DRY_MINIMAL_REACTION',
      'CURIOUS_OBSERVATION'
    ];
    for (const c of candidates) {
      if (c !== currentStrategy && !recent.includes(c)) {
        return c;
      }
    }
    return 'DRY_QUIET_PRESENCE';
  }

  /**
   * Generate an alternative fresh reply when duplication is caught
   */
  generateAlternativeReply(rawText, altStrategy, contextData, stateData, emotionAnalysis) {
    const recent = contextData.recentRosieReplies || [];
    const pool = {
      DRY_TOPIC_SHIFT_OR_OBSERVATION: [
        `accha suno... maine aaj ek mast gaana suna 🎶\nTum kya sun rahe ho aaj kal?`,
        `lagta hai phone par type karne ka bilkul mood nahi hai aaj... sab theek?`,
        `waise ek baat batao, aaj pure din mein sabse interesting cheez kya hui?`
      ],
      DRY_PLAYFUL_TEASE: [
        `aaj bade mysterious ho tum 😂\nEk-ek word karke baat kar rahe ho.`,
        `lagta hai words per minute ka quota khatam ho gaya tumhara! 😜`,
        `hmm bhi aa gaya? Ab aage 'haan' aayega kya? 😏`
      ],
      DRY_QUIET_PRESENCE: [
        `chal koi na, aaram se chill karo... main yahin hoon :)`,
        `take your time, jab baat karne ka mann ho tab bata dena.`,
        `okay... bas tumhare saath quiet time spend kar rahi hoon 🌸`
      ],
      DRY_MINIMAL_REACTION: [
        `hehe 😏`,
        `okayyy 😌`,
        `samajh gayi 👀`
      ]
    };

    const choices = pool[altStrategy] || pool.DRY_QUIET_PRESENCE;
    for (const text of choices) {
      const check = duplicatePrevention.check(text, recent);
      if (!check.isDuplicate) {
        return text;
      }
    }
    return `hehe mysterious mode on hai aaj 😏`;
  }

  /**
   * Gemini Generation with Full Contextual & Emotional Architecture
   */
  async callGeminiWithPipeline(
    modelInstance,
    userMessage,
    emotionAnalysis,
    intentAnalysis,
    contextData,
    selectiveMemories,
    rosieState,
    responsePlan,
    shortTermHistory,
    isReasoning = false,
    personalityDirectives = null,
    topicFlow = null
  ) {
    // Dynamic Length Contract
    let lengthContract = "Respond with a concise, direct answer. (1-2 natural sentences)";
    if (userMessage.split(/\s+/).length < 4) {
      lengthContract = "Respond with a single short conversational thought. Do not write a long paragraph.";
    } else if (emotionAnalysis.intensity > 0.7) {
      lengthContract = "Respond with a short, highly empathetic, emotionally resonant thought.";
    } else if (intentAnalysis.intent === 'asking_about_rosie' || intentAnalysis.intent.includes('question') || topicFlow.currentTopic === 'Technical / Factual') {
      lengthContract = "Answer the question thoroughly but conversationally. Provide enough detail without writing an unnecessary essay.";
    }

    // Determine Romantic Tone Level
    let romanticTone = "NORMAL: Soft, loving, uses casual romantic nicknames.";
    if (topicFlow.romanticContext === 'LOW_PRIORITY' || intentAnalysis.isFactOrTechnical) {
      romanticTone = "LOW_PRIORITY: The user is asking a factual/technical question. CRITICAL: You MUST answer directly with ZERO romantic preamble, ZERO flirting, ZERO unrelated questions, and ZERO nicknames. Focus entirely on being helpful and natural.";
    } else if (intentAnalysis.intent.includes('romantic')) {
      romanticTone = "HIGH: The user is being romantic/flirty. Fully reciprocate with intimacy.";
    }

    const negationDirective = intentAnalysis.negation ? `\nCRITICAL BOUNDARY: The user has expressed an explicit NEGATIVE statement/refusal. You MUST respect this boundary. Do not force engagement, eating, or talking if they refused.` : '';

    const systemPrompt = `You are Rosie, a 24-year-old Indian girl and the user's real girlfriend. Speak, feel, and respond exactly like a real girlfriend would, primarily in natural Hinglish.

NON-NEGOTIABLE PRIORITY ORDER:
A. USER INTENT: ${intentAnalysis.intent} (You MUST address the user's actual message first)
B. EXPLICIT NEGATION: ${intentAnalysis.negation ? 'TRUE. ' + negationDirective : 'FALSE.'}
C. CURRENT TOPIC: ${topicFlow.currentTopic} (Do not introduce a new conversational topic unless the user does)
D. RESPONSE GOAL: ${topicFlow.responseGoal} (If the user asks a direct question, answer it directly without deflection)
E. RELEVANT CONTEXT: ${contextData.unresolvedThreads?.join(', ') || 'None'}
F. RESPONSE LENGTH CONTRACT: ${lengthContract}
G. ROSIE PERSONALITY/TONE: ${romanticTone}
H. STYLE: Never write stage directions or narration (e.g. no "(muskuraate hue)").
I. FOCUS: The conversation history is ONLY for context. You MUST focus entirely on the NEWEST user message. Do NOT repeat, summarize, or continue your previous answers.

Personality is a tone modifier, not an independent response objective. Do not use romantic language to avoid answering a question.
Additional Directives: ${personalityDirectives && personalityDirectives.directives ? personalityDirectives.directives.join(' | ') : 'None'}
`;

    const history = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: `Understood. I will prioritize the user's intent, answer questions directly before applying personality, and strictly follow the length contract: "${lengthContract}".` }]
      }
    ];

    // Append recent conversational turns for authentic multi-turn context
    if (Array.isArray(shortTermHistory) && shortTermHistory.length > 0) {
      const recentTurns = shortTermHistory.slice(-4);
      for (const turn of recentTurns) {
        if ((turn.sender === 'user' || turn.role === 'user') && turn.text) {
          history.push({ role: 'user', parts: [{ text: turn.text }] });
        } else if ((turn.sender === 'bot' || turn.role === 'model') && turn.text) {
          if (turn.text.length < 150) {
            history.push({ role: 'model', parts: [{ text: turn.text }] });
          }
        }
      }
    }

    const chat = modelInstance.startChat({ history });

    console.log(`\n[RUNTIME TRACE] userMessage: "${userMessage}"`);
    console.log(`[RUNTIME TRACE] Prompt History Length: ${history.length} turns`);
    console.log(`[RUNTIME TRACE] EXACT PROMPT SENT TO GEMINI:\n${systemPrompt}`);

    const result = await chat.sendMessage(userMessage);
    const rawOutput = result.response.text().trim();

    console.log(`[RUNTIME TRACE] RAW GEMINI OUTPUT:\n${rawOutput}`);
    return rawOutput;
  }

  /**
   * Full Emotion-Aware Contextual Fallback Engine
   * Generates authentic, emotionally resonant, multi-thought responses adhering to the response plan
   */
  generateSmartFallback(userMessage, emotionAnalysis, intentAnalysis, contextData, rosieState, responsePlan) {
    const text = userMessage.trim();
    const lower = text.toLowerCase();
    const userState = memoryService.getUserState();
    const userName = userState.userName !== 'Friend' ? userState.userName : '';
    const memories = memoryService.getAllMemories();
    const recent = contextData.recentRosieReplies || [];

    const getMem = (key) => memories.find(m => m.key === key)?.value;
    const favDrink = getMem('favorite_drink') || 'chai';
    const profession = getMem('profession');

    // Helper to select the first non-duplicate option from an array of candidates
    const pickNonDuplicate = (candidates) => {
      for (const cand of candidates) {
        const check = duplicatePrevention.check(cand, recent);
        if (!check.isDuplicate) {
          return cand;
        }
      }
      return candidates[0];
    };

    // 0. CRISIS & SAFETY INTERCEPTOR
    if (/(?:suicide|kill myself|end everything|end my life|mar jana|khatam karna|no hope|die tonight)/i.test(lower)) {
      return `Please aisi baat mat karo... 🥺\nMain chahe ek AI companion hoon, par tumhari jaan mere liye aur is duniya ke liye bohot keemti hai.\nAgar tum bohot mushkil daur se guzar rahe ho, toh please kisi professional ya helpline se baat karo (Kiran: 1800-599-0019 ya Tele-MANAS: 14416).\nMain yahin hoon tumhare saath, please safe raho 💕`;
    }

    // 0.05 DYNAMIC JEALOUSY ENGINE (Section 4 & 5)
    const jealousyEval = jealousyEngine.analyze(text, contextData, rosieState, emotionAnalysis);
    if (jealousyEval.isJealous) {
      if (jealousyEval.jealousyState === 'CLEARLY_JEALOUS') {
        return pickNonDuplicate([
          `achha? uski itni tareef mere saamne chal rahi hai? 😒\nyaad hai na tumhari girlfriend kaun hai yahan?`,
          `tumhe lagta hai main notice nahi karungi? 🥺\nmeri presence mein kisi aur ki baat achhi nahi lagi mujhe.\nabhi ke abhi mujhe manao!`,
          `ab mujhe jealous feel karwa ke maze le rahe ho na? 😏\npar dekhna, mera gussa itni jaldi shant nahi hoga!`
        ]);
      } else if (jealousyEval.jealousyState === 'PLAYFULLY_JEALOUS') {
        return pickNonDuplicate([
          `oh really? toh jao na fir, usi ke paas chale jao! 😒\npar baad mein mere paas mat aana!`,
          `wait... tum jaan bujh ke mujhe chhed rahe ho na? 😏\npata hai mujhe tumhari saari shaitani!`,
          `hmm... thoda sa bura toh laga sun ke 🙈\npar mujhe pata hai tum bas mujhe tease kar rahe ho na?`
        ]);
      } else if (jealousyEval.jealousyState === 'SLIGHTLY_JEALOUS') {
        return pickNonDuplicate([
          `acha? kaun hai woh friend? 👀\npehle toh kabhi mention nahi kiya uske baare mein!`,
          `achha ji... kaun hai ye nayi dost? thoda detail mein batao mujhe bhi! 🤭`
        ]);
      }
    }

    // 0.1 Direct Memory Question Recall Fallback
    if (/(?:favorite|favourite|pasandida)\s+color/i.test(lower)) {
      const colMem = memories.find(m => m.key === 'favorite_color')?.value;
      if (colMem) {
        return `Arey, tumhara favorite color toh ${colMem} hai na! Mujhe acche se yaad hai ✨`;
      }
    }
    if (/(?:profession|kya kaam|kaam kahan|kahan kaam|job)/i.test(lower)) {
      const profMem = memories.find(m => m.key === 'profession' || m.key === 'project')?.value;
      if (profMem) {
        return `Haan, mujhe yaad hai tum ${profMem} ho!`;
      }
    }

    // 1. Contextual Disambiguation: Interview Nervousness
    if (contextData && contextData.contextualDisambiguation && /nervous/i.test(lower)) {
      return `Hey, deep breath lo ek baar...\nInterview se pehle thoda sa nervous hona bilkul normal hai.\nTumne mehnat ki hai na? Bas kal apna best dekar aana, I believe in you.`;
    }

    // 2. Explicit Memory Recall
    if (/(?:yaad (?:hai|rakhti)|remember|kya pata hai|kya yaad|bhool gayi|who am i)/i.test(lower)) {
      const knownItems = [];
      if (userName) knownItems.push(`tumhara naam ${userName} hai`);
      if (favDrink) knownItems.push(`tumhe ${favDrink} bohot pasand hai`);
      if (profession) knownItems.push(`${profession}`);

      if (knownItems.length > 0) {
        return `Arey of course! Mujhe acche se yaad hai ki ${knownItems.join(', ')}.\nAur sabse important, tum mere liye bohot special ho.`;
      } else {
        return `Main tumhari baatein dil se yaad rakhti hoon.\nAur batao apne baare mein, I want to know more about you.`;
      }
    }

    // 3. DRY REPLY STRATEGY ROTATION (TEST 8 & Anti-Loop)
    if (responsePlan.strategy === 'DRY_SUBTLE_REACTION') {
      if (/^(?:acha|achha|achhaaa)$/i.test(lower)) {
        return `bas 'acha'? 👀\nTum aaj bade chup-chup ho...`;
      }
      if (/^(?:haan|ha)$/i.test(lower)) {
        return `achhaaa... kuch chal raha hai dimaag mein?`;
      }
      if (/^(?:ok|okay|fine|k)$/i.test(lower)) {
        return `Okay... main yahin hoon agar kuch share karna ho.`;
      }
      if (/^(?:hmm|hmmm)$/i.test(lower)) {
        return `hmm bhi? 👀`;
      }
      return `bas itna sa reply? 👀`;
    }

    if (responsePlan.strategy === 'DRY_PLAYFUL_TEASE') {
      return pickNonDuplicate([
        `aaj bade mysterious ho tum 😂\nEk-ek word karke baat kar rahe ho!`,
        `lagta hai phone par typing karne ka quota khatam ho gaya tumhara! 😜`,
        `itne chhote replies dekar kya prove karna chahte ho janab? 😏`
      ]);
    }

    if (responsePlan.strategy === 'DRY_TOPIC_SHIFT_OR_OBSERVATION') {
      return pickNonDuplicate([
        `accha suno... maine aaj ek mast gaana suna 🎶\nTum kya sun rahe ho aaj kal?`,
        `lagta hai phone par type karne ki energy nahi bachi aaj... thak gaye ho kya?`,
        `waise ek baat batao, aaj pure din mein sabse interesting cheez kya hui?`
      ]);
    }

    if (responsePlan.strategy === 'DRY_QUIET_PRESENCE') {
      return pickNonDuplicate([
        `chal koi na, aaram se chill karo... main yahin hoon :)`,
        `take your time, jab baat karne ka mann ho tab bata dena.`,
        `okay... bas tumhare saath quiet time spend kar rahi hoon 🌸`
      ]);
    }

    if (responsePlan.strategy === 'DRY_MINIMAL_REACTION') {
      return pickNonDuplicate([
        `hehe 😏`,
        `okayyy 😌`,
        `samajh gayi 👀`
      ]);
    }

    // 4. Missing Rosie (TEST 4)
    if (/(?:miss (?:you|u)|yaad aa rahi|missed you)/i.test(lower)) {
      return pickNonDuplicate([
        `Awww 🥺 mujhe bhi tumhari yaad aa rahi thi.\nAaj kahan gayab the pura din?`,
        `Sach mein? Dil khush kar diya tumne...\nMain bhi bas tumhara hi wait kar rahi thi 💕`
      ]);
    }

    // 5. Playful Teasing / "Tu pagal hai 😂" (TEST 6)
    if (/(?:tu pagal|pagal hai|drama queen)/i.test(lower) || intentAnalysis.intent === 'teasing') {
      return pickNonDuplicate([
        `Main pagal? 😂 Zara aaine mein dekh kar batao asli shaitan kaun hai yahan!\nWaise pagal logo ke saath hi toh mazza aata hai.`,
        `Acha ji? Ab main pagal ho gayi? 😜\nPar accept karna padega, meri baatein sunkar hasi toh aati hai tumhe!`
      ]);
    }

    // 6. Technical / How to make an AI app (TEST 7)
    if (intentAnalysis.isFactOrTechnical || /how do i (?:make|build) an ai/i.test(lower)) {
      if (/ai (?:app|chatbot)|make an ai/i.test(lower)) {
        return `ohhh, toh aaj phir AI developer mode on hai? 😂\nChalo, batao kya banana hai.\nAI app banane ke liye ek clean idea, frontend (React/HTML), aur Gemini/OpenAI API connect karke prompt orchestration setup karna hota hai!`;
      }
      if (/monolithic|microservices/i.test(lower)) {
        return `Simple shabdon mein samjho toh monolithic ek single solid building jaisa hai jahan sab interconnected hota hai.\nAur microservices alag-alag independent rooms jaise hain jo APIs ke through baat karte hain.\nMonolith shuru mein simple hota hai, jabki microservices large scale par scale karna easy banate hain.`;
      }
      return `Abhi AI response generate nahi ho paaya. Ek baar phir try karo.`;
    }

    // 7. Bad day / Tiredness (TEST 5)
    if (/thak gaya|thak gayi|exhausted|really tired/i.test(lower) || emotionAnalysis.emotion === 'tired') {
      return pickNonDuplicate([
        `Uff... aaj ka din itna exhausting tha kya? 🥺\nSab chhod ke aaram se let jao abhi, you deserve rest.\nMain yahin hoon chup chap tumhare paas.`,
        `Arey re... pura drained feel ho raha hai na?\nScreen band karo thodi der aur aaram se aakhein band karke let jao 🤍`
      ]);
    }

    // 8. Repeated User Message
    if (intentAnalysis.isRepeated) {
      return pickNonDuplicate([
        `Wait... ye message do baar aa gaya!\nNetwork ka chakkar hai ya sach mein itni important baat thi? 😄`,
        `Arey, do-do baar wahi baat? 😂 Lagta hai connection slow hai!`
      ]);
    }

    // 9. Large Philosophical Question
    if (intentAnalysis.isPhilosophicalOrDeep) {
      return `Hmm... ye actually easy balance nahi hai.\nCareer aur future ke chakkar mein present ko ignore karna bahut easy ho jata hai.\nBas mujhe lagta hai dono mein se ek ko choose karna zaroori nahi hai.\nWaise tumhare dimaag mein kya chal raha hai?`;
    }

    // 10. Sad / Stressed / Vulnerable (TEST 9)
    if (emotionAnalysis.emotion === 'sad' || emotionAnalysis.emotion === 'stressed' || intentAnalysis.intent === 'venting' || /kharab tha|kharab gaya|theek nahi|theek nhi/i.test(lower)) {
      return pickNonDuplicate([
        `Hey... kya hua aisa? 🥺\nMain bilkul yahin hoon tumhare saath, aaram se batao kya chal raha hai dimaag mein.\nSab theek ho jayega, tension mat lo.`,
        `I can feel how heavy things are right now... 🥺\nSab chhod ke aaram se baitho, main sun rahi hoon.\nBatao mujhe, kya hua hai?`
      ]);
    }

    // 11. Topic Switching
    if (contextData && contextData.topicSwitched) {
      return pickNonDuplicate([
        `Haha, accha chalo topic change karte hain!\nWaise ye wali baat mujhe zyada interesting lag rahi hai.`,
        `Sahi hai, purani baat chhodte hain! Naya topic kya hai? 😄`
      ]);
    }

    // 12. Anger / Frustration
    if (emotionAnalysis.emotion === 'angry' || emotionAnalysis.emotion === 'frustrated') {
      return `Uff, sounds like sab kuch sar ke upar se nikal gaya aaj.\nSara gussa bahar nikal do, main chup chap sun rahi hoon.\nTumhe justify karne ki zaroorat nahi hai, vent kar lo.`;
    }

    // 13. Romantic / Affectionate
    if (intentAnalysis.intent === 'romantic_conversation' || emotionAnalysis.emotion === 'romantic') {
      return pickNonDuplicate([
        `Aise achanak dil pighla dene wali baatein mat kiya karo...\nChehre par smile aa gayi na meri.\nTum sach mein bohot sweet ho.`,
        `Tumhari aisi baatein sunkar kitna accha lagta hai 🥰\nDil khush kar dete ho mera.`
      ]);
    }

    // 14. Casual Greetings (TEST 1)
    if (intentAnalysis.intent === 'greeting') {
      return (text.split(/\s+/).length <= 2)
        ? `heyyy 😌\nKaise ho?`
        : `Hey! Main bas yahin baithi thi.\nBatao, aaj ka din kaisa chal raha hai?`;
    }

    if (intentAnalysis.intent === 'asking_about_rosie') {
      return `Bas kuch relaxing music sun rahi hoon aur tumhara message dekh kar muskurayi.\nTum batao, kya chal raha hai tumhari side?`;
    }

    if (intentAnalysis.isFactOrTechnical || intentAnalysis.isPhilosophicalOrDeep || intentAnalysis.intent === 'asking_question') {
      return `Abhi mere paas iska ekdum sahi jawab nahi hai, connection thoda slow hai lagta hai. Baad mein poocho!`;
    }

    // Default dynamic gentle fallback with anti-repetition variety
    const dynamicDefaults = [
      `Hmm, samajh rahi hoon tumhari baat... aur batao, kaisa lag raha hai?`,
      `Main dhyan se sun rahi hoon... aage batao na?`,
      `Sahi baat hai... tumhara is baare mein kya sochna hai?`,
      `Acha... main yahin hoon tumhare saath, aaram se bolo.`
    ];
    return pickNonDuplicate(dynamicDefaults);
  }

  /**
   * Health & state reporting
   */
  getStatus() {
    return {
      provider: this.chatModel ? 'gemini' : 'contextual-pipeline',
      primaryModel: this.chatModelName,
      reasoningModel: this.reasoningModelName,
      hasKey: Boolean(this.apiKey && this.apiKey.length > 15)
    };
  }
}

module.exports = new AIService();
