// server/semanticChunker.js
// ROSIE APP — CHAT MESSAGE SEGMENTATION & PACING ENGINE
// Technical Implementation Spec
//
// Pipeline:
// Response Generation (raw AI response)
//     ↓
// Response Planner        → decides 1, 2, or 3 messages
//     ↓
// Message Segmentation    → segmentRosieResponse() splits raw response into bubbles (never character splitting)
//     ↓
// Emoji Filtering         → emojiFilter() keeps authentic emojis, removes decorative spam
//     ↓
// Natural Pacing Engine   → naturalPacingEngine() adds variable typing delay between bubbles
//     ↓
// Chat Message Queue & UI → Renders bubbles sequentially with typing indicators

class SemanticChunker {
  /**
   * Main pipeline runner coordinating Planner, Segmentation, Emoji Filtering, and Pacing
   */
  chunk(rawText, emotionAnalysis = {}, taskType = 'chat', userMessage = '', plannedCount = null, parentUserMessageId = null) {
    if (!rawText || typeof rawText !== 'string') {
      return [{ text: 'Hey', emotion: 'casual', delay_ms: 450, parentUserMessageId }];
    }

    const clean = rawText.trim();

    // 1. Component 3: Response Planner - Decides 1, 2, or 3 messages
    const targetCount = this.decideMessageCount(clean, userMessage, emotionAnalysis, plannedCount);

    // 2. Component 1: segmentRosieResponse - Splits raw response into 1-3 natural thought bubbles
    const segmentedObj = this.segmentRosieResponse(clean, targetCount);
    let bubbleTexts = segmentedObj.messages || [clean];

    // 3. Component 2: emojiFilter - Keeps authentic emotional emojis, filters decorative spam
    bubbleTexts = this.emojiFilter(bubbleTexts, emotionAnalysis);

    // 4. Component 4: Natural Pacing Engine - Adds variable, humanized typing delay between bubbles
    const finalChunks = this.naturalPacingEngine(bubbleTexts, emotionAnalysis).map(chunk => {
      chunk.parentUserMessageId = parentUserMessageId;
      return chunk;
    });
    
    console.log(`[RUNTIME TRACE] CHUNKER OUTPUT (${finalChunks.length} bubbles):`, finalChunks.map(c => c.text));
    
    return finalChunks;
  }

