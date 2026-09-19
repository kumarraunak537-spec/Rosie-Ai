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
    const parts = logFileContent.split('[RUNTIME TELEMETRY]');
    if (parts.length > 1) {
      const lastBlock = parts[parts.length - 1];
      const match = lastBlock.match(/(\{[\s\S]*?\n\})/);
      if (match) {
        return JSON.parse(match[1]);
      }
    }
  } catch (e) {}
  return null;
}

function extractPrompt(logFileContent) {
  try {
    const parts = logFileContent.split('[RUNTIME TRACE] userMessage:');
    if (parts.length > 1) {
      // get the block before it which might contain the prompt if logged.
      // Wait, aiService doesn't log the prompt string directly. It just sends it to Gemini.
      // We can just rely on the output.
    }
  } catch(e){}
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
      
      const logPath = "C:\\Users\\Rocky\\.gemini\\antigravity-ide\\brain\\eecf9491-dbf6-4926-91de-b0cf28694565\\.system_generated\\tasks\\task-60.log";
      const logContent = fs.readFileSync(logPath, 'utf-8');
      const telemetry = extractTelemetry(logContent);
      
      console.log(`INTENT: ${res.intent}`);
      console.log(`EMOTION: ${res.emotion}`);
      console.log(`RAW GEMINI: ${telemetry ? telemetry.rawModelOutput : 'Unknown'}`);
      console.log(`FINAL UI RESPONSE: ${res.reply}`);
      console.log(`\n`);
      
    } catch (e) {
      console.error(`Error sending message: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function runAll() {
  await runTest("NEGATION_TEST_1", ["mujhe khana hai"]);
  await runTest("NEGATION_TEST_2", ["mujhe khana nahi hai"]);
  await runTest("NEGATION_TEST_3", ["mujhe kuch nh khana hai"]);
  await runTest("NEGATION_TEST_4", ["mujhe bhookh nahi hai"]);
  await runTest("NEGATION_TEST_5", ["mujhe tumse baat karni hai"]);
  await runTest("NEGATION_TEST_6", ["mujhe tumse baat nahi karni"]);
  
  await runTest("CONTEXT_SWITCH_1", ["2 + 2 kya hota hai?", "React kya hai?", "mujhe laptop lena hai"]);
  await runTest("CONTEXT_SWITCH_2", ["SQL kya hota hai?", "mujhe laptop lena hai"]);
}

runAll().then(() => console.log("Done."));
