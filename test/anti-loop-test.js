// test/anti-loop-test.js
// Dedicated Verification Suite for Duplicate Prevention & Anti-Loop Conversational Engine
// Simulates user's exact multi-turn short reply sequence:
// "Hi" -> "hmm" -> "haan" -> "acha" -> "ok" -> "kuch nahi" -> "haan" -> "hmm"

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

async function runAntiLoopTest() {
  console.log('🌸 ======================================================================');
  console.log('🧪 ANTI-LOOP & DUPLICATE PREVENTION MULTI-TURN VERIFICATION TEST');
  console.log('🌸 ======================================================================\n');

  const sessionId = 'loop_test_' + Date.now();
  const sequence = [
    'Hi',
    'hmm',
    'haan',
    'acha',
    'ok',
    'kuch nahi',
    'haan',
    'hmm'
  ];

  const seenReplies = [];
  const seenStrategies = [];
  let duplicateCount = 0;
  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition, desc, detail = '') {
    totalAssertions++;
    if (condition) {
      console.log(`   ✅ [PASS] ${desc}`);
      if (detail) console.log(`      ↪ ${detail}`);
      passedAssertions++;
      return true;
    } else {
      console.error(`   ❌ [FAIL] ${desc}`);
      if (detail) console.error(`      ↪ Detail: ${detail}`);
      return false;
    }
  }

  for (let i = 0; i < sequence.length; i++) {
    const userMsg = sequence[i];
    console.log(`▶ Turn ${i + 1}: User: "${userMsg}"`);

    const res = await sendChat(userMsg, sessionId);
    const reply = res.reply.trim();
    const strategy = res.plan?.strategy || 'UNKNOWN';

    console.log(`   Strategy: ${strategy}`);
    console.log(`   Rosie: ${res.messages?.map(m => `"${m.text}"`).join(' | ')}`);

    // 1. Exact Duplicate Check against ANY previous reply
    const isExactDuplicate = seenReplies.includes(reply);
    assert(!isExactDuplicate, `Turn ${i + 1} is unique (not an exact duplicate of any previous turn)`, isExactDuplicate ? `Repeated: "${reply}"` : 'Unique reply');

    // 2. Immediate Repeat Check (No back-to-back identical or near-identical)
    if (seenReplies.length > 0) {
      const prevReply = seenReplies[seenReplies.length - 1];
      const isIdenticalToPrevious = (reply === prevReply);
      assert(!isIdenticalToPrevious, `Turn ${i + 1} does not repeat Turn ${i}`, `Previous: "${prevReply}" | Current: "${reply}"`);
    }

    // 3. Catchphrase Repetition Check (e.g. "phir se wahi", "bore ho rahi hoon")
    const hasRepeatedBorePhrase = seenReplies.some(r => r.includes('bore ho rahi hoon') && reply.includes('bore ho rahi hoon'));
    assert(!hasRepeatedBorePhrase, `Turn ${i + 1} does not reuse "bore ho rahi hoon" catchphrase`, 'No catchphrase collision');

    seenReplies.push(reply);
    seenStrategies.push(strategy);
    console.log('');
  }

  console.log('🌸 ======================================================================');
  console.log(`🎯 STRATEGIES APPLIED ACROSS 8 TURNS:`);
  seenStrategies.forEach((s, idx) => console.log(`   Turn ${idx + 1} ("${sequence[idx]}") -> ${s}`));
  console.log('🌸 ======================================================================');

  // Verify that unique replies count equals sequence length
  const uniqueCount = new Set(seenReplies).size;
  assert(uniqueCount === sequence.length, `All ${sequence.length} turns produced completely distinct, fresh replies`, `Unique: ${uniqueCount} / ${sequence.length}`);

  console.log(`\n🎯 TOTAL RESULTS: ${passedAssertions} / ${totalAssertions} ASSERTIONS PASSED!`);
  if (passedAssertions === totalAssertions) {
    console.log('✨ Anti-Loop & Duplicate Prevention PASSED with 100% success! No repetitive loops detected.');
    process.exit(0);
  } else {
    console.error('⚠️ Some assertions failed.');
    process.exit(1);
  }
}

runAntiLoopTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
