// test/context-repair-test.js
// Verification suite for Contextual Understanding, Self-Aware Conversational Repair,
// Repetition Complaints, and Name/Calling Preferences.

const BASE_URL = 'http://localhost:3000/api/chat';

async function sendChat(message, sessionId) {
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

async function runContextRepairTests() {
  console.log('🌸 ======================================================================');
  console.log('🧪 ROSIE CONTEXT UNDERSTANDING & SELF-AWARE REPAIR VERIFICATION TEST');
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

  const SUITE_ID = Date.now();
  const getSess = (name) => `${name}_${SUITE_ID}`;

  // ----------------------------------------------------
  // TEST 1: The Exact Production Bug Sequence
  // "Hi" -> "hmm" -> "haan" -> "acha" -> "aap ye same message kyun kar rahe ho baar baar"
  // ----------------------------------------------------
  console.log('▶ TEST 1: Full Sequence ending with: "aap ye same message kyun kar rahe ho baar baar"');
  {
    const sess = getSess('t1_sequence');
    await sendChat('Hi', sess);
    await sendChat('hmm', sess);
    await sendChat('haan', sess);
    await sendChat('acha', sess);
    const res = await sendChat('aap ye same message kyun kar rahe ho baar baar', sess);

    assert(
      res.plan?.strategy.startsWith('REPETITION_REPAIR') || res.intent === 'repetition_complaint',
      'Understands message as REPETITION_COMPLAINT intent',
      `Intent: ${res.intent}, Strategy: ${res.plan?.strategy}`
    );

    assert(
      !res.reply.toLowerCase().includes('chill karo') && !res.reply.toLowerCase().includes('main yahin hoon :)'),
      'Does NOT dismiss with generic "chill karo / main yahin hoon" message',
      'No inappropriate generic comfort'
    );

    assert(
      /repeat|loop|sahi keh rahe|my bad|sorry|pakad liya|fresh|naya/i.test(res.reply),
      'Acknowledges repetition self-consciously and repairs conversation',
      `Reply: "${res.reply}"`
    );

    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // ----------------------------------------------------
  // TEST 2: Misunderstanding Complaint ("tum meri baat samajh nahi rahi")
  // ----------------------------------------------------
  console.log('▶ TEST 2: Misunderstanding complaint: "tum meri baat samajh nahi rahi"');
  {
    const sess = getSess('t2_misunderstand');
    await sendChat('Mujhe ek baat batani thi', sess);
    const res = await sendChat('tum meri baat samajh nahi rahi', sess);

    assert(
      res.plan?.strategy.startsWith('MISUNDERSTANDING_REPAIR') || res.intent === 'misunderstanding_complaint',
      'Understands as MISUNDERSTANDING_COMPLAINT',
      `Intent: ${res.intent}, Strategy: ${res.plan?.strategy}`
    );

    assert(
      !res.reply.toLowerCase().startsWith('aww'),
      'Does not dismiss with robotic "Aww"',
      'No robotic aww'
    );

    assert(
      /my bad|samajh|galat|direction|samjhao|batao|sun rahi/i.test(res.reply),
      'Acknowledges misunderstanding and asks user to explain',
      `Reply: "${res.reply}"`
    );

    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // ----------------------------------------------------
  // TEST 3: User says: "maine ye nahi poocha"
  // ----------------------------------------------------
  console.log('▶ TEST 3: Off-target answer complaint: "maine ye nahi poocha"');
  {
    const sess = getSess('t3_not_asked');
    await sendChat('Kuch aur baat karte hain', sess);
    const res = await sendChat('maine ye nahi poocha', sess);

    assert(
      res.plan?.strategy.startsWith('MISUNDERSTANDING_REPAIR') || res.intent === 'misunderstanding_complaint',
      'Understands user is correcting off-target answer',
      `Intent: ${res.intent}, Strategy: ${res.plan?.strategy}`
    );

    assert(
      /galat|samajh|poocha|pucha|my bad|sorry|batao|arre/i.test(res.reply),
      'Acknowledges off-target answer and corrects course',
      `Reply: "${res.reply}"`
    );

    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // ----------------------------------------------------
  // TEST 4: Repetition complaint: "same reply again"
  // ----------------------------------------------------
  console.log('▶ TEST 4: Short repetition complaint: "same reply again"');
  {
    const sess = getSess('t4_same_again');
    await sendChat('ok', sess);
    const res = await sendChat('same reply again', sess);

    assert(
      res.plan?.strategy.startsWith('REPETITION_REPAIR') || res.intent === 'repetition_complaint',
      'Recognizes repetition complaint from "same reply again"',
      `Intent: ${res.intent}, Strategy: ${res.plan?.strategy}`
    );

    assert(
      /repeat|loop|sahi keh rahe|my bad|sorry|fresh|naya|pakad/i.test(res.reply),
      'Self-aware acknowledgement of repeated reply',
      `Reply: "${res.reply}"`
    );

    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // ----------------------------------------------------
  // TEST 5: Name/Title Preference ("aap mujhe hasband ji bulaya kro ab se thiik hai")
  // Must NOT trigger Tech Mode!
  // ----------------------------------------------------
  console.log('▶ TEST 5: Title preference: "aap mujhe hasband ji bulaya kro ab se thiik hai"');
  {
    const sess = getSess('t5_husband');
    const res = await sendChat('aap mujhe hasband ji bulaya kro ab se thiik hai', sess);

    assert(
      !res.reply.toLowerCase().includes('tech mode on') && !res.reply.toLowerCase().includes('node backend'),
      'Does NOT falsely trigger tech mode due to "hai" substring',
      'Zero false tech mode trigger'
    );

    assert(
      /h[ua]sband|haq|bulana|bulaungi|baba|aap kahein/i.test(res.reply),
      'Accepts requested title with affection and charm',
      `Reply: "${res.reply}"`
    );

    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}\n`);
  }

  // ----------------------------------------------------
  // TEST 6: Variations of Repetition Complaints
  // ----------------------------------------------------
  console.log('▶ TEST 6: Multiple Natural Variations of Repetition Complaints');
  const variations = [
    'same baat baar baar kyun bol rahi ho?',
    'ye reply repeat kyun ho raha hai?',
    'tum phir wahi bol rahi ho',
    'arey same answer dobara kyun?'
  ];

  for (let i = 0; i < variations.length; i++) {
    const text = variations[i];
    const sess = getSess(`t6_var_${i}`);
    await sendChat('hmm', sess);
    const res = await sendChat(text, sess);

    assert(
      res.plan?.strategy.startsWith('REPETITION_REPAIR') || res.intent === 'repetition_complaint',
      `Understands variation: "${text}"`,
      `Intent: ${res.intent}, Strategy: ${res.plan?.strategy}`
    );

    assert(
      !res.reply.toLowerCase().includes('chill karo'),
      `Does not send generic chill karo for "${text}"`,
      'Non-generic response'
    );
  }

  console.log('\n🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} TESTS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All Context Understanding & Conversation Repair Scenarios PASSED with 100% success!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

runContextRepairTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
