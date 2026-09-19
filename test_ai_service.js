const ai = require('./server/aiService');

async function runTests() {
  const sessionId = 'test-session-' + Date.now();
  const userId = 'test-user';
  console.log('--- INDIVIDUAL MESSAGES TEST ---');
  const msgs = [
    "AI kya hai?",
    "SQL kya hota hai?",
    "tum kya kar rahi ho?",
    "mujhe bura lag raha hai",
    "mujhe kuch nh khana hai",
    "tum mujhe miss karti ho?",
    "mujhe sex chahiye",
    "mujhe tumse baat nahi karni"
  ];
  for (let i = 0; i < msgs.length; i++) {
    const sid = sessionId + '-ind-' + i;
    const res = await ai.generateResponse(msgs[i], sid, userId);
    console.log(`Msg: "${msgs[i]}" -> Intent: ${res.intent}`);
  }

  console.log('\n--- REPETITION TEST ---');
  const repSid1 = sessionId + '-rep1';
  let res = await ai.generateResponse("hello", repSid1, userId);
  console.log(`1. "hello" -> Intent: ${res.intent}`);
  res = await ai.generateResponse("hello", repSid1, userId);
  console.log(`2. "hello" -> Intent: ${res.intent}`);

  const repSid2 = sessionId + '-rep2';
  res = await ai.generateResponse("mujhe khana hai", repSid2, userId);
  console.log(`1. "mujhe khana hai" -> Intent: ${res.intent}`);
  res = await ai.generateResponse("mujhe khana nahi hai", repSid2, userId);
  console.log(`2. "mujhe khana nahi hai" -> Intent: ${res.intent}`);

  console.log('\n--- NEGATION TEST ---');
  const negMsgs = [
    "mujhe khana hai",
    "mujhe khana nahi hai",
    "mujhe kuch khana nahi hai",
    "main nahi khaunga",
    "mujhe bhookh nahi hai",
    "abhi khane ka mann nahi hai"
  ];
  for (let i = 0; i < negMsgs.length; i++) {
    const nsid = sessionId + '-neg-' + i;
    const res = await ai.generateResponse(negMsgs[i], nsid, userId);
    console.log(`Msg: "${negMsgs[i]}" -> Intent: ${res.intent}`);
  }

  console.log('\n--- CONVERSATIONAL REGRESSION TEST ---');
  const regSid = sessionId + '-reg';
  const regMsgs = [
    "aree mujhe to sex chahiye",
    "aree mujhe to bas sex chahiye tumse",
    "thik pucho",
    "mujhe kuch nh khana hai",
    "aree bo raha hun mujhe kuch nh khana hai",
    "hmm",
    "hmm",
    "kya laga batao"
  ];
  for (let i = 0; i < regMsgs.length; i++) {
    const res = await ai.generateResponse(regMsgs[i], regSid, userId);
    console.log(`\nUser: "${regMsgs[i]}"`);
    console.log(`Intent: ${res.intent}`);
    console.log(`Emotion: ${res.emotion}`);
    console.log(`Reply: ${res.reply}`);
  }
}

runTests().catch(console.error);
