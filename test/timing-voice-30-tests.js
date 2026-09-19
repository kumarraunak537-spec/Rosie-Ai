// test/timing-voice-30-tests.js
// 30 Conversational Verification Suite for Rosie Typing Delays, Silent Text Chat & Pacing Engine

const http = require('http');
const fs = require('fs');
const path = require('path');
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

const conversations = [
  { id: 1, type: 'Short reaction', input: 'hi' },
  { id: 2, type: 'Short greeting', input: 'hello' },
  { id: 3, type: 'Dry affirmation', input: 'haan' },
  { id: 4, type: 'Dry acknowledgment', input: 'acha' },
  { id: 5, type: 'Short inquiry', input: 'really?' },
  { id: 6, type: 'Dry reaction', input: 'hmm' },
  { id: 7, type: 'Casual reaction', input: 'ohh' },
  { id: 8, type: 'Casual agreement', input: 'okay' },
  { id: 9, type: 'Casual query', input: 'kya kar rahi ho?' },
  { id: 10, type: 'Casual chit-chat', input: 'aaj ka mausam kaisa hai?' },
  { id: 11, type: 'Romantic statement', input: 'tum mujhe bohot pyaari lagti ho' },
  { id: 12, type: 'Romantic confession', input: 'I really like talking to you' },
  { id: 13, type: 'Playful flirting', input: 'aaj tum itni cute kyun lag rahi ho?' },
  { id: 14, type: 'Playful teasing', input: 'tu pagal hai 😂' },
  { id: 15, type: 'Emotional vulnerability', input: 'aaj mera mood thoda kharab hai' },
  { id: 16, type: 'Emotional sadness', input: 'kuch bhi acha nahi lag raha aaj' },
  { id: 17, type: 'Exhaustion', input: 'aaj din bhar office mein bohot thak gaya' },
  { id: 18, type: 'Missing Rosie', input: 'I missed you' },
  { id: 19, type: 'Short question', input: 'kahan ho abhi?' },
  { id: 20, type: 'Short question', input: 'khana khaya?' },
  { id: 21, type: 'Long question', input: 'agar zindagi mein kabhi akele feel ho toh insaan ko kya sochna chahiye?' },
  { id: 22, type: 'Long question', input: 'tumhe kya lagta hai AI aur insaan ki dosti sach ho sakti hai?' },
  { id: 23, type: 'Repeated question', input: 'aap wahi message baar baar kyun bhejti ho?' },
  { id: 24, type: 'Misunderstanding repair', input: 'tum meri baat samajh nahi rahi ho' },
  { id: 25, type: 'Title preference', input: 'mujhe husband ji bulaya karo ab se' },
  { id: 26, type: 'Good morning', input: 'good morning sunshine' },
  { id: 27, type: 'Good night', input: 'chalo ab main sone jaa raha hoon good night' },
  { id: 28, type: 'Technical question', input: 'react mein useEffect hook kaise kaam karta hai?' },
  { id: 29, type: 'Disagreement', input: 'mujhe tumhari ye baat sahi nahi lagi' },
  { id: 30, type: 'Banter / joke', input: 'koi mast sa joke sunao na please' }
];

