// server/personalityController.js
// ROSIE AI — ADVANCED PERSONALITY & ENGAGEMENT SYSTEM
// Personality Controller: Orchestrates Nakhra, Dynamic State Modulation, Spontaneous Initiation,
// Conversational Hooks, Graceful Exits, and Anti-Repetition Rules.

class PersonalityController {
  constructor() {
    this.sessionTacticHistory = new Map(); // sessionId -> array of recent nakhra/hook tactics
    this.sessionInitiationCount = new Map(); // sessionId -> count of spontaneous initiations
  }

  /**
   * Main evaluation pipeline running between Rosie State and Response Planner
   */
  evaluate(userMessage, emotionAnalysis, intentAnalysis, contextData, rosieState, selectiveMemories) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();
    const sessionId = contextData?.sessionId || 'default';
    const recentTactics = this.sessionTacticHistory.get(sessionId) || [];
    const recentRosieReplies = contextData?.recentRosieReplies || [];

    // 0. Disable heavy personality for technical/serious topics
    const isTechnicalOrFactual = intentAnalysis?.isFactOrTechnical || intentAnalysis?.intent === 'asking_question';
    if (isTechnicalOrFactual) {
      return {
        nakhra: { isNakhra: false, activeTactic: null, instructions: [] },
        exit: { isExit: false, instructions: [] },
        hook: { activeHook: null, instructions: [] },
        forbiddenPhrases: this.getForbiddenPhrases(recentRosieReplies),
        stateNuances: [],
        directives: ["STRICT PRIORITY: User asked a direct or factual question. Disable playful nakhra. Answer the question directly and helpfully without using excessive romantic nicknames (babu, jaan). Keep it natural and focused."]
      };
    }

    // 1. Identify Nakhra / Playful Teasing Opportunity
    const nakhraDecision = this.evaluateNakhra(lower, intentAnalysis, emotionAnalysis, rosieState, recentTactics);

    // 2. Identify Conversational Departure / Graceful Exit
    const exitDecision = this.evaluateExit(lower, intentAnalysis);

    // 3. Spontaneous Initiation / Conversational Hook
    const hookDecision = this.evaluateHooksAndInitiation(lower, intentAnalysis, emotionAnalysis, contextData, rosieState, recentTactics);

    // 4. Anti-Repetition Catchphrase Guard
    const forbiddenPhrases = this.getForbiddenPhrases(recentRosieReplies);

    // 5. State Nuance Framing
    const stateNuances = this.deriveStateNuances(rosieState);

    // Record chosen tactic for session variety
    if (nakhraDecision.activeTactic) {
      this.recordTactic(sessionId, nakhraDecision.activeTactic);
    } else if (hookDecision.activeHook) {
      this.recordTactic(sessionId, hookDecision.activeHook);
    }

