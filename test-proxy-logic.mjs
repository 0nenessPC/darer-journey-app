import fs from 'fs';

// Parse .env.local manually
const envPath = '.env.local';
const envVars = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  }
}

const apiKey = envVars.VITE_QWEN_API_KEY || process.env.VITE_QWEN_API_KEY;
console.log('API key found:', apiKey ? `${apiKey.substring(0,15)}...` : 'NO');

// Test 1: Simple test via DashScope directly
const body1 = {
  model: 'qwen3.5-flash',
  max_tokens: 500,
  messages: [
    { role: 'system', content: 'Return ONLY: hello' },
    { role: 'user', content: 'test' },
  ],
};

try {
  const r = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey || ''}`,
    },
    body: JSON.stringify(body1),
  });
  console.log('\n=== Test 1: Direct DashScope ===');
  console.log('Status:', r.status);
  const d = await r.json();
  const reply = (d.choices || []).map(c => c.message?.content ?? '').join('\n').trim();
  console.log('Reply:', reply);
} catch(e) {
  console.error('Error:', e.message);
}

// Test 2: Via the Vite dev proxy
const body2 = {
  systemPrompt: 'Return ONLY: hello',
  messages: [{ role: 'user', text: 'test' }],
  options: { model: 'qwen3.5-flash', maxTokens: 500 },
};

try {
  const r = await fetch('http://localhost:3000/api/qwen-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body2),
  });
  console.log('\n=== Test 2: Via Vite proxy ===');
  console.log('Status:', r.status);
  const d = await r.json();
  console.log('Reply:', d.reply || '(empty)');
  if (d.error) console.log('Error:', d.error);
} catch(e) {
  console.error('Error:', e.message);
}