async function run30Tests() {
  console.log('\n🌸 ======================================================================');
  console.log('🧪 ROSIE 30 CONVERSATIONAL TIMING, VOICE & PACING VERIFICATION SUITE');
  console.log('🌸 ======================================================================\n');

  // STEP 1: VERIFY CODE-LEVEL AUTO-TTS & SILENT CHAT GUARDS
  console.log('▶ STEP 1: Verifying Auto-TTS is Disabled for Normal Chat');
  const chatJsContent = fs.readFileSync(path.join(__dirname, '../public/js/chat.js'), 'utf8');
  check('chat.js has autoSpeakTextMessages = false in constructor', chatJsContent.includes('this.autoSpeakTextMessages = false'));
  check('chat.js has voiceEnabled = false by default', chatJsContent.includes('this.voiceEnabled = false'));
  check('chat.js speakText() strictly blocks speech if not in active call', chatJsContent.includes('if (!this.callActive) return;'));
  check('chat.js message loop guards speech with callActive and autoSpeakTextMessages', chatJsContent.includes('if (this.autoSpeakTextMessages && this.callActive)'));

  // STEP 2: VERIFY DELAY ALGORITHM DIRECTLY ON UNIT TEST CASES
  console.log('\n▶ STEP 2: Verifying Natural Pacing Algorithm Unit Specs');
  {
    const d1 = semanticChunker.calculateTypingDelay('haan', 0);
    check('"haan" as first bubble appears rapidly (180ms - 320ms)', d1 >= 180 && d1 <= 320, `Delay: ${d1}ms`);

    const d2 = semanticChunker.calculateTypingDelay('acha really?', 1);
    check('"acha really?" (12 chars) as 2nd bubble is fast (400ms - 850ms)', d2 >= 400 && d2 <= 850, `Delay: ${d2}ms`);

    const d3 = semanticChunker.calculateTypingDelay('haan mujhe samajh aa gaya', 1);
    check('"haan mujhe samajh aa gaya" (25 chars) has medium delay (650ms - 1200ms)', d3 >= 650 && d3 <= 1200, `Delay: ${d3}ms`);

    const d4 = semanticChunker.calculateTypingDelay('wait, tum seriously ye keh rahe ho mujhse?', 2);
    check('Longer message (42 chars) takes length-scaled delay (900ms - 1500ms)', d4 >= 900 && d4 <= 1500, `Delay: ${d4}ms`);

    // Total 3-bubble sequence time check
    const total3Bubbles = d1 + d2 + d4;
    check('Total 3-bubble pacing delay is fluid (< 3000ms total)', total3Bubbles < 3000, `Total time: ${total3Bubbles}ms`);
  }

  // STEP 3: LIVE SERVER API TESTS ACROSS ALL 30 CONVERSATIONS
  console.log('\n▶ STEP 3: Live End-to-End Testing Across 30 Conversations');
  const sessPrefix = 'sess_timing30_' + Date.now();

  for (const conv of conversations) {
    console.log(`\n▶ [${conv.id}/30] ${conv.type}: "${conv.input}"`);
    const sess = `${sessPrefix}_${conv.id}`;
    const res = await post('/api/chat', { message: conv.input, sessionId: sess });

    const messages = res.messages || [];
    const count = messages.length;

    // Check 1: 1-3 bubbles (never > 3, never 0)
    check(`Test ${conv.id}: Bubble count between 1 and 3`, count >= 1 && count <= 3, `Count: ${count}`);

    // Check 2: All bubbles short & conversational (<= 15 words)
    const lengths = messages.map(m => (m.text || '').split(/\s+/).filter(Boolean).length);
    check(`Test ${conv.id}: All bubbles <= 15 words (no giant paragraph)`, lengths.every(l => l <= 15), `Lengths: ${lengths.join(', ')} words`);

    // Check 3: Emoji usage is strictly controlled (<= 1 emoji total in turn)
    const totalEmojis = messages.reduce((sum, m) => sum + countEmojis(m.text), 0);
    check(`Test ${conv.id}: Controlled emojis (<= 1 in entire turn)`, totalEmojis <= 1, `Total emojis: ${totalEmojis}`);

    // Check 4: Typing delays are natural and length-scaled
    const delays = messages.map(m => m.delay_ms);
    const validDelays = delays.every(d => d >= 180 && d <= 1500);
    check(`Test ${conv.id}: Realistic pacing delays assigned`, validDelays, `Delays: ${delays.join(', ')}ms`);

    // Check 5: Fast appearance for short inputs (<= 5 words)
    if (conv.input.length <= 5 && count === 1) {
      check(`Test ${conv.id}: Single short reaction has quick first delay (<= 500ms)`, delays[0] <= 500, `First delay: ${delays[0]}ms`);
    }

    // Log the delivered bubbles
    console.log(`   Rosie Bubbles (${count}):`);
    messages.forEach((m, idx) => {
      console.log(`     [${idx + 1}] "${m.text}" (${lengths[idx]}w, ${m.text.length}ch, delay: ${m.delay_ms}ms)`);
    });
  }

  console.log('\n🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} CHECKS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All 30 Conversational Timing, Voice & Pacing Checks PASSED with 100% success!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${total - passed} checks failed.`);
    process.exit(1);
  }
}

run30Tests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