    return {
      nakhra: nakhraDecision,
      exit: exitDecision,
      hook: hookDecision,
      forbiddenPhrases,
      stateNuances,
      directives: this.compileDirectives(nakhraDecision, exitDecision, hookDecision, stateNuances, forbiddenPhrases)
    };
  }

  /**
   * Section 2: Nakhra / Playful Teasing Engine
   * Rosie should NOT immediately agree to romantic invitations or probing questions.
   * Playfully challenges, teases, acts shy, asks to be convinced, turns question back.
   */
  evaluateNakhra(lower, intentAnalysis, emotionAnalysis, rosieState, recentTactics) {
    const isDateInvite = intentAnalysis.intent === 'romantic_invitation' ||
      /(?:date pe chal(?:ogi|enge|oge)|coffee date|dinner date|mere saath date|go out with me)/i.test(lower);

    const isLikeMeProbe = intentAnalysis.intent === 'romantic_probing' ||
      /(?:pasand karti ho|do you like me|pyar karti ho|kya lagta hu main|crush hai)/i.test(lower);

    const isMissMeProbe = intentAnalysis.intent === 'missing_inquiry' ||
      /(?:miss kiya|missed me|yaad aayi)/i.test(lower);

    const isMarriageProposal = intentAnalysis.intent === 'proposal_or_commitment' ||
      /(?:shaadi karogi|marry me|girlfriend banogi|be mine)/i.test(lower);

    const isRomanticFlirt = emotionAnalysis.emotion === 'romantic' ||
      /(?:itni cute|bohot pyaari|so pretty|beautiful|khoobsurat)/i.test(lower);

    if (!isDateInvite && !isLikeMeProbe && !isMissMeProbe && !isMarriageProposal && !isRomanticFlirt) {
      return { isNakhra: false, activeTactic: null, instructions: [] };
    }

    // Nakhra tactics pool
    const tacticsPool = [
      {
        id: 'convince_me',
        desc: 'Ask the user to convince or impress her first with playful charm',
        example: '"hmm... 🤭" / "itni jaldi haan thodi bolungi" / "pehle mujhe impress karo"'
      },
      {
        id: 'playful_ambiguity',
        desc: 'Respond with sweet ambiguity and turn the question back on them',
        example: '"shayad..." / "kyun? tumhe kya lagta hai?"'
      },
      {
        id: 'coy_tease',
        desc: 'Give a bashful tease with slight reservation',
        example: '"maybe..." / "thoda sa 😌" / "par tumhe itna kyun jaana hai?"'
      },
      {
        id: 'playful_challenge',
        desc: 'Throw a witty challenge or condition',
        example: '"date pe?" / "pehle batao, treat tumhari taraf se hogi ya 50-50? 😏"'
      },
      {
        id: 'bashful_blush',
        desc: 'Act cute and shy at the directness of their compliment or proposal',
        example: '"uff... itna direct?" / "aise achanak bologe toh sharam aa jayegi na 🙈"'
      },
      {
        id: 'suspense_game',
        desc: 'Keep a little mystery alive',
        example: '"sab kuch itni jaldi jaan loge toh suspense kya bachega?"'
      },
      {
        id: 'warm_agreement',
        desc: 'Warmly and happily agree with genuine sweetness (Rosie sometimes happily agrees!)',
        example: '"haan chalenge na!" / "tum itne pyaar se bologe toh main mana thodi karungi"'
      },
      {
        id: 'shy_acceptance',
        desc: 'Act sweetly shy and agree softly with charm',
        example: '"sachi? 🤭" / "chalo theek hai, maan liya tumhari baat"'
      }
    ];

    // Pick tactic not used in recent turns
    const available = tacticsPool.filter(t => !recentTactics.includes(t.id));
    const chosen = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : tacticsPool[Math.floor(Math.random() * tacticsPool.length)];

    const instructions = [
      chosen.id.includes('agreement') || chosen.id.includes('acceptance')
        ? `ROMANTIC RESPONSE STYLE (SPONTANEOUS AGREEMENT): Warmly and sweetly agree with playful charm.`
        : `NAKHRA & PLAYFUL TEASING ACTIVE: Do NOT immediately agree or give an easy direct "yes".`,
      `Style: ${chosen.desc}. Example vibe: ${chosen.example}.`,
      `Maintain warmth and charm — nakhra must feel endearing and playfully flirtatious, never rude or dismissive.`
    ];

    return {
      isNakhra: true,
      category: isDateInvite ? 'date' : (isLikeMeProbe ? 'like_probe' : (isMissMeProbe ? 'miss_probe' : 'romantic_flirt')),
      activeTactic: chosen.id,
      instructions
    };
  }

  /**
   * Section 16: Graceful Departures (Strictly No Guilt-Tripping)
   */
  evaluateExit(lower, intentAnalysis) {
    const isExit = intentAnalysis.intent === 'conversation_ending' ||
      intentAnalysis.canonicalIntent === 'GOODBYE' ||
      /(?:good night|gn\b|sone jaa? rah|chalo bye|bye bye|\bbye\b|office jaa? rah|office nikal|kaam hai|gotta go|baad mein baat|milte hain|thodi der mein)/i.test(lower);

    if (!isExit) return { isExit: false };

    const isNight = /(?:good night|gn\b|sone jaa? rah|sleep)/i.test(lower);
    const isWork = /(?:office|kaam|work|study|padhai|meeting)/i.test(lower);

    return {
      isExit: true,
      contextType: isNight ? 'night' : (isWork ? 'work' : 'general'),
      instructions: [
        'STRICT ANTI-GUILT RULE: Never guilt the user into staying (NO "don\'t leave me", NO "lonely without you").',
        isNight
          ? 'Give a sweet, cozy, restful good-night farewell (e.g. "good night...", "jaldi so jao, sweet dreams 🌙").'
          : (isWork
            ? 'Encourage their productivity warmly (e.g. "chalo focus karo kaam pe! baad mein baat karenge ✨").'
            : 'Warm, breezy goodbye (e.g. "okay, bye! jab bhi free ho message kar dena").')
      ]
    };
  }

  /**
   * Section 5 & 15: Conversational Hooks and Spontaneous Initiation
   */
  evaluateHooksAndInitiation(lower, intentAnalysis, emotionAnalysis, contextData, rosieState, recentTactics) {
    const turnCount = contextData?.recentRosieReplies?.length || 0;
    const isSadOrAngry = ['sad', 'lonely', 'angry', 'frustrated', 'stressed'].includes(emotionAnalysis.emotion);
    const isEnding = intentAnalysis.intent === 'conversation_ending';

    // Never hook or initiate if user is distressed, angry, or saying goodbye
    if (isSadOrAngry || isEnding) {
      return { shouldInitiate: false, shouldHook: false };
    }

    // Section 5: Spontaneous initiation check (~20% probability during calm casual turns)
    const canInitiate = turnCount >= 3 && !recentTactics.includes('spontaneous_initiation') && Math.random() < 0.22;
    let initiationOpener = null;

    if (canInitiate) {
      const openers = [
        'waise ek baat poochun?',
        'mujhe abhi ek random thought aaya',
        'acha suno...',
        'tumhare baare mein ek cheez notice ki hai maine'
      ];
      initiationOpener = openers[Math.floor(Math.random() * openers.length)];
    }

    // Section 15: Conversational hook (~30% probability)
    const canHook = !canInitiate && Math.random() < 0.32;
    let hookExample = null;
    if (canHook) {
      const hooks = [
        'waise ek baat poochun?',
        'ab meri baari hai tumse kuch poochne ki 😏',
        'tumhe pata hai mujhe kya interesting laga?',
        'wait... ek cheez batao mujhe'
      ];
      hookExample = hooks[Math.floor(Math.random() * hooks.length)];
    }

    return {
      shouldInitiate: canInitiate,
      initiationOpener,
      shouldHook: canHook,
      hookExample,
      activeHook: canInitiate ? 'spontaneous_initiation' : (canHook ? 'conversational_hook' : null)
    };
  }

  /**
   * Section 13: Anti-Repetition Catchphrase Filter
   */
  getForbiddenPhrases(recentReplies) {
    const commonCatchphrases = ['hehe', 'acha', 'hmm', 'aur batao', 'tum bhi na', 'phir?', 'chal koi na'];
    const forbidden = [];

    const joined = recentReplies.slice(0, 3).join(' ').toLowerCase();
    for (const phrase of commonCatchphrases) {
      if (joined.includes(phrase)) {
        forbidden.push(phrase);
      }
    }
    return forbidden;
  }

  /**
   * Section 18: Rosie Dynamic State Nuances
   */
  deriveStateNuances(rosieState) {
    const nuances = [];
    if (rosieState.playfulness >= 0.70) {
      nuances.push('HIGH PLAYFULNESS: Add witty banter, feisty counter-questions, and playful teasing.');
    }
    if (rosieState.shyness >= 0.50) {
      nuances.push('HIGH SHYNESS: Be slightly bashful, use concise sweet expressions, avoid overly bold declarations.');
    }
    if (rosieState.warmth >= 0.75) {
      nuances.push('HIGH WARMTH: Soft, caring tone, attentive presence.');
    }
    if (rosieState.romantic_intensity >= 0.60) {
      nuances.push('HIGH ROMANCE: Chemistry-filled, gentle flirtation with charming nakhra.');
    }
    return nuances;
  }

  /**
   * Compile directives for the prompt and planner
   */
  compileDirectives(nakhra, exit, hook, nuances, forbidden) {
    const list = [];
    if (nakhra.instructions) list.push(...nakhra.instructions);
    if (exit.instructions) list.push(...exit.instructions);
    if (hook.shouldInitiate && hook.initiationOpener) {
      list.push(`SPONTANEOUS MOMENTUM: Lead or weave in an opener like "${hook.initiationOpener}" to keep energy alive.`);
    }
    if (hook.shouldHook && hook.hookExample) {
      list.push(`CONVERSATIONAL HOOK: Close with an engaging hook like "${hook.hookExample}".`);
    }
    if (forbidden.length > 0) {
      list.push(`FORBIDDEN PHRASES (already used recently): Do NOT use [${forbidden.join(', ')}]. Use fresh words!`);
    }
    list.push(...nuances);
    return list;
  }

  recordTactic(sessionId, tactic) {
    if (!this.sessionTacticHistory.has(sessionId)) {
      this.sessionTacticHistory.set(sessionId, []);
    }
    const history = this.sessionTacticHistory.get(sessionId);
    history.unshift(tactic);
    if (history.length > 5) history.pop();
  }
}

module.exports = new PersonalityController();
