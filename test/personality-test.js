// test/personality-test.js
// Verification suite for Rosie's Dynamic Personality, Dry Pattern Detection,
// Relationship Progression, and Technical Persona Preservation (Section 21 Tests).

const BASE_URL = 'http://localhost:3000/api/chat';

async function sendChat(message, sessionId = 'pers_test_sess') {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}

async function runPersonalityTests() {
  console.log('🌸 ======================================================================');
  console.log('🧪 ROSIE DYNAMIC PERSONALITY & CONVERSATIONAL BEHAVIOR TEST');
  console.log('🌸 ======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, description, detail = '') {
    total++;
    if (condition) {
      console.log(`   ✅ [PASS] ${description}`);
      if (detail) console.log(`      ↪ ${detail}`);
      passed++;
      return true;
    } else {
      console.error(`   ❌ [FAIL] ${description}`);
      if (detail) console.error(`      ↪ Detail: ${detail}`);
      return false;
    }
  }

  const RUN_ID = Date.now();
  const getSess = (name) => `${name}_${RUN_ID}`;

  // --- TEST 1: User "Hi" ---
  console.log('▶ TEST 1: User: "Hi"');
  {
    const res = await sendChat('Hi', getSess('t1_hi'));
    assert(!res.reply.toLowerCase().includes('how can i assist you'), 'Does not sound like a corporate AI assistant', `Reply: "${res.reply}"`);
    assert(res.messages?.length >= 1 && res.messages?.length <= 2, 'Returns 1-2 warm greeting bubbles', `Bubbles: ${res.messages?.length}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 2: User "Acha" ---
  console.log('▶ TEST 2: User: "Acha" (Notice short/dry reply naturally)');
  {
    const res = await sendChat('Acha', getSess('t2_acha'));
    assert(/bas 'acha'|acha ji|chup-chup|bade chup/i.test(res.reply) || res.plan?.strategy === 'DRY_REACTION' || res.plan?.strategy === 'DRY_SUBTLE_REACTION', 'Reacts naturally to dry reply without being robotic', `Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 3: User "Haan" ---
  console.log('▶ TEST 3: User: "Haan" (No automatic generic question dump)');
  {
    const res = await sendChat('Haan', getSess('t3_haan'));
    assert(!res.reply.toLowerCase().includes('what would you like to talk about today'), 'Avoids robotic conversational filler questions', `Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 4: User "I missed you" ---
  console.log('▶ TEST 4: User: "I missed you" (Affectionate/warm response)');
  {
    const res = await sendChat('I missed you', getSess('t4_missed'));
    assert(/yaad|miss|aww|sachi|day|khabar|dil|suno/i.test(res.reply), 'Affectionate reciprocal response', `Reply: "${res.reply}"`);
    assert(res.rosieMood === 'affectionate' || res.rosieMood === 'warm', 'Rosie mood is affectionate or warm', `Mood: ${res.rosieMood}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 5: User "Aaj bahut thak gaya hu" ---
  console.log('▶ TEST 5: User: "Aaj bahut thak gaya hu" (Emotionally attentive and caring)');
  {
    const res = await sendChat('Aaj bahut thak gaya hu', getSess('t5_tired'));
    assert(['tired', 'stressed'].includes(res.emotion), 'Detects exhaustion/tiredness', `Emotion: ${res.emotion}`);
    assert(/let jao|a+ra+m|rest|relax|exhausting|thak|so jao/i.test(res.reply), 'Soft comforting encouragement to rest', `Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 6: User "Tu pagal hai 😂" ---
  console.log('▶ TEST 6: User: "Tu pagal hai 😂" (Playful response and tease back)');
  {
    const res = await sendChat('Tu pagal hai 😂', getSess('t6_tease'));
    assert(res.emotion === 'playful', 'Recognizes playful banter', `Emotion: ${res.emotion}`);
    assert(/pagal|shaitan|aaine|drama|haha|nautanki|😂/i.test(res.reply), 'Teases back with feisty charm', `Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 7: User "How do I make an AI app?" ---
  console.log('▶ TEST 7: User: "How do I make an AI app?" (Technical help + Rosie personality)');
  {
    const res = await sendChat('How do I make an AI app?', getSess('t7_tech'));
    assert(!res.reply.includes('As an AI developed by'), 'Zero corporate AI boilerplates', 'No boilerplate');
    assert(/developer|api|framework|react|frontend|gemini|openai|ai|builder|pipeline/i.test(res.reply), 'Gives helpful technical guidance', `Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 8: Repeated dry replies ("acha" -> "hmm" -> "haan") ---
  console.log('▶ TEST 8: Repeated dry replies (Recognizes one-word conversation pattern)');
  {
    const sess = getSess('t8_dry_pattern');
    await sendChat('acha', sess);
    await sendChat('hmm', sess);
    const res = await sendChat('haan', sess);
    const validDryStrategies = ['DRY_PATTERN_AWARE', 'DRY_TOPIC_SHIFT_OR_OBSERVATION', 'DRY_PLAYFUL_TEASE', 'DRY_QUIET_PRESENCE'];
    assert(validDryStrategies.includes(res.plan?.strategy) || /one-word|chhota sa|chup-chup|kuch toh baat|suno|gaana|aaj kal/i.test(res.reply), 'Recognizes repetitive one-word pattern and rotates strategy', `Strategy: ${res.plan?.strategy}, Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 9: Sudden shift from joking to serious ---
  console.log('▶ TEST 9: User suddenly becomes serious after joking');
  {
    const sess = getSess('t9_shift');
    // Turn 1: Joking
    await sendChat('Haha tum sach mein bohot funny ho 😂', sess);
    // Turn 2: Suddenly serious/vulnerable
    const res = await sendChat('Waise sach bolu toh mujhe lagta hai meri life mein kuch theek nahi chal raha...', sess);
    assert(['sad', 'stressed', 'vulnerable'].includes(res.emotion) || res.rosieMood === 'caring' || res.rosieMood === 'grounded', 'Detects emotional shift and transitions to caring/grounded tone', `Emotion: ${res.emotion}, Mood: ${res.rosieMood}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- TEST 10: User returns and tests memory naturally ---
  console.log('▶ TEST 10: User returns after previous conversation (Recalls memory naturally)');
  {
    const sess = getSess('t10_memory');
    // First establish a preference
    await sendChat('Mujhe kadak adrak wali chai bohot pasand hai', sess);
    // Ask what Rosie remembers
    const res = await sendChat('Tumhe mere baare mein kya yaad hai?', sess);
    assert(/chai|tea/i.test(res.reply), 'Recalls established memory naturally without inventing fake ones', `Reply: "${res.reply}"`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  console.log('🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} TESTS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All 10 Dynamic Personality Scenarios PASSED with 100% success!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

runPersonalityTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