  // ============================================================
  // COMPONENT 1 — segmentRosieResponse()
  // ============================================================
  /**
   * Splits complete raw AI response into 1, 2, or 3 natural thought bubbles
   * @param {string} rawResponse - Complete raw AI response
   * @param {number} targetCount - Planned count (1, 2, or 3)
   * @returns {{ messages: string[] }}
   */
  segmentRosieResponse(rawResponse, targetCount = 2) {
    if (!rawResponse || typeof rawResponse !== 'string') {
      return { messages: [] };
    }

    const clean = rawResponse.trim();
    if (!clean) return { messages: [] };

    // 1. Detect transcript hallucination (e.g., model outputs "User: hello \n Rosie: hi")
    let rawLines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
    
    // If we detect a transcript, only take the lines up to the first "User:" / "Me:"
    const userIndex = rawLines.findIndex(l => /^(User|Me|Human):/i.test(l));
    if (userIndex !== -1) {
      rawLines = rawLines.slice(0, userIndex);
    }
    
    // Strip "Rosie:", "Bot:", "AI:" from remaining lines
    rawLines = rawLines.map(l => l.replace(/^(Rosie|Bot|AI):\s*/i, '').trim()).filter(Boolean);

    let candidates = [];

    if (rawLines.length > 1) {
      for (const line of rawLines) {
        const cleaned = this.cleanBubbleText(line);
        if (cleaned) {
          const sub = this.splitLongThought(cleaned);
          candidates.push(...sub);
        }
      }
    } else {
      // Single paragraph received -> Decompose into natural thought units
      candidates = this.decomposeParagraphIntoThoughts(clean);
    }

    // If targetCount is 1, but total words > 14, allow at most 2 bubbles (never 3 for short responses)
    let effectiveTarget = targetCount;
    const totalWords = clean.split(/\s+/).filter(Boolean).length;
    if (effectiveTarget === 1 && totalWords > 14) {
      effectiveTarget = 2;
    }

    // Condense or balance to targetCount (max 3)
    const maxTarget = Math.min(3, Math.max(1, effectiveTarget));
    if (candidates.length > maxTarget) {
      candidates = this.condenseToCount(candidates, maxTarget);
    } else if (candidates.length < maxTarget && candidates.length === 1 && candidates[0].split(/\s+/).length > 8) {
      const sub = this.splitLongThought(candidates[0]);
      if (sub.length > 1) {
        candidates = sub;
      }
    }

    // Safety: Ensure at least 1 and at most maxTarget bubbles
    if (candidates.length > maxTarget) {
      candidates = this.condenseToCount(candidates, maxTarget);
    }
    if (candidates.length === 0) {
      candidates = [clean];
    }

    // Final safety pass: enforce <= 15 words per bubble (never a giant wall of text)
    let finalBubbles = [];
    for (const b of candidates) {
      const cleanedB = this.cleanBubbleText(b);
      if (!cleanedB) continue;
      const words = cleanedB.split(/\s+/).filter(Boolean);
      if (words.length <= 15) {
        finalBubbles.push(cleanedB);
      } else {
        const sub = this.splitLongThought(cleanedB);
        if (sub.length > 1 && sub.every(s => s.split(/\s+/).length <= 15)) {
          finalBubbles.push(...sub);
        } else {
          for (let i = 0; i < words.length; i += 12) {
            finalBubbles.push(words.slice(i, i + 12).join(' '));
          }
        }
      }
    }

    const maxAllowed = Math.min(3, Math.max(1, effectiveTarget));
    if (finalBubbles.length > maxAllowed) {
      finalBubbles = this.condenseToCount(finalBubbles, maxAllowed);
      // Removed the arbitrary 15-word truncation that was breaking sentences.
    }

    return {
      messages: finalBubbles.map(c => this.cleanBubbleText(c)).filter(Boolean)
    };
  }

  // ============================================================
  // COMPONENT 2 — emojiFilter()
  // ============================================================
  /**
   * Filters emojis per natural authenticity rules:
   * - Not every message needs an emoji.
   * - Strip purely decorative emojis.
   * - Keep emojis carrying genuine emotional meaning.
   * - Max 1 emoji per bubble.
   * - Do not put emoji in every single bubble back-to-back.
   * @param {string[]} messages - Array of thought bubble texts
   * @param {object} emotionContext - Detected emotion & tone
   * @returns {string[]} Filtered thought bubble texts
   */
  emojiFilter(messages, emotionContext = {}) {
    const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;
    const primaryEmotion = (emotionContext.emotion || 'neutral').toLowerCase();

    // Step A: Deduplicate stacked/consecutive emojis (e.g. "😂😂" -> "😂", "❤️❤️" -> "❤️")
    let cleaned = messages.map(text => {
      return text.replace(/([\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}])\s*[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]+/gu, '$1');
    });

    // Step B: Ensure maximum 1 emoji per individual bubble
    cleaned = cleaned.map(text => {
      const matches = text.match(emojiRegex);
      if (!matches || matches.length <= 1) return text;
      let seen = false;
      return text.replace(emojiRegex, (match) => {
        if (!seen) {
          seen = true;
          return match;
        }
        return '';
      }).replace(/\s{2,}/g, ' ').trim();
    });

    // Step C: Contextual & Emotional check
    const emotionalKeywords = /(?:cute|pagal|sharma|miss|aaram|masti|sweet|pyaar|shaitan|haha|aww|uff|blush|hug|love|smile|bura|gussa|ziddi)/i;
    const genuineEmotionalCategories = ['playful', 'romantic', 'caring', 'affectionate', 'teasing', 'vulnerable', 'blushing', 'sad'];

    const fullTurn = cleaned.join(' ');
    const isGenuinelyEmotional = genuineEmotionalCategories.includes(primaryEmotion) || emotionalKeywords.test(fullTurn);

