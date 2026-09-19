// server/rosieLearningPipeline.js
// Rosie AI — Post-Turn Autonomous Learning Pipeline
// Runs after every conversation turn to extract memories, update behavioral profiles, and evolve relationship state.

const memoryService = require('./memoryService');
const memoryScorer = require('./rosieMemoryScorer');
const userProfile = require('./rosieUserProfile');
const behaviorLearning = require('./rosieBehaviorLearningEngine');
const relationshipEngine = require('./rosieRelationshipEngine');

class RosieLearningPipeline {
  /**
   * Process and learn from completed conversation turn
   */
  async processTurn({
    sessionId = 'default',
    userId = 'default',
    userMessage,
    botReply,
    emotionAnalysis,
    intentAnalysis,
    contextData
  }) {
    if (!userMessage) return;

    try {
      // 1. Memory Importance Scoring
      const scored = memoryScorer.score(userMessage, contextData);

      // 2. Selective Extraction: Only promote if USEFUL_FOR_LATER or IMPORTANT_USER_PREFERENCE
      if (scored.shouldPersist) {
        if (scored.isExplicit) {
          userProfile.addExplicitMemory(userId, userMessage);
        }
        memoryService.extractAndPromoteMemories(userMessage, userId);
      }

      // 3. Behavioral Learning Engine Observation
      behaviorLearning.observeTurn(userMessage, emotionAnalysis, intentAnalysis, contextData, userId);

      // 4. Relationship Progression Engine Update
      const updatedRel = relationshipEngine.progressTurn(userId, emotionAnalysis, intentAnalysis);

      // 5. Update Profile turn counts and timestamp
      const prof = userProfile.getProfile(userId);
      prof.interactionMetrics.totalTurns += 1;
      prof.interactionMetrics.lastSeen = new Date().toISOString();
      userProfile.saveToDisk();

      return {
        memorySaved: scored.shouldPersist,
        memoryClassification: scored.classification,
        relationshipStage: updatedRel.stage,
        familiarityScore: updatedRel.familiarityScore
      };
    } catch (err) {
      console.warn('[RosieLearningPipeline] Learning pipeline non-fatal note:', err.message);
      return null;
    }
  }
}

module.exports = new RosieLearningPipeline();
module.exports.RosieLearningPipeline = RosieLearningPipeline;
