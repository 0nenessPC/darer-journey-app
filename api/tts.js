// Vercel Serverless Function - OpenAI TTS API Proxy
// Reads DARER's text responses aloud using OpenAI's text-to-speech (onyx voice).
// Keeps the API key server-side so it's never exposed in the browser bundle.

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

  const { text, voice = 'onyx', model = 'tts-1' } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty text' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text.trim(),
        voice,          // onyx = deep, warm, gentle male
        response_format: 'mp3',
        speed: 0.9,     // slightly slower — calming
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS error:', response.status, errorText);
      return res.status(response.status).json({
        error: `TTS failed (${response.status})`,
      });
    }

    // OpenAI returns raw audio bytes — convert to base64 for client playback
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return res.status(200).json({ audio: base64 });
  } catch (err) {
    console.error('TTS proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
