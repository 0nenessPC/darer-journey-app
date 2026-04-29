// Vercel Serverless Function - OpenAI TTS Proxy
// Receives text, returns audio buffer from OpenAI TTS (nova = gentle, confident female voice).

import OpenAI from 'openai';

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TTS API key not configured' });
  }

  const { text, voice = 'nova', speed = 0.9, model = 'tts-1' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const mp3 = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      speed,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: err.message || 'TTS failed' });
  }
}
