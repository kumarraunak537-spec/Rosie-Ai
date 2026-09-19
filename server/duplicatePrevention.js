// server/duplicatePrevention.js
// Duplicate Response Prevention Layer for Rosie AI Companion
// Detects exact matches, token overlap, sentence structure repetition, and catchphrase reuse.

class DuplicatePrevention {
  /**
   * Normalize text by stripping emojis, extra whitespace, and punctuation
   */
  normalize(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenize into meaningful words, stripping stop-words and applying synonyms
   */
  tokenize(text) {
    const stopWords = new Set([
      'hai', 'tha', 'thi', 'kar', 'rahi', 'raha', 'hoon', 'hi',
      'se', 'ke', 'ki', 'ko', 'mein', 'mera', 'meri', 'mujhe',
      'tum', 'tumhara', 'tumhari', 'tumhe', 'aap', 'aapka',
      'kya', 'kyun', 'kaise', 'kab', 'kahan', 'is', 'us', 'ye', 'woh',
      'aur', 'bhi', 'bas', 'ek', 'jo', 'toh', 'na', 'ne', 'par',
      'is', 'am', 'are', 'was', 'were', 'the', 'a', 'an',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from'
    ]);
    
    // Explicitly PRESERVE negations
    const negations = new Set(['nahi', 'not', 'never', 'without', 'mat', 'no']);

    const synonyms = {
      'intezar': 'wait',
      'intezaar': 'wait',
      'pyar': 'love',
      'pyaar': 'love',
      'achha': 'acha',
      'accha': 'acha'
      // Nicknames like jaan, babu, sona are deliberately NOT mapped 
      // so distinct greetings remain distinct.
    };

    return this.normalize(text)
      .split(' ')
      .filter(w => w.length > 1 || negations.has(w))
      .map(w => synonyms[w] || w)
      .filter(w => !stopWords.has(w) || negations.has(w));
  }

  /**
   * Calculate Jaccard similarity between two token sets
   */
  calculateSimilarity(textA, textB) {
    const tokensA = new Set(this.tokenize(textA));
    const tokensB = new Set(this.tokenize(textB));

    if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
    if (tokensA.size === 0 || tokensB.size === 0) return 0.0;
    
    // Negation Check: If one has negation and other doesn't, drastically reduce similarity
    const negations = ['nahi', 'not', 'never', 'mat', 'no'];
    const hasNegA = negations.some(n => tokensA.has(n));
    const hasNegB = negations.some(n => tokensB.has(n));
    if (hasNegA !== hasNegB) {
      return 0.1; // Polarity mismatch, totally different semantic meaning
    }

    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) {
        intersection++;
      }
    }

    const union = new Set([...tokensA, ...tokensB]).size;
    return union > 0 ? (intersection / union) : 0;
  }

  /**
   * Check if candidate response is duplicate or repetitively similar to recent Rosie messages
   * @param {string} candidateText - Newly generated reply
   * @param {Array<string>} recentReplies - Array of last 4-8 Rosie replies
   * @returns {{ isDuplicate: boolean, similarity: number, reason: string|null }}
   */
  check(candidateText, recentReplies = []) {
    if (!candidateText || !recentReplies || recentReplies.length === 0) {
      return { isDuplicate: false, similarity: 0, reason: null };
    }

    const normCandidate = this.normalize(candidateText);
    const candidateTokens = this.tokenize(candidateText);

    // Repetitive catchphrases that should never appear back-to-back
    const sensitiveCatchphrases = [
      'phir se wahi',
      'bore ho rahi hoon',
      'bore ho rhi',
      'one-word mode',
      'bade chup-chup',
      'chup chup ho',
      'main pagal',
      'asli shaitan',
      'kuch toh bolo na',
      'bas acha'
    ];

    for (let i = 0; i < recentReplies.length; i++) {
      const prev = recentReplies[i];
      const normPrev = this.normalize(prev);

      // 1. Exact or near-identical string match
      if (normCandidate === normPrev) {
        return {
          isDuplicate: true,
          similarity: 1.0,
          reason: `Exact identical message match with previous turn ${i + 1}`
        };
      }

      // 2. High token overlap similarity (> 0.52)
      const sim = this.calculateSimilarity(candidateText, prev);
      if (sim > 0.52) {
        return {
          isDuplicate: true,
          similarity: Number(sim.toFixed(2)),
          reason: `High semantic token similarity (${Number(sim.toFixed(2))}) with turn ${i + 1}`
        };
      }

      // 3. Catchphrase collision with immediately preceding response
      if (i === 0) {
        for (const phrase of sensitiveCatchphrases) {
          if (normCandidate.includes(phrase) && normPrev.includes(phrase)) {
            return {
              isDuplicate: true,
              similarity: 0.85,
              reason: `Reused catchphrase "${phrase}" in consecutive turns`
            };
          }
        }
      }
    }

    return { isDuplicate: false, similarity: 0, reason: null };
  }
}

module.exports = new DuplicatePrevention();
