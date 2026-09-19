const fs = require('fs');
const readline = require('readline');

async function restoreAIService() {
  const fullLog = 'C:\\Users\\Rocky\\.gemini\\antigravity-ide\\brain\\512e0306-5935-462c-a8aa-a1ad51d6895a\\.system_generated\\logs\\transcript_full.jsonl';
  const fileStream = fs.createReadStream(fullLog);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let bestAiCode = '';

  for await (const line of rl) {
    if (line.includes('aiService.js') && line.includes('CodeContent')) {
      try {
        const obj = JSON.parse(line);
        const calls = obj.tool_calls || [];
        for (const c of calls) {
          const args = c.args || {};
          if (args.TargetFile && args.TargetFile.includes('aiService.js') && args.CodeContent) {
            if (args.CodeContent.length > bestAiCode.length) {
              bestAiCode = args.CodeContent;
            }
          }
        }
      } catch (e) {}
    }
  }

  console.log('Best AI Service code length:', bestAiCode.length);
  if (bestAiCode.length > 20000) {
    fs.writeFileSync('C:\\Users\\Rocky\\OneDrive\\Desktop\\Rosie Ai Chat App\\server\\aiService.js', bestAiCode);
    console.log('Restored server/aiService.js successfully!');
  }
}
restoreAIService().catch(console.error);
