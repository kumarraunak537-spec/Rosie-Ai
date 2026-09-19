// test/architecture-test.js
// Verification suite for Rosie's Full Emotion-Aware Conversational Architecture
// Validates all 15 core scenarios specified in Section 17 of the prompt.

const BASE_URL = 'http://localhost:3000/api/chat';

async function sendChat(message, sessionId = 'arch_test_sess') {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }
  return res.json();
}

async function runTests() {
  console.log('🌸 ======================================================================');
  console.log('🧪 ROSIE FULL EMOTION-AWARE ARCHITECTURE VERIFICATION TEST');
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

  // --- SCENARIO 1: "hi" (Short greeting) ---
  console.log('▶ Scenario 1: Short greeting ("hi")');
  {
    const res = await sendChat('hi', 's1_greeting');
    const msgCount = res.messages?.length || 0;
    const totalWords = res.messages?.map(m => m.text).join(' ').split(/\s+/).length || 0;
    assert(msgCount >= 1 && msgCount <= 2, 'Returns 1-2 short bubbles', `Count: ${msgCount}`);
    assert(totalWords < 25, 'Does not dump long text on a simple "hi"', `Total words: ${totalWords}`);
    assert(res.intent === 'greeting', 'Intent detected as greeting', `Intent: ${res.intent}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 2: "kya kar rahi ho?" ---
  console.log('▶ Scenario 2: Casual inquiry ("kya kar rahi ho?")');
  {
    const res = await sendChat('kya kar rahi ho?', 's2_casual');
    const msgCount = res.messages?.length || 0;
    assert(msgCount >= 1 && msgCount <= 2, 'Returns 1-2 bubbles', `Count: ${msgCount}`);
    assert(res.intent === 'asking_about_rosie', 'Identifies asking_about_rosie intent', `Intent: ${res.intent}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 3: "aaj mera din bahut kharab tha" ---
  console.log('▶ Scenario 3: Bad day venting ("aaj mera din bahut kharab tha")');
  {
    const res = await sendChat('aaj mera din bahut kharab tha', 's3_badday');
    const msgCount = res.messages?.length || 0;
    assert(['sad', 'stressed'].includes(res.emotion), 'Emotion detected as sad or stressed', `Emotion: ${res.emotion}`);
    assert(['caring', 'soft'].includes(res.rosieMood), "Rosie mood adapts to caring/soft", `Mood: ${res.rosieMood}`);
    assert(res.plan?.shouldGiveUserSpace === true, 'Gives user space to breathe', `Space: ${res.plan?.shouldGiveUserSpace}`);
    assert(msgCount >= 2 && msgCount <= 4, 'Returns 2-4 comforting bubbles', `Count: ${msgCount}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 4: Playful teasing ---
  console.log('▶ Scenario 4: Playful teasing ("tum na sach mein thodi drama queen ho 😂")');
  {
    const res = await sendChat('tum na sach mein thodi drama queen ho 😂', 's4_playful');
    assert(res.emotion === 'playful', 'Emotion detected as playful', `Emotion: ${res.emotion}`);
    assert(['playful', 'teasing'].includes(res.rosieMood), 'Rosie mood shifts to playful/teasing', `Mood: ${res.rosieMood}`);
    assert(res.messages?.some(m => /😂|shaitan|drama|aaine|nautanki|haha|hum/i.test(m.text)), 'Rosie teases back with wit', `Reply: ${res.reply}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 5: Affectionate message ---
  console.log('▶ Scenario 5: Affectionate message ("Rosie, tum sach mein bohot achi ho")');
  {
    const res = await sendChat('Rosie, tum sach mein bohot achi ho', 's5_affection');
    assert(['affectionate_conversation', 'casual_conversation'].includes(res.intent), 'Intent identified as affectionate', `Intent: ${res.intent}`);
    assert(!/mere Rocky.*mere Rocky/i.test(res.reply), 'Avoids repetitive robotic pet names', 'Checked for pet-name repetition');
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 6: Romantic message ---
  console.log('▶ Scenario 6: Romantic message ("tumse baat karke dil khush ho jata hai")');
  {
    const res = await sendChat('tumse baat karke dil khush ho jata hai', 's6_romantic');
    assert(['romantic', 'happy'].includes(res.emotion), 'Emotion recognized as romantic/happy', `Emotion: ${res.emotion}`);
    assert(res.rosieMood === 'affectionate' || res.rosieMood === 'warm', 'Rosie mood becomes affectionate/warm', `Mood: ${res.rosieMood}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 7: Angry message ---
  console.log('▶ Scenario 7: Angry message ("mujhe sab par bohot gussa aa raha hai")');
  {
    const res = await sendChat('mujhe sab par bohot gussa aa raha hai', 's7_angry');
    assert(res.emotion === 'angry' || res.emotion === 'frustrated', 'Emotion detected as angry/frustrated', `Emotion: ${res.emotion}`);
    assert(res.rosieMood === 'grounded' || res.rosieMood === 'caring', 'Rosie stays grounded and calm', `Mood: ${res.rosieMood}`);
    assert(!res.reply.toLowerCase().includes('calm down!'), 'Does not dismiss anger defensively', `Reply: ${res.reply}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 8: Sad message ---
  console.log('▶ Scenario 8: Sad message ("aaj bohot rona aa raha hai...")');
  {
    const res = await sendChat('aaj bohot rona aa raha hai...', 's8_sad');
    assert(res.emotion === 'sad', 'Emotion recognized as sad', `Emotion: ${res.emotion}`);
    assert(res.intensity >= 0.7, 'High sadness intensity captured', `Intensity: ${res.intensity}`);
    assert(res.rosieMood === 'caring' || res.rosieMood === 'soft', 'Rosie adopts caring posture', `Mood: ${res.rosieMood}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 9: Long philosophical question ---
  console.log('▶ Scenario 9: Long philosophical question');
  {
    const q = 'Why do people sacrifice present happiness for future success? Is it ever truly worth the emotional cost?';
    const res = await sendChat(q, 's9_philosophy');
    const msgCount = res.messages?.length || 0;
    assert(msgCount >= 2 && msgCount <= 4, 'Breaks into 2-4 conversational thoughts without essay dumping', `Count: ${msgCount}`);
    const oversized = res.messages?.some(m => m.text.split(/\s+/).length > 35);
    assert(!oversized, 'No individual bubble exceeds 35 words (conversational pace)', `Oversized: ${oversized}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 10: Long factual question ---
  console.log('▶ Scenario 10: Long factual question');
  {
    const q = 'What are the main practical differences between monolithic and microservices architecture in modern software engineering?';
    const res = await sendChat(q, 's10_factual');
    const msgCount = res.messages?.length || 0;
    assert(msgCount >= 2 && msgCount <= 4, 'Presents 2-4 structured conversational thoughts', `Count: ${msgCount}`);
    assert(!res.reply.includes('As an AI language model'), 'Zero robotic disclaimers', 'No AI disclaimer');
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 11: Topic switching ---
  console.log('▶ Scenario 11: Topic switching');
  {
    const sess = 's11_switch';
    await sendChat('mera project bahut lamba chal raha hai', sess);
    const res = await sendChat('Chalo ye chhodte hain... waise tumhe music mein kya pasand hai?', sess);
    assert(res.intent === 'changing_topic' || /music/i.test(res.reply), 'Smoothly transitions to new topic', `Reply: ${res.reply}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 12: Previous-memory / Contextual reference (Interview -> Nervousness) ---
  console.log('▶ Scenario 12: Contextual Disambiguation (Interview -> Nervousness)');
  {
    const sess = 's12_interview_context';
    // Turn 1: User says they have an interview tomorrow
    await sendChat('My interview is tomorrow.', sess);
    // Turn 2: User says they are nervous
    const res = await sendChat("I'm getting nervous.", sess);
    // Rosie should NOT ask "Why are you nervous?" because context explains it!
    const askedWhy = /why are you nervous|nervous kyun ho|kya hua nervous kyun/i.test(res.reply);
    assert(!askedWhy, 'Rosie does NOT ask "Why are you nervous?" (context resolved)', `Asked why: ${askedWhy}`);
    assert(/interview|kal|best|believe|mehnat/i.test(res.reply), 'Directly references the interview anxiety', `Reply: ${res.reply}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 13: One-word reply ("hmm") ---
  console.log('▶ Scenario 13: One-word reply ("hmm")');
  {
    const res = await sendChat('hmm', 's13_oneword');
    const msgCount = res.messages?.length || 0;
    assert(msgCount === 1, 'Replies with exactly 1 short natural thought', `Count: ${msgCount}`);
    const words = res.reply.split(/\s+/).length;
    assert(words < 18, 'Short response respecting user space', `Words: ${words}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 14: Repeated message ---
  console.log('▶ Scenario 14: Repeated message');
  {
    const sess = 's14_repeat';
    await sendChat('aaj mausam kaisa hai?', sess);
    const res = await sendChat('aaj mausam kaisa hai?', sess);
    assert(res.intent === 'repeated_message' || /do baar|repeat|again|network/i.test(res.reply), 'Notices repetition playfully/gently', `Reply: ${res.reply}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // --- SCENARIO 15: Sudden mood change (sad -> laughing) ---
  console.log('▶ Scenario 15: Sudden user mood swing');
  {
    const sess = 's15_mood_swing';
    // Turn 1: User is sad
    await sendChat('aaj bohot rona aa raha hai...', sess);
    // Turn 2: User suddenly shifts to playful/joking
    const res = await sendChat('Haha mazak kar raha tha, pizza aa gaya! 😂', sess);
    assert(res.emotion === 'playful' || res.emotion === 'happy', 'Detects sudden rebound to playful/happy', `Emotion: ${res.emotion}`);
    assert(['warm', 'playful', 'teasing'].includes(res.rosieMood), 'Rosie state smoothly adapts to new mood', `Mood: ${res.rosieMood}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  console.log('🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} ASSERTIONS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All 15 conversational architecture scenarios PASSED with 100% success!');
    process.exit(0);
  } else {
    console.error('⚠️ Some assertions failed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
