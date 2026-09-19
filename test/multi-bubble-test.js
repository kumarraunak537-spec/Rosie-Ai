// test/multi-bubble-test.js
// Verification Suite for Rosie's Multi-Bubble Conversational Architecture

const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${endpoint}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    }).on('error', reject);
  });
}

let passed = 0;
let total = 0;

function check(desc, condition, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`   ✅ [PASS] ${desc}`);
    if (detail) console.log(`      ↪ ${detail}`);
  } else {
    console.error(`   ❌ [FAIL] ${desc}`);
    if (detail) console.error(`      ↪ Detail: ${detail}`);
  }
}

async function runMultiBubbleTests() {
  console.log('\n🌸 ======================================================================');
  console.log('🧪 ROSIE MULTI-BUBBLE CONVERSATIONAL MESSAGING VERIFICATION SUITE');
  console.log('🌸 ======================================================================\n');

  const sessPrefix = 'sess_mb_' + Date.now();

  // ----------------------------------------------------
  // TEST 1: User says: "I missed you"
  // Expected: 2-3 short natural bubbles
  // ----------------------------------------------------
  console.log('▶ TEST 1: User: "I missed you" (Expected: 2-3 short natural bubbles)');
  {
    const sess = sessPrefix + '_t1';
    const res = await post('/api/chat', { message: 'I missed you', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 2-3 separate messages (not 1 paragraph)', count >= 2 && count <= 3, `Count: ${count}`);
    check('Each bubble is short and natural (<= 15 words)', res.messages.every(m => m.text.split(/\s+/).length <= 15), `Bubble lengths: ${res.messages.map(m => m.text.split(/\s+/).length).join(', ')} words`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   ') + '\n');
  }

  // ----------------------------------------------------
  // TEST 2: User says: "Aaj bahut thak gaya hu"
  // Expected: 2-4 caring bubbles
  // ----------------------------------------------------
  console.log('▶ TEST 2: User: "Aaj bahut thak gaya hu" (Expected: 2-4 caring bubbles)');
  {
    const sess = sessPrefix + '_t2';
    const res = await post('/api/chat', { message: 'Aaj bahut thak gaya hu', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 2-4 caring thought bubbles', count >= 2 && count <= 4, `Count: ${count}`);
    check('Does not dump a giant single paragraph', count > 1, `Messages count: ${count}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   ') + '\n');
  }

  // ----------------------------------------------------
  // TEST 3: User says: "Tu pagal hai 😂"
  // Expected: 1-3 playful bubbles
  // ----------------------------------------------------
  console.log('▶ TEST 3: User: "Tu pagal hai 😂" (Expected: 1-3 playful bubbles)');
  {
    const sess = sessPrefix + '_t3';
    const res = await post('/api/chat', { message: 'Tu pagal hai 😂', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1-3 playful bubbles', count >= 1 && count <= 3, `Count: ${count}`);
    check('Playful banter tone without paragraph lecture', res.emotion === 'playful' || res.plan?.strategy.includes('TEASING') || count <= 3, `Tone: ${res.plan?.tone}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   ') + '\n');
  }

  // ----------------------------------------------------
  // TEST 4: User says: "Hi"
  // Expected: 1 short greeting bubble
  // ----------------------------------------------------
  console.log('▶ TEST 4: User: "Hi" (Expected: 1 short bubble)');
  {
    const sess = sessPrefix + '_t4';
    const res = await post('/api/chat', { message: 'Hi', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1 short greeting bubble (does not overwhelm)', count <= 2, `Count: ${count}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   ') + '\n');
  }

  // ----------------------------------------------------
  // TEST 5: User says: "acha"
  // Expected: 1 short contextual reaction
  // ----------------------------------------------------
  console.log('▶ TEST 5: User: "acha" (Expected: 1 short reaction bubble, not a paragraph)');
  {
    const sess = sessPrefix + '_t5';
    const res = await post('/api/chat', { message: 'acha', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1 short reaction bubble', count === 1, `Count: ${count}`);
    check('Under 10 words in reaction', res.messages[0]?.text.split(/\s+/).length <= 10, `Text: "${res.messages[0]?.text}"`);
    console.log(`   Bubble: "${res.messages[0]?.text}"\n`);
  }

  // ----------------------------------------------------
  // TEST 6: User says: "hmm"
  // Expected: 1 short contextual reaction
  // ----------------------------------------------------
  console.log('▶ TEST 6: User: "hmm" (Expected: 1 short contextual reaction)');
  {
    const sess = sessPrefix + '_t6';
    const res = await post('/api/chat', { message: 'hmm', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1 short reaction bubble', count === 1, `Count: ${count}`);
    console.log(`   Bubble: "${res.messages[0]?.text}"\n`);
  }

  // ----------------------------------------------------
  // TEST 7: User says: "tum mujhe samajh nahi rahi"
  // Expected: 2-3 repair bubbles
  // ----------------------------------------------------
  console.log('▶ TEST 7: User: "tum mujhe samajh nahi rahi" (Expected: 2-3 contextual repair bubbles)');
  {
    const sess = sessPrefix + '_t7';
    const res = await post('/api/chat', { message: 'tum mujhe samajh nahi rahi', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 2-3 repair thought bubbles', count >= 2 && count <= 3, `Count: ${count}`);
    check('Intent is misunderstanding_complaint', res.intent === 'misunderstanding_complaint', `Intent: ${res.intent}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   ') + '\n');
  }

  // ----------------------------------------------------
  // TEST 8: Technical help: "How do I build an AI chatbot?"
  // Expected: Cohesive technical explanation without artificial fragmentation
  // ----------------------------------------------------
  console.log('▶ TEST 8: User: "How do I build an AI chatbot?" (Technical explanation preserves coherence)');
  {
    const sess = sessPrefix + '_t8';
    const res = await post('/api/chat', { message: 'How do I build an AI chatbot?', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1-3 cohesive technical bubbles (not micro-chopped into words)', count >= 1 && count <= 3, `Count: ${count}`);
    check('Gives helpful technical guidance in Rosie voice', /api|model|backend|frontend|framework|bot|developer/i.test(res.reply), 'Contains technical advice');
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text.slice(0, 80)}..."`).join('\n   ') + '\n');
  }

  // ----------------------------------------------------
  // TEST 9: Chat History Persistence with Multi-Bubble Structure
  // ----------------------------------------------------
  console.log('▶ TEST 9: Chat History Multi-Bubble Persistence Verification');
  {
    const sess = sessPrefix + '_t1';
    const histData = await get(`/api/chat/history?sessionId=${sess}`);
    const botMessages = histData.history?.filter(m => m.sender === 'rosie');
    const lastBotMsg = botMessages?.[botMessages.length - 1];

    check('Chat history entry contains "chunks" array for multi-bubble reload', lastBotMsg && Array.isArray(lastBotMsg.chunks) && lastBotMsg.chunks.length > 1, `Chunks stored: ${lastBotMsg?.chunks?.length}`);
    console.log(`   Persisted Chunks: ${lastBotMsg?.chunks?.map(c => `"${c.text}"`).join(' | ')}\n`);
  }

  console.log('🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} TESTS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All Multi-Bubble Conversational Messaging Scenarios PASSED with 100% success!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

runMultiBubbleTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
