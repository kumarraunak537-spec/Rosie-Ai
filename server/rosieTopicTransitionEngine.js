// server/rosieTopicTransitionEngine.js
// Rosie AI — Topic Transition & Thread Management Engine
// Guarantees CURRENT_TOPIC priority, detects natural closures, and guides contextual transitions.

class RosieTopicTransitionEngine {
  /**
   * Evaluate conversation flow for topic continuity or transition
   */
  evaluate(userMessage, contextData = {}, intentAnalysis = {}, userProfile = {}) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // 1. Check if user explicitly wants to switch topic
    const isExplicitShift = /(?:chhodo|choro|kuch aur|change topic|kisi aur baare me|aur batao kuch alag|leave it|forget it|baad me)/i.test(lower);

    // 2. Determine raw intent topic
    let rawTopic = intentAnalysis?.topic || contextData?.currentTopic || 'general';
    let responseGoal = 'Address the current conversational intent naturally';

    if (isExplicitShift) {
      rawTopic = userProfile?.favoriteTopics?.[0] || 'relaxing_chatter';
      responseGoal = 'Acknowledge the topic shift and move to a comforting/new topic';
    } else if (intentAnalysis?.intent === 'asking_question' || text.includes('?')) {
      rawTopic = 'User Question';
      responseGoal = 'Directly and accurately answer the question asked';
    } else if (intentAnalysis?.isFactOrTechnical) {
      rawTopic = 'Technical / Factual';
      responseGoal = 'Provide clear, concise, and helpful technical information';
    } else if (intentAnalysis?.intent === 'casual') {
      responseGoal = 'Maintain light, natural, and friendly conversation without being repetitive';
    } else if (intentAnalysis?.intent?.includes('romantic')) {
      responseGoal = 'Reciprocate affection warmly and intimately';
    }

    return {
      action: isExplicitShift ? 'TRANSITION' : 'MAINTAIN',
      currentTopic: rawTopic,
      responseGoal: responseGoal,
      romanticContext: (intentAnalysis?.isFactOrTechnical || intentAnalysis?.intent === 'asking_question') ? 'LOW_PRIORITY' : 'NORMAL'
    };
  }
}

module.exports = new RosieTopicTransitionEngine();
module.exports.RosieTopicTransitionEngine = RosieTopicTransitionEngine;
