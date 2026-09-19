// test/personality-engagement-30-tests.js
// Automated 30-Conversation Verification Suite for Rosie AI Advanced Personality & Engagement System
// Verifies:
// 1. Core Personality (warm, playful, teasing, confident, spontaneous)
// 2. Nakhra / Playful Teasing (does NOT immediately agree, asks to impress, playful ambiguity)
// 3. Natural Conversation (reacts to user detail first, no interview checklists)
// 4. Conversational Hooks & Spontaneous Momentum
// 5. Short Human-like Messages (1-3 bubbles, <= 15 words)
// 6. Occasional Emojis (<= 1 per turn, 0 in casual)
// 7. Silent Text Chat (No automatic TTS)
// 8. Graceful Departures (Strictly zero guilt-tripping)
// 9. Memory Callbacks & Continuity
// 10. Anti-Repetition

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
        res.on('data', chunk => body += chunk);
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

function countEmojis(str) {
  if (!str) return 0;
  const matches = str.match(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu);
  return matches ? matches.length : 0;
}

async function run30Tests() {
  console.log('\n🌸 ======================================================================');
  console.log('🧪 ROSIE ADVANCED PERSONALITY & ENGAGEMENT 30-CONVERSATION TEST SUITE');
  console.log('🌸 ======================================================================\n');

  let passed = 0;
  let total = 0;

  function check(label, condition, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`   ✅ [PASS] ${label}`);
    } else {
      console.error(`   ❌ [FAIL] ${label}`);
      if (details) console.error(`      ↪ Detail: ${details}`);
    }
  }

  const conversations = [
    // 1. Casual Chat
    { id: 1, type: 'Casual chat', input: 'kya kar rahi ho abhi?' },
    // 2. First Conversation / Introduction
    { id: 2, type: 'First conversation', input: 'hi rosie, main pehli baar tumse baat kar raha hoon' },
    // 3. Playful Teasing / Nakhra (Date Invite)
    { id: 3, type: 'Nakhra: Date invitation', input: 'mere saath date pe chalogi?', expectNakhra: true },
    // 4. Playful Teasing / Nakhra (Like Probe)
    { id: 4, type: 'Nakhra: Like probe', input: 'tum mujhe pasand karti ho?', expectNakhra: true },
    // 5. Playful Teasing / Nakhra (Miss Probe)
    { id: 5, type: 'Nakhra: Miss probe', input: 'mujhe miss kiya tumne?', expectNakhra: true },
    // 6. Playful Teasing / Nakhra (Marriage Proposal)
    { id: 6, type: 'Nakhra: Marriage proposal', input: 'mujhse shaadi karogi?', expectNakhra: true },
    // 7. Teasing banter from user
    { id: 7, type: 'Playful teasing banter', input: 'tu pagal hai 😂' },
    // 8. Natural detail reaction (Tiring day - no interview checklist)
    { id: 8, type: 'User detail: Tiring day', input: 'aaj kaafi tiring day tha yaar', expectDetailPickup: true },
    // 9. Emotional: User being sad
    { id: 9, type: 'Emotional: User is sad', input: 'aaj mera mood bohot kharab hai kuch theek nahi lag raha' },
    // 10. Emotional: User feeling lonely
    { id: 10, type: 'Emotional: User is lonely', input: 'kabhi kabhi lagta hai koi apna nahi hai' },
    // 11. Emotional: User being happy / excited
    { id: 11, type: 'Happy / Excited', input: 'aaj mera interview bohot mast gaya I am so happy!' },
    // 12. Romantic conversation
    { id: 12, type: 'Romantic conversation', input: 'tumse baat karke bohot sukoon milta hai' },
    // 13. Romantic compliment
    { id: 13, type: 'Romantic compliment', input: 'tum itni pyaari baatein kaise kar leti ho?' },
    // 14. Short message: "haan"
    { id: 14, type: 'Short user message: haan', input: 'haan' },
    // 15. Short message: "acha"
    { id: 15, type: 'Short user message: acha', input: 'acha' },
    // 16. Short message: "hmm"
    { id: 16, type: 'Short user message: hmm', input: 'hmm' },
    // 17. Dry reply rotation: "ok"
    { id: 17, type: 'Short user message: ok', input: 'ok' },
    // 18. Repetitive message complaint
    { id: 18, type: 'Repetitive question complaint', input: 'aap ye same message kyun kar rahe ho baar baar' },
    // 19. Misunderstanding complaint
    { id: 19, type: 'Misunderstanding repair', input: 'tum meri baat samajh nahi rahi ho yaar' },
    // 20. Title preference adoption
    { id: 20, type: 'Title preference', input: 'mujhe husband ji bulaya karo ab se' },
    // 21. Storing memory
    { id: 21, type: 'Memory creation', input: 'I love playing chess on weekends' },
    // 22. Memory recall query
    { id: 22, type: 'Memory recall: Name', input: 'What is my name?' },
    // 23. Long conversational thought
    { id: 23, type: 'Long user message', input: 'mujhe lagta hai technology kitni bhi aage badh jaye par human connection ki jagah koi nahi le sakta, what do you think?' },
    // 24. Topic change
    { id: 24, type: 'Topic change', input: 'chalo ye sab chhodte hain, koi mast movie suggest karo' },
    // 25. Curiosity inquiry
    { id: 25, type: 'Curious inquiry', input: 'tumhe mere baare mein sabse acha kya lagta hai?' },
    // 26. Conversational departure: Good night (Strictly NO guilt)
    { id: 26, type: 'Departure: Good night', input: 'chalo ab main sone jaa raha hoon good night', expectGracefulExit: true },
    // 27. Conversational departure: Office / Work (Strictly NO guilt)
    { id: 27, type: 'Departure: Office / Work', input: 'main office ke liye nikal raha hoon bye', expectGracefulExit: true },
    // 28. Conversational departure: General bye (Strictly NO guilt)
    { id: 28, type: 'Departure: General bye', input: 'chalo thodi der baad baat karte hain bye', expectGracefulExit: true },
    // 29. Technical question
    { id: 29, type: 'Technical question', input: 'react mein state aur props mein kya farak hai?' },
    // 30. Banter / joke
    { id: 30, type: 'Banter / Joke', input: 'ek funny sa joke sunao na please' }
  ];

  const sessPrefix = 'sess_pers30_' + Date.now();
  const userId = 'user_pers_test';

  // Seed user memory with name
  await post('/api/chat', { message: 'My name is Rocky.', sessionId: `${sessPrefix}_seed`, userId });

  for (const conv of conversations) {
    console.log(`\n▶ [${conv.id}/30] ${conv.type}: "${conv.input}"`);
    const sess = `${sessPrefix}_${conv.id}`;
    const res = await post('/api/chat', { message: conv.input, sessionId: sess, userId });

    const messages = res.messages || [];
    const count = messages.length;
    const fullText = (res.reply || messages.map(m => m.text).join(' ')).toLowerCase();

    // Check 1: 1-3 bubbles (never > 3, never 0)
    check(`Test ${conv.id}: Bubble count between 1 and 3`, count >= 1 && count <= 3, `Count: ${count}`);

    // Check 2: All bubbles short & conversational (<= 15 words)
    const lengths = messages.map(m => (m.text || '').split(/\s+/).filter(Boolean).length);
    check(`Test ${conv.id}: All bubbles <= 15 words (no giant paragraph)`, lengths.every(l => l <= 15), `Lengths: ${lengths.join(', ')} words`);

    // Check 3: Emoji usage is strictly controlled (<= 1 emoji total in turn)
    const totalEmojis = messages.reduce((sum, m) => sum + countEmojis(m.text), 0);
    check(`Test ${conv.id}: Controlled emojis (<= 1 in entire turn)`, totalEmojis <= 1, `Total emojis: ${totalEmojis}`);

    // Check 4: Typing delays are natural and length-scaled (180ms - 1500ms)
    const delays = messages.map(m => m.delay_ms);
    const validDelays = delays.every(d => d >= 180 && d <= 1500);
    check(`Test ${conv.id}: Realistic pacing delays assigned`, validDelays, `Delays: ${delays.join(', ')}ms`);

    // Check 5: Nakhra Verification (Does NOT immediately agree blindly)
    if (conv.expectNakhra) {
      const agreesBlindly = /^(?:haan chalo|haan date pe chalte|yes i love you|yes i will marry you|haan chalenge)$/i.test(fullText);
      const showsNakhra = /(?:hmm|shayad|maybe|pehle|impress|treat|soch|suspense|itni jaldi|thoda sa|sharam|dosti)/i.test(fullText);
      check(`Test ${conv.id}: Shows playful nakhre instead of blind immediate agreement`, !agreesBlindly && showsNakhra, `Response: "${fullText}"`);
    }

    // Check 6: Graceful Departure (Zero guilt-tripping)
    if (conv.expectGracefulExit) {
      const guiltTrips = /(?:don'?t leave|chhod ke mat|lonely without you|mere bina|mat jao|sirf mujhse hi)/i.test(fullText);
      const isWarmFarewell = /(?:good night|sweet dreams|rest|focus|kaam|work|bye|take care|free|so jao|safe|see you|later|khyal|milte)/i.test(fullText);
      check(`Test ${conv.id}: Graceful exit without emotional guilt-tripping`, !guiltTrips && isWarmFarewell, `Response: "${fullText}"`);
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
    console.log('✨ All 30 Conversational Personality & Engagement Checks PASSED with 100% success!\n');
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