    // If NOT genuinely emotional (casual, neutral, factual, greeting, acknowledgment):
    // Strip ALL emojis -> 0 emojis!
    if (!isGenuinelyEmotional) {
      return cleaned.map(text => text.replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
    }

    // If genuinely emotional: Avoid putting emojis in every single bubble back-to-back
    // Allow at most 1 emoji across the entire turn (or at most 1 on the single most expressive bubble)
    let bestIdx = -1;
    let maxScore = -1;

    cleaned.forEach((text, idx) => {
      let score = 0;
      if (emojiRegex.test(text)) score += 1;
      if (emotionalKeywords.test(text)) score += 2;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = idx;
      }
    });

    if (bestIdx === -1) {
      bestIdx = cleaned.length - 1;
    }

    return cleaned.map((text, idx) => {
      if (idx === bestIdx) {
        return text.trim();
      } else {
        // Strip emojis from non-primary bubbles to avoid back-to-back spam
        return text.replace(emojiRegex, '').replace(/\s{2,}/g, ' ').trim();
      }
    }).filter(Boolean);
  }

  // ============================================================
  // COMPONENT 3 — Response Planner (Thought Count Decider)
  // ============================================================
  /**
   * Decides how many natural thoughts the response should be broken into (1, 2, or 3)
   */
  decideMessageCount(cleanText, userMessage, emotionAnalysis, plannedCount) {
    const totalWords = cleanText.split(/\s+/).filter(Boolean).length;
    const userWords = (userMessage || '').trim().split(/\s+/).filter(Boolean).length;
    const userLower = (userMessage || '').trim().toLowerCase();

    // 1. Very short reaction (<= 5 words) -> 1 bubble
    if (totalWords <= 5) {
      return 1;
    }

    // 2. User sent dry or one-word message ("acha", "hmm", "ok", "haan", "theek") -> 1 bubble
    if (userWords <= 2 && /^(acha|achha|hmm|haan|ok|okay|fine|theek|sahi|nice|cool|gn|gm)$/i.test(userLower)) {
      return 1;
    }

    // 3. Simple greeting ("Hi", "Hello") -> 1 bubble
    if (/^(hi|hii|hello|hey|heyy)$/i.test(userLower)) {
      return 1;
    }

    // 4. If plannedCount is explicitly provided from higher-level planner, respect it (capped at 3)
    if (plannedCount && typeof plannedCount === 'number' && plannedCount >= 1) {
      return Math.min(3, Math.max(1, plannedCount));
    }

    // 5. Normal conversational thought (6 to 18 words) -> 2 bubbles
    if (totalWords <= 18) {
      return 2;
    }

    // 6. Longer conversational thought (> 18 words) -> 3 bubbles (maximum 3)
    return 3;
  }

  // ============================================================
  // COMPONENT 4 — Natural Pacing Engine
  // ============================================================
  /**
   * Adds variable, humanized typing delay between bubbles.
   * Varies within a realistic range, scaled to bubble length with organic jitter.
   * @param {string[]} messages - Cleaned thought messages
   * @param {object} emotionContext - Emotion context
   * @returns {Array<{text: string, emotion: string, delay_ms: number}>}
   */
  naturalPacingEngine(messages, emotionContext = {}) {
    return messages.map((text, idx) => {
      const delay = this.calculateTypingDelay(text, idx);
      const emotion = this.inferChunkEmotion(text, emotionContext.emotion);
      return {
        text,
        emotion,
        delay_ms: delay
      };
    });
  }

  /**
   * Length & context-aware typing delay calculation
   * Considers: character count, word count, short reaction recognition, and sequence index
   */
  calculateTypingDelay(text, index) {
    const clean = (text || '').trim();
    const charCount = clean.length;
    const isShortReaction = /^(haan|nahi|acha|achha|ohh|hmm|okay|ok|really\??|sach\??|wait|aww|uff|arre|sachi\??)$/i.test(clean.replace(/[.,!?…]/g, '').trim());

    // Organic subtle jitter (-35ms to +35ms) to ensure it's not mechanical
    const jitter = Math.floor(Math.random() * 70) - 35;

    // Special case: First bubble in the response sequence
    // (User already experienced the network roundtrip waiting for AI response)
    if (index === 0) {
      if (isShortReaction || charCount <= 6) {
        // Very fast: 180ms - 320ms
        return Math.max(180, Math.min(320, 190 + charCount * 12 + jitter));
      } else if (charCount <= 20) {
        // Fast: 260ms - 420ms
        return Math.max(260, Math.min(420, 240 + charCount * 8 + jitter));
      } else {
        // Moderate: 340ms - 480ms (lively response immediately following network roundtrip)
        return Math.max(340, Math.min(480, 310 + Math.min(40, charCount) * 4 + jitter));
      }
    }

    // Subsequent bubbles (Bubble 2 and Bubble 3 in sequence)
    if (isShortReaction || charCount <= 5) {
      // 1-5 chars (e.g. "haan", "hmm", "ok") -> 250 - 600ms
      return Math.max(250, Math.min(600, 280 + charCount * 30 + jitter));
    } else if (charCount <= 15) {
      // 6-15 chars (e.g. "acha really?", "samajh gayi") -> 400 - 900ms
      return Math.max(400, Math.min(900, 390 + charCount * 28 + jitter));
    } else if (charCount <= 35) {
      // 16-35 chars (e.g. "haan mujhe samajh aa gaya") -> 700 - 1400ms
      return Math.max(700, Math.min(1400, 580 + charCount * 20 + jitter));
    } else {
      // 36-70+ chars (e.g. "wait, tum seriously ye keh rahe ho?") -> 1000 - 1800ms
      return Math.max(1000, Math.min(1800, 850 + charCount * 12 + jitter));
    }
  }

  // ============================================================
  // THOUGHT BOUNDARY SPLITTING UTILITIES (NEVER RAW CHARACTER CUTS)
  // ============================================================
  /**
   * Split a long thought (> 12 words) at natural punctuation or conversational conjunction
   */
  splitLongThought(thought) {
    if (!thought) return [];
    const words = thought.split(/\s+/).filter(Boolean);
    if (words.length <= 12) return [thought];

    // Priority 1: Punctuation breaks (. ! ? … ; , : -)
    const punctRegex = /([.!?…;:\-]+|\s*,\s*)(?=\s+[A-Za-z\u0900-\u097F])/;
    const punctMatch = thought.match(punctRegex);
    if (punctMatch && punctMatch.index > 6 && (thought.length - punctMatch.index) > 6) {
      const part1 = thought.slice(0, punctMatch.index).trim();
      const part2 = thought.slice(punctMatch.index + punctMatch[0].length).trim();
      if (part1.split(/\s+/).length >= 2 && part2.split(/\s+/).length >= 2) {
        return [part1, part2];
      }
    }

    // Priority 2: Natural Hindi/English conjunctions & clause connectors
    const clauseRegex = /\s+(?:toh|aur|par|waise|lekin|phir|chalo|ruk|ab|isliye|kyunki|but|and|so|when|then|because|like|that)\s+/i;
    const match = thought.match(clauseRegex);
    if (match && match.index > 6) {
      const part1 = thought.slice(0, match.index).trim();
      const part2 = thought.slice(match.index + match[0].length).trim();
      if (part1.split(/\s+/).length >= 2 && part2.split(/\s+/).length >= 2) {
        return [part1, part2];
      }
    }

    // Priority 3: Fallback split near midpoint if word count exceeds 14 words
    if (words.length > 14) {
      const mid = Math.floor(words.length / 2);
      const part1 = words.slice(0, mid).join(' ').trim();
      const part2 = words.slice(mid).join(' ').trim();
      return [part1, part2];
    }

    return [thought];
  }

  /**
   * Decompose a paragraph into 2-3 independent conversational thought units
   */
  decomposeParagraphIntoThoughts(paragraph) {
    if (!paragraph) return [];

    const rawSentences = this.splitIntoSentences(paragraph);
    const thoughts = [];

    for (const sent of rawSentences) {
      const cleanSent = sent.trim();
      if (!cleanSent) continue;

      // Standalone interjections ("Awww...", "Hmm...", "Ufff...", "achhaaa", "really?", "wait 😂")
      const interjectionMatch = cleanSent.match(/^(aww+[.!?…]*|hmm+[.!?…]*|uff+[.!?…]*|achha+[.!?…]*|heyy+[.!?…]*|ruko+[.!?…]*|arre+[.!?…]*|really\?*|wait\s*😂?)\s*(.*)/i);
      if (interjectionMatch && interjectionMatch[2] && interjectionMatch[2].length > 4) {
        thoughts.push(interjectionMatch[1].trim());
        const remainder = interjectionMatch[2].trim();
        const sub = this.splitLongThought(remainder);
        thoughts.push(...sub);
      } else {
        const sub = this.splitLongThought(cleanSent);
        thoughts.push(...sub);
      }
    }

    if (thoughts.length === 0) {
      return [paragraph];
    }

    // If still just 1 thought and words > 9, try clause splitting
    if (thoughts.length === 1 && paragraph.split(/\s+/).length > 9) {
      const sub = this.splitLongThought(paragraph);
      if (sub.length > 1) return sub;
    }

    return thoughts;
  }

  /**
   * Split paragraph into sentences preserving decimals, abbreviations, and ellipses
   */
  splitIntoSentences(paragraph) {
    if (!paragraph) return [];

    const token = '___SENT_BREAK___';
    let text = paragraph;

    // Protect known abbreviations & ellipses
    text = text.replace(/\.{3,}/g, '…');
    text = text.replace(/(\d+)\.(\d+)/g, '$1___DECIMAL___$2');

    // Mark sentence breaks (. ! ? | and Hindi danda ।)
    text = text.replace(/([.!?।]+)(\s+|$)/g, `$1${token}`);

    const parts = text.split(token)
      .map(s => s.replace(/___DECIMAL___/g, '.').trim())
      .filter(Boolean);

    return parts;
  }

  /**
   * Condense an array of bubbles down to target count (e.g. 2 or 3) without losing meaning
   */
  condenseToCount(bubbles, target) {
    if (bubbles.length <= target) return bubbles;

    const result = [...bubbles];
    while (result.length > target) {
      // Find the shortest adjacent pair to merge
      let shortestPairIdx = 0;
      let minCombinedLen = Infinity;

      for (let i = 0; i < result.length - 1; i++) {
        const combinedLen = result[i].length + result[i + 1].length;
        if (combinedLen < minCombinedLen) {
          minCombinedLen = combinedLen;
          shortestPairIdx = i;
        }
      }

      const merged = `${result[shortestPairIdx]} ${result[shortestPairIdx + 1]}`.trim();
      result.splice(shortestPairIdx, 2, merged);
    }

    return result;
  }

  /**
   * Strip accidental bubble numbering or quotes
   */
  cleanBubbleText(text) {
    if (!text) return '';
    return text
      .replace(/^(?:Bubble|Message|\d+)[\s.:-]+\s*/i, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Infer emotion nuance per thought chunk
   */
  inferChunkEmotion(chunkText, primaryEmotion = 'neutral') {
    const lower = chunkText.toLowerCase();
    if (/😂|haha|pagal|shaitan|drama|masti/i.test(lower)) return 'playful';
    if (/❤️|miss|jaan|pyaar|blush|🙈|sweet/i.test(lower)) return 'romantic';
    if (/🥺|aww|chalo koi na|rest|so jao|aaram|relax/i.test(lower)) return 'caring';
    if (/👀|kya|sachi|seriously|wait|ruko/i.test(lower)) return 'curious';
    return primaryEmotion;
  }
}

const semanticChunker = new SemanticChunker();

module.exports = semanticChunker;
module.exports.SemanticChunker = SemanticChunker;
module.exports.RosieMessageSegmenter = SemanticChunker;
module.exports.RosieEmojiFilter = SemanticChunker;
module.exports.RosieEmojiEngine = SemanticChunker;
module.exports.RosiePacingEngine = SemanticChunker;
module.exports.segmentRosieResponse = semanticChunker.segmentRosieResponse.bind(semanticChunker);
module.exports.emojiFilter = semanticChunker.emojiFilter.bind(semanticChunker);
module.exports.filterRosieEmojis = semanticChunker.emojiFilter.bind(semanticChunker);
module.exports.naturalPacingEngine = semanticChunker.naturalPacingEngine.bind(semanticChunker);
module.exports.calculateTypingDelay = semanticChunker.calculateTypingDelay.bind(semanticChunker);

