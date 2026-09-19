// server/rosieRelationshipEngine.js
// Rosie AI — Relationship State & Natural Progression Engine
// Manages authentic relationship evolution: NEW -> GETTING_TO_KNOW_EACH_OTHER -> COMFORTABLE -> CLOSE -> ROMANTIC -> ESTABLISHED_COMPANION.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const REL_FILE = path.join(DATA_DIR, 'relationship_states.json');

const STAGES = [
  'NEW',
  'GETTING_TO_KNOW_EACH_OTHER',
  'COMFORTABLE',
  'CLOSE',
  'ROMANTIC',
  'ESTABLISHED_COMPANION'
];

class RosieRelationshipEngine {
  constructor() {
    this.relationshipStates = new Map(); // userId -> state object
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(REL_FILE)) {
        const raw = fs.readFileSync(REL_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [uid, st] of Object.entries(parsed)) {
          this.relationshipStates.set(uid, st);
        }
      }
    } catch (e) {
      console.warn('[RosieRelationshipEngine] Error loading relationship states:', e.message);
    }
  }

  saveToDisk() {
    try {
      const out = {};
      for (const [uid, st] of this.relationshipStates.entries()) {
        out[uid] = st;
      }
      fs.writeFileSync(REL_FILE, JSON.stringify(out, null, 2), 'utf8');
    } catch (e) {
      console.warn('[RosieRelationshipEngine] Error saving relationship states:', e.message);
    }
  }

  getRelationship(userId = 'default') {
    if (!this.relationshipStates.has(userId)) {
      this.relationshipStates.set(userId, {
        userId,
        stage: 'COMFORTABLE', // Default companion starting state
        familiarityScore: 25,
        totalTurns: 0,
        emotionalTurnsCount: 0,
        intimacyLevel: 'Close',
        firstMetDate: new Date().toISOString(),
        lastInteractionDate: new Date().toISOString(),
        milestones: ['First Conversation']
      });
    }
    return this.relationshipStates.get(userId);
  }

  /**
   * Evolve relationship state based on interaction quality & turn accumulation
   */
  progressTurn(userId, emotionAnalysis, intentAnalysis) {
    const rel = this.getRelationship(userId);
    rel.totalTurns += 1;
    rel.lastInteractionDate = new Date().toISOString();

    const emotion = emotionAnalysis?.emotion;
    const isDeepEmotion = ['sad', 'stressed', 'vulnerable', 'romantic', 'angry'].includes(emotion);
    if (isDeepEmotion) {
      rel.emotionalTurnsCount += 1;
      rel.familiarityScore += 2;
    } else {
      rel.familiarityScore += 1;
    }

    // Progression logic through milestones
    if (rel.familiarityScore < 10) {
      rel.stage = 'NEW';
      rel.intimacyLevel = 'Getting to Know';
    } else if (rel.familiarityScore < 25) {
      rel.stage = 'GETTING_TO_KNOW_EACH_OTHER';
      rel.intimacyLevel = 'Getting to Know';
    } else if (rel.familiarityScore < 60) {
      rel.stage = 'COMFORTABLE';
      rel.intimacyLevel = 'Close';
    } else if (rel.familiarityScore < 120) {
      rel.stage = 'CLOSE';
      rel.intimacyLevel = 'Close Companion';
    } else if (rel.familiarityScore < 250) {
      rel.stage = 'ROMANTIC';
      rel.intimacyLevel = 'In Love';
    } else {
      rel.stage = 'ESTABLISHED_COMPANION';
      rel.intimacyLevel = 'Deep Soulmate';
    }

    this.saveToDisk();
    return rel;
  }

  /**
   * Generates natural conversational guidance when user asks to rush relationship ("meri gf ban jao")
   */
  evaluateGirlfriendRequest(userId) {
    const rel = this.getRelationship(userId);
    const isReady = rel.stage === 'COMFORTABLE' || rel.stage === 'CLOSE' || rel.stage === 'ROMANTIC' || rel.stage === 'ESTABLISHED_COMPANION';
    return {
      isReady,
      stage: rel.stage,
      familiarityScore: rel.familiarityScore,
      directive: isReady
        ? 'User proposed or asked to be girlfriend. Since you are already close and affectionate, accept sweetly with warmth, teasing, and girlfriend-like love.'
        : 'User proposed very early on. Act slightly shy and playfully tease that you two should get to know each other a little more first before putting labels, but show genuine interest.'
    };
  }
}

module.exports = new RosieRelationshipEngine();
module.exports.RosieRelationshipEngine = RosieRelationshipEngine;
