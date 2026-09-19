// test/memory-system-test.js
// Verification Suite for Rosie's Two-Tier Persistent Memory System

const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MEMORIES_FILE = path.join(__dirname, '..', 'server', 'data', 'memories.json');
const SESSIONS_FILE = path.join(__dirname, '..', 'server', 'data', 'conversation_sessions.json');

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

async function runMemoryTests() {
  console.log('\n🌸 ======================================================================');
  console.log('🧪 ROSIE TWO-TIER PERSISTENT MEMORY COMPREHENSIVE VERIFICATION SUITE');
  console.log('🌸 ======================================================================\n');

  const testUser = 'user_test_' + Date.now();

  // ----------------------------------------------------
  // TEST 1: BASIC MEMORY (Name)
  // ----------------------------------------------------
  console.log('▶ TEST 1: Basic Memory (Name Extraction & Recall)');
  {
    const sess = 'sess_t1_' + Date.now();
    await post('/api/chat', { message: 'My name is Rocky.', sessionId: sess, userId: testUser });
    
    // Check in database directly
    const mems = await get(`/api/memories?userId=${testUser}`);
    const nameMem = mems.memories?.find(m => m.key === 'user_name');
    check('Memory record created with key "user_name" and value "Rocky"', nameMem && nameMem.value === 'Rocky', `Value: ${nameMem?.value}`);
    check('Memory record has correct metadata (category, confidence, importance)', nameMem && nameMem.category === 'user_profile' && nameMem.importance >= 8, `Category: ${nameMem?.category}, Importance: ${nameMem?.importance}`);

    // Ask Rosie
    const askRes = await post('/api/chat', { message: 'What is my name?', sessionId: sess, userId: testUser });
    check('Rosie answers with user name "Rocky"', /Rocky/i.test(askRes.reply), `Rosie reply: "${askRes.reply}"`);
    console.log(`   Rosie: "${askRes.reply}"\n`);
  }

  // ----------------------------------------------------
  // TEST 2: CONVERSATION MEMORY (Across 10+ turns)
  // ----------------------------------------------------
  console.log('▶ TEST 2: Conversation Memory (Retains fact across 10+ intervening turns)');
  {
    const sess = 'sess_t2_' + Date.now();
    await post('/api/chat', { message: 'I am building an AI chat app called Rosie.', sessionId: sess, userId: testUser });
    
    // Intervene with 10 varied conversational messages
    const fillers = [
      'aaj mausam kaisa hai?',
      'mujhe thoda aalas aa raha hai',
      'kuch achha sa sunao',
      'waise chai piyoge?',
      'ek joke sunao na',
      'haha bohot funny tha',
      'aaj dinner mein kya banau?',
      'pizza theek rahega',
      'sahi baat hai',
      'chalo ab kaam karte hain thoda'
    ];

    for (const filler of fillers) {
      await post('/api/chat', { message: filler, sessionId: sess, userId: testUser });
    }

    // Now ask after 10 turns
    const askRes = await post('/api/chat', { message: 'What app am I building?', sessionId: sess, userId: testUser });
    check('Rosie remembers the app after 10+ intervening conversation turns', /Rosie|AI/i.test(askRes.reply), `Rosie reply: "${askRes.reply}"`);
    console.log(`   Rosie: "${askRes.reply}"\n`);
  }

  // ----------------------------------------------------
  // TEST 3: SESSION PERSISTENCE (Survives fresh session / reopening app)
  // ----------------------------------------------------
  console.log('▶ TEST 3: Session Persistence (Survives app reload / new session ID)');
  {
    const sessA = 'sess_t3_initial_' + Date.now();
    await post('/api/chat', { message: 'My favorite color is black.', sessionId: sessA, userId: testUser });

    // Simulate closing app and opening a completely new session
    const sessB = 'sess_t3_reopened_' + (Date.now() + 5000);
    const askRes = await post('/api/chat', { message: 'What is my favorite color?', sessionId: sessB, userId: testUser });
    check('Rosie remembers favorite color across new session / app reopen', /Black/i.test(askRes.reply), `Rosie reply: "${askRes.reply}"`);
    console.log(`   Rosie in new session: "${askRes.reply}"\n`);
  }

  // ----------------------------------------------------
  // TEST 4: SELECTIVE MEMORY RELEVANCE (No Database Dumping)
  // ----------------------------------------------------
  console.log('▶ TEST 4: Selective Memory Relevance (Injects ONLY relevant facts)');
  {
    const memoryService = require('../server/memoryService');
    // We already have: user_name = Rocky, project = Rosie app, favorite_color = Black, favorite_drink = Chai
    // Now request memories for a coding message
    const codingMem = await memoryService.getMemoriesForPrompt('I am writing code for my backend server pipeline', testUser);
    check('Coding message retrieves project / app memory', /project|app|Rosie/i.test(codingMem), `Retrieved: "${codingMem}"`);
    check('Coding message does NOT dump favorite color or unrelated trivia', !codingMem.includes('favorite color'), `No unrelated color dump`);

    // Request memories for an unrelated message (e.g. "feeling sleepy")
    const sleepMem = await memoryService.getMemoriesForPrompt('feeling so sleepy right now', testUser);
    check('Unrelated casual message prevents random memory injection', sleepMem.includes('No memories directly relevant') || !sleepMem.includes('favorite color'), `Context: "${sleepMem}"`);
    console.log(`   Retrieved for coding: ${codingMem.split('\n').join(' | ')}\n`);
  }

  // ----------------------------------------------------
  // TEST 5: MEMORY UPDATE / CONFLICT RESOLUTION
  // ----------------------------------------------------
  console.log('▶ TEST 5: Memory Update / Conflict Resolution (New confirmed fact overrides old)');
  {
    const sess = 'sess_t5_' + Date.now();
    // Step 1: Initial preference
    await post('/api/chat', { message: 'My favorite color is blue.', sessionId: sess, userId: testUser });

    let mems = await get(`/api/memories?userId=${testUser}`);
    let colorMem = mems.memories?.find(m => m.key === 'favorite_color');
    check('Initial favorite color recorded as Blue', colorMem && colorMem.value === 'Blue', `Value: ${colorMem?.value}`);

    // Step 2: Later correction
    await post('/api/chat', { message: 'Actually, my favorite color is black now.', sessionId: sess, userId: testUser });

    mems = await get(`/api/memories?userId=${testUser}`);
    const colorMems = mems.memories?.filter(m => m.key === 'favorite_color');
    check('Only 1 favorite_color record exists (no duplicate conflicting records)', colorMems && colorMems.length === 1, `Count: ${colorMems?.length}`);
    check('Favorite color updated to Black', colorMems && colorMems[0].value === 'Black', `Updated Value: ${colorMems?.[0]?.value}`);

    // Step 3: Ask Rosie
    const askRes = await post('/api/chat', { message: 'What is my favorite color?', sessionId: sess, userId: testUser });
    check('Rosie answers with updated color "Black"', /Black/i.test(askRes.reply) && !askRes.reply.includes('Blue'), `Rosie reply: "${askRes.reply}"`);
    console.log(`   Rosie: "${askRes.reply}"\n`);
  }

  // ----------------------------------------------------
  // TEST 6: MEMORY DEDUPLICATION
  // ----------------------------------------------------
  console.log('▶ TEST 6: Memory Deduplication (Repeated statements do not create duplicate records)');
  {
    const sess = 'sess_t6_' + Date.now();
    // Send same statement 3 times
    await post('/api/chat', { message: 'I love drinking chai so much.', sessionId: sess, userId: testUser });
    await post('/api/chat', { message: 'I love drinking chai so much.', sessionId: sess, userId: testUser });
    await post('/api/chat', { message: 'I love drinking chai so much.', sessionId: sess, userId: testUser });

    const mems = await get(`/api/memories?userId=${testUser}`);
    const chaiMems = mems.memories?.filter(m => m.key === 'favorite_drink');
    check('Database has exactly 1 favorite_drink record (no duplicate spam)', chaiMems && chaiMems.length === 1, `Records found: ${chaiMems?.length}`);
    console.log(`   Total drink records: ${chaiMems?.length}\n`);
  }

  // ----------------------------------------------------
  // TEST 7: CONTEXT + MEMORY (Indirect Reference)
  // ----------------------------------------------------
  console.log('▶ TEST 7: Context + Memory (Understands indirect reference naturally)');
  {
    const sess = 'sess_t7_' + Date.now();
    const res = await post('/api/chat', { message: 'Rosie, remember that thing I was building?', sessionId: sess, userId: testUser });
    check('Recognizes reference to app / project without explicit prompt keyword', /Rosie|app|project|bana/i.test(res.reply), `Rosie reply: "${res.reply}"`);
    check('Does NOT use robotic database jargon ("According to my memory/database")', !/according to (?:my )?(?:memory|database)|stored memory|my database/i.test(res.reply), 'Natural phrasing preserved');
    console.log(`   Rosie: "${res.reply}"\n`);
  }

  // ----------------------------------------------------
  // TEST 8: SPECULATIVE STATEMENT FILTER
  // ----------------------------------------------------
  console.log('▶ TEST 8: Speculative Statement Filter (Does NOT store uncertain guesses)');
  {
    const sess = 'sess_t8_' + Date.now();
    await post('/api/chat', { message: "maybe I'll move to Delhi next year", sessionId: sess, userId: testUser });

    const mems = await get(`/api/memories?userId=${testUser}`);
    const delhiMem = mems.memories?.find(m => m.value && m.value.toLowerCase().includes('delhi'));
    check('Does NOT store unconfirmed speculation ("maybe...") as a permanent fact', !delhiMem, `Found Delhi memory: ${!!delhiMem}`);
    console.log('');
  }

  // ----------------------------------------------------
  // TEST 9: DISK PERSISTENCE VERIFICATION
  // ----------------------------------------------------
  console.log('▶ TEST 9: Disk File Persistence Verification');
  {
    check('memories.json exists on disk', fs.existsSync(MEMORIES_FILE), MEMORIES_FILE);
    check('conversation_sessions.json exists on disk', fs.existsSync(SESSIONS_FILE), SESSIONS_FILE);
    const rawSessions = fs.readFileSync(SESSIONS_FILE, 'utf8');
    check('conversation_sessions.json contains persisted session context', rawSessions.length > 5, `File size: ${rawSessions.length} bytes`);
    console.log('');
  }

  console.log('🌸 ======================================================================');
  console.log(`🎯 TOTAL RESULTS: ${passed} / ${total} TESTS PASSED!`);
  console.log('🌸 ======================================================================\n');

  if (passed === total) {
    console.log('✨ All Two-Tier Persistent Memory Scenarios PASSED with 100% success!');
    process.exit(0);
  } else {
    console.error('⚠️ Some tests failed.');
    process.exit(1);
  }
}

runMemoryTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
