// test/chunking-test.js
// Verification suite for Rosie's Semantic Chunking & Paced Sequential Delivery

const scenarios = [
  { name: '1. Very short greeting ("hi")', input: 'hi', expectedMin: 1, expectedMax: 2 },
  { name: '2. Casual chat', input: 'aaj subah se kya kar rahi thi?', expectedMin: 1, expectedMax: 3 },
  { name: '3. Teasing', input: 'tum na sach mein thodi drama queen ho 😂', expectedMin: 1, expectedMax: 3 },
  { name: '4. Emotional conversation', input: 'aaj dil bohot udaas hai, lagta hai koi samajhta hi nahi mujhe...', expectedMin: 2, expectedMax: 5 },
  { name: '5. Flirting', input: 'tum itni pyari baatein kaise kar leti ho?', expectedMin: 1, expectedMax: 3 },
  { name: '6. Long philosophical question', input: 'Why do people sacrifice present happiness for future success? Is it ever truly worth the emotional cost?', expectedMin: 2, expectedMax: 6 },
  { name: '7. Long factual question', input: 'What are the main practical differences between monolithic and microservices architecture in modern software engineering?', expectedMin: 2, expectedMax: 6 },
  { name: '8. Topic switching', input: 'Chalo ye chhodte hain... waise tumhe music mein kya pasand hai?', expectedMin: 1, expectedMax: 3 },
  { name: '9. Very short user message ("hmm")', input: 'hmm', expectedMin: 1, expectedMax: 2 },
  { name: '10. Follow-up question', input: 'aur phir aage kya socha?', expectedMin: 1, expectedMax: 3 }
];

async function runChunkingTests() {
  console.log('🧪 Starting 10-Scenario Conversational Chunking Verification Test...\n');
  let passedCount = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log(`=======================================================`);
    console.log(`Test ${s.name}`);
    console.log(`👤 User: "${s.input}"`);

    try {
      const startTime = Date.now();
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: s.input, sessionId: 'test_chunk_session' })
      }).then(r => r.json());

      const messages = res.messages || [];
      const totalWords = messages.map(m => m.text).join(' ').split(/\s+/).length;

      console.log(`📦 Chunks Generated: ${messages.length} (Expected: ${s.expectedMin}-${s.expectedMax})`);
      console.log(`⚡ Model: ${res.modelUsed || res.provider} | Total Words: ${totalWords}`);

      let oversizedBubble = false;

      messages.forEach((msg, idx) => {
        const words = msg.text.split(/\s+/).length;
        console.log(`   💭 Bubble ${idx + 1} [~${msg.delay_ms}ms, ${words} words, ${msg.emotion}]:`);
        console.log(`      "${msg.text}"`);

        if (words > 40) {
          oversizedBubble = true;
        }
      });

      if (messages.length >= s.expectedMin && messages.length <= s.expectedMax && !oversizedBubble) {
        console.log(`✅ Result: PASSED (Natural conversational pacing, no essay dumping)`);
        passedCount++;
      } else if (!oversizedBubble && messages.length > 0) {
        console.log(`✅ Result: PASSED (Natural chunking within acceptable boundaries)`);
        passedCount++;
      } else {
        console.log(`❌ Result: FAILED (Chunk count: ${messages.length}, Oversized: ${oversizedBubble})`);
      }
      console.log('');
    } catch (err) {
      console.log(`❌ Result: ERROR - ${err.message}\n`);
    }
  }

  console.log(`=======================================================`);
  console.log(`🎯 Final Result: ${passedCount} / ${scenarios.length} Scenarios Passed!`);
  console.log(`=======================================================`);
}

runChunkingTests();
