// test/api-test.js
// Automated verification test suite for Rosie AI Chat API & Emotion/Memory layers

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Rosie AI Chat Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`  ▶ Running: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED:', err.message);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /api/health returns ok status', async () => {
    const res = await request('GET', '/api/health');
    if (res.status !== 200 || !res.data.ok) {
      throw new Error(`Expected ok: true, got ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Auth login
  await test('POST /api/auth/login logs in user', async () => {
    const res = await request('POST', '/api/auth/login', { identity: 'Rocky', password: '123' });
    if (res.status !== 200 || !res.data.ok || res.data.user.userName !== 'Rocky') {
      throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 3. Emotion Detection & Response: Happy
  await test('POST /api/chat detects Happy emotion', async () => {
    const res = await request('POST', '/api/chat', { message: 'I am so happy today! Everything went great! 🎉' });
    if (res.status !== 200 || !res.data.reply) throw new Error('No reply received');
    if (res.data.emotion !== 'happy' && res.data.emotion !== 'excited') {
      throw new Error(`Expected happy/excited emotion, got ${res.data.emotion}`);
    }
  });

  // 4. Emotion Detection & Response: Stressed / Frustrated (Hinglish)
  await test('POST /api/chat detects Stressed Hinglish emotion', async () => {
    const res = await request('POST', '/api/chat', { message: 'Yaar aaj kaam ne dimaag kharab kar diya.' });
    if (res.status !== 200 || !res.data.reply) throw new Error('No reply received');
    if (res.data.emotion !== 'stressed' && res.data.emotion !== 'frustrated') {
      throw new Error(`Expected stressed emotion, got ${res.data.emotion}`);
    }
  });

  // 5. Emotion Detection: Tired
  await test('POST /api/chat detects Tired emotion', async () => {
    const res = await request('POST', '/api/chat', { message: 'Bohot thak gaya hu aaj, energy bilkul low hai.' });
    if (res.status !== 200 || !res.data.reply) throw new Error('No reply received');
    if (res.data.emotion !== 'tired') {
      throw new Error(`Expected tired emotion, got ${res.data.emotion}`);
    }
  });

  // 6. Memory Extraction: Name & Favorite Drink
  await test('POST /api/chat extracts user name and chai preference', async () => {
    await request('POST', '/api/chat', { message: 'Mera naam Rocky hai aur mujhe chai bohot pasand hai.' });
    const memRes = await request('GET', '/api/memories');
    const memories = memRes.data.memories || [];
    const hasName = memories.some(m => m.key === 'user_name' && m.value === 'Rocky');
    const hasChai = memories.some(m => m.key === 'favorite_drink' && /chai/i.test(m.value));
    if (!hasName || !hasChai) {
      throw new Error(`Memories missing expected facts: ${JSON.stringify(memories)}`);
    }
  });

  // 7. Memory Recall in conversation
  await test('POST /api/chat answers memory recall question', async () => {
    const res = await request('POST', '/api/chat', { message: 'Tumhe mera naam yaad hai?' });
    if (res.status !== 200 || !res.data.reply) throw new Error('No reply');
    if (!/Rocky/i.test(res.data.reply)) {
      throw new Error(`Expected response to mention Rocky, got: ${res.data.reply}`);
    }
  });

  // 8. Memory Update: Drink preference update
  await test('POST /api/chat updates existing memory without duplicates', async () => {
    await request('POST', '/api/chat', { message: 'Actually ab mujhe coffee pasand hai.' });
    const memRes = await request('GET', '/api/memories');
    const memories = memRes.data.memories || [];
    const drinkMemories = memories.filter(m => m.key === 'favorite_drink');
    if (drinkMemories.length !== 1) {
      throw new Error(`Expected exactly 1 favorite_drink memory, found ${drinkMemories.length}`);
    }
    if (!/coffee/i.test(drinkMemories[0].value)) {
      throw new Error(`Expected favorite_drink to be updated to coffee, got ${drinkMemories[0].value}`);
    }
  });

  // 9. Memory Inspector CRUD: Add and Delete
  await test('POST /api/memories adds custom fact and DELETE removes it', async () => {
    const addRes = await request('POST', '/api/memories', { key: 'pet_cat', value: 'Milo', category: 'pets' });
    if (addRes.status !== 201) throw new Error(`Add memory failed`);
    
    const memRes = await request('GET', '/api/memories');
    const catMem = memRes.data.memories.find(m => m.key === 'pet_cat');
    if (!catMem) throw new Error('Added memory not found');

    const delRes = await request('DELETE', `/api/memories/${catMem.id}`);
    if (delRes.status !== 200 || !delRes.data.ok) throw new Error('Delete memory failed');
  });

  // 10. Subscription state
  await test('POST /api/subscription activates Starter Trial', async () => {
    const res = await request('POST', '/api/subscription', { plan: 'trial' });
    if (res.status !== 200 || !res.data.ok || !res.data.isVip) {
      throw new Error(`Subscription update failed: ${JSON.stringify(res.data)}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Give server time to start if run concurrently
setTimeout(runTests, 1000);
