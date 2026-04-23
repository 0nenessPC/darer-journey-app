// Vercel Serverless Function - OpenAI Chat API Proxy
// This keeps the API key server-side so it's never exposed in the browser bundle.

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { systemPrompt, messages, options = {} } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-5.4-nano',
        max_tokens: options.maxTokens || 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.text })),
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    const reply = (data.choices || [])
      .map((choice) => choice.message?.content ?? '')
      .join('\n')
      .trim();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('OpenAI proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
