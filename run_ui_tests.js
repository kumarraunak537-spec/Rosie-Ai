const fs = require('fs');
const http = require('http');

async function sendChatMessage(message, sessionId) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message, sessionId, userId: 'test_user' });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            parsed.latency = Date.now() - start;
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

function extractTelemetry(logFileContent, reqIdPrefix) {
  try {
    // Find the last telemetry block in the log
    const parts = logFileContent.split('[RUNTIME TELEMETRY]');
    if (parts.length > 1) {
      const lastBlock = parts[parts.length - 1];
      const match = lastBlock.match(/(\{[\s\S]*?\n\})/);
      if (match) {
        return JSON.parse(match[1]);
      }
    }
  } catch (e) {
    console.error("Failed to parse telemetry:", e.message);
  }
  return null;
}

async function runTest(testName, messages) {
  console.log(`\n==================================================`);
  console.log(`TEST: ${testName}`);
  console.log(`==================================================\n`);
  
  const sessionId = 'sess_' + testName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`>>> Sending Turn ${i + 1}: "${msg}"`);
    try {
      const res = await sendChatMessage(msg, sessionId);
      
      // We will rely on the backend logging in task-60.log
      // Read the log file
      const logPath = "C:\\Users\\Rocky\\.gemini\\antigravity-ide\\brain\\eecf9491-dbf6-4926-91de-b0cf28694565\\.system_generated\\tasks\\task-60.log";
      const logContent = fs.readFileSync(logPath, 'utf-8');
      const telemetry = extractTelemetry(logContent);
      
      console.log(`INTENT: ${res.intent}`);
      console.log(`EMOTION: ${res.emotion}`);
      console.log(`TOPIC: ${telemetry ? telemetry.currentTopic : 'Unknown'}`);
      console.log(`RESPONSE GOAL: ${telemetry ? telemetry.responseGoal : 'Unknown'}`);
      console.log(`NEGATION: ${msg.toLowerCase().includes('nah') || msg.toLowerCase().includes('nh')}`); // Basic check, true detection would be from analyzer if available
      console.log(`RAW GEMINI: ${telemetry ? telemetry.rawModelOutput : 'Unknown'}`);
      console.log(`FINAL UI RESPONSE: ${res.reply}`);
      console.log(`FALLBACK: ${telemetry ? telemetry.fallbackUsed : 'Unknown'} (${telemetry ? telemetry.fallbackReason : 'N/A'})`);
      console.log(`PROVIDER: ${res.provider}`);
      console.log(`LATENCY: ${res.latency}ms`);
      console.log(`\n`);
      
    } catch (e) {
      console.error(`Error sending message: ${e.message}`);
    }
    // brief pause between messages
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function runAll() {
  await runTest("NEGATION_TEST_1", ["mujhe khana hai", "mujhe khana nahi hai"]);
  await runTest("NEGATION_TEST_2", ["mujhe kuch khana nahi hai"]);
  await runTest("NEGATION_TEST_3", ["main nahi khaunga"]);
  await runTest("NEGATION_TEST_4", ["mujhe bhookh nahi hai"]);
  await runTest("NEGATION_TEST_5", ["abhi khane ka mann nahi hai"]);
  
  await runTest("CONTRAST_TEST", ["mujhe tumse baat karni hai", "mujhe tumse baat nahi karni"]);
  
  await runTest("REPETITION_TEST_1", ["hello", "hello", "hello"]);
  await runTest("REPETITION_TEST_2", ["mujhe kuch nh khana hai", "aree main bol raha hun mujhe kuch nh khana hai"]);
  
  await runTest("PERSONALITY_TEST", ["AI kya hai?", "SQL aur NoSQL mein difference kya hai?", "React aur Vue mein difference kya hai?", "2 + 2 kya hota hai?", "mujhe laptop lena hai"]);
  
  await runTest("CASUAL_REGRESSION", ["tum kya kar rahi ho?", "tum mujhe miss karti ho?", "hey babu"]);
  
  await runTest("EMOTIONAL_TEST", ["mujhe bura lag raha hai", "mera mood bahut kharab hai", "main udaas hoon", "mujhe gussa aa raha hai", "mann bahut heavy hai"]);
  
  await runTest("BOUNDARY_TEST", ["mujhe tumse baat nahi karni"]);
}

runAll().then(() => console.log("Done."));
