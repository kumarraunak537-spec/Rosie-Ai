// server/rosieUserProfile.js
// Rosie AI — Personalized User Profile & Preference System
// Stores non-sensitive learned user preferences with confidence scoring, evidence tracking, and disk persistence.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'user_profile.json');

class RosieUserProfile {
  constructor() {
    this.profiles = new Map(); // userId -> profile object
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(PROFILE_FILE)) {
        const raw = fs.readFileSync(PROFILE_FILE, 'utf8');
        const data = JSON.parse(raw);
        for (const [userId, prof] of Object.entries(data)) {
          this.profiles.set(userId, prof);
        }
      }
    } catch (e) {
      console.warn('[RosieUserProfile] Error reading profile file, using memory storage:', e.message);
    }
  }

  saveToDisk() {
    try {
      const data = {};
      for (const [userId, prof] of this.profiles.entries()) {
        data[userId] = prof;
      }
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('[RosieUserProfile] Error saving user profile:', e.message);
    }
  }

  getProfile(userId = 'default') {
    if (!this.profiles.has(userId)) {
      this.profiles.set(userId, {
        userId,
        nickname: null,
        languageStyle: { value: 'Hinglish', confidence: 0.95, source: 'default', lastUpdated: new Date().toISOString() },
        favoriteTopics: [],
        hobbies: [],
        likes: [],
        dislikes: [],
        avoidTopics: [],
        explicitMemories: [],
        frequentlyDiscussedTopics: {},
        preferences: {
          likesTeasing: { value: true, confidence: 0.70, source: 'default', lastUpdated: new Date().toISOString() },
          prefersShortBubbles: { value: true, confidence: 0.75, source: 'default', lastUpdated: new Date().toISOString() },
          romanticAppetite: { value: 'moderate', confidence: 0.65, source: 'default', lastUpdated: new Date().toISOString() },
          humorStyle: { value: 'witty_playful', confidence: 0.70, source: 'default', lastUpdated: new Date().toISOString() }
        },
        interactionMetrics: {
          totalTurns: 0,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        }
      });
    }
    return this.profiles.get(userId);
  }

  /**
   * Update or reinforce a behavioral preference with confidence accumulation
   */
  updatePreference(userId, key, value, evidenceSource = 'behavioral_analysis') {
    const prof = this.getProfile(userId);
    if (!prof.preferences[key]) {
      prof.preferences[key] = {
        value,
        confidence: 0.60,
        source: evidenceSource,
        lastUpdated: new Date().toISOString()
      };
    } else {
      const curr = prof.preferences[key];
      if (curr.value === value) {
        // Reinforce signal
        curr.confidence = Math.min(0.98, Number((curr.confidence + 0.08).toFixed(2)));
      } else {
        // Contradictory signal reduces confidence or flips if confidence drops
        curr.confidence = Number((curr.confidence - 0.15).toFixed(2));
        if (curr.confidence <= 0.40) {
          curr.value = value;
          curr.confidence = 0.55;
        }
      }
      curr.source = evidenceSource;
      curr.lastUpdated = new Date().toISOString();
    }
    this.saveToDisk();
  }

  /**
   * Add or reinforce a user interest/topic
   */
  trackTopic(userId, topicName) {
    if (!topicName || typeof topicName !== 'string') return;
    const clean = topicName.trim().toLowerCase();
    const prof = this.getProfile(userId);
    prof.frequentlyDiscussedTopics[clean] = (prof.frequentlyDiscussedTopics[clean] || 0) + 1;
    if (!prof.favoriteTopics.includes(clean) && prof.frequentlyDiscussedTopics[clean] >= 3) {
      prof.favoriteTopics.push(clean);
    }
    this.saveToDisk();
  }

  /**
   * Add a like or dislike
   */
  addAffinity(userId, type, item) {
    if (!item) return;
    const prof = this.getProfile(userId);
    const target = type === 'dislike' ? prof.dislikes : prof.likes;
    if (!target.includes(item)) {
      target.push(item);
      this.saveToDisk();
    }
  }

  /**
   * Record explicitly requested memory by user ("ye baat yaad rakhna")
   */
  addExplicitMemory(userId, factText) {
    if (!factText) return;
    const prof = this.getProfile(userId);
    if (!prof.explicitMemories.includes(factText)) {
      prof.explicitMemories.push({
        text: factText,
        confidence: 1.0,
        timestamp: new Date().toISOString()
      });
      this.saveToDisk();
    }
  }

  /**
   * Remove preference when user explicitly corrects ("mujhe ye pasand nahi")
   */
  handleUserCorrection(userId, correctionKey, correctedValue) {
    const prof = this.getProfile(userId);
    if (prof.preferences[correctionKey]) {
      prof.preferences[correctionKey] = {
        value: correctedValue,
        confidence: 0.99,
        source: 'user_correction',
        lastUpdated: new Date().toISOString()
      };
      this.saveToDisk();
    }
  }

  /**
   * Produce a concise prompt-friendly summary of user preferences
   */
  getPersonalizationPromptContext(userId = 'default') {
    const prof = this.getProfile(userId);
    const items = [];
    if (prof.nickname) items.push(`User calls themselves / preferred name: ${prof.nickname}`);
    if (prof.favoriteTopics.length > 0) items.push(`Favorite topics: ${prof.favoriteTopics.join(', ')}`);
    if (prof.likes.length > 0) items.push(`Known likes: ${prof.likes.slice(-4).join(', ')}`);
    if (prof.dislikes.length > 0) items.push(`Known dislikes: ${prof.dislikes.slice(-4).join(', ')}`);

    const p = prof.preferences;
    if (p.likesTeasing?.confidence >= 0.65) items.push(`Enjoys playful teasing: ${p.likesTeasing.value}`);
    if (p.prefersShortBubbles?.confidence >= 0.7) items.push(`Prefers short multi-bubble chat style: true`);

    return items.join(' | ');
  }
}

module.exports = new RosieUserProfile();
module.exports.RosieUserProfile = RosieUserProfile;
