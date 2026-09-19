const fs = require('fs');
require('c:/Users/Rocky/OneDrive/Desktop/Rosie Ai Chat App/node_modules/dotenv').config({ path: 'c:/Users/Rocky/OneDrive/Desktop/Rosie Ai Chat App/.env' });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (typeof url === 'string' && url.includes('generativelanguage')) {
    try {
      const body = JSON.parse(options.body);
      fs.appendFileSync('gemini_intercept.log', JSON.stringify({ url, body }) + '\\n');
    } catch(e) {}
  }
  return originalFetch(url, options);
};
require('c:/Users/Rocky/OneDrive/Desktop/Rosie Ai Chat App/server/index.js');
