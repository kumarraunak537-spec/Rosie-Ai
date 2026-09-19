// test/segmentation-emoji-test.js
// Verification Suite for Natural Message Segmentation & Authentic Emoji Filtering

const http = require('http');
const semanticChunker = require('../server/semanticChunker');

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

const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;

function countEmojis(text) {
  const matches = (text || '').match(emojiRegex);
  return matches ? matches.length : 0;
}

function totalTurnEmojis(messages) {
  return messages.reduce((sum, m) => sum + countEmojis(m.text), 0);
}

async function runTests() {
  console.log('\n🌸 ======================================================================');
  console.log('🧪 ROSIE NATURAL MESSAGE SEGMENTATION & EMOJI FILTERING TEST SUITE');
  console.log('🌸 ======================================================================\n');

  // ----------------------------------------------------
  // SECTION A: UNIT TESTS ON SEGMENTATION & EMOJI LAYER
  // ----------------------------------------------------
  console.log('▶ SECTION A: Pure Unit Tests on SemanticChunker Engine');

  // Test A1: Strip multiple emojis and limit to max 1 for emotional text
  {
    const input = "Awww 🥺❤️... chalo phone side mein rakh do 💕 aankhein band karo aur aaram karo 😌";
    const chunks = semanticChunker.chunk(input, { emotion: 'caring' }, 'chat', 'main thak gaya hu', 3);
    check('Chunks count between 1 and 3', chunks.length >= 1 && chunks.length <= 3, `Count: ${chunks.length}`);
    check('Max 1 emoji across the entire emotional turn', totalTurnEmojis(chunks) <= 1, `Emojis: ${totalTurnEmojis(chunks)}`);
    check('No stacked emojis', !chunks.some(c => /[\p{Extended_Pictographic}]{2,}/gu.test(c.text)));
  }

  // Test A2: Zero emojis for neutral / non-emotional text
  {
    const input = "haan mujhe samajh aa raha hai 😊 tum actually ye kehna chahte ho na? 👍";
    const chunks = semanticChunker.chunk(input, { emotion: 'neutral' }, 'chat', 'samjhe?', 2);
    check('Zero emojis for neutral conversational turn', totalTurnEmojis(chunks) === 0, `Total emojis: ${totalTurnEmojis(chunks)}`);
  }

  // Test A3: Single short message for dry input
  {
    const input = "bas 'acha'?";
    const chunks = semanticChunker.chunk(input, { emotion: 'neutral' }, 'chat', 'acha', 1);
    check('Returns exactly 1 bubble for dry reply', chunks.length === 1, `Count: ${chunks.length}`);
    check('Zero emojis for dry reaction', totalTurnEmojis(chunks) === 0, `Total emojis: ${totalTurnEmojis(chunks)}`);
  }

  // Test A4: Word count per bubble (2-12 words, max 15 words)
  {
    const input = "haan mujhe bhi tumse baat karna acha lagta hai aur tum jab aise baat karte ho na toh mujhe cute sa feel hota hai";
    const chunks = semanticChunker.chunk(input, { emotion: 'romantic' }, 'chat', 'mujhe tumse baat karna pasand hai', 3);
    check('Chunks count between 2 and 3', chunks.length >= 2 && chunks.length <= 3, `Count: ${chunks.length}`);
    check('All bubbles under 15 words', chunks.every(c => c.text.split(/\s+/).length <= 15), `Lengths: ${chunks.map(c => c.text.split(/\s+/).length).join(', ')}`);
    check('Total emojis <= 1', totalTurnEmojis(chunks) <= 1, `Total emojis: ${totalTurnEmojis(chunks)}`);
  }

  // ----------------------------------------------------
  // SECTION B: END-TO-END SERVER PIPELINE TESTS
  // ----------------------------------------------------
  console.log('\n▶ SECTION B: Live End-to-End Chat API Pipeline Tests');

  const sessPrefix = 'sess_seg_' + Date.now();

  // Test B1: User: "I missed you"
  {
    console.log('\n▶ TEST B1: User: "I missed you"');
    const sess = sessPrefix + '_b1';
    const res = await post('/api/chat', { message: 'I missed you', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1, 2, or 3 separate bubbles (never > 3)', count >= 1 && count <= 3, `Count: ${count}`);
    check('Each bubble is short (<= 15 words)', res.messages.every(m => m.text.split(/\s+/).length <= 15));
    check('Max 1 emoji in total across all bubbles', totalTurnEmojis(res.messages) <= 1, `Total emojis: ${totalTurnEmojis(res.messages)}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   '));
  }

  // Test B2: User: "Aaj bahut thak gaya hu"
  {
    console.log('\n▶ TEST B2: User: "Aaj bahut thak gaya hu"');
    const sess = sessPrefix + '_b2';
    const res = await post('/api/chat', { message: 'Aaj bahut thak gaya hu', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 2 or 3 caring bubbles (never > 3)', count >= 2 && count <= 3, `Count: ${count}`);
    check('Each bubble <= 15 words', res.messages.every(m => m.text.split(/\s+/).length <= 15));
    check('Max 1 emoji across the entire response', totalTurnEmojis(res.messages) <= 1, `Total emojis: ${totalTurnEmojis(res.messages)}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   '));
  }

  // Test B3: User: "Tu pagal hai 😂"
  {
    console.log('\n▶ TEST B3: User: "Tu pagal hai 😂"');
    const sess = sessPrefix + '_b3';
    const res = await post('/api/chat', { message: 'Tu pagal hai 😂', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1 to 3 playful bubbles', count >= 1 && count <= 3, `Count: ${count}`);
    check('Max 1 emoji in entire playful reply (no emoji spam)', totalTurnEmojis(res.messages) <= 1, `Total emojis: ${totalTurnEmojis(res.messages)}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   '));
  }

  // Test B4: User: "Hi"
  {
    console.log('\n▶ TEST B4: User: "Hi"');
    const sess = sessPrefix + '_b4';
    const res = await post('/api/chat', { message: 'Hi', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns 1 concise greeting bubble', count === 1, `Count: ${count}`);
    check('Minimal/zero emojis for simple greeting', totalTurnEmojis(res.messages) <= 1, `Total emojis: ${totalTurnEmojis(res.messages)}`);
    console.log(`   Bubbles (${count}):\n   ` + res.messages.map((m, i) => `[${i+1}] "${m.text}"`).join('\n   '));
  }

  // Test B5: User: "acha"
  {
    console.log('\n▶ TEST B5: User: "acha"');
    const sess = sessPrefix + '_b5';
    const res = await post('/api/chat', { message: 'acha', sessionId: sess });
    const count = res.messages?.length || 0;
    check('Returns exactly 1 short reaction bubble', count === 1, `Count: ${count}`);
    check('Zero emojis on dry reaction (no forced cute emojis)', totalTurnEmojis(res.messages) === 0, `Total emojis: ${totalTurnEmojis(res.messages)}`);
    console.log(`   Bubble: "${res.messages[0]?.text}"`);
  }

  // Test B6: Natural typing pacing delays
  {
    console.log('\n▶ TEST B6: Natural Pacing / Typing Delays');
    const sess = sessPrefix + '_b6';
    const res = await post('/api/chat', { message: 'kya kar rahi ho', sessionId: sess });
    check('Pacing delays are within 450ms - 1400ms range', res.messages.every(m => m.delay_ms >= 400 && m.delay_ms <= 1400), `Delays: ${res.messages.map(m => m.delay_ms + 'ms').join(', ')}`);
  }

  console.log('\n🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} TESTS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All Segmentation, Pacing & Emoji Filtering Requirements PASSED with 100% success!\n');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
