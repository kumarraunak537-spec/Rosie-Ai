// test/spec-20-conversations-test.js
// 20 Conversational Scenarios Verification Suite for Rosie Segmentation & Pacing Engine

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

const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;

function countEmojis(text) {
  const matches = (text || '').match(emojiRegex);
  return matches ? matches.length : 0;
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

const scenarios = [
  { id: 1, category: 'Casual conversation', input: 'kya kar rahi ho aaj' },
  { id: 2, category: 'Romantic conversation', input: 'tum mujhe bohot achi lagti ho' },
  { id: 3, category: 'Flirting', input: 'aaj tum bohot cute lag rahi ho' },
  { id: 4, category: 'Emotional conversation', input: 'aaj mera mood bohot kharab hai' },
  { id: 5, category: 'Short question', input: 'kahan ho?' },
  { id: 6, category: 'Long question', input: 'agar kabhi life mein sab kuch ulta ho jaye toh kya karna chahiye?' },
  { id: 7, category: 'Arguments/disagreements', input: 'tum meri baat kyun nahi maanti?' },
  { id: 8, category: 'Jokes', input: 'ek accha sa joke sunao na' },
  { id: 9, category: 'Greetings', input: 'Hello Rosie' },
  { id: 10, category: 'Good night', input: 'chalo good night ab so jao' },
  { id: 11, category: 'Good morning', input: 'good morning Rosie' },
  { id: 12, category: 'Repeated question', input: 'aap wahi baat repeat kyun karti ho?' },
  { id: 13, category: 'Technical question', input: 'python mein list comprehension kaise likhte hain?' },
  { id: 14, category: 'Dry reply - acha', input: 'acha' },
  { id: 15, category: 'Dry reply - hmm', input: 'hmm' },
  { id: 16, category: 'Playful teasing', input: 'tum kitni ziddi ho 😂' },
  { id: 17, category: 'Missing Rosie', input: 'I missed you' },
  { id: 18, category: 'Exhaustion / tired', input: 'aaj office mein bohot kaam tha thak gaya' },
  { id: 19, category: 'Title preference', input: 'mujhe jaan bola karo' },
  { id: 20, category: 'Casual check-in', input: 'khana khaya tumne?' }
];

async function run20Scenarios() {
  console.log('\n🌸 ======================================================================');
  console.log('🧪 20 CONVERSATIONAL SCENARIOS SPECIFICATION VERIFICATION SUITE');
  console.log('🌸 ======================================================================\n');

  const sessPrefix = 'sess_spec20_' + Date.now();

  for (const s of scenarios) {
    console.log(`▶ Scenario ${s.id}/20 [${s.category}]: "${s.input}"`);
    const sess = `${sessPrefix}_s${s.id}`;
    const res = await post('/api/chat', { message: s.input, sessionId: sess });

    const messages = res.messages || [];
    const count = messages.length;

    // 1. Check message count: Must be 1, 2, or 3 (never > 3 and never 0)
    check(`Scenario ${s.id}: Bubble count is 1, 2, or 3 (never > 3)`, count >= 1 && count <= 3, `Count: ${count}`);

    // 2. Check bubble length: No giant paragraph bubbles (<= 15 words per bubble)
    const lengths = messages.map(m => (m.text || '').split(/\s+/).filter(Boolean).length);
    const allUnder15 = lengths.every(l => l <= 15);
    check(`Scenario ${s.id}: All bubbles short and conversational (<= 15 words)`, allUnder15, `Lengths: ${lengths.join(', ')} words`);

    // 3. Check emoji frequency: Max 1 emoji per bubble, max 1 emoji across the turn
    const totalEmojis = messages.reduce((acc, m) => acc + countEmojis(m.text), 0);
    check(`Scenario ${s.id}: Controlled emoji usage (<= 1 emoji total in turn)`, totalEmojis <= 1, `Total emojis: ${totalEmojis}`);

    // 4. Check typing delays: Pacing within natural range 400ms - 1400ms
    const delays = messages.map(m => m.delay_ms);
    const validDelays = delays.every(d => d >= 400 && d <= 1400);
    check(`Scenario ${s.id}: Natural pacing delays assigned`, validDelays, `Delays: ${delays.join(', ')}ms`);

    // Log the generated bubbles
    console.log(`   Bubbles (${count}):`);
    messages.forEach((m, idx) => {
      console.log(`     [${idx + 1}] "${m.text}" (${lengths[idx]}w, delay: ${m.delay_ms}ms)`);
    });
    console.log('');
  }

  console.log('🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} CHECKS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All 20 Conversational Scenarios PASSED 100%! Ready for production!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${total - passed} checks failed.`);
    process.exit(1);
  }
}

run20Scenarios().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
